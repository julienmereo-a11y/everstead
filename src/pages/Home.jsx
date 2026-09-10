// The homepage, both languages (Homepage v2).
//
// An immersive felt-illustration hero, the film, three pillars, two navy
// product rows, security, a section for advisers and solicitors, and pricing.
//
// The film has a cut per language: MUX_FILMS picks the English or the French
// asset, and each page shows its own poster, copy and player.
//
// French is not a translation of the English. fr/home.json is written for
// France (assurance-vie, mandat de protection future, notaire) and the copy
// that survived the redesign was kept from the previous French page.
//
// House rule in both languages: no em or en dashes in customer-facing text.
//
import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HreflangLinks from '../components/HreflangLinks'
import StoreBadges from '../components/StoreBadges'
import { useReveal } from '../components/useReveal'
import { PRICING } from '../config/pricing'
import { trackEvent } from '../lib/analytics'
import { ArrowRight, Bell, CheckCircle2, EyeOff, Flag, KeyRound, Lock, Users } from 'lucide-react'

// One Mux asset per language. posterTime is the second the idle poster is
// taken from: a frame where the caption is complete or absent, not mid-animation.
const MUX_FILMS = {
  en: { id: 'S021WSE5yv396jSCaDQ01BufXsb2IdzD00eHs549Tkmk8g', posterTime: 2 },
  fr: { id: '8IiYAV012gsQ6x3ggl00TbZJu2aFwUA5m7i7Q1ss3RSDw', posterTime: 5 },
}
const SECTION_X = 'px-6 sm:px-8 lg:px-12'

