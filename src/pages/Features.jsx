import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import {
  ArrowRight, Folder, FileText, ClipboardList, Users, Share2, Heart,
  CreditCard, BarChart3, Lock, ShieldCheck, Bell, BookOpen, CheckCircle2,
  Eye, Clock, AlertTriangle, Key, Globe, RefreshCw, Layers, Zap, Star,
  ChevronDown, ChevronRight, UserCheck, Archive, MessageSquare, UserCircle, Sparkles
} from 'lucide-react'

/* ─── Data ────────────────────────────────────────────────────────────── */

const coreFeatures = [
  {
    icon: UserCircle,
    tag: 'About Me',
    title: 'About Me',
    headline: 'The story only you can tell — kept for the people you love.',
    body: 'More than accounts and admin. The music you\'d want played, a letter to your children, the life events that shaped you, a playlist that\'s unmistakably yours. It\'s the warm, human heart of your plan — written on your own terms and shared only with the people you choose, either now or when your plan is one day activated.',
    bullets: [
      'Life events, passions, and personal reflections',
      'Letters and messages for the people you love',
      'A profile photo and a playlist that capture who you are',
      'Shared only with chosen people — never with solicitors or advisers',
    ],
    accent: 'bg-sage-50 border-sage-100',
    iconBg: 'bg-sage-100',
    iconColor: 'text-sage-700',
  },
  {
    icon: Sparkles,
    tag: 'AI Assistant',
    title: 'Your AI Assistant',
    headline: 'A private helper, for when admin feels like too much.',
    body: 'If getting this sorted has ever felt overwhelming, you don\'t have to do it alone. Your AI Assistant is a calm, private helper inside your account — chat in plain English, or simply drop in a document and it will read it and suggest entries for you. It works one small step at a time, and nothing is ever saved until you review and confirm it. It can also answer practical questions about how Everstead works.',
    bullets: [
      'Chat, or drop in a document — it suggests entries for you to review',
      'Nothing is saved until you confirm — it suggests, you decide',
      'Helps you begin even when the words, or the energy, don\'t come easily',
      'Private to your account; switch AI off any time in Settings',
    ],
    accent: 'bg-navy-50 border-navy-100',
    iconBg: 'bg-navy-100',
    iconColor: 'text-navy-700',
  },
  {
    icon: Folder,
    tag: 'Accounts',
    title: 'Account Inventory',
    headline: 'Every account, documented once and found instantly.',
    body: 'Bank accounts, investments, pensions, ISAs, crypto wallets, insurance policies, utility providers, subscriptions — all structured, labelled, and searchable. Add institution names, account numbers, login hints, and contacts so nothing is buried or forgotten.',
    bullets: [
      'Banking, investment, pension & insurance accounts',
      'Digital assets, crypto, and online accounts',
      'Subscription tracker with renewal dates and costs',
      'Custom categories and tags',
    ],
    accent: 'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  {
    icon: FileText,
    tag: 'Documents',
    title: 'Secure Document Vault',
    headline: 'Legal and personal documents, stored and shared safely.',
    body: 'Upload your will, power of attorney, property deeds, passport, birth certificate, insurance policies, and more. Tag by category, assign access by role, and keep a version history so nothing gets overwritten without a trace.',
    bullets: [
      'Wills, LPAs, deeds, insurance policies',
      'Encrypted at rest with AES-256',
      'Role-based access — share only what is needed',
      'Version history and file audit log',
    ],
    ai: 'Upload a document — we extract the key details automatically. ✨',
    accent: 'bg-emerald-50 border-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
  },
  {
    icon: ClipboardList,
    tag: 'Instructions',
    title: 'Step-by-Step Instructions',
    headline: 'Written guidance exactly when it is needed most.',
    body: 'Tell your family what to do, in what order, and who to call — in plain language. Cover the first 48 hours, estate administration, account closure, and anything personal. Your words, preserved and delivered with clarity.',
    bullets: [
      'First-steps guidance for the days after death',
      'Account closure and estate admin checklists',
      'Contact lists with names, roles, and numbers',
      'Personal notes and situation-specific guidance',
    ],
    ai: "Not sure what to write? We'll help you find the words. ✨",
    accent: 'bg-violet-50 border-violet-100',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
  },
  {
    icon: Users,
    tag: 'People',
    title: 'Trusted People & Roles',
    headline: 'The right people see the right information — nothing more.',
    body: 'Assign roles like executor, spouse, child, solicitor, or financial adviser. Each role gets access only to what you\'ve explicitly shared. You can adjust, revoke, or expand access at any time — staying in full control.',
    bullets: [
      'Named roles: executor, spouse, adviser, caregiver',
      'Granular per-section access control',
      'Revoke or update access at any time',
      'Access notification when a trusted person views',
    ],
    accent: 'bg-amber-50 border-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  {
    icon: Share2,
    tag: 'Access',
    title: 'Emergency Vault & Sharing',
    headline: 'Instant access when there is no time to spare.',
    body: 'Set up your Emergency Vault to unlock automatically under specific conditions — or grant a trusted person a one-tap access request. Every access event is logged in a full audit trail so nothing happens without a record.',
    bullets: [
      'Emergency vault with controlled unlock conditions',
      'One-tap access request for trusted people',
      'Time-locked or condition-based sharing',
      'Complete audit trail of every access event',
    ],
    accent: 'bg-rose-50 border-rose-100',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
  },
  {
    icon: Heart,
    tag: 'Wishes',
    title: 'Final Wishes',
    headline: 'Personal preferences captured with dignity.',
    body: 'Record funeral and memorial preferences, organ donation wishes, personal letters, sentimental item instructions, and burial or cremation details. Everstead ensures these are found, read, and honoured.',
    bullets: [
      'Funeral and memorial service preferences',
      'Organ and tissue donation wishes',
      'Personal letters and messages for loved ones',
      'Allocation of sentimental or personal items',
    ],
    ai: "We can help you start when the words don't come easily. ✨",
    accent: 'bg-pink-50 border-pink-100',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-700',
  },
  {
    icon: MessageSquare,
    tag: 'Messages',
    title: 'Personal Messages',
    headline: 'Your words, delivered when it matters most.',
    body: 'Write a personal note or record a video message for anyone in your plan — your spouse, children, solicitor, or a close friend. Each message is sealed, encrypted, and released only to the named recipient when your delegates access the plan. Say what you need to say, on your own terms.',
    bullets: [
      'Written notes for named individuals — personal and private',
      'Video messages recorded and stored securely in-platform',
      'Released only to the intended recipient after the plan is activated',
      'Separate messages per person — different words for different relationships',
    ],
    ai: 'Write it yourself or let us help you get started. ✨',
    accent: 'bg-violet-50 border-violet-100',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
  },
  {
    icon: CreditCard,
    tag: 'Subscriptions',
    title: 'Subscription Tracker',
    headline: 'Stop paying for things that outlive the person who signed up.',
    body: 'List every recurring charge — streaming services, software, memberships, gym contracts, magazines. Add amounts, renewal dates, and cancellation instructions. Executors can action each line without guesswork or surprise charges.',
    bullets: [
      'All recurring charges in one view',
      'Renewal dates and billing amounts',
      'Cancellation instructions per service',
      'Prevents active subscriptions running undetected',
    ],
    accent: 'bg-orange-50 border-orange-100',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-700',
  },
  {
    icon: BarChart3,
    tag: 'Progress',
    title: 'Readiness Score',
    headline: 'Know exactly how complete your plan is.',
    body: 'The readiness score tracks completeness across all sections — accounts, documents, instructions, trusted people, and final wishes. Smart prompts surface what\'s missing, so your plan stays current and nothing falls through the gaps.',
    bullets: [
      'Completeness score across all plan sections',
      'Smart prompts for missing or outdated items',
      'Periodic review reminders',
      'A clear signal your family can rely on you\'ve prepared',
    ],
    ai: 'Your AI readiness coach tells you exactly what to focus on next. ✨',
    accent: 'bg-teal-50 border-teal-100',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
  },
]

