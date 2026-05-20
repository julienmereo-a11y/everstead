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
      { feature: 'Will drafting',                   everstead: false, them: true  },
      { feature: 'Probate assistance',              everstead: false, them: true  },
      { feature: 'Funeral planning',                everstead: false, them: true  },
    ],
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
      { feature: 'Post-death company notification',                    everstead: false, them: true  },
      { feature: 'Free to use',                                        everstead: false, them: true  },
    ],
    positioning: `Settld and Everstead are complementary rather than competing. Settld is used after someone has died — it helps families notify banks, utilities, pension providers, and other institutions. That's genuinely useful, but it's reactive: the family is already in the middle of grief, searching for information.

Everstead is proactive. It's where you record your accounts, upload your documents, write your instructions, and grant access to the people you trust — before anything happens.

When the worst does happen, a family with an Everstead vault already knows where everything is. They still might use Settld to notify institutions — but they won't spend weeks piecing together a life from scratch.

The difference is the difference between a map left at home and a map that was already in their hands.`,
    price: 'From £3/mo yearly (14-day free trial)',
    competitorPrice: 'Free',
    cta: 'Start your free trial',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Compare() {
  useReveal()
  const { slug } = useParams()
  const data = competitors[slug]
  if (!data) return <NotFound />

  const { name, tagline, headline, subhead, eversteadDesc, competitorDesc, rows, positioning, price, competitorPrice, cta, category } = data

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

      <div className="bg-stone-50 pt-24 min-h-screen">

        {/* Hero */}
        <section className="py-20 lg:py-28 grain relative overflow-hidden">
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
