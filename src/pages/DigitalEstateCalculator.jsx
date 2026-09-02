import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, RotateCcw, Copy, CheckCheck } from 'lucide-react'
import EmailCaptureCard from '../components/EmailCaptureCard'
import HreflangLinks from '../components/HreflangLinks'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/estateCalculator.json'
import frCopy from '../i18n/locales/fr/estateCalculator.json'

// Self-registered namespace. The two markets differ in more than the words:
// the UK version watches the £325,000 nil-rate band, the French one the
// 100 000 € abattement each child receives, and euros sit after the number.
i18n.addResourceBundle('en', 'estateCalculator', enCopy)
i18n.addResourceBundle('fr', 'estateCalculator', frCopy)

// ─── Asset categories & fields (labels live in the locale files) ─────────────

const CATEGORIES = [
  { id: 'financial', color: '#0d1628', fields: ['current_savings', 'isas', 'pensions', 'investments'] },
  { id: 'property',  color: '#4c7d47', fields: ['property_equity', 'other_property'], noted: ['property_equity'] },
  { id: 'digital',   color: '#d97706', fields: ['crypto'] },
  { id: 'other',     color: '#78716c', fields: ['business', 'vehicles', 'valuables'] },
]

const ALL_FIELD_IDS = CATEGORIES.flatMap(cat => cat.fields)

