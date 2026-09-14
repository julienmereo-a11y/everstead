// /professionals
//
// The hub the "For professionals" menu item points at: four audiences
// (advisers, solicitors or notaires, care providers, HR) with one card each,
// how a partnership works, the trust points every partner can repeat, and a
// demo CTA. /for-advisers stays as the adviser deep dive. Copy is written per
// country in professionals.json (France: CGP, notaires, EHPAD, DRH).
import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Briefcase, Building2, CheckCircle2, HeartHandshake, Scale, Users } from 'lucide-react'
import HreflangLinks from '../components/HreflangLinks'
import { useReveal } from '../components/useReveal'
import { trackEvent } from '../lib/analytics'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/professionals.json'
import frCopy from '../i18n/locales/fr/professionals.json'

i18n.addResourceBundle('en', 'professionals', enCopy)
i18n.addResourceBundle('fr', 'professionals', frCopy)

const SECTION_X = 'px-6 sm:px-8 lg:px-12'
const ICONS = { advisers: Briefcase, solicitors: Scale, care: HeartHandshake, hr: Building2 }

export default function Professionals() {
  const { t, i18n: inst } = useTranslation('professionals')
  const isFr = inst.language === 'fr'
  const pageUrl = `https://www.everstead.care${isFr ? '/fr' : ''}/professionals`
  const cta = (name) => trackEvent('cta_click', { location: 'professionals', cta: name })
  useReveal()

  const audiences = t('audiences.items', { returnObjects: true })
  const steps = t('how.steps', { returnObjects: true })
  const points = t('trust.points', { returnObjects: true })

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.description')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.jpg" />
      </Helmet>
      <HreflangLinks path="/professionals" />

      <div className="bg-stone-50">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden grain">
          <div className="absolute inset-0 aurora-bg" />
          <div className={`relative max-w-[1200px] mx-auto ${SECTION_X} pt-32 pb-20 lg:pt-40 lg:pb-28`}>
            <div className="max-w-[720px]">
              <span className="section-label section-label-dark">{t('hero.eyebrow')}</span>
              <h1 className="font-display font-light text-white text-balance m-0 leading-[1.06] text-[clamp(2.5rem,5vw,4.5rem)]">{t('hero.title')}</h1>
              <p className="mt-6 m-0 text-[17px] sm:text-[19px] leading-[1.55] text-stone-300 max-w-[600px]">{t('hero.sub')}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/book-demo" onClick={() => cta('book_demo_hero')} className="inline-flex items-center gap-2.5 rounded-full bg-stone-50 hover:bg-white text-navy-950 text-base font-semibold px-[30px] py-4 transition-colors">
                  {t('hero.ctaPrimary')} <ArrowRight size={18} />
                </Link>
                <Link to="/contact" onClick={() => cta('contact_hero')} className="inline-flex items-center gap-2 rounded-full px-[26px] py-4 text-[15px] font-medium text-stone-50 border border-white/35 bg-white/[0.06] hover:border-white transition-colors">
                  {t('hero.ctaSecondary')}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── AUDIENCES ── */}
        <section className={`py-20 lg:py-28 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-10 lg:mb-14">
              <span className="section-label section-label-light">{t('audiences.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t('audiences.title')}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {audiences.map((a, i) => {
                const Icon = ICONS[a.key] || Users
                return (
                  <div key={a.key} className={`reveal reveal-delay-${(i % 4) + 1} card-light p-8 flex flex-col gap-4 transition-[transform,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(13,22,40,0.2)]`}>
                    <div className="w-11 h-11 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center"><Icon size={20} /></div>
                    <h3 className="font-display font-medium text-[26px] leading-[1.2] text-navy-950 m-0">{a.title}</h3>
                    <p className="m-0 text-[15px] leading-[1.6] text-stone-600">{a.body}</p>
                    <Link to={a.href} onClick={() => cta(`audience_${a.key}`)} className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors">
                      {a.cta} <ArrowRight size={14} />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS WITH YOU ── */}
        <section className={`py-20 lg:py-28 bg-white border-y border-stone-100 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal max-w-[680px] mb-10 lg:mb-14">
              <span className="section-label section-label-light">{t('how.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t('how.title')}</h2>
            </div>
            <ol className="grid sm:grid-cols-3 gap-5 list-none m-0 p-0">
              {steps.map((s, i) => (
                <li key={s.title} className={`reveal reveal-delay-${i + 1} rounded-2xl border border-stone-200 bg-stone-50 p-7`}>
                  <span className="font-display text-[44px] leading-none font-light text-sage-500">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-4 mb-2 font-display font-medium text-[22px] text-navy-950 leading-tight">{s.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-stone-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── TRUST ── */}
        <section className={`py-20 lg:py-28 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-center">
            <div className="reveal">
              <span className="section-label section-label-light">{t('trust.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">{t('trust.title')}</h2>
              <Link to="/security" onClick={() => cta('security')} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors">
                {isFr ? 'Nos pratiques de sécurité' : 'Our security practices'} <ArrowRight size={15} />
              </Link>
            </div>
            <ul className="reveal reveal-delay-1 grid sm:grid-cols-2 gap-3 list-none m-0 p-0">
              {points.map(p => (
                <li key={p} className="rounded-[14px] border border-stone-200 bg-white px-[18px] py-4 flex items-start gap-3">
                  <CheckCircle2 size={17} className="text-sage-500 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-stone-900">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className={`relative py-24 lg:py-[120px] text-stone-50 overflow-hidden grain bg-gradient-to-br from-navy-950 to-navy-800 ${SECTION_X}`}>
          <div className="relative max-w-3xl mx-auto text-center reveal">
            <h2 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.6vw,3.375rem)]">{t('final.title')}</h2>
            <p className="mt-5 m-0 text-base leading-[1.6] text-stone-300 max-w-xl mx-auto">{t('final.body')}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/book-demo" onClick={() => cta('book_demo_final')} className="inline-flex items-center justify-center gap-2.5 rounded-full bg-stone-50 hover:bg-white text-navy-950 text-base font-semibold px-[30px] py-4 transition-colors">
                {t('final.ctaPrimary')} <ArrowRight size={18} />
              </Link>
              <a href="mailto:hello@everstead.care" onClick={() => cta('email_final')} className="inline-flex items-center justify-center gap-2 rounded-full px-[26px] py-4 text-[15px] font-medium text-stone-50 border border-white/35 bg-white/[0.06] hover:border-white transition-colors">
                {t('final.ctaSecondary')}
              </a>
            </div>
            <p className="mt-6 m-0 text-xs text-stone-400">{t('final.note')}</p>
          </div>
        </section>
      </div>
    </>
  )
}
