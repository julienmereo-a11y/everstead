import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry } from '../lib/sentry.js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const resend = new Resend(process.env.RESEND_API_KEY)
const FOUNDER_TO = process.env.FEEDBACK_TO || 'julien@everstead.care'

// Best-effort founder notification on every new owner registration.
// Awaited (serverless freezes after the response) but wrapped so a failure
// never blocks the signup itself.
async function notifyFounderOfSignup({ name, email, plan }) {
  try {
    const when = new Date().toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
    })
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      FOUNDER_TO,
      replyTo: email || undefined,
      subject: `🆕 New signup — ${name || email}${plan ? ` (${plan})` : ''}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#f9fafb;font-family:system-ui,sans-serif;">
  <table style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <tr><td style="background:#0d1628;padding:20px 24px;"><p style="margin:0;color:#fff;font-size:16px;font-weight:600;">New registration</p></td></tr>
    <tr><td style="padding:22px 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:120px;">Name</td><td style="padding:6px 0;color:#0d1628;font-size:14px;font-weight:500;">${name || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:6px 0;color:#0d1628;font-size:14px;font-weight:500;">${email || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Plan selected</td><td style="padding:6px 0;color:#0d1628;font-size:14px;font-weight:500;">${plan || 'essential'}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">Registered</td><td style="padding:6px 0;color:#0d1628;font-size:14px;font-weight:500;">${when}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">Account created. Card entry / checkout may still be in progress.</p>
    </td></tr>
  </table>
</body></html>`,
    })
  } catch (err) {
    console.error('[delegate-register] founder notification failed:', err)
  }
}

// Rate limit: max 5 registration attempts per IP per 15 minutes.
// Stored in Supabase so it works across serverless instances.
async function checkRateLimit(ip) {
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('endpoint', 'delegate-register')
    .gte('created_at', windowStart)

  if (error) return false // fail open — don't block on DB error
  return (count ?? 0) >= 5
}

async function logRateLimit(ip) {
  // NB: a PostgREST query builder is a thenable, not a real Promise — it has
  // no .catch(). Calling .catch() on it throws a TypeError. Use try/catch.
  try {
    await supabase
      .from('rate_limit_log')
      .insert({ ip, endpoint: 'delegate-register' })
  } catch {
    // non-fatal — never block registration on a logging failure
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, name, mode, wantsTrial, token } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })

  // Rate limit — only applies to new account registration, not sign-in
  if (mode === 'register') {
    const ip        = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
    const throttled = await checkRateLimit(ip)
    if (throttled) {
      return res.status(429).json({ error: 'Too many requests. Please try again in 15 minutes.' })
    }
    await logRateLimit(ip)
  }

  if (mode === 'admin') {
    // Validate the admin invite token before creating the user
    const { data: inv, error: invErr } = await supabase
      .from('admin_invites')
      .select('email, status')
      .eq('token', token)
      .eq('status', 'pending')
      .single()
    if (invErr || !inv) return res.status(400).json({ error: 'Invalid or expired admin invite' })
    if (inv.email.toLowerCase() !== email.toLowerCase())
      return res.status(403).json({ error: 'Email does not match the invite' })

    const { error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: name ?? email },
      email_confirm: true,
    })
    if (createErr && !createErr.message.includes('already registered'))
      return res.status(400).json({ error: createErr.message })

    // Invalidate the token immediately so it cannot be reused
    await supabase
      .from('admin_invites')
      .update({ status: 'accepted' })
      .eq('token', token)

    // Fall through to sign-in below to return tokens
  }

  if (mode === 'register') {
    const profileRole = wantsTrial ? 'owner' : 'delegate'
    // Create user server-side (bypasses captcha). Auto-confirm email.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: name ?? email, role: profileRole },
      email_confirm: true,
    })
    if (createErr) return res.status(400).json({ error: createErr.message })

    if (created?.user?.id) {
      await supabase.from('profiles').update({ role: profileRole }).eq('id', created.user.id)
    }

    // Notify the founder of new owner signups (not delegate-only registrations)
    if (wantsTrial) {
      await notifyFounderOfSignup({ name, email, plan: req.body.plan })
    }
  }

  // Sign in server-side with service role key to bypass captcha, return session tokens
  const authRes = await fetch(
    `${process.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!authRes.ok) {
    const err = await authRes.json().catch(() => ({}))
    return res.status(401).json({ error: err.error_description || 'Invalid email or password' })
  }

  const { access_token, refresh_token } = await authRes.json()
  res.status(200).json({ access_token, refresh_token })
}

// Wrapped so any uncaught error is reported to Sentry and returns a JSON 500
// (instead of a bare crash with no body, which surfaces as a generic
// "Could not create account" on the client and is invisible in monitoring).
export default withSentry(handler)
