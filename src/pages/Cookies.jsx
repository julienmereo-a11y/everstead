import React from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import i18n from '../i18n'
import enCookies from '../i18n/locales/en/cookies.json'
import frCookies from '../i18n/locales/fr/cookies.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later — re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'cookies', enCookies)
i18n.addResourceBundle('fr', 'cookies', frCookies)

// Non-text metadata — all visible copy lives in the "cookies" i18n namespace.
const CATEGORY_REQUIRED = [true, false, false]

export default function Cookies() {
  useReveal()
  const { t } = useTranslation('cookies')

  const localePrefix = i18n.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/cookies`

  const categories = t('categories', { returnObjects: true })
    .map((cat, i) => ({ ...cat, required: CATEGORY_REQUIRED[i] }))

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
      </Helmet>
      <HreflangLinks path="/cookies" />

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
          <div className="max-w-3xl mx-auto px-6 lg:px-8 space-y-10">

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{t('what.title')}</h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                {t('what.body')}
              </p>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-6">{t('cookiesWeUse.title')}</h2>
              <div className="space-y-6">
                {categories.map(cat => (
                  <div key={cat.name} className="rounded-2xl border border-stone-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-navy-900 text-sm">{cat.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cat.required ? 'bg-navy-100 text-navy-700' : 'bg-stone-100 text-stone-600'}`}>
                        {cat.required ? t('badges.alwaysActive') : t('badges.consentRequired')}
                      </span>
                    </div>
                    <p className="text-stone-600 text-sm leading-relaxed mb-4">{cat.description}</p>
                    <div className="grid sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('labels.examples')}</p>
                        <p className="text-stone-500 font-mono">{cat.examples}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('labels.provider')}</p>
                        <p className="text-stone-500">{cat.provider}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('labels.retention')}</p>
                        <p className="text-stone-500">{cat.retention}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{t('notUse.title')}</h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                {t('notUse.body')}
              </p>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{t('managing.title')}</h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-3">
                {t('managing.p1Before')} <strong>{t('managing.p1Strong')}</strong> {t('managing.p1After')}
              </p>
              <p className="text-stone-600 text-sm leading-relaxed">
                {t('managing.p2')}
              </p>
              <button
                type="button"
                onClick={() => window.Cookiebot?.renew?.()}
                className="mt-4 inline-flex items-center rounded-full border border-navy-950/20 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-navy-950/5 transition-colors"
              >
                {t('managing.button')}
              </button>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{t('legalBasis.title')}</h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                {t('legalBasis.body')}
              </p>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{t('contact.title')}</h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                {t('contact.intro')}{' '}
                <a href="mailto:hello@everstead.care" className="text-navy-700 hover:text-navy-900 underline">hello@everstead.care</a>{' '}
                {t('contact.orSee')}{' '}
                <Link to="/privacy" className="text-navy-700 hover:text-navy-900 underline">{t('contact.privacyPolicy')}</Link>.
              </p>
              <p className="mt-4 text-stone-400 text-xs">
                {t('contact.company')}
              </p>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
