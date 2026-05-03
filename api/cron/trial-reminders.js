import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, trial_ends_at, reminder_7_sent, reminder_3_sent, reminder_1_sent')
    .eq('subscription_status', 'trialing')
    .not('trial_ends_at', 'is', null)

  if (error) {
    console.error('trial-reminders query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!profiles?.length) {
    return res.status(200).json({ sent: 0, message: 'No active trials' })
  }

  const now = Date.now()
  let sent = 0

  await Promise.allSettled(
    profiles.map(async (p) => {
      const msLeft   = new Date(p.trial_ends_at).getTime() - now
      const daysLeft = Math.ceil(msLeft / 86400000)

      const tasks = []

      if (daysLeft <= 7 && daysLeft > 6 && !p.reminder_7_sent) {
        tasks.push({ daysLeft: 7, flag: 'reminder_7_sent' })
      }
      if (daysLeft <= 3 && daysLeft > 2 && !p.reminder_3_sent) {
        tasks.push({ daysLeft: 3, flag: 'reminder_3_sent' })
      }
      if (daysLeft <= 1 && daysLeft > 0 && !p.reminder_1_sent) {
        tasks.push({ daysLeft: 1, flag: 'reminder_1_sent' })
      }

      for (const task of tasks) {
        try {
          await resend.emails.send({
            from:    'Everstead <julien@everstead.care>',
            to:      p.email,
            subject: task.daysLeft === 1
              ? 'Your Everstead trial ends tomorrow'
              : `Your Everstead trial ends in ${task.daysLeft} days`,
            html: trialEndingHtml(p.full_name, p.plan, p.trial_ends_at, task.daysLeft),
          })
          await supabase
            .from('profiles')
            .update({ [task.flag]: true })
            .eq('id', p.id)
          sent++
        } catch (err) {
          console.error(`trial-reminders: failed for ${p.email} (${task.daysLeft}d):`, err)
        }
      }
    })
  )

  console.log(`trial-reminders: sent ${sent} emails`)
  res.status(200).json({ sent })
}

function trialEndingHtml(name, plan, trialEndsAt, daysLeft) {
  const endDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const appUrl = process.env.VITE_APP_URL || 'https://www.everstead.care'
  const subject = daysLeft === 1 ? 'Your trial ends tomorrow.' : `Your trial ends in ${daysLeft} days.`

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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${subject}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Hi ${name || 'there'}, your free trial on the <strong>${plan || 'Essential'}</strong> plan ends${endDate ? ` on <strong>${endDate}</strong>` : ' soon'}.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">Add your payment details before then to keep access to your estate plan, documents, and trusted contacts.</p>
          <a href="${appUrl}/trial-ended" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Continue with Everstead →</a>
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
