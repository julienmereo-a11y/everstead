import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS so we can safely update both sides
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify caller is authenticated
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { inviteToken } = req.body
  if (!inviteToken) return res.status(400).json({ error: 'Missing inviteToken' })

  // Look up the invite (service role — no RLS restriction)
  const { data: membership, error: fetchErr } = await supabase
    .from('family_memberships')
    .select('*')
    .eq('invite_token', inviteToken)
    .maybeSingle()

  if (fetchErr || !membership) {
    return res.status(404).json({ error: 'Invitation not found.' })
  }

  if (membership.invite_status === 'accepted') {
    return res.status(409).json({ error: 'This invitation has already been accepted.' })
  }

  if (membership.invite_status === 'cancelled') {
    return res.status(410).json({ error: 'This invitation has been cancelled.' })
  }

  // 7-day expiry check
  const ageDays = (Date.now() - new Date(membership.invited_at).getTime()) / 86400000
  if (ageDays > 7) {
    return res.status(410).json({ error: 'expired' })
  }

  // Prevent a primary user from accepting their own invite
  if (membership.primary_user_id === user.id) {
    return res.status(400).json({ error: 'You cannot accept your own invitation.' })
  }

  // Fetch primary user's current plan so we mirror it to the secondary
  const { data: primaryProfile } = await supabase
    .from('profiles')
    .select('plan, family_id, full_name, email')
    .eq('id', membership.primary_user_id)
    .maybeSingle()

  const plan = primaryProfile?.plan || 'family'

  // Update membership row — server-side, no RLS bypass needed by client
  const { error: membershipErr } = await supabase
    .from('family_memberships')
    .update({
      secondary_user_id: user.id,
      invite_status:     'accepted',
      accepted_at:       new Date().toISOString(),
    })
    .eq('id', membership.id)

  if (membershipErr) {
    console.error('accept-invite: membership update failed', membershipErr)
    return res.status(500).json({ error: 'Could not accept invitation. Please try again.' })
  }

  // Update secondary user's profile
  await supabase
    .from('profiles')
    .update({
      plan,
      family_role:         'secondary',
      family_id:           membership.id,
      subscription_status: 'active',
    })
    .eq('id', user.id)

  // Ensure primary profile has family_id set
  if (primaryProfile && !primaryProfile.family_id) {
    await supabase
      .from('profiles')
      .update({ family_id: membership.id })
      .eq('id', membership.primary_user_id)
  }

  return res.status(200).json({ ok: true, plan, primaryEmail: primaryProfile?.email, primaryName: primaryProfile?.full_name })
}
