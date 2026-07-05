import Stripe from 'stripe'
import { withSentry, captureException } from '../lib/sentry.js'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Annual price in PENCE per year (matches the new annual subscription prices).
// Kept in pennies to avoid floating-point errors when computing the charge.
const GIFT_PRICE_PENCE = {
  essential: 3828, // £38.28/year
  family:    9588, // £95.88/year
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { plan, years, gifterEmail, gifterName } = req.body
  if (!plan || !years || !gifterEmail) return res.status(400).json({ error: 'Missing fields' })
  if (!GIFT_PRICE_PENCE[plan]) return res.status(400).json({ error: 'Invalid plan' })
  if (![1,2,3].includes(Number(years))) return res.status(400).json({ error: 'Invalid years' })

  const amountPence = GIFT_PRICE_PENCE[plan] * Number(years)

  try {
    const intent = await stripe.paymentIntents.create({
      amount:   amountPence,
      currency: 'gbp',
      receipt_email: gifterEmail,
      metadata: { plan, years: String(years), gifter_name: gifterName || '' },
    })
    return res.status(200).json({ clientSecret: intent.client_secret, intentId: intent.id, amountPence })
  } catch (err) {
    console.error('gift-payment-intent error:', err)
    captureException(err, { endpoint: 'stripe/gift-payment-intent' })
    return res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
