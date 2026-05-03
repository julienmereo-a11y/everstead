import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { priceId, userEmail, customerId, trialEnd, cancelUrl } = req.body

  if (!priceId) return res.status(400).json({ error: 'Missing priceId' })

  // trialEnd is a JS timestamp (ms). Stripe needs Unix seconds and requires
  // the value to be at least 48 hours in the future.
  const trialEndUnix = trialEnd ? Math.floor(trialEnd / 1000) : null
  const minTrialEnd  = Math.floor(Date.now() / 1000) + 48 * 3600
  const subscriptionData = trialEndUnix && trialEndUnix > minTrialEnd
    ? { trial_end: trialEndUnix }
    : { trial_period_days: 14 }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
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
