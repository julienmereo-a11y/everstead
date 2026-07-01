import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { priceId, userEmail, customerId, trialEnd, trialPeriodDays, cancelUrl, plan, billingCycle, referredBy } = req.body

  if (!priceId) return res.status(400).json({ error: 'Missing priceId' })

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
      ...(customerId
        ? { customer: customerId }
        : { customer_email: userEmail }),
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('create-checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
