import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../lib/sentry.js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify auth
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { primaryUserId, primaryName, secondaryEmail, inviteToken } = req.body
  if (!primaryUserId || !secondaryEmail || !inviteToken) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const inviteUrl = `${APP_URL}/accept-family-invite?token=${inviteToken}`

  try {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      secondaryEmail,
      subject: `${primaryName || 'Someone'} has invited you to join their Everstead+ plan`,
      html:    familyInviteHtml(primaryName, inviteUrl),
    })

    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send-family-invite error:', err)
    captureException(err, { endpoint: 'emails/send-family-invite' })
    res.status(500).json({ error: err.message })
  }
}

function familyInviteHtml(primaryName, inviteUrl) {
  // Escape the inviter's name before it enters the email HTML (inviteUrl is server-built).
  primaryName = String(primaryName ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
  const items = [
    'Your own private vault — fully separate from theirs',
    'Organise your accounts, documents, and final wishes',
    'Control exactly what, if anything, you share',
    'Covered by their Everstead+ plan — no extra cost to you',
  ]
  const listItems = items.map(item =>
    `<tr>
      <td style="padding:0 0 10px;vertical-align:top;width:20px;color:#4c7d47;font-size:15px;">✓</td>
      <td style="padding:0 0 10px;color:#4a5568;font-size:15px;line-height:1.5;">${item}</td>
    </tr>`
  ).join('')

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
            ${primaryName || 'Someone'} has invited you to Everstead
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
            <strong>${primaryName || 'Someone'}</strong> has invited you to set up your own private Everstead vault — as part of their Everstead+ plan.
          </p>
          <p style="margin:0 0 20px;color:#4a5568;font-size:16px;line-height:1.6;">
            You'll have your own completely private account. <strong>${primaryName || 'They'}</strong> won't be able to see your documents, accounts, or wishes unless you choose to share them.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            ${listItems}
          </table>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);border-radius:9999px;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;">Accept invitation →</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.
          </p>
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

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
