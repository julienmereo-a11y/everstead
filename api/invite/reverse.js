// POST /api/invite/reverse
//
// "Now start yours, and invite them back." A trusted person who accepted an
// invitation becomes an owner of their own (free) plan, and the person who
// invited them is added to it as a trusted person with an invitation of their
// own. One click on the delegate dashboard; the client sends the invitation
// email afterwards through /api/emails/send (type 'invite') like any other.
//
// Service role: it flips profiles.role, which the column guard refuses to
// clients, and reads the inviter's profile, which the delegate cannot.
import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../_lib/sentry.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PARTNER = 'Spouse / Partner'
// The relationship read the other way round. A partner is a partner; anyone
// else (executor, solicitor, adviser...) is simply family from this side.
const mirrorRole = (role) => (role === PARTNER ? PARTNER : 'Family Member')

// The note the inviter receives, in their own language (family, so "tu").
const NOTE = {
  en: 'You invited me to your plan, so here is mine. Now we both know where things are.',
  fr: "Tu m'as invité(e) sur ton plan, voici le mien. Comme ça, nous savons tous les deux où sont les choses.",
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const bearer = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '')
  if (!bearer) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authError } = await supabase.auth.getUser(bearer)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { inviteToken, accessAreas } = req.body || {}
  if (!inviteToken || typeof inviteToken !== 'string') return res.status(400).json({ error: 'Missing inviteToken' })
  const areas = Array.isArray(accessAreas)
    ? accessAreas.filter(a => typeof a === 'string' && a.length <= 40).slice(0, 20)
    : []

  // The invitation this person accepted: it must be theirs, and accepted.
  const { data: row } = await supabase
    .from('trusted_people')
    .select('id, user_id, name, email, role, invite_status')
    .eq('invite_token', inviteToken)
    .maybeSingle()
  if (!row) return res.status(404).json({ error: 'invite_not_found' })
  if (row.invite_status !== 'accepted') return res.status(403).json({ error: 'invite_not_accepted' })
  if ((row.email || '').trim().toLowerCase() !== (user.email || '').trim().toLowerCase()) {
    return res.status(403).json({ error: 'not_your_invite' })
  }

  const { data: owner } = await supabase
    .from('profiles')
    .select('id, full_name, email, language')
    .eq('id', row.user_id)
    .maybeSingle()
  if (!owner?.email) return res.status(404).json({ error: 'owner_not_found' })

  // Become an owner. The plan stays whatever it is (free for a delegate-only
  // account); only the role changes, which is what unlocks /dashboard.
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role === 'delegate') {
    await supabase.from('profiles').update({ role: 'owner' }).eq('id', user.id)
  }

  // Already invited them back? Return what exists rather than a duplicate.
  const { data: existing } = await supabase
    .from('trusted_people')
    .select('*')
    .eq('user_id', user.id)
    .eq('email', owner.email)
    .maybeSingle()
  if (existing) return res.status(200).json({ person: existing, existed: true })

  const note = NOTE[owner.language === 'fr' ? 'fr' : 'en']
  const { data: person, error } = await supabase
    .from('trusted_people')
    .insert({
      user_id: user.id,
      name:    owner.full_name || owner.email,
      email:   owner.email,
      role:    mirrorRole(row.role),
      access_grants: {
        accessAreas: areas,
        accountCategories: [],
        documentTypes: [],
        accessTiming: row.role === PARTNER ? 'always' : 'after_death',
      },
      invite_message: note,
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ person, existed: false, note })
}

export default withSentry(handler)
