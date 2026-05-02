import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { ownerName, ownerEmail, inviteeName, role } = req.body
  if (!ownerEmail) return res.status(400).json({ error: 'Missing ownerEmail' })

  try {
    await resend.emails.send({
      from:    'Everstead <julien@everstead.care>',
      to:      ownerEmail,
      subject: `${inviteeName || 'Someone'} has accepted your invite`,
      html:    inviteAcceptedHtml(ownerName, inviteeName, role),
    })
    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send-invite-accepted error:', err)
    res.status(500).json({ error: err.message })
  }
}

function inviteAcceptedHtml(ownerName, inviteeName, role) {
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${inviteeName || 'Your contact'} has accepted your invite</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Hi ${ownerName || 'there'}, <strong>${inviteeName || 'your contact'}</strong>${role ? ` (${role})` : ''} has accepted your Everstead invitation and can now access their permitted sections of your estate plan.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">You can review and manage their access permissions from your dashboard at any time.</p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">View dashboard →</a>
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
