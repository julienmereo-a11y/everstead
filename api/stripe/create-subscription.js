import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../lib/sentry.js'

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

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // The subscription is always created for the AUTHENTICATED user — never a
  // client-supplied userId (which would let anyone write to any profile).
  const authToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!authToken) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })
  const userId = user.id

  const { customerId, paymentMethodId, plan, billingCycle, referredBy, promoCode } = req.body
  // Trials are 14 days (21 via referral) — clamp so a caller can never mint longer.
  const trialPeriodDays = Math.min(Math.max(parseInt(req.body.trialPeriodDays, 10) || 14, 1), 21)
  if (!customerId || !paymentMethodId || !plan || !billingCycle) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // The Stripe customer must be the caller's own (setup-intent wrote it at the card step).
  const { data: callerProfile } = await supabase.from('profiles')
    .select('stripe_customer_id').eq('id', userId).single()
  if (!callerProfile?.stripe_customer_id || callerProfile.stripe_customer_id !== customerId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const priceId = PRICE_IDS[plan]?.[billingCycle]
  if (!priceId) return res.status(400).json({ error: `No price ID for plan "${plan}" (${billingCycle})` })

  try {
    // Attach the confirmed payment method to the customer and set as default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Resolve an optional promotion code (e.g. FOUNDING50) to its ID.
    // Best-effort: if the code is invalid/exhausted we proceed WITHOUT the
    // discount rather than failing the signup after the card is confirmed.
    let promotionCodeId = null
    let couponFullyFree = false // a 100%-off promo (e.g. FOUNDING50) IS the free period
    // Members who register with the FOUNDING50 code become founding members.
    const isFoundingMember = !!promoCode && String(promoCode).trim().toUpperCase() === 'FOUNDING50'
    if (promoCode) {
      try {
        const list = await stripe.promotionCodes.list({
          code: String(promoCode).trim(), active: true, limit: 1, expand: ['data.coupon'],
        })
        const promo = list.data[0]
        const exhausted = promo?.max_redemptions != null && promo.times_redeemed >= promo.max_redemptions
        const expired   = promo?.expires_at && promo.expires_at * 1000 < Date.now()
        if (promo && !exhausted && !expired) {
          promotionCodeId = promo.id
          couponFullyFree = promo.coupon?.percent_off === 100
        }
      } catch (e) {
        console.error('create-subscription promo lookup failed:', e.message)
        captureException(e, { endpoint: 'stripe/create-subscription', stage: 'promo-lookup', userId })
      }
    }

    // Now create the subscription — card is confirmed so no payment risk.
    // A 100%-off promo (FOUNDING50 = Everstead+ free for life) REPLACES the trial: the
    // discounted period is the free time, so adding a 14-day trial on top just
    // makes Stripe show a "14-day trial" instead of the free year. We drop the
    // trial only when Stripe confirms the coupon is genuinely 100% off, so a
    // misconfigured/partial coupon can never turn the trial off and surprise-charge.
    const subParams = {
      customer:        customerId,
      items:           [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: {
        plan,
        billing_cycle: billingCycle,
        user_id:       userId,
        ...(referredBy ? { referred_by: referredBy } : {}),
        ...(promotionCodeId ? { promo_code: String(promoCode).trim() } : {}),
      },
    }
    if (!couponFullyFree) subParams.trial_period_days = trialPeriodDays
    if (promotionCodeId) subParams.discounts = [{ promotion_code: promotionCodeId }]

    let subscription
    try {
      subscription = await stripe.subscriptions.create(subParams)
    } catch (e) {
      // If the discount raced to its redemption limit between validation and
      // now, retry once without it so the user still gets an account.
      if (promotionCodeId) {
        console.error('create-subscription with discount failed, retrying without:', e.message)
        // Worth knowing even though we recover — the user silently loses their
        // discount (e.g. FOUNDING50) and gets charged full price.
        captureException(e, { endpoint: 'stripe/create-subscription', stage: 'discount-retry', userId, promoCode })
        delete subParams.discounts
        delete subParams.metadata.promo_code
        subscription = await stripe.subscriptions.create(subParams)
      } else {
        throw e
      }
    }

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

    // Tag founding members (registered with FOUNDING50) as a separate best-effort
    // write, so it can never break the core profile sync above.
    if (isFoundingMember && promotionCodeId) {
      const { error: foundingErr } = await supabase
        .from('profiles').update({ is_founding_member: true }).eq('id', userId)
      if (foundingErr) {
        console.error('could not set is_founding_member:', foundingErr.message)
        captureException(foundingErr, { endpoint: 'stripe/create-subscription', stage: 'founding-flag', userId })
      }
    }

    return res.status(200).json({ subscriptionId: subscription.id, status: subscription.status })
  } catch (err) {
    console.error('create-subscription error:', err)
    captureException(err, { endpoint: 'stripe/create-subscription', userId })
    return res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
