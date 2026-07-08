import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { rateLimited } from '../_lib/rate-limit.js'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO     = process.env.ENQUIRY_TO || 'hello@everstead.care'

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Public unauthenticated endpoint — throttle to stop mass branded-email abuse.
  if (await rateLimited(req, 'contact-enquiry', { max: 5, windowMinutes: 15 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' })
  }

  const { type, fields } = req.body || {}
  if (!type || !fields) return res.status(400).json({ error: 'Missing type or fields' })

  // Escape all submitter-controlled values before they enter the email HTML —
  // this is a public, unauthenticated endpoint, so the field keys/values are
  // fully attacker-controlled (HTML/phishing injection into a branded email).
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

  // Build subject (Resend takes this as a structured field — escaped for safety anyway)
  const subject =
    type === 'book-demo'
      ? `New adviser demo request — ${esc(fields['Firm'] || fields['Full name'] || 'Unknown firm')}`
      : `New contact form message — ${esc(fields['Subject'] || fields['Name'] || 'No subject')}`

  // Build plain HTML body from fields
  const rows = Object.entries(fields)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:6px 12px;color:#4b5563;">${esc(v) || '—'}</td></tr>`)
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#f9fafb;font-family:system-ui,sans-serif;">
  <table style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:20px 24px;">
      <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">Everstead — ${type === 'book-demo' ? 'Adviser Demo Request' : 'Contact Form'}</p>
    </td></tr>
    <tr><td style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
    </td></tr>
    <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Sent via everstead.care · Reply directly to respond</p>
    </td></tr>
  </table>
</body>
</html>`

  // Use submitter's email as reply-to if available
  const replyTo = fields['Work email'] || fields['Email'] || undefined

  try {
    await resend.emails.send({
      from:     'Everstead <hello@everstead.care>',
      to:       TO,
      replyTo,
      subject,
      html,
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[enquiry] send error:', err)
    captureException(err, { endpoint: 'contact/enquiry' })
    return res.status(500).json({ error: 'Failed to send email' })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
