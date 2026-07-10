import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import { PRICING } from '../config/pricing'
import {
  ShieldCheck, Lock, Users, FileText, CheckCircle2, ArrowRight,
  ChevronDown, Bell, Share2, BookOpen, Heart,
  UserCircle, Sparkles, UserCheck, MapPin, BadgeCheck, Landmark
} from 'lucide-react'

const painPoints = [
  'Families don\'t know where documents are',
  'Accounts and subscriptions are hard to find',
  'Executors lose time chasing details',
  'Wishes are unclear or unrecorded',
  'Digital assets become inaccessible',
]

function AnimatedHeroScore({ target = 76, duration = 1500 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])

  const r = 22
  const circ = 2 * Math.PI * r

  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <p className="text-xs text-stone-400 font-medium">Plan readiness</p>
        <p className="text-2xl font-semibold text-white mt-0.5">{count}%</p>
      </div>
      <div className="w-14 h-14 relative">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
          <circle
            cx="28" cy="28" r={r} fill="none" stroke="#6ea6d8" strokeWidth="5"
            strokeDasharray={`${circ * count / 100} ${circ * (1 - count / 100)}`}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

export default function Home() {
  useReveal()
  const { t, i18n } = useTranslation('home')
  const [annualPricing, setAnnualPricing] = useState(true)

  // /fr pages canonicalise to the /fr URL tree; English stays at the root.
  const urlPrefix = i18n.language === 'fr' ? '/fr' : ''

  const trustItems = [
    { icon: Lock,       label: t('trustBar.security.label'),  sub: t('trustBar.security.sub') },
    { icon: UserCheck,  label: t('trustBar.access.label'),    sub: t('trustBar.access.sub') },
    { icon: MapPin,     label: t('trustBar.residency.label'), sub: t('trustBar.residency.sub') },
    { icon: BadgeCheck, label: t('trustBar.soc2.label'),      sub: t('trustBar.soc2.sub') },
  ]

  // "Why Everstead" — three calm pillars (replaces the old six-card feature grid).
  const whyEverstead = [
    {
      icon: Landmark,
      title: t('why.cards.accounts.title'),
      desc: t('why.cards.accounts.desc'),
      cta: t('why.cards.accounts.cta'),
      to: '/features',
    },
    {
      icon: FileText,
      title: t('why.cards.documents.title'),
      desc: t('why.cards.documents.desc'),
      cta: t('why.cards.documents.cta'),
      to: '/security',
    },
    {
      icon: Users,
      title: t('why.cards.people.title'),
      desc: t('why.cards.people.desc'),
      cta: t('why.cards.people.cta'),
      to: '/how-it-works',
    },
  ]

  const stepNums = ['01', '02', '03']
  const steps = t('steps.items', { returnObjects: true }).map((step, i) => ({ num: stepNums[i], ...step }))

  const securityIcons = [Lock, Users, BookOpen, Share2, Bell, ShieldCheck]
  const securityFeatures = t('security.features', { returnObjects: true }).map((label, i) => ({
    icon: securityIcons[i],
    label,
  }))

  // English prices stay config-driven (the {{price}} interpolation in en/home.json);
  // French prices are static, VAT-inclusive display strings baked into fr/home.json.
  // Consumer preview shows the two self-serve plans (Free + Everstead+). Everstead Pro
  // (the professional/adviser plan) is presented on its own band below, never as a
  // third column — it's sold via demo, not self-serve checkout.
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
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.everstead.care/logo-v2-white.png',
          width: 320,
          height: 80,
        },
        description: t('meta.jsonLdDescription'),
        foundingDate: '2025',
        areaServed: 'GB',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'London',
          addressCountry: 'GB',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            email: 'support@everstead.care',
            contactType: 'customer support',
            areaServed: 'GB',
            availableLanguage: 'English',
          },
          {
            '@type': 'ContactPoint',
            email: 'hello@everstead.care',
            contactType: 'sales',
            areaServed: 'GB',
            availableLanguage: 'English',
          },
        ],
        sameAs: [
          'https://www.everstead.care',
        ],
      })}</script>
    </Helmet>
    <div className="bg-stone-50">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      {/* Full-bleed photo/video hero: media layer → veil → vignette → grain → content.
          Content is bottom-anchored (not centred) so the layout reads as a calm,
          photographic "big lower-left headline" hero rather than a text-on-gradient one. */}
      <section className="relative min-h-screen flex flex-col justify-end overflow-hidden bg-navy-950 grain">

        {/* Media — poster photo, with the looping video layered on top (desktop only,
            to avoid forcing a ~38MB autoplay download on mobile connections) */}
        <img
          src="/hero-living-room.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 60%' }}
        />
        <video
          className="hidden lg:block absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 60%' }}
          src="/videohero.mp4"
          poster="/hero-living-room.png"
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Veil — darkens the media while keeping its warmth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(200deg, rgba(11,18,32,0.38) 0%, rgba(11,18,32,0.62) 46%, rgba(9,14,26,0.9) 100%)' }}
        />
        {/* Vignette — anchors the headline corner */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(120% 90% at 30% 88%, rgba(6,10,20,0.55) 0%, transparent 55%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full pt-40 pb-12 sm:pb-16 lg:pb-[4.5rem]">
          <div className="max-w-[46rem]">
            <h1 className="font-display text-[2.75rem] leading-[1.18] sm:text-6xl sm:leading-[1.14] lg:text-7xl lg:leading-[1.12] xl:text-[5rem] xl:leading-[1.1] font-light text-white text-balance animate-fade-up">
              {t('hero.title1')}<em className="not-italic text-sage-300">{t('hero.titleEm')}</em>{t('hero.title2')}
            </h1>

            {/* Hairline rule */}
            <div className="mt-8 sm:mt-10 h-px w-full max-w-[28rem]" style={{ background: 'rgba(255,255,255,0.28)' }} />

            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3.5 animate-fade-up animate-delay-100">
              <Link
                to="/get-started"
                className="btn-aurora inline-flex items-center gap-2 font-semibold text-base px-8 py-4 rounded-full transition-transform hover:-translate-y-0.5"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/how-it-works"
                className="group inline-flex items-center gap-1.5 text-stone-100 font-medium text-[0.95rem] px-6 py-4 rounded-full border transition-colors hover:border-white"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.35)' }}
              >
                {t('hero.ctaSecondary')}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <p className="mt-6 text-[0.95rem] text-stone-200 animate-fade-up animate-delay-200">
              {t('hero.eyebrow')}
            </p>

            <p className="text-xs text-stone-300 mt-3 animate-fade-up animate-delay-200" style={{ letterSpacing: '0.02em' }}>
              🔒 {t('hero.trustEncryption')} &nbsp;·&nbsp; 🇬🇧 {t('hero.trustUk')} &nbsp;·&nbsp;{' '}
              <a
                href="https://www.trustpilot.com/review/everstead.care"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-300 hover:text-white transition-colors"
                aria-label={t('hero.trustpilotAria')}
              >
                {t('hero.trustpilotPre')} <span className="font-medium text-[#00b67a]">{t('hero.trustpilotExcellent')}</span> {t('hero.trustpilotPost')}
              </a>
            </p>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative self-center mb-6 flex flex-col items-center gap-1 text-stone-300 animate-bounce">
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone-100 py-8 lg:py-9">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7">
            {trustItems.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage-50 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-sage-600" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900 leading-snug">{label}</p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-snug">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY EVERSTEAD ────────────────────────────────────────── */}
      <section className="pt-20 pb-24 lg:pt-28 lg:pb-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('why.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white max-w-2xl mx-auto leading-tight text-balance">
              {t('why.title1')}<br className="hidden sm:block" /> {t('why.title2')}
            </h2>
            <p className="mt-5 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto">
              {t('why.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyEverstead.map(({ icon: Icon, title, desc, cta, to }, i) => (
              <div
                key={title}
                className={`reveal reveal-delay-${i + 1} bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/8 transition-colors flex flex-col`}
              >
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <Icon size={22} className="text-sage-300" />
                </div>
                <h3 className="font-display text-2xl font-light text-white mb-3">{title}</h3>
                <p className="text-stone-300 text-[15px] leading-relaxed mb-6">{desc}</p>
                <Link
                  to={to}
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-sage-300 hover:text-sage-200 transition-colors"
                >
                  {cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>

          {/* Row: Up to date, without the chore */}
          <div className="mt-24 lg:mt-32 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center reveal">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('rows.current.eyebrow')}</p>
              <h3 className="font-display text-3xl lg:text-4xl font-light text-white leading-tight text-balance">
                {t('rows.current.title')}
              </h3>
              <p className="mt-5 text-stone-300 leading-relaxed max-w-md">
                {t('rows.current.desc')}
              </p>
              <ul className="mt-6 space-y-3">
                {t('rows.current.bullets', { returnObjects: true }).map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-stone-200 text-sm">
                    <CheckCircle2 size={16} className="text-sage-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <img
              src="/screenshot-doc.jpg"
              alt={t('rows.current.imageAlt')}
              width="944" height="780"
              loading="lazy"
              className="w-full h-auto rounded-3xl border border-white/10"
              style={{ boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)' }}
            />
          </div>

          {/* Row: Share exactly what you choose (image left on desktop) */}
          <div className="mt-20 lg:mt-28 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center reveal">
            <img
              src="/screenshot-access.jpg"
              alt={t('rows.share.imageAlt')}
              width="944" height="780"
              loading="lazy"
              className="w-full h-auto rounded-3xl border border-white/10 order-last lg:order-first"
              style={{ boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)' }}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('rows.share.eyebrow')}</p>
              <h3 className="font-display text-3xl lg:text-4xl font-light text-white leading-tight text-balance">
                {t('rows.share.title')}
              </h3>
              <p className="mt-5 text-stone-300 leading-relaxed max-w-md">
                {t('rows.share.desc')}
              </p>
              <ul className="mt-6 space-y-3">
                {t('rows.share.bullets', { returnObjects: true }).map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-stone-200 text-sm">
                    <CheckCircle2 size={16} className="text-sage-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('steps.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              {t('steps.title')}
            </h2>
            <p className="mt-4 text-stone-500 text-lg leading-relaxed max-w-xl mx-auto">
              {t('steps.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 border-t border-stone-200 divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className={`reveal reveal-delay-${i + 1} pt-8 pb-4 sm:px-8 sm:first:pl-0 sm:last:pr-0`}>
                <p className="font-display text-4xl font-light text-sage-700 mb-3">{num}</p>
                <h3 className="font-display text-xl text-navy-950 mb-2">{title}</h3>
                <p className="text-stone-500 text-[15px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center reveal">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors"
            >
              {t('steps.link')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── REASSURANCE ──────────────────────────────────────────── */}
      <section className="py-14 lg:py-16 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1.35fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="reveal">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 mb-5">
              <Heart size={20} className="text-sage-400" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance leading-tight">
              {t('reassurance.title')}
            </h2>
            <p className="mt-6 text-stone-300 text-lg leading-relaxed">
              {t('reassurance.desc')}
            </p>
          </div>
          <div className="reveal reveal-delay-1 max-w-[300px] lg:max-w-[320px] mx-auto lg:ml-auto lg:mr-0">
            <img
              src="/hero-app-3.jpg"
              alt={t('reassurance.imageAlt')}
              width="512" height="640"
              loading="lazy"
              className="w-full h-auto rounded-3xl"
              style={{ boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)' }}
            />
          </div>
        </div>
      </section>

      {/* ── SECURITY ─────────────────────────────────────────────── */}
      <section className="pt-24 pb-14 lg:pt-32 lg:pb-16 bg-stone-50 border-y border-stone-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
            <div className="reveal">
              <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('security.eyebrow')}</p>
              {/* A/B alternates to try later:
                // "Bank-grade security. Total control. Always yours."
                // "Protected to the highest standards — and only ever yours."
              */}
              <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance leading-tight">
                {t('security.title')}
              </h2>
              <p className="mt-5 text-stone-600 leading-relaxed">
                {t('security.desc')}
              </p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <Link to="/security" className="inline-flex items-center gap-2 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors">
                  {t('security.linkPractices')} <ArrowRight size={15} />
                </Link>
                <Link to="/privacy" className="inline-flex items-center gap-2 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors">
                  {t('security.linkPrivacy')} <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <div className="reveal reveal-delay-1 grid grid-cols-2 gap-4">
              {securityFeatures.map(({ icon: Icon, label }) => (
                <div key={label} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-stone-200">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-navy-700" />
                  </div>
                  <span className="text-sm font-medium text-stone-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('pricing.eyebrow')}</p>
            <h2 className="font-display text-4xl font-light text-white text-balance">{t('pricing.title')}</h2>
            <p className="mt-3 text-stone-400 text-sm">{t('pricing.subtitle')}</p>
            <div className="mt-8 inline-flex items-center gap-4 bg-white/10 border border-white/20 rounded-full p-1">
              <button
                onClick={() => setAnnualPricing(false)}
                className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${!annualPricing ? 'bg-white text-navy-900' : 'text-stone-300 hover:text-white'}`}
              >
                {t('pricing.monthly')}
              </button>
              <button
                onClick={() => setAnnualPricing(true)}
                className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${annualPricing ? 'bg-white text-navy-900' : 'text-stone-300 hover:text-white'}`}
              >
                {t('pricing.yearly')} <span className="text-sage-500 font-semibold ml-1">{t('pricing.save')}</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {plans.map(({ id, isFree, name, monthly, annual, priceLabel, priceSub, desc, features, cta, highlight }, i) => (
              <div
                key={name}
                className={`reveal reveal-delay-${i + 1} rounded-2xl p-7 border ${
                  highlight
                    ? 'bg-white text-navy-950 border-transparent shadow-2xl'
                    : 'bg-white/5 text-stone-300 border-white/10'
                }`}
              >
                {highlight && (
                  <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <span className="inline-block bg-sage-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">{t('pricing.badgePopular')}</span>
                  </div>
                )}
                <h3 className={`font-semibold text-lg mb-1 ${highlight ? 'text-navy-900' : 'text-white'}`}>{name}</h3>
                <p className={`text-sm mb-5 ${highlight ? 'text-stone-500' : 'text-stone-400'}`}>{desc}</p>
                {isFree ? (
                  <>
                    <div className="flex items-end gap-1 mb-6">
                      <span className={`font-display text-4xl font-light ${highlight ? 'text-navy-950' : 'text-white'}`}>{priceLabel}</span>
                    </div>
                    <p className={`text-xs mb-4 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>{priceSub}</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-end gap-1 mb-6">
                      <span className={`font-display text-4xl font-light ${highlight ? 'text-navy-950' : 'text-white'}`}>{annualPricing ? annual : monthly}</span>
                      <span className={`text-sm mb-1.5 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>{annualPricing ? t('pricing.suffixAnnual') : t('pricing.suffixMonthly')}</span>
                    </div>
                    <p className={`text-xs mb-4 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>{annualPricing ? t('pricing.billedAnnually') : t('pricing.billedMonthly')}</p>
                  </>
                )}
                <ul className="space-y-2.5 mb-8">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className={`mt-0.5 flex-shrink-0 ${highlight ? 'text-sage-600' : 'text-sage-500'}`} />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={isFree ? '/get-started?plan=free' : `/get-started?plan=${id}&billing=${annualPricing ? 'yearly' : 'monthly'}`}
                  className={`block text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-colors ${
                    highlight
                      ? 'btn-aurora'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Everstead Pro — the professional plan, presented on its own band (never a third column) */}
          <div className="reveal mt-6 max-w-4xl mx-auto rounded-2xl border border-white/10 bg-white/5 px-7 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-white text-base mb-1">{t('pricing.plans.advisor.name')}</h3>
              <p className="text-sm text-stone-400">{t('pricing.plans.advisor.desc')}</p>
            </div>
            <Link to="/book-demo" className="shrink-0 inline-block text-center py-2.5 px-5 rounded-full text-sm font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors">
              {t('pricing.plans.advisor.cta')} <ArrowRight size={13} className="inline ml-1" />
            </Link>
          </div>

          <p className="text-center mt-8 text-stone-500 text-xs reveal">
            {t('pricing.trialNote')}{' '}
            <Link to="/pricing" className="text-stone-400 hover:text-white underline underline-offset-2 transition-colors">{t('pricing.fullDetails')}</Link>
          </p>
        </div>
      </section>

      {/* ── Gift strip ─────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-stone-50 border-y border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="reveal grid md:grid-cols-[auto_1fr_auto] items-center gap-6 rounded-3xl bg-white border border-stone-200 px-8 py-8 lg:px-10 lg:py-9">
            <div className="text-5xl lg:text-6xl select-none" aria-hidden="true">🎁</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-700 mb-2">{t('gift.eyebrow')}</p>
              <h2 className="font-display text-2xl lg:text-3xl font-light text-navy-950 leading-snug mb-2 text-balance">
                {t('gift.title')}
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed max-w-xl">
                {t('gift.desc')}
              </p>
            </div>
            <Link
              to="/gift"
              className="btn-aurora inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-5 py-3 rounded-full transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0"
            >
              {t('gift.cta')} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

    </div>
    </>
  )
}
