// /pricing and /fr/pricing.
//
// Two plans, one decision. A family wants the number, what it buys, and what
// happens if they stop paying; everything on this page exists to answer those
// three things without a single figure that could not be checked. Prices come
// from config/pricing via marketPricing, never from copy, so the French page
// shows its own euro list price and its own saving.
//
// Organisations are a different purchase and get a doorway to the business
// tree rather than a third card. The old "cheaper than a solicitor" block is
// gone: it compared a vault to probate, with figures nobody could source, on
// a page that says two screens later that Everstead is not a legal service.
import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Briefcase, Check, ChevronDown, Gift, Minus, ShieldCheck } from 'lucide-react'
import { marketPricing } from '../config/pricing'

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

// One plan. The price block and the list are the whole argument, so they get
// the room; the microcopy under the button says what happens after the click.
function PlanCard({ highlight, badge, name, tagline, priceMain, priceSuffix, priceSub, features, cta, href, micro, delay }) {
  const ink = highlight ? 'text-white' : 'text-navy-950'
  const muted = highlight ? 'text-stone-300' : 'text-stone-600'
  return (
    <div className={`reveal ${delay || ''} rounded-[2rem] border p-7 sm:p-8 flex flex-col ${highlight ? 'border-navy-300 bg-navy-950 text-white shadow-xl shadow-navy-950/10' : 'border-stone-200 bg-white text-navy-950'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-semibold m-0 ${highlight ? 'text-sage-300' : 'text-navy-700'}`}>{name}</p>
        {badge && <span className="inline-block rounded-full bg-sage-500 px-3 py-1 text-xs font-semibold text-white">{badge}</span>}
      </div>
      <p className={`mt-2 text-sm leading-relaxed m-0 ${muted}`}>{tagline}</p>

      <div className="mt-7">
        <div className="flex items-end gap-2">
          <span className={`font-display text-5xl font-light leading-none ${ink}`}>{priceMain}</span>
          {priceSuffix && <span className={`pb-1 text-sm ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>{priceSuffix}</span>}
        </div>
        <p className={`mt-2 text-[12px] m-0 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>{priceSub}</p>
      </div>

      <ul className="mt-7 space-y-2.5 flex-1 list-none m-0 p-0">
        {features.map(f => (
          <li key={f} className="flex items-start gap-3 text-sm leading-relaxed">
            <Check size={15} className={`mt-1 shrink-0 ${highlight ? 'text-sage-300' : 'text-sage-700'}`} />
            <span className={highlight ? 'text-stone-200' : 'text-stone-700'}>{f}</span>
          </li>
        ))}
      </ul>

      <Link to={href} className={`inline-flex items-center justify-center gap-2 mt-7 w-full rounded-full px-5 py-3.5 text-sm font-semibold ${highlight ? 'btn-aurora' : 'border border-navy-200 text-navy-800 hover:bg-navy-50 transition-colors'}`}>
        {cta} <ArrowRight size={15} />
      </Link>
      <p className={`mt-3 text-center text-xs leading-relaxed m-0 ${highlight ? 'text-stone-400' : 'text-stone-500'}`}>{micro}</p>
    </div>
  )
}

// A tick, a dash, or a number. The tick and the dash carry a hidden label so
// a screen reader hears "included" rather than nothing.
function Cell({ value, strong, t }) {
  if (value === true) return <><Check size={16} className={`inline ${strong ? 'text-sage-700' : 'text-sage-600'}`} aria-hidden="true" /><span className="sr-only">{t('compare.included')}</span></>
  if (value === false) return <><Minus size={16} className="inline text-stone-300" aria-hidden="true" /><span className="sr-only">{t('compare.notIncluded')}</span></>
  return <span className={strong ? 'font-semibold text-navy-950' : 'text-stone-600'}>{value}</span>
}

export default function Pricing() {
  useReveal()
  const { t, i18n } = useTranslation('pricing')
  const [annual, setAnnual] = useState(true)

  const isFr = i18n.language === 'fr'
  const urlPrefix = isFr ? '/fr' : ''

  // Every figure on the page comes from here. The French market has its own
  // euro list price, and its yearly saving is two months rather than 20%, so
  // nothing below derives one market's numbers from the other's.
  const m = marketPricing(i18n.language)
  const monthly        = m.family.monthly.perMonth
  const perMonthYearly = m.family.annual.perMonth
  const perYear        = m.family.annual.perYear
  const savingPct      = Math.round((1 - perMonthYearly / monthly) * 100)
  const savingRound    = Math.round(monthly * 12 - perYear)
  const whole = (n) => (isFr ? `${n} €` : `£${n}`)
  const vars = {
    monthly: m.money(monthly),
    perMonthYearly: m.money(perMonthYearly),
    perYear: m.money(perYear),
    monthlyTotal: m.money(monthly * 12),
    saving: whole(savingRound),
    percent: savingPct,
  }

  // i18next hands back the array untouched when returnObjects is set, so the
  // figures in the answers are filled in here rather than by the translator.
  const fill = (s) => String(s ?? '').replace(/{{(\w+)}}/g, (_, k) => (vars[k] ?? ''))
  const rawFaqs = t('faq.items', { returnObjects: true })
  const faqs = (Array.isArray(rawFaqs) ? rawFaqs : []).map(({ q, a }) => ({ q: fill(q), a: fill(a) }))
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (Array.isArray(faqs) ? faqs : []).map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const rows = t('compare.rows', { returnObjects: true })
  const sameItems = t('same.items', { returnObjects: true })
  const plusHref = `/get-started?plan=family&billing=${annual ? 'yearly' : 'monthly'}`

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
      <meta property="og:image" content="https://www.everstead.care/og-image.jpg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="https://www.everstead.care/og-image.jpg" />
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
    <HreflangLinks path="/pricing" />
    <div className="bg-stone-50 pt-24">

      {/* ── Hero: the two prices are in the first sentence ── */}
      <section className="pt-16 pb-14 lg:pt-24 lg:pb-20 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">{t('header.eyebrow')}</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            {t('header.title')}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto text-balance">
            {t('header.subtitle', vars)}
          </p>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="py-12 lg:py-16 bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col items-center gap-3 mb-8 reveal">
            <div className="inline-flex rounded-full bg-navy-950 p-1.5 gap-1" role="group" aria-label={t('toggle.aria')}>
              <button
                onClick={() => setAnnual(false)}
                aria-pressed={!annual}
                className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-colors ${!annual ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
              >
                {t('toggle.monthly')}
              </button>
              <button
                onClick={() => setAnnual(true)}
                aria-pressed={annual}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-colors ${annual ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-400 hover:text-stone-200'}`}
              >
                {t('toggle.yearly')}
                <span className={`font-semibold text-xs ${annual ? 'text-sage-600' : 'text-sage-400'}`}>{t('toggle.save', vars)}</span>
              </button>
            </div>
            <p className="text-sm text-stone-500 text-center m-0">{annual ? t('toggle.noteYearly', vars) : t('toggle.noteMonthly', vars)}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 items-stretch">
            <PlanCard
              name={t('plans.free.name')}
              tagline={t('plans.free.tagline')}
              priceMain={t('plans.free.priceLabel')}
              priceSub={t('plans.free.priceSub')}
              features={t('plans.free.features', { returnObjects: true })}
              cta={t('plans.free.cta')}
              href="/get-started?plan=free"
              micro={t('plans.free.micro')}
              delay="reveal-delay-1"
            />
            <PlanCard
              highlight
              badge={t('plans.family.badge')}
              name={t('plans.family.name')}
              tagline={t('plans.family.tagline')}
              priceMain={annual ? vars.perMonthYearly : vars.monthly}
              priceSuffix={t('prices.perMonth')}
              priceSub={annual ? t('prices.billedYearly', vars) : t('prices.billedMonthly', vars)}
              features={t('plans.family.features', { returnObjects: true })}
              cta={t('plans.family.cta')}
              href={plusHref}
              micro={annual ? t('plans.family.microYearly', vars) : t('plans.family.microMonthly', vars)}
              delay="reveal-delay-2"
            />
          </div>

          <p className="reveal text-center mt-7 text-stone-500 text-sm">
            {t('dataPromise.text')}{' '}
            <Link to="/data-promise" className="text-navy-700 font-medium hover:text-navy-900 underline underline-offset-2 transition-colors">{t('dataPromise.link')}</Link>
          </p>
        </div>
      </section>

      {/* ── What changes, line by line ── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-8 reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600 mb-4">{t('compare.eyebrow')}</p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 text-balance">{t('compare.title')}</h2>
            <p className="mt-4 text-stone-600 leading-relaxed max-w-xl mx-auto">{t('compare.body')}</p>
          </div>
          <div className="reveal reveal-delay-1 rounded-[1.75rem] border border-stone-200 bg-white overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_84px_96px] sm:grid-cols-[minmax(0,1fr)_120px_140px] bg-navy-950 text-white text-xs sm:text-sm font-semibold">
              <div className="px-4 sm:px-6 py-4">{t('compare.what')}</div>
              <div className="px-2 py-4 text-center">{t('compare.free')}</div>
              <div className="px-2 py-4 text-center text-sage-300">{t('compare.plus')}</div>
            </div>
            {(Array.isArray(rows) ? rows : []).map((row, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_84px_96px] sm:grid-cols-[minmax(0,1fr)_120px_140px] border-t border-stone-100 text-sm">
                <div className="px-4 sm:px-6 py-3.5 text-stone-700 leading-snug">{row.label}</div>
                <div className="px-2 py-3.5 text-center"><Cell value={row.free} t={t} /></div>
                <div className="px-2 py-3.5 text-center bg-navy-50/50"><Cell value={row.plus} strong t={t} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What never changes ── */}
      <section className="py-16 lg:py-20 bg-white border-y border-stone-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600 mb-4">{t('same.eyebrow')}</p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 text-balance">{t('same.title')}</h2>
            <p className="mt-4 text-stone-600 leading-relaxed">{t('same.body')}</p>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            {(Array.isArray(sameItems) ? sameItems : []).map((item, i) => (
              <div key={i} className={`reveal reveal-delay-${Math.min(i + 1, 3)} flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4`}>
                <ShieldCheck size={17} className="text-navy-700 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-navy-950 m-0">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 m-0">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Not a family? ── */}
      <section className="py-14 lg:py-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 space-y-5">
          <div className="reveal rounded-[2rem] border border-stone-200 bg-white p-7 sm:flex sm:items-center sm:justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900 m-0">
                <Briefcase size={15} className="text-navy-600" /> {t('businessPointer.title')}
              </p>
              <p className="mt-1.5 text-stone-600 text-sm leading-relaxed m-0">{t('businessPointer.body')}</p>
            </div>
            <Link to={isFr ? '/entreprises/tarifs' : '/business/pricing'}
              className="mt-4 sm:mt-0 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border border-stone-200 text-navy-800 hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0">
              {t('businessPointer.cta')} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="reveal reveal-delay-1 rounded-[2rem] border border-stone-200 bg-white p-7 sm:flex sm:items-center sm:justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900 m-0">
                <Gift size={15} className="text-navy-600" /> {t('gift.title')}
              </p>
              <p className="mt-1.5 text-stone-600 text-sm leading-relaxed m-0">{t('gift.body')}</p>
            </div>
            <Link to="/gift"
              className="mt-4 sm:mt-0 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border border-stone-200 text-navy-800 hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0">
              {t('gift.cta')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Not a legal service ── */}
      <section className="pb-16 lg:pb-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="reveal rounded-[2rem] border border-amber-200 bg-amber-50 p-7 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 mb-3">{t('disclaimer.eyebrow')}</p>
            <h2 className="font-display text-2xl sm:text-3xl font-light text-navy-950">{t('disclaimer.title')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">{t('disclaimer.body')}</p>
            <Link to="/terms" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
              {t('disclaimer.readTerms')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 lg:py-24 bg-white border-t border-stone-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600 mb-4">{t('faq.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">{t('faq.title')}</h2>
          </div>
          <div className="reveal reveal-delay-1">
            <FaqAccordion faqs={Array.isArray(faqs) ? faqs : []} />
          </div>
          <p className="mt-10 text-center text-sm text-stone-500">
            {t('faq.stillQuestion')}{' '}
            <a href="mailto:support@everstead.care" className="text-navy-700 font-medium hover:text-navy-900 transition-colors">{t('faq.writeToUs')}</a>{' '}
            {t('faq.replyTime')}
          </p>
        </div>
      </section>
    </div>
  </>
  )
}
