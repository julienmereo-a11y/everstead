import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const GIFT_PRICES = {
  essential: 60,  // £/year
  family:    144, // £/year
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { plan, years, gifterEmail, gifterName } = req.body
  if (!plan || !years || !gifterEmail) return res.status(400).json({ error: 'Missing fields' })
  if (!GIFT_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' })
  if (![1,2,3].includes(Number(years))) return res.status(400).json({ error: 'Invalid years' })

  const amountPence = GIFT_PRICES[plan] * Number(years) * 100

  try {
    const intent = await stripe.paymentIntents.create({
      amount:   amountPence,
      currency: 'gbp',
      receipt_email: gifterEmail,
      metadata: { plan, years: String(years), gifter_name: gifterName || '' },
    })
    return res.status(200).json({ clientSecret: intent.client_secret, intentId: intent.id, amountPence })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
