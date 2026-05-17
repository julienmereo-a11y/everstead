import React, { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Briefcase, CheckCircle2, ShieldCheck, ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'How does the free trial work?',
    a: 'Every plan includes a 14-day free trial. A card is required to start, but you won\'t be charged until the trial ends — cancel any time before and pay nothing. You have full access to all features on your chosen plan during the trial.',
  },
  {
    q: 'What happens if I cancel during the trial?',
    a: 'Nothing. You will not be charged. Your account is closed and your data is retained for 30 days in case you change your mind, then permanently deleted. No fees, no questions.',
  },
  {
    q: 'Can I switch plans after signing up?',
    a: 'Yes. You can upgrade or downgrade at any time from your account settings. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period. You will never be charged more than the plan you are on.',
  },
  {
    q: 'Is there a discount for annual billing?',
    a: 'Yes — choosing yearly billing saves £24 per year on the Essential and Family plans compared to monthly billing. The discounted rate is applied immediately and locked in for the year.',
  },
  {
    q: 'What does the Family plan include that Essential does not?',
    a: 'The Family plan adds household member access so multiple people in the same household can use the plan together, increases trusted contacts from 2 to 10, adds emergency vault sharing, expands storage from 5 GB to 25 GB, and includes a family-wide readiness score.',
  },
  {
    q: 'What is the Advisor plan for?',
    a: 'The Advisor plan is designed for financial advisers, solicitors, and other professionals who want to offer estate organisation as a service to clients. It includes a multi-client workspace, a co-branded client portal, collaboration tools, and priority support. Contact us to discuss a pilot rollout.',
  },
  {
    q: 'Is Everstead a legal service?',
    a: 'No. Everstead is an organisation and planning tool — it does not provide will drafting, legal advice, or any regulated professional service. It is designed to work alongside your solicitor, financial adviser, and other professionals. For legal estate planning, please use a qualified solicitor.',
  },
  {
    q: 'How is my data protected?',
    a: 'All data is encrypted in transit and at rest using AES-256 encryption. Everstead operates under UK GDPR and is registered with the ICO. Everstead staff cannot access the content of your estate plan. Access to your plan is controlled entirely by you.',
  },
  {
    q: 'Is Everstead worth it if I only use it once to set up my plan?',
    a: 'Most people set up their plan once — then update it a few times a year as their life changes. But the real value isn\'t in the setup. It\'s in knowing that if something happens tomorrow, your family won\'t spend months trying to piece your life together. For less than £1 a day, that\'s one of the better investments you can make for the people you love.',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

function FaqAccordion() {
  const [open, setOpen] = useState(null)
  return (
    <div className="space-y-3">
      {faqs.map(({ q, a }, i) => (
        <div key={i} className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left flex items-start justify-between gap-4 px-6 py-5"
            aria-expanded={open === i}
          >
            <span className="font-medium text-navy-900 text-sm leading-snug">{q}</span>
            <ChevronDown size={16} className={`text-stone-400 mt-0.5 flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">{a}</div>
          )}
        </div>
      ))}
    </div>
  )
}

const plans = [
  {
    id: 'essential',
    name: 'Essential',
    monthly: 5,
    yearly: 3,
    yearlyTotal: 36,
    promo: 'LAUNCH OFFER',
    description: 'For individuals getting their digital life in order.',
    reframe: '£0.69 a week — less than a coffee.',
    features: ['Up to 10 accounts & documents', '1 trusted contact', '1 instruction set', '1 GB secure storage', 'Readiness score'],
    cta: 'Get started free',
  },
  {
    id: 'family',
    name: 'Family',
    monthly: 12,
    yearly: 10,
    yearlyTotal: 120,
    description: 'For couples and households planning together.',
    reframe: '£10/mo billed yearly · Two vaults · Just £5 per person',
    features: ['Two private vaults — one subscription', 'Unlimited accounts & documents', 'Up to 10 trusted contacts', 'Unlimited instructions & wishes', 'Personal messages & final wishes', '25 GB secure storage'],
    cta: 'Get started free',
    highlight: true,
    badge: 'Most popular',
    promo: 'LAUNCH OFFER',
  },
  {
    id: 'advisor',
    name: 'Advisor',
    monthly: 60,
    yearly: 48,
    yearlyTotal: 576,
    description: 'For professionals managing client estate organisation.',
    reframe: '£48 a month — less than one billable hour.',
    features: ['Everything in Family', 'Multi-client workspace', 'Co-branded client portal', 'Advisor collaboration tools', 'Priority support'],
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

  const familyPlan     = plans.find(p => p.id === 'family')
  const yearlyDiscount = Math.round((1 - familyPlan.yearly / familyPlan.monthly) * 100)

  const billingNote = useMemo(() => {
    const saving = (familyPlan.monthly - familyPlan.yearly) * 12
    return annual
      ? `Billed yearly. You're saving £${saving}/yr on the Family plan compared to monthly. ✓`
      : `Billed monthly. Switch to yearly and save £${saving} on the Family plan.`
  }, [annual])

  return (
    <>
    <Helmet>
      <title>Pricing — Everstead</title>
      <meta name="description" content="Simple, transparent pricing for individuals, families, and professional advisors. Start your 14-day free trial — card required, no charge until trial ends." />
      <link rel="canonical" href="https://www.everstead.care/pricing" />
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">Pricing</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            Simple, transparent pricing for every stage of life.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-3xl mx-auto">
            Start with a 14-day free trial. No charge for 14 days — cancel anytime.
          </p>
        </div>
      </section>

      <section className="py-16 border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 reveal text-center">
          <div className="inline-flex rounded-full bg-navy-950 p-1.5 gap-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-colors ${!annual ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-colors ${annual ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Yearly
              {annual
                ? <span className="text-sage-600 font-semibold text-xs">✓ Saving {yearlyDiscount}%</span>
                : <span className="text-sage-400 font-semibold text-xs">Save {yearlyDiscount}%</span>
              }
            </button>
          </div>
          <p className="mt-4 text-sm text-stone-500">{billingNote}</p>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid xl:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const price = annual ? plan.yearly : plan.monthly
            const isAdvisor = plan.id === 'advisor'
            const href = isAdvisor ? null : `/get-started?plan=${plan.id}&billing=${annual ? 'yearly' : 'monthly'}`
            return (
              <div key={plan.id} className={`reveal reveal-delay-${Math.min(index + 1, 3)} rounded-[2rem] border p-8 flex flex-col ${plan.highlight ? 'border-navy-300 bg-navy-950 text-white shadow-xl shadow-navy-950/10' : 'border-stone-200 bg-white text-navy-950'}`}>
                {(plan.badge || plan.promo) && (
                  <div className="mb-4">
                    {plan.badge && <span className="inline-block rounded-full bg-sage-500 px-3 py-1 text-xs font-semibold text-white">{plan.badge}</span>}
                    {plan.promo && <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950">{plan.promo}</span>}
                  </div>
                )}
                <div>
                  <p className={`text-sm font-semibold ${plan.highlight ? 'text-sage-300' : 'text-navy-700'}`}>{plan.name}</p>
                  <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? 'text-stone-300' : 'text-stone-600'}`}>{plan.description}</p>
                </div>
                <div className="mt-8">
                  <div className="flex items-end gap-2">
                    <span className="font-display text-5xl font-light">£{price}</span>
                    <span className={`pb-2 text-sm ${plan.highlight ? 'text-stone-400' : 'text-stone-500'}`}>/ month</span>
                  </div>
                  {annual && (
                    <p className={`mt-1.5 text-[11px] ${plan.highlight ? 'text-stone-400' : 'text-stone-400'}`}>
                      Save £{(plan.monthly - plan.yearly) * 12}/yr vs monthly
                    </p>
                  )}
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                      <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-sage-300' : 'text-sage-700'}`} />
                      <span className={plan.highlight ? 'text-stone-200' : 'text-stone-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isAdvisor ? (
                  <div className="mt-8 space-y-3">
                    <Link
                      to={`/get-started?plan=advisor&billing=${annual ? 'yearly' : 'monthly'}`}
                      className="inline-flex items-center justify-center gap-2 w-full rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors bg-navy-800 text-white hover:bg-navy-700"
                    >
                      Get started free — up to 5 families <ArrowRight size={15} />
                    </Link>
                    <Link
                      to="/book-demo"
                      className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-stone-200 px-5 py-3.5 text-sm font-medium transition-colors text-stone-600 hover:border-navy-300 hover:text-navy-800"
                    >
                      Managing more than 5 families? Talk to us
                    </Link>
                  </div>
                ) : (
                  <>
                    <Link to={href} className={`inline-flex items-center justify-center gap-2 mt-8 w-full rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors ${plan.highlight ? 'bg-white text-navy-900 hover:bg-stone-100' : 'bg-navy-800 text-white hover:bg-navy-700'}`}>
                      {plan.cta} <ArrowRight size={15} />
                    </Link>
                    {plan.id === 'essential' && (
                      <p className="mt-3 text-center text-xs text-stone-400 leading-relaxed">
                        Need more? Family includes two private vaults — just £5 per person.
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Gift callout — sits directly under the 3 plan cards ── */}
        <div className="text-center mt-10 pb-2">
          <p className="text-stone-500 text-sm mb-3">Looking for a gift for someone you care about?</p>
          <Link
            to="/gift"
            className="inline-flex items-center gap-2 text-navy-700 font-semibold text-sm border border-navy-200 rounded-xl px-5 py-3 hover:bg-navy-50 transition-colors"
          >
            🎁 Give an Everstead plan as a gift →
          </Link>
        </div>
      </section>

      {/* ── COMPARISON SECTION ────────────────────────────────────── */}
      <section className="pt-8 pb-16 lg:pt-10 lg:pb-20 bg-stone-50 border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="font-display text-2xl lg:text-3xl font-light text-navy-950 text-center mb-10 reveal text-balance">
            Less than the alternatives. More than any of them.
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Solicitor */}
            <div className="reveal bg-white rounded-2xl border border-stone-200 p-6">
              <p className="text-2xl mb-3">🏛️</p>
              <p className="font-semibold text-navy-900 text-sm mb-1">Solicitor (probate)</p>
              <p className="font-display text-2xl font-light text-navy-950 mb-3">£3,000–5,000</p>
              <p className="text-xs text-stone-500 leading-relaxed">One estate settled, after you're gone. No ongoing access, no instructions, no peace of mind while you're alive.</p>
            </div>
            {/* Will writing */}
            <div className="reveal reveal-delay-1 bg-white rounded-2xl border border-stone-200 p-6">
              <p className="text-2xl mb-3">📋</p>
              <p className="font-semibold text-navy-900 text-sm mb-1">Will writing service</p>
              <p className="font-display text-2xl font-light text-navy-950 mb-3">£150–500</p>
              <p className="text-xs text-stone-500 leading-relaxed">A document. No instructions, no organised accounts, no access grants, no way for your family to find anything.</p>
            </div>
            {/* Everstead — highlighted */}
            <div className="reveal reveal-delay-2 bg-navy-950 rounded-2xl border border-navy-800 p-6">
              <p className="text-2xl mb-3">🔒</p>
              <p className="font-semibold text-sage-300 text-sm mb-1">Everstead Family</p>
              <p className="font-display text-2xl font-light text-white mb-3">£120 / yr</p>
              <p className="text-xs text-stone-300 leading-relaxed">Everything organised, updated, and shared — for as long as you need it. Two private vaults included.</p>
            </div>
          </div>
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
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="reveal rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
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

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-white border-t border-stone-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600 mb-4">Common questions</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              Everything you might want to know.
            </h2>
          </div>
          <div className="reveal reveal-delay-1">
            <FaqAccordion />
          </div>
          <p className="mt-10 text-center text-sm text-stone-500">
            Still have a question?{' '}
            <a href="mailto:support@everstead.care" className="text-navy-700 font-medium hover:text-navy-900 transition-colors">
              Write to us
            </a>{' '}
            and we'll reply within one business day.
          </p>
        </div>
      </section>
    </div>
  </>
  )
}
