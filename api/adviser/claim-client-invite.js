import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'

// Called by a newly signed-up user (from GetStarted) who arrived via an adviser
// invite link. If a pending adviser_client_invites row matches their verified email,
// link their profile to the firm (profiles.adviser_id — service role, so the guard
// trigger allows it) and mark the invite accepted. Cap-checked at link time.
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user?.email) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const email = user.email.toLowerCase()
    const { data: invite } = await db.from('adviser_client_invites')
      .select('id, adviser_id')
      .eq('email', email).eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle()
    if (!invite) return res.status(200).json({ linked: false })

    // Enforce the firm's family cap at link time.
    const { data: firm } = await db.from('advisers')
      .select('firm_name, max_families').eq('id', invite.adviser_id).single()
    const { count } = await db.from('profiles')
      .select('id', { count: 'exact', head: true }).eq('adviser_id', invite.adviser_id)
    if (firm?.max_families > 0 && (count || 0) >= firm.max_families) {
      return res.status(200).json({ linked: false, reason: 'cap' })
    }

    await db.from('profiles').update({ adviser_id: invite.adviser_id }).eq('id', user.id)
    await db.from('adviser_client_invites')
      .update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', invite.id)
    return res.status(200).json({ linked: true, firm_name: firm?.firm_name || null })
  } catch (err) {
    console.error('adviser/claim-client-invite error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
