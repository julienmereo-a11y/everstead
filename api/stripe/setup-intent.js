import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email, name, plan, billingCycle, referredBy, trialPeriodDays = 14, existingCustomerId } = req.body
  if (!userId || !email) return res.status(400).json({ error: 'Missing required fields' })

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

    // Save only customer ID to profile — no subscription_status change yet
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
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
