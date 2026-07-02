import Stripe from 'stripe'
import { requireAdmin, adminDb as db } from '../_lib/admin-auth.js'
import { withSentry } from '../lib/sentry.js'

// Admin-only: put a user on the founding deal — Family Yearly + the FOUNDING50 coupon
// (100% off for 12 months) → £0 for the first year, then renews yearly at the normal
// price. Handles three cases:
//   1. Has a subscription        → switch it to Family Yearly + apply the coupon.
//   2. No sub but a card on file  → create the Family Yearly subscription on that card.
//   3. No card at all             → can't grant (renewal needs a card); send them the link.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const FAMILY_YEARLY = process.env.VITE_STRIPE_FAMILY_YEARLY
const FOUNDING_CODE = 'FOUNDING50'
const NO_CARD = 'No card on file — this user needs to add a card. Send them the FOUNDING50 checkout link (…/get-started?promo=FOUNDING50) to claim it.'

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing user id.' })
  if (!FAMILY_YEARLY) return res.status(500).json({ error: 'Family yearly price is not configured.' })

  const { data: prof, error: profErr } = await db
    .from('profiles').select('id, email, full_name, stripe_customer_id, stripe_subscription_id').eq('id', userId).single()
  if (profErr || !prof) return res.status(404).json({ error: 'User not found.' })

  // Resolve FOUNDING50 to its Stripe coupon. Stripe distinguishes a "promotion code"
  // (customer-facing, what checkout uses) from a "coupon" (the discount itself), so try
  // both, then a case-insensitive scan — and report precisely if it's found-but-wrong.
  let coupon = null
  try {
    const promoList = await stripe.promotionCodes.list({ code: FOUNDING_CODE, limit: 1, expand: ['data.coupon'] })
    if (promoList.data[0]?.coupon) coupon = promoList.data[0].coupon
    if (!coupon) { try { coupon = await stripe.coupons.retrieve(FOUNDING_CODE) } catch { /* not a coupon id */ } }
    if (!coupon) {
      const coupons = await stripe.coupons.list({ limit: 100 })
      coupon = coupons.data.find(c => (c.id || '').toUpperCase() === FOUNDING_CODE || (c.name || '').toUpperCase() === FOUNDING_CODE) || null
    }
  } catch (e) {
    return res.status(502).json({ error: `Could not read Stripe coupons: ${e.message}` })
  }
  if (!coupon) {
    return res.status(409).json({ error: 'No FOUNDING50 promotion code or coupon found in Stripe. Create a promotion code "FOUNDING50" that points to a 100%-off (repeating, 12 months) coupon.' })
  }
  if (coupon.percent_off !== 100) {
    return res.status(409).json({ error: `Found FOUNDING50 in Stripe, but it's ${coupon.percent_off ? coupon.percent_off + '% off' : 'not a percentage discount'} — the founding deal needs a 100%-off coupon.` })
  }

  const meta = { plan: 'family', billing_cycle: 'yearly', promo_code: FOUNDING_CODE, founding_applied: 'true', user_id: userId }

  try {
    let updated

    if (prof.stripe_subscription_id) {
      // ── Case 1: modify the existing subscription ──
      const sub = await stripe.subscriptions.retrieve(prof.stripe_subscription_id)
      if (['canceled', 'incomplete_expired'].includes(sub.status)) {
        return res.status(409).json({ error: 'Their subscription is cancelled — send them the FOUNDING50 link to re-subscribe.' })
      }
      const itemId = sub.items.data[0]?.id
      const params = {
        items: [{ id: itemId, price: FAMILY_YEARLY }],
        proration_behavior: 'none',
        discounts: [{ coupon: coupon.id }],
        metadata: { ...sub.metadata, ...meta },
      }
      if (sub.status === 'trialing') params.trial_end = 'now'  // start the free year now
      updated = await stripe.subscriptions.update(prof.stripe_subscription_id, params)

    } else {
      // ── No subscription: need a customer with a card ──
      if (!prof.stripe_customer_id) return res.status(409).json({ error: NO_CARD })
      const pms = await stripe.paymentMethods.list({ customer: prof.stripe_customer_id, type: 'card', limit: 1 })
      const pm = pms.data[0]
      if (!pm) return res.status(409).json({ error: NO_CARD })

      // ── Case 2: create the subscription on their card (first invoice £0 via coupon) ──
      updated = await stripe.subscriptions.create({
        customer: prof.stripe_customer_id,
        items: [{ price: FAMILY_YEARLY }],
        default_payment_method: pm.id,
        discounts: [{ coupon: coupon.id }],
        metadata: meta,
      })
    }

    await db.from('profiles').update({
      plan:                'family',
      billing_cycle:       'yearly',
      is_founding_member:  true,
      subscription_status: updated.status === 'trialing' ? 'trialing' : 'active',
      trial_ends_at:       updated.trial_end ? new Date(updated.trial_end * 1000).toISOString() : null,
      stripe_customer_id:  updated.customer,
      stripe_subscription_id: updated.id,
      stripe_price_id:     updated.items.data[0]?.price?.id,
      current_period_end:  updated.current_period_end ? new Date(updated.current_period_end * 1000).toISOString() : null,
    }).eq('id', userId)

    return res.status(200).json({ ok: true, status: updated.status })
  } catch (err) {
    console.error('apply-founding error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