const securityPoints = [
  { icon: Lock,       label: 'AES-256 encrypted storage',          desc: 'Military-grade encryption for all data, at rest and in transit.' },
  { icon: Eye,        label: 'Role-based access controls',          desc: 'Each trusted person sees only their assigned sections.' },
  { icon: BookOpen,   label: 'Full audit log',                      desc: 'Every view, share, and change is permanently recorded.' },
  { icon: ShieldCheck,label: 'Privacy-first by design',            desc: 'No data selling, no advertising, no third-party access without consent.' },
  { icon: Bell,       label: 'Access notifications',               desc: 'You are notified whenever a trusted person accesses your plan.' },
  { icon: RefreshCw,  label: 'Secure backups',                     desc: 'Encrypted, redundant backups ensure your plan is never lost.' },
]

const whoItsFor = [
  {
    icon: Users,
    title: 'Families',
    desc: 'One place where every household member knows accounts, documents, and wishes are recorded — so no one is left guessing.',
  },
  {
    icon: UserCheck,
    title: 'Executors',
    desc: 'A complete, structured guide to the estate — accounts, contacts, documents, and instructions — without weeks of searching.',
  },
  {
    icon: Archive,
    title: 'Aging Adults',
    desc: 'Build a plan at your own pace, assign trusted people, and know that your wishes and affairs are properly documented.',
  },
  {
    icon: FileText,
    title: 'Estate Advisers',
    desc: 'Offer clients a secure, organised estate record they can maintain themselves — and that dramatically reduces your administration burden.',
  },
]

