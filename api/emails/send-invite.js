import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { inviteeName, inviteeEmail, role, ownerName, inviteToken } = req.body
  if (!inviteeEmail) return res.status(400).json({ error: 'Missing inviteeEmail' })

  try {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      inviteeEmail,
      subject: `${ownerName || 'Someone'} has invited you to their Everstead plan`,
      html:    inviteHtml(inviteeName, ownerName, role, inviteToken),
    })
    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send-invite error:', err)
    res.status(500).json({ error: err.message })
  }
}

function inviteHtml(inviteeName, ownerName, role, inviteToken) {
  const signupUrl = inviteToken
    ? `${process.env.VITE_APP_URL}/accept-invite?token=${inviteToken}`
    : `${process.env.VITE_APP_URL}/accept-invite`
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160"
               style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>

        <tr><td style="padding:44px 40px 36px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:26px;font-weight:normal;font-family:Georgia,serif;line-height:1.3;">
            You've been invited to ${ownerName ? `<strong>${ownerName}</strong>'s` : 'an'} estate plan
          </h1>
          <p style="margin:0 0 20px;color:#5a6475;font-size:15px;line-height:1.7;font-family:Georgia,serif;">
            Hi${inviteeName ? ` ${inviteeName}` : ''},<br><br>
            <strong>${ownerName || 'Someone'}</strong> has added you as their <strong>${role || 'trusted contact'}</strong> on Everstead — a secure digital estate plan that ensures their wishes and important information are organised and accessible when needed.
          </p>
          <p style="margin:0 0 32px;color:#5a6475;font-size:15px;line-height:1.7;font-family:Georgia,serif;">
            Create your free account to accept the invitation and view the sections you've been given access to.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#0d1628;border-radius:8px;">
              <a href="${signupUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-family:Georgia,serif;font-size:15px;letter-spacing:0.3px;">
                Accept invitation →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;font-family:Georgia,serif;">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </td></tr>

        <tr><td style="padding:24px 40px 32px;border-top:1px solid #ede9e3;">
          <p style="margin:0;color:#b0b8c1;font-size:12px;line-height:1.6;font-family:Georgia,serif;">
            Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;text-decoration:none;">support@everstead.care</a>
          </p>
        </td></tr>

      </table>
      <p style="margin:20px 0 0;color:#c4bfb8;font-size:11px;text-align:center;font-family:Georgia,serif;">
        Everstead · everstead.care
      </p>
    </td></tr>
  </table>
</body>
</html>`
}
