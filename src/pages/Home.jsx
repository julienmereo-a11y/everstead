import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { PRICING } from '../config/pricing'
import {
  ShieldCheck, Lock, Users, FileText, CheckCircle2, ArrowRight,
  Star, ChevronDown, Bell, Share2, ClipboardList, BookOpen, Heart,
  AlertCircle, CreditCard, Clock, UserCircle, Sparkles
} from 'lucide-react'

const trustItems = [
  { icon: Lock,       label: 'AES-256 encrypted storage' },
  { icon: ShieldCheck, label: 'Only you control who can access it' },
  { icon: Users,      label: 'Trusted by families & advisers' },
  { icon: FileText,   label: 'Hosted in Europe (EU data residency)' },
  { icon: ShieldCheck, label: 'Zero data selling — ever' },
]

const painPoints = [
  'Families don\'t know where documents are',
  'Accounts and subscriptions are hard to find',
  'Executors lose time chasing details',
  'Wishes are unclear or unrecorded',
  'Digital assets become inaccessible',
]

const featureHighlights = [
  { icon: UserCircle, title: 'About Me', desc: 'The music you\'d want played, a letter for the people you love, the story only you can tell — gathered in one place and shared with whom you choose.' },
  { icon: Sparkles, title: 'Your AI Assistant', desc: 'New to this, or find admin daunting? A calm, private assistant helps you set things up one small step at a time — chat or drop in a document, and it suggests entries for you to confirm. Nothing is saved until you say so.', ai: 'It suggests, you decide — and you can switch AI off any time. ✨' },
  { icon: FileText, title: 'Secure document vault', desc: 'Upload, tag, and find legal, financial, and personal documents in seconds. Version history included.', ai: 'Upload a document — we extract the key details automatically. ✨' },
  { icon: ClipboardList, title: 'Step-by-step instructions', desc: 'Write clear guidance on your own terms — for everyday reference, and so the people you love know what to do when it counts.', ai: 'Not sure what to write? We\'ll help you find the words. ✨' },
  { icon: Users, title: 'Trusted people & sharing', desc: 'Give each person access to only what they need — a trusted contact today, an executor when it counts. Share by role and category on your terms, with emergency vault access in a single tap.' },
  { icon: Heart, title: 'Final wishes', desc: 'Capture personal letters, funeral preferences, and sentimental instructions — warm, private, and on your own timeline.', ai: 'We can help you start when the words don\'t come easily. ✨' },
]

const steps = [
  { num: '01', title: 'Add your accounts & details', desc: 'Organise financial accounts, documents, subscriptions, and key contacts into a structured plan.' },
  { num: '02', title: 'Assign trusted people', desc: 'Give each person role-based access — only what they need, nothing more.' },
  { num: '03', title: 'Leave instructions & wishes', desc: 'Write step-by-step guidance, personal notes, and final wishes on your own terms.' },
  { num: '04', title: 'Keep it updated over time', desc: 'Smart reminders and a readiness score keep your plan current and complete.' },
]

