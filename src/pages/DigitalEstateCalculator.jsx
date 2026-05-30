import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowRight, RotateCcw, Copy, CheckCheck } from 'lucide-react'
import EmailCaptureCard from '../components/EmailCaptureCard'

// ─── Asset categories & fields ────────────────────────────────────────────────

const CATEGORIES = [
  {
    id:    'financial',
    label: 'Financial',
    color: '#0d1628',   // navy-950
    fields: [
      { id: 'current_savings',   label: 'Current & savings accounts', placeholder: '12,000' },
      { id: 'isas',              label: 'ISAs',                        placeholder: '45,000' },
      { id: 'pensions',          label: 'Pensions',                    placeholder: '180,000' },
      { id: 'investments',       label: 'Investments & shares',        placeholder: '30,000' },
    ],
  },
  {
    id:    'property',
    label: 'Property',
    color: '#4c7d47',   // sage-500
    fields: [
      {
        id:          'property_equity',
        label:       'Property equity',
        placeholder: '200,000',
        note:        'Estimated value minus outstanding mortgage',
      },
      { id: 'other_property', label: 'Other property', placeholder: '0' },
    ],
  },
  {
    id:    'digital',
    label: 'Digital assets',
    color: '#d97706',   // amber-600
    fields: [
      { id: 'crypto', label: 'Cryptocurrency', placeholder: '0' },
    ],
  },
  {
    id:    'other',
    label: 'Other assets',
    color: '#78716c',   // stone-500
    fields: [
      { id: 'business',  label: 'Business interests',    placeholder: '0'     },
      { id: 'vehicles',  label: 'Vehicles',              placeholder: '8,000' },
      { id: 'valuables', label: 'Valuable personal items', placeholder: '5,000' },
    ],
  },
]

