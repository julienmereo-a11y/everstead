import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.APP_URL || 'https://www.everstead.care'

// Basic RFC 5322-ish email check — good enough for client-supplied input.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body || {}
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const normalised = email.trim().toLowerCase()
  const sourceIp =
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.headers['x-real-ip']?.toString() ||
    null
  const userAgent = req.headers['user-agent']?.toString().slice(0, 500) || null

  // Idempotent: if already subscribed (active), succeed quietly.
  // If previously unsubscribed, reactivate.
  const { data: existing, error: lookupErr } = await supabase
    .from('subprocessor_notification_subscribers')
    .select('id, email, unsubscribed_at, unsubscribe_token')
    .ilike('email', normalised)
    .order('subscribed_at', { ascending: false })
    .limit(1)

  if (lookupErr) {
    console.error('[subprocessor subscribe] lookup error:', lookupErr)
    return res.status(500).json({ error: 'Could not subscribe. Please try again.' })
  }

  let token

  if (existing && existing.length > 0) {
    const row = existing[0]
    if (!row.unsubscribed_at) {
      // Already actively subscribed — succeed silently, no duplicate email
      return res.status(200).json({ ok: true, alreadySubscribed: true })
    }
    // Reactivate
    const { error: updateErr } = await supabase
      .from('subprocessor_notification_subscribers')
      .update({ unsubscribed_at: null, subscribed_at: new Date().toISOString(), source_ip: sourceIp, user_agent: userAgent })
      .eq('id', row.id)
    if (updateErr) {
      console.error('[subprocessor subscribe] reactivate error:', updateErr)
      return res.status(500).json({ error: 'Could not subscribe. Please try again.' })
    }
    token = row.unsubscribe_token
  } else {
    // Insert new
    const { data: inserted, error: insertErr } = await supabase
      .from('subprocessor_notification_subscribers')
      .insert({ email: normalised, source_ip: sourceIp, user_agent: userAgent })
      .select('unsubscribe_token')
      .single()
    if (insertErr) {
      console.error('[subprocessor subscribe] insert error:', insertErr)
      return res.status(500).json({ error: 'Could not subscribe. Please try again.' })
    }
    token = inserted.unsubscribe_token
  }

  // Confirmation email (best-effort — if Resend fails, still treat as success)
  try {
    const unsubLink = `${APP_URL}/api/subprocessors/unsubscribe?token=${token}`
    await resend.emails.send({
      from: 'Everstead <hello@everstead.care>',
      to: normalised,
      subject: "You're subscribed to Everstead subprocessor updates",
      html: confirmationHtml(unsubLink),
    })
  } catch (err) {
    console.error('[subprocessor subscribe] confirmation email error:', err)
    captureException(err, { endpoint: 'subprocessors/subscribe' })
  }

  return res.status(200).json({ ok: true })
}

function confirmationHtml(unsubLink) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#f9fafb;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937;">
  <table style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:24px;">
      <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="140" style="display:block;height:auto;" /><p style="margin:10px 0 0;color:#ffffff;font-size:13px;opacity:.8;letter-spacing:.04em;">Subprocessor updates</p>
    </td></tr>
    <tr><td style="padding:28px 24px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">You're confirmed.</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4b5563;">
        We'll email you at least 30 days before we add or replace any third-party subprocessor — the providers that help us run the Everstead platform (hosting, database, payments, email, error monitoring, AI guidance). You can review the current list any time at
        <a href="https://www.everstead.care/subprocessors" style="color:#4c7d47;">everstead.care/subprocessors</a>.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
        Not what you meant to sign up for? <a href="${unsubLink}" style="color:#4c7d47;">Unsubscribe</a>.
      </p>
    </td></tr>
    <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Everstead Digital Ltd · UK GDPR Art. 28 sub-processor notice</p>
    </td></tr>
  </table>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
