import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
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

  if (pending.code !== String(code)) {
    await supabase.from('mfa_pending').update({ attempts: pending.attempts + 1 }).eq('email', email)
    const remaining = 4 - pending.attempts
    return res.status(400).json({ error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` })
  }

  // Valid — delete the pending record and return the session tokens
  await supabase.from('mfa_pending').delete().eq('email', email)

  res.status(200).json({
    access_token:  pending.access_token,
    refresh_token: pending.refresh_token,
  })
}
