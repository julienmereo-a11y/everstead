// One vertical inside Everstead for Business: solicitors, care providers or
// employers. (Advisers keep their own richer page, ForAdvisors, mounted at
// /business/advisers.) Copy lives in business.json under verticals.<key>,
// written per country rather than translated.
import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import HreflangLinks from '../components/HreflangLinks'
import { useReveal } from '../components/useReveal'
import { trackEvent } from '../lib/analytics'
import { VERTICALS, hubPath, verticalPath, verticalFromPath } from './businessShared'

const SECTION_X = 'px-6 sm:px-8 lg:px-12'

export default function BusinessVertical() {
  const { t, i18n: inst } = useTranslation('business')
  const lang = inst.language === 'fr' ? 'fr' : 'en'
  const location = useLocation()
  const navigate = useNavigate()
  useReveal()

  const vertical = verticalFromPath(location.pathname)
  const key = vertical?.key
  const wanted = vertical ? verticalPath(vertical, lang) : null

  // Each tree has its own slug; land on the other one and we move you across.
  useEffect(() => {
    if (wanted && location.pathname !== wanted) navigate(wanted, { replace: true })
  }, [wanted, location.pathname, navigate])

  // An unknown slug under /business/* is not a page: send it to the hub.
  if (!vertical || !vertical.template) return <Navigate to={hubPath(lang)} replace />

  const base = `verticals.${key}`
  const pageUrl = `https://www.everstead.care${lang === 'fr' ? `/fr${vertical.fr}` : vertical.en}`
  const cta = (name) => trackEvent('cta_click', { location: `business_${key}`, cta: name })

  const problems = t(`${base}.problem.items`, { returnObjects: true })
  const offers = t(`${base}.offer.items`, { returnObjects: true })
  const steps = t(`${base}.how.steps`, { returnObjects: true })
  const faqs = t(`${base}.faq.items`, { returnObjects: true })
  const nextItems = t(`${base}.next.items`, { returnObjects: true, defaultValue: [] })
  const hasNext = Array.isArray(nextItems) && nextItems.length > 0
  const others = VERTICALS.filter(v => v.key !== key)

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <Helmet>
        <title>{t(`${base}.meta.title`)}</title>
        <meta name="description" content={t(`${base}.meta.description`)} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t(`${base}.meta.title`)} />
        <meta property="og:description" content={t(`${base}.meta.description`)} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.jpg?v=4" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <HreflangLinks path={vertical.en} frPath={vertical.fr} />

      <div className="bg-stone-50">
        {/* ── HERO ──
            Same treatment as the business hub, and for the same reasons: the
            picture lies ON TOP of the aurora so a missing file degrades to the
            gradient, full bleed only from lg up, and phones get the whole
            composition as a band along the bottom rather than a crop that would
            cut the object the page is about. See Business.jsx. */}
        <section className="relative overflow-hidden grain bg-navy-950">
          <div className="absolute inset-0 aurora-bg" />
          <img
            src={`/${vertical.image}.jpg`}
            alt=""
            aria-hidden="true"
            fetchpriority="high"
            className="hidden lg:block absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '15% 42%' }}
          />
          <div
            className="hidden lg:block absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, rgba(13,22,40,0.95) 0%, rgba(13,22,40,0.88) 32%, rgba(13,22,40,0.42) 60%, rgba(13,22,40,0.05) 100%)' }}
          />
          <img
            src={`/${vertical.image}-mobile.jpg`}
            srcSet={`/${vertical.image}-mobile.jpg 820w, /${vertical.image}.jpg 1672w`}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            fetchpriority="high"
            className="lg:hidden absolute bottom-0 left-0 w-full h-auto"
          />
          <div
            className="lg:hidden absolute inset-x-0 bottom-0 h-[70vw] pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(13,22,40,1) 0%, rgba(13,22,40,0.55) 30%, rgba(13,22,40,0) 70%)' }}
          />
          <div className={`relative ${SECTION_X} pt-36 pb-[62vw] lg:pt-44 lg:pb-28`}>
            <div className="max-w-[1200px] mx-auto">
            <div className="max-w-[760px]">
              {/* Its own line: the eyebrow below is inline, so an inline-flex
                  link here ran straight into it. */}
              <Link to={hubPath(lang)} className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-stone-400 hover:text-white transition-colors mb-6">
                {t('verticals.shared.backToHub')}
              </Link>
              <span className="section-label section-label-dark">{t(`${base}.hero.eyebrow`)}</span>
              <h1 className="font-display font-light text-white text-balance m-0 leading-[1.06] text-[clamp(2.25rem,4.6vw,4rem)]">{t(`${base}.hero.title`)}</h1>
              <p className="mt-6 m-0 text-[17px] sm:text-[19px] leading-[1.55] text-stone-300 max-w-[620px]">{t(`${base}.hero.sub`)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/book-demo" onClick={() => cta('book_demo_hero')} className="inline-flex items-center gap-2.5 rounded-full bg-stone-50 hover:bg-white text-navy-950 text-base font-semibold px-[30px] py-4 transition-colors">
                  {t('verticals.shared.ctaPrimary')} <ArrowRight size={18} />
                </Link>
                <Link to="/contact" onClick={() => cta('contact_hero')} className="inline-flex items-center gap-2 rounded-full px-[26px] py-4 text-[15px] font-medium text-stone-50 border border-white/35 bg-white/[0.06] hover:border-white transition-colors">
                  {t('verticals.shared.ctaSecondary')}
                </Link>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* ── THE PROBLEM ── */}
        <section className={`py-20 lg:py-28 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-10 lg:mb-14">
              <span className="section-label section-label-light">{t(`${base}.problem.eyebrow`)}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t(`${base}.problem.title`)}</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {problems.map((p, i) => (
                <div key={p.title} className={`reveal reveal-delay-${i + 1} rounded-2xl border border-stone-200 bg-white p-7`}>
                  <h3 className="font-display font-medium text-[21px] text-navy-950 leading-tight m-0">{p.title}</h3>
                  <p className="mt-3 m-0 text-[15px] leading-[1.6] text-stone-600">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT YOU GET ── */}
        <section className={`py-20 lg:py-28 bg-white border-y border-stone-100 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-10 lg:mb-14">
              <span className="section-label section-label-light">{t(`${base}.offer.eyebrow`)}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t(`${base}.offer.title`)}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {offers.map((o, i) => (
                <div key={o.title} className={`reveal reveal-delay-${(i % 4) + 1} card-light p-8 flex flex-col gap-3`}>
                  <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center"><CheckCircle2 size={19} /></div>
                  <h3 className="font-display font-medium text-[23px] leading-[1.2] text-navy-950 m-0">{o.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-stone-600">{o.body}</p>
                  {o.href && (
                    <Link to={o.href} onClick={() => cta(`offer_${i}`)} className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors">
                      {o.cta} <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className={`py-20 lg:py-28 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-10 lg:mb-14">
              <span className="section-label section-label-light">{t(`${base}.how.eyebrow`)}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t(`${base}.how.title`)}</h2>
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

        {/* ── WHERE THIS IS GOING (employers only, for now) ── */}
        {hasNext && (
          <section className={`pb-20 lg:pb-28 ${SECTION_X}`}>
            <div className="max-w-[1200px] mx-auto reveal rounded-[28px] border border-stone-200 bg-white p-8 sm:p-10 lg:p-14">
              <div className="max-w-[720px]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 text-sage-700 border border-sage-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
                  <Sparkles size={12} /> {t(`${base}.next.badge`)}
                </span>
                <h2 className="mt-5 font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(1.875rem,3vw,2.75rem)]">{t(`${base}.next.title`)}</h2>
                <p className="mt-5 m-0 text-[15px] sm:text-base leading-[1.65] text-stone-600">{t(`${base}.next.body`)}</p>
              </div>
              <div className="mt-8 grid sm:grid-cols-2 gap-5">
                {nextItems.map(n => (
                  <div key={n.title} className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                    <h3 className="font-display font-medium text-[20px] text-navy-950 leading-tight m-0">{n.title}</h3>
                    <p className="mt-2.5 m-0 text-[15px] leading-[1.6] text-stone-600">{n.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 m-0 text-[13px] leading-[1.6] text-stone-500">{t(`${base}.next.note`)}</p>
            </div>
          </section>
        )}

        {/* ── FAQ ── */}
        <section className={`py-20 lg:py-28 bg-white border-y border-stone-100 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
            <div className="reveal">
              <span className="section-label section-label-light">{t(`${base}.faq.eyebrow`)}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2rem,3.2vw,2.875rem)]">{t(`${base}.faq.title`)}</h2>
            </div>
            <dl className="reveal reveal-delay-1 m-0 space-y-5">
              {faqs.map(f => (
                <div key={f.q} className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                  <dt className="font-display font-medium text-[19px] text-navy-950 leading-tight m-0">{f.q}</dt>
                  <dd className="mt-2.5 ml-0 m-0 text-[15px] leading-[1.65] text-stone-600">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── OTHER VERTICALS ── */}
        <section className={`py-16 lg:py-20 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto reveal">
            <h2 className="font-display font-light text-navy-950 m-0 leading-[1.1] text-[clamp(1.5rem,2.2vw,2rem)] mb-6">{t('verticals.shared.otherTitle')}</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {others.map(v => {
                const Icon = v.icon
                return (
                  <Link key={v.key} to={verticalPath(v, lang)} className="rounded-2xl border border-stone-200 bg-white px-6 py-5 flex items-center gap-3 no-underline hover:border-stone-300 hover:-translate-y-0.5 transition-[transform,border-color]">
                    <span className="w-9 h-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><Icon size={17} /></span>
                    <span className="text-[15px] font-semibold text-navy-950">{t(`nav.verticals.${v.key}`)}</span>
                    <ArrowRight size={15} className="ml-auto text-stone-400 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className={`relative py-24 lg:py-[120px] text-stone-50 overflow-hidden grain bg-gradient-to-br from-navy-950 to-navy-800 ${SECTION_X}`}>
          <div className="relative max-w-3xl mx-auto text-center reveal">
            <h2 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.6vw,3.375rem)]">{t(`${base}.final.title`)}</h2>
            <p className="mt-5 m-0 text-base leading-[1.6] text-stone-300 max-w-xl mx-auto">{t(`${base}.final.body`)}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/book-demo" onClick={() => cta('book_demo_final')} className="inline-flex items-center justify-center gap-2.5 rounded-full bg-stone-50 hover:bg-white text-navy-950 text-base font-semibold px-[30px] py-4 transition-colors">
                {t('verticals.shared.finalPrimary')} <ArrowRight size={18} />
              </Link>
              <a href="mailto:hello@everstead.care" onClick={() => cta('email_final')} className="inline-flex items-center justify-center gap-2 rounded-full px-[26px] py-4 text-[15px] font-medium text-stone-50 border border-white/35 bg-white/[0.06] hover:border-white transition-colors">
                {t('verticals.shared.finalSecondary')}
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
