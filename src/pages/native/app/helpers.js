// Small formatting helpers shared across the mobile app screens.
//
// Display strings resolve through i18n AT CALL TIME (never at module load), so
// a language change in Settings takes effect on the next render. Stored values
// (categories, doc types, statuses) stay English in the database; only the
// label shown to the person is translated.
import i18n from '../../../i18n'
import './i18n'

const T = (key, opts) => i18n.t('mobile:' + key, opts)

/** BCP 47 locale for date formatting, following the app language. */
export const dateLocale = () => (i18n.language === 'fr' ? 'fr-FR' : 'en-GB')

/** Display label for a stored account category ('Banking' → 'Banque' in French). */
export const accountCatLabel = (cat) => T('accountCats.' + cat, { defaultValue: cat })

/** Display label for a stored doc type ('Legal' → 'Juridique' in French). */
export const docTypeLabel = (type) => (type ? T('docTypes.' + type, { defaultValue: type }) : type)

// Real account categories (from the `accounts.category` enum used by the web).
export const ACCOUNT_CATEGORIES = ['Banking', 'Retirement', 'Investment', 'Insurance', 'Property', 'Digital', 'Other']

// Order categories are shown in on the Accounts tab.
export const ACCOUNT_CATEGORY_ORDER = ACCOUNT_CATEGORIES

// Document status → chip style + label (mirrors the web's status treatment).
export function docChip(status) {
  switch (status) {
    case 'current':  return { cls: 'chip-sage',  label: T('chips.upToDate') }
    case 'expiring': return { cls: 'chip-stone', label: T('chips.reviewSoon') }
    case 'expired':  return { cls: 'chip-stone', label: T('chips.expired') }
    case 'missing':  return { cls: 'chip-stone', label: T('chips.missing') }
    default:         return { cls: 'chip-stone', label: T('chips.uploaded') }
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
  if (person.invite_status === 'pending') return { cls: 'chip-navy', label: T('chips.invited') }
  const grants = person.access_grants || {}
  const areas = grants.accessAreas || []
  if (areas.length >= 5) return { cls: 'chip-sage', label: T('chips.fullAccess') }
  if ((grants.accessTiming || 'always') === 'always') return { cls: 'chip-sage', label: T('chips.whileAlive') }
  return { cls: 'chip-stone', label: T('chips.whenTimeComes') }
}

// Human relative time, e.g. "Just now", "2d ago", "1w ago".
export function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 45) return T('time.justNow')
  const mins = Math.round(secs / 60)
  if (mins < 60) return T('time.mins', { n: mins })
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return T('time.hours', { n: hrs })
  const days = Math.round(hrs / 24)
  if (days < 7) return T('time.days', { n: days })
  const weeks = Math.round(days / 7)
  if (weeks < 5) return T('time.weeks', { n: weeks })
  const months = Math.round(days / 30)
  return T('time.months', { n: months })
}

// Turn an activity_log row into a readable line, matching the web's phrasing.
export function activityText(row) {
  const name = row.resource_name || T('activity.anItem')
  switch (row.action) {
    case 'account.created':    return T('activity.accountCreated', { name })
    case 'account.updated':    return T('activity.accountUpdated', { name })
    case 'document.uploaded':  return T('activity.documentUploaded', { name })
    case 'person.invited':     return T('activity.personInvited', { name })
    case 'instruction.created':return T('activity.instructionCreated', { name })
    case 'auth.new_device_login': return T('activity.newDevice')
    case 'data_export':        return T('activity.dataExport')
    case 'owner.status_changed': return T('activity.statusChanged')
    default: {
      // Unknown actions: humanise the verb ("password_changed" → "password
      // changed") and skip the "an item" filler when there's no resource name.
      const verb = (String(row.action || '').split('.')[1] || String(row.action || '') || 'changed').replace(/_/g, ' ')
      if (!row.resource_name) return verb.charAt(0).toUpperCase() + verb.slice(1)
      return `${name} ${verb}`
    }
  }
}
