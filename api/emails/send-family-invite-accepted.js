import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify auth
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { primaryEmail, primaryName, secondaryName } = req.body
  if (!primaryEmail) return res.status(400).json({ error: 'Missing primaryEmail' })

  try {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      primaryEmail,
      subject: `${secondaryName || 'Your partner'} has joined your Everstead Family plan`,
      html:    familyInviteAcceptedHtml(primaryName, secondaryName, APP_URL),
    })

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send-family-invite-accepted error:', err)
    res.status(500).json({ error: err.message })
  }
}

function familyInviteAcceptedHtml(primaryName, secondaryName, appUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;line-height:1.3;">
            ${secondaryName || 'Your partner'} has joined your Family plan
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            Hi ${primaryName || 'there'},
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">
            <strong>${secondaryName || 'Your partner'}</strong> has accepted your invitation and set up their private vault. They're now part of your Family plan. Their data remains completely private to them unless they choose to share it with you.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:9999px;">
              <a href="${appUrl}/dashboard" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;">View your dashboard →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a><br />
            <span style="display:block;margin-top:8px;">— Julien, Everstead</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
