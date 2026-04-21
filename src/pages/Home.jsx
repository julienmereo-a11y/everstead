import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import {
  ShieldCheck, Lock, Users, FileText, CheckCircle2, ArrowRight,
  Star, ChevronDown, Folder, Bell, Share2, ClipboardList, BookOpen, Heart,
  AlertCircle, CreditCard, Clock, UserCircle
} from 'lucide-react'

const trustItems = [
  { icon: Lock, label: 'Bank-level encryption' },
  { icon: ShieldCheck, label: 'Private sharing controls' },
  { icon: Users, label: 'Trusted by families & advisors' },
  { icon: FileText, label: 'Secure document storage' },
  { icon: ClipboardList, label: 'Guided planning workflows' },
]

const painPoints = [
  'Families don\'t know where documents are',
  'Accounts and subscriptions are hard to find',
  'Executors lose time chasing details',
  'Wishes are unclear or unrecorded',
  'Digital assets become inaccessible',
]

const featureHighlights = [
  { icon: Folder, title: 'Digital account inventory', desc: 'Organize every account — banking, investments, subscriptions, and digital assets — in one structured place.' },
  { icon: FileText, title: 'Secure document vault', desc: 'Upload, tag, and assign access to legal, financial, and personal documents with version history.' },
  { icon: ClipboardList, title: 'Step-by-step instructions', desc: 'Leave clear guidance so loved ones know exactly what to do, in what order, and who to contact.' },
  { icon: Users, title: 'People & role assignment', desc: 'Assign roles like executor, attorney, or caregiver with tailored access to only what they need.' },
  { icon: Share2, title: 'Controlled sharing', desc: 'Share by role and category. Emergency vault access with a single tap when it matters most.' },
  { icon: Heart, title: 'Final wishes', desc: 'Capture funeral preferences, personal letters, sentimental instructions, and more with care.' },
]

const steps = [
  { num: '01', title: 'Add your accounts & details', desc: 'Organize financial accounts, documents, subscriptions, and key contacts into a structured plan.' },
  { num: '02', title: 'Assign trusted people', desc: 'Give each person role-based access — only what they need, nothing more.' },
  { num: '03', title: 'Leave instructions & wishes', desc: 'Write step-by-step guidance, personal notes, and final wishes on your own terms.' },
  { num: '04', title: 'Keep it updated over time', desc: 'Smart reminders and a readiness score keep your plan current and complete.' },
]

const testimonials = [
  { quote: 'My father passed suddenly. Everstead made an incredibly painful time so much more manageable. Everything was right there.', name: 'Margaret T.', role: 'Daughter & executor' },
  { quote: 'As an estate attorney, I now recommend this to every client. It dramatically reduces the back-and-forth during settlement.', name: 'David R.', role: 'Estate attorney' },
  { quote: 'We finally have peace of mind. Our kids will know exactly what to do and where to find everything.', name: 'James & Carol B.', role: 'Parents, married 34 years' },
]

const plans = [
  {
    id: 'essential',
    name: 'Essential',
    monthly: 10,
    annual: 8,
    desc: 'For individuals getting their digital life in order.',
    features: ['Unlimited accounts & documents', 'Step-by-step instructions', '2 trusted contacts', 'Readiness score', '5 GB storage'],
    cta: 'Start free',
    highlight: false,
  },
  {
    id: 'family',
    name: 'Family',
    monthly: 15,
    annual: 12,
    desc: 'For households planning together with shared clarity.',
    features: ['Everything in Essential', 'Household members included', 'Up to 10 trusted contacts', 'Emergency vault sharing', '25 GB storage', 'Family readiness score'],
    cta: 'Start free',
    highlight: true,
  },
  {
    id: 'advisor',
    name: 'Advisor',
    monthly: 60,
    annual: 48,
    desc: 'For professionals managing client estate organization.',
    features: ['Everything in Family', 'Multi-client workspace', 'Co-branded client portal', 'Advisor collaboration tools', 'Priority support', 'White-label options'],
    cta: 'Book a demo',
    highlight: false,
  },
]

const faqs = [
  { q: 'Is my information actually secure?', a: 'Yes. All data is encrypted at rest and in transit with AES-256 encryption. Role-based access ensures only people you authorize can see specific sections. We never sell your data.' },
  { q: 'What happens to my account if I pass away?', a: 'You assign trusted people in advance. When the time comes, they access only the sections you\'ve shared with them — on their own timeline, at their own pace.' },
  { q: 'Can I start before I have everything organized?', a: 'Absolutely. Most people start with just a few accounts and build over time. Our readiness score shows progress and highlights what\'s still missing.' },
  { q: 'Is this a legal document service?', a: 'No. Everstead is an organisation and planning platform — not a legal service. It does not draft wills, prepare legal documents, give legal or financial advice, or replace a solicitor, estate lawyer, accountant, or family advisor. It helps families organise information, instructions, and controlled access in one place.' },
]

const proofStats = [
  { value: '14 days', label: 'Free trial to get organized' },
  { value: 'Role-based', label: 'Access control for family and executors' },
  { value: '24/7', label: 'Access to your plan when it matters' },
]

