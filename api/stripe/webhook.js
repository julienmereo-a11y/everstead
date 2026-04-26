import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    return res.status(400).json({ error: `Webhook error: ${error.message}` })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object

      await supabase
        .from('profiles')
        .update({
          stripe_customer_id: session.customer,
          subscription_status: 'active',
          plan: session.metadata?.plan || 'essential',
        })
        .eq('id', session.client_reference_id)

      await fetch(`${process.env.VITE_APP_URL}/api/emails/send-payment-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.customer_email,
          firstName: session.customer_details?.name?.split(' ')[0] || 'there',
          plan: session.metadata?.plan || 'Essential',
          billingCycle: session.metadata?.billingCycle || 'yearly',
          amount: session.metadata?.amount || '',
        }),
      }).catch(console.error)

      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      await supabase
        .from('profiles')
        .update({ subscription_status: 'cancelled' })
        .eq('stripe_customer_id', subscription.customer)
      break
    }
  }

  res.status(200).json({ received: true })
}