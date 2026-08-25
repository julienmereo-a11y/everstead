// ─────────────────────────────────────────────────────────────────────────────
// Transactional email localisation.
//
// Emails have no URL to read a locale from, so the recipient's own preference
// (profiles.language, captured at signup and changeable in Settings) decides
// the language. Everything here is dependency-free: templates stay plain
// tagged strings, only the COPY moves into a per-template dictionary.
//
// Usage in a sender:
//   import { translator, languageForUser, emailDate } from '../_lib/email-i18n.js'
//   const COPY = { en: { subject: 'Your trial ends…', … }, fr: { subject: '…', … } }
//   const lang = await languageForUser(supabase, { userId: p.id })
//   const t = translator(COPY, lang)
//   subject: t('subject', { days: 3 })
//
// Rules that matter:
//  • Founder/admin notifications stay English: do NOT localise those.
//  • Cron loops must SELECT the language column and resolve per recipient.
//  • Never translate stored values, links, or brand names.
//  • No em/en dashes in any copy (house rule).
// ─────────────────────────────────────────────────────────────────────────────

export const EMAIL_LANGS = ['en', 'fr']
export const DEFAULT_LANG = 'en'

/** Normalise anything (null, 'fr-FR', 'de') to a supported language. */
export function pickLang(value) {
  const v = String(value ?? '').slice(0, 2).toLowerCase()
  return EMAIL_LANGS.includes(v) ? v : DEFAULT_LANG
}

/**
 * Resolve a recipient's language from their profile. Accepts a user id or an
 * email address. Never throws: an unknown recipient simply gets English.
 */
export async function languageForUser(supabase, { userId, email } = {}) {
  try {
    if (!userId && !email) return DEFAULT_LANG
    const q = supabase.from('profiles').select('language').limit(1)
    const { data } = userId
      ? await q.eq('id', userId).maybeSingle()
      : await q.ilike('email', email).maybeSingle()
    return pickLang(data?.language)
  } catch {
    return DEFAULT_LANG
  }
}

/**
 * Build a translator bound to one dictionary and language.
 * Missing keys fall back to English, then to the key itself, so a partial
 * translation can never render an empty email.
 */
export function translator(dict, lang) {
  const L = pickLang(lang)
  return (key, vars = {}) => {
    const raw = dict?.[L]?.[key] ?? dict?.[DEFAULT_LANG]?.[key] ?? key
    return String(raw).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''))
  }
}

/** Date formatted for the recipient's language ("5 March 2026" / "5 mars 2026"). */
export function emailDate(value, lang, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString(pickLang(lang) === 'fr' ? 'fr-FR' : 'en-GB', opts)
  } catch {
    return ''
  }
}

/** Shared footer line, localised. Keeps addresses and links identical. */
export function footerCopy(lang) {
  return pickLang(lang) === 'fr'
    ? { questions: 'Une question ?', unsubscribe: 'Se désabonner' }
    : { questions: 'Questions?', unsubscribe: 'Unsubscribe' }
}
