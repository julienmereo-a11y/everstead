import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Admin-only: list and action death/incapacity reports from the reports table.
// Gated by the caller's Supabase JWT + profiles.role === 'admin' (same model as
// AdminProtectedRoute). reports has RLS with no policies, so all access is here.
async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'admin' ? user : null
}

// Map a reports row to the shape the AdminPanel UI renders.
function toUi(r) {
  return {
    ...r,
    death_date:           r.date_of_death,
    death_place:          r.place_of_death,
    death_cert_ref:       r.death_cert_number,
    incident_description: r.notes,
    submitted_at:         r.created_at,
    documents:            [],
    timeline: [
      { at: r.created_at, event: `Report submitted by ${r.reporter_name || 'a delegate'}` },
      ...(r.status === 'verified' ? [{ at: r.updated_at, event: 'Verified by an Everstead admin' }] : []),
      ...(r.status === 'rejected' ? [{ at: r.updated_at, event: 'Rejected by an Everstead admin' }] : []),
    ],
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const admin = await requireAdmin(req)
  if (!admin) return res.status(403).json({ error: 'Admin access required' })

  const { action, id } = req.body || {}

  if (action === 'list') {
    const { data, error } = await supabase
      .from('reports').select('*').order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: 'Could not load reports' })
    return res.status(200).json({ reports: (data || []).map(toUi) })
  }

  if (action === 'verify' || action === 'reject') {
    if (!id) return res.status(400).json({ error: 'Missing report id' })
    const status = action === 'verify' ? 'verified' : 'rejected'
    const { data: report, error } = await supabase
      .from('reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error || !report) return res.status(500).json({ error: 'Could not update the report' })

    // Verifying marks the owner so the Delegate Dashboard reflects it and the
    // owner's sealed personal messages auto-release.
    if (action === 'verify' && report.owner_id) {
      const ownerStatus = report.type === 'death' ? 'deceased' : 'incapacitated'
      await supabase.from('profiles').update({ owner_status: ownerStatus }).eq('id', report.owner_id)
    }
    return res.status(200).json({ report: toUi(report) })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
