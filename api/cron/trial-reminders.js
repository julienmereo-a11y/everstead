import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // Vercel automatically sends this header for cron invocations
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Find users whose trial ends in the next 3–4 days and haven't paid yet
  const now       = new Date()
  const windowStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, trial_ends_at')
    .eq('subscription_status', 'trialing')
    .gte('trial_ends_at', windowStart.toISOString())
    .lt('trial_ends_at', windowEnd.toISOString())

  if (error) {
    console.error('trial-reminders query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!profiles?.length) {
    return res.status(200).json({ sent: 0, message: 'No trials ending in 3 days' })
  }

  const results = await Promise.allSettled(
    profiles.map((p) =>
      resend.emails.send({
        from:    'Everstead <julien@everstead.care>',
        to:      p.email,
        subject: 'Your Everstead trial ends in 3 days',
        html:    trialEndingHtml(p.full_name, p.plan, p.trial_ends_at, 3),
      })
    )
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed    = results.filter((r) => r.status === 'rejected').length

  console.log(`trial-reminders: sent ${succeeded}, failed ${failed}`)
  res.status(200).json({ sent: succeeded, failed, total: profiles.length })
}

function trialEndingHtml(name, plan, trialEndsAt, daysLeft) {
  const endDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const appUrl = process.env.VITE_APP_URL || 'https://www.everstead.care'

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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Your trial ends in ${daysLeft} days</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Hi ${name || 'there'}, your free trial on the <strong>${plan || 'Essential'}</strong> plan ends${endDate ? ` on <strong>${endDate}</strong>` : ' soon'}.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">Add your payment details before then to keep access to your estate plan, documents, and trusted contacts.</p>
          <a href="${appUrl}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Add payment details →</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
