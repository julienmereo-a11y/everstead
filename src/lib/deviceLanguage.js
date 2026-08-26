// Which language a phone should open Everstead in.
//
// The website decides language from the URL: / is English, /fr is French, and
// that stays the canonical rule there because search engines index the two trees
// separately. The app has no URL to read. It loads capacitor://localhost/, so
// the path rule always resolved to English and the French build was unreachable
// unless someone found the Settings dropdown, in an app they could not read.
//
// So the app asks the phone instead. Three signals, any of which means French:
//
//   1. The device language is French. The strongest signal and the one every
//      other app uses.
//   2. The device REGION is France. Someone whose phone is in English but who
//      set their region to France.
//   3. The time zone is Europe/Paris. Someone physically in France whose phone
//      says neither of the above.
//
// This is only ever a default. A signed-in member's own choice
// (profiles.language, set in Settings) always wins, and signing up records
// whatever was detected so their emails match their app.
//
// Deliberately no imports: this runs during i18n setup, before anything else is
// wired up, and reads only what the browser already has. No network call, so the
// first paint is already in the right language rather than flashing English.

const SUPPORTED = ['en', 'fr']

/** True inside the iOS/Android shell. Reads the global so this module stays dependency-free. */
export function isNativeShell() {
  try {
    return !!globalThis.Capacitor?.isNativePlatform?.()
  } catch {
    return false
  }
}

/** Every locale tag the device reports, most preferred first. */
function deviceLocales() {
  try {
    const list = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().locale,
    ]
    return list.filter(Boolean).map(String)
  } catch {
    return []
  }
}

function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

/**
 * 'fr' when the phone looks French by language, region or location.
 * Always one of SUPPORTED, defaulting to English.
 */
export function detectDeviceLanguage() {
  // Split a BCP 47 tag into its parts: "fr-CA" → language 'fr', subtags ['CA'].
  // Parsing beats a prefix test, which would read "frr-DE" (North Frisian) as
  // French and "en-FRX" as France.
  const parts = (tag) => {
    const [language, ...subtags] = String(tag).split(/[-_]/)
    return { language: language.toLowerCase(), subtags }
  }
  const locales = deviceLocales().map(parts)

  // 1. Device language, e.g. fr, fr-FR, fr-CA.
  if (locales.some(l => l.language === 'fr')) return 'fr'

  // 2. Device region, e.g. en-FR for an English speaker living in France.
  //    A region subtag is exactly two letters, so "FRX" is not a match.
  if (locales.some(l => l.subtags.some(s => s.toUpperCase() === 'FR'))) return 'fr'

  // 3. Physically in France.
  if (deviceTimeZone() === 'Europe/Paris') return 'fr'

  return 'en'
}

/**
 * The language the app should open in before anyone has signed in.
 * On the web this returns null: the URL decides there, and this must not
 * interfere with the /fr tree or with search engines.
 */
export function preferredAppLanguage() {
  if (!isNativeShell()) return null
  const lang = detectDeviceLanguage()
  return SUPPORTED.includes(lang) ? lang : 'en'
}
