import React from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import i18n from '../i18n'
import enAccessibility from '../i18n/locales/en/accessibility.json'
import frAccessibility from '../i18n/locales/fr/accessibility.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later — re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'accessibility', enAccessibility)
i18n.addResourceBundle('fr', 'accessibility', frAccessibility)

export default function Accessibility() {
  useReveal()
  const { t } = useTranslation('accessibility')

  const localePrefix = i18n.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/accessibility`

  const sections = t('sections', { returnObjects: true })

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
      </Helmet>
      <HreflangLinks path="/accessibility" />

      <div className="bg-stone-50 pt-24 min-h-screen">
        <section className="py-16 lg:py-20 grain relative overflow-hidden">
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
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <div className="space-y-10">
              {sections.map(({ title, body }) => (
                <div key={title} className="reveal">
                  <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{title}</h2>
                  {body.split('\n\n').map((para, i) => (
                    <p key={i} className="text-stone-600 text-sm leading-relaxed mb-3 last:mb-0">{para}</p>
                  ))}
                </div>
              ))}
              <p className="text-stone-400 text-xs reveal">
                {t('company')}
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
