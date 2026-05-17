import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend   = new Resend(process.env.RESEND_API_KEY)
const APP_URL  = process.env.VITE_APP_URL || 'https://www.everstead.care'

const PLAN_NAMES = { essential: 'Essential', family: 'Family' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { paymentIntentId, plan, years, gifterName, gifterEmail, recipientName, recipientEmail, personalMessage, scheduledSendAt } = req.body
  if (!paymentIntentId || !plan || !years || !gifterEmail || !recipientEmail) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Verify payment succeeded
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (intent.status !== 'succeeded') {
    return res.status(400).json({ error: 'Payment not confirmed' })
  }

  // Prevent duplicate confirms
  const { data: existing } = await supabase.from('gift_codes').select('id').eq('stripe_payment_intent_id', paymentIntentId).single()
  if (existing) return res.status(200).json({ ok: true, message: 'Already confirmed' })

  // Insert gift code
  const sendAt = scheduledSendAt ? new Date(scheduledSendAt) : new Date()
  // If scheduled in the past or within 5 minutes, treat as "send now"
  const sendNow = sendAt.getTime() <= Date.now() + 5 * 60 * 1000

  const { data: gift, error } = await supabase.from('gift_codes').insert({
    plan,
    years:                    Number(years),
    gifter_name:              gifterName || null,
    gifter_email:             gifterEmail,
    recipient_name:           recipientName || null,
    recipient_email:          recipientEmail,
    personal_message:         personalMessage || null,
    scheduled_send_at:        sendAt.toISOString(),
    stripe_payment_intent_id: paymentIntentId,
    amount_pence:             intent.amount,
    status:                   'pending',
    expires_at:               new Date(Date.now() + 12 * 30 * 86400000).toISOString(),
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  // Send gifter confirmation email
  const planName   = PLAN_NAMES[plan] || plan
  const totalGBP   = (intent.amount / 100).toFixed(0)
  const deliveryStr = sendNow
    ? 'We\'ve sent the gift to ' + (recipientName || recipientEmail) + ' right away.'
    : `It's scheduled to arrive on ${new Date(scheduledSendAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`

  await resend.emails.send({
    from:    'Everstead <hello@everstead.care>',
    to:      gifterEmail,
    subject: `Your Everstead gift is confirmed 🎁`,
    html:    gifterConfirmationHtml({ gifterName, recipientName, recipientEmail, planName, years: Number(years), totalGBP, deliveryStr }),
  }).catch(console.error)

  // If send now, mark as sent immediately — cron will send recipient email
  // (cron picks up status='pending' where scheduled_send_at <= now)

  return res.status(200).json({ ok: true, code: gift.code })
}

function gifterConfirmationHtml({ gifterName, recipientName, recipientEmail, planName, years, totalGBP, deliveryStr }) {
  const firstName = gifterName?.split(' ')[0] || 'there'
  const yearsLabel = years === 1 ? '1 year' : `${years} years`
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:32px 40px;text-align:center;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:normal;letter-spacing:0.5px;">Everstead</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Gift confirmed, ${firstName}.</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">You've given ${recipientName || recipientEmail} an Everstead <strong>${planName}</strong> plan for <strong>${yearsLabel}</strong> — the gift of peace of mind, at our launch offer price, guaranteed for life.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">${deliveryStr}</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e8e5e0;border-radius:8px;overflow:hidden;margin-bottom:32px;">
            <tr><td style="padding:16px 20px;background:#f9f8f6;">
              <p style="margin:0;color:#6b7280;font-size:13px;">Gift summary</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 8px;color:#0d1628;font-size:14px;"><strong>Plan:</strong> Everstead ${planName}</p>
              <p style="margin:0 0 8px;color:#0d1628;font-size:14px;"><strong>Duration:</strong> ${yearsLabel}</p>
              <p style="margin:0 0 8px;color:#0d1628;font-size:14px;"><strong>For:</strong> ${recipientName ? `${recipientName} (${recipientEmail})` : recipientEmail}</p>
              <p style="margin:0;color:#0d1628;font-size:14px;"><strong>Total paid:</strong> £${totalGBP}</p>
            </td></tr>
          </table>
          <p style="margin:0;color:#9ca3af;font-size:13px;">Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
