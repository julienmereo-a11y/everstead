import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// One-click marketing email unsubscribe.
// Token = base64url-encoded userId (UUID — 122 bits of entropy, effectively unguessable).
// Only disables marketing emails — transactional emails (payment, trial, deletion) still send.
//
// Link format used in marketing emails:
//   ${APP_URL}/api/email/unsubscribe?token=${Buffer.from(userId).toString('base64url')}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end()
  }

  const { token } = req.query
  if (!token) return res.status(400).send(page('Invalid link', 'This unsubscribe link is missing a token.'))

  let userId
  try {
    userId = Buffer.from(token, 'base64url').toString('utf8')
    // Basic UUID format check
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Invalid format')
  } catch {
    return res.status(400).send(page('Invalid link', 'This unsubscribe link appears to be malformed.'))
  }

  const { error } = await supabase
    .from('profiles')
    .update({ marketing_emails_enabled: false })
    .eq('id', userId)

  if (error) {
    console.error('unsubscribe error:', error)
    return res.status(500).send(page('Something went wrong', 'We couldn\'t process your request. Please email hello@everstead.care and we\'ll unsubscribe you manually.'))
  }

  res.setHeader('Content-Type', 'text/html')
  return res.status(200).send(page(
    'You\'ve been unsubscribed',
    'You won\'t receive marketing emails from Everstead any more. You\'ll still receive emails about your account — such as payment confirmations and trial reminders.'
  ))
}

function page(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Everstead</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:480px;width:100%;margin:40px auto;padding:0 24px;text-align:center;">
    <p style="margin:0 0 32px;color:#0d1628;font-size:20px;letter-spacing:0.3px;">Everstead</p>
    <div style="background:#ffffff;border-radius:16px;padding:48px 40px;border:1px solid #e8e5e0;">
      <h1 style="margin:0 0 16px;color:#0d1628;font-size:22px;font-weight:normal;">${title}</h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">${message}</p>
      <a href="https://www.everstead.care"
         style="display:inline-block;color:#0d1628;font-size:14px;text-decoration:none;border-bottom:1px solid #0d1628;padding-bottom:1px;">
        Return to Everstead
      </a>
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
      Questions? <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
    </p>
  </div>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
