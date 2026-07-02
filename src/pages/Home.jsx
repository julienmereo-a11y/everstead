import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { PRICING } from '../config/pricing'
import {
  ShieldCheck, Lock, Users, FileText, CheckCircle2, ArrowRight,
  ChevronDown, Bell, Share2, BookOpen, Heart,
  UserCircle, Sparkles, UserCheck, MapPin, BadgeCheck, Landmark
} from 'lucide-react'

const trustItems = [
  { icon: Lock,       label: 'Bank-level security', sub: 'AES-256 encryption' },
  { icon: UserCheck,  label: 'Access management',   sub: 'You decide who can see what' },
  { icon: MapPin,     label: 'UK data residency',   sub: 'Fully GDPR compliant' },
  { icon: BadgeCheck, label: 'SOC 2 compliant',     sub: 'Built on SOC 2 infrastructure' },
]

const painPoints = [
  'Families don\'t know where documents are',
  'Accounts and subscriptions are hard to find',
  'Executors lose time chasing details',
  'Wishes are unclear or unrecorded',
  'Digital assets become inaccessible',
]

// "Why Everstead" — three calm pillars (replaces the old six-card feature grid).
const whyEverstead = [
  {
    icon: Landmark,
    title: 'Accounts & assets',
    desc: 'Every account, policy and subscription in one clear list — so nothing quietly slips through the cracks.',
    cta: 'See what you can add',
    to: '/features',
  },
  {
    icon: FileText,
    title: 'Documents & wishes',
    desc: 'Wills, deeds, letters and instructions — stored safely, easy to find, and impossible to misplace.',
    cta: 'Keep documents safe',
    to: '/security',
  },
  {
    icon: Users,
    title: 'People & access',
    desc: 'Decide who sees what, and when. Your family is only ever a step away — never a guess.',
    cta: "Choose who's trusted",
    to: '/how-it-works',
  },
]

const steps = [
  { num: '01', title: 'Bring it together', desc: 'Add accounts, documents and wishes whenever it suits you — a few minutes at a time is plenty.' },
  { num: '02', title: 'Keep it current', desc: "Small, gentle nudges keep everything accurate and complete, so it's always ready." },
  { num: '03', title: 'Pass it on', desc: "Choose who's notified, and what they can see, if and when the time ever comes." },
]