const comparison = [
  { point: 'Accounts documented in one place',      us: true,  spreadsheet: true,  solicitor: false },
  { point: 'Encrypted, access-controlled storage',  us: true,  spreadsheet: false, solicitor: false },
  { point: 'Role-based sharing with audit log',      us: true,  spreadsheet: false, solicitor: false },
  { point: 'Emergency vault access',                 us: true,  spreadsheet: false, solicitor: false },
  { point: 'Step-by-step family instructions',       us: true,  spreadsheet: true,  solicitor: false },
  { point: 'Final wishes captured',                  us: true,  spreadsheet: false, solicitor: true  },
  { point: 'Subscription tracker',                   us: true,  spreadsheet: true,  solicitor: false },
  { point: 'Readiness score and smart prompts',      us: true,  spreadsheet: false, solicitor: false },
  { point: 'Always up to date, editable any time',   us: true,  spreadsheet: true,  solicitor: false },
]

const testimonials = [
  { quote: 'My father passed suddenly. Everstead made an incredibly painful time so much more manageable. Everything was right there.', name: 'Margaret T.', role: 'Daughter & executor' },
  { quote: 'As an estate solicitor, I now recommend this to every client. It dramatically reduces the back-and-forth during settlement.', name: 'David R.', role: 'Estate solicitor' },
  { quote: 'We finally have peace of mind. Our kids will know exactly what to do and where to find everything.', name: 'James & Carol B.', role: 'Parents, married 34 years' },
]

/* ─── Component ────────────────────────────────────────────────────────── */

