import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import i18n from '../i18n'
import enSubprocessors from '../i18n/locales/en/subprocessors.json'
import frSubprocessors from '../i18n/locales/fr/subprocessors.json'

// Self-registered namespace (page-scoped strings stay in this lazy chunk;
// central src/i18n/index.js keeps only the shared always-loaded namespaces).
i18n.addResourceBundle('en', 'subprocessors', enSubprocessors)
i18n.addResourceBundle('fr', 'subprocessors', frSubprocessors)

const COMPANY = 'Everstead Digital Ltd'

// Keep this list in sync with the Adviser DPA, clause 6. Company names and
// privacy-policy URLs live here (never translated); purposes, locations, and
// transfer safeguards live in the "subprocessors" i18n namespace (en + fr).
const SUBPROCESSOR_META = [
  { name: 'Supabase Inc.', website: 'https://supabase.com/privacy' },
  { name: 'Vercel Inc.', website: 'https://vercel.com/legal/privacy-policy' },
  { name: 'Stripe Payments Europe Ltd.', website: 'https://stripe.com/privacy' },
  { name: 'Resend Inc.', website: 'https://resend.com/legal/privacy-policy' },
  { name: 'Functional Software, Inc. (Sentry)', website: 'https://sentry.io/privacy/' },
  { name: 'Anthropic, PBC', website: 'https://www.anthropic.com/legal/privacy' },
]

const policyLinkClass = 'text-sage-700 underline hover:text-sage-800'

export default function Subprocessors() {
  useReveal()
  const { t, i18n } = useTranslation('subprocessors')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const localePrefix = i18n.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/subprocessors`

  const subprocessors = SUBPROCESSOR_META.map((meta, i) => ({
    ...meta,
    purpose: t(`list.${i}.purpose`),
    location: t(`list.${i}.location`),
    transferMechanism: t(`list.${i}.transferMechanism`),
  }))

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/subprocessors/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || t('form.error'))
        return
      }
      setStatus('success')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(t('form.error'))
    }
  }

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
      </Helmet>
      <HreflangLinks path="/subprocessors" />

      <div className="bg-stone-50 min-h-screen">

        {/* Hero — extends under the fixed nav (no top padding on wrapper);
            internal pt-40 lifts the content below the 96px nav strip */}
        <section className="pt-40 pb-16 lg:pt-44 lg:pb-20 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('hero.eyebrow')}</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance">
              {t('hero.title')}
            </h1>
            <p className="mt-4 text-stone-300 text-sm">{t('hero.lastUpdated', { date: t('effectiveDate') })}</p>
          </div>
        </section>

        <section className="py-20 lg:py-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 space-y-10">

            {/* Intro */}
            <div className="reveal rounded-2xl bg-white border border-stone-200 px-7 py-6 space-y-3">
              <p className="text-sm text-stone-700 leading-relaxed">
                {t('intro.p1', { company: COMPANY })}
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">
                <Trans
                  t={t}
                  i18nKey="intro.p2"
                  components={{
                    dpaLink: <Link to="/adviser-dpa" className={policyLinkClass} />,
                    privacyLink: <Link to="/privacy" className={policyLinkClass} />,
                  }}
                />
              </p>
            </div>

            {/* Subprocessor cards */}
            <div className="reveal space-y-4">
              {subprocessors.map((sp) => (
                <div key={sp.name} className="rounded-2xl bg-white border border-stone-200 px-7 py-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="font-display text-lg font-medium text-navy-900">{sp.name}</h2>
                    <a
                      href={sp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sage-700 underline hover:text-sage-800 shrink-0 mt-1"
                    >
                      {t('card.privacyPolicyLink')}
                    </a>
                  </div>
                  <dl className="space-y-2.5 text-sm">
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <dt className="text-stone-500 font-medium">{t('card.purposeLabel')}</dt>
                      <dd className="text-stone-700">{sp.purpose}</dd>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <dt className="text-stone-500 font-medium">{t('card.locationLabel')}</dt>
                      <dd className="text-stone-700">{sp.location}</dd>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <dt className="text-stone-500 font-medium">{t('card.transferLabel')}</dt>
                      <dd className="text-stone-700">{sp.transferMechanism}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {/* Notification clause */}
            <div className="reveal rounded-2xl bg-sage-50 border border-sage-200 px-7 py-6 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-sage-700 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-navy-900 text-sm">{t('changes.title')}</h3>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    <Trans t={t} i18nKey="changes.p1" />
                  </p>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {t('changes.p2')}
                  </p>

                  {status === 'success' ? (
                    <div className="flex items-start gap-2.5 mt-3 rounded-xl bg-white border border-sage-200 px-4 py-3">
                      <CheckCircle2 size={18} className="text-sage-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-navy-900">{t('form.successTitle')}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{t('form.successBody')}</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="mt-3 flex flex-col sm:flex-row gap-2.5" noValidate>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                        placeholder={t('form.placeholder')}
                        aria-label={t('form.emailAria')}
                        className="flex-1 min-w-0 px-4 py-2.5 text-sm rounded-xl border border-stone-300 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500"
                        disabled={status === 'submitting'}
                      />
                      <button
                        type="submit"
                        disabled={status === 'submitting' || !email}
                        className="px-5 py-2.5 text-sm font-medium rounded-full bg-sage-700 text-white hover:bg-sage-800 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed shrink-0"
                      >
                        {status === 'submitting' ? t('form.submitting') : t('form.submit')}
                      </button>
                    </form>
                  )}
                  {status === 'error' && (
                    <p className="text-xs text-red-700 mt-2">{errorMsg}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer note + cross-links */}
            <div className="reveal space-y-4">
              <p className="text-xs text-stone-500 leading-relaxed">
                <Trans
                  t={t}
                  i18nKey="footer.note"
                  values={{ company: COMPANY }}
                  components={{
                    privacyLink: <Link to="/privacy" className={policyLinkClass} />,
                    dpaLink: <Link to="/adviser-dpa" className={policyLinkClass} />,
                  }}
                />
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link to="/privacy" className="inline-flex items-center gap-1.5 text-navy-800 hover:text-navy-900 font-medium">
                  {t('footer.privacyPolicy')} <ArrowRight size={13} />
                </Link>
                <Link to="/adviser-dpa" className="inline-flex items-center gap-1.5 text-navy-800 hover:text-navy-900 font-medium">
                  {t('footer.adviserDpa')} <ArrowRight size={13} />
                </Link>
                <Link to="/security" className="inline-flex items-center gap-1.5 text-navy-800 hover:text-navy-900 font-medium">
                  {t('footer.security')} <ArrowRight size={13} />
                </Link>
              </div>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
