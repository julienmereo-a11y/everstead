import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'
import { openToken, codeMatches } from '../_lib/mfa-crypto.js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: 'Missing fields' })

  const { data: pending, error } = await supabase
    .from('mfa_pending')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !pending) {
    return res.status(400).json({ error: 'Session not found. Please sign in again.' })
  }

  if (new Date(pending.expires_at) < new Date()) {
    await supabase.from('mfa_pending').delete().eq('email', email)
    return res.status(400).json({ error: 'Code expired. Please sign in again.' })
  }

  if (pending.attempts >= 5) {
    await supabase.from('mfa_pending').delete().eq('email', email)
    return res.status(400).json({ error: 'Too many attempts. Please sign in again.' })
  }

  if (!codeMatches(code, pending.code, email)) {
    await supabase.from('mfa_pending').update({ attempts: pending.attempts + 1 }).eq('email', email)
    const remaining = 4 - pending.attempts
    return res.status(400).json({ error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` })
  }

  // Valid — unseal the session before the row goes.
  const access_token  = openToken(pending.access_token)
  const refresh_token = openToken(pending.refresh_token)

  // Delete either way: a row we cannot open is no use to anyone, and leaving it
  // behind is exactly the thing being fixed here.
  await supabase.from('mfa_pending').delete().eq('email', email)

  if (!access_token || !refresh_token) {
    // Only reachable if the row was tampered with or the signing key changed
    // under it. Nothing the person can do but start again.
    return res.status(400).json({ error: 'Session could not be verified. Please sign in again.' })
  }

  res.status(200).json({ access_token, refresh_token })
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
