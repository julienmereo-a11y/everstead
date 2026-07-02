import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─────────────────────────────────────────────────────────────
// GEO ENFORCEMENT — mirrors GEO_CONFIG in GetStarted.jsx
// Uses x-vercel-ip-country (injected by Vercel automatically, zero latency)
// as a second layer of enforcement. Client-side check handles UX; this
// handles VPN bypass and direct API calls.
// ─────────────────────────────────────────────────────────────
const GEO_SANCTIONED = new Set([
  'RU', 'BY', 'KP', 'IR', 'SY', 'MM', 'VE', 'AF', 'IQ', 'LY', 'SD', 'YE',
])
const GEO_AFRICA = new Set([
  'DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CD','CG','CI',
  'DJ','EG','GQ','ER','ET','GA','GM','GH','GN','GW','KE','LS','LR',
  'MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN',
  'SC','SL','SO','SS','SZ','TZ','TG','TN','UG','ZM','ZW',
])
const GEO_ALLOWED = new Set([
  'GB','IE','US','CA','AU',
  'AE','QA','SA','KW','BH','OM',
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
  'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'IS','LI','NO','CH',
])

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Always operate on the AUTHENTICATED user — a client-supplied userId would let
  // anyone overwrite another profile's stripe_customer_id.
  const authToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!authToken) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' })
  const userId = user.id

  const { name, plan, billingCycle, referredBy, existingCustomerId } = req.body
  const email = user.email || req.body.email
  // Clamp: 14 days standard, 21 via referral — never client-mintable beyond that.
  const trialPeriodDays = Math.min(Math.max(parseInt(req.body.trialPeriodDays, 10) || 14, 1), 21)
  if (!email) return res.status(400).json({ error: 'Missing required fields' })

  // A resumed customer must be the caller's own.
  if (existingCustomerId) {
    const { data: prof } = await supabase.from('profiles')
      .select('stripe_customer_id').eq('id', userId).single()
    if (prof?.stripe_customer_id !== existingCustomerId) {
      return res.status(403).json({ error: 'Forbidden' })
    }
  }

  // ── IP-based geo enforcement (Vercel injects x-vercel-ip-country, no API call needed)
  const ipCountry = req.headers['x-vercel-ip-country']
  if (ipCountry) {
    if (GEO_SANCTIONED.has(ipCountry) || GEO_AFRICA.has(ipCountry)) {
      return res.status(403).json({ error: 'Service unavailable in your country due to regulatory restrictions.' })
    }
    // Soft-warn markets are allowed to proceed (they dismissed the banner client-side)
  }

  try {
    // Reuse existing customer if provided (resume-checkout flow),
    // otherwise create a new one. No subscription created yet.
    let customer
    if (existingCustomerId) {
      customer = await stripe.customers.retrieve(existingCustomerId)
    } else {
      customer = await stripe.customers.create({ email, name: name || undefined })
    }

    // Standalone SetupIntent — collects and saves the card without creating a subscription.
    // Metadata carries everything needed by create-subscription.js after confirmation.
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        plan,
        billing_cycle:      billingCycle,
        user_id:            userId,
        trial_period_days:  String(trialPeriodDays),
        ...(referredBy ? { referred_by: referredBy } : {}),
      },
    })

    // Save customer ID to profile.
    // Also stamp checkout_started_at on first creation (not on resume) so the
    // abandoned-checkout cron can reliably detect who reached the payment step.
    const profileUpdate = { stripe_customer_id: customer.id }
    if (!existingCustomerId) {
      profileUpdate.checkout_started_at = new Date().toISOString()
    }
    await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId)

    return res.status(200).json({
      clientSecret: setupIntent.client_secret,
      customerId:   customer.id,
    })
  } catch (err) {
    console.error('setup-intent error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