const plans = [
  {
    id: 'essential',
    name: 'Essential',
    monthly: PRICING.essential.monthly.perMonth,
    annual: PRICING.essential.annual.perMonth,
    promo: true,
    desc: 'For individuals who want their accounts, documents, and wishes in one secure place.',
    features: ['Up to 10 accounts & documents', 'Step-by-step instructions', '1 trusted contact', 'Readiness score', '1 GB storage', 'Your AI Assistant'],
    cta: 'Start Your Everstead',
    highlight: false,
  },
  {
    id: 'family',
    name: 'Family',
    monthly: PRICING.family.monthly.perMonth,
    annual: PRICING.family.annual.perMonth,
    desc: 'For couples and families — two private vaults, one subscription. Organised together, private separately.',
    features: ['Everything in Essential', 'Two private vaults — one subscription', 'Each person keeps their own private data', 'Up to 10 trusted contacts', '25 GB storage', 'Share only what you choose'],
    cta: 'Start Your Everstead',
    highlight: true,
  },
  {
    id: 'advisor',
    name: 'Adviser',
    desc: 'For professionals managing client estate organisation. Pricing on application.',
    features: ['Everything in Family', 'Multi-client workspace', 'Co-branded client portal', 'Adviser collaboration tools', 'Priority support'],
    cta: 'Book a demo',
    highlight: false,
  },
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
  const [annualPricing, setAnnualPricing] = useState(true)

  return (
    <>
    <Helmet>
      <title>Everstead — Your life, organised.</title>
      <meta name="description" content="Everstead helps UK families securely organise accounts, documents, instructions, and final wishes — with AI that helps you every step of the way. Start your free trial today." />
      <link rel="canonical" href="https://www.everstead.care" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Everstead — Your life, organised." />
      <meta property="og:description" content="Everstead is the secure home for your accounts, documents, and important decisions — organised for you today, and ready for your family when it counts." />
      <meta property="og:url" content="https://www.everstead.care" />
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
        description: 'Secure personal vault for UK families. Organise accounts, documents, and important decisions — accessible today, and ready for your loved ones when it matters.',
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
      <section className="aurora-field overflow-hidden min-h-screen flex flex-col justify-center pt-24 pb-20 relative">

        {/* Family photo — fills the right side of the hero, fully visible on the right and
            fading gradually leftward into the aurora background (matches the design mock). */}
        <div className="hidden lg:block absolute top-24 bottom-0 right-0 w-[60%] pointer-events-none select-none" aria-hidden="true">
          <img
            src="/hero-family.jpg"
            alt=""
            className="w-full h-full object-cover"
            style={{
              objectPosition: '88% 38%',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 30%, #000 55%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 30%, #000 55%)',
            }}
          />
          {/* soft top fade so the photo melts into the nav band rather than a hard edge */}
          <div className="absolute inset-x-0 top-0 h-16" style={{ background: 'linear-gradient(to bottom, rgba(13,22,40,0.8) 0%, rgba(13,22,40,0) 100%)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full">
          {/* Copy */}
          <div className="max-w-[620px]">
            {/* A/B alternates to try later:
              // "The most thoughtful thing you'll sort out this year."
              // "Stop carrying it all in your head."
              // "Everything your family would need, gathered in one place — with love."
            */}
            <p className="text-sm sm:text-base font-medium text-sage-300 mb-4 sm:mb-5 tracking-wide animate-fade-up">
              Organise your accounts, documents &amp; final wishes
            </p>
            <h1 className="font-display text-[2.75rem] leading-[1.18] sm:text-6xl sm:leading-[1.14] lg:text-7xl lg:leading-[1.12] xl:text-[5rem] xl:leading-[1.1] font-light text-white text-balance animate-fade-up animate-delay-100">
              Everything that matters, <em className="aurora-text">gathered</em> in one secure place.
            </h1>

            <p className="mt-5 sm:mt-6 text-lg sm:text-xl text-stone-300 leading-relaxed max-w-[600px] animate-fade-up animate-delay-100">
              Everstead is the secure place to keep everything your loved ones will need, set up in minutes and shared only with the people you choose.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 animate-fade-up animate-delay-200">
              <Link
                to="/get-started"
                className="btn-aurora inline-flex items-center gap-2 font-semibold text-base px-8 py-4 rounded-full transition-transform hover:-translate-y-0.5"
              >
                Get started free
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/how-it-works"
                className="group inline-flex items-center gap-1.5 text-white/75 font-medium text-sm hover:text-white transition-colors"
              >
                See how it works
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <p className="mt-5 text-xs text-stone-400 animate-fade-up animate-delay-300">
              14-day free trial · Cancel anytime
            </p>
            <p className="text-xs text-stone-500 mt-2 animate-fade-up animate-delay-300" style={{ letterSpacing: '0.02em' }}>
              🔒 Bank-level AES-256 encryption &nbsp;·&nbsp; 🇬🇧 UK-based &nbsp;·&nbsp; ICO registered &nbsp;·&nbsp; No. 17166825
            </p>
            <div className="inline-flex items-center gap-1.5 mt-4 animate-fade-up animate-delay-300" style={{
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(76, 125, 71, 0.3)',
              fontSize: '11px',
              color: '#4c7d47',
              letterSpacing: '0.04em',
            }}>
              ✨ AI-assisted estate planning
            </div>
          </div>

          {/* Mobile photo — contained + softened, shown only on small screens */}
          <div className="lg:hidden mt-10 relative rounded-3xl overflow-hidden animate-fade-up animate-delay-300">
            <img
              src="/hero-family.jpg"
              alt="A daughter and her father organising their family's plan together at home"
              className="w-full object-cover"
              style={{ opacity: 0.95 }}
            />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(160deg, rgba(13,22,40,0.04) 0%, rgba(13,22,40,0.32) 100%)' }} />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-stone-400 animate-bounce">
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
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Why Everstead</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white max-w-2xl mx-auto leading-tight text-balance">
              One home for the<br className="hidden sm:block" /> things that matter.
            </h2>
            <p className="mt-5 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto">
              No more scattered logins, lost paperwork, or guesswork left behind. Just a clear, gentle record of a life well organised.
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
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Effortless to keep current</p>
              <h3 className="font-display text-3xl lg:text-4xl font-light text-white leading-tight text-balance">
                Up to date, without the chore.
              </h3>
              <p className="mt-5 text-stone-300 leading-relaxed max-w-md">
                Gentle reminders and one-tap updates mean your Everstead reflects your life as it is now — not as it was five years ago. The hard part stays done.
              </p>
              <ul className="mt-6 space-y-3">
                {['Quiet nudges only when something needs a look', "A clear sense of what's complete and what's left"].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-stone-200 text-sm">
                    <CheckCircle2 size={16} className="text-sage-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <img
              src="/screenshot-doc.jpg"
              alt="A quiet monthly summary in Everstead — home insurance renewed, a new ISA added, and a gentle nudge that a passport expires in six months"
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
              alt="People & access in Everstead — a partner with full access, a daughter with a single document, and a solicitor sealed until needed"
              width="944" height="780"
              loading="lazy"
              className="w-full h-auto rounded-3xl border border-white/10 order-last lg:order-first"
              style={{ boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)' }}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Yours to share, on your terms</p>
              <h3 className="font-display text-3xl lg:text-4xl font-light text-white leading-tight text-balance">
                Share exactly what you choose.
              </h3>
              <p className="mt-5 text-stone-300 leading-relaxed max-w-md">
                Give a partner full access, a child a single document, or a solicitor a sealed envelope opened only when the time comes. You stay in control, always.
              </p>
              <ul className="mt-6 space-y-3">
                {['Per-item permissions, changeable any time', 'Trusted contacts notified only when needed'].map(item => (
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
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Getting started</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              Easier than you'd think — and never for nothing.
            </h2>
            <p className="mt-4 text-stone-500 text-lg leading-relaxed max-w-xl mx-auto">
              A few quiet minutes now means the people you love won't spend weeks piecing it together later.
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
              Learn the full workflow <ArrowRight size={15} />
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
              Planning ahead is an act of care.
            </h2>
            <p className="mt-6 text-stone-300 text-lg leading-relaxed">
              Everstead turns confusion into clarity. It gives your loved ones practical direction when decisions are time-sensitive and emotions are running high — a gift they will genuinely appreciate.
            </p>
          </div>
          <div className="reveal reveal-delay-1 max-w-[300px] lg:max-w-[320px] mx-auto lg:ml-auto lg:mr-0">
            <img
              src="/hero-app-3.jpg"
              alt="The Everstead app — your plan organised: accounts and assets, documents and wishes, and the people you trust"
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
              <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Security & privacy</p>
              {/* A/B alternates to try later:
                // "Bank-grade security. Total control. Always yours."
                // "Protected to the highest standards — and only ever yours."
              */}
              <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance leading-tight">
                Built on the highest security standards — and controlled entirely by you.
              </h2>
              <p className="mt-5 text-stone-600 leading-relaxed">
                Everstead runs on bank-grade AES-256 encryption and UK-hosted, UK GDPR-compliant infrastructure. Your information stays private by default — visible only to the people you choose, only the parts you choose, and only when you decide. It's your vault, and you decide who ever gets in.
              </p>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <Link to="/security" className="inline-flex items-center gap-2 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors">
                  Read our security practices <ArrowRight size={15} />
                </Link>
                <Link to="/privacy" className="inline-flex items-center gap-2 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors">
                  Our privacy policy <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <div className="reveal reveal-delay-1 grid grid-cols-2 gap-4">
              {[
                { icon: Lock,       label: 'AES-256 encrypted storage' },
                { icon: Users,      label: 'Role-based access controls' },
                { icon: BookOpen,   label: 'Complete audit history' },
                { icon: Share2,     label: 'Private sharing only' },
                { icon: Bell,       label: 'Emergency vault access' },
                { icon: ShieldCheck, label: 'Privacy-first commitments' },
              ].map(({ icon: Icon, label }) => (
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
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Pricing</p>
            <h2 className="font-display text-4xl font-light text-white text-balance">Simple, honest pricing.</h2>
            <p className="mt-3 text-stone-400 text-sm">Save 20% with yearly billing, all in pounds.</p>
            <div className="mt-8 inline-flex items-center gap-4 bg-white/10 border border-white/20 rounded-full p-1">
              <button
                onClick={() => setAnnualPricing(false)}
                className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${!annualPricing ? 'bg-white text-navy-900' : 'text-stone-300 hover:text-white'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnualPricing(true)}
                className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${annualPricing ? 'bg-white text-navy-900' : 'text-stone-300 hover:text-white'}`}
              >
                Yearly <span className="text-sage-500 font-semibold ml-1">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(({ id, name, monthly, annual, desc, features, cta, highlight, promo }, i) => (
              <div
                key={name}
                className={`reveal reveal-delay-${i + 1} rounded-2xl p-7 border ${
                  highlight
                    ? 'bg-white text-navy-950 border-transparent shadow-2xl'
                    : 'bg-white/5 text-stone-300 border-white/10'
                }`}
              >
                {(highlight || promo) && (
                  <div className="mb-4 flex items-center gap-2 flex-wrap">
                    {highlight && <span className="inline-block bg-sage-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Most popular</span>}
                    {promo && <span className="inline-block bg-amber-400 text-amber-950 text-xs font-semibold px-2.5 py-1 rounded-full">Launch offer</span>}
                  </div>
                )}
                <h3 className={`font-semibold text-lg mb-1 ${highlight ? 'text-navy-900' : 'text-white'}`}>{name}</h3>
                <p className={`text-sm mb-5 ${highlight ? 'text-stone-500' : 'text-stone-400'}`}>{desc}</p>
                {id !== 'advisor' && (
                  <>
                    <div className="flex items-end gap-1 mb-6">
                      <span className={`font-display text-4xl font-light ${highlight ? 'text-navy-950' : 'text-white'}`}>£{annualPricing ? annual : monthly}</span>
                      <span className={`text-sm mb-1.5 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>/mo</span>
                    </div>
                    <p className={`text-xs mb-4 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>{annualPricing ? 'Billed annually · Save 20%' : 'Billed monthly'}</p>
                  </>
                )}
                {id === 'advisor' && (
                  <p className="text-stone-400 text-xs mb-6">Pricing on application — we're working personally with our first adviser cohort.</p>
                )}
                <ul className="space-y-2.5 mb-8">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className={`mt-0.5 flex-shrink-0 ${highlight ? 'text-sage-600' : 'text-sage-500'}`} />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                {id === 'advisor' ? (
                  <Link
                    to="/book-demo"
                    className="block text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-colors bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  >
                    Book a demo <ArrowRight size={13} className="inline ml-1" />
                  </Link>
                ) : (
                  <Link
                    to={`/get-started?plan=${id}&billing=${annualPricing ? 'yearly' : 'monthly'}`}
                    className={`block text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-colors ${
                      highlight
                        ? 'btn-aurora'
                        : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {cta}
                  </Link>
                )}
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-stone-500 text-xs reveal">
            All plans include a 14-day free trial. Your card won't be charged until the trial ends.{' '}
            <Link to="/pricing" className="text-stone-400 hover:text-white underline underline-offset-2 transition-colors">Full pricing details →</Link>
          </p>
        </div>
      </section>

      {/* ── Gift strip ─────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-stone-50 border-y border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="reveal grid md:grid-cols-[auto_1fr_auto] items-center gap-6 rounded-3xl bg-white border border-stone-200 px-8 py-8 lg:px-10 lg:py-9">
            <div className="text-5xl lg:text-6xl select-none" aria-hidden="true">🎁</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-700 mb-2">A gift that says: I've sorted it.</p>
              <h2 className="font-display text-2xl lg:text-3xl font-light text-navy-950 leading-snug mb-2 text-balance">
                Give Everstead to a parent, partner, or someone you love.
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed max-w-xl">
                The kind of present they'd never buy themselves — and the one that genuinely takes weight off their family one day. Sent as a digital gift, redeemable any time.
              </p>
            </div>
            <Link
              to="/gift"
              className="btn-aurora inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-5 py-3 rounded-full transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0"
            >
              Give as a gift <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

    </div>
    </>
  )
}
