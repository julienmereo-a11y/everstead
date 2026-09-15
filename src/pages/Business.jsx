// /business (English) and /fr/entreprises (French) — the Everstead for Business
// home. Four verticals, why organisations bring us in, how a partnership works,
// the trust points a partner can repeat, and what we are building next.
// All copy lives in the "business" namespace, written per country.
import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import HreflangLinks from '../components/HreflangLinks'
import { useReveal } from '../components/useReveal'
import { trackEvent } from '../lib/analytics'
import { HUB, VERTICALS, verticalPath } from './businessShared'

const SECTION_X = 'px-6 sm:px-8 lg:px-12'

export default function Business() {
  const { t, i18n: inst } = useTranslation('business')
  const lang = inst.language === 'fr' ? 'fr' : 'en'
  const location = useLocation()
  const navigate = useNavigate()
  useReveal()

  // Each tree has its own slug; the other one redirects so shared links work.
  useEffect(() => {
    if (lang === 'fr' && location.pathname === HUB.en) navigate(HUB.fr, { replace: true })
    if (lang === 'en' && location.pathname === HUB.fr) navigate(HUB.en, { replace: true })
  }, [lang, location.pathname, navigate])

  const pageUrl = `https://www.everstead.care${lang === 'fr' ? `/fr${HUB.fr}` : HUB.en}`
  const cta = (name) => trackEvent('cta_click', { location: 'business_hub', cta: name })

  const audiences = t('hub.audiences.items', { returnObjects: true })
  const why = t('hub.why.items', { returnObjects: true })
  const steps = t('hub.how.steps', { returnObjects: true })
  const points = t('hub.trust.points', { returnObjects: true })
  const nextItems = t('hub.next.items', { returnObjects: true })

  return (
    <>
      <Helmet>
        <title>{t('hub.meta.title')}</title>
        <meta name="description" content={t('hub.meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('hub.meta.title')} />
        <meta property="og:description" content={t('hub.meta.description')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.jpg?v=4" />
      </Helmet>
      <HreflangLinks path={HUB.en} frPath={HUB.fr} />

      <div className="bg-stone-50">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden grain">
          <div className="absolute inset-0 aurora-bg" />
          <div className={`relative max-w-[1200px] mx-auto ${SECTION_X} pt-36 pb-20 lg:pt-44 lg:pb-28`}>
            <div className="max-w-[760px]">
              <span className="section-label section-label-dark">{t('hub.hero.eyebrow')}</span>
              <h1 className="font-display font-light text-white text-balance m-0 leading-[1.06] text-[clamp(2.5rem,5vw,4.5rem)]">{t('hub.hero.title')}</h1>
              <p className="mt-6 m-0 text-[17px] sm:text-[19px] leading-[1.55] text-stone-300 max-w-[620px]">{t('hub.hero.sub')}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/book-demo" onClick={() => cta('book_demo_hero')} className="inline-flex items-center gap-2.5 rounded-full bg-stone-50 hover:bg-white text-navy-950 text-base font-semibold px-[30px] py-4 transition-colors">
                  {t('hub.hero.ctaPrimary')} <ArrowRight size={18} />
                </Link>
                <a href="#audiences" className="inline-flex items-center gap-2 rounded-full px-[26px] py-4 text-[15px] font-medium text-stone-50 border border-white/35 bg-white/[0.06] hover:border-white transition-colors">
                  {t('hub.hero.ctaSecondary')}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── AUDIENCES ── */}
        <section id="audiences" className={`py-20 lg:py-28 ${SECTION_X} scroll-mt-28`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-10 lg:mb-14">
              <span className="section-label section-label-light">{t('hub.audiences.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t('hub.audiences.title')}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {audiences.map((a, i) => {
                const v = VERTICALS.find(x => x.key === a.key)
                if (!v) return null
                const Icon = v.icon
                return (
                  <Link
                    key={a.key}
                    to={verticalPath(v, lang)}
                    onClick={() => cta(`audience_${a.key}`)}
                    className={`reveal reveal-delay-${(i % 4) + 1} card-light p-8 flex flex-col gap-4 no-underline transition-[transform,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(13,22,40,0.2)]`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center"><Icon size={20} /></div>
                    <h3 className="font-display font-medium text-[26px] leading-[1.2] text-navy-950 m-0">{a.title}</h3>
                    <p className="m-0 text-[15px] leading-[1.6] text-stone-600">{a.body}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600">
                      {a.cta} <ArrowRight size={14} />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── WHY ── */}
        <section className={`py-20 lg:py-28 bg-white border-y border-stone-100 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-10 lg:mb-14">
              <span className="section-label section-label-light">{t('hub.why.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t('hub.why.title')}</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {why.map((w, i) => (
                <div key={w.title} className={`reveal reveal-delay-${i + 1} rounded-2xl border border-stone-200 bg-stone-50 p-7`}>
                  <h3 className="font-display font-medium text-[22px] text-navy-950 leading-tight m-0">{w.title}</h3>
                  <p className="mt-3 m-0 text-[15px] leading-[1.6] text-stone-600">{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW A PARTNERSHIP WORKS ── */}
        <section className={`py-20 lg:py-28 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-10 lg:mb-14">
              <span className="section-label section-label-light">{t('hub.how.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t('hub.how.title')}</h2>
            </div>
            <ol className="grid sm:grid-cols-3 gap-5 list-none m-0 p-0">
              {steps.map((s, i) => (
                <li key={s.title} className={`reveal reveal-delay-${i + 1} rounded-2xl border border-stone-200 bg-white p-7`}>
                  <span className="font-display text-[44px] leading-none font-light text-sage-500">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-4 mb-2 font-display font-medium text-[22px] text-navy-950 leading-tight">{s.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-stone-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── TRUST ── */}
        <section className={`py-20 lg:py-28 bg-white border-y border-stone-100 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-center">
            <div className="reveal">
              <span className="section-label section-label-light">{t('hub.trust.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t('hub.trust.title')}</h2>
              <Link to="/security" onClick={() => cta('security')} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors">
                {t('hub.trust.cta')} <ArrowRight size={15} />
              </Link>
            </div>
            <ul className="reveal reveal-delay-1 grid sm:grid-cols-2 gap-3 list-none m-0 p-0">
              {points.map(p => (
                <li key={p} className="rounded-[14px] border border-stone-200 bg-stone-50 px-[18px] py-4 flex items-start gap-3">
                  <CheckCircle2 size={17} className="text-sage-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-stone-900">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── WHERE THIS IS GOING ── */}
        <section className={`py-20 lg:py-28 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto reveal rounded-[28px] border border-stone-200 bg-white p-8 sm:p-10 lg:p-14">
            <div className="max-w-[720px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 text-sage-700 border border-sage-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
                <Sparkles size={12} /> {t('hub.next.badge')}
              </span>
              <h2 className="mt-5 font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(1.875rem,3vw,2.75rem)]">{t('hub.next.title')}</h2>
              <p className="mt-5 m-0 text-[15px] sm:text-base leading-[1.65] text-stone-600">{t('hub.next.body')}</p>
            </div>
            <div className="mt-8 grid sm:grid-cols-2 gap-5">
              {nextItems.map(n => (
                <div key={n.title} className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                  <h3 className="font-display font-medium text-[20px] text-navy-950 leading-tight m-0">{n.title}</h3>
                  <p className="mt-2.5 m-0 text-[15px] leading-[1.6] text-stone-600">{n.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 m-0 text-[13px] leading-[1.6] text-stone-500">{t('hub.next.note')}</p>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className={`relative py-24 lg:py-[120px] text-stone-50 overflow-hidden grain bg-gradient-to-br from-navy-950 to-navy-800 ${SECTION_X}`}>
          <div className="relative max-w-3xl mx-auto text-center reveal">
            <h2 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.6vw,3.375rem)]">{t('hub.final.title')}</h2>
            <p className="mt-5 m-0 text-base leading-[1.6] text-stone-300 max-w-xl mx-auto">{t('hub.final.body')}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/book-demo" onClick={() => cta('book_demo_final')} className="inline-flex items-center justify-center gap-2.5 rounded-full bg-stone-50 hover:bg-white text-navy-950 text-base font-semibold px-[30px] py-4 transition-colors">
                {t('hub.final.ctaPrimary')} <ArrowRight size={18} />
              </Link>
              <a href="mailto:hello@everstead.care" onClick={() => cta('email_final')} className="inline-flex items-center justify-center gap-2 rounded-full px-[26px] py-4 text-[15px] font-medium text-stone-50 border border-white/35 bg-white/[0.06] hover:border-white transition-colors">
                {t('hub.final.ctaSecondary')}
              </a>
            </div>
            <p className="mt-6 m-0 text-xs text-stone-400">{t('hub.final.note')}</p>
          </div>
        </section>
      </div>
    </>
  )
}
