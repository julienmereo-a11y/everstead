import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Briefcase, CheckCircle2, ShieldCheck } from 'lucide-react'

const plans = [
  {
    id: 'essential',
    name: 'Essential',
    monthly: 12,
    yearly: 10,
    description: 'For one person getting the important basics in order.',
    features: ['Core vault for accounts and documents', 'Step-by-step instructions', '2 trusted people', 'Readiness score and reminders'],
    cta: 'Start free trial',
  },
  {
    id: 'family',
    name: 'Family',
    monthly: 24,
    yearly: 20,
    description: 'For households planning together with more storage and collaboration.',
    features: ['Everything in Essential', 'Household collaboration', 'Up to 10 trusted people', 'Expanded document and alert coverage'],
    cta: 'Start free trial',
    highlight: true,
    badge: 'Most popular',
  },
  {
    id: 'advisor',
    name: 'Advisor Pilot',
    monthly: 149,
    yearly: 129,
    description: 'For one partner firm proving Everstead as a client-facing readiness service.',
    features: ['Everything in Family', 'Pilot onboarding for one advisory or legal firm', 'Trust-center walkthrough for client conversations', 'Delegate dashboard and annual review workflow', 'Team collaboration and guided rollout'],
    cta: 'Book a demo',
  },
]

const securityBaseline = [
  'Encryption in transit and at rest',
  'Granular trusted-person permissions',
  'Audit trail for key activity',
  'Private document storage and controlled retrieval',
]

const comparisonRows = [
  ['Accounts and document vault', true, true, true],
  ['Readiness score and review prompts', true, true, true],
  ['Trusted people and delegate access', true, true, true],
  ['Household collaboration', false, true, true],
  ['Advisor rollout support', false, false, true],
  ['Pilot partner onboarding', false, false, true],
]

export default function Pricing() {
  useReveal()
  const [annual, setAnnual] = useState(true)

  const billingNote = useMemo(
    () => annual ? 'Billed annually for the strongest value.' : 'Billed month to month for flexibility.',
    [annual],
  )

  return (
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">Pricing</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            Pricing that reflects trust, readiness, and a clear go-to-market focus.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-3xl mx-auto">
            Everstead starts with individual and family plans, but the most strategic early channel is the advisor pilot: one partner firm introducing the product to many families with confidence.
          </p>
        </div>
      </section>

      <section className="py-16 border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 reveal">
          <div className="inline-flex rounded-full border border-stone-200 bg-stone-100 p-1">
            <button onClick={() => setAnnual(true)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${annual ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-navy-900'}`}>
              Annual
            </button>
            <button onClick={() => setAnnual(false)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${!annual ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-navy-900'}`}>
              Monthly
            </button>
          </div>
          <p className="mt-4 text-sm text-stone-500">{billingNote}</p>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid xl:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const price = annual ? plan.yearly : plan.monthly
            const href = plan.cta === 'Book a demo' ? '/book-demo' : `/get-started?plan=${plan.id}&billing=${annual ? 'yearly' : 'monthly'}`
            return (
              <div key={plan.id} className={`reveal reveal-delay-${Math.min(index + 1, 3)} rounded-[2rem] border p-8 ${plan.highlight ? 'border-navy-300 bg-navy-950 text-white shadow-xl shadow-navy-950/10' : 'border-stone-200 bg-white text-navy-950'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-sm font-semibold ${plan.highlight ? 'text-sage-300' : 'text-navy-700'}`}>{plan.name}</p>
                    <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? 'text-stone-300' : 'text-stone-600'}`}>{plan.description}</p>
                  </div>
                  {plan.badge && <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-800">{plan.badge}</span>}
                </div>
                <div className="mt-8 flex items-end gap-2">
                  <span className="font-display text-5xl font-light">£{price}</span>
                  <span className={`pb-2 text-sm ${plan.highlight ? 'text-stone-400' : 'text-stone-500'}`}>/ month</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                      <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-sage-300' : 'text-sage-700'}`} />
                      <span className={plan.highlight ? 'text-stone-200' : 'text-stone-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to={href} className={`inline-flex items-center justify-center gap-2 mt-8 w-full rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors ${plan.highlight ? 'bg-white text-navy-900 hover:bg-stone-100' : 'bg-navy-800 text-white hover:bg-navy-700'}`}>
                  {plan.cta} <ArrowRight size={15} />
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      <section className="py-20 lg:py-24 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[0.95fr_1.05fr] gap-14 items-start">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600 mb-4">Security baseline</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              Every plan is built on the same protection model.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-stone-600">
              Everstead does not reserve basic protection for premium tiers. Plan differences are about collaboration, rollout support, and service experience — not weaker privacy or weaker access control.
            </p>
            <div className="mt-8 space-y-3">
              {securityBaseline.map(item => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4 text-sm leading-relaxed text-stone-600">
                  <ShieldCheck size={17} className="text-navy-700 mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="reveal reveal-delay-1 rounded-[2rem] border border-stone-200 bg-stone-50 overflow-hidden">
            <div className="grid grid-cols-4 bg-navy-950 text-white text-sm font-semibold">
              <div className="px-5 py-4">Capability</div>
              <div className="px-5 py-4 text-center">Essential</div>
              <div className="px-5 py-4 text-center">Family</div>
              <div className="px-5 py-4 text-center">Advisor</div>
            </div>
            {comparisonRows.map(([label, essential, family, advisor]) => (
              <div key={label} className="grid grid-cols-4 border-t border-stone-200 text-sm">
                <div className="px-5 py-4 text-stone-700">{label}</div>
                {[essential, family, advisor].map((value, index) => (
                  <div key={`${label}-${index}`} className="px-5 py-4 text-center text-stone-600">
                    {value ? '✓' : '—'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[0.88fr_1.12fr] gap-12 items-start">
          <div className="reveal rounded-[2rem] border border-navy-200 bg-navy-50 p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-navy-800 text-white flex items-center justify-center">
                <Briefcase size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-900">Advisor pilot focus</p>
                <p className="text-sm text-stone-500">The fastest route to trusted distribution</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-stone-600">
              The advisor tier is designed as a deliberate early-stage wedge: one firm, one rollout, one repeatable motion. That partner can introduce Everstead to dozens of families while giving the product the endorsement it needs in a high-trust category.
            </p>
          </div>
          <div className="reveal reveal-delay-1 rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 mb-4">Important disclaimer</p>
            <h2 className="font-display text-3xl font-light text-navy-950">Everstead is not a legal service.</h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-700">
              Plans and pricing cover organisation, collaboration, storage, delegate access, and review workflows. They do not include will drafting, legal advice, or regulated professional services.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/terms" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                Read terms <ArrowRight size={15} />
              </Link>
              <Link to="/book-demo" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                Discuss advisor rollout <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
