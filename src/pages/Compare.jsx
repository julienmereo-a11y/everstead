import React from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { marketPricing } from '../config/pricing'
import i18n from '../i18n'
import { useReveal } from '../components/useReveal'
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import NotFound from './NotFound'
import enCompare from '../i18n/locales/en/compare.json'
import frCompare from '../i18n/locales/fr/compare.json'

// The "compare" namespace is registered here (not in src/i18n/index.js) so the
// JSON ships with this lazy-loaded page instead of the main bundle.
if (!i18n.hasResourceBundle('en', 'compare')) {
  i18n.addResourceBundle('en', 'compare', enCompare)
  i18n.addResourceBundle('fr', 'compare', frCompare)
}

// ─────────────────────────────────────────────────────────────────────────────
// NON-TEXT DATA — all visible copy lives in the "compare" i18n namespace.
// ROW_THEM_FLAGS holds the competitor-column tick per feature row, in the same
// order as competitors.<slug>.rows in the namespace (Everstead's column is
// always a tick). Add a new slug here + in both compare.json files to create a
// new comparison page.
// ─────────────────────────────────────────────────────────────────────────────
const ROW_THEM_FLAGS = {
  farewill:         [false, false, false, false, false, false, false, false],
  settld:           [false, false, false, false, false, false, false, false],
  safekeep:         [true, true, true, false, false, false, false, false, false, false, false],
  'octopus-legacy': [false, false, false, false, false, false, false, false, false],
  lyfeguard:        [true, true, true, true, false, false, false, false, false, false, false],
  'doing-nothing':  [false, false, false, false, false, false, false, false, false, false, true],
}

// Display order for the index grid
const COMPARE_ORDER = [
  'doing-nothing', 'farewill', 'octopus-legacy',
  'safekeep', 'lyfeguard', 'settld',
]

