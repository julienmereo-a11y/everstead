import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend   = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })

  // Verify password via Supabase REST — does NOT persist a client session
  const authRes = await fetch(
    `${process.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!authRes.ok) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const { access_token, refresh_token } = await authRes.json()

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000))

  // Store session + code — upsert so a retry replaces the previous one
  const { error: dbErr } = await supabase.from('mfa_pending').upsert(
    {
      email,
      code,
      access_token,
      refresh_token,
      attempts:   0,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    },
    { onConflict: 'email' }
  )
  if (dbErr) {
    console.error('mfa-send-code db error:', dbErr)
    return res.status(500).json({ error: 'Could not generate code. Please try again.' })
  }

  // Send branded email
  await resend.emails.send({
    from:    'Everstead <hello@everstead.care>',
    to:      email,
    subject: `${code} — your Everstead sign-in code`,
    html:    mfaHtml(code),
  }).catch(err => console.error('mfa email error:', err))

  res.status(200).json({ sent: true })
}

function mfaHtml(code) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160"
               style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>

        <tr><td style="padding:44px 40px 36px;text-align:center;">
          <p style="margin:0 0 8px;color:#5a6475;font-size:14px;font-family:Georgia,serif;">Your sign-in code</p>
          <p style="margin:0 0 32px;letter-spacing:12px;color:#0d1628;font-size:40px;font-weight:bold;font-family:Georgia,serif;">${code}</p>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;line-height:1.6;font-family:Georgia,serif;">
            This code expires in <strong>10 minutes</strong>.
          </p>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;font-family:Georgia,serif;">
            If you didn't try to sign in, you can safely ignore this email.
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
