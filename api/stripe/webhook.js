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

  // ── checkout.session.completed ────────────────────────────
  // Fires immediately when user completes checkout — even if on trial.
  // Sets stripe IDs, subscription_status, and trial_ends_at from Stripe.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const customerId     = session.customer
    const customerEmail  = session.customer_details?.email
    const subscriptionId = session.subscription

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId      = subscription.items.data[0]?.price?.id
    const isTrialing   = subscription.status === 'trialing'

    // trial_ends_at comes from Stripe — the authoritative source
    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null

    const { data: profiles } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id:     customerId,
        subscription_status:    isTrialing ? 'trialing' : 'active',
        stripe_subscription_id: subscriptionId,
        stripe_price_id:        priceId,
        trial_ends_at:          trialEndsAt,
      })
      .eq('email', customerEmail)
      .select('id, full_name, email, plan')

    if (profiles?.[0]) {
      const p = profiles[0]
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: isTrialing
          ? 'Your Everstead trial has started — card saved'
          : 'Your Everstead subscription is confirmed',
        html: paymentConfirmedHtml(p.full_name, p.plan, isTrialing, subscription.trial_end ?? subscription.current_period_end),
      }).catch(console.error)
    }
  }

  // ── customer.subscription.deleted ────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    await supabase
      .from('profiles')
      .update({ subscription_status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id)
  }

  // ── customer.subscription.updated ────────────────────────
  // Fires when trial converts to active, or subscription changes.
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    await supabase
      .from('profiles')
      .update({ subscription_status: subscription.status })
      .eq('stripe_subscription_id', subscription.id)
  }

  // ── customer.subscription.trial_will_end ─────────────────
  // Fires 3 days before the trial ends — send a reminder email.
  if (event.type === 'customer.subscription.trial_will_end') {
    const subscription = event.data.object

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, plan')
      .eq('stripe_subscription_id', subscription.id)

    if (profiles?.[0]) {
      const p = profiles[0]
      const trialEndDate = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
        : null

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: 'Your Everstead trial ends in 3 days',
        html:    trialEndingReminderHtml(p.full_name, p.plan, trialEndDate),
      }).catch(console.error)
    }
  }

  // ── invoice.payment_failed ────────────────────────────────
  // Fires when Stripe cannot charge the card — at trial end or renewal.
  // Mark the profile so the user is shown the payment-failed screen.
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object

    await supabase
      .from('profiles')
      .update({ subscription_status: 'trial_expired' })
      .eq('stripe_customer_id', invoice.customer)

    // Fetch profile to send a notification email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, plan')
      .eq('stripe_customer_id', invoice.customer)

    if (profiles?.[0]) {
      const p = profiles[0]
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: 'Action required — payment failed for Everstead',
        html:    paymentFailedHtml(p.full_name, p.plan),
      }).catch(console.error)
    }
  }

  res.status(200).json({ received: true })
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────

function paymentConfirmedHtml(name, plan, isTrialing, periodEnd) {
  const chargeDate = periodEnd
    ? new Date(periodEnd * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const bodyText = isTrialing
    ? `Your card has been saved for your <strong>${plan || 'Essential'}</strong> plan. Your 14-day free trial is now active — you won't be charged until it ends${chargeDate ? ` on <strong>${chargeDate}</strong>` : ''}.`
    : `Your <strong>${plan || 'Essential'}</strong> plan is now active. Your payment was confirmed and your subscription starts today.`

  return emailShell(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${isTrialing ? `Trial started, ${name || 'there'}` : `Subscription confirmed, ${name || 'there'}`}
    </h1>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">${bodyText}</p>
    <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to dashboard →</a>
  `)
}

function trialEndingReminderHtml(name, plan, endDate) {
  return emailShell(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Your trial ends in 3 days, ${name || 'there'}</h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
      Your 14-day free trial on the <strong>${plan || 'Essential'}</strong> plan ends${endDate ? ` on <strong>${endDate}</strong>` : ' soon'}.
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">
      Your card on file will be charged automatically when the trial ends. No action is needed — just continue using Everstead.
      If you'd like to cancel before being charged, you can do so from your account settings.
    </p>
    <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to dashboard →</a>
  `)
}

function paymentFailedHtml(name, plan) {
  return emailShell(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Payment failed, ${name || 'there'}</h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
      We were unable to charge the card on file for your <strong>${plan || 'Essential'}</strong> plan.
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">
      Please update your payment method to keep your plan active. Your data is safe and will remain for 30 days.
    </p>
    <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Update payment method →</a>
  `)
}

function emailShell(body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">${body}</td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
