import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
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
])

export function languageFromPath(pathname) {
  return pathname === '/fr' || pathname.startsWith('/fr/') ? 'fr' : 'en'
}

// Custom detector: path prefix only. No navigator fallback, no caching.
const pathDetector = {
  name: 'urlPathPrefix',
  lookup() {
    if (typeof window === 'undefined') return 'en'
    return languageFromPath(window.location.pathname)
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
        useCases: frUseCases,
        login: frLogin,
      },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ['urlPathPrefix'], // path only — never the browser language
      caches: [],               // persist nothing (the URL is canonical)
    },
    interpolation: { escapeValue: false }, // React already escapes
    returnEmptyString: false,
  })

export default i18n