// ── Film ─────────────────────────────────────────────────────────────────────
// Idle is a poster and a play button; the player is only mounted on click, so
// nothing from Mux loads for visitors who never press play.
function FilmSection({ t, film }) {
  const [playing, setPlaying] = useState(false)

  const play = () => {
    trackEvent('video_play', { location: 'home_film' })
    setPlaying(true)
  }

  return (
    <section className={`pt-24 lg:pt-28 bg-stone-50 ${SECTION_X}`}>
      <div className="max-w-[880px] mx-auto flex flex-col items-center gap-10">
        <h2 className="reveal font-display font-light text-navy-950 text-center text-balance leading-[1.1] text-[clamp(2.125rem,3.6vw,3.375rem)]">
          {t('film.title')}
        </h2>

        <div className="reveal w-full relative aspect-video rounded-[28px] overflow-hidden bg-navy-950 shadow-[0_48px_90px_-30px_rgba(13,22,40,0.45)]">
          {playing ? (
            <iframe
              src={`https://player.mux.com/${film.id}?autoplay=true&accent-color=%232d5082&primary-color=%23fafaf9`}
              title={t('film.posterTitle')}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0 bg-navy-950"
            />
          ) : (
            <>
              <button
                type="button"
                onClick={play}
                aria-label={t('film.playAria')}
                className="absolute inset-0 w-full h-full cursor-pointer bg-transparent border-0 p-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage-300"
              />
              <img
                src={`https://image.mux.com/${film.id}/thumbnail.jpg?time=${film.posterTime}&width=1600`}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(180deg, rgba(13,22,40,0.05) 40%, rgba(13,22,40,0.7) 100%)' }}
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-full bg-stone-50/90 flex items-center justify-center shadow-[0_20px_40px_rgba(13,22,40,0.35)] pointer-events-none transition-transform duration-200 group-hover:scale-105">
                <span
                  className="ml-1.5 block w-0 h-0"
                  style={{ borderStyle: 'solid', borderWidth: '14px 0 14px 24px', borderColor: 'transparent transparent transparent #0d1628' }}
                />
              </div>
              <div className="absolute left-5 right-5 sm:left-7 sm:right-7 bottom-5 sm:bottom-6 flex items-end justify-between gap-4 text-stone-50 pointer-events-none">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-sage-300 font-semibold">{t('film.posterEyebrow')}</div>
                  <div className="font-display text-xl sm:text-2xl mt-1">{t('film.posterTitle')}</div>
                </div>
                <span className="shrink-0 text-[13px] px-2.5 py-1 rounded-full bg-stone-50/[0.14] border border-stone-50/25">
                  {t('film.duration')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  useReveal()
  const { t, i18n } = useTranslation('home')
  const isFr = i18n.language === 'fr'
  // /fr canonicalises to the /fr tree; English stays at the root. <Link> needs
  // no prefix: the router runs with a /fr basename and resolves it itself.
  const urlPrefix = isFr ? '/fr' : ''
  // Screenshots have their UI text baked in, so French needs its own files.
  const shot = (name) => (isFr ? `/${name}-fr.jpg` : `/${name}.jpg`)
  const [annualPricing, setAnnualPricing] = useState(true)

  const pillars = [
    { key: 'accounts',  to: '/features' },
    { key: 'documents', to: '/security' },
    { key: 'people',    to: '/how-it-works' },
  ]

  const productRows = [
    { key: 'current', image: shot('screenshot-doc'),    imageFirst: false },
    { key: 'share',   image: shot('screenshot-access'), imageFirst: true },
  ]

  const securityIcons = [Lock, KeyRound, EyeOff, Users, Bell, Flag]
  const securityFeatures = t('security.features', { returnObjects: true }).map((label, i) => ({
    label,
    icon: securityIcons[i] ?? Lock,
  }))

  const proCards = [
    { key: 'advisers',   to: '/for-advisers' },
    { key: 'solicitors', to: '/book-demo' },
  ]

  // Prices stay config-driven; the copy only carries the {{price}} slot.
  const plans = [
    {
      id: 'free',
      isFree: true,
      name: t('pricing.plans.free.name'),
      priceLabel: t('pricing.plans.free.priceLabel'),
      priceSub: t('pricing.plans.free.priceSub'),
      desc: t('pricing.plans.free.desc'),
      features: t('pricing.plans.free.features', { returnObjects: true }),
      cta: t('pricing.plans.free.cta'),
      highlight: false,
    },
    {
      id: 'family',
      name: t('pricing.plans.family.name'),
      monthly: t('pricing.plans.family.priceMonthly', { price: PRICING.family.monthly.perMonth }),
      annual: t('pricing.plans.family.priceAnnual', { price: PRICING.family.annual.perMonth }),
      desc: t('pricing.plans.family.desc'),
      features: t('pricing.plans.family.features', { returnObjects: true }),
      cta: t('pricing.plans.family.cta'),
      highlight: true,
    },
  ]

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={`https://www.everstead.care${urlPrefix}`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.ogTitle')} />
        <meta property="og:description" content={t('meta.ogDescription')} />
        <meta property="og:url" content={`https://www.everstead.care${urlPrefix}`} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Everstead',
          alternateName: 'Everstead Digital',
          url: 'https://www.everstead.care',
          logo: { '@type': 'ImageObject', url: 'https://www.everstead.care/logo-v2-white.png', width: 320, height: 80 },
          description: t('meta.jsonLdDescription'),
          foundingDate: '2025',
          areaServed: isFr ? 'FR' : 'GB',
          address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' },
          contactPoint: [
            { '@type': 'ContactPoint', email: 'support@everstead.care', contactType: 'customer support', areaServed: 'GB', availableLanguage: isFr ? 'French' : 'English' },
            { '@type': 'ContactPoint', email: 'hello@everstead.care', contactType: 'sales', areaServed: 'GB', availableLanguage: isFr ? 'French' : 'English' },
          ],
          sameAs: ['https://www.everstead.care'],
        })}</script>
      </Helmet>
      <HreflangLinks path="/" />

      <div className="bg-stone-50">

        {/* ── HERO ─────────────────────────────────────────────────
            Felt illustration, two veils and grain, with the trust strip
            pinned to the bottom edge. The site nav sits over this hero
            (Nav.jsx keeps it transparent until you scroll past). */}
        <section
          className="relative flex flex-col bg-navy-950 grain overflow-hidden"
          style={{ minHeight: '100svh' }}
        >
          <img
            src="/hero-felt-family-mobile.jpg"
            alt=""
            aria-hidden="true"
            fetchpriority="high"
            className="sm:hidden absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '50% 0' }}
          />
          <img
            src="/hero-felt-family.jpg"
            alt=""
            aria-hidden="true"
            fetchpriority="high"
            /* No zoom: the handoff scaled the art 1.14x to crop the editor toolbar
               off the screenshot it was drawn from. The illustration is now a clean
               full-frame export, and scaling it only cut the keepsake box and its
               bow, which are the point of the picture. */
            className="hidden sm:block absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '70% 0' }}
          />

          {/* Veils. Landscape reads left to right, so the copy sits on the dark
              side; the portrait crop is centred, so phones get a vertical veil. */}
          <div
            className="hidden sm:block absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, rgba(13,22,40,0.92) 0%, rgba(13,22,40,0.78) 38%, rgba(13,22,40,0.25) 70%, rgba(13,22,40,0.15) 100%)' }}
          />
          <div
            className="sm:hidden absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(13,22,40,0.74) 0%, rgba(13,22,40,0.5) 24%, rgba(13,22,40,0.82) 56%, rgba(13,22,40,0.95) 100%)' }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(13,22,40,0.55) 0%, transparent 25%, transparent 70%, rgba(13,22,40,0.85) 100%)' }}
          />

          <div className={`relative flex-1 w-full max-w-[1360px] mx-auto ${SECTION_X} pt-[104px] lg:pt-24 pb-16 lg:pb-20 grid lg:grid-cols-2 items-end lg:items-center`}>
            <div className="max-w-[600px] animate-fade-up">
              <h1 className="font-display font-light text-stone-50 text-balance m-0 tracking-[-0.01em] leading-[1.06] text-[clamp(2.5rem,5.4vw,4.875rem)]">
                {t('hero.title1')}<em className="italic text-sage-300">{t('hero.titleEm')}</em>{t('hero.title2')}
              </h1>
              <p className="mt-6 lg:mt-7 text-[17px] sm:text-[19px] leading-[1.55] text-stone-300 max-w-[480px]">
                {t('hero.subtitle')}
              </p>

              <div className="mt-8 lg:mt-9 flex flex-wrap gap-3">
                <Link
                  to="/get-started"
                  onClick={() => trackEvent('cta_click', { location: 'home_hero', cta: 'get_started' })}
                  className="inline-flex items-center gap-2.5 rounded-full bg-navy-600 hover:bg-navy-500 text-white text-base font-semibold px-[30px] py-4 transition-colors"
                >
                  {t('hero.ctaPrimary')} <ArrowRight size={18} />
                </Link>
                <Link
                  to="/how-it-works"
                  onClick={() => trackEvent('cta_click', { location: 'home_hero', cta: 'how_it_works' })}
                  className="inline-flex items-center gap-2 rounded-full px-[26px] py-4 text-[15px] font-medium text-stone-50 border border-white/35 bg-white/[0.06] hover:border-white transition-colors"
                >
                  {t('hero.ctaSecondary')}
                </Link>
              </div>

              <div className="mt-8 lg:mt-[34px] flex flex-wrap gap-x-[22px] gap-y-2 text-[13px] text-navy-200">
                <span className="flex items-center gap-[7px]"><Lock size={14} className="shrink-0" />{t('hero.trustEncryption')}</span>
                <span>{t('hero.trustUk')}</span>
                <a
                  href="https://www.trustpilot.com/review/everstead.care"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('hero.trustpilotAria')}
                  className="hover:text-stone-100 transition-colors"
                >
                  {t('hero.trustpilotPre')} <strong className="text-sage-300 font-semibold">{t('hero.trustpilotExcellent')}</strong> {t('hero.trustpilotPost')}
                </a>
              </div>

              <StoreBadges className="mt-7 lg:mt-8" location="home_hero" />
            </div>
            <div aria-hidden="true" />
          </div>

        </section>

        {/* ── FILM (one cut per language) ── */}
        <FilmSection t={t} film={isFr ? MUX_FILMS.fr : MUX_FILMS.en} />

        {/* ── WHY EVERSTEAD ────────────────────────────────────────── */}
        <section className={`py-24 lg:py-[120px] bg-stone-50 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal grid lg:grid-cols-2 gap-8 lg:gap-12 items-end mb-12 lg:mb-16">
              <div>
                <span className="section-label section-label-light">{t('why.eyebrow')}</span>
                <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.25rem,3.6vw,3.375rem)]">
                  {t('why.title')}
                </h2>
              </div>
              <p className="m-0 text-[17px] leading-[1.6] text-stone-600 max-w-[460px]">{t('why.intro')}</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pillars.map(({ key, to }, i) => (
                <div
                  key={key}
                  className={`reveal reveal-delay-${i + 1} card-light p-8 lg:px-8 lg:py-9 flex flex-col gap-[18px] transition-[transform,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(13,22,40,0.2)]`}
                >
                  <span className="font-display text-[44px] leading-none font-light text-sage-500">{t(`why.cards.${key}.num`)}</span>
                  <h3 className="font-display font-medium text-[26px] text-navy-950 m-0">{t(`why.cards.${key}.title`)}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-stone-600">{t(`why.cards.${key}.desc`)}</p>
                  <Link to={to} className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors">
                    {t(`why.cards.${key}.cta`)} <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT ROWS ─────────────────────────────────────────── */}
        <section className={`relative py-24 lg:py-[120px] text-stone-50 overflow-hidden grain bg-gradient-to-br from-navy-950 to-navy-800 ${SECTION_X}`}>
          <div className="relative max-w-[1200px] mx-auto flex flex-col gap-24 lg:gap-[120px]">
            {productRows.map(({ key, image, imageFirst }) => (
              <div key={key} className="reveal grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div className={imageFirst ? 'lg:order-2' : undefined}>
                  <span className="section-label section-label-dark">{t(`rows.${key}.eyebrow`)}</span>
                  <h2 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.2vw,3rem)]">
                    {t(`rows.${key}.title`)}
                  </h2>
                  <p className="mt-5 m-0 text-base leading-[1.6] text-stone-300 max-w-[440px]">{t(`rows.${key}.desc`)}</p>
                  <ul className="mt-7 flex flex-col gap-3 list-none p-0">
                    {t(`rows.${key}.bullets`, { returnObjects: true }).map(bullet => (
                      <li key={bullet} className="flex gap-3 items-start text-[15px] text-stone-200">
                        <CheckCircle2 size={18} className="text-sage-300 shrink-0 mt-0.5" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
                <img
                  src={image}
                  alt={t(`rows.${key}.imageAlt`)}
                  width="944"
                  height="780"
                  loading="lazy"
                  className={`w-full h-auto rounded-3xl border border-white/[0.12] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] ${imageFirst ? 'lg:order-1' : ''}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── SECURITY ─────────────────────────────────────────────── */}
        <section className={`py-24 lg:py-[120px] bg-white border-y border-stone-200 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="reveal">
              <span className="section-label section-label-light">{t('security.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">
                {t('security.title')}
              </h2>
              <p className="mt-5 m-0 text-[17px] leading-[1.6] text-stone-600 max-w-[460px]">{t('security.desc')}</p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <Link to="/security" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors">
                  {t('security.linkPractices')} <ArrowRight size={15} />
                </Link>
                <Link to="/privacy" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors">
                  {t('security.linkPrivacy')} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <div className="reveal reveal-delay-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {securityFeatures.map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-[14px] border border-stone-200 bg-stone-50 px-[18px] py-4 flex items-center gap-3">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-navy-100 text-navy-700 flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-stone-900">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOR ADVISERS & SOLICITORS ────────────────────────────── */}
        <section className={`py-24 lg:py-[120px] bg-stone-50 ${SECTION_X}`}>
          <div className="max-w-[1200px] mx-auto">
            <div className="reveal text-center max-w-[680px] mx-auto mb-12 lg:mb-14">
              <span className="section-label section-label-light">{t('pros.eyebrow')}</span>
              <h2 className="font-display font-light text-navy-950 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">
                {t('pros.title')}
              </h2>
              <p className="mt-5 m-0 text-[17px] leading-[1.6] text-stone-600">{t('pros.intro')}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {proCards.map(({ key, to }, i) => (
                <div
                  key={key}
                  className={`reveal reveal-delay-${i + 1} card-light p-8 lg:px-8 lg:py-9 flex flex-col gap-4 transition-[transform,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgba(13,22,40,0.2)]`}
                >
                  <span className="section-label section-label-light !mb-0">{t(`pros.cards.${key}.eyebrow`)}</span>
                  <h3 className="font-display font-medium text-[26px] text-navy-950 m-0 leading-[1.2]">{t(`pros.cards.${key}.title`)}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-stone-600">{t(`pros.cards.${key}.desc`)}</p>
                  <Link
                    to={to}
                    onClick={() => trackEvent('cta_click', { location: 'home_pros', cta: key })}
                    className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-800 transition-colors"
                  >
                    {t(`pros.cards.${key}.cta`)} <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────── */}
        <section className={`relative py-24 lg:py-[120px] text-stone-50 overflow-hidden grain bg-gradient-to-br from-navy-950 to-navy-800 ${SECTION_X}`}>
          <div className="relative max-w-[960px] mx-auto">
            <div className="reveal text-center mb-12 lg:mb-14">
              <span className="section-label section-label-dark">{t('pricing.eyebrow')}</span>
              <h2 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(2.125rem,3.4vw,3.125rem)]">
                {t('pricing.title')}
              </h2>
              <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.08] border border-white/[0.14]">
                <button
                  onClick={() => setAnnualPricing(false)}
                  className={`px-[18px] py-2 rounded-full text-sm font-semibold transition-colors ${!annualPricing ? 'bg-stone-50 text-navy-950' : 'text-navy-200 hover:text-stone-50'}`}
                >
                  {t('pricing.monthly')}
                </button>
                <button
                  onClick={() => setAnnualPricing(true)}
                  className={`px-[18px] py-2 rounded-full text-sm font-semibold transition-colors ${annualPricing ? 'bg-stone-50 text-navy-950' : 'text-navy-200 hover:text-stone-50'}`}
                >
                  {t('pricing.yearly')} <span className={annualPricing ? 'text-sage-600' : 'text-sage-300'}>{t('pricing.save')}</span>
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {plans.map(({ id, isFree, name, monthly, annual, priceLabel, priceSub, desc, features, cta, highlight }, i) => (
                <div
                  key={id}
                  className={`reveal reveal-delay-${i + 1} p-8 flex flex-col ${
                    highlight
                      ? 'bg-stone-50 text-navy-950 rounded-2xl shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]'
                      : 'card-dark'
                  }`}
                >
                  {highlight && (
                    <span className="self-start mb-4 bg-sage-500 text-white text-[11px] font-bold rounded-full px-2.5 py-1">
                      {t('pricing.badgePopular')}
                    </span>
                  )}
                  <h3 className={`text-lg font-semibold m-0 ${highlight ? 'text-navy-950' : 'text-stone-50'}`}>{name}</h3>
                  <p className={`mt-1 mb-5 text-sm ${highlight ? 'text-stone-500' : 'text-stone-400'}`}>{desc}</p>
                  <div className="flex items-end gap-1">
                    <span className={`font-display text-5xl font-light ${highlight ? 'text-navy-950' : 'text-stone-50'}`}>
                      {isFree ? priceLabel : (annualPricing ? annual : monthly)}
                    </span>
                    {!isFree && (
                      <span className={`mb-2 text-sm ${highlight ? 'text-stone-400' : 'text-stone-400'}`}>
                        {annualPricing ? t('pricing.suffixAnnual') : t('pricing.suffixMonthly')}
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 mb-6 text-xs ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>
                    {isFree ? priceSub : (annualPricing ? t('pricing.billedAnnually') : t('pricing.billedMonthly'))}
                  </p>
                  <ul className="flex flex-col gap-2.5 mb-8 list-none p-0">
                    {features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${highlight ? 'text-sage-500' : 'text-sage-300'}`} />
                        <span className={highlight ? 'text-stone-700' : 'text-stone-200'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={isFree ? '/get-started?plan=free' : `/get-started?plan=${id}&billing=${annualPricing ? 'yearly' : 'monthly'}`}
                    onClick={() => trackEvent('cta_click', { location: 'home_pricing', cta: id })}
                    className={`mt-auto block text-center py-3 px-5 rounded-full text-sm font-semibold transition-colors ${
                      highlight
                        ? 'bg-navy-600 hover:bg-navy-700 text-white'
                        : 'border border-white/25 text-stone-50 hover:bg-white/10'
                    }`}
                  >
                    {cta}
                  </Link>
                </div>
              ))}
            </div>

            {/* Everstead Pro sits on its own band, never as a third column */}
            <div className="reveal card-dark mt-5 px-7 py-[22px] flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-stone-50 m-0">{t('pricing.plans.advisor.name')}</h3>
                <p className="mt-1 m-0 text-sm text-stone-400">{t('pricing.plans.advisor.desc')}</p>
              </div>
              <Link
                to="/book-demo"
                onClick={() => trackEvent('cta_click', { location: 'home_pricing', cta: 'advisor' })}
                className="shrink-0 inline-flex items-center gap-1.5 justify-center rounded-full border border-white/25 text-stone-50 hover:bg-white/10 text-sm font-semibold px-5 py-2.5 transition-colors"
              >
                {t('pricing.plans.advisor.cta')} <ArrowRight size={14} />
              </Link>
            </div>

            <p className="reveal text-center mt-8 text-xs text-stone-400">
              {t('pricing.trialNote')}{' '}
              <Link to="/pricing" className="text-stone-300 hover:text-stone-50 underline underline-offset-2 transition-colors">
                {t('pricing.fullDetails')}
              </Link>
            </p>
          </div>
        </section>

      </div>
    </>
  )
}
