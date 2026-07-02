import { Resend } from 'resend'
import { requireAdmin } from '../_lib/admin-auth.js'
import { withSentry } from '../lib/sentry.js'

// Admin-only: invite a new person to sign up on Everstead. The admin picks whether
// they should get the FOUNDING50 offer (first year free, Family Yearly) or a normal
// signup. We email them the matching signup link.
const resend = new Resend(process.env.RESEND_API_KEY)
const APP = process.env.VITE_APP_URL || 'https://www.everstead.care'

const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#fff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${label}</a>`

function inviteHtml({ url, founding }) {
  const line = founding
    ? `You've been invited as a <strong>founding member</strong> of Everstead — your <strong>first year is free</strong>. Set up your family's secure vault for accounts, documents, trusted people and final wishes.`
    : `You've been invited to <strong>Everstead</strong> — a secure place to gather your family's accounts, documents, trusted people and final wishes, so loved ones aren't left searching.`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
      <tr><td style="background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
        <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
      </td></tr>
      <tr><td style="padding:40px;">
        <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">You're invited to Everstead</h1>
        <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.6;">${line}</p>
        ${button(url, founding ? 'Claim your founding place →' : 'Get started →')}
        <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">If you weren't expecting this, you can ignore this email.</p>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;"><p style="margin:0;color:#9ca3af;font-size:13px;">Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a></p></td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Forbidden' })

  const email = String(req.body?.email || '').trim().toLowerCase()
  const founding = req.body?.plan === 'founding'
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' })
  }

  const url = founding ? `${APP}/get-started?promo=FOUNDING50` : `${APP}/get-started`
  try {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      email,
      subject: founding ? "You're invited to Everstead — first year free" : "You're invited to Everstead",
      html:    inviteHtml({ url, founding }),
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('admin/invite-user error:', err)
    return res.status(500).json({ error: err.message || 'Could not send the invite.' })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
