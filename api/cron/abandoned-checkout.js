import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Find users who:
  // - Created an account more than 1 hour ago but less than 48 hours ago
  // - Have no stripe_subscription_id (never completed checkout)
  // - Have not been sent an abandoned checkout email yet
  // - Are not delegates
  const now      = new Date()
  const oneHourAgo  = new Date(now.getTime() - 1  * 60 * 60 * 1000).toISOString()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  const { data: abandoned, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, billing_cycle, created_at')
    .is('stripe_subscription_id', null)
    .is('abandoned_checkout_email_sent_at', null)
    .neq('role', 'delegate')
    .not('email', 'is', null)
    .lte('created_at', oneHourAgo)
    .gte('created_at', fortyEightHoursAgo)

  if (error) {
    console.error('abandoned-checkout query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!abandoned?.length) {
    return res.status(200).json({ sent: 0 })
  }

  let sent = 0
  for (const user of abandoned) {
    try {
      await resend.emails.send({
        from:    'Julien at Everstead <hello@everstead.care>',
        to:      user.email,
        subject: 'Your Everstead free trial is ready — you just need to add your card',
        html:    abandonedCheckoutHtml(user.full_name, user.plan),
      })

      // Mark as sent so we don't email them again
      await supabase
        .from('profiles')
        .update({ abandoned_checkout_email_sent_at: new Date().toISOString() })
        .eq('id', user.id)

      sent++
    } catch (err) {
      console.error(`abandoned-checkout email error for ${user.email}:`, err)
    }
  }

  return res.status(200).json({ sent, total: abandoned.length })
}

function abandonedCheckoutHtml(name, plan) {
  const firstName = name?.split(' ')[0] || 'there'
  const planName  = plan
    ? plan.charAt(0).toUpperCase() + plan.slice(1)
    : 'Essential'

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
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
            ${firstName}, your free trial is waiting.
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            You created your Everstead account but didn't quite finish — your <strong>${planName}</strong> plan and 14-day free trial are still here, ready to go.
          </p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            All you need to do is add your card to activate it. You won't be charged for 14 days, and you can cancel any time before then.
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            It takes about 30 seconds.
          </p>
          <a href="${process.env.VITE_APP_URL}/get-started?resume=true"
             style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">
            Complete your free trial →
          </a>
          <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
            — Julien, founder of Everstead
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            Questions? Reply to this email or write to <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
