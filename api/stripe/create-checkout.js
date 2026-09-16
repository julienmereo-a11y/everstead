import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../_lib/sentry.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Signup calls this before a session exists, so it cannot simply require a
// token. It can refuse to be a general-purpose Stripe session factory: only
// prices we actually sell, and a customer id only when the caller proves the
// customer is theirs. Mirrors PRICE_IDS in create-subscription.js.
const ALLOWED_PRICES = new Set([
  process.env.VITE_STRIPE_ESSENTIAL_MONTHLY, process.env.VITE_STRIPE_ESSENTIAL_YEARLY,
  process.env.VITE_STRIPE_FAMILY_MONTHLY,    process.env.VITE_STRIPE_FAMILY_YEARLY,
  process.env.VITE_STRIPE_ADVISOR_MONTHLY,   process.env.VITE_STRIPE_ADVISOR_YEARLY,
  process.env.VITE_STRIPE_FAMILY_MONTHLY_EUR, process.env.VITE_STRIPE_FAMILY_YEARLY_EUR,
].filter(Boolean))

/** The Stripe customer this caller owns, or null. Never trusts the body. */
async function ownCustomerId(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()
  return data?.stripe_customer_id || null
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { priceId, userEmail, customerId, trialEnd, trialPeriodDays, cancelUrl, plan, billingCycle, referredBy } = req.body

  if (!priceId) return res.status(400).json({ error: 'Missing priceId' })
  if (!ALLOWED_PRICES.has(priceId)) return res.status(400).json({ error: 'Unknown price' })

  // A customer id from the body would let anyone bind a checkout session to
  // someone else's Stripe customer. Only the caller's own is honoured.
  const ownCustomer = await ownCustomerId(req)
  const safeCustomerId = (ownCustomer && customerId === ownCustomer) ? ownCustomer : null

  // Embed plan + billing_cycle + referredBy as metadata so the webhook can sync them
  const metadata = {}
  if (plan)         metadata.plan          = plan
  if (billingCycle) metadata.billing_cycle = billingCycle
  if (referredBy)   metadata.referred_by   = referredBy

  let subscriptionData
  if (trialPeriodDays === 0) {
    // Explicit no-trial — post-trial checkout
    subscriptionData = { metadata }
  } else if (trialEnd) {
    // trialEnd is a JS timestamp (ms). Stripe needs Unix seconds and requires the
    // value to be at least 48 hours in the future. CLAMPED to 21 days out — the
    // longest legitimate trial (referral) — so a caller can't mint free years.
    const trialEndUnix = Math.floor(trialEnd / 1000)
    const minTrialEnd  = Math.floor(Date.now() / 1000) + 48 * 3600
    const maxTrialEnd  = Math.floor(Date.now() / 1000) + 21 * 86400
    subscriptionData = trialEndUnix > minTrialEnd
      ? { trial_end: Math.min(trialEndUnix, maxTrialEnd), metadata }
      : { trial_period_days: 14, metadata }
  } else {
    subscriptionData = { trial_period_days: 14, metadata }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
      success_url: `${process.env.VITE_APP_URL}/dashboard?checkout=success`,
      cancel_url:  cancelUrl ? `${process.env.VITE_APP_URL}${cancelUrl}` : `${process.env.VITE_APP_URL}/pricing`,
      ...(safeCustomerId
        ? { customer: safeCustomerId }
        : { customer_email: userEmail }),
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    captureException(err, { endpoint: 'stripe/create-checkout' })
    res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