// Slugs that make sense on the French tree (/fr). The named UK competitors are
// meaningless for French visitors, so the French index only lists these, and
// only these slug pages advertise a French hreflang alternate. Non-FR slug
// pages still render if reached by direct URL (they keep their canonical link,
// just no alternates). The English index is unaffected and lists everything.
const FR_SLUGS = new Set(['doing-nothing'])

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Compare() {
  useReveal()
  const { slug } = useParams()
  const { t, i18n: i18nInstance } = useTranslation('compare')
  // Hoisted above the early returns — hooks must run on every render.
  const { pathname } = useLocation()

  // No slug → render the comparison index
  if (!slug) return <CompareIndex />

  if (!ROW_THEM_FLAGS[slug]) return <NotFound />

  const localePrefix = i18nInstance.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/compare/${slug}`

  const c = `competitors.${slug}`
  const name = t(`${c}.name`)
  const tagline = t(`${c}.tagline`)
  const headline = t(`${c}.headline`)
  const subhead = t(`${c}.subhead`)
  const eversteadDesc = t(`${c}.eversteadDesc`)
  const competitorDesc = t(`${c}.competitorDesc`)
  const category = t(`${c}.category`)
  const verdict = t(`${c}.verdict`)
  const market = marketPricing(i18nInstance.language)
  const price = t(`${c}.price`, { monthly: market.money(market.family.monthly.perMonth) })
  const competitorPrice = t(`${c}.competitorPrice`)
  const cta = t(`${c}.cta`)
  const rows = t(`${c}.rows`, { returnObjects: true })
    .map((feature, i) => ({ feature, everstead: true, them: ROW_THEM_FLAGS[slug][i] }))
  const competitorAlso = t(`${c}.competitorAlso`, { returnObjects: true, defaultValue: [] })
  const positioning = t(`${c}.positioning`, { returnObjects: true })

  return (
    <>
      <Helmet>
        <title>{t('detail.metaTitle', { tagline })}</title>
        <meta name="description" content={subhead} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('detail.metaTitle', { tagline })} />
        <meta property="og:description" content={subhead} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>
      {/* Only country-neutral comparisons exist as a pair across both trees;
          UK-competitor pages must not advertise a French alternate. */}
      {FR_SLUGS.has(slug) && <HreflangLinks path={pathname} />}

      <div className="bg-stone-50 min-h-screen">

        {/* Hero — extends under the fixed nav */}
        <section className="pt-44 pb-20 lg:pt-52 lg:pb-28 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">{t('detail.eyebrow', { name })}</p>
            <h1 className="font-display text-4xl lg:text-6xl font-light text-white leading-tight text-balance">
              {headline}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              {subhead}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/get-started" className="btn-aurora inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors">
                {cta} <ArrowRight size={14} />
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors">
                {t('detail.seePricing')}
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
                  <span className="text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full font-medium">{t('detail.eversteadBadge')}</span>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-700">{t('detail.verdictEyebrow')}</p>
                </div>
                <p className="text-navy-900 text-lg leading-relaxed">{verdict}</p>
              </div>
            )}

            {/* Feature comparison table */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-8">{t('detail.tableTitle')}</h2>
              <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white">
                {/* Header */}
                <div className="grid grid-cols-3 bg-navy-50 border-b border-stone-200">
                  <div className="px-6 py-4 col-span-1">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">{t('detail.tableFeature')}</p>
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
              <p className="mt-3 text-xs text-stone-400">{t('detail.tableFootnote')}</p>
            </div>

            {/* What the competitor also offers — honest aside */}
            {Array.isArray(competitorAlso) && competitorAlso.length > 0 && (
              <div className="reveal rounded-2xl border border-stone-200 bg-white p-7">
                <h3 className="font-semibold text-navy-900 mb-2">{t('detail.alsoTitle', { name })}</h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  <Trans t={t} i18nKey="detail.alsoIntro" values={{ name }} components={{ em: <em /> }} />
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
                  {t('detail.alsoOutro')}
                </p>
              </div>
            )}

            {/* The real difference */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-6">{t('detail.differenceTitle')}</h2>
              <div className="space-y-4">
                {positioning.map((para, i) => (
                  <p key={i} className="text-stone-600 text-sm leading-relaxed">{para}</p>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="reveal rounded-2xl aurora-field aurora-dim px-10 py-10 text-center">
              <h2 className="font-display text-2xl font-light text-white mb-3">{t('detail.ctaTitle')}</h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                {t('detail.ctaBody')}
              </p>
              <Link
                to="/get-started"
                className="btn-aurora inline-flex items-center gap-2 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
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
  const { t, i18n: i18nInstance } = useTranslation('compare')

  const localePrefix = i18nInstance.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/compare`

  const cards = COMPARE_ORDER
    .filter(slug => ROW_THEM_FLAGS[slug])
    .filter(slug => i18nInstance.language !== 'fr' || FR_SLUGS.has(slug))
    .map(slug => ({
      slug,
      name: t(`competitors.${slug}.name`),
      category: t(`competitors.${slug}.category`),
      headline: t(`competitors.${slug}.headline`),
    }))

  return (
    <>
      <Helmet>
        <title>{t('index.meta.title')}</title>
        <meta name="description" content={t('index.meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={t('index.meta.ogTitle')} />
        <meta property="og:description" content={t('index.meta.ogDescription')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>
      <HreflangLinks path="/compare" />

      <div className="bg-stone-50 min-h-screen">
        {/* Hero */}
        <section className="pt-44 pb-16 lg:pt-52 lg:pb-20 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">{t('index.eyebrow')}</p>
            <h1 className="font-display text-4xl lg:text-6xl font-light text-white leading-tight text-balance">
              {t('index.title')}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              {t('index.subtitle')}
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
                    <span className="text-stone-300">{t('index.vs')}</span>
                    <span className="font-semibold text-navy-900">{name}</span>
                  </div>
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-3">{category}</p>
                  <p className="text-sm text-stone-600 leading-relaxed flex-1">{headline}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 group-hover:gap-2.5 transition-all">
                    {t('index.seeComparison')} <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>

            {/* CTA */}
            <div className="reveal mt-14 rounded-2xl aurora-field aurora-dim px-8 py-9 text-center">
              <h2 className="font-display text-2xl font-light text-white mb-3">{t('index.cta.title')}</h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                {t('index.cta.body')}
              </p>
              <Link
                to="/get-started"
                className="btn-aurora inline-flex items-center gap-2 text-white px-6 py-3 rounded-full text-sm font-semibold transition-colors"
              >
                {t('index.cta.button')} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
