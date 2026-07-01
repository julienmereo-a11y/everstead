import Stripe from 'stripe'
import { requireAdmin, adminDb as db } from '../_lib/admin-auth.js'

// Admin-only: put an existing subscriber on the founding deal — switch them to the
// Family Yearly price and apply the FOUNDING50 coupon (100% off for 12 months), so
// they pay £0 for the first year, then renew yearly at the normal price.
//
// Requires a card/subscription already on file (the coupon is a discount, not a
// payment method). Users with no subscription must complete checkout first.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const FAMILY_YEARLY = process.env.VITE_STRIPE_FAMILY_YEARLY
const FOUNDING_CODE = 'FOUNDING50'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing user id.' })
  if (!FAMILY_YEARLY) return res.status(500).json({ error: 'Family yearly price is not configured.' })

  const { data: prof, error: profErr } = await db
    .from('profiles').select('id, email, full_name, stripe_subscription_id').eq('id', userId).single()
  if (profErr || !prof) return res.status(404).json({ error: 'User not found.' })
  if (!prof.stripe_subscription_id) {
    return res.status(409).json({ error: 'This user has no active subscription. They need to complete checkout (add a card) first — send them the FOUNDING50 link.' })
  }

  // Resolve FOUNDING50 → its coupon, and refuse if it isn't genuinely 100% off.
  let coupon
  try {
    const list = await stripe.promotionCodes.list({ code: FOUNDING_CODE, active: true, limit: 1, expand: ['data.coupon'] })
    coupon = list.data[0]?.coupon
  } catch (e) {
    return res.status(502).json({ error: `Could not read the FOUNDING50 coupon from Stripe: ${e.message}` })
  }
  if (!coupon || coupon.percent_off !== 100) {
    return res.status(409).json({ error: 'The FOUNDING50 coupon is missing or not 100% off in Stripe. Fix the coupon before applying.' })
  }

  try {
    const sub = await stripe.subscriptions.retrieve(prof.stripe_subscription_id)
    if (['canceled', 'incomplete_expired'].includes(sub.status)) {
      return res.status(409).json({ error: 'This subscription is cancelled — they need to re-subscribe via the FOUNDING50 link.' })
    }
    const itemId = sub.items.data[0]?.id

    const params = {
      items: [{ id: itemId, price: FAMILY_YEARLY }],
      proration_behavior: 'none',
      discounts: [{ coupon: coupon.id }],
      metadata: { ...sub.metadata, plan: 'family', billing_cycle: 'yearly', promo_code: FOUNDING_CODE, founding_applied: 'true' },
    }
    // End any trial so the free year (via the coupon) starts now.
    if (sub.status === 'trialing') params.trial_end = 'now'

    const updated = await stripe.subscriptions.update(prof.stripe_subscription_id, params)

    await db.from('profiles').update({
      plan:                'family',
      billing_cycle:       'yearly',
      is_founding_member:  true,
      subscription_status: updated.status === 'trialing' ? 'trialing' : 'active',
      trial_ends_at:       updated.trial_end ? new Date(updated.trial_end * 1000).toISOString() : null,
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
