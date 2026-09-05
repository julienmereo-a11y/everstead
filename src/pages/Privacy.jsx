import React from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import i18n from '../i18n'
import enPrivacy from '../i18n/locales/en/privacy.json'
import frPrivacy from '../i18n/locales/fr/privacy.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later — re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'privacy', enPrivacy)
i18n.addResourceBundle('fr', 'privacy', frPrivacy)

export default function Privacy() {
  useReveal()
  const { t } = useTranslation('privacy')

  const localePrefix = i18n.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/privacy`

  const sections = t('sections', { returnObjects: true })
  // Linkable sections (e.g. /privacy#your-rights-and-controls is the data
  // deletion instructions URL registered with Meta and the app stores).
  const anchor = (title) => title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return (
    <>
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="description" content={t('meta.description')} />
      <link rel="canonical" href={pageUrl} />
    </Helmet>
    <HreflangLinks path="/privacy" />
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
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="prose-style space-y-10">
            {sections.map(({ title, content }) => (
              <div key={title} id={anchor(title)} className="reveal scroll-mt-28">
                <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{title}</h2>
                {content.split('\n\n').map((para, j) => (
                  <p key={j} className="text-stone-600 text-sm leading-relaxed mb-3 last:mb-0">{para}</p>
                ))}
              </div>
            ))}

            <div id="cookies" className="reveal space-y-6">
              <h2 className="font-display text-xl font-medium text-navy-950">{t('cookiePolicy.title')}</h2>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">{t('cookiePolicy.what.title')}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {t('cookiePolicy.what.body')}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">{t('cookiePolicy.how.title')}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{t('cookiePolicy.how.intro')}</p>

                <div className="space-y-2">
                  <h4 className="font-semibold text-navy-800 text-sm">{t('cookiePolicy.how.essential.title')}</h4>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    {t('cookiePolicy.how.essential.body')}
                  </p>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    {t('cookiePolicy.how.essential.examples')}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-navy-800 text-sm">{t('cookiePolicy.how.analytics.title')}</h4>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    {t('cookiePolicy.how.analytics.body')}
                  </p>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    {t('cookiePolicy.how.analytics.provider')}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">{t('cookiePolicy.notUse.title')}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {t('cookiePolicy.notUse.body')}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">{t('cookiePolicy.managing.title')}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {t('cookiePolicy.managing.body')}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">{t('cookiePolicy.contact.title')}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {t('cookiePolicy.contact.intro')}{' '}
                  <a href="mailto:hello@everstead.care" className="text-navy-700 hover:text-navy-900 underline">hello@everstead.care</a>.
                </p>
              </div>

              <p className="text-stone-500 text-xs leading-relaxed italic">
                {t('cookiePolicy.footnote')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  )
}
