import { createClient } from '@supabase/supabase-js'
import { captureException } from '../lib/sentry.js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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
  await supabase
    .from('rate_limit_log')
    .insert({ ip, endpoint: 'delegate-register' })
    .catch(() => {}) // non-fatal
}

export default async function handler(req, res) {
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
