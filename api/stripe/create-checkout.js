import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { priceId, userEmail, customerId } = req.body

  if (!priceId) return res.status(400).json({ error: 'Missing priceId' })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14 },
      success_url: `${process.env.VITE_APP_URL}/dashboard?checkout=success`,
      cancel_url:  `${process.env.VITE_APP_URL}/pricing`,
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
