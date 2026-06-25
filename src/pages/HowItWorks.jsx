import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import {
  ArrowRight, CheckCircle2, ChevronDown,
  Folder, Users, ClipboardList, Bell,
  Lock, Shield, Eye, FileText, Heart,
  Clock, Star,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    id: 'step-1',
    label: 'Build your inventory',
    title: 'Start by mapping everything you own.',
    body: "Most people have more accounts than they realise — and most families can't find them when they need to. Everstead gives you a structured place to record every financial account, property, insurance policy, and digital asset. You're not uploading statements or linking bank feeds. You're creating a clear, human-readable map that a non-expert family member could follow. Prefer not to do it alone? Your AI Assistant can help — tell it about an account in plain English, or drop in a document, and it'll suggest the entry for you to review and confirm.",
    bullets: [
      'Bank accounts, savings, and ISAs',
      'Pensions — workplace, personal, and state',
      'Investments and trading accounts',
      'Property and mortgages',
      'Life, critical illness, and income protection insurance',
      'Digital assets and subscriptions',
    ],
    preview: {
      title: 'Financial accounts',
      items: [
        { label: 'Barclays current account', tag: 'Banking', done: true },
        { label: 'Vanguard stocks & shares ISA', tag: 'Investment', done: true },
        { label: 'Nest workplace pension', tag: 'Pension', done: true },
        { label: 'Halifax savings account', tag: 'Savings', done: false },
      ],
      cta: '+ Add account',
    },
    icon: Folder,
  },
  {
    number: '02',
    id: 'step-2',
    label: 'Store your documents',
    title: 'Give every important document a permanent home.',
    body: "A will that can't be found is almost as useless as not having one. The same goes for insurance policies, pension paperwork, and property deeds. Everstead's encrypted vault lets you upload originals or scanned copies, tag them, and note where physical originals are stored — so your family can find everything in one place, not in three filing cabinets and a solicitor's office. Upload a document and we'll read it for you — extracting the name, type, and expiry automatically.",
    bullets: [
      'Upload and organise your will and LPAs',
      'Store passport, ID, and birth certificate details',
      'Record insurance policy numbers and contacts',
      'Note where originals are physically stored',
      'Version history keeps older documents safe',
      'AES-256 encryption on everything you upload',
    ],
    preview: {
      title: 'Document vault',
      items: [
        { label: 'Last will and testament', tag: 'Legal', done: true },
        { label: 'Life insurance — Aviva policy', tag: 'Insurance', done: true },
        { label: 'Property deeds — 14 Elm St', tag: 'Property', done: true },
        { label: 'Lasting Power of Attorney', tag: 'Legal', done: false },
      ],
      cta: '+ Upload document',
    },
    icon: FileText,
  },
  {
    number: '03',
    id: 'step-3',
    label: 'Invite trusted people',
    title: 'Decide who sees what — and when.',
    body: "This is what makes Everstead different from a folder on your desktop. You invite specific people — your spouse, your executor, your solicitor — and choose exactly which sections they can see. They only get access to what you choose, and only when you grant it. Role-based permissions mean your children might see your wishes but not your financial details; your solicitor might see legal documents but nothing else.",
    bullets: [
      'Invite family members, advisers, or solicitors',
      'Set access by category — not all-or-nothing',
      'Grant emergency vault access for urgent situations',
      'Revoke or update access at any time',
      'Delegates see a clean, guided view — not the full dashboard',
      'Every access event is logged in your audit history',
    ],
    preview: {
      title: 'Trusted people',
      items: [
        { label: 'Sarah Mitchell — Spouse', tag: 'Full access', done: true },
        { label: 'James Mitchell — Son', tag: 'Wishes only', done: true },
        { label: 'Thornton & Co Solicitors', tag: 'Legal docs', done: true },
        { label: 'Add a financial adviser', tag: '', done: false },
      ],
      cta: '+ Invite someone',
    },
    icon: Users,
  },
  {
    number: '04',
    id: 'step-4',
    label: 'Write your instructions',
    title: 'Tell them what to do — step by step.',
    body: "Documents and account lists answer 'where is it?'. Instructions answer 'what do I do next?'. This is the part most people skip, and the part families say they needed most. In Everstead you can write clear, ordered guidance: who to call first, which accounts to freeze, what your funeral preferences are, what to do with the dog. Not sure where to start? We'll help you write it — just tell us the basics and we'll find the words.",
    bullets: [
      'Write step-by-step instructions in plain language',
      'Record funeral and burial preferences',
      'Leave messages for individual family members',
      'Specify what happens to sentimental possessions',
      'Include contact details for key professionals',
      'Add anything else you want them to know',
    ],
    preview: {
      title: 'Instructions',
      items: [
        { label: 'First 48 hours — who to call', tag: 'Urgent', done: true },
        { label: 'Funeral and burial wishes', tag: 'Personal', done: true },
        { label: 'Message to Sarah', tag: 'Private', done: true },
        { label: 'What to do with the house', tag: 'Property', done: false },
      ],
      cta: '+ Add instruction',
    },
    icon: ClipboardList,
  },
]

