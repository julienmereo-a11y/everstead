import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../_lib/sentry.js'
import { requireAdmin } from '../_lib/admin-auth.js'
import { notifyFirmOfActivation } from '../_lib/adviser-notify.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Admin-only: list and action death/incapacity reports from the reports table.
// reports has RLS with no policies, so all access is here.
//
// This file used to define its own requireAdmin that checked profiles.role and
// nothing else. The shared helper additionally demands aal2, and its comment
// says plainly that a stolen password alone must not reach the admin surface.
// This is the endpoint where that matters most: it lists every death report
// (name, date and place of death, certificate number, reporter contact) and
// can stamp owner_status = 'deceased' on any profile, which opens that member's
// vault to their delegates and releases their sealed messages. It now uses the
// same guard as every other admin route.

// Every status the panel's buttons can set, by the action name they send.
// This used to know verify and reject only, and the panel sent "reject" for
// anything else, so "Mark as actioned", "Re-open" and "Request info" all
// quietly rejected the report.
const STATUS_FOR_ACTION = {
  verify: 'verified',
  reject: 'rejected',
  actioned: 'actioned',
  reopen: 'pending',
  'info-requested': 'info_requested',
}
const DEFAULT_EVENT = {
  verified: 'Verified by an Everstead admin',
  rejected: 'Rejected by an Everstead admin',
  actioned: 'Marked as actioned by an Everstead admin',
  pending: 'Re-opened by an Everstead admin',
  info_requested: 'More information requested from the reporter',
}

// Map a reports row to the shape the AdminPanel UI renders.
//
// The timeline lives in details.timeline, appended to on every status change
// with who did it. Rows from before that existed have no entries, so for them
// the current status is turned into the one event it implies.
function toUi(r) {
  const stored = Array.isArray(r.details?.timeline) ? r.details.timeline : []
  const legacy = [
    ...(r.status === 'verified' ? [{ at: r.updated_at, event: 'Verified by an Everstead admin' }] : []),
    ...(r.status === 'rejected' ? [{ at: r.updated_at, event: 'Rejected by an Everstead admin' }] : []),
  ]
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
      ...(stored.length ? stored : legacy),
    ],
  }
}

async function handler(req, res) {
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

  const status = STATUS_FOR_ACTION[action]
  if (status) {
    if (!id) return res.status(400).json({ error: 'Missing report id' })
    const { data: before } = await supabase.from('reports').select('details').eq('id', id).maybeSingle()
    if (!before) return res.status(404).json({ error: 'Report not found' })
    const now = new Date().toISOString()
    const prev = before.details && typeof before.details === 'object' && !Array.isArray(before.details) ? before.details : {}
    const sent = typeof req.body?.event === 'string' ? req.body.event.trim().slice(0, 500) : ''
    const timeline = [
      ...(Array.isArray(prev.timeline) ? prev.timeline : []),
      { at: now, event: sent || DEFAULT_EVENT[status], by: admin.email || admin.id },
    ]
    const { data: report, error } = await supabase
      .from('reports')
      .update({ status, updated_at: now, details: { ...prev, timeline } })
      .eq('id', id)
      .select('*')
      .single()
    if (error || !report) return res.status(500).json({ error: 'Could not update the report' })

    // Verifying marks the owner so the Delegate Dashboard reflects it and the
    // owner's sealed personal messages auto-release.
    if (action === 'verify' && report.owner_id) {
      const ownerStatus = report.type === 'death' ? 'deceased' : 'incapacitated'
      await supabase.from('profiles').update({ owner_status: ownerStatus }).eq('id', report.owner_id)
      // Audit this privileged state change (it unlocks after-death delegate access).
      try {
        await supabase.from('activity_log').insert({
          user_id:       report.owner_id,
          actor_id:      admin.id,
          action:        'owner.status_changed',
          resource_type: 'profiles',
          resource_id:   report.owner_id,
          resource_name: ownerStatus,
          metadata:      { report_id: report.id, report_type: report.type },
        })
      } catch { /* audit logging is best-effort, never block the verification */ }
      // The owner's firm, if they linked one AND asked to be told. A solicitor
      // learning of the death the same week is the whole point of the link.
      const firmNotice = await notifyFirmOfActivation({ ownerId: report.owner_id, report, actorId: admin.id })
      return res.status(200).json({ report: toUi(report), firmNotice })
    }
    return res.status(200).json({ report: toUi(report) })
  }

  return res.status(400).json({ error: 'Unknown action' })
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
