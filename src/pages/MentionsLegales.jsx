import React from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import i18n from '../i18n'
import enMentionsLegales from '../i18n/locales/en/mentionsLegales.json'
import frMentionsLegales from '../i18n/locales/fr/mentionsLegales.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later — re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'mentionsLegales', enMentionsLegales)
i18n.addResourceBundle('fr', 'mentionsLegales', frMentionsLegales)

// French-market legal notice (mentions légales) required by the LCEN for sites
// targeting France. Primarily served under /fr/mentions-legales; the English
// tree renders an English version of the same notice. Placeholder strings in
// square brackets ("[… — à compléter]") must be completed before this page is
// relied on — never replace them with guessed values.
export default function MentionsLegales() {
  useReveal()
  const { t } = useTranslation('mentionsLegales')

  const localePrefix = i18n.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/mentions-legales`

  const sections = t('sections', { returnObjects: true })

  return (
    <>
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="description" content={t('meta.description')} />
      <link rel="canonical" href={pageUrl} />
    </Helmet>
    <HreflangLinks path="/mentions-legales" />
    <div className="bg-stone-50 min-h-screen">
      {/* Header */}
      <section className="pt-40 pb-16 lg:pt-44 lg:pb-20 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">{t('header.eyebrow')}</p>
          <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance animate-fade-up">
            {t('header.title')}
          </h1>
          <p className="mt-4 text-stone-400 text-sm animate-fade-up animate-delay-100">{t('header.updated')}</p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 space-y-6">
          {sections.map(({ title, content }) => (
            <div key={title} className="reveal rounded-2xl bg-white border border-stone-200 px-7 py-6">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{title}</h2>
              {content.split('\n\n').map((para, j) => (
                <p key={j} className="text-stone-600 text-sm leading-relaxed mb-3 last:mb-0">{para}</p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
    </>
  )
}
