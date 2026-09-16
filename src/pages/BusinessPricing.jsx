// Pricing for Everstead for Business, on the business tree rather than beside
// the family plans.
//
// The two audiences want opposite things from a pricing page. A family wants a
// number and a free start; an organisation wants to know what it is buying,
// who is liable for the data and how the purchase works. Putting both on one
// page made the family page longer and answered neither properly.
//
// No figures here on purpose. Neither product is bought with a card, the band
// depends on the size of the organisation, and a published table would commit
// us to a number before the first negotiation. The page says what you get, how
// buying works, and asks for twenty minutes.
import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, Gift } from 'lucide-react'
import HreflangLinks from '../components/HreflangLinks'
import { useReveal } from '../components/useReveal'
import { trackEvent } from '../lib/analytics'
import { hubPath } from './businessShared'

export const EN_PATH = '/business/pricing'
export const FR_PATH = '/entreprises/tarifs'

const SECTION_X = 'px-6 sm:px-8 lg:px-12'

export default function BusinessPricing() {
  const { t, i18n: inst } = useTranslation('business')
  const lang = inst.language === 'fr' ? 'fr' : 'en'
  const location = useLocation()
  useReveal()

  const isFr = lang === 'fr'
  const prefix = isFr ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${prefix}${isFr ? FR_PATH : EN_PATH}`
  const cta = (name) => trackEvent('cta_click', { location: 'business_pricing', cta: name })

  const steps = t('pricing.how.steps', { returnObjects: true })
  const faqs = t('pricing.faq.items', { returnObjects: true })

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (Array.isArray(faqs) ? faqs : []).map(({ q, a }) => ({
      '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const card = (k, dark) => (
    <div className={`reveal rounded-[2rem] p-8 sm:p-10 flex flex-col ${
      dark ? 'border border-navy-200 bg-navy-950 text-white' : 'border border-stone-200 bg-white'}`}>
      <p className={`text-sm font-semibold m-0 ${dark ? 'text-sage-300' : 'text-navy-700'}`}>{t(`pricing.${k}.name`)}</p>
      <p className={`mt-2 text-sm leading-relaxed m-0 ${dark ? 'text-stone-300' : 'text-stone-600'}`}>{t(`pricing.${k}.who`)}</p>

      <ul className="mt-6 space-y-2.5 list-none p-0 m-0">
        {t(`pricing.${k}.features`, { returnObjects: true }).map((f, n) => (
          <li key={n} className={`flex items-start gap-2.5 text-sm ${dark ? 'text-stone-200' : 'text-stone-600'}`}>
            <CheckCircle2 size={15} className={`${dark ? 'text-sage-400' : 'text-sage-600'} mt-0.5 shrink-0`} /> {f}
          </li>
        ))}
      </ul>

      <p className={`mt-6 text-xs leading-relaxed m-0 ${dark ? 'text-stone-400' : 'text-stone-400'}`}>{t(`pricing.${k}.note`)}</p>

      <div className="mt-auto pt-7">
        <Link to="/book-demo" onClick={() => cta(k)}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold w-full sm:w-auto transition-colors ${
            dark ? 'btn-aurora' : 'bg-navy-800 text-white hover:bg-navy-700'}`}>
          {t('pricing.cta.button')} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )

  return (
    <>
      <Helmet>
        <title>{t('pricing.meta.title')}</title>
        <meta name="description" content={t('pricing.meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={t('pricing.meta.title')} />
        <meta property="og:description" content={t('pricing.meta.description')} />
        <meta property="og:url" content={pageUrl} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <HreflangLinks path={EN_PATH} frPath={FR_PATH} />

      {/* ── HERO ── */}
      <section className={`bg-navy-950 text-white pt-36 pb-20 lg:pt-44 lg:pb-28 ${SECTION_X}`}>
        <div className="max-w-[1200px] mx-auto">
          <Link to={hubPath(lang)} className="reveal flex w-fit items-center gap-1.5 text-[13px] font-medium text-stone-400 hover:text-white transition-colors mb-6">
            {t('verticals.shared.backToHub')}
          </Link>
          <div className="max-w-[760px]">
            <span className="reveal section-label text-sage-400">{t('pricing.hero.eyebrow')}</span>
            <h1 className="reveal font-display font-light text-balance m-0 mt-3 leading-[1.08] text-[clamp(2.25rem,4.2vw,3.5rem)]">
              {t('pricing.hero.title')}
            </h1>
            <p className="reveal reveal-delay-1 mt-6 text-[17px] leading-[1.65] text-stone-300 m-0">
              {t('pricing.hero.sub')}
            </p>
          </div>
        </div>
      </section>

      {/* ── THE TWO PRODUCTS ── */}
      <section className={`py-20 lg:py-24 ${SECTION_X}`}>
        <div className="max-w-[1100px] mx-auto grid lg:grid-cols-2 gap-5 items-stretch">
          {card('exchange', true)}
          {card('pro', false)}
        </div>

        {/* The free promise, which is the reason the paid part can be simple */}
        <div className="max-w-[1100px] mx-auto mt-5">
          <div className="reveal rounded-[2rem] border border-sage-200 bg-sage-50 p-8 sm:p-10">
            <Gift size={20} className="text-sage-600" />
            <h2 className="font-display text-xl sm:text-2xl font-light text-navy-950 mt-3 mb-2">{t('pricing.free.title')}</h2>
            <p className="text-stone-700 text-sm leading-relaxed m-0 max-w-[760px]">{t('pricing.free.body')}</p>
          </div>
        </div>
      </section>

      {/* ── HOW BUYING WORKS ── */}
      <section className={`pb-20 lg:pb-24 ${SECTION_X}`}>
        <div className="max-w-[1100px] mx-auto">
          <div className="reveal max-w-[680px] mb-10">
            <span className="section-label section-label-light">{t('pricing.how.eyebrow')}</span>
            <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2rem,3.2vw,2.75rem)]">
              {t('pricing.how.title')}
            </h2>
          </div>
          <ol className="grid sm:grid-cols-3 gap-5 list-none m-0 p-0">
            {(Array.isArray(steps) ? steps : []).map((s, i) => (
              <li key={s.title} className={`reveal reveal-delay-${i + 1} rounded-2xl border border-stone-200 bg-white p-7`}>
                <span className="font-display text-[44px] leading-none font-light text-sage-500">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-4 mb-2 font-display font-medium text-[22px] text-navy-950 leading-tight">{s.title}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-stone-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={`pb-20 lg:pb-24 ${SECTION_X}`}>
        <div className="max-w-[820px] mx-auto">
          <div className="reveal mb-8">
            <span className="section-label section-label-light">{t('pricing.faq.eyebrow')}</span>
            <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2rem,3.2vw,2.75rem)]">
              {t('pricing.faq.title')}
            </h2>
          </div>
          <div className="space-y-3">
            {(Array.isArray(faqs) ? faqs : []).map((f, i) => (
              <div key={i} className="reveal rounded-2xl border border-stone-200 bg-white p-6">
                <p className="font-medium text-navy-900 text-sm m-0">{f.q}</p>
                <p className="text-stone-600 text-sm leading-relaxed mt-2 m-0">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSE ── */}
      <section className={`pb-24 lg:pb-32 ${SECTION_X}`}>
        <div className="max-w-[1100px] mx-auto reveal rounded-[2rem] bg-navy-950 text-white p-10 sm:p-14 text-center">
          <h2 className="font-display font-light m-0 leading-[1.1] text-[clamp(2rem,3.4vw,2.875rem)]">{t('pricing.cta.title')}</h2>
          <p className="mt-4 text-stone-300 text-[17px] leading-relaxed m-0 max-w-[560px] mx-auto">{t('pricing.cta.body')}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/book-demo" onClick={() => cta('close')}
              className="btn-aurora inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold">
              {t('pricing.cta.button')} <ArrowRight size={15} />
            </Link>
            <Link to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold border border-white/25 text-white hover:bg-white/10 transition-colors">
              {t('pricing.cta.quiet')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
