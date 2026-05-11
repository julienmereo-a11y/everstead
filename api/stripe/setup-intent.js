import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email, name, plan, billingCycle, referredBy, trialPeriodDays = 14 } = req.body
  if (!userId || !email) return res.status(400).json({ error: 'Missing required fields' })

  const priceId = PRICE_IDS[plan]?.[billingCycle]
  if (!priceId) return res.status(400).json({ error: `No price ID for plan "${plan}" (${billingCycle})` })

  try {
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
    })

    // Create subscription with trial.
    // payment_behavior: 'default_incomplete' means Stripe creates a pending_setup_intent
    // so we can collect the card inline without charging yet.
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      trial_period_days: trialPeriodDays,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['pending_setup_intent'],
      metadata: {
        plan,
        billing_cycle: billingCycle,
        user_id:       userId,
        ...(referredBy ? { referred_by: referredBy } : {}),
      },
    })

    // Pre-populate stripe IDs on the profile so the webhook has a fallback lookup.
    // The customer.subscription.created webhook will also update these via user_id metadata.
    await supabase
      .from('profiles')
      .update({
        stripe_customer_id:     customer.id,
        stripe_subscription_id: subscription.id,
      })
      .eq('id', userId)

    const clientSecret = subscription.pending_setup_intent?.client_secret
    if (!clientSecret) {
      throw new Error('Stripe did not return a pending_setup_intent — the subscription may already have a payment method.')
    }

    return res.status(200).json({
      clientSecret,
      customerId:     customer.id,
      subscriptionId: subscription.id,
    })
  } catch (err) {
    console.error('setup-intent error:', err)
    return res.status(500).json({ error: err.message })
  }
}
