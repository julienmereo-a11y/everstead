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

  const { customerId, paymentMethodId, plan, billingCycle, userId, trialPeriodDays = 14, referredBy } = req.body
  if (!customerId || !paymentMethodId || !plan || !billingCycle || !userId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const priceId = PRICE_IDS[plan]?.[billingCycle]
  if (!priceId) return res.status(400).json({ error: `No price ID for plan "${plan}" (${billingCycle})` })

  try {
    // Attach the confirmed payment method to the customer and set as default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Now create the subscription — card is confirmed so no payment risk
    const subscription = await stripe.subscriptions.create({
      customer:        customerId,
      items:           [{ price: priceId }],
      trial_period_days: trialPeriodDays,
      default_payment_method: paymentMethodId,
      metadata: {
        plan,
        billing_cycle: billingCycle,
        user_id:       userId,
        ...(referredBy ? { referred_by: referredBy } : {}),
      },
    })

    const isTrialing      = subscription.status === 'trialing'
    const trialEndsAt     = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    // Sync subscription to profile immediately (webhook will also fire)
    await supabase.from('profiles').update({
      stripe_subscription_id: subscription.id,
      stripe_price_id:        subscription.items.data[0]?.price?.id,
      subscription_status:    isTrialing ? 'trialing' : 'active',
      plan,
      billing_cycle:          billingCycle,
      trial_ends_at:          trialEndsAt,
      current_period_end:     currentPeriodEnd,
      ...(referredBy ? { referred_by: referredBy } : {}),
    }).eq('id', userId)

    return res.status(200).json({ subscriptionId: subscription.id, status: subscription.status })
  } catch (err) {
    console.error('create-subscription error:', err)
    return res.status(500).json({ error: err.message })
  }
}
