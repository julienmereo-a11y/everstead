// Small formatting helpers shared across the mobile app screens.

// Real account categories (from the `accounts.category` enum used by the web).
export const ACCOUNT_CATEGORIES = ['Banking', 'Retirement', 'Investment', 'Insurance', 'Property', 'Digital', 'Other']

// Order categories are shown in on the Accounts tab.
export const ACCOUNT_CATEGORY_ORDER = ACCOUNT_CATEGORIES

// Document status → chip style + label (mirrors the web's status treatment).
export function docChip(status) {
  switch (status) {
    case 'current':  return { cls: 'chip-sage',  label: 'Up to date' }
    case 'expiring': return { cls: 'chip-stone', label: 'Review soon' }
    case 'expired':  return { cls: 'chip-stone', label: 'Expired' }
    case 'missing':  return { cls: 'chip-stone', label: 'Missing' }
    default:         return { cls: 'chip-stone', label: 'Uploaded' }
  }
}

const initialsOf = (name) =>
  (String(name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase()
export { initialsOf }

// Access chip for a trusted person, from their access_grants / invite_status.
// Mirrors the website: all 5 areas → "Full access"; otherwise the timing —
// 'always' → "While alive", 'after_death' (or legacy 'emergency_only') → the
// house phrase "When the time comes" (never the blunt "After death" as a badge
// next to a loved one's name).
export function personAccessChip(person) {
  if (person.invite_status === 'pending') return { cls: 'chip-navy', label: 'Invited' }
  const grants = person.access_grants || {}
  const areas = grants.accessAreas || []
  if (areas.length >= 5) return { cls: 'chip-sage', label: 'Full access' }
  if ((grants.accessTiming || 'always') === 'always') return { cls: 'chip-sage', label: 'While alive' }
  return { cls: 'chip-stone', label: 'When the time comes' }
}

// Human relative time, e.g. "Just now", "2d ago", "1w ago".
export function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 45) return 'Just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

// Turn an activity_log row into a readable line, matching the web's phrasing.
export function activityText(row) {
  const name = row.resource_name || 'an item'
  switch (row.action) {
    case 'account.created':    return `You added ${name}`
    case 'account.updated':    return `You updated ${name}`
    case 'document.uploaded':  return `You uploaded “${name}”`
    case 'person.invited':     return `You invited ${name}`
    case 'instruction.created':return `You wrote “${name}”`
    default: {
      const verb = String(row.action || '').split('.')[1] || 'changed'
      return `${name} ${verb}`
    }
  }
}