export default function Features() {
  useReveal()
  const [openFeature, setOpenFeature] = useState(null)

  return (
    <>
    <Helmet>
      <title>Features — Everstead</title>
      <meta name="description" content="Explore everything Everstead offers — document scanning, AI-assisted instructions, personal messages, trusted contacts, and a readiness score to keep your plan on track." />
      <link rel="canonical" href="https://www.everstead.care/features" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Features — Everstead" />
      <meta property="og:description" content="Explore everything Everstead offers — document scanning, AI-assisted instructions, personal messages, trusted contacts, and a readiness score to keep your plan on track." />
      <meta property="og:url" content="https://www.everstead.care/features" />
      <meta property="og:image" content="https://www.everstead.care/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
    </Helmet>
    <div className="bg-stone-50 pt-24">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5">Features</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            Everything your family needs to find — all in one place.
          </h1>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-2xl mx-auto">
            Everstead gives you a structured, secure, and complete picture of your estate — accounts, documents, instructions, and final wishes — organised and accessible to the right people when it matters most.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="btn-aurora inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full"
            >
              Start Your Everstead <ArrowRight size={15} />
            </Link>
            <Link to="/how-it-works" className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-6 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-colors">
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem bar ───────────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone-100 py-8">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-stone-400 mb-6">What families face without a plan</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: AlertTriangle, text: 'Documents no one can find', color: 'text-red-500', bg: 'bg-red-50' },
              { icon: Key,           text: 'Passwords and accounts lost', color: 'text-amber-600', bg: 'bg-amber-50' },
              { icon: Clock,         text: 'Weeks lost chasing details', color: 'text-orange-500', bg: 'bg-orange-50' },
              { icon: Globe,         text: 'Wishes never recorded', color: 'text-rose-500', bg: 'bg-rose-50' },
            ].map(({ icon: Icon, text, color, bg }) => (
              <div key={text} className={`flex items-center gap-3 rounded-xl border border-stone-100 ${bg} p-4`}>
                <Icon size={18} className={`flex-shrink-0 ${color}`} />
                <span className="text-sm font-medium text-stone-700">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core features deep-dive ───────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">What's inside</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              Ten features. One complete plan.
            </h2>
            <p className="mt-4 text-stone-500 max-w-xl mx-auto text-sm leading-relaxed">
              Each feature is designed around the questions families actually ask after a loss — and the answers they struggle to find.
            </p>
          </div>

          <div className="space-y-6">
            {coreFeatures.map(({ icon: Icon, tag, title, headline, body, bullets, accent, iconBg, iconColor, ai }, i) => (
              <div
                key={title}
                className={`reveal reveal-delay-${Math.min(i + 1, 5)} rounded-2xl border bg-white overflow-hidden transition-all`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setOpenFeature(openFeature === i ? null : i)}
                >
                  <div className="flex items-center gap-5 p-6">
                    <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={22} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${iconColor} mb-0.5 block`}>{tag}</span>
                      <h3 className="font-semibold text-navy-950 text-base">{title}</h3>
                      <p className="text-sm text-stone-500 mt-0.5 truncate">{headline}</p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-stone-400 flex-shrink-0 transition-transform duration-200 ${openFeature === i ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {openFeature === i && (
                  <div className={`border-t px-6 pb-6 pt-5 grid lg:grid-cols-2 gap-6 ${accent}`}>
                    <div>
                      <p className="font-semibold text-navy-900 text-base mb-3">{headline}</p>
                      <p className="text-stone-600 text-sm leading-relaxed">{body}</p>
                      {ai && (
                        <p style={{ fontSize: '12px', color: '#4c7d47', marginTop: '8px', fontStyle: 'italic' }}>{ai}</p>
                      )}
                    </div>
                    <ul className="space-y-2.5">
                      {bullets.map(b => (
                        <li key={b} className="flex items-start gap-2.5">
                          <CheckCircle2 size={15} className={`mt-0.5 flex-shrink-0 ${iconColor}`} />
                          <span className="text-sm text-stone-700">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visual feature grid ────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Security</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance">
              Built for privacy, trust, and control.
            </h2>
            <p className="mt-4 text-stone-400 max-w-xl mx-auto text-sm leading-relaxed">
              Your data is never sold, never shared without permission, and always encrypted. We built Everstead for families — not advertisers.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {securityPoints.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className={`reveal reveal-delay-${Math.min(i + 1, 5)} bg-white/5 border border-white/10 rounded-xl p-6`}>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-sage-300" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1.5">{label}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center reveal">
            <Link to="/security" className="inline-flex items-center gap-2 text-stone-300 text-sm font-medium hover:text-white transition-colors">
              Read our full security practices <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Who it's for ───────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Who it's for</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              Everstead works for everyone in a family plan.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whoItsFor.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`reveal reveal-delay-${i + 1} bg-white border border-stone-200 rounded-2xl p-6`}>
                <div className="w-11 h-11 rounded-2xl bg-navy-50 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-navy-700" />
                </div>
                <h3 className="font-semibold text-navy-950 text-sm mb-2">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-stone-50 border-y border-stone-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">How we compare</p>
            <h2 className="font-display text-4xl font-light text-navy-950 text-balance">
              Better than a spreadsheet. More accessible than a solicitor.
            </h2>
            <p className="mt-4 text-stone-500 text-sm max-w-xl mx-auto leading-relaxed">
              Spreadsheets get lost. Solicitors hold documents you can't access yourself. Everstead gives families a living, secure, accessible plan.
            </p>
          </div>

          <div className="reveal bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="grid grid-cols-4 border-b border-stone-100 bg-stone-50">
              <div className="p-4 col-span-1" />
              {[
                { label: 'Everstead', highlight: true },
                { label: 'Spreadsheet', highlight: false },
                { label: 'Solicitor', highlight: false },
              ].map(({ label, highlight }) => (
                <div key={label} className="p-4 text-center" style={highlight ? { background: 'linear-gradient(100deg, #2d5082 0%, #6f6bc6 50%, #6e9b6a 100%)' } : undefined}>
                  <span className={`text-xs font-semibold ${highlight ? 'text-white' : 'text-stone-500'}`}>{label}</span>
                </div>
              ))}
            </div>
            {comparison.map(({ point, us, spreadsheet, solicitor }, i) => (
              <div key={point} className={`grid grid-cols-4 ${i < comparison.length - 1 ? 'border-b border-stone-100' : ''}`}>
                <div className="p-4 text-sm text-stone-600">{point}</div>
                {[us, spreadsheet, solicitor].map((val, j) => (
                  <div key={j} className={`p-4 flex items-center justify-center ${j === 0 ? 'bg-navy-950/[0.03]' : ''}`}>
                    {val
                      ? <CheckCircle2 size={16} className={j === 0 ? 'text-sage-600' : 'text-stone-400'} />
                      : <span className="w-4 h-0.5 bg-stone-200 rounded-full" />
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Stories</p>
            <h2 className="font-display text-4xl font-light text-navy-950">What families say.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, name, role }, i) => (
              <div key={name} className={`reveal reveal-delay-${i + 1} bg-white border border-stone-200 rounded-2xl p-7`}>
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-amber-400 fill-amber-400" />)}
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

      {/* ── Readiness callout ──────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-white border-y border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="reveal aurora-field aurora-dim rounded-3xl border border-navy-800 p-8 lg:p-12 grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: score mock */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-400 font-medium">Plan readiness</p>
                  <p className="text-4xl font-semibold text-white mt-1">76%</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <defs>
                      <linearGradient id="featReadiness" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#2d5082" />
                        <stop offset="0.5" stopColor="#6f6bc6" />
                        <stop offset="1" stopColor="#6e9b6a" />
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="url(#featReadiness)" strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 26 * 0.76} ${2 * Math.PI * 26 * 0.24}`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: '18 accounts documented', done: true },
                  { label: '4 trusted contacts assigned', done: true },
                  { label: 'Funeral preferences complete', done: true },
                  { label: 'Emergency vault configured', done: true },
                  { label: 'Review will document', done: false },
                  { label: 'Add property insurance policy', done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-sage-500' : 'bg-white/10 border border-white/20'}`}>
                      {item.done && <CheckCircle2 size={9} className="text-white" />}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-stone-300' : 'text-stone-500'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-stone-400">Last updated today</span>
                <span className="text-xs text-sage-400 font-medium">2 items need attention →</span>
              </div>
            </div>
            {/* Right: copy */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Readiness score</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-white leading-tight text-balance">
                A clear measure of how prepared your family is.
              </h2>
              <p className="mt-4 text-stone-300 text-sm leading-relaxed">
                The readiness score tracks your plan across every section. Smart prompts tell you what's missing, outdated, or needs a second look — so you can always answer "yes, everything is in order."
              </p>
              <ul className="mt-6 space-y-2.5">
                {['Tracks completeness across all sections', 'Highlights missing or outdated items', 'Periodic review reminders', 'Peace of mind, measurable'].map(b => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-stone-300">
                    <Zap size={13} className="text-sage-400 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Legal clarity ──────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-stone-50">
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

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-6 text-center reveal">
          <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance leading-tight">
            Give your family clarity, not chaos.
          </h2>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed">
            It takes minutes to start. It takes one crisis to wish you had.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="btn-aurora inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full"
            >
              Start Your Everstead <ArrowRight size={16} />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-7 py-3.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">
              View pricing
            </Link>
          </div>
          <p className="mt-5 text-xs text-stone-500">14-day free trial · Card required · No charge until trial ends · Cancel anytime</p>
        </div>
      </section>

    </div>
    </>
  )
}
