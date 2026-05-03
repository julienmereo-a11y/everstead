import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend   = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId } = req.body
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!userId || !token) return res.status(400).json({ error: 'Missing fields' })

  // Verify the token belongs to the user being deleted
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user || user.id !== userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Fetch profile for email
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()

  // Mark as pending_deletion — actual data removed within 30 days by scheduled job
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: 'pending_deletion' })
    .eq('id', userId)

  if (error) {
    console.error('delete-account error:', error)
    return res.status(500).json({ error: error.message })
  }

  // Send deletion confirmation email (fire-and-forget)
  if (profile?.email) {
    resend.emails.send({
      from:    'Everstead <julien@everstead.care>',
      to:      profile.email,
      subject: 'Your Everstead account is scheduled for deletion',
      html:    deletionHtml(profile.full_name),
    }).catch(console.error)
  }

  res.status(200).json({ scheduled: true })
}

function deletionHtml(name) {
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Account deletion requested</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Hi ${name || 'there'}, we've received your request to delete your Everstead account.</p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Your data will be permanently removed within <strong>30 days</strong>. If this was a mistake, contact us within that window and we can restore your account.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">We're sorry to see you go. If there's anything we could have done better, reply to this email — we read every message.</p>
          <a href="mailto:support@everstead.care" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Contact support</a>
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
