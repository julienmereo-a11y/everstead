// POST /api/org/disconnect
//
// The member ends their link with an organisation. This is the revoke half of
// the "Who has access" screen, and it has to be real: turning a toggle off is
// not the same as saying this firm is no longer mine.
//
// Service role, because ending a professional link clears profiles.adviser_id,
// which the privileged-column guard reverts for any client session. Consent
// rows go with it, so a re-link never silently restores old access.
import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../_lib/sentry.js'
import { rateLimited } from '../_lib/rate-limit.js'

const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authError } = await db.auth.getUser(bearer)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  if (await rateLimited(req, 'org-disconnect', { max: 20, windowMinutes: 15 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
  }

  const { connectionId } = req.body || {}
  if (!connectionId || !UUID.test(connectionId)) return res.status(400).json({ error: 'Missing connection.' })

  const { data: conn } = await db
    .from('member_connections')
    .select('id, member_id, org_id, kind, status')
    .eq('id', connectionId)
    .maybeSingle()
  if (!conn || conn.member_id !== user.id) return res.status(404).json({ error: 'Connection not found.' })
  if (conn.status === 'ended') return res.status(200).json({ ok: true, alreadyEnded: true })

  await db.from('member_connections')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', conn.id)

  if (conn.kind === 'professional') {
    const { data: profile } = await db.from('profiles').select('adviser_id').eq('id', user.id).maybeSingle()
    if (profile?.adviser_id === conn.org_id) {
      await db.from('profiles').update({ adviser_id: null }).eq('id', user.id)
    }
    await db.from('adviser_client_consents').delete().eq('client_id', user.id).eq('adviser_id', conn.org_id)
  }

  // Anything the organisation had already sent and the member had not answered
  // is withdrawn with the link.
  const { data: pending } = await db.from('inbound_deliveries')
    .select('id, storage_path')
    .eq('org_id', conn.org_id).eq('member_id', user.id).eq('status', 'sent')
  if (pending?.length) {
    await db.from('inbound_deliveries')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .in('id', pending.map(p => p.id))
    await db.storage.from('deliveries').remove(pending.map(p => p.storage_path)).catch(() => {})
  }

  await db.from('activity_log').insert({
    user_id: user.id, actor_id: user.id,
    action: 'connection.ended', resource_type: 'member_connections',
    resource_id: conn.id, resource_name: conn.kind,
    metadata: { org_id: conn.org_id },
  })

  return res.status(200).json({ ok: true })
}

export default withSentry(handler)
