import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import NotFound from './NotFound'

// ─────────────────────────────────────────────────────────────────────────────
// Competitor data — add new entries here to create new comparison pages
// ─────────────────────────────────────────────────────────────────────────────
const competitors = {
  farewill: {
    name: 'Farewill',
    category: 'Will writing & probate',
    tagline: 'Everstead vs Farewill',
    headline: 'Farewill writes your will. Everstead organises your whole life.',
    subhead: 'Farewill is a will-writing service. Everstead is a secure personal vault — a living, updated record of your accounts, documents, and wishes that\'s useful today and ready for your family when it counts.',
    eversteadDesc: 'A secure personal vault for organising everything that matters — accounts, documents, instructions, and final wishes — with controlled access for the people you trust.',
    competitorDesc: 'An online legal services company offering will writing, probate assistance, and funeral planning. A one-time service focused on legal documents.',
    rows: [
      { feature: 'Secure document vault',           everstead: true,  them: false },
      { feature: 'Ongoing vault — update any time', everstead: true,  them: false },
      { feature: 'Trusted contact access control',  everstead: true,  them: false },
      { feature: 'Step-by-step executor guide',     everstead: true,  them: false },
      { feature: 'Readiness score',                 everstead: true,  them: false },
      { feature: 'Personal messages & final wishes',everstead: true,  them: false },
      { feature: 'Birthday & anniversary reminders',everstead: true,  them: false },
      { feature: 'Family plan (2 vaults)',          everstead: true,  them: false },
    ],
    competitorAlso: ['Online will drafting', 'Probate assistance', 'Funeral planning'],
    verdict: 'For organising your whole estate — and making sure your family can actually act on it — Everstead is the clear winner. Use Farewill for the will document itself; rely on Everstead for everything around it.',
    positioning: `Farewill and Everstead solve different problems. Farewill helps you write a legal will — a one-time document. Everstead helps you keep everything else organised: where your accounts are, who should be contacted, what your wishes are, and what instructions your family should follow.

Most people need both. A will tells the court what happens to your assets. Everstead tells your family how to find everything else — and keeps it updated as your life changes.

If you already have a will, Everstead is the natural next step: a secure, living record that makes your estate genuinely manageable.`,
    price: 'From £3/mo yearly (14-day free trial)',
    competitorPrice: 'From £90 one-time for a basic will',
    cta: 'Start your free trial',
  },

  settld: {
    name: 'Settld',
    category: 'Post-bereavement notification',
    tagline: 'Everstead vs Settld',
    headline: 'Settld helps after a death. Everstead helps before.',
    subhead: 'Settld is a free notification service that helps families cancel accounts and inform companies after someone has died. Everstead is a proactive personal vault that makes sure your family never has to scramble in the first place.',
    eversteadDesc: 'A secure personal vault you build while you\'re alive — so the people you love have everything they need, organised and accessible, without having to search.',
    competitorDesc: 'A free service that helps the bereaved notify banks, utilities, and other companies after a death. Reactive, post-death focused, and built for executors already in the middle of grief.',
    rows: [
      { feature: 'Proactive planning — build before anything happens', everstead: true,  them: false },
      { feature: 'Secure document vault',                              everstead: true,  them: false },
      { feature: 'Account & asset register',                           everstead: true,  them: false },
      { feature: 'Trusted contact access management',                  everstead: true,  them: false },
      { feature: 'Readiness score & prompts',                          everstead: true,  them: false },
      { feature: 'Step-by-step instructions for your family',          everstead: true,  them: false },
      { feature: 'Personal messages & final wishes',                   everstead: true,  them: false },
      { feature: 'Family plan (2 private vaults)',                     everstead: true,  them: false },
    ],
    competitorAlso: ['Post-death company notifications — telling banks, utilities and providers after a death (Settld is free for this)'],
    verdict: 'Everstead is the better choice for nearly everyone, because it works before anything happens — while you can still prepare. Settld only helps afterwards. The smart move is Everstead now, so your family never has to scramble in the first place.',
    positioning: `Settld and Everstead are complementary rather than competing. Settld is used after someone has died — it helps families notify banks, utilities, pension providers, and other institutions. That's genuinely useful, but it's reactive: the family is already in the middle of grief, searching for information.

Everstead is proactive. It's where you record your accounts, upload your documents, write your instructions, and grant access to the people you trust — before anything happens.

When the worst does happen, a family with an Everstead vault already knows where everything is. They still might use Settld to notify institutions — but they won't spend weeks piecing together a life from scratch.

The difference is the difference between a map left at home and a map that was already in their hands.`,
    price: 'From £3/mo yearly (14-day free trial)',
    competitorPrice: 'Free',
    cta: 'Start your free trial',
  },

  safekeep: {
    name: 'SafeKeep',
    category: 'Digital estate planning',
    tagline: 'Everstead vs SafeKeep',
    headline: 'SafeKeep stores your information. Everstead organises your whole estate.',
    subhead: 'Both platforms help you keep important information in one place. The difference is in the depth — Everstead adds a family vault, an adviser portal, an Estate Readiness Score, and tools that actually help executors act when the time comes.',
    eversteadDesc: 'A secure personal vault for organising everything that matters — accounts, documents, instructions, and final wishes — with controlled access, an adviser portal, and a dual-vault Family plan for couples.',
    competitorDesc: 'A digital storage platform for important documents and account details. Focused on individuals storing personal data securely, with a clean interface and basic sharing features.',
    rows: [
      { feature: 'Secure document vault',                everstead: true,  them: true  },
      { feature: 'Account & asset register',             everstead: true,  them: true  },
      { feature: 'Trusted contact access control',       everstead: true,  them: true  },
      { feature: 'Family plan — two private vaults',     everstead: true,  them: false },
      { feature: 'Estate Readiness Score',               everstead: true,  them: false },
      { feature: 'Step-by-step executor instructions',   everstead: true,  them: false },
      { feature: 'Personal messages & final wishes',     everstead: true,  them: false },
      { feature: 'Adviser portal & client management',   everstead: true,  them: false },
      { feature: 'EU data residency (UK GDPR compliant)',everstead: true,  them: false },
      { feature: 'Smart reminders & progress tracking',  everstead: true,  them: false },
      { feature: 'Full data export (right to portability)', everstead: true,  them: false },
    ],
    positioning: `Everstead and SafeKeep share a basic premise: put your important information somewhere secure and accessible. If that's all you need, both products work.

But Everstead was built around a bigger problem. Families don't just need storage — they need organisation, guidance, and the right people to have the right access at the right time. That's why we built the Estate Readiness Score (so you can see exactly what's missing), step-by-step executor instructions (so your family knows what to do, not just where things are), and role-based access control that goes far beyond a shared password.

The Family plan is the sharpest difference. Two completely private vaults — one subscription. A couple can each organise their own estate, share only what they choose, and never have to combine their private information into a single account. SafeKeep has no equivalent.

The adviser portal is the other. Everstead works as a professional tool for financial planners, IFAs, and estate solicitors managing multiple clients — with a co-branded portal, client progress tracking, and collaboration features that SafeKeep doesn't offer.

If you're looking for a digital vault, both options are worth considering. If you want your family to actually know what to do when it counts, Everstead goes further.`,
    verdict: 'Both store your information — only Everstead turns it into a plan your family can act on. On every dimension that matters after storage, Everstead is the stronger choice.',
    price: 'From £3/mo yearly (14-day free trial)',
    competitorPrice: 'From £5.99/mo',
    cta: 'Start your free trial',
  },

  'octopus-legacy': {
    name: 'Octopus Legacy',
    category: 'Wills & legacy planning',
    tagline: 'Everstead vs Octopus Legacy',
    headline: 'Octopus Legacy handles your will. Everstead organises everything else.',
    subhead: 'Octopus Legacy is a will-writing and legacy planning service. Everstead is a living, updated vault — where everything that matters is organised, secured, and ready for the people you trust.',
    eversteadDesc: 'A secure personal vault for organising accounts, documents, instructions, and final wishes — updated as your life changes, with controlled access for trusted contacts and a Family plan for couples.',
    competitorDesc: 'A legal services company offering online wills, LPAs, and probate support. Mission-driven, with a focus on making estate planning accessible. Strong on legal documents; not a data storage or organisation platform.',
    rows: [
      { feature: 'Secure document vault',                everstead: true,  them: false },
      { feature: 'Account & asset register',             everstead: true,  them: false },
      { feature: 'Trusted contact access control',       everstead: true,  them: false },
      { feature: 'Ongoing vault — update any time',      everstead: true,  them: false },
      { feature: 'Family plan — two private vaults',     everstead: true,  them: false },
      { feature: 'Estate Readiness Score',               everstead: true,  them: false },
      { feature: 'Step-by-step executor instructions',   everstead: true,  them: false },
      { feature: 'Personal messages & final wishes',     everstead: true,  them: false },
      { feature: 'Adviser portal',                       everstead: true,  them: false },
    ],
    competitorAlso: ['Online will drafting', 'Lasting Power of Attorney setup', 'Probate support'],
    verdict: 'A will is essential — but it is one document. Everstead is the living record of everything else your family needs, kept current and ready. For genuine estate readiness, Everstead is the stronger foundation; add a will from Octopus Legacy alongside it.',
    positioning: `Octopus Legacy and Everstead solve different problems, and most people who think about estate planning will benefit from both.

Octopus Legacy is a legal services company — they help you draft a will, set up a Lasting Power of Attorney, and navigate probate. That's important work. A legally valid will is essential, and Octopus Legacy does that well.

Everstead is everything around the will. It's where you keep your account details, upload your documents, write your instructions, and tell your family what to do when the time comes. It's updated as your life changes. Your executor doesn't just have a legal document — they have a roadmap.

The Family plan is something Octopus Legacy doesn't offer: two completely private vaults under one subscription, for couples who want to organise their own estates separately without sharing sensitive personal information.

Think of a will as a destination. Everstead is the map that gets your family there.`,
    price: 'From £3/mo yearly (14-day free trial)',
    competitorPrice: 'From £90 for a basic will',
    cta: 'Start your free trial',
  },

  lyfeguard: {
    name: 'Lyfeguard',
    category: 'Digital legacy vault',
    tagline: 'Everstead vs Lyfeguard',
    headline: 'Both vaults secure your legacy. Only one keeps your family a step ahead.',
    subhead: 'Lyfeguard and Everstead both offer secure digital vaults for important information. The difference is what happens next — Everstead adds an Estate Readiness Score, step-by-step executor guidance, and a Family plan with two private vaults.',
    eversteadDesc: 'A proactive estate planning platform — not just storage, but an active system with readiness tracking, executor instructions, a dual-vault Family plan, and an adviser portal for professionals.',
    competitorDesc: 'A digital legacy platform for securely storing personal documents, account details, and final wishes — with sharing controls for nominated contacts.',
    rows: [
      { feature: 'Secure document vault',                everstead: true,  them: true  },
      { feature: 'Account & asset register',             everstead: true,  them: true  },
      { feature: 'Trusted contact access control',       everstead: true,  them: true  },
      { feature: 'Personal messages & final wishes',     everstead: true,  them: true  },
      { feature: 'Family plan — two private vaults',     everstead: true,  them: false },
      { feature: 'Estate Readiness Score',               everstead: true,  them: false },
      { feature: 'Step-by-step executor instructions',   everstead: true,  them: false },
      { feature: 'Smart reminders & progress prompts',   everstead: true,  them: false },
      { feature: 'Adviser portal & client management',   everstead: true,  them: false },
      { feature: 'EU data residency (UK GDPR compliant)',everstead: true,  them: false },
      { feature: 'Full data export (right to portability)', everstead: true,  them: false },
    ],
    positioning: `Lyfeguard and Everstead both start from the same place: your information should be secure, organised, and accessible to the right people when it matters. Both are honest alternatives to a locked filing cabinet.

The gap opens when you ask: what happens after someone stores their information? Lyfeguard is primarily a vault. Everstead is a vault with direction — an Estate Readiness Score that shows you exactly what's incomplete, step-by-step instructions your executor can follow without guessing, and smart reminders that keep your plan current as your life changes.

The Family plan is the most distinctive difference. Two completely separate, private vaults — one for each person — under a single subscription. A couple can each organise their own estate independently, with no obligation to combine or share their private data. Lyfeguard's sharing model assumes one account per household.

And for advisers: Everstead includes a dedicated portal for financial planners, IFAs, and estate professionals who want to offer estate organisation as part of their client service. Lyfeguard has no equivalent.

If you want a secure place to store important files, both products do the job. If you want your family to know exactly what to do — and to feel genuinely prepared — Everstead is built for that.`,
    verdict: 'Two secure vaults — but only Everstead tells your family what to do next, scores your readiness, and gives couples two private vaults in one plan. Everstead is the more complete solution.',
    price: 'From £3/mo yearly (14-day free trial)',
    competitorPrice: 'From £4.99/mo',
    cta: 'Start your free trial',
  },

  'doing-nothing': {
    name: 'a spreadsheet',
    category: 'The shoebox or the laptop folder',
    tagline: 'Everstead vs. doing nothing',
    headline: "Most people leave their family a spreadsheet, a shoebox, or nothing at all.",
    subhead: "You're not really choosing between Everstead and a competitor. You're choosing between an organised plan and the version of this you're doing today — usually a half-finished spreadsheet, a stack of paperwork, and a mental note to 'sort it out one day'.",
    eversteadDesc: 'A secure, encrypted, role-based plan your family can actually use. Updates as your life changes. Shareable section by section. AES-256 encrypted, UK-hosted, UK GDPR compliant — and built so the right people see the right things at the right time, and nothing more.',
    competitorDesc: "Sticky notes, a Word doc on the laptop, a printed list in a desk drawer, a spreadsheet that hasn't been updated in two years, account passwords in someone's head, or — most commonly — the assumption that 'it'll work itself out'.",
    rows: [
      { feature: 'Everything in one place',                       everstead: true,  them: false },
      { feature: 'Trusted contacts know where to look',           everstead: true,  them: false },
      { feature: 'Updated as your life changes',                  everstead: true,  them: false },
      { feature: 'Encrypted and access-controlled',               everstead: true,  them: false },
      { feature: 'Section-by-section sharing',                    everstead: true,  them: false },
      { feature: 'Step-by-step executor guidance',                everstead: true,  them: false },
      { feature: 'Readiness score so you know what is missing',   everstead: true,  them: false },
      { feature: 'Personal letters and final wishes preserved',   everstead: true,  them: false },
      { feature: 'Works when your laptop is locked or lost',      everstead: true,  them: false },
      { feature: 'Recoverable when memory fails',                 everstead: true,  them: false },
      { feature: 'Free — for the first month',                    everstead: true,  them: true  },
    ],
    positioning: `Almost no one fails to plan because they think planning is unimportant. They fail because the alternatives are all bad.

A spreadsheet is private but useless to anyone else when it matters. A printed folder gets out of date the moment a password changes. A pile of paperwork in a drawer assumes everyone will know which drawer. Telling your spouse "it's all on my laptop" assumes they'll remember the password, find the right folder, and recognise what they're looking at while grieving.

Everstead exists because the status quo isn't actually working for most families. The cost when nothing is in place is measured in weeks of admin, lost accounts, missed deadlines, and family stress in the worst possible moment.

For less than the price of a coffee a week, Everstead becomes the structured version of what you would have written down anyway — secure, sharable, updated, and ready. The hardest part is starting; everything after that is just keeping it current.`,
    verdict: 'There is no real contest here. A spreadsheet or a drawer of papers fails your family at the worst possible moment. Everstead is the organised, secure, shareable version of everything you would otherwise have meant to write down.',
    price: 'From £3/mo yearly (14-day free trial)',
    competitorPrice: 'Free — and very expensive when it counts',
    cta: 'Start organising your estate',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
// Display order for the index grid
const COMPARE_ORDER = [
  'doing-nothing', 'farewill', 'octopus-legacy',
  'safekeep', 'lyfeguard', 'settld',
]

export default function Compare() {
  useReveal()
  const { slug } = useParams()

  // No slug → render the comparison index
  if (!slug) return <CompareIndex />

  const data = competitors[slug]
  if (!data) return <NotFound />

  const { name, tagline, headline, subhead, eversteadDesc, competitorDesc, rows, positioning, price, competitorPrice, cta, category, verdict, competitorAlso } = data

  return (
    <>
      <Helmet>
        <title>{tagline} — Everstead</title>
        <meta name="description" content={subhead} />
        <link rel="canonical" href={`https://www.everstead.care/compare/${slug}`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${tagline} — Everstead`} />
        <meta property="og:description" content={subhead} />
        <meta property="og:url" content={`https://www.everstead.care/compare/${slug}`} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>

      <div className="bg-stone-50 min-h-screen">

        {/* Hero — extends under the fixed nav */}
        <section className="pt-44 pb-20 lg:pt-52 lg:pb-28 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
          <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">Everstead vs {name}</p>
            <h1 className="font-display text-4xl lg:text-6xl font-light text-white leading-tight text-balance">
              {headline}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              {subhead}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/get-started" className="inline-flex items-center justify-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors">
                {cta} <ArrowRight size={14} />
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
                See pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32 bg-stone-50">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-20">

            {/* Product descriptions */}
            <div className="reveal grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border-2 border-navy-200 bg-white p-7">
                <div className="flex items-center gap-3 mb-4">
                  <img src="/logo-v2-dark.png" alt="Everstead" className="h-6 w-auto" onError={e => e.target.style.display='none'} />
                  <span className="font-semibold text-navy-900">Everstead</span>
                  <span className="text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-medium">Personal vault</span>
                </div>
                <p className="text-sm leading-relaxed text-stone-600">{eversteadDesc}</p>
                <p className="mt-4 text-xs text-stone-400 font-medium">{price}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 rounded bg-stone-200 flex items-center justify-center text-stone-500 text-xs font-bold">{name[0]}</div>
                  <span className="font-semibold text-navy-900">{name}</span>
                  <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">{category}</span>
                </div>
                <p className="text-sm leading-relaxed text-stone-600">{competitorDesc}</p>
                <p className="mt-4 text-xs text-stone-400 font-medium">{competitorPrice}</p>
              </div>
            </div>

            {/* Verdict banner */}
            {verdict && (
              <div className="reveal rounded-2xl bg-sage-50 border border-sage-200 p-7 lg:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-sage-600" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-700">Our verdict — Everstead wins</p>
                </div>
                <p className="text-navy-900 text-lg leading-relaxed">{verdict}</p>
              </div>
            )}

            {/* Feature comparison table */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-8">Feature comparison</h2>
              <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white">
                {/* Header */}
                <div className="grid grid-cols-3 bg-navy-50 border-b border-stone-200">
                  <div className="px-6 py-4 col-span-1">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Feature</p>
                  </div>
                  <div className="px-6 py-4 text-center border-l border-stone-200">
                    <p className="text-xs font-semibold text-navy-700 uppercase tracking-widest">Everstead</p>
                  </div>
                  <div className="px-6 py-4 text-center border-l border-stone-200">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">{name}</p>
                  </div>
                </div>
                {rows.map((row, i) => (
                  <div key={i} className={`grid grid-cols-3 border-b border-stone-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-stone-50/50'}`}>
                    <div className="px-6 py-4 text-sm text-stone-700 leading-snug flex items-center">{row.feature}</div>
                    <div className="px-6 py-4 flex items-center justify-center border-l border-stone-100">
                      {row.everstead
                        ? <CheckCircle2 size={18} className="text-sage-500" />
                        : <XCircle size={18} className="text-stone-300" />}
                    </div>
                    <div className="px-6 py-4 flex items-center justify-center border-l border-stone-100">
                      {row.them
                        ? <CheckCircle2 size={18} className="text-stone-400" />
                        : <XCircle size={18} className="text-stone-200" />}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-stone-400">Based on publicly available information. Features may change. Last reviewed May 2026.</p>
            </div>

            {/* What the competitor also offers — honest aside */}
            {Array.isArray(competitorAlso) && competitorAlso.length > 0 && (
              <div className="reveal rounded-2xl border border-stone-200 bg-white p-7">
                <h3 className="font-semibold text-navy-900 mb-2">What {name} also offers</h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  In fairness, {name} does some things Everstead doesn't — and that's by design. These are a separate service you can use <em>alongside</em> Everstead, not instead of it:
                </p>
                <ul className="space-y-2">
                  {competitorAlso.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                      <span className="text-stone-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-stone-500 leading-relaxed mt-4">
                  None of these replace what Everstead does: keeping your whole estate organised, current, and ready for the people you trust.
                </p>
              </div>
            )}

            {/* The real difference */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-6">The real difference</h2>
              <div className="space-y-4">
                {positioning.split('\n\n').map((para, i) => (
                  <p key={i} className="text-stone-600 text-sm leading-relaxed">{para}</p>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="reveal rounded-2xl bg-navy-950 px-10 py-10 text-center">
              <h2 className="font-display text-2xl font-light text-white mb-3">Try Everstead free for 14 days</h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                No commitment. Full access. Cancel before the trial ends and pay nothing.
              </p>
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors"
              >
                {cta} <ArrowRight size={14} />
              </Link>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare index — /compare
// ─────────────────────────────────────────────────────────────────────────────
function CompareIndex() {
  useReveal()
  const cards = COMPARE_ORDER
    .filter(slug => competitors[slug])
    .map(slug => ({ slug, ...competitors[slug] }))

  return (
    <>
      <Helmet>
        <title>How Everstead compares — Everstead vs the alternatives</title>
        <meta name="description" content="See how Everstead compares to will-writing services, document vaults, and the do-nothing status quo — and why families choose it. Side-by-side feature comparisons for UK families." />
        <link rel="canonical" href="https://www.everstead.care/compare" />
        <meta property="og:title" content="How Everstead compares" />
        <meta property="og:description" content="Everstead vs the alternatives — side-by-side comparisons for UK families." />
        <meta property="og:url" content="https://www.everstead.care/compare" />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>

      <div className="bg-stone-50 min-h-screen">
        {/* Hero */}
        <section className="pt-44 pb-16 lg:pt-52 lg:pb-20 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">How we compare</p>
            <h1 className="font-display text-4xl lg:text-6xl font-light text-white leading-tight text-balance">
              Why families choose Everstead.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              Weighing up a will-writing service, a document vault, or just a spreadsheet? Here's an honest, side-by-side look at how Everstead compares — and why it comes out ahead.
            </p>
          </div>
        </section>

        {/* Grid */}
        <section className="py-20 lg:py-24">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 gap-5 reveal">
              {cards.map(({ slug, name, category, headline }) => (
                <Link
                  key={slug}
                  to={`/compare/${slug}`}
                  className="group rounded-2xl border border-stone-200 bg-white p-6 hover:border-navy-300 hover:shadow-sm transition-all flex flex-col"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="font-semibold text-navy-900">Everstead</span>
                    <span className="text-stone-300">vs</span>
                    <span className="font-semibold text-navy-900">{name}</span>
                  </div>
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-3">{category}</p>
                  <p className="text-sm text-stone-600 leading-relaxed flex-1">{headline}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 group-hover:gap-2.5 transition-all">
                    See the comparison <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="reveal mt-14 rounded-2xl bg-navy-950 px-8 py-9 text-center">
              <h2 className="font-display text-2xl font-light text-white mb-3">The simplest comparison is trying it.</h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                14-day free trial. Full access. Cancel before it ends and pay nothing.
              </p>
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors"
              >
                Start your free trial <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
