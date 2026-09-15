// Everstead for Business — shared route map and copy registration.
//
// The business tree lives at /business (English) and /fr/entreprises (French).
// Each vertical has its own French slug, registered in FR_PATH_ALIASES so the
// language switcher, the footer, hreflang and the sitemap all agree. Only the
// English paths are canonical keys (TRANSLATED_PATHS, the sitemap, the share
// shells); the French ones are looked up from here.
//
// The adviser vertical renders the existing ForAdvisors page, which is far
// richer than the template the other three share — /for-advisers now 301s to
// /business/advisers (vercel.json).
import { Briefcase, Scale, HeartHandshake, Building2 } from 'lucide-react'
import i18n from '../i18n'
import enBusiness from '../i18n/locales/en/business.json'
import frBusiness from '../i18n/locales/fr/business.json'

if (!i18n.hasResourceBundle('en', 'business')) {
  i18n.addResourceBundle('en', 'business', enBusiness)
  i18n.addResourceBundle('fr', 'business', frBusiness)
}

export const HUB = { en: '/business', fr: '/entreprises' }

export const VERTICALS = [
  { key: 'advisers',   en: '/business/advisers',   fr: '/entreprises/conseillers',    icon: Briefcase,     template: false },
  { key: 'solicitors', en: '/business/solicitors', fr: '/entreprises/notaires',       icon: Scale,         template: true  },
  { key: 'care',       en: '/business/care',       fr: '/entreprises/etablissements', icon: HeartHandshake, template: true },
  { key: 'employers',  en: '/business/employers',  fr: '/entreprises/employeurs',     icon: Building2,     template: true  },
]

export const hubPath = (lang) => (lang === 'fr' ? HUB.fr : HUB.en)
export const verticalPath = (v, lang) => (lang === 'fr' ? v.fr : v.en)
export const verticalByKey = (key) => VERTICALS.find(v => v.key === key) || null
/** Router pathname (basename-relative) → vertical, whichever tree it came from. */
export const verticalFromPath = (pathname) => VERTICALS.find(v => v.en === pathname || v.fr === pathname) || null
