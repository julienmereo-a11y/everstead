import { createClient } from '@supabase/supabase-js'
import { sendClientInvite } from '../_lib/adviser-email.js'
import { withSentry, captureException } from '../lib/sentry.js'

// Adviser-facing: invite a client family to create their Everstead plan.
// Any accepted adviser on the firm may invite. Enforces the firm's family cap
// server-side; records the invite (shown as "pending" in the portal) and emails the
// client a branded signup link. The client is linked to the firm at signup via
// /api/adviser/claim-client-invite.
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function callerFirm(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return null
  const { data: m } = await db.from('adviser_members')
    .select('adviser_id')
    .eq('user_id', user.id).eq('invite_status', 'accepted')
    .limit(1).maybeSingle()
  return m ? { user, adviserId: m.adviser_id } : null
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await callerFirm(req)
  if (!ctx) return res.status(403).json({ error: 'Only advisers can invite clients.' })

  const email = String(req.body?.email || '').trim().toLowerCase()
  const name  = String(req.body?.name || '').trim().slice(0, 120)
  const note  = String(req.body?.note || '').trim().slice(0, 500)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' })

  try {
    const { data: firm } = await db.from('advisers')
      .select('id, firm_name, max_families, status').eq('id', ctx.adviserId).single()
    if (!firm) return res.status(404).json({ error: 'Firm not found.' })

    // Server-side family cap: linked families count against the cap.
    const { count } = await db.from('profiles')
      .select('id', { count: 'exact', head: true }).eq('adviser_id', firm.id)
    if (firm.max_families > 0 && (count || 0) >= firm.max_families) {
      return res.status(409).json({ error: `Your plan supports up to ${firm.max_families} families and you've reached that limit. Contact support@everstead.care to discuss a higher cap.` })
    }

    // Don't invite someone who's already a linked client of the firm.
    const { data: existing } = await db.from('profiles')
      .select('id, adviser_id').ilike('email', email).maybeSingle()
    if (existing?.adviser_id === firm.id) {
      return res.status(409).json({ error: 'This person is already one of your firm’s client families.' })
    }

    // Record (or refresh) the invite, then email the branded signup link.
    const { error: invErr } = await db.from('adviser_client_invites')
      .upsert(
        { adviser_id: firm.id, email, client_name: name || null, invited_by: ctx.user.id, status: 'pending', updated_at: new Date().toISOString() },
        { onConflict: 'adviser_id,email' },
      )
    if (invErr && !String(invErr.message || '').includes('duplicate')) throw invErr

    // The invite follows the adviser's own language: a French notaire invites
    // French families, and this is often their first contact with Everstead.
    const { data: adviserProfile } = await db.from('profiles')
      .select('language').eq('id', ctx.user.id).maybeSingle()
    await sendClientInvite({ email, clientName: name, firmName: firm.firm_name, firmId: firm.id, note,
                             lang: adviserProfile?.language === 'fr' ? 'fr' : 'en' })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('adviser/invite-client error:', err)
    captureException(err, { endpoint: 'adviser/invite-client' })
    return res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
