// POST /api/org/offboard
//
// Somebody has left. One call gives up everything this organisation could still
// see of theirs, and returns the counts so the portal can put them on a signed
// statement.
//
// This is the feature nobody else in the category can offer, and the reason is
// structural rather than clever: everyone else HOLDS the documents, so the best
// they can say is that they have deleted their copy and you should take their
// word for it. Here the documents were never ours or the employer's, so giving
// up access is the whole of it, and it is verifiable: after this call
// org_can_read_document returns false for every item.
//
// Deliberately one-directional. An organisation renouncing its own access needs
// no permission from anyone, which is why this can be a button. It cannot take
// access, only give it up.
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../_lib/sentry.js'
import { rateLimited } from '../_lib/rate-limit.js'
import { requireAdviser, isUuid } from '../_lib/adviser-access.js'

const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await requireAdviser(req)
  if (!ctx) return res.status(403).json({ error: 'Only an organisation can do this.' })
  if (await rateLimited(req, 'org-offboard', { max: 40, windowMinutes: 15 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
  }

  const orgId   = String(req.body?.orgId || '').trim()
  const email   = String(req.body?.email || '').trim().toLowerCase()
  const shareId = String(req.body?.shareId || '').trim()
  if (!isUuid(orgId) || !ctx.firmIds.includes(orgId)) return res.status(403).json({ error: 'You are not a member of that organisation.' })

  // Giving up ONE item early, from the retention screen. Same principle as the
  // whole-person version and the same direction of travel: an organisation may
  // always renounce its own sight of something, and may never grant itself any.
  if (shareId) {
    if (!isUuid(shareId)) return res.status(400).json({ error: 'Unknown item.' })
    const { data: share } = await db.from('member_shares')
      .select('id, org_id, revoked_at').eq('id', shareId).maybeSingle()
    if (!share || share.org_id !== orgId) return res.status(404).json({ error: 'Unknown item.' })
    if (!share.revoked_at) await db.from('member_shares').update({ revoked_at: new Date().toISOString() }).eq('id', shareId)
    return res.status(200).json({ released: true, shareId })
  }

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email address is required.' })

  const now = new Date().toISOString()
  const summary = { sharesRevoked: 0, deliveriesWithdrawn: 0, requestsWithdrawn: 0, connectionEnded: false }

  try {
    // Who this address belongs to, including an address the person has proved
    // is theirs while signing in with another one. A plain profiles lookup
    // returns nothing for most employees, and because the statement below is
    // built from these counts, it would have declared "we hold nothing" while a
    // share was still live. An attestation that can be wrong is worse than none.
    const { data: memberId } = await db.rpc('resolve_member_by_email', { p_email: email })
    const profile = memberId ? { id: memberId } : null

    // 1. Every live share of theirs that this organisation could still open.
    if (profile?.id) {
      const { data: shares } = await db.from('member_shares')
        .select('id').eq('member_id', profile.id).eq('org_id', orgId).is('revoked_at', null)
      if (shares?.length) {
        await db.from('member_shares').update({ revoked_at: now }).in('id', shares.map(s => s.id))
        summary.sharesRevoked = shares.length
      }
    }

    // 2. Anything sent and never answered, including the staged file.
    const { data: pending } = await db.from('inbound_deliveries')
      .select('id, storage_path').eq('org_id', orgId).eq('recipient_email', email).eq('status', 'sent')
    if (pending?.length) {
      await db.from('inbound_deliveries')
        .update({ status: 'expired', responded_at: now, claim_token: null, claim_code_hash: null })
        .in('id', pending.map(p => p.id))
      await db.storage.from('deliveries').remove(pending.map(p => p.storage_path)).catch(() => {})
      summary.deliveriesWithdrawn = pending.length
    }

    // 3. Anything still being asked of them.
    const { data: asks } = await db.from('adviser_document_requests')
      .select('id').eq('adviser_id', orgId).eq('recipient_email', email).eq('status', 'requested')
    if (asks?.length) {
      await db.from('adviser_document_requests')
        .update({ status: 'cancelled', updated_at: now }).in('id', asks.map(a => a.id))
      summary.requestsWithdrawn = asks.length
    }

    // 4. The connection itself, so nothing new files itself afterwards.
    if (profile?.id) {
      const { data: conn } = await db.from('member_connections')
        .select('id').eq('member_id', profile.id).eq('org_id', orgId).eq('status', 'active').maybeSingle()
      if (conn) {
        await db.from('member_connections').update({ status: 'ended', ended_at: now }).eq('id', conn.id)
        summary.connectionEnded = true
      }
    }

    // Prove it rather than assert it: this is the claim the statement makes.
    let stillVisible = 0
    if (profile?.id) {
      const { count } = await db.from('member_shares')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', profile.id).eq('org_id', orgId)
        .is('revoked_at', null)
      stillVisible = count || 0
    }

    return res.status(200).json({ ...summary, email, holdsNothing: stillVisible === 0, at: now })
  } catch (err) {
    console.error('[org/offboard]', err)
    captureException(err, { endpoint: 'org/offboard' })
    return res.status(500).json({ error: 'Could not complete that. Nothing was changed by half.' })
  }
}

export default withSentry(handler)
