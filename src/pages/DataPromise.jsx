import React from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import enDataPromise from '../i18n/locales/en/dataPromise.json'
import frDataPromise from '../i18n/locales/fr/dataPromise.json'
import { Download, Clock, ShieldCheck, ArrowRight } from 'lucide-react'
import { useReveal } from '../components/useReveal'

// Self-registered namespace (page-scoped strings stay in this lazy chunk;
// central src/i18n/index.js keeps only the shared always-loaded namespaces).
i18n.addResourceBundle('en', 'dataPromise', enDataPromise)
i18n.addResourceBundle('fr', 'dataPromise', frDataPromise)

// ─────────────────────────────────────────────────────────────────────────────
// NON-TEXT DATA (icons, links — all visible copy lives in the "dataPromise"
// i18n namespace)
// ─────────────────────────────────────────────────────────────────────────────

const PROMISE_META = [
  {
    icon: Download,
    cta: { href: '/dashboard?tab=settings', requiresAuth: true },
  },
  { icon: Clock },
  {
    icon: ShieldCheck,
    cta: { href: '/privacy' },
  },
]

export default function DataPromise() {
  useReveal()
  const { t, i18n } = useTranslation('dataPromise')

  const localePrefix = i18n.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/data-promise`

  const promises = PROMISE_META.map((meta, i) => ({
    ...meta,
    title: t(`promises.${i}.title`),
    body: t(`promises.${i}.body`),
    cta: meta.cta ? { ...meta.cta, label: t(`promises.${i}.cta`) } : undefined,
  }))

  const commitments = t('commitment.items', { returnObjects: true })

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.ogDescription')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>
      <HreflangLinks path="/data-promise" />

      <div className="bg-stone-50">

        {/* ── Hero — extends under the fixed nav ── */}
        <section className="pt-44 pb-20 lg:pt-52 lg:pb-28 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">
              {t('hero.eyebrow')}
            </p>
            <h1 className="reveal reveal-delay-1 font-display text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-6 text-balance leading-tight">
              {t('hero.title')}
            </h1>
            <p className="reveal reveal-delay-2 text-lg text-stone-300 leading-relaxed max-w-xl mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>
        </section>

        {/* ── Three promise cards ── */}
        <section className="py-20 lg:py-28 bg-white border-b border-stone-100">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6">
              {promises.map(({ icon: Icon, title, body, cta }, i) => (
                <div
                  key={title}
                  className={`reveal reveal-delay-${i + 1} bg-stone-50 border border-stone-200 rounded-2xl p-7 flex flex-col`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-navy-100 flex items-center justify-center mb-5">
                    <Icon size={20} className="text-navy-700" />
                  </div>
                  <h2 className="font-semibold text-navy-950 text-lg mb-3">{title}</h2>
                  <p className="text-sm text-stone-600 leading-relaxed flex-1">{body}</p>
                  {cta && (
                    <Link
                      to={cta.href}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors"
                    >
                      {cta.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Full written commitment ── */}
        <section className="py-20 lg:py-28 bg-stone-50">
          <div className="max-w-2xl mx-auto px-6 lg:px-8">
            <h2 className="reveal font-display text-3xl font-light text-navy-950 mb-8">
              {t('commitment.title')}
            </h2>
            <div className="reveal reveal-delay-1 bg-white border border-stone-200 rounded-2xl p-8 space-y-6 text-sm text-stone-600 leading-relaxed">
              <p>
                {t('commitment.intro')}
              </p>
              <p className="font-semibold text-navy-900">{t('commitment.lead')}</p>
              <ul className="space-y-3">
                {commitments.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-sage-600 font-semibold shrink-0 mt-0.5">→</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              <p className="pt-2 border-t border-stone-100">
                {t('commitment.contact.prefix')}{' '}
                <a href="mailto:hello@everstead.care" className="text-navy-700 underline underline-offset-2">hello@everstead.care</a>.
                {' '}{t('commitment.contact.suffix')}
              </p>
              <p className="text-xs text-stone-400">
                {t('commitment.lastUpdated')}
              </p>
            </div>

            {/* ── CTA ── */}
            <div className="reveal reveal-delay-2 mt-10 flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/dashboard?tab=settings"
                className="inline-flex items-center gap-2 bg-navy-800 text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-navy-700 transition-colors"
              >
                <Download size={15} /> {t('cta.export')}
              </Link>
              <Link
                to="/privacy"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-navy-700 transition-colors"
              >
                {t('cta.privacy')} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