const testimonials = [
  { quote: 'The whole process felt straightforward and reassuring from the beginning. The platform was genuinely very easy to navigate, which made everything feel much less overwhelming.', name: 'Victoria Miller', role: 'Verified Trustpilot review', badge: '★★★★★' },
  { quote: 'I was looking for a service like this for a long time since starting a family. Everstead was the only one that hit the mark. I really feel at ease having this in place.', name: 'Yasmina Banine', role: 'Verified Trustpilot review', badge: '★★★★★' },
  { quote: 'It was recommended to me by a friend — I was first sceptical but now a happy user. Will recommend too.', name: 'Daniel Sutherland', role: 'Verified Trustpilot review', badge: '★★★★★' },
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

const faqs = [
  { q: 'Is my information actually secure?', a: 'Yes. All data is encrypted at rest and in transit with AES-256 encryption. Role-based access ensures only people you authorize can see specific sections. We never sell your data.' },
  { q: 'What happens to my account if I pass away?', a: 'You assign trusted people in advance — giving them access only to the sections you\'ve chosen, nothing more. But Everstead is useful long before that moment. Most members use it regularly to keep everything organised, knowing the access is there if it\'s ever needed.' },
  { q: 'Can I start before I have everything organised?', a: 'Absolutely. Most people start with just a few accounts and build over time. Our readiness score shows progress and highlights what\'s still missing.' },
  { q: 'Is this a legal document service?', a: 'No. Everstead is an organisation and planning platform — not a legal service. It does not draft wills, prepare legal documents, give legal or financial advice, or replace a solicitor, estate lawyer, accountant, or family adviser. It helps families organise information, instructions, and controlled access in one place.' },
]

const proofStats = [
  { value: '14 days', label: 'Free trial to get organised' },
  { value: 'Role-based', label: 'Access control for family and executors' },
  { value: '24/7', label: 'Access to your plan when it matters' },
]

const assuranceBadges = [
  { icon: ShieldCheck, label: 'Equal security across all plans' },
  { icon: Lock, label: 'Encrypted document and account storage' },
  { icon: FileText, label: 'Privacy-first handling and export-ready backups' },
]

const resourceCards = [
  { icon: Heart, title: 'What to do when someone dies', desc: 'A free, compassionate AI guide through the practical steps after a death in the UK — from the first hours to closing the estate.', href: '/what-to-do-when-someone-dies' },
  { icon: BookOpen, title: 'Executor starter guide', desc: 'A practical guide to the first steps families face after a death.', href: '/resources/guides' },
  { icon: ClipboardList, title: 'Estate planning checklist', desc: 'Use the same checklist structure reflected inside the dashboard.', href: '/resources/checklists' },
  { icon: FileText, title: 'Security and privacy overview', desc: 'See how Everstead handles permissions, encryption, and data access.', href: '/security' },
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
  const [openFaq, setOpenFaq] = useState(null)

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
      <section className="relative overflow-hidden min-h-screen flex flex-col justify-center pt-24 pb-20">
        {/* Radial gradient background */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 60% 40%, #0f2040 0%, #0d1628 50%, #080e1a 100%)'
        }} />

        {/* Sage green glow — behind dashboard card */}
        <div style={{
          position: 'absolute',
          right: '8%',
          top: '20%',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(76, 125, 71, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1.45fr_1fr] gap-12 lg:gap-14 items-center">
          {/* Copy */}
          <div>
            {/* A/B alternates to try later:
              // "The most thoughtful thing you'll sort out this year."
              // "Stop carrying it all in your head."
              // "Everything your family would need, gathered in one place — with love."
            */}
            <h1 className="font-display text-[2.75rem] leading-[1.18] sm:text-6xl sm:leading-[1.14] lg:text-7xl lg:leading-[1.12] xl:text-[5rem] xl:leading-[1.1] font-light text-white text-balance animate-fade-up">
              Everything that matters, <em>gathered</em> in one secure place.
            </h1>

            <p className="mt-5 sm:mt-6 text-lg sm:text-xl text-stone-300 leading-relaxed max-w-[600px] animate-fade-up animate-delay-100">
              Everstead helps UK families bring their accounts, documents and wishes together — Peace of mind for you now; clarity for the people you love later.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 animate-fade-up animate-delay-200">
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
                style={{ backgroundColor: '#4c7d47', color: '#ffffff' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#3d6b3a'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
              >
                Start Your Everstead
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
              >
                See How It Works
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

          {/* Dashboard preview — app mockup */}
          <div className="animate-fade-up animate-delay-300" style={{ position: 'relative', zIndex: 1 }}>
            <img
              src="/hero-app-2.png"
              alt="The Everstead app — your plan organised: accounts and assets, documents and wishes, and the people you trust"
              className="w-full lg:max-w-[460px] lg:ml-auto rounded-3xl"
              style={{ boxShadow: '0 32px 80px rgba(0, 0, 0, 0.45)' }}
            />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-stone-400 animate-bounce">
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone-100 py-5">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 lg:gap-x-12">
            <div className="flex items-center gap-2 text-stone-500">
              <Lock size={15} className="text-navy-600 flex-shrink-0" />
              <span className="text-sm font-medium">AES-256 bank-level encryption</span>
            </div>
            <span className="hidden sm:block w-px h-4 bg-stone-200" />
            <div className="flex items-center gap-2 text-stone-500">
              <ShieldCheck size={15} className="text-navy-600 flex-shrink-0" />
              <span className="text-sm font-medium">Only you control who can access it</span>
            </div>
            <span className="hidden sm:block w-px h-4 bg-stone-200" />
            <div className="flex items-center gap-2 text-stone-500">
              <FileText size={15} className="text-navy-600 flex-shrink-0" />
              <span className="text-sm font-medium">EU data residency · GDPR compliant</span>
            </div>
            <span className="hidden sm:block w-px h-4 bg-stone-200" />
            <div className="flex items-center gap-2 text-stone-500">
              <ShieldCheck size={15} className="text-navy-600 flex-shrink-0" />
              <span className="text-sm font-medium">Zero data selling — ever</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ─────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 items-stretch">
            <div className="reveal bg-white rounded-2xl border border-stone-200 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Why families trust it</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {proofStats.map((item) => (
                  <div key={item.label} className="rounded-xl bg-stone-50 border border-stone-200 p-4">
                    <p className="font-display text-3xl font-light text-navy-950">{item.value}</p>
                    <p className="text-sm text-stone-500 mt-1 leading-snug">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal reveal-delay-1 bg-navy-950 rounded-2xl border border-navy-800 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Security baseline</p>
              <div className="space-y-3">
                {assuranceBadges.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-sage-300" />
                    </div>
                    <p className="text-sm text-stone-200 leading-relaxed">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-navy-950 grain relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6ea6d8 0%, transparent 60%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="reveal mb-12">
            {/* A/B alternates to try later:
              // "If something happened tomorrow, would they know where to look?"
              // "The people you love shouldn't have to go searching."
            */}
            <h2 className="font-display text-4xl lg:text-6xl font-bold text-white leading-tight text-balance mb-6">
              Right now, it's all in your head — or scattered in a dozen places.
            </h2>
            <p className="text-stone-400 text-lg leading-relaxed max-w-2xl mx-auto">
              Not because you're disorganised — because life is busy. But if anything happened, the people you love would be left searching for what only you know.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: AlertCircle,
                title: "The paperwork no one can find",
                desc: "Insurance, property records, the will — scattered across email, drives, drawers, and apps. Easy for you to overlook; impossible for them to track down."
              },
              {
                icon: CreditCard,
                title: "Accounts only you remember",
                desc: "Subscriptions, investments, pensions, digital accounts — there's no single picture of what exists, except the one in your head."
              },
              {
                icon: Clock,
                title: "The things you'd want to say",
                desc: "Your wishes, your reasons, a few words for the people you love — rarely written down, and dearly missed when they're not."
              }
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`reveal reveal-delay-${i + 1} bg-white/5 border border-white/10 rounded-2xl p-6`}>
                <div className="w-10 h-10 rounded-full bg-red-900/60 flex items-center justify-center mb-5">
                  <Icon size={18} className="text-red-400" />
                </div>
                <h3 className="font-bold text-white text-base mb-3 leading-snug">{title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* second row */}
          <div className="grid sm:grid-cols-3 gap-6 text-left mt-6">
            <div className="reveal reveal-delay-1 bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-full bg-red-900/60 flex items-center justify-center mb-5">
                <UserCircle size={18} className="text-red-400" />
              </div>
              <h3 className="font-bold text-white text-base mb-3 leading-snug">The people you love are left guessing</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Without a clear record, your partner, children, or executor face weeks of searching through scattered information.</p>
            </div>

            <div className="reveal reveal-delay-2 bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-full bg-red-900/60 flex items-center justify-center mb-5">
                <Clock size={18} className="text-red-400" />
              </div>
              <h3 className="font-bold text-white text-base mb-3 leading-snug">Disorganisation costs more than you think</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Forgotten subscriptions, missed renewals, overlooked accounts — the real price of not having one place for everything.</p>
            </div>

            <div className="reveal reveal-delay-3 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-5">
              <p className="text-stone-300 text-lg leading-snug">There's a better way to stay organised — for you today, and for the people you love when it counts.</p>
              <Link
                to="/get-started"
                className="w-full py-3 px-6 rounded-xl border border-white/30 text-white font-bold text-base hover:bg-white/10 transition-colors"
              >
                Discover Everstead
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLUTION ─────────────────────────────────────────────── */}
      <section className="pt-4 pb-24 lg:pt-6 lg:pb-32 bg-navy-950 grain relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #6ea6d8 0%, transparent 60%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">One platform</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white max-w-2xl mx-auto leading-tight">
              Everything that matters,<br className="hidden sm:block" /> in one place.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureHighlights.map(({ icon: Icon, title, desc, ai }, i) => (
              <div
                key={title}
                className={`reveal reveal-delay-${Math.min(i + 1, 5)} bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 transition-colors`}
              >
                <div className="w-9 h-9 rounded-lg bg-navy-700 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-stone-300" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
                {ai && (
                  <span style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#4c7d47',
                    marginTop: '6px',
                    fontStyle: 'italic',
                  }}>{ai}</span>
                )}
              </div>
            ))}
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className={`reveal reveal-delay-${i + 1} text-center`}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-navy-50 border-2 border-navy-100 mb-5">
                  <span className="font-display text-xl font-semibold text-navy-700">{num}</span>
                </div>
                <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
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
      <section className="py-24 lg:py-32 bg-navy-950 grain relative overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-8">
            <Heart size={22} className="text-sage-400" />
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance leading-tight">
            Planning ahead is an act of care.
          </h2>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed">
            Everstead turns confusion into clarity. It gives your loved ones practical direction when decisions are time-sensitive and emotions are running high — a gift they will genuinely appreciate.
          </p>
        </div>
      </section>

      {/* ── USE CASE PREVIEW ─────────────────────────────────────── */}
      <section className="pt-24 pb-14 lg:pt-32 lg:pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Who it's for</p>
            <h2 className="font-display text-4xl font-light text-navy-950 text-balance">
              However your family is shaped, there's a place for everyone.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'For Families', desc: 'Make sure loved ones know where everything is and what to do first.', href: '/use-cases/families' },
              { title: 'For Parents', desc: 'Leave guidance, not guesswork, for practical and personal decisions.', href: '/use-cases/parents' },
              { title: 'For Aging Adults', desc: 'Organise with dignity and clarity while assigning trusted support.', href: '/use-cases/aging-adults' },
              { title: 'For Executors', desc: 'A clearer path through responsibilities, documents, and timing.', href: '/use-cases/executors' },
              { title: 'For Advisers', desc: 'Offer estate organisation as a modern client service.', href: '/use-cases/advisors' },
              {
                title: 'See all use cases',
                desc: 'Explore the full range of ways Everstead supports families and professionals.',
                href: '/use-cases',
                isLink: true,
              },
            ].map((item, i) => (
              <Link
                key={item.title}
                to={item.href}
                className={`reveal reveal-delay-${Math.min(i + 1, 5)} group block rounded-xl border border-stone-200 p-6 hover:border-navy-300 hover:bg-navy-50 transition-all ${item.isLink ? 'bg-navy-50 border-navy-200' : 'bg-white'}`}
              >
                <h3 className="font-semibold text-navy-900 text-sm mb-2 group-hover:text-navy-700">{item.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                {!item.isLink && <span className="inline-flex items-center gap-1 text-xs text-navy-600 mt-3 font-medium group-hover:gap-2 transition-all">Learn more <ArrowRight size={12} /></span>}
              </Link>
            ))}
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
                Everstead runs on bank-grade AES-256 encryption and EU-based, UK GDPR-compliant infrastructure. Your information stays private by default — visible only to the people you choose, only the parts you choose, and only when you decide. It's your vault, and you decide who ever gets in.
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

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Trustpilot reviews</p>
            <h2 className="font-display text-4xl font-light text-navy-950">What members say.</h2>
            <a href="https://www.trustpilot.com/review/everstead.care" target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-xs text-stone-400 hover:text-navy-700 transition-colors underline underline-offset-2">
              See all reviews on Trustpilot →
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, name, role, badge }, i) => (
              <div key={name} className={`reveal reveal-delay-${i + 1} bg-white border border-stone-200 rounded-2xl p-7`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-amber-400 fill-amber-400" />)}
                  </div>
                  {badge && (
                    <span className="text-xs text-stone-400 border border-stone-200 px-2 py-0.5 rounded-full">{badge}</span>
                  )}
                </div>
                <p className="text-stone-700 text-sm leading-relaxed mb-6 italic">"{quote}"</p>
                <div>
                  <p className="font-semibold text-navy-900 text-sm">{name}</p>
                  <p className="text-stone-500 text-xs mt-0.5">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-navy-950 grain relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 60%, #4c7d47 0%, transparent 50%)' }}
        />
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
                    className="block text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  >
                    Book a demo <ArrowRight size={13} className="inline ml-1" />
                  </Link>
                ) : (
                  <Link
                    to={`/get-started?plan=${id}&billing=${annualPricing ? 'yearly' : 'monthly'}`}
                    className={`block text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
                      highlight
                        ? 'bg-navy-800 text-white hover:bg-navy-700'
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

      {/* ── RESOURCE HUB ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-white border-y border-stone-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-12 reveal">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Resources</p>
              <h2 className="font-display text-4xl font-light text-navy-950">Practical guidance beyond the product.</h2>
            </div>
            <Link to="/resources" className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900 transition-colors">Explore resources <ArrowRight size={14} /></Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {resourceCards.map(({ icon: Icon, title, desc, href }, i) => (
              <Link key={title} to={href} className={`reveal reveal-delay-${i + 1} group bg-stone-50 border border-stone-200 rounded-2xl p-6 hover:border-navy-300 hover:bg-white transition-all`}>
                <div className="w-11 h-11 rounded-2xl bg-navy-50 flex items-center justify-center mb-5 group-hover:bg-navy-100 transition-colors">
                  <Icon size={18} className="text-navy-700" />
                </div>
                <h3 className="text-lg font-semibold text-navy-900 mb-2">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── REFERRAL CTA ─────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-stone-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="reveal rounded-3xl bg-gradient-to-br from-navy-900 to-navy-950 border border-navy-800 p-8 lg:p-10 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">Share Everstead</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light leading-tight">Help a parent, partner, or client get organised before a crisis.</h2>
              <p className="text-sm text-stone-300 mt-3 leading-relaxed">Everstead works especially well when one family member starts the process and invites others in with the right permissions.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/get-started?plan=family&billing=yearly" className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-stone-100 transition-colors">Start a family plan <ArrowRight size={15} /></Link>
              <Link to="/book-demo" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 font-medium text-sm px-6 py-3 rounded-lg hover:bg-white/20 transition-colors">Book an adviser demo</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── LEGAL CLARITY ────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-white border-y border-stone-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 reveal">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3">Important</p>
            <h2 className="font-display text-2xl font-light text-navy-950">
              Everstead is not a legal service and does not replace professional advice.
            </h2>
            <p className="mt-4 text-stone-700 text-sm leading-relaxed">
              Everstead is an organisation and planning platform. It helps you store references to documents, record instructions, and share access with trusted people. It does <strong>not</strong> draft wills, prepare legal instruments, give legal or financial advice, or replace a solicitor, estate lawyer, accountant, or family adviser. If you need legal or financial guidance, please consult a qualified professional.
            </p>
            <div className="mt-5 flex flex-wrap gap-4">
              <Link to="/terms" className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900 transition-colors">
                Read our terms <ArrowRight size={14} />
              </Link>
              <Link to="/security" className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900 transition-colors">
                Security & privacy <ArrowRight size={14} />
              </Link>
            </div>
          </div>
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
              className="inline-flex items-center justify-center gap-2 bg-sage-700 hover:bg-sage-800 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Give as a gift <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Questions</p>
            <h2 className="font-display text-4xl font-light text-navy-950">Frequently asked.</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(({ q, a }, i) => (
              <FaqItem key={i} q={q} a={a} delay={i + 1} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-navy-900 to-navy-950 grain relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #6ea6d8 0%, transparent 60%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance leading-tight">
            Spend an afternoon now. Give them a lifetime of less worry.
          </h2>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed">
            Start with what you have and build as you go. Most people are up and running in under an hour — and the people they love are protected from that moment on.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-7 py-3.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Start Your Everstead
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/book-demo"
              className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-7 py-3.5 rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
            >
              Book an adviser demo
            </Link>
          </div>
        </div>
      </section>
    </div>
    </>
  )
}

function FaqItem({ q, a, delay, open, onToggle }) {
  return (
    <div className={`reveal reveal-delay-${Math.min(delay, 5)} border border-stone-200 rounded-xl overflow-hidden bg-white`}>
      <button
        onClick={onToggle}
        className="w-full text-left flex items-start justify-between gap-4 px-6 py-5"
      >
        <span className="font-medium text-navy-900 text-sm">{q}</span>
        <ChevronDown size={16} className={`text-stone-400 mt-0.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">{a}</div>
      )}
    </div>
  )
}
