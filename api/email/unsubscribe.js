import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../_lib/sentry.js'
import { rateLimited } from '../_lib/rate-limit.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// One-click marketing email unsubscribe (RFC 8058: mail clients POST this with
// no session, so it cannot require authentication).
//
// Token = base64url-encoded userId. Note what that is and is not: a UUID is
// unguessable, but it is not a secret. It travels in client payloads and API
// responses, so anyone who learns another member's id can unsubscribe them.
// The blast radius is one marketing preference and nothing else, which is why
// this is accepted rather than signed; the rate limit below is what stops it
// being used to unsubscribe people in bulk. Signing the token is the real fix
// and needs a migration window, since every unsubscribe link already in
// someone's inbox carries the unsigned form.
//
// Only disables marketing emails — transactional emails (payment, trial, deletion) still send.
//
// Link format used in marketing emails:
//   ${APP_URL}/api/email/unsubscribe?token=${Buffer.from(userId).toString('base64url')}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end()
  }

  // Generous: a corporate mail gateway may legitimately POST several of these
  // from one address. It only has to stop someone walking a list of ids.
  if (await rateLimited(req, 'email/unsubscribe', { max: 60, windowMinutes: 60 })) {
    return res.status(429).send(page('Please try again shortly', 'Too many requests from this address. Email hello@everstead.care and we will unsubscribe you manually.'))
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

  const { data: row, error } = await supabase
    .from('profiles')
    .update({ marketing_emails_enabled: false })
    .eq('id', userId)
    .select('language')
    .maybeSingle()
  const fr = String(row?.language || '').slice(0, 2).toLowerCase() === 'fr'

  if (error) {
    console.error('unsubscribe error:', error)
    return res.status(500).send(page('Something went wrong', 'We couldn\'t process your request. Please email hello@everstead.care and we\'ll unsubscribe you manually.'))
  }

  res.setHeader('Content-Type', 'text/html')
  return res.status(200).send(fr
    ? page(
        'Vous êtes désabonné',
        "Vous ne recevrez plus d'e-mails marketing d'Everstead. Vous continuerez à recevoir les e-mails liés à votre compte, comme les confirmations de paiement et les rappels de fin d'essai.",
        'fr'
      )
    : page(
        'You\'ve been unsubscribed',
        'You won\'t receive marketing emails from Everstead any more. You\'ll still receive emails about your account, such as payment confirmations and trial reminders.'
      ))
}

function page(title, message, lang = 'en') {
  const fr = lang === 'fr'
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} | Everstead</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:480px;width:100%;margin:40px auto;padding:0 24px;text-align:center;">
    <p style="margin:0 0 32px;color:#0d1628;font-size:20px;letter-spacing:0.3px;">Everstead</p>
    <div style="background:#ffffff;border-radius:16px;padding:48px 40px;border:1px solid #e8e5e0;">
      <h1 style="margin:0 0 16px;color:#0d1628;font-size:22px;font-weight:normal;">${title}</h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.7;">${message}</p>
      <a href="https://www.everstead.care"
         style="display:inline-block;color:#0d1628;font-size:14px;text-decoration:none;border-bottom:1px solid #0d1628;padding-bottom:1px;">
        ${fr ? 'Retour sur Everstead' : 'Return to Everstead'}
      </a>
    </div>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
      ${fr ? 'Une question\u00A0?' : 'Questions?'} <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
    </p>
  </div>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
