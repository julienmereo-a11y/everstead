import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { preferredAppLanguage } from '../lib/deviceLanguage'
import enCommon from './locales/en/common.json'
import frCommon from './locales/fr/common.json'
import enHome from './locales/en/home.json'
import frHome from './locales/fr/home.json'
import enPricing from './locales/en/pricing.json'
import frPricing from './locales/fr/pricing.json'
import enHowItWorks from './locales/en/howItWorks.json'
import frHowItWorks from './locales/fr/howItWorks.json'
import enFeatures from './locales/en/features.json'
import frFeatures from './locales/fr/features.json'
import enSecurity from './locales/en/security.json'
import frSecurity from './locales/fr/security.json'
import enDelegateRegister from './locales/en/delegateRegister.json'
import frDelegateRegister from './locales/fr/delegateRegister.json'
import enUseCases from './locales/en/useCases.json'
import frUseCases from './locales/fr/useCases.json'
import enLogin from './locales/en/login.json'
import frLogin from './locales/fr/login.json'

// ─────────────────────────────────────────────────────────────────────────────
// i18n — URL-prefix locale strategy.
//
// The path is the SINGLE source of truth: /fr/* → French, everything else →
// English. We deliberately do NOT read the browser language and do NOT persist
// anything to localStorage — the URL is canonical, which keeps SEO clean
// (Google indexes / and /fr as two stable language trees, hreflang links them).
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = ['en', 'fr']

// Route paths (locale-neutral) that exist in BOTH language trees. Drives the
// footer language link and the hreflang alternates — add a path here when its
// page gains a full French translation.
export const TRANSLATED_PATHS = new Set([
  '/', '/features', '/how-it-works', '/pricing', '/security', '/use-cases', '/login',
  '/get-started', '/forgot-password', '/reset-password', '/contact', '/book-demo',
  '/about', '/gift', '/compare',
  '/privacy', '/cookies', '/accessibility', '/data-promise', '/subprocessors',
  '/terms', '/mentions-legales', '/resources', '/apres-un-deces', '/press',
  '/estate-readiness-score', '/digital-estate-worth',
  '/use-cases/families', '/use-cases/parents', '/use-cases/aging-adults', '/use-cases/executors', '/use-cases/advisors',
  '/emergency-pack', '/will-generator',
  // Everstead for Business. The French tree uses French slugs (FR_PATH_ALIASES).
  '/business', '/business/advisers', '/business/solicitors', '/business/care', '/business/employers',
])

/**
 * Remember an explicit language choice for the edge middleware (middleware.js).
 * Once set, typing the bare domain stops bouncing a French visitor to /fr, and a
 * visitor outside France who wants French keeps it. One year, no personal data.
 */
export function rememberLanguage(lang) {
  try {
    document.cookie = `everstead_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`
  } catch { /* cookies blocked: navigation still works, the choice just will not stick */ }
}

/**
 * URL for the same page in the other language tree. useLocation().pathname is
 * basename-relative, so it IS the root-equivalent path in both trees.
 */
// Routes whose French tree uses a French slug. The English path is the key
// in TRANSLATED_PATHS, the sitemap and the share shells; the page itself
// redirects between the two so either URL works in either tree.
export const FR_PATH_ALIASES = {
  '/will-generator': '/preparer-mon-testament',
  '/business': '/entreprises',
  '/business/advisers': '/entreprises/conseillers',
  '/business/solicitors': '/entreprises/notaires',
  '/business/care': '/entreprises/etablissements',
  '/business/employers': '/entreprises/employeurs',
}
const EN_PATH_ALIASES = Object.fromEntries(Object.entries(FR_PATH_ALIASES).map(([en, fr]) => [fr, en]))

export function pathInLanguage(pathname, lang) {
  if (lang === 'fr') {
    const canonical = EN_PATH_ALIASES[pathname] || pathname
    if (!TRANSLATED_PATHS.has(canonical)) return '/fr'
    const frPath = FR_PATH_ALIASES[canonical] || canonical
    return `/fr${frPath === '/' ? '' : frPath}`
  }
  return EN_PATH_ALIASES[pathname] || pathname || '/'
}

export function languageFromPath(pathname) {
  return pathname === '/fr' || pathname.startsWith('/fr/') ? 'fr' : 'en'
}

// Custom detector. On the WEB the path is the only signal: no navigator
// fallback and no caching, so / and /fr stay two stable trees for search
// engines. The APP has no path to read (it loads capacitor://localhost/), which
// used to mean it was always English however French the phone was, so there it
// asks the device instead. See src/lib/deviceLanguage.js.
const pathDetector = {
  name: 'urlPathPrefix',
  lookup() {
    if (typeof window === 'undefined') return 'en'
    return preferredAppLanguage() ?? languageFromPath(window.location.pathname)
  },
}

const detector = new LanguageDetector()
detector.addDetector(pathDetector)

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        home: enHome,
        pricing: enPricing,
        howItWorks: enHowItWorks,
        features: enFeatures,
        security: enSecurity,
        delegateRegister: enDelegateRegister,
        useCases: enUseCases,
        login: enLogin,
      },
      fr: {
        common: frCommon,
        home: frHome,
        pricing: frPricing,
        howItWorks: frHowItWorks,
        features: frFeatures,
        security: frSecurity,
        delegateRegister: frDelegateRegister,
        useCases: frUseCases,
        login: frLogin,
      },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ['urlPathPrefix'], // path on the web, device in the app
      caches: [],               // persist nothing (the URL is canonical)
    },
    interpolation: { escapeValue: false }, // React already escapes
    returnEmptyString: false,
  })

export default i18n
