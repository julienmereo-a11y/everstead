import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// One-click unsubscribe from the subprocessor notification list.
// Token is a 32-char hex string stored on the subscriber row.

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end()
  }

  const { token } = req.query
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{32}$/i.test(token)) {
    return res.status(400).send(page('Invalid link', 'This unsubscribe link appears to be malformed.'))
  }

  const { data, error } = await supabase
    .from('subprocessor_notification_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .is('unsubscribed_at', null)
    .select('email')

  if (error) {
    console.error('[subprocessor unsubscribe] error:', error)
    return res.status(500).send(page('Something went wrong', "We couldn't process your unsubscribe right now. Please email privacy@everstead.care."))
  }

  if (!data || data.length === 0) {
    // Token was valid format but no active subscription — either already unsubscribed or unknown token.
    return res.status(200).send(page("You're unsubscribed", "This email is no longer on the subprocessor notification list."))
  }

  return res.status(200).send(page("You're unsubscribed", `${data[0].email} has been removed from the subprocessor notification list.`))
}

function page(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} | Everstead</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background:#f8f7f5; color:#1f2937; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
    .card { max-width:480px; background:#ffffff; border:1px solid #e7e5e4; border-radius:16px; padding:40px 32px; text-align:center; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    h1 { font-family: Georgia, serif; font-weight: 400; font-size: 28px; margin: 0 0 16px; color:#0d1628; }
    p { font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 20px; }
    a { display:inline-block; background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%); color:#fff; padding:10px 22px; border-radius:9999px; text-decoration:none; font-weight:500; font-size:14px; }
    a:hover { background:#3f6a3b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://www.everstead.care/subprocessors">Back to Everstead</a>
  </div>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