const ALL_FIELDS = CATEGORIES.flatMap(cat =>
  cat.fields.map(f => ({ ...f, categoryId: cat.id }))
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip non-digits, parse as integer */
function parseValue(str) {
  const n = parseInt(str.replace(/[^0-9]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

/** Format a number with thousands commas */
function fmt(n) {
  return n.toLocaleString('en-GB')
}

/** Format with £ prefix */
function fmtGBP(n) {
  return '£' + fmt(n)
}

/** Contextual message based on total */
function contextMessage(total) {
  if (total < 50_000)
    return 'A modest estate — still worth organising carefully for your family.'
  if (total < 325_000)
    return 'A meaningful estate. Clear records will make a real difference to your family.'
  if (total < 500_000)
    return 'This estate may be subject to inheritance tax. Professional advice is recommended.'
  return 'A significant estate. Thorough planning and professional advice are strongly recommended.'
}

/** Build URL-encoded shareable hash */
function buildShareUrl(total) {
  const base = 'https://www.everstead.care/digital-estate-worth'
  return `${base}#est=${encodeURIComponent(total)}`
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
      const elapsed  = now - startTime
      const t        = Math.min(elapsed / duration, 1)
      // ease-out-expo
      const eased    = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      const current  = Math.round(from + delta * eased)
      setValue(current)
      if (t < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        prev.current = target
      }
    }

    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

// ─── Donut chart (pure SVG) ───────────────────────────────────────────────────

/**
 * Converts polar coordinates to Cartesian.
 * cx/cy = centre, r = radius, angleDeg = degrees from 12 o'clock.
 */
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/**
 * Returns an SVG arc path for a donut segment.
 * startAngle / endAngle in degrees (0 = top, clockwise).
 */
function arcPath(cx, cy, r, startAngle, endAngle) {
  // Clamp to avoid degenerate arcs (full 360 = invisible in SVG)
  const sweep = Math.min(endAngle - startAngle, 359.99)
  const start = polar(cx, cy, r, startAngle)
  const end   = polar(cx, cy, r, startAngle + sweep)
  const large = sweep > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

function DonutChart({ categoryTotals, grandTotal, displayTotal }) {
  const cx = 80, cy = 80, r = 64, strokeW = 16
  const gap = 3 // degrees between segments

  // Build segments only for non-zero categories
  const segments = CATEGORIES
    .map(cat => ({ cat, value: categoryTotals[cat.id] || 0 }))
    .filter(s => s.value > 0)

  const total    = segments.reduce((a, s) => a + s.value, 0)
  const hasData  = total > 0

  // Compute angles
  let cursor = 0
  const arcs = segments.map(s => {
    const span  = (s.value / total) * (360 - gap * segments.length)
    const start = cursor
    cursor += span + gap
    return { ...s, start, span }
  })

  return (
    <svg
      viewBox="0 0 160 160"
      className="w-full max-w-[200px] sm:max-w-[220px]"
      aria-label={`Donut chart showing estate breakdown. Total: ${fmtGBP(displayTotal)}`}
      role="img"
    >
      {/* Track ring when no data */}
      {!hasData && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={strokeW}
        />
      )}

      {/* Segments */}
      {arcs.map(({ cat, start, span }) => (
        <path
          key={cat.id}
          d={arcPath(cx, cy, r, start, start + span)}
          fill="none"
          stroke={cat.color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dasharray 0.6s ease, opacity 0.4s ease',
          }}
        />
      ))}

      {/* Centre label */}
      <text
        x={cx}
        y={cy - 7}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize="14"
        fontWeight="300"
        fill="#0d1628"
      >
        {hasData ? fmtGBP(displayTotal) : '£0'}
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'DM Sans', system-ui, sans-serif"
        fontSize="7"
        fill="#78716c"
      >
        estimated estate
      </text>
    </svg>
  )
}

// ─── Currency input ───────────────────────────────────────────────────────────

function CurrencyInput({ id, label, placeholder, note, value, onChange }) {
  // Format display value with commas; store raw digits
  const handleChange = (e) => {
    const raw     = e.target.value.replace(/[^0-9]/g, '')
    const display = raw ? parseInt(raw, 10).toLocaleString('en-GB') : ''
    onChange(display)
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-navy-900 leading-snug">
        {label}
        {note && (
          <span className="block text-xs font-normal text-stone-400 mt-0.5">{note}</span>
        )}
      </label>
      <div className="relative flex items-center">
        <span
          aria-hidden="true"
          className="absolute left-3.5 text-sm font-medium text-stone-400 pointer-events-none select-none"
        >
          £
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-navy-950 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent transition"
          aria-label={`${label} — enter value in pounds`}
        />
      </div>
    </div>
  )
}

// ─── Category legend item ─────────────────────────────────────────────────────

function LegendItem({ color, label, value, pct }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className="text-xs text-stone-500 truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <span className="text-xs font-medium text-navy-950">{fmtGBP(value)}</span>
        {pct > 0 && (
          <span className="text-[10px] text-stone-400 ml-1.5">({pct}%)</span>
        )}
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

const EMPTY_VALUES = Object.fromEntries(ALL_FIELDS.map(f => [f.id, '']))

export default function DigitalEstateCalculator() {
  const [values, setValues]       = useState(EMPTY_VALUES)
  const [toastVisible, setToast]  = useState(false)
  const toastTimer                = useRef(null)

  // Per-category and grand totals
  const categoryTotals = Object.fromEntries(
    CATEGORIES.map(cat => [
      cat.id,
      cat.fields.reduce((sum, f) => sum + parseValue(values[f.id] || ''), 0),
    ])
  )
  const grandTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0)

  const hasAnyValue   = grandTotal > 0
  const displayTotal  = useCountUp(grandTotal)
  const exceedsNRB    = grandTotal > 325_000
  const exceedsHalfM  = grandTotal >= 500_000

  const handleChange = useCallback((fieldId, display) => {
    setValues(prev => ({ ...prev, [fieldId]: display }))
  }, [])

  function handleReset() {
    setValues(EMPTY_VALUES)
  }

  async function handleShare() {
    const url = buildShareUrl(grandTotal)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback: create a temporary input
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

  // Read shared result from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/est=([0-9]+)/)
    if (match) {
      // Pre-fill "pensions" with the shared total as a single line item (best-effort)
      // so the total renders correctly on share
      const shared = parseInt(match[1], 10)
      if (!isNaN(shared) && shared > 0) {
        setValues(prev => ({
          ...prev,
          pensions: fmt(shared),
        }))
      }
    }
  }, [])

  return (
    <>
      <Helmet>
        <title>What's Your Digital Estate Worth? Free Calculator | Everstead</title>
        <meta
          name="description"
          content="Calculate the estimated value of your estate in under 2 minutes. Free tool for UK families — includes financial accounts, property, pensions, and digital assets."
        />
        <link rel="canonical" href="https://www.everstead.care/digital-estate-worth" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="What's Your Digital Estate Worth? Free Calculator | Everstead" />
        <meta property="og:description" content="Calculate the estimated value of your estate in under 2 minutes. Free tool for UK families — includes financial accounts, property, pensions, and digital assets." />
        <meta property="og:url" content="https://www.everstead.care/digital-estate-worth" />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        <div className="relative max-w-3xl mx-auto px-6 pt-28 pb-16 lg:pt-32 lg:pb-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-4">
            Free tool — no sign-up needed
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            What's your digital estate worth?
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-stone-300 max-w-xl mx-auto">
            Enter estimated values below for an instant breakdown of your estate.
            Takes under 2 minutes — and could matter more than you think.
          </p>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 -mt-6">

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">

          {/* ── LEFT: input card ── */}
          <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden">
            <div className="px-6 sm:px-8 pt-8 pb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Enter your estimated values
              </p>
            </div>

            <div className="px-6 sm:px-8 pb-8 pt-4 space-y-8">
              {CATEGORIES.map(cat => (
                <fieldset key={cat.id}>
                  <legend className="flex items-center gap-2 mb-4">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-navy-950 uppercase tracking-wider">
                      {cat.label}
                    </span>
                  </legend>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {cat.fields.map(field => (
                      <CurrencyInput
                        key={field.id}
                        id={field.id}
                        label={field.label}
                        placeholder={field.placeholder}
                        note={field.note}
                        value={values[field.id]}
                        onChange={(val) => handleChange(field.id, val)}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            {/* Reset */}
            <div className="px-6 sm:px-8 pb-7 border-t border-stone-100 pt-5 flex items-center justify-end">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-navy-700 transition-colors duration-150 focus:outline-none focus-visible:underline"
                aria-label="Clear all values and start over"
              >
                <RotateCcw size={13} />
                Start over
              </button>
            </div>
          </div>

          {/* ── RIGHT: results panel ── */}
          <div className="space-y-4 lg:sticky lg:top-6">

            {/* Results card */}
            <div
              className={[
                'bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden transition-all duration-500',
                hasAnyValue ? 'opacity-100 translate-y-0' : 'opacity-40',
              ].join(' ')}
              aria-live="polite"
              aria-atomic="true"
            >
              {/* Total header */}
              <div className="px-6 pt-7 pb-5 text-center border-b border-stone-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
                  Your estimated estate
                </p>
                <p
                  className="font-display text-4xl sm:text-5xl font-light text-navy-950 leading-none tabular-nums"
                  aria-label={`Total estimated estate: ${fmtGBP(displayTotal)}`}
                >
                  {fmtGBP(displayTotal)}
                </p>
              </div>

              {/* Donut + legend */}
              <div className="px-6 py-6 flex flex-col items-center gap-5">
                <DonutChart
                  categoryTotals={categoryTotals}
                  grandTotal={grandTotal}
                  displayTotal={displayTotal}
                />

                {/* Legend */}
                <div className="w-full space-y-2">
                  {CATEGORIES.map(cat => {
                    const val = categoryTotals[cat.id]
                    const pct = grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0
                    return (
                      <LegendItem
                        key={cat.id}
                        color={cat.color}
                        label={cat.label}
                        value={val}
                        pct={pct}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Contextual message */}
              {hasAnyValue && (
                <div className="mx-5 mb-5 rounded-xl bg-stone-50 border border-stone-200 px-4 py-3.5">
                  <p className="text-sm leading-relaxed text-stone-700">
                    {contextMessage(grandTotal)}
                  </p>
                </div>
              )}

              {/* IHT callout */}
              {exceedsNRB && (
                <div className="mx-5 mb-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
                    Inheritance Tax threshold
                  </p>
                  <p className="text-sm leading-relaxed text-amber-800">
                    Your estate exceeds the UK nil-rate band of £325,000.
                    {exceedsHalfM
                      ? ' At this level, thorough IHT planning is strongly recommended.'
                      : ' Professional advice could help reduce your family\'s tax exposure.'}
                  </p>
                </div>
              )}

              {/* Share button */}
              <div className="px-5 pb-6 space-y-3">
                <button
                  onClick={handleShare}
                  disabled={!hasAnyValue}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-navy-200 bg-navy-50 hover:bg-navy-100 hover:border-navy-300 text-navy-800 text-sm font-medium px-4 py-3 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
                  aria-label="Copy a shareable link with your result total to the clipboard"
                >
                  <Copy size={15} />
                  Share your result
                </button>
              </div>
            </div>

            {/* Email capture — only show once they have a result */}
            {grandTotal > 0 && (
              <EmailCaptureCard
                source="digital-estate-calculator"
                title="Email me my estimate"
                subtitle="We'll send a clean summary of your digital estate value and where it sits — useful to share with a spouse, executor, or financial adviser."
                buttonLabel="Send my estimate"
                metadata={{
                  total: grandTotal,
                  breakdown: CATEGORIES
                    .map(cat => ({ label: cat.label || cat.id, value: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(categoryTotals[cat.id] || 0) }))
                    .filter((row, i) => (categoryTotals[CATEGORIES[i].id] || 0) > 0),
                }}
              />
            )}

            {/* CTA card */}
            <div className="rounded-2xl bg-navy-950 border border-navy-800 px-6 py-7 text-center">
              <p className="font-display text-xl font-light text-white leading-snug mb-2">
                Now make it official
              </p>
              <p className="text-sm text-stone-400 leading-relaxed mb-5">
                Everstead helps you document every account, nominate trusted people, and leave your family with complete clarity — all in one secure place.
              </p>
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-white hover:bg-stone-100 text-navy-950 rounded-xl px-5 py-3 text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
              >
                Start your estate plan — free
                <ArrowRight size={15} />
              </Link>
              <p className="mt-3 text-[11px] text-stone-600">
                Free 14-day trial · Card required · No charge until trial ends
              </p>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <p className="text-center text-xs text-stone-400 leading-relaxed mt-8 max-w-2xl mx-auto">
          This calculator is for estimation purposes only. Figures are approximate and should not be relied upon for legal or financial planning without professional advice. Everstead is a UK digital estate planning service, not a financial adviser.
        </p>
      </section>

      {/* ── Toast ── */}
      <Toast visible={toastVisible} message="Link copied!" />
    </>
  )
}
