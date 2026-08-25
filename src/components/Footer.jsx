import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TRANSLATED_PATHS } from '../i18n'
import StoreBadges from './StoreBadges'

// ── Trustpilot rating (manual) ───────────────────────────────────────────────
// We do NOT recreate Trustpilot's trademarked stars. Instead, drop a genuine,
// unaltered screenshot of your own Trustpilot rating into /public and set `image`
// below — it links to your profile. Until an image is present, a plain-text badge
// (nominative fair use — no trademarked star) shows instead. `label` is the fallback
// text only; keep it matching your real Trustpilot rating.
const TRUSTPILOT = {
  label: 'Excellent',
  profileUrl: 'https://www.trustpilot.com/review/everstead.care',
  image: '/trustpilot-rating.png',   // your real screenshot; falls back to text if missing
}

function TrustpilotBadge() {
  const { t } = useTranslation()
  const { label, profileUrl, image } = TRUSTPILOT
  const [imgOk, setImgOk] = React.useState(!!image)
  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-block"
      aria-label={t('footer.trustpilotAria', { label })}
    >
      {imgOk ? (
        <img
          src={image}
          alt={t('footer.trustpilotAria', { label })}
          loading="lazy"
          className="w-auto max-w-[180px] h-auto"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="text-xs text-stone-400 group-hover:text-white transition-colors whitespace-nowrap">
          {t('footer.trustpilotRated')} <span className="font-medium text-[#00b67a]">{label}</span> {t('footer.trustpilotOn')}&nbsp;→
        </span>
      )}
    </a>
  )
}

// Labels are i18n keys under footer.links.* — resolved with t() at render time.
const cols = [
  {
    headingKey: 'product',
    links: [
      { key: 'features', href: '/features' },
      { key: 'howItWorks', href: '/how-it-works' },
      { key: 'pricing', href: '/pricing' },
      { key: 'security', href: '/security' },
      { key: 'changelog', href: '/changelog' },
    ],
  },
  {
    headingKey: 'useCases',
    links: [
      { key: 'forFamilies', href: '/use-cases/families' },
      { key: 'forParents', href: '/use-cases/parents' },
      { key: 'forExecutors', href: '/use-cases/executors' },
      { key: 'forAdvisers', href: '/for-advisers' },
      { key: 'familyVault', href: '/family-vault' },
    ],
  },
  {
    headingKey: 'resources',
    links: [
      { key: 'blog', href: '/resources/blog' },
      { key: 'guides', href: '/resources/guides' },
      { key: 'checklists', href: '/resources/checklists' },
      { key: 'faqs', href: '/resources/faqs' },
      { key: 'freeTools', href: '/resources#tools' },
      { key: 'compare', href: '/compare' },
    ],
  },
  {
    headingKey: 'company',
    links: [
      { key: 'about', href: '/about' },
      { key: 'contact', href: '/contact' },
      { key: 'press', href: '/press' },
      { key: 'bookDemo', href: '/book-demo' },
      { key: 'gift', href: '/gift' },
    ],
  },
  {
    headingKey: 'legal',
    links: [
      { key: 'privacyPolicy', href: '/privacy' },
      { key: 'terms', href: '/terms' },
      { key: 'dataPromise', href: '/data-promise' },
      { key: 'adviserDpa', href: '/adviser-dpa' },
      { key: 'subprocessors', href: '/subprocessors' },
      { key: 'cookiePolicy', href: '/cookies' },
      { key: 'accessibility', href: '/accessibility' },
      { key: 'mentionsLegales', href: '/mentions-legales' },
    ],
  },
]

// Persist an explicit language choice for the edge middleware (middleware.js):
// once set, typing the bare domain stops bouncing a French visitor to /fr, and
// a UK visitor who wants French keeps it. One year, no personal data.
export function rememberLanguage(lang) {
  try {
    document.cookie = `everstead_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`
  } catch { /* cookies blocked: the link still works, it just will not stick */ }
}

// Discreet language link. Language is decided purely by the URL path; the
// French footer links back to the root (English) tree, and the English footer
// links to /fr — same page when it's translated, the French home otherwise.
// Plain <a>: the router basename differs per locale, so a <Link> can't cross trees.
// useLocation() is basename-relative, so `pathname` IS the root-equivalent path.
function LanguageLink() {
  const { i18n } = useTranslation()
  const { pathname } = useLocation()
  if (i18n.language === 'fr') {
    return (
      <a
        href={pathname}
        hrefLang="en"
        onClick={() => rememberLanguage('en')}
        className="hover:text-stone-400 transition-colors"
      >
        English
      </a>
    )
  }
  const target = TRANSLATED_PATHS.has(pathname)
    ? `/fr${pathname === '/' ? '' : pathname}`
    : '/fr'
  return (
    <a
      href={target}
      hrefLang="fr"
      onClick={() => rememberLanguage('fr')}
      className="hover:text-stone-400 transition-colors"
    >
      Français
    </a>
  )
}

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="aurora-field aurora-dim text-stone-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <Link to="/">
              <img src="/logo-v2-white.png" alt="Everstead" className="h-10 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed text-stone-500 max-w-[220px]">
              {t('footer.tagline')}
            </p>
            <p className="text-xs leading-relaxed text-stone-600 max-w-[240px]">
              {t('footer.legalNote')}
            </p>
            <div className="pt-1">
              <TrustpilotBadge />
            </div>
            <StoreBadges className="pt-2" />
          </div>

          {/* Columns */}
          {cols.map(col => (
            <div key={col.headingKey}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">{t(`footer.cols.${col.headingKey}`)}</h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link to={l.href} className="text-sm text-stone-400 hover:text-white transition-colors">
                      {t(`footer.links.${l.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-navy-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone-600">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-stone-400 transition-colors">{t('footer.bottom.privacy')}</Link>
            <Link to="/terms" className="hover:text-stone-400 transition-colors">{t('footer.bottom.terms')}</Link>
            <Link to="/data-promise" className="hover:text-stone-400 transition-colors">{t('footer.bottom.dataPromise')}</Link>
            <Link to="/cookies" className="hover:text-stone-400 transition-colors">{t('footer.bottom.cookies')}</Link>
            <Link to="/accessibility" className="hover:text-stone-400 transition-colors">{t('footer.bottom.accessibility')}</Link>
            <Link to="/security" className="hover:text-stone-400 transition-colors">{t('footer.bottom.trust')}</Link>
            <LanguageLink />
          </div>
        </div>
      </div>
    </footer>
  )
}
