import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Adviser-side server access to a linked client's plan.
//
// Two rules, enforced here so every adviser endpoint gets them for free:
//   1. The caller must be an ACCEPTED member of the firm the client is linked
//      to (profiles.adviser_id). Portal access alone is not enough.
//   2. Only sections the client has consented to (adviser_client_consents) are
//      ever read. No consent row means nothing is shared.
//
// Everything runs with the service role, so these checks are the only thing
// between an adviser and another firm's client. Keep them boring and strict.
// ─────────────────────────────────────────────────────────────────────────────

export const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v) => typeof v === 'string' && UUID.test(v)

/** The signed-in adviser and the firms they belong to, or null. */
export async function requireAdviser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return null
  const { data: rows } = await db
    .from('adviser_members')
    .select('adviser_id, role')
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
  if (!rows?.length) return null
  const { data: me } = await db.from('profiles').select('full_name, language').eq('id', user.id).maybeSingle()
  return { user, firmIds: rows.map(r => r.adviser_id), language: me?.language === 'fr' ? 'fr' : 'en', name: me?.full_name || user.email }
}

/** Normalise a consent row (or its absence) into the five section flags. */
export function consentFlags(row) {
  return {
    accounts:             !!row?.share_accounts,
    documents:            !!row?.share_documents,
    instructions:         !!row?.share_instructions,
    people:               !!row?.share_people,
    alerts:               !!row?.share_alerts,
    notify_on_activation: !!row?.notify_on_activation,
    updated_at:           row?.updated_at ?? null,
  }
}

/**
 * The client must be linked to one of the caller's firms. Returns the profile,
 * the consent flags and the firm, or null when the link does not hold.
 */
export async function loadClientForFirm(clientId, firmIds) {
  if (!isUuid(clientId)) return null
  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, email, language, country, owner_status, readiness_score, adviser_id')
    .eq('id', clientId)
    .maybeSingle()
  if (!profile?.adviser_id || !firmIds.includes(profile.adviser_id)) return null

  const [{ data: consent }, { data: firm }] = await Promise.all([
    db.from('adviser_client_consents').select('*').eq('client_id', clientId).eq('adviser_id', profile.adviser_id).maybeSingle(),
    db.from('advisers').select('id, firm_name, firm_type, logo_url, contact_email').eq('id', profile.adviser_id).maybeSingle(),
  ])
  return { profile, consents: consentFlags(consent), firm }
}

/** The consented sections of a client's plan, straight from the tables. */
export async function loadSharedPlan(clientId, consents) {
  const empty = []
  const [accounts, documents, instructions, people] = await Promise.all([
    consents.accounts
      ? db.from('accounts')
          .select('id, institution, account_type, category, account_number_hint, balance_display, status, notes, updated_at')
          .eq('user_id', clientId).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at')
          .then(r => r.data ?? empty)
      : empty,
    consents.documents
      ? db.from('documents')
          .select('id, name, doc_type, status, expires_at, file_size, mime_type, notes, updated_at, storage_path')
          .eq('user_id', clientId).order('updated_at', { ascending: false })
          .then(r => r.data ?? empty)
      : empty,
    consents.instructions
      ? db.from('instructions')
          .select('id, title, category, audience, body, updated_at')
          .eq('user_id', clientId).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at')
          .then(r => r.data ?? empty)
      : empty,
    consents.people
      ? db.from('trusted_people')
          .select('id, name, role, email, invite_status')
          .eq('user_id', clientId).order('created_at')
          .then(r => r.data ?? empty)
      : empty,
  ])

  let steps = []
  if (instructions.length) {
    const { data } = await db.from('instruction_steps')
      .select('instruction_id, body, step_order')
      .in('instruction_id', instructions.map(i => i.id))
      .order('step_order')
    steps = data ?? []
  }
  const withSteps = instructions.map(i => ({
    ...i,
    steps: steps.filter(s => s.instruction_id === i.id).map(s => s.body),
  }))

  return { accounts, documents, instructions: withSteps, trusted_people: people }
}

/**
 * Record what an adviser did with a client's plan, on the CLIENT's activity
 * log so it shows in their own Activity section. Best-effort, never throws.
 */
export async function logAdviserActivity({ clientId, actorId, action, resourceType, resourceId = null, resourceName = null, metadata = {} }) {
  try {
    await db.from('activity_log').insert({
      user_id:       clientId,
      actor_id:      actorId,
      action,
      resource_type: resourceType,
      resource_id:   resourceId,
      resource_name: resourceName,
      metadata,
    })
  } catch { /* the audit trail must never break the action itself */ }
}