// Market rules keyed by interface language (fr ⇔ France, en ⇔ UK).
const MARKETS = {
  en: {
    locale:    'en-GB',
    currency:  'GBP',
    symbol:    '£',
    suffix:    false,
    taxLow:    325_000,   // nil-rate band
    taxHigh:   500_000,
    shareBase: 'https://www.everstead.care/digital-estate-worth',
  },
  fr: {
    locale:    'fr-FR',
    currency:  'EUR',
    symbol:    '€',
    suffix:    true,
    taxLow:    100_000,   // abattement per child in the direct line
    taxHigh:   500_000,
    shareBase: 'https://www.everstead.care/fr/digital-estate-worth',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseValue(str) {
  const n = parseInt(String(str).replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

function makeMoney(market) {
  const fmt = (n) => n.toLocaleString(market.locale)
  return {
    fmt,
    money: (n) => (market.suffix ? `${fmt(n)} ${market.symbol}` : `${market.symbol}${fmt(n)}`),
  }
}

function contextKey(total, market) {
  if (total < 50_000)         return 'modest'
  if (total < market.taxLow)  return 'meaningful'
  if (total < market.taxHigh) return 'taxable'
  return 'significant'
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target, duration = 900, trigger = false) {
  const [value, setValue] = useState(0)
  const raf               = useRef(null)
  const prev              = useRef(0)

  useEffect(() => {
    if (!trigger && target === 0) { setValue(0); return }
    const from  = prev.current
    const delta = target - from
    if (delta === 0) return
    const startTime = performance.now()
    const tick = (now) => {
      const elapsed = now - startTime
      const t       = Math.min(elapsed / duration, 1)
      const eased   = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setValue(Math.round(from + delta * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else prev.current = target
    }
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

// ─── Donut chart (pure SVG) ───────────────────────────────────────────────────

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const sweep = Math.min(endAngle - startAngle, 359.99)
  const start = polar(cx, cy, r, startAngle)
  const end   = polar(cx, cy, r, startAngle + sweep)
  const large = sweep > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

function DonutChart({ categoryTotals, displayTotal, money, ariaLabel, centreLabel }) {
  const cx = 80, cy = 80, r = 64, strokeW = 16
  const gap = 3

  const segments = CATEGORIES
    .map(cat => ({ cat, value: categoryTotals[cat.id] || 0 }))
    .filter(s => s.value > 0)
  const total   = segments.reduce((a, s) => a + s.value, 0)
  const hasData = total > 0

  let cursor = 0
  const arcs = segments.map(s => {
    const span  = (s.value / total) * (360 - gap * segments.length)
    const start = cursor
    cursor += span + gap
    return { ...s, start, span }
  })

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[200px] sm:max-w-[220px]" aria-label={ariaLabel} role="img">
      {!hasData && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e7e5e4" strokeWidth={strokeW} />}
      {arcs.map(({ cat, start, span }) => (
        <path
          key={cat.id}
          d={arcPath(cx, cy, r, start, start + span)}
          fill="none"
          stroke={cat.color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease, opacity 0.4s ease' }}
        />
      ))}
      <text x={cx} y={cy - 7} textAnchor="middle" dominantBaseline="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="14" fontWeight="300" fill="#0d1628">
        {money(hasData ? displayTotal : 0)}
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle" dominantBaseline="middle" fontFamily="'DM Sans', system-ui, sans-serif" fontSize="7" fill="#78716c">
        {centreLabel}
      </text>
    </svg>
  )
}

// ─── Currency input ───────────────────────────────────────────────────────────

function CurrencyInput({ id, label, placeholder, note, value, onChange, market, ariaLabel }) {
  const handleChange = (e) => {
    const raw     = e.target.value.replace(/[^0-9]/g, '')
    const display = raw ? parseInt(raw, 10).toLocaleString(market.locale) : ''
    onChange(display)
  }
  const symbolCls = market.suffix ? 'right-3.5' : 'left-3.5'
  const inputPad  = market.suffix ? 'pl-4 pr-9' : 'pl-8 pr-4'

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-navy-900 leading-snug">
        {label}
        {note && <span className="block text-xs font-normal text-stone-400 mt-0.5">{note}</span>}
      </label>
      <div className="relative flex items-center">
        <span aria-hidden="true" className={`absolute ${symbolCls} text-sm font-medium text-stone-400 pointer-events-none select-none`}>
          {market.symbol}
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full ${inputPad} py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-navy-950 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent transition`}
          aria-label={ariaLabel}
        />
      </div>
    </div>
  )
}

// ─── Category legend item ─────────────────────────────────────────────────────

function LegendItem({ color, label, value, pct, money }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
        <span className="text-xs text-stone-500 truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <span className="text-xs font-medium text-navy-950">{money(value)}</span>
        {pct > 0 && <span className="text-[10px] text-stone-400 ml-1.5">({pct}%)</span>}
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible, message }) {
  return (
    <div
      aria-live="polite"
      className={[
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-2.5 rounded-full',
        'bg-navy-950 text-white text-sm font-medium shadow-xl',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
      ].join(' ')}
    >
      <CheckCheck size={15} className="text-sage-400" />
      {message}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const EMPTY_VALUES = Object.fromEntries(ALL_FIELD_IDS.map(id => [id, '']))

export default function DigitalEstateCalculator() {
  const { t, i18n: i18nInstance } = useTranslation('estateCalculator')
  const lang    = i18nInstance.language === 'fr' ? 'fr' : 'en'
  const market  = MARKETS[lang]
  const { fmt, money } = makeMoney(market)
  const pageUrl = `https://www.everstead.care${lang === 'fr' ? '/fr' : ''}/digital-estate-worth`

  const [values, setValues]      = useState(EMPTY_VALUES)
  const [toastVisible, setToast] = useState(false)
  const toastTimer               = useRef(null)

  const categoryTotals = Object.fromEntries(
    CATEGORIES.map(cat => [cat.id, cat.fields.reduce((sum, id) => sum + parseValue(values[id] || ''), 0)])
  )
  const grandTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0)

  const hasAnyValue  = grandTotal > 0
  const displayTotal = useCountUp(grandTotal)
  const exceedsLow   = grandTotal > market.taxLow
  const exceedsHigh  = grandTotal >= market.taxHigh

  const handleChange = useCallback((fieldId, display) => {
    setValues(prev => ({ ...prev, [fieldId]: display }))
  }, [])

  function handleReset() {
    setValues(EMPTY_VALUES)
  }

  async function handleShare() {
    const url = `${market.shareBase}#est=${encodeURIComponent(grandTotal)}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    clearTimeout(toastTimer.current)
    setToast(true)
    toastTimer.current = setTimeout(() => setToast(false), 2800)
  }

  // A shared link carries the total in the hash; pre-fill one line so it renders.
  useEffect(() => {
    const match = window.location.hash.match(/est=([0-9]+)/)
    if (match) {
      const shared = parseInt(match[1], 10)
      if (!isNaN(shared) && shared > 0) setValues(prev => ({ ...prev, pensions: fmt(shared) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fieldLabel = (cat, id) => t(`categories.${cat.id}.fields.${id}.label`)

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.desc')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.desc')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>
      <HreflangLinks path="/digital-estate-worth" />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-3xl mx-auto px-6 pt-28 pb-16 lg:pt-32 lg:pb-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-4">{t('hero.eyebrow')}</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            {t('hero.title')}
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-stone-300 max-w-xl mx-auto">{t('hero.sub')}</p>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 pt-8">
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">

          {/* ── LEFT: input card ── */}
          <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden">
            <div className="px-6 sm:px-8 pt-8 pb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">{t('form.heading')}</p>
            </div>

            <div className="px-6 sm:px-8 pb-8 pt-4 space-y-8">
              {CATEGORIES.map(cat => (
                <fieldset key={cat.id}>
                  <legend className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} aria-hidden="true" />
                    <span className="text-sm font-semibold text-navy-950 uppercase tracking-wider">{t(`categories.${cat.id}.label`)}</span>
                  </legend>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {cat.fields.map(id => (
                      <CurrencyInput
                        key={id}
                        id={id}
                        label={fieldLabel(cat, id)}
                        placeholder={t(`categories.${cat.id}.fields.${id}.placeholder`)}
                        note={cat.noted?.includes(id) ? t(`categories.${cat.id}.fields.${id}.note`) : undefined}
                        value={values[id]}
                        onChange={(val) => handleChange(id, val)}
                        market={market}
                        ariaLabel={t('form.inputAria', { label: fieldLabel(cat, id) })}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="px-6 sm:px-8 pb-7 border-t border-stone-100 pt-5 flex items-center justify-end">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-navy-700 transition-colors duration-150 focus:outline-none focus-visible:underline"
                aria-label={t('form.resetAria')}
              >
                <RotateCcw size={13} />
                {t('form.reset')}
              </button>
            </div>
          </div>

          {/* ── RIGHT: results panel ── */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <div
              className={[
                'bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden transition-all duration-500',
                hasAnyValue ? 'opacity-100 translate-y-0' : 'opacity-40',
              ].join(' ')}
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="px-6 pt-7 pb-5 text-center border-b border-stone-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">{t('results.heading')}</p>
                <p className="font-display text-4xl sm:text-5xl font-light text-navy-950 leading-none tabular-nums" aria-label={t('results.totalAria', { total: money(displayTotal) })}>
                  {money(displayTotal)}
                </p>
              </div>

              <div className="px-6 py-6 flex flex-col items-center gap-5">
                <DonutChart
                  categoryTotals={categoryTotals}
                  displayTotal={displayTotal}
                  money={money}
                  ariaLabel={t('results.donutAria', { total: money(displayTotal) })}
                  centreLabel={t('results.centre')}
                />
                <div className="w-full space-y-2">
                  {CATEGORIES.map(cat => {
                    const val = categoryTotals[cat.id]
                    const pct = grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0
                    return <LegendItem key={cat.id} color={cat.color} label={t(`categories.${cat.id}.label`)} value={val} pct={pct} money={money} />
                  })}
                </div>
              </div>

              {hasAnyValue && (
                <div className="mx-5 mb-5 rounded-xl bg-stone-50 border border-stone-200 px-4 py-3.5">
                  <p className="text-sm leading-relaxed text-stone-700">{t(`context.${contextKey(grandTotal, market)}`)}</p>
                </div>
              )}

              {exceedsLow && (
                <div className="mx-5 mb-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">{t('tax.title')}</p>
                  <p className="text-sm leading-relaxed text-amber-800">
                    {t('tax.body')} {exceedsHigh ? t('tax.high') : t('tax.mid')}
                  </p>
                </div>
              )}

              <div className="px-5 pb-6 space-y-3">
                <button
                  onClick={handleShare}
                  disabled={!hasAnyValue}
                  className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-navy-200 bg-navy-50 hover:bg-navy-100 hover:border-navy-300 text-navy-800 text-sm font-medium px-4 py-3 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
                  aria-label={t('results.shareAria')}
                >
                  <Copy size={15} />
                  {t('results.share')}
                </button>
              </div>
            </div>

            {grandTotal > 0 && (
              <EmailCaptureCard
                source="digital-estate-calculator"
                title={t('email.title')}
                subtitle={t('email.sub')}
                buttonLabel={t('email.button')}
                metadata={{
                  total: grandTotal,
                  currency: market.currency,
                  breakdown: CATEGORIES
                    .filter(cat => (categoryTotals[cat.id] || 0) > 0)
                    .map(cat => ({
                      label: t(`categories.${cat.id}.label`),
                      value: new Intl.NumberFormat(market.locale, { style: 'currency', currency: market.currency, maximumFractionDigits: 0 }).format(categoryTotals[cat.id] || 0),
                    })),
                }}
              />
            )}

            <div className="aurora-field aurora-dim rounded-2xl border border-navy-800 px-6 py-7 text-center">
              <p className="font-display text-xl font-light text-white leading-snug mb-2">{t('cta.title')}</p>
              <p className="text-sm text-stone-400 leading-relaxed mb-5">{t('cta.body')}</p>
              <Link
                to="/get-started"
                className="btn-aurora inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
              >
                {t('cta.button')}
                <ArrowRight size={15} />
              </Link>
              <p className="mt-3 text-[11px] text-stone-600">{t('cta.note')}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 leading-relaxed mt-8 max-w-2xl mx-auto">{t('disclaimer')}</p>
      </section>

      <Toast visible={toastVisible} message={t('results.copied')} />
    </>
  )
}
