import React, { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Briefcase, CheckCircle2, ShieldCheck, ChevronDown } from 'lucide-react'
import { PRICING } from '../config/pricing'

function FaqAccordion({ faqs }) {
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

export default function Pricing() {
  useReveal()
  const { t, i18n } = useTranslation('pricing')
  const [annual, setAnnual] = useState(true)

  const isFr = i18n.language === 'fr'
  const urlPrefix = isFr ? '/fr' : ''

  const faqs = t('faq.items', { returnObjects: true })

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  // Consumer table = Free + Everstead+ only. Everstead Pro (advisers) is its own band
  // below — a different sales motion (platform fee + per-family, sold via demo).
  // Essential is retired: not shown to new visitors, but grandfathered subscribers keep it.
  const plans = [
    {
      id: 'free',
      i18nKey: 'free',
      isFree: true,
      name: t('plans.free.name'),
      priceLabel: t('plans.free.priceLabel'),
      priceSub: t('plans.free.priceSub'),
      description: t('plans.free.description'),
      features: t('plans.free.features', { returnObjects: true }),
      cta: t('plans.free.cta'),
    },
    {
      id: 'family',
      i18nKey: 'family',
      name: t('plans.family.name'),
      monthly: PRICING.family.monthly.perMonth,
      yearly: PRICING.family.annual.perMonth,
      yearlyTotal: PRICING.family.annual.perYear,
      description: t('plans.family.description'),
      features: t('plans.family.features', { returnObjects: true }),
      cta: t('plans.family.cta'),
      highlight: true,
      badge: t('plans.family.badge'),
    },
  ]

  const securityBaseline = t('security.items', { returnObjects: true })

  const rowLabels = t('table.rows', { returnObjects: true })
  const comparisonRows = [
    [rowLabels[0], true, true, true],
    [rowLabels[1], true, true, true],
    [rowLabels[2], true, true, true],
    [rowLabels[3], false, true, true],
    [rowLabels[4], false, false, true],
    [rowLabels[5], false, false, true],
  ]

  const familyPlan     = plans.find(p => p.id === 'family')
  // The GBP plan is priced at 20% off for the year. The French market has its
  // own euro list price (9,99 / 99,99 TTC), which works out at two months free
  // rather than 20%, so the saving must NOT be derived from the GBP figures
  // here or the French page overstates its own discount.
  const isFrenchPricing = i18n.language === 'fr'
  const yearlyDiscount = isFrenchPricing
    ? 17                                                          // 99,99 vs 12 x 9,99
    : Math.round((1 - familyPlan.yearly / familyPlan.monthly) * 100)

  const billingNote = useMemo(() => {
    const saving = isFrenchPricing
      ? 20                                                        // 119,88 - 99,99 = 19,89 EUR
      : Math.round((familyPlan.monthly - familyPlan.yearly) * 12)
    return annual
      ? t('toggle.billingNoteAnnual', { saving, percent: yearlyDiscount })
      : t('toggle.billingNoteMonthly', { saving, percent: yearlyDiscount })
  }, [annual, t])

  return (
    <>
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="description" content={t('meta.description')} />
      <link rel="canonical" href={`https://www.everstead.care${urlPrefix}/pricing`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={t('meta.title')} />
      <meta property="og:description" content={t('meta.description')} />
      <meta property="og:url" content={`https://www.everstead.care${urlPrefix}/pricing`} />
      <meta property="og:image" content="https://www.everstead.care/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
    <HreflangLinks path="/pricing" />
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">{t('header.eyebrow')}</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            {t('header.title')}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-3xl mx-auto">
            {t('header.subtitle')}
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
              {t('toggle.monthly')}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-colors ${annual ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
            >
              {t('toggle.yearly')}
              {annual
                ? <span className="text-sage-600 font-semibold text-xs">{t('toggle.savingActive', { percent: yearlyDiscount })}</span>
                : <span className="text-sage-400 font-semibold text-xs">{t('toggle.save', { percent: yearlyDiscount })}</span>
              }
            </button>
          </div>
          <p className="mt-4 text-sm text-stone-500">{billingNote}</p>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 grid md:grid-cols-2 gap-6">
          {plans.map((plan, index) => {
            const href = plan.isFree
              ? '/get-started?plan=free'
              : `/get-started?plan=${plan.id}&billing=${annual ? 'yearly' : 'monthly'}`
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
                {plan.isFree ? (
                  <div className="mt-8">
                    <div className="flex items-end gap-2">
                      <span className="font-display text-5xl font-light">{plan.priceLabel}</span>
                      {!isFrenchPricing && (
                        <span className={`pb-2 text-sm ${plan.highlight ? 'text-stone-400' : 'text-stone-500'}`}>{plan.priceSub}</span>
                      )}
                    </div>
                    {/* English-only footnotes: the French card already says
                        "sans carte bancaire" in its description, so repeating it
                        under the price is noise (and these were hardcoded, so
                        they used to render in English on /fr). */}
                    {!isFrenchPricing && (
                      <p className="mt-1.5 text-[11px] text-stone-400">No card required</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-8">
                    <div className="flex items-end gap-2">
                      <span className="font-display text-5xl font-light">
                        {t(`prices.${plan.i18nKey}.${annual ? 'yearly' : 'monthly'}`, { value: annual ? plan.yearly : plan.monthly })}
                      </span>
                      <span className={`pb-2 text-sm ${plan.highlight ? 'text-stone-400' : 'text-stone-500'}`}>
                        {t(annual ? 'prices.suffixYearly' : 'prices.suffixMonthly')}
                      </span>
                    </div>
                    {annual && plan.yearlyTotal && (
                      <p className={`mt-1.5 text-[11px] ${plan.highlight ? 'text-stone-400' : 'text-stone-400'}`}>
                        {t('prices.billedAnnually', { total: plan.yearlyTotal.toFixed(2) })}
                      </p>
                    )}
                  </div>
                )}
                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                      <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-sage-300' : 'text-sage-700'}`} />
                      <span className={plan.highlight ? 'text-stone-200' : 'text-stone-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to={href} className={`inline-flex items-center justify-center gap-2 mt-8 w-full rounded-full px-5 py-3.5 text-sm font-semibold ${plan.isFree && !plan.highlight ? 'border border-navy-200 text-navy-800 hover:bg-navy-50 transition-colors' : 'btn-aurora'}`}>
                  {plan.cta} <ArrowRight size={15} />
                </Link>
                {plan.isFree && !isFrenchPricing && (
                  <p className="mt-3 text-center text-xs text-stone-400 leading-relaxed">
                    Upgrade to Everstead+ any time, your data comes with you.
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* ── EVERSTEAD PRO — advisers (separate sales motion, not a consumer card) ── */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mt-8">
          <div className="reveal rounded-[2rem] border border-navy-200 bg-navy-950 text-white p-8 sm:flex sm:items-center sm:justify-between gap-8">
            <div className="max-w-lg">
              <p className="text-sm font-semibold text-sage-300">{t('plans.adviser.name')}</p>
              <p className="mt-2 text-stone-300 text-sm leading-relaxed">
                For solicitors, will-writers, and financial advisers, a co-branded, multi-client
                workspace. {t('plans.adviser.priceNote')}
              </p>
            </div>
            <div className="mt-5 sm:mt-0 flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/for-advisers" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border border-white/25 text-white hover:bg-white/10 transition-colors">
                Learn more
              </Link>
              <Link to="/book-demo" className="btn-aurora inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
                {t('plans.adviser.cta')} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── FR only: prices are TTC, checkout currently charges in GBP ── */}
        {isFr && (
          <p className="reveal text-center mt-8 text-stone-400 text-xs">{t('prices.gbpNote')}</p>
        )}

        {/* ── Data promise trust line ── */}
        <p className="reveal text-center mt-8 text-stone-500 text-sm">
          {t('dataPromise.text')}{' '}
          <Link to="/data-promise" className="text-navy-700 font-medium hover:text-navy-900 underline underline-offset-2 transition-colors">{t('dataPromise.link')}</Link>
        </p>

        {/* ── Gift callout — sits directly under the 3 plan cards ── */}
        <div className="text-center mt-10 pb-2">
          <p className="text-stone-500 text-sm mb-3">{t('gift.prompt')}</p>
          <Link
            to="/gift"
            className="inline-flex items-center gap-2 text-navy-700 font-semibold text-sm border border-navy-200 rounded-xl px-5 py-3 hover:bg-navy-50 transition-colors"
          >
            {t('gift.cta')}
          </Link>
        </div>
      </section>

      {/* ── COMPARISON SECTION ────────────────────────────────────── */}
      <section className="pt-8 pb-16 lg:pt-10 lg:pb-20 bg-stone-50 border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="font-display text-2xl lg:text-3xl font-light text-navy-950 text-center mb-10 reveal text-balance">
            {t('comparison.title')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Solicitor */}
            <div className="reveal bg-white rounded-2xl border border-stone-200 p-6">
              <p className="text-2xl mb-3">🏛️</p>
              <p className="font-semibold text-navy-900 text-sm mb-1">{t('comparison.solicitor.name')}</p>
              <p className="font-display text-2xl font-light text-navy-950 mb-3">{t('comparison.solicitor.price')}</p>
              <p className="text-xs text-stone-500 leading-relaxed">{t('comparison.solicitor.description')}</p>
            </div>
            {/* Will writing */}
            <div className="reveal reveal-delay-1 bg-white rounded-2xl border border-stone-200 p-6">
              <p className="text-2xl mb-3">📋</p>
              <p className="font-semibold text-navy-900 text-sm mb-1">{t('comparison.willWriting.name')}</p>
              <p className="font-display text-2xl font-light text-navy-950 mb-3">{t('comparison.willWriting.price')}</p>
              <p className="text-xs text-stone-500 leading-relaxed">{t('comparison.willWriting.description')}</p>
            </div>
            {/* Everstead — highlighted */}
            <div className="reveal reveal-delay-2 bg-navy-950 rounded-2xl border border-navy-800 p-6">
              <p className="text-2xl mb-3">🔒</p>
              <p className="font-semibold text-sage-300 text-sm mb-1">{t('comparison.everstead.name')}</p>
              <p className="font-display text-2xl font-light text-white mb-3">{t('comparison.everstead.price', { total: PRICING.family.annual.perYear.toFixed(2) })}</p>
              <p className="text-xs text-stone-300 leading-relaxed">{t('comparison.everstead.description')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24 bg-white border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[0.95fr_1.05fr] gap-14 items-start">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600 mb-4">{t('security.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              {t('security.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-stone-600">
              {t('security.body')}
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
              <div className="px-5 py-4">{t('table.capability')}</div>
              <div className="px-5 py-4 text-center">{t('table.essential')}</div>
              <div className="px-5 py-4 text-center">{t('table.family')}</div>
              <div className="px-5 py-4 text-center">{t('table.adviser')}</div>
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 mb-4">{t('disclaimer.eyebrow')}</p>
            <h2 className="font-display text-3xl font-light text-navy-950">{t('disclaimer.title')}</h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-700">
              {t('disclaimer.body')}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/terms" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                {t('disclaimer.readTerms')} <ArrowRight size={15} />
              </Link>
              <Link to="/book-demo" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                {t('disclaimer.discussRollout')} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-white border-t border-stone-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600 mb-4">{t('faq.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              {t('faq.title')}
            </h2>
          </div>
          <div className="reveal reveal-delay-1">
            <FaqAccordion faqs={faqs} />
          </div>
          <p className="mt-10 text-center text-sm text-stone-500">
            {t('faq.stillQuestion')}{' '}
            <a href="mailto:support@everstead.care" className="text-navy-700 font-medium hover:text-navy-900 transition-colors">
              {t('faq.writeToUs')}
            </a>{' '}
            {t('faq.replyTime')}
          </p>
        </div>
      </section>
    </div>
  </>
  )
}
