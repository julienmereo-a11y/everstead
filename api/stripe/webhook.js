import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export const config = { api: { bodyParser: false } }

async function buffer(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  let event

  try {
    const buf = await buffer(req)
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const customerId    = session.customer
    const customerEmail = session.customer_details?.email
    const subscriptionId = session.subscription

    // Fetch subscription to get plan details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = subscription.items.data[0]?.price?.id

    // Update profile
    const { data: profiles } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id:   customerId,
        subscription_status:  'trialing',
        stripe_subscription_id: subscriptionId,
        stripe_price_id:      priceId,
      })
      .eq('email', customerEmail)
      .select('id, full_name, email, plan')

    // Send payment confirmed email
    if (profiles?.[0]) {
      const p = profiles[0]
      await resend.emails.send({
        from:    'Everstead <julien@everstead.care>',
        to:      p.email,
        subject: 'Your Everstead trial has started',
        html:    paymentConfirmedHtml(p.full_name, p.plan),
      }).catch(console.error)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    await supabase
      .from('profiles')
      .update({ subscription_status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id)
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    await supabase
      .from('profiles')
      .update({ subscription_status: subscription.status })
      .eq('stripe_subscription_id', subscription.id)
  }

  res.status(200).json({ received: true })
}

function paymentConfirmedHtml(name, plan) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:normal;letter-spacing:0.5px;">Everstead</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Your trial has started, ${name || 'there'}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Your 14-day free trial on the <strong>${plan || 'Essential'}</strong> plan is now active. You won't be charged until your trial ends.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">Head to your dashboard to start organising your estate and adding trusted people.</p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to dashboard →</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">Questions? Reply to this email or contact <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
