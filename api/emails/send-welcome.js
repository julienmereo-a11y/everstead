import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, plan } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })

  try {
    await resend.emails.send({
      from:    'Everstead <julien@everstead.care>',
      to:      email,
      subject: 'Welcome to Everstead',
      html:    welcomeHtml(name, plan),
    })
    res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send-welcome error:', err)
    res.status(500).json({ error: err.message })
  }
}

function welcomeHtml(name, plan) {
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Welcome, ${name || 'there'}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Thank you for joining Everstead. You're on the <strong>${plan || 'Essential'}</strong> plan — your 14-day free trial starts now.</p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Everstead helps you organise everything your family needs to know — accounts, documents, contacts, and instructions — all in one secure, private place.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">Start by adding your first account or uploading an important document.</p>
          <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to your dashboard →</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">Need help? Contact us at <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
