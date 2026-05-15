import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const PRICE_IDS = {
  essential: { yearly: process.env.VITE_STRIPE_ESSENTIAL_YEARLY },
  family:    { yearly: process.env.VITE_STRIPE_FAMILY_YEARLY    },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { code, userId, email, name } = req.body
  if (!code || !userId || !email) return res.status(400).json({ error: 'Missing fields' })

  // Validate code
  const { data: gift } = await supabase.from('gift_codes').select('*').eq('code', code).single()
  if (!gift) return res.status(404).json({ error: 'Gift code not found.' })
  if (gift.status === 'redeemed') return res.status(400).json({ error: 'This gift has already been redeemed.' })
  if (gift.status === 'expired' || new Date(gift.expires_at) < new Date()) return res.status(400).json({ error: 'This gift link has expired.' })

  const priceId = PRICE_IDS[gift.plan]?.yearly
  if (!priceId) return res.status(400).json({ error: 'Invalid plan on gift code.' })

  try {
    // Create Stripe customer for recipient
    const customer = await stripe.customers.create({ email, name: name || undefined })

    // Create subscription with long trial = years × 365 days, no payment method required
    const trialEnd = Math.floor(Date.now() / 1000) + gift.years * 365 * 86400
    const subscription = await stripe.subscriptions.create({
      customer:  customer.id,
      items:     [{ price: priceId }],
      trial_end: trialEnd,
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { plan: gift.plan, billing_cycle: 'yearly', user_id: userId, gift_code: code },
    })

    // Update profile
    await supabase.from('profiles').update({
      stripe_customer_id:    customer.id,
      stripe_subscription_id: subscription.id,
      subscription_status:   'trialing',
      plan:                   gift.plan,
      billing_cycle:          'yearly',
      trial_ends_at:          new Date(trialEnd * 1000).toISOString(),
    }).eq('id', userId)

    // Mark code redeemed
    await supabase.from('gift_codes').update({
      status:       'redeemed',
      redeemed_at:  new Date().toISOString(),
      redeemed_by:  userId,
    }).eq('id', gift.id)

    return res.status(200).json({ ok: true, plan: gift.plan, trialEnds: new Date(trialEnd * 1000).toISOString() })
  } catch (err) {
    console.error('gift redeem error:', err)
    return res.status(500).json({ error: err.message })
  }
}
