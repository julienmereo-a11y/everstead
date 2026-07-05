import { requireAdmin, adminDb as db } from '../_lib/admin-auth.js'
import { sendAdviserInvite, sendAdviserAddedNotice } from '../_lib/adviser-email.js'
import { withSentry, captureException } from '../lib/sentry.js'

// Admin-only management of adviser/solicitor FIRMS, their client families, and the
// family cap. Action-based POST (same style as api/stripe/cancel-subscription.js).
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Admin access required' })

  const { action } = req.body || {}

  try {
    // ── List firms with families-used + latest invoice status ────────────────
    if (action === 'list') {
      const { data: advisers, error } = await db
        .from('advisers').select('*').order('created_at', { ascending: false })
      if (error) throw error

      const ids = advisers.map(a => a.id)
      // Families used per firm.
      const used = {}
      if (ids.length) {
        const { data: fam } = await db
          .from('profiles').select('adviser_id').in('adviser_id', ids)
        for (const r of fam || []) used[r.adviser_id] = (used[r.adviser_id] || 0) + 1
      }
      // Latest invoice per firm.
      const latestInvoice = {}
      if (ids.length) {
        const { data: inv } = await db
          .from('invoices').select('adviser_id, status, amount, issue_date')
          .in('adviser_id', ids).order('issue_date', { ascending: false })
        for (const r of inv || []) if (!latestInvoice[r.adviser_id]) latestInvoice[r.adviser_id] = r
      }
      return res.status(200).json({
        advisers: advisers.map(a => ({
          ...a,
          families_used: used[a.id] || 0,
          latest_invoice: latestInvoice[a.id] || null,
        })),
      })
    }

    // ── Create a firm ────────────────────────────────────────────────────────
    if (action === 'create') {
      const { firm } = req.body
      if (!firm?.firm_name?.trim()) return res.status(400).json({ error: 'Firm name is required.' })
      const { data, error } = await db.from('advisers').insert(cleanFirm(firm)).select().single()
      if (error) throw error
      return res.status(200).json({ adviser: data })
    }

    // ── Update a firm ────────────────────────────────────────────────────────
    if (action === 'update') {
      const { id, firm } = req.body
      if (!id) return res.status(400).json({ error: 'Missing adviser id.' })
      const { data, error } = await db
        .from('advisers').update({ ...cleanFirm(firm), updated_at: new Date().toISOString() })
        .eq('id', id).select().single()
      if (error) throw error
      return res.status(200).json({ adviser: data })
    }

    // ── A firm's linked client families ──────────────────────────────────────
    if (action === 'list-families') {
      const { adviserId } = req.body
      if (!adviserId) return res.status(400).json({ error: 'Missing adviser id.' })
      const { data, error } = await db
        .from('profiles')
        .select('id, full_name, email, plan, subscription_status, readiness_score, created_at')
        .eq('adviser_id', adviserId).order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ families: data })
    }

    // ── Search owner profiles not yet linked to any firm (to assign) ─────────
    // Only accounts with no firm and that aren't a secondary family member.
    if (action === 'search-unassigned') {
      const { q } = req.body
      let query = db.from('profiles')
        .select('id, full_name, email, plan, subscription_status')
        .is('adviser_id', null).is('family_id', null)
        .limit(10)
      // Strip PostgREST filter metacharacters before interpolating into .or().
      const safe = String(q || '').replace(/[,()*%\\]/g, ' ').trim()
      if (safe) query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`)
      const { data, error } = await query
      if (error) throw error
      return res.status(200).json({ candidates: data })
    }

    // ── Assign a family to a firm — SERVER-SIDE CAP ENFORCEMENT ──────────────
    if (action === 'assign-family') {
      const { adviserId, userId } = req.body
      if (!adviserId || !userId) return res.status(400).json({ error: 'Missing adviser or user id.' })

      const { data: firm, error: firmErr } = await db
        .from('advisers').select('max_families, firm_name').eq('id', adviserId).single()
      if (firmErr || !firm) return res.status(404).json({ error: 'Firm not found.' })

      const { count, error: cntErr } = await db
        .from('profiles').select('id', { count: 'exact', head: true }).eq('adviser_id', adviserId)
      if (cntErr) throw cntErr
      if ((count || 0) >= firm.max_families) {
        return res.status(409).json({
          error: `${firm.firm_name} is at its cap of ${firm.max_families} famil${firm.max_families === 1 ? 'y' : 'ies'}. Raise the cap first.`,
        })
      }

      const { error } = await db.from('profiles').update({ adviser_id: adviserId }).eq('id', userId)
      if (error) throw error
      return res.status(200).json({ ok: true, families_used: (count || 0) + 1 })
    }

    // ── Remove a family from a firm ──────────────────────────────────────────
    if (action === 'unassign-family') {
      const { userId } = req.body
      if (!userId) return res.status(400).json({ error: 'Missing user id.' })
      const { error } = await db.from('profiles').update({ adviser_id: null }).eq('id', userId)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    // ── Adviser SEATS on a firm (team) ───────────────────────────────────────
    if (action === 'list-members') {
      const { adviserId } = req.body
      if (!adviserId) return res.status(400).json({ error: 'Missing adviser id.' })
      const { data: members, error } = await db.from('adviser_members')
        .select('id, email, role, invite_status, user_id, accepted_at, created_at, invite_token')
        .eq('adviser_id', adviserId).order('role', { ascending: true }).order('created_at')
      if (error) throw error
      const ids = members.filter(m => m.user_id).map(m => m.user_id)
      const names = {}
      if (ids.length) {
        const { data: profs } = await db.from('profiles').select('id, full_name').in('id', ids)
        for (const p of profs || []) names[p.id] = p.full_name
      }
      return res.status(200).json({ members: members.map(m => ({ ...m, full_name: names[m.user_id] || null })) })
    }

    // Seed the firm's owner, or add another adviser seat. If the email already has an
    // Everstead account we link + grant portal access now; otherwise it's a pending
    // seat claimed automatically when they sign up with that email.
    if (action === 'add-member') {
      const { adviserId, email, role } = req.body
      const cleanEmail = String(email || '').trim().toLowerCase()
      if (!adviserId || !cleanEmail) return res.status(400).json({ error: 'Firm and email are required.' })
      const { data: prof } = await db.from('profiles').select('id').ilike('email', cleanEmail).maybeSingle()
      const row = { adviser_id: adviserId, email: cleanEmail, role: role === 'owner' ? 'owner' : 'member' }
      if (prof?.id) { row.user_id = prof.id; row.invite_status = 'accepted'; row.accepted_at = new Date().toISOString() }
      const { data, error } = await db.from('adviser_members')
        .upsert(row, { onConflict: 'adviser_id,email' }).select().single()
      if (error) throw error
      const { data: firm } = await db.from('advisers').select('firm_name').eq('id', adviserId).single()
      if (prof?.id) {
        await db.from('profiles').update({ plan: 'advisor' }).eq('id', prof.id)
        await sendAdviserAddedNotice({ email: cleanEmail, firmName: firm?.firm_name })
      } else {
        // New to Everstead → email an invite to set a password + activate their account.
        await sendAdviserInvite({ email: cleanEmail, firmName: firm?.firm_name, token: data.invite_token })
      }
      return res.status(200).json({ member: { ...data, linked: !!prof?.id } })
    }

    if (action === 'remove-member') {
      const { memberId } = req.body
      if (!memberId) return res.status(400).json({ error: 'Missing member id.' })
      const { error } = await db.from('adviser_members').delete().eq('id', memberId)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    // Re-send the invite (or added-notice) email for a seat.
    if (action === 'resend-invite') {
      const { memberId } = req.body
      if (!memberId) return res.status(400).json({ error: 'Missing member id.' })
      const { data: m } = await db.from('adviser_members')
        .select('email, user_id, invite_token, adviser_id').eq('id', memberId).single()
      if (!m) return res.status(404).json({ error: 'Seat not found.' })
      const { data: firm } = await db.from('advisers').select('firm_name').eq('id', m.adviser_id).single()
      if (m.user_id) await sendAdviserAddedNotice({ email: m.email, firmName: firm?.firm_name })
      else await sendAdviserInvite({ email: m.email, firmName: firm?.firm_name, token: m.invite_token })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    console.error('admin/advisers error:', err)
    captureException(err, { endpoint: 'admin/advisers' })
    return res.status(500).json({ error: err.message })
  }
}

// Whitelist the columns an admin can set, so stray keys can't be injected.
function cleanFirm(firm = {}) {
  const allowed = [
    'firm_name', 'contact_name', 'contact_email', 'logo_url', 'status', 'plan_type',
    'platform_fee', 'price_per_family', 'max_families', 'pilot_end_date',
    'billing_start_date', 'notes',
  ]
  const out = {}
  for (const k of allowed) if (firm[k] !== undefined) out[k] = firm[k]
  // Money + cap are integers (pennies / count); coerce and floor defensively.
  for (const k of ['platform_fee', 'price_per_family', 'max_families']) {
    if (out[k] !== undefined && out[k] !== null && out[k] !== '') out[k] = Math.max(0, Math.floor(Number(out[k])) || 0)
  }
  for (const k of ['pilot_end_date', 'billing_start_date']) if (out[k] === '') out[k] = null
  return out
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