const assuranceBadges = [
  { icon: ShieldCheck, label: 'Equal security across all plans' },
  { icon: Lock, label: 'Encrypted document and account storage' },
  { icon: FileText, label: 'Privacy-first handling and export-ready backups' },
]

const resourceCards = [
  { icon: BookOpen, title: 'Executor starter guide', desc: 'A practical guide to the first steps families face after a death.', href: '/resources/guides' },
  { icon: ClipboardList, title: 'Estate planning checklist', desc: 'Use the same checklist structure reflected inside the dashboard.', href: '/resources/checklists' },
  { icon: FileText, title: 'Security and privacy overview', desc: 'See how Everstead handles permissions, encryption, and data access.', href: '/security' },
]

export default function Home() {
  useReveal()
  const [annualPricing, setAnnualPricing] = useState(true)

  return (
    <div className="bg-stone-50">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-screen flex flex-col justify-center pt-24 pb-20">
        {/* Flat deep navy base */}
        <div className="absolute inset-0" style={{ backgroundColor: '#0d1628' }} />
        {/* Grid pattern — matches reference */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-xs text-stone-200 font-medium mb-8 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
              Trusted by families and estate advisors
            </div>

            <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl font-light text-white leading-[1.08] tracking-tight text-balance animate-fade-up">
              Put your digital life in order, so your family is not left guessing.
            </h1>

            <p className="mt-6 text-lg text-stone-300 leading-relaxed max-w-xl animate-fade-up animate-delay-100">
              Everstead helps you securely organize accounts, documents, instructions, contacts, and final wishes in one place — so loved ones know what to do when it matters most.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 animate-fade-up animate-delay-200">
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Get Started Free
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
              No credit card required · Cancel anytime
            </p>
          </div>

          {/* Dashboard preview card */}
          <div className="animate-fade-up animate-delay-300">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-stone-400 font-medium">Plan readiness</p>
                  <p className="text-2xl font-semibold text-white mt-0.5">76%</p>
                </div>
                <div className="w-14 h-14 relative">
                  <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#6ea6d8" strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 22 * 0.76} ${2 * Math.PI * 22 * 0.24}`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: '18 accounts documented', done: true },
                  { label: '4 important contacts assigned', done: true },
                  { label: 'Funeral preferences completed', done: true },
                  { label: 'Emergency vault shared with spouse', done: true },
                  { label: 'Review will document', done: false },
                  { label: 'Add property insurance policy', done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-sage-500' : 'bg-white/10 border border-white/20'}`}>
                      {item.done && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-stone-300' : 'text-stone-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-stone-400">Last updated today</span>
                <span className="text-xs text-sage-400 font-medium">2 items need attention →</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-stone-400 animate-bounce">
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone-100 py-6">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-8 lg:gap-12">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-stone-500">
                <Icon size={16} className="text-navy-600 flex-shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
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
            <h2 className="font-display text-4xl lg:text-6xl font-bold text-white leading-tight text-balance mb-6">
              When someone dies, the hardest part is often the paperwork, passwords, and unanswered questions.
            </h2>
            <p className="text-stone-400 text-lg leading-relaxed max-w-2xl mx-auto">
              Families face a painful second burden — finding documents, identifying accounts, understanding wishes.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: AlertCircle,
                title: "Documents can't be found",
                desc: "Family members don't know where documents are — wills, insurance, contracts, property records."
              },
              {
                icon: CreditCard,
                title: "Accounts go undiscovered",
                desc: "Subscriptions, crypto, digital accounts — assets disappear without a trace or clear record."
              },
              {
                icon: Clock,
                title: "Wishes were never recorded",
                desc: "Funeral preferences, personal messages, sentimental items — never written down anywhere."
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
              <h3 className="font-bold text-white text-base mb-3 leading-snug">Executors waste time chasing details</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Without a clear guide, executors spend weeks searching for scattered information.</p>
            </div>

            <div className="reveal reveal-delay-2 bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-full bg-red-900/60 flex items-center justify-center mb-5">
                <Clock size={18} className="text-red-400" />
              </div>
              <h3 className="font-bold text-white text-base mb-3 leading-snug">Costly delays and mistakes</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Active subscriptions, blocked accounts, missed deadlines — all caused by lack of clear information.</p>
            </div>

            <div className="reveal reveal-delay-3 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-5">
              <p className="text-stone-300 text-lg leading-snug">There's a better way to prepare for all of this.</p>
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
      <section className="py-24 lg:py-32 bg-navy-950 grain relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #6ea6d8 0%, transparent 60%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">One platform</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance max-w-2xl mx-auto leading-tight">
              One secure place for everything your family may need.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureHighlights.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className={`reveal reveal-delay-${Math.min(i + 1, 5)} bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 transition-colors`}
              >
                <div className="w-9 h-9 rounded-lg bg-navy-700 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-stone-300" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
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
              Simple to set up, simple to maintain.
            </h2>
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
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Who it's for</p>
            <h2 className="font-display text-4xl font-light text-navy-950 text-balance">
              Designed for every role in a family plan.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'For Families', desc: 'Make sure loved ones know where everything is and what to do first.', href: '/use-cases/families' },
              { title: 'For Parents', desc: 'Leave guidance, not guesswork, for practical and personal decisions.', href: '/use-cases/parents' },
              { title: 'For Aging Adults', desc: 'Organize with dignity and clarity while assigning trusted support.', href: '/use-cases/aging-adults' },
              { title: 'For Executors', desc: 'A clearer path through responsibilities, documents, and timing.', href: '/use-cases/executors' },
              { title: 'For Advisors', desc: 'Offer estate organization as a modern client service.', href: '/use-cases/advisors' },
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
      <section className="py-24 lg:py-32 bg-stone-50 border-y border-stone-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Security & privacy</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance leading-tight">
              Built for privacy, control, and trust.
            </h2>
            <p className="mt-5 text-stone-600 leading-relaxed">
              Every piece of information you add is encrypted, access-controlled, and never shared without your explicit permission.
            </p>
            <Link to="/security" className="inline-flex items-center gap-2 mt-8 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors">
              Read our security practices <ArrowRight size={15} />
            </Link>
          </div>
          <div className="reveal reveal-delay-1 grid grid-cols-2 gap-4">
            {[
              { icon: Lock, label: 'AES-256 encrypted storage' },
              { icon: Users, label: 'Role-based access controls' },
              { icon: BookOpen, label: 'Complete audit history' },
              { icon: Share2, label: 'Private sharing only' },
              { icon: Bell, label: 'Emergency vault access' },
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
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
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
            {plans.map(({ id, name, monthly, annual, desc, features, cta, highlight }, i) => (
              <div
                key={name}
                className={`reveal reveal-delay-${i + 1} rounded-2xl p-7 border ${
                  highlight
                    ? 'bg-white text-navy-950 border-transparent shadow-2xl'
                    : 'bg-white/5 text-stone-300 border-white/10'
                }`}
              >
                {highlight && (
                  <div className="inline-block bg-sage-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-4">Most popular</div>
                )}
                <h3 className={`font-semibold text-lg mb-1 ${highlight ? 'text-navy-900' : 'text-white'}`}>{name}</h3>
                <p className={`text-sm mb-5 ${highlight ? 'text-stone-500' : 'text-stone-400'}`}>{desc}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className={`font-display text-4xl font-light ${highlight ? 'text-navy-950' : 'text-white'}`}>£{annualPricing ? annual : monthly}</span>
                  <span className={`text-sm mb-1.5 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>/mo</span>
                </div>
                <p className={`text-xs mb-4 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>{annualPricing ? 'Billed yearly' : 'Billed monthly'}</p>
                <ul className="space-y-2.5 mb-8">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={14} className={`mt-0.5 flex-shrink-0 ${highlight ? 'text-sage-600' : 'text-sage-500'}`} />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={cta === 'Book a demo' ? '/book-demo' : `/get-started?plan=${id}&billing=${annualPricing ? 'yearly' : 'monthly'}`}
                  className={`block text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
                    highlight
                      ? 'bg-navy-800 text-white hover:bg-navy-700'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-stone-500 text-xs reveal">
            All plans include a 14-day free trial. No credit card required.{' '}
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
          <div className="grid md:grid-cols-3 gap-5">
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
              <h2 className="font-display text-3xl lg:text-4xl font-light leading-tight">Help a parent, partner, or client get organized before a crisis.</h2>
              <p className="text-sm text-stone-300 mt-3 leading-relaxed">Everstead works especially well when one family member starts the process and invites others in with the right permissions.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/get-started?plan=family&billing=yearly" className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-stone-100 transition-colors">Start a family plan <ArrowRight size={15} /></Link>
              <Link to="/book-demo" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 font-medium text-sm px-6 py-3 rounded-lg hover:bg-white/20 transition-colors">Book an advisor demo</Link>
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
              Everstead is an organisation and planning platform. It helps you store references to documents, record instructions, and share access with trusted people. It does <strong>not</strong> draft wills, prepare legal instruments, give legal or financial advice, or replace a solicitor, estate lawyer, accountant, or family advisor. If you need legal or financial guidance, please consult a qualified professional.
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

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Questions</p>
            <h2 className="font-display text-4xl font-light text-navy-950">Frequently asked.</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(({ q, a }, i) => (
              <FaqItem key={i} q={q} a={a} delay={i + 1} />
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
            Give your family clarity, not chaos.
          </h2>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed">
            Start your plan today. It takes minutes to begin — and a lifetime of peace of mind in return.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-7 py-3.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Start your checklist free
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/book-demo"
              className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-7 py-3.5 rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
            >
              Book an advisor demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FaqItem({ q, a, delay }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className={`reveal reveal-delay-${Math.min(delay, 5)} border border-stone-200 rounded-xl overflow-hidden bg-white`}>
      <button
        onClick={() => setOpen(v => !v)}
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
