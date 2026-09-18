import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../_lib/sentry.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PRICE_IDS = {
  essential: { monthly: process.env.VITE_STRIPE_ESSENTIAL_MONTHLY, yearly: process.env.VITE_STRIPE_ESSENTIAL_YEARLY },
  family:    { monthly: process.env.VITE_STRIPE_FAMILY_MONTHLY,    yearly: process.env.VITE_STRIPE_FAMILY_YEARLY    },
  advisor:   { monthly: process.env.VITE_STRIPE_ADVISOR_MONTHLY,   yearly: process.env.VITE_STRIPE_ADVISOR_YEARLY   },
}

// France has its own EUR list price (9,99 / 99,99 TTC, tax-inclusive) for
// Everstead+, the only paid plan a member can buy themselves. Essential is
// retired and Everstead Pro is sold via demo, so neither needs a euro price:
// anything without one falls back to the GBP catalogue above.
const PRICE_IDS_EUR = {
  family: { monthly: process.env.VITE_STRIPE_FAMILY_MONTHLY_EUR, yearly: process.env.VITE_STRIPE_FAMILY_YEARLY_EUR },
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // The subscription is always created for the AUTHENTICATED user — never a
  // client-supplied userId (which would let anyone write to any profile).
  const authToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!authToken) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })
  const userId = user.id

  const { customerId, paymentMethodId, plan, billingCycle, referredBy } = req.body
  // Trials are 14 days (21 via referral) — clamp so a caller can never mint longer.
  const trialPeriodDays = Math.min(Math.max(parseInt(req.body.trialPeriodDays, 10) || 14, 1), 21)
  if (!customerId || !paymentMethodId || !plan || !billingCycle) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // The Stripe customer must be the caller's own (setup-intent wrote it at the card step).
  const { data: callerProfile } = await supabase.from('profiles')
    .select('stripe_customer_id, country, language').eq('id', userId).single()
  if (!callerProfile?.stripe_customer_id || callerProfile.stripe_customer_id !== customerId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    // Currency comes from the caller's OWN profile, never from the request body:
    // euro pricing is cheaper than sterling, so a client-supplied flag would let
    // anyone opt into it. Stripe also LOCKS a customer to one currency at their
    // first invoice, so an existing currency always wins or the create fails.
    let stripeCustomer = null
    try { stripeCustomer = await stripe.customers.retrieve(customerId) } catch { /* fall through to profile */ }
    const lockedCurrency = stripeCustomer && !stripeCustomer.deleted ? stripeCustomer.currency : null
    const wantsEur = callerProfile.country === 'France' || callerProfile.language === 'fr'
    const currency = lockedCurrency || (wantsEur ? 'eur' : 'gbp')

    const priceId = (currency === 'eur' && PRICE_IDS_EUR[plan]?.[billingCycle])
      || PRICE_IDS[plan]?.[billingCycle]
    if (!priceId) return res.status(400).json({ error: `No price ID for plan "${plan}" (${billingCycle})` })

    // Attach the confirmed payment method to the customer and set as default.
    // preferred_locales also makes Stripe's OWN receipts, invoices and hosted
    // pages render in French, which our templates cannot control.
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
      ...(callerProfile.language === 'fr' ? { preferred_locales: ['fr'] } : {}),
    })

    // Now create the subscription — card is confirmed so no payment risk.
    const subscription = await stripe.subscriptions.create({
      customer:        customerId,
      items:           [{ price: priceId }],
      default_payment_method: paymentMethodId,
      trial_period_days: trialPeriodDays,
      metadata: {
        plan,
        billing_cycle: billingCycle,
        user_id:       userId,
        ...(referredBy ? { referred_by: referredBy } : {}),
      },
    })

    const isTrialing      = subscription.status === 'trialing'
    const trialEndsAt     = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    // Sync subscription to profile immediately (webhook will also fire)
    await supabase.from('profiles').update({
      stripe_subscription_id: subscription.id,
      stripe_price_id:        subscription.items.data[0]?.price?.id,
      subscription_status:    isTrialing ? 'trialing' : 'active',
      plan,
      billing_cycle:          billingCycle,
      trial_ends_at:          trialEndsAt,
      current_period_end:     currentPeriodEnd,
      ...(referredBy ? { referred_by: referredBy } : {}),
    }).eq('id', userId)

    return res.status(200).json({ subscriptionId: subscription.id, status: subscription.status })
  } catch (err) {
    console.error('create-subscription error:', err)
    captureException(err, { endpoint: 'stripe/create-subscription', userId })
    return res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
