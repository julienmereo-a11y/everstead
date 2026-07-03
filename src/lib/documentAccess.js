// ─────────────────────────────────────────────────────────────────────────────
// SHARED ACCESS RESOLUTION — who can see what, and when.
//
// Two layers:
//   1. Role-level grants — trusted_people.access_grants (jsonb), set when the
//      owner invites someone: { accessAreas, accountCategories, documentTypes,
//      accessTiming: 'always' | 'after_death' }. Empty sub-lists mean "all".
//   2. Per-document overrides — documents.access_overrides (jsonb):
//      { allow: [person_ids], deny: [person_ids] } layered on top, plus
//      documents.release_timing: 'default' | 'immediate' | 'sealed'.
//
// Used by the owner's document modal (to show/edit who has access) and by the
// delegate dashboard (to filter what a trusted person actually sees).
// ─────────────────────────────────────────────────────────────────────────────

const norm = (v) => (v || '').toString().trim().toLowerCase()

// Is this area (documents/accounts/instructions/…) granted at role level?
export function hasAreaGrant(grants, area) {
  return (grants?.accessAreas || []).map(norm).includes(norm(area))
}

// Timing gate at the PERSON level: 'after_death' grants only open once released.
export function personTimingOpen(grants, ownerReleased) {
  return (grants?.accessTiming || 'always') !== 'after_death' || !!ownerReleased
}

// Role-level document access (before per-document overrides): area + type match.
export function baseDocumentAccess(grants, doc) {
  if (!hasAreaGrant(grants, 'documents')) return false
  const types = (grants?.documentTypes || []).map(norm)
  return types.length === 0 || types.includes(norm(doc?.doc_type))
}

/**
 * Full per-document resolution for one trusted person.
 * @returns {{ access: boolean, eventual: boolean, sealed: boolean, source: string }}
 *   access   — can they open it RIGHT NOW (given ownerReleased)?
 *   eventual — do they have access at all (now or once released)?
 *   sealed   — is it timing-gated until release?
 *   source   — 'role' | 'override' | 'removed' | 'none'
 */
export function resolveDocumentAccess(person, doc, { ownerReleased = false } = {}) {
  const grants = person?.access_grants || {}
  const ov = doc?.access_overrides || {}
  const deny = Array.isArray(ov.deny) ? ov.deny : []
  const allow = Array.isArray(ov.allow) ? ov.allow : []

  if (deny.includes(person?.id)) return { access: false, eventual: false, sealed: false, source: 'removed' }

  const base = baseDocumentAccess(grants, doc)
  const overridden = allow.includes(person?.id)
  if (!base && !overridden) return { access: false, eventual: false, sealed: false, source: 'none' }

  // Per-document release wins over the person's own timing; 'default' follows it.
  const docTiming = doc?.release_timing || 'default'
  const sealed =
    docTiming === 'sealed' ? true :
    docTiming === 'immediate' ? false :
    (grants?.accessTiming || 'always') === 'after_death'

  return {
    access: sealed ? !!ownerReleased : true,
    eventual: true,
    sealed,
    source: overridden && !base ? 'override' : 'role',
  }
}

// Convenience filters for the delegate dashboard.
export function accessibleDocumentsFor(person, documents, ownerReleased) {
  return (documents || []).filter(d => resolveDocumentAccess(person, d, { ownerReleased }).access)
}

export function accessibleAccountsFor(person, accounts, ownerReleased) {
  const grants = person?.access_grants || {}
  if (!hasAreaGrant(grants, 'accounts') || !personTimingOpen(grants, ownerReleased)) return []
  const cats = (grants.accountCategories || []).map(norm)
  if (cats.length === 0) return accounts || []
  return (accounts || []).filter(a => cats.includes(norm(a.category)))
}

export function accessibleInstructionsFor(person, instructions, ownerReleased) {
  const grants = person?.access_grants || {}
  if (!hasAreaGrant(grants, 'instructions') || !personTimingOpen(grants, ownerReleased)) return []
  return instructions || []
}

// Human summary of a person's role-level grants, for display.
export function grantSummary(grants) {
  const areas = grants?.accessAreas || []
  if (!areas.length) return []
  return areas.map(a => {
    if (norm(a) === 'documents' && grants.documentTypes?.length) return `documents · ${grants.documentTypes.join(', ')}`
    if (norm(a) === 'accounts' && grants.accountCategories?.length) return `accounts · ${grants.accountCategories.join(', ')}`
    return a
  })
}