const faqs = [
  {
    q: 'Can I start before I have everything organised?',
    a: "Yes — and we'd encourage it. Most people start with two or three accounts and build from there. Your readiness score shows what's complete and what's missing, so you always know where you left off. An incomplete plan is still far better than none at all.",
  },
  {
    q: 'How long does it take to set up?',
    a: "Most people complete a solid first version in 45–90 minutes. That includes adding their main accounts, uploading or noting key documents, inviting a trusted person, and writing basic instructions. The annual review — updating anything that's changed — typically takes 15–20 minutes.",
  },
  {
    q: 'What does my family actually see when they need it?',
    a: "Trusted people you've invited see a clean, guided view of only the sections you've shared with them. They don't see your full dashboard or anything you haven't explicitly granted access to. If you've enabled emergency vault access, they can request it — and you'll be notified unless you've pre-approved it.",
  },
  {
    q: 'Is this the same as writing a will?',
    a: "No. Everstead is an organisation and planning platform, not a legal service. A will is a legal document that determines how your estate is distributed — you should have one, prepared by a solicitor. Everstead is where you record everything that makes that will easier to execute: account details, document locations, contacts, and instructions your family can actually follow.",
  },
  {
    q: 'What happens to my plan if I stop paying?',
    a: "If your subscription ends, your data is retained for 30 days. You'll receive a reminder before anything is deleted, and you can export a full copy of your plan at any time from your dashboard. We will never delete your plan without warning.",
  },
  {
    q: "Can my trusted people access my plan without my knowledge?",
    a: "No. Trusted people only see what you've explicitly shared, and every access event is logged. If you enable emergency vault access, you can choose to be notified immediately when it's used. You remain in control at all times.",
  },
]

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to set up your estate plan with Everstead',
  description: 'Create a complete digital estate plan — accounts, documents, trusted contacts, and final wishes — so your family is never left guessing.',
  totalTime: 'PT1H',
  step: steps.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.title,
    text: s.body,
    url: `https://www.everstead.care/how-it-works#${s.id}`,
  })),
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function HowItWorks() {
  useReveal()

  return (
    <>
    <Helmet>
      <title>How It Works — Everstead</title>
      <meta name="description" content="See how Everstead works — organise accounts, upload documents with automatic scanning, write instructions with AI assistance, and give your family everything they need. Under an hour to set up." />
      <link rel="canonical" href="https://www.everstead.care/how-it-works" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="How It Works — Everstead" />
      <meta property="og:description" content="See how Everstead works — organise accounts, upload documents with automatic scanning, write instructions with AI assistance, and give your family everything they need. Under an hour to set up." />
      <meta property="og:url" content="https://www.everstead.care/how-it-works" />
      <meta property="og:image" content="https://www.everstead.care/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
    </Helmet>
    <div className="bg-stone-50 pt-24">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">
            How it works
          </p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            Set up in an afternoon.<br className="hidden lg:block" /> Peace of mind that lasts.
          </h1>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">
            Four steps. Under an hour. Everything your family needs to know — organised, encrypted, and ready when they need it.
          </p>

          {/* Time / effort stats */}
          <div className="mt-12 inline-grid grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10 animate-fade-up animate-delay-200">
            {[
              { value: '45 min', label: 'Average setup time' },
              { value: '15 min', label: 'Annual review' },
              { value: '14 days', label: 'Free trial' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/5 px-8 py-5 text-center">
                <p className="font-display text-2xl font-light text-white">{value}</p>
                <p className="text-xs text-stone-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STEP INDICATOR ────────────────────────────────────────── */}
      <div className="bg-navy-950 border-b border-white/5 sticky top-16 z-10 hidden lg:block">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-center gap-0">
            {steps.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-3 px-6 py-4 text-sm text-stone-400 hover:text-white transition-colors group"
              >
                <span className="w-6 h-6 rounded-full border border-stone-600 group-hover:border-sage-400 flex items-center justify-center text-xs font-bold transition-colors">
                  {i + 1}
                </span>
                <span className="font-medium">{s.label}</span>
                {i < steps.length - 1 && (
                  <ArrowRight size={12} className="ml-3 text-stone-600" />
                )}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── STEPS ─────────────────────────────────────────────────── */}
      {steps.map((step, i) => {
        const isEven = i % 2 === 0
        return (
          <section
            key={step.id}
            id={step.id}
            className={`py-24 lg:py-32 ${isEven ? 'bg-stone-50' : 'bg-white'} border-b border-stone-100`}
          >
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
              <div className={`grid lg:grid-cols-2 gap-16 items-center ${!isEven ? 'lg:[&>*:first-child]:order-2' : ''}`}>

                {/* Copy */}
                <div className="reveal">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-display text-5xl font-light text-stone-200 leading-none">{step.number}</span>
                    <div className="w-8 h-px bg-stone-300" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-navy-500">{step.label}</span>
                  </div>

                  <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 leading-snug text-balance mb-5">
                    {step.title}
                  </h2>

                  <p className="text-stone-600 leading-relaxed mb-8">
                    {step.body}
                  </p>

                  <ul className="space-y-2.5">
                    {step.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2.5">
                        <CheckCircle2 size={15} className="text-sage-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-stone-600">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preview card */}
                <div className="reveal reveal-delay-1">
                  <div className="bg-navy-950 rounded-2xl overflow-hidden shadow-2xl border border-navy-800">
                    {/* Card header */}
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                      </div>
                      <div className="flex-1 mx-3 bg-white/5 rounded-md px-3 py-1 text-xs text-stone-500">
                        everstead.care/dashboard
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-5">
                        <p className="text-sm font-semibold text-white">{step.preview.title}</p>
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                          <step.icon size={13} className="text-stone-400" />
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {step.preview.items.map((item, j) => (
                          <div
                            key={j}
                            className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all ${
                              item.done
                                ? 'bg-white/5 border border-white/10'
                                : 'bg-white/[0.02] border border-dashed border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                item.done ? 'bg-sage-500' : 'border border-white/20'
                              }`}>
                                {item.done && <CheckCircle2 size={10} className="text-white" />}
                              </div>
                              <span className={`text-sm ${item.done ? 'text-stone-300' : 'text-stone-500'}`}>
                                {item.label}
                              </span>
                            </div>
                            {item.tag && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                item.done
                                  ? 'bg-white/10 text-stone-400'
                                  : 'bg-white/5 text-stone-600'
                              }`}>
                                {item.tag}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <button className="mt-4 w-full text-left text-xs text-sage-400 font-medium px-4 py-2.5 rounded-xl border border-dashed border-sage-800 hover:border-sage-600 transition-colors">
                        {step.preview.cta}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
        )
      })}

      {/* ── WHAT YOUR FAMILY SEES ─────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5">The other side</p>
              <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance leading-tight mb-6">
                What your family sees when they need it.
              </h2>
              <p className="text-stone-300 leading-relaxed mb-8">
                When a trusted person you've invited logs in, they don't see your full dashboard. They see a clean, guided view of exactly what you've shared with them — organised by category, with clear instructions at the top.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: Eye,       text: "They only see the sections you've explicitly shared — nothing else." },
                  { icon: ClipboardList, text: 'Your step-by-step instructions appear at the top, in the order you wrote them.' },
                  { icon: Bell,      text: 'Emergency vault access can be granted instantly if you choose to enable it.' },
                  { icon: Shield,    text: 'Every access event is logged — you always know who viewed what and when.' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-sage-400" />
                    </div>
                    <p className="text-stone-300 text-sm leading-relaxed">{text}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Delegate view mockup */}
            <div className="reveal reveal-delay-1">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-white/5 border-b border-white/10 px-6 py-4">
                  <p className="text-xs text-stone-400 font-medium">Trusted person view — Sarah Mitchell</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-sage-900/40 border border-sage-700/40 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-sage-400 mb-1">Start here — James's instructions</p>
                    <p className="text-xs text-stone-400">Step 1: Call Thornton & Co Solicitors on 020 7123 4567…</p>
                  </div>
                  {[
                    { label: 'Financial accounts', count: '12 accounts', icon: Folder, shared: true },
                    { label: 'Important documents', count: '8 documents', icon: FileText, shared: true },
                    { label: 'Final wishes', count: '3 items', icon: Heart, shared: true },
                    { label: 'Personal messages', count: 'Private — for you', icon: Lock, shared: true },
                  ].map(({ label, count, icon: Icon, shared }) => (
                    <div key={label} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                          <Icon size={13} className="text-stone-400" />
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{label}</p>
                          <p className="text-xs text-stone-500">{count}</p>
                        </div>
                      </div>
                      <ArrowRight size={13} className="text-stone-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIME BREAKDOWN ────────────────────────────────────────── */}
      <section className="py-24 lg:py-28 bg-stone-50 border-b border-stone-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-500 mb-4">The time investment</p>
            <h2 className="font-display text-4xl font-light text-navy-950 text-balance">
              What a typical setup looks like.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 reveal">
            {[
              {
                time: '45 min',
                label: 'First session',
                desc: 'Add your main accounts, upload or note your key documents, invite one trusted person, write your first instruction.',
                color: 'bg-navy-50 border-navy-200',
                textColor: 'text-navy-700',
              },
              {
                time: '15 min',
                label: 'Annual review',
                desc: 'We send a reminder once a year. Update anything that\'s changed — new accounts, new addresses, updated wishes.',
                color: 'bg-sage-50 border-sage-200',
                textColor: 'text-sage-700',
              },
              {
                time: 'As needed',
                label: 'Ongoing updates',
                desc: 'Add accounts as you open them. Update documents when they change. Grant or revoke access whenever you need to.',
                color: 'bg-stone-100 border-stone-200',
                textColor: 'text-stone-600',
              },
            ].map(({ time, label, desc, color, textColor }) => (
              <div key={label} className={`rounded-2xl border p-6 ${color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className={textColor} />
                  <span className={`text-xs font-semibold uppercase tracking-widest ${textColor}`}>{label}</span>
                </div>
                <p className={`font-display text-3xl font-light mb-3 ${textColor}`}>{time}</p>
                <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-white border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-500 mb-4">Questions</p>
            <h2 className="font-display text-4xl font-light text-navy-950">Common questions.</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} delay={i + 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-6 text-center reveal">
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance mb-4">
            Ready to start your plan?
          </h2>
          <p className="text-stone-300 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Join families who've given their loved ones the clarity they deserve. Your 14-day free trial starts the moment you sign up.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="btn-aurora inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full"
            >
              Start Your Everstead <ArrowRight size={15} />
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-7 py-3.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors"
            >
              Explore all features
            </Link>
          </div>
          <p className="text-stone-500 text-xs mt-5">14-day free trial · No charge until it ends · Cancel anytime</p>
        </div>
      </section>

    </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ ITEM
// ─────────────────────────────────────────────────────────────────────────────
function FaqItem({ q, a, delay }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`reveal reveal-delay-${Math.min(delay, 5)} border border-stone-200 rounded-xl overflow-hidden bg-white`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left flex items-start justify-between gap-4 px-6 py-5"
      >
        <span className="font-medium text-navy-900 text-sm leading-snug">{q}</span>
        <ChevronDown size={16} className={`text-stone-400 mt-0.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">{a}</div>
      )}
    </div>
  )
}
