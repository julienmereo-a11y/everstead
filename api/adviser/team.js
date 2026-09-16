import { createClient } from '@supabase/supabase-js'
import { sendAdviserInvite } from '../_lib/adviser-email.js'
import { withSentry, captureException } from '../_lib/sentry.js'

// Adviser-facing: a firm OWNER manages their team seats. Service-role client;
// the caller is verified to be an accepted owner of exactly one firm, and can only
// act on that firm.
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function callerOwnerFirm(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return null
  const { data: m } = await db.from('adviser_members')
    .select('adviser_id')
    .eq('user_id', user.id).eq('role', 'owner').eq('invite_status', 'accepted')
    .maybeSingle()
  return m ? { user, adviserId: m.adviser_id } : null
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await callerOwnerFirm(req)
  if (!ctx) return res.status(403).json({ error: 'Only a firm owner can manage the team.' })

  const { action } = req.body || {}
  try {
    if (action === 'invite') {
      const email = String(req.body.email || '').trim().toLowerCase()
      if (!email) return res.status(400).json({ error: 'An email is required.' })
      // An invitation is an offer, not a fact about someone else's account.
      //
      // This used to look the address up, mark the person an ACCEPTED member
      // immediately and overwrite their plan. Nothing checked that the address
      // belonged to the firm or that its owner had agreed, so any firm could
      // name a paying member's email and both enrol them and take their plan
      // away. Everyone now goes through the same pending invite, and the plan
      // changes only when they accept it themselves.
      const { data: prof } = await db.from('profiles').select('id').ilike('email', email).maybeSingle()
      const row = { adviser_id: ctx.adviserId, email, role: 'member', invite_status: 'pending' }
      const { data, error } = await db.from('adviser_members')
        .upsert(row, { onConflict: 'adviser_id,email' }).select().single()
      if (error) throw error
      const { data: firm } = await db.from('advisers').select('firm_name').eq('id', ctx.adviserId).single()
      // Same email either way: the person decides, and claim_adviser_invites
      // flips them to accepted when they act on it.
      await sendAdviserInvite({ email, firmName: firm?.firm_name, token: data.invite_token })
      return res.status(200).json({ member: data, linked: !!prof?.id })
    }

    if (action === 'revoke') {
      const { memberId } = req.body
      if (!memberId) return res.status(400).json({ error: 'Missing member id.' })
      const { data: m } = await db.from('adviser_members').select('role, adviser_id').eq('id', memberId).single()
      if (!m || m.adviser_id !== ctx.adviserId) return res.status(404).json({ error: 'Not found.' })
      if (m.role === 'owner') return res.status(400).json({ error: 'You cannot remove the firm owner.' })
      const { error } = await db.from('adviser_members').delete().eq('id', memberId)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    console.error('adviser/team error:', err)
    captureException(err, { endpoint: 'adviser/team' })
    return res.status(500).json({ error: err.message })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
