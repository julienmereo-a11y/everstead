import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import {
  ArrowRight, Users, Heart, User, BookOpen, Briefcase,
  CheckCircle2, XCircle, FileText, Bell, Lock, ClipboardList,
  Shield, Eye, Star, Clock, FolderOpen,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const cases = {
  families: {
    icon: Users,
    color: 'navy',
    title: 'For Families',
    hero: 'Make sure loved ones know where everything is — and what to do first.',
    tagline: 'When the worst happens, confusion costs more than money.',
    body: "When a family member passes or becomes incapacitated, the people left behind face a wave of urgent decisions with almost no information to guide them. Where are the bank accounts? Who is the solicitor? What was on direct debit? Everstead gives you one organised place to answer all of it — before it's needed.",
    scenario: "Imagine your partner dies suddenly on a Tuesday. By Thursday you're being asked for account numbers, insurance policies, and the name of their pension provider. You have no idea where to start. That disorientation — the paperwork chaos on top of grief — is what Everstead is built to prevent.",
    painPoints: [
      'Accounts scattered across banks with no single record',
      'Documents in physical folders that no one can find',
      'No clear first steps for whoever has to manage the estate',
      'Subscriptions continuing to charge for months after death',
      'Relatives disagreeing because wishes were never written down',
    ],
    benefits: [
      'A single place for all accounts, documents, and contacts',
      'First-steps checklist your family can follow immediately',
      'Document access granted to the right people in advance',
      'Subscription and recurring cost inventory',
      'Final wishes and personal messages, clearly recorded',
      'Emergency vault access for urgent situations',
    ],
    features: [
      {
        icon: FolderOpen,
        title: 'Document vault',
        body: 'Upload wills, insurance policies, and property deeds. Tagged and accessible — no searching through physical folders.',
      },
      {
        icon: ClipboardList,
        title: 'First-steps instructions',
        body: 'Write a step-by-step guide for your executor or family, in your own words. They see it the moment they log in.',
      },
      {
        icon: Bell,
        title: 'Trusted access',
        body: "Invite a family member with read-only access to specific sections. They can't edit anything — only view what you've shared.",
      },
    ],
    quote: '"We had no idea where my mother kept anything — her bank, her pension, even her will. We spent six months piecing it together. Everstead would have changed everything."',
    quoteAuthor: '— Adult child and estate executor',
    ctaText: 'Set up your family plan',
    ctaNote: '14-day free trial · Card required · No charge until trial ends',
  },

  parents: {
    icon: Heart,
    color: 'sage',
    title: 'For Parents',
    hero: 'Leave guidance, not guesswork, for every practical and personal decision.',
    tagline: 'Your children will need to know. Make it easy for them.',
    body: "Parents carry both practical responsibilities and personal wishes they want their children to understand. The financial and logistical side is only half of it — the other half is the guidance only you can give. Everstead lets you record both, clearly and privately, so nothing important is left unsaid.",
    scenario: "Your children are adults. They know you love them. But if something happened tomorrow, would they know who your pension is with? Who your solicitor is? What your wishes are for your funeral? Would they know what you'd want for your grandchildren? Everstead is the place you put all of that down.",
    painPoints: [
      'No single record of financial accounts and policies',
      "Children don't know where important documents are kept",
      'Personal wishes never formally written down',
      'Guardian preferences for pets and dependants unrecorded',
      'Digital accounts and passwords inaccessible',
    ],
    benefits: [
      'Record where key documents and accounts are stored',
      'Leave personal letters and messages for specific family members',
      'Assign guardianship and care preferences for dependants and pets',
      'Document digital accounts and subscriptions clearly',
      'Update your plan as life changes without starting over',
      'Set access levels so children see only what you choose',
    ],
    features: [
      {
        icon: Heart,
        title: 'Personal messages',
        body: "Write letters to each of your children — or to your grandchildren for milestones you might not be there for. Private, stored, and delivered when it counts.",
      },
      {
        icon: Shield,
        title: 'Granular access control',
        body: "Share your financial section with one child and your personal wishes with another. Each trusted person only sees what you've chosen.",
      },
      {
        icon: ClipboardList,
        title: 'Guardianship and care notes',
        body: 'Record your preferences for dependants, pets, and care situations — the kind of guidance a will often leaves out.',
      },
    ],
    quote: '"The hardest part wasn\'t the grief. It was the dozen practical decisions we had to make without knowing what she would have wanted. That\'s the part I\'m determined not to leave for my children."',
    quoteAuthor: '— Parent planning ahead',
    ctaText: 'Start building your plan',
    ctaNote: '14-day free trial · Set up in under an hour',
  },

  'aging-adults': {
    icon: User,
    color: 'stone',
    title: 'For Aging Adults',
    hero: 'Organise your affairs with dignity — on your own terms.',
    tagline: "It's not about the end. It's about being prepared.",
    body: "Organising your affairs doesn't have to feel final. It's one of the most considerate things you can do for the people you love. Everstead gives you complete control over what you share, who sees it, and how your wishes are expressed — without any technical knowledge required.",
    scenario: "You've thought about getting your affairs in order for a while. But it feels like a big job — and maybe a bit morbid. Everstead lets you go at your own pace. Add your current account this week. Upload your will next month. Invite your daughter when you're ready. There's no rush and nothing is ever final until you say so.",
    painPoints: [
      'Feels overwhelming to start — no clear place to begin',
      "Reluctant to involve family before you're ready",
      'Concerned about who can see sensitive financial information',
      'Worried that technology will be too complicated',
      'Not sure what actually needs to be documented',
    ],
    benefits: [
      'Gradual setup — add a little at a time, no pressure',
      'Assign a trusted family member with limited, specific access',
      'Clearly record medical preferences and care wishes',
      'Emergency vault for immediate access when needed',
      'Simple design — no technical expertise required',
      'You stay in full control of who sees what, always',
    ],
    features: [
      {
        icon: Lock,
        title: 'You control access',
        body: "Nothing is shared unless you choose to share it. Invite someone today, revoke their access tomorrow. Always your decision.",
      },
      {
        icon: Bell,
        title: 'Emergency access',
        body: "Set a trusted person as an emergency contact. If something happens suddenly, they can access the vault immediately — with everything they need.",
      },
      {
        icon: Eye,
        title: 'Simple, guided setup',
        body: "Everstead walks you through what to document, step by step. No technical knowledge needed. Add things gradually at your own pace.",
      },
    ],
    quote: '"I finally feel like I\'ve taken care of something important. My children won\'t be left wondering. That\'s the peace of mind I was looking for."',
    quoteAuthor: '— Everstead user, age 71',
    ctaText: 'Get started at your own pace',
    ctaNote: '14-day free trial · No technical expertise needed',
  },

  executors: {
    icon: BookOpen,
    color: 'amber',
    title: 'For Executors',
    hero: 'A clear, organised starting point for a complex responsibility.',
    tagline: 'Being named executor is an honour. It can also be overwhelming.',
    body: "When someone names you as their executor, they're trusting you with an enormous responsibility — often at an already difficult time. The challenge isn't the intent; it's the information. Where are the accounts? What's outstanding? Who needs to be contacted and in what order? Everstead gives executors a structured, complete starting point.",
    scenario: "You've been named executor for a close friend. You're grieving, you're managing your own family, and you're now responsible for closing out a financial life — bank accounts, pensions, property, direct debits — with almost no guidance on where to start. Everstead is the organised handover that makes that possible.",
    painPoints: [
      'No single record of accounts, assets, or policies',
      'Documents scattered across physical and digital locations',
      'Unclear what order to do things or who to contact first',
      'Subscriptions continuing to charge after death',
      'No audit trail for decisions made during the process',
    ],
    benefits: [
      'Organised account and asset inventory from the start',
      'Documents already uploaded, tagged, and accessible',
      'Step-by-step instruction sequences to follow',
      'Contact list with roles and relationships clearly labelled',
      'Subscription and recurring bill inventory for fast cancellation',
      'Audit history for transparent record-keeping',
    ],
    features: [
      {
        icon: ClipboardList,
        title: 'Step-by-step instructions',
        body: "The plan owner writes exactly what they want you to do first, second, and third. You arrive with a checklist, not a blank page.",
      },
      {
        icon: FolderOpen,
        title: 'Everything in one place',
        body: "Accounts, documents, contacts, subscriptions — all organised in a single structured plan. No searching across filing cabinets and email inboxes.",
      },
      {
        icon: Shield,
        title: 'Audit trail',
        body: 'Every access event is logged and timestamped. Transparent record-keeping for everything you view, download, or reference.',
      },
    ],
    quote: '"As executor for three estates in my career, I\'ve learned that organisation is everything. The difference between a plan in Everstead and a folder of loose paperwork is enormous."',
    quoteAuthor: '— Estate attorney',
    ctaText: 'Help someone prepare now',
    ctaNote: '14-day free trial · Share the link with someone who needs this',
  },

  advisors: {
    icon: Briefcase,
    color: 'indigo',
    title: 'For Advisors & Professionals',
    hero: 'Offer estate organisation as a genuine client service.',
    tagline: 'The gap between legal planning and practical preparation is where clients need you most.',
    body: "Financial advisors, estate attorneys, and wealth managers help clients plan their futures — but practical estate organisation often falls through the gap. Everstead gives professionals the tools to bridge that gap: collaborative access, client progress visibility, and a structured framework that turns intentions into an organised plan.",
    scenario: "You've had the conversation. The client has a will, pension nominations are updated, and the IHT strategy is in place. But if something happened tomorrow, would their family know where anything is? Would your firm be called at 8pm by a bereaved spouse asking where to start? Everstead is the practical layer that makes your advice actionable.",
    painPoints: [
      "Clients have plans but no organised record of where things actually are",
      'Families left without a clear starting point despite professional advice',
      'No structured handover between advisor and client estate',
      'Difficult to verify that clients have followed through on action items',
      "Your firm's value isn't visible until it's too late to demonstrate it",
    ],
    benefits: [
      'Multi-client workspace to manage multiple client plans',
      'Co-branded client portal under your firm identity',
      'Collaborative access to specific plan sections',
      'Client progress and readiness dashboards',
      'Streamlined onboarding and plan completion flows',
      'White-label options for enterprise practices',
    ],
    features: [
      {
        icon: Users,
        title: 'Multi-client workspace',
        body: "Manage plans for all your clients from a single advisor dashboard. See readiness scores, completion status, and recent activity at a glance.",
      },
      {
        icon: Eye,
        title: 'Selective collaboration',
        body: "Access only the sections your client has chosen to share with you. They stay in control. You get the visibility you need to advise effectively.",
      },
      {
        icon: Briefcase,
        title: 'Your brand, your service',
        body: "White-label options available for practices that want to offer Everstead under their own firm identity — as a genuine value-add service.",
      },
    ],
    quote: '"This has become a genuine value-add for my practice. Clients appreciate that I\'m helping them prepare practically, not just on paper. The conversations are better, and the outcomes are too."',
    quoteAuthor: '— Certified Financial Planner',
    ctaText: 'Book a demo for your practice',
    ctaHref: '/book-demo',
    ctaNote: 'Advisor plans available for practices of all sizes',
  },
}

const allCases = [
  { slug: 'families',      label: 'For Families' },
  { slug: 'parents',       label: 'For Parents' },
  { slug: 'aging-adults',  label: 'For Aging Adults' },
  { slug: 'executors',     label: 'For Executors' },
  { slug: 'advisors',      label: 'For Advisors & Professionals' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Individual use-case page
// ─────────────────────────────────────────────────────────────────────────────

function UseCasePage({ slug }) {
  const data = cases[slug]
  if (!data) return <div className="py-40 text-center text-stone-500">Use case not found.</div>

  const {
    icon: Icon, title, hero, tagline, body, scenario,
    painPoints, benefits, features, quote, quoteAuthor,
    ctaText, ctaNote, ctaHref,
  } = data

  useReveal()

  return (
    <div className="bg-stone-50 pt-24">

      {/* Hero */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-6 animate-fade-in">
            <Icon size={28} className="text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">{title}</p>
          <h1 className="font-display text-4xl lg:text-5xl xl:text-6xl font-light text-white leading-tight text-balance animate-fade-up mb-5">
            {hero}
          </h1>
          <p className="text-stone-300 text-lg font-light animate-fade-in">{tagline}</p>
        </div>
      </section>

      {/* Scenario + pain points */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">The situation</p>
            <h2 className="font-display text-2xl lg:text-3xl font-light text-navy-950 leading-snug mb-6">{body}</h2>
            <p className="text-stone-600 leading-relaxed text-base italic border-l-2 border-sage-300 pl-5">
              {scenario}
            </p>
          </div>
          <div className="reveal reveal-delay-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">What goes wrong without it</p>
            <ul className="space-y-3">
              {painPoints.map(p => (
                <li key={p} className="flex items-start gap-3">
                  <XCircle size={17} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-stone-700 text-sm leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What Everstead provides */}
      <section className="py-16 lg:py-20 bg-white border-y border-stone-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-xl mb-10 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-3">With Everstead</p>
            <h2 className="font-display text-2xl lg:text-3xl font-light text-navy-950">What changes when your plan is organised</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <div key={b} className={`reveal reveal-delay-${i + 1} flex items-start gap-3 bg-stone-50 rounded-xl border border-stone-100 p-5`}>
                <CheckCircle2 size={17} className="text-sage-500 flex-shrink-0 mt-0.5" />
                <span className="text-stone-700 text-sm leading-relaxed">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature spotlight */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-10 reveal">Key features for {title.toLowerCase().replace('for ', '')}</p>
          <div className="grid lg:grid-cols-3 gap-8">
            {features.map(({ icon: FIcon, title: fTitle, body: fBody }, i) => (
              <div key={fTitle} className={`reveal reveal-delay-${i + 1}`}>
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                  <FIcon size={20} className="text-navy-700" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2 text-base">{fTitle}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{fBody}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-16 lg:py-20 bg-sage-50 border-y border-sage-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <div className="flex justify-center gap-0.5 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill="currentColor" className="text-amber-400" />
            ))}
          </div>
          <p className="font-display text-xl lg:text-2xl font-light text-navy-950 italic leading-relaxed text-balance">{quote}</p>
          <p className="mt-5 text-stone-500 text-sm">{quoteAuthor}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-4 text-balance">
            Ready to get organised?
          </h2>
          <p className="text-stone-500 mb-8 text-base leading-relaxed">
            It takes about 45 minutes to build a complete plan. Your family will have everything they need.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={ctaHref || '/get-started'}
              className="inline-flex items-center justify-center gap-2 bg-navy-800 text-white font-semibold text-sm px-7 py-3.5 rounded-lg hover:bg-navy-700 transition-colors"
            >
              {ctaText} <ArrowRight size={15} />
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center justify-center gap-2 bg-white text-navy-800 font-semibold text-sm px-7 py-3.5 rounded-lg border border-stone-200 hover:border-navy-300 hover:bg-stone-50 transition-colors"
            >
              See how it works
            </Link>
          </div>
          {ctaNote && (
            <p className="mt-4 text-stone-400 text-xs">{ctaNote}</p>
          )}
        </div>
      </section>

      {/* Other use cases */}
      <section className="py-16 lg:py-20 bg-white border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="font-display text-xl font-light text-navy-950 mb-7 reveal">Explore other use cases</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allCases.filter(c => c.slug !== slug).map((c, i) => {
              const d = cases[c.slug]
              const CIcon = d.icon
              return (
                <Link
                  key={c.slug}
                  to={`/use-cases/${c.slug}`}
                  className={`reveal reveal-delay-${i + 1} group block rounded-xl border border-stone-200 bg-stone-50 p-5 hover:border-navy-300 hover:bg-navy-50 transition-all`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center mb-3 group-hover:border-navy-200 transition-colors">
                    <CIcon size={15} className="text-navy-600" />
                  </div>
                  <span className="font-semibold text-sm text-navy-900 group-hover:text-navy-700 block mb-1">{c.label}</span>
                  <span className="text-xs text-navy-600 font-medium group-hover:gap-2 transition-all">Explore →</span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Index page
// ─────────────────────────────────────────────────────────────────────────────

function UseCasesIndex() {
  useReveal()
  return (
    <div className="bg-stone-50 pt-24">

      {/* Hero */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">Who it's for</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up mb-6">
            One plan. Every role in a family.
          </h1>
          <p className="text-stone-300 text-lg font-light max-w-2xl mx-auto animate-fade-in">
            Whether you're organising your own affairs, stepping in as an executor, or advising clients — Everstead is built for the role you're in.
          </p>
        </div>
      </section>

      {/* Stats row */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 grid grid-cols-3 divide-x divide-stone-100">
          {[
            { value: '45 min', label: 'Average setup time' },
            { value: '5 roles', label: 'Supported use cases' },
            { value: '14 days', label: 'Free trial, no charge until it ends' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center px-6 reveal">
              <p className="font-display text-3xl font-light text-navy-950">{value}</p>
              <p className="text-stone-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use case cards */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-6">
            {allCases.map(({ slug, label }, i) => {
              const data = cases[slug]
              const Icon = data.icon
              return (
                <Link
                  key={slug}
                  to={`/use-cases/${slug}`}
                  className={`reveal reveal-delay-${i + 1} group block bg-white border border-stone-200 rounded-2xl p-7 hover:border-navy-300 hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                      <Icon size={20} className="text-navy-700" />
                    </div>
                    <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest mt-1">Learn more →</span>
                  </div>
                  <h2 className="font-semibold text-navy-900 mb-2 group-hover:text-navy-700 transition-colors text-lg">{label}</h2>
                  <p className="text-stone-500 text-sm leading-relaxed mb-4">{data.hero}</p>
                  <p className="text-stone-400 text-xs italic leading-relaxed border-t border-stone-100 pt-4">{data.tagline}</p>
                </Link>
              )
            })}

            {/* CTA card */}
            <div className="reveal bg-gradient-to-br from-navy-900 to-navy-800 rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">Not sure where to start?</p>
                <h3 className="font-display text-xl font-light text-white mb-3">
                  Most people start as individuals and invite family later.
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed">
                  You don't need to have everything figured out. Start with what you have — one account, one document. The plan grows with you.
                </p>
              </div>
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-stone-50 transition-colors mt-7 self-start"
              >
                Get started free <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it all fits together */}
      <section className="py-16 lg:py-20 bg-white border-y border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="reveal">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">One plan, multiple people</p>
              <h2 className="font-display text-3xl font-light text-navy-950 leading-snug mb-6">
                Every role works from the same plan — with access only to what they need.
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">
                You build the plan. You decide what each trusted person can see. An executor might see the account inventory and step-by-step instructions. A family member might see personal letters and emergency contacts. An advisor might see the financial overview. Everyone gets exactly what they need — and nothing more.
              </p>
              <Link to="/how-it-works" className="inline-flex items-center gap-2 text-navy-700 font-semibold text-sm hover:text-navy-900 transition-colors">
                See how access works <ArrowRight size={14} />
              </Link>
            </div>
            <div className="reveal reveal-delay-1 space-y-3">
              {[
                { icon: Eye,          role: 'You',             desc: 'Full control. Build, edit, and manage everything.' },
                { icon: Users,        role: 'Family members',  desc: 'See accounts, documents, and instructions you share.' },
                { icon: BookOpen,     role: 'Executor',        desc: 'Step-by-step instructions and account inventory.' },
                { icon: Briefcase,    role: 'Advisor',         desc: 'Financial overview and readiness status.' },
              ].map(({ icon: RIcon, role, desc }) => (
                <div key={role} className="flex items-start gap-4 bg-stone-50 border border-stone-100 rounded-xl p-4">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                    <RIcon size={15} className="text-navy-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-sm mb-0.5">{role}</p>
                    <p className="text-stone-500 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-4 text-balance">
            Whichever role you're in — start here.
          </h2>
          <p className="text-stone-500 mb-8 leading-relaxed">
            14-day free trial. Set up in about 45 minutes. No charge until your trial ends.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/get-started" className="inline-flex items-center justify-center gap-2 bg-navy-800 text-white font-semibold text-sm px-7 py-3.5 rounded-lg hover:bg-navy-700 transition-colors">
              Get started free <ArrowRight size={15} />
            </Link>
            <Link to="/book-demo" className="inline-flex items-center justify-center gap-2 bg-white text-navy-800 font-semibold text-sm px-7 py-3.5 rounded-lg border border-stone-200 hover:border-navy-300 hover:bg-stone-50 transition-colors">
              Book a demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export default function UseCases() {
  const { slug } = useParams()
  if (slug) return <UseCasePage slug={slug} />
  return <UseCasesIndex />
}
