import React, { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, AlertCircle, ArrowRight, ChevronLeft, Loader2, Mail } from 'lucide-react'
import HreflangLinks from '../components/HreflangLinks'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/readinessScore.json'
import frCopy from '../i18n/locales/fr/readinessScore.json'

// Self-registered namespace, like the other translated tools. The French quiz
// is not a translation of the English one: the third question asks about the
// mandat de protection future, the French counterpart of the LPA, and the
// explanations point to the notaire, the Caisse des Dépôts and the réserve
// héréditaire. Question ids and points are shared so the report email works
// for both.
i18n.addResourceBundle('en', 'readinessScore', enCopy)
i18n.addResourceBundle('fr', 'readinessScore', frCopy)

// ─── Quiz logic (text lives in the locale files) ──────────────────────────────

const QUESTIONS = [
  { id: 'will',     points: [20, 8, 0] },
  { id: 'accounts', points: [20, 10, 0] },
  { id: 'lpa',      points: [20, 10, 0] },
  { id: 'people',   points: [20, 5, 0] },
  { id: 'wishes',   points: [20, 5, 0] },
]

const BAND = (score) => {
  if (score <= 30) return { key: 'urgent',    color: '#dc2626', bgCls: 'bg-red-50 border-red-200',     textCls: 'text-red-700' }
  if (score <= 60) return { key: 'gaps',      color: '#d97706', bgCls: 'bg-amber-50 border-amber-200', textCls: 'text-amber-700' }
  if (score <= 85) return { key: 'ahead',     color: '#4c7d47', bgCls: 'bg-sage-50 border-sage-200',   textCls: 'text-sage-600' }
  return                  { key: 'excellent', color: '#0d1628', bgCls: 'bg-navy-50 border-navy-200',   textCls: 'text-navy-900' }
}

// ─── SVG Score Ring ───────────────────────────────────────────────────────────

function ScoreRing({ score, color, animated }) {
  const radius    = 72
  const stroke    = 10
  const normalise = radius - stroke / 2
  const circumference = 2 * Math.PI * normalise
  const offset = circumference - (score / 100) * circumference

  return (
    <svg viewBox="0 0 160 160" className="w-44 h-44 sm:w-52 sm:h-52 -rotate-90" aria-hidden="true">
      <circle cx="80" cy="80" r={normalise} fill="none" stroke="#e7e5e4" strokeWidth={stroke} />
      <circle
        cx="80" cy="80" r={normalise}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animated ? offset : circumference}
        style={{ transition: animated ? 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.2,0.64,1)' : 'none' }}
      />
    </svg>
  )
}

// ─── Animated count-up hook ───────────────────────────────────────────────────

function useCountUp(target, duration = 1400, start = false) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)

  useEffect(() => {
    if (!start) return
    const startTime = performance.now()
    const tick = (now) => {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setValue(Math.round(eased * target))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration, start])

  return value
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EstateReadinessScore() {
  const { t, i18n: i18nInstance } = useTranslation('readinessScore')
  const lang    = i18nInstance.language === 'fr' ? 'fr' : 'en'
  const pageUrl = `https://www.everstead.care${lang === 'fr' ? '/fr' : ''}/estate-readiness-score`

  const [step, setStep]       = useState(0)           // 0-4 = questions, 5 = results
  const [answers, setAnswers] = useState({})           // { [questionId]: points }
  const [animate, setAnimate] = useState(false)

  const [form, setForm]             = useState({ name: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [formError, setFormError]   = useState(null)

  const totalScore   = Object.values(answers).reduce((a, b) => a + b, 0)
  const band         = BAND(totalScore)
  const displayScore = useCountUp(totalScore, 1400, animate)

  useEffect(() => {
    if (step === QUESTIONS.length) {
      const timer = setTimeout(() => setAnimate(true), 120)
      return () => clearTimeout(timer)
    }
  }, [step])

  const currentQuestion = QUESTIONS[step]
  const optionLabels = (id) => t(`questions.${id}.options`, { returnObjects: true })

  function handleAnswer(questionId, points) {
    setAnswers(prev => ({ ...prev, [questionId]: points }))
    setStep(step < QUESTIONS.length - 1 ? step + 1 : QUESTIONS.length)
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email) { setFormError(t('email.errorEmail')); return }
    setFormError(null)
    setSubmitting(true)

    try {
      const answersForPayload = QUESTIONS.map(q => {
        const labels = optionLabels(q.id)
        const idx    = q.points.indexOf(answers[q.id])
        return {
          question: t(`questions.${q.id}.text`),
          answer:   idx >= 0 ? labels[idx] : '',
          points:   answers[q.id] ?? 0,
        }
      })

      const res = await fetch('/api/emails/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:    'tool-report',
          lang,
          name:    form.name,
          email:   form.email,
          score:   totalScore,
          answers: answersForPayload,
        }),
      })

      if (!res.ok) throw new Error('Send failed')
      setSubmitted(true)
    } catch {
      setFormError(t('email.errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  const missingItems = QUESTIONS.filter(q => (answers[q.id] ?? 0) < 20)

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
      <HreflangLinks path="/estate-readiness-score" />

      <div className="bg-stone-50 min-h-screen">

        {/* ── Hero header ── */}
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

        {/* ── Quiz / Results panel ── */}
        <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 -mt-6">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden">

            {step < QUESTIONS.length && (
              <div>
                <div className="flex items-center justify-center gap-2 pt-7 pb-1 px-6">
                  {QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={[
                        'rounded-full transition-all duration-300',
                        i < step ? 'w-2.5 h-2.5 bg-sage-500' : i === step ? 'w-3.5 h-3.5 bg-navy-800' : 'w-2.5 h-2.5 bg-stone-200',
                      ].join(' ')}
                      aria-label={`Question ${i + 1}${i < step ? ` (${t('progress.answered')})` : i === step ? ` (${t('progress.current')})` : ''}`}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-stone-400 mt-1 mb-0 pb-0">
                  {t('progress.label', { n: step + 1, total: QUESTIONS.length })}
                </p>

                <div className="px-6 sm:px-10 pt-8 pb-2">
                  <h2 className="font-display text-2xl sm:text-3xl font-light text-navy-950 leading-snug text-balance">
                    {t(`questions.${currentQuestion.id}.text`)}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-stone-500">{t(`questions.${currentQuestion.id}.hint`)}</p>
                </div>

                <div className="px-6 sm:px-10 pt-6 pb-8 space-y-3">
                  {optionLabels(currentQuestion.id).map((label, i) => (
                    <button
                      key={label}
                      onClick={() => handleAnswer(currentQuestion.id, currentQuestion.points[i])}
                      className="w-full text-left px-5 py-4 rounded-xl border-2 border-stone-200 bg-stone-50 hover:border-navy-700 hover:bg-navy-50 active:bg-navy-100 transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
                    >
                      <span className="text-sm sm:text-base font-medium text-navy-950 group-hover:text-navy-900 leading-snug">{label}</span>
                    </button>
                  ))}
                </div>

                {step > 0 && (
                  <div className="px-6 sm:px-10 pb-7 pt-0">
                    <button
                      onClick={handleBack}
                      className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-navy-700 transition-colors duration-150 focus:outline-none focus-visible:underline"
                    >
                      <ChevronLeft size={14} />
                      {t('progress.back')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === QUESTIONS.length && (
              <div>
                <div className="flex flex-col items-center px-6 pt-10 pb-8 text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <ScoreRing score={totalScore} color={band.color} animated={animate} />
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="font-display text-4xl sm:text-5xl font-light leading-none tabular-nums" style={{ color: band.color }}>
                        {displayScore}
                      </span>
                      <span className="text-xs text-stone-400 mt-1 font-sans">{t('results.outOf')}</span>
                    </div>
                  </div>

                  <div className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 border text-sm font-medium ${band.bgCls} ${band.textCls}`}>
                    {totalScore <= 60 ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                    {t(`bands.${band.key}`)}
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-stone-500 max-w-md">{t(`summary.${band.key}`)}</p>
                </div>

                {missingItems.length > 0 && (
                  <div className="mx-6 sm:mx-10 mb-8 rounded-xl border border-stone-200 overflow-hidden">
                    <div className="bg-stone-50 px-5 py-3.5 border-b border-stone-200">
                      <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">{t('results.toAddress')}</p>
                    </div>
                    <ul className="divide-y divide-stone-100">
                      {missingItems.map(q => {
                        const pts       = answers[q.id] ?? 0
                        const isPartial = pts > 0 && pts < 20
                        return (
                          <li key={q.id} className="px-5 py-4 flex gap-4">
                            <div className="mt-0.5 shrink-0">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isPartial ? 'border-amber-400' : 'border-red-400'}`}>
                                <div className={`w-2 h-2 rounded-full ${isPartial ? 'bg-amber-400' : 'bg-red-400'}`} />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-navy-950 leading-snug">
                                {t(`missing.${q.id}.title`)}
                                {isPartial && <span className="ml-2 text-xs font-normal text-amber-600">{t('results.partial')}</span>}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-stone-500">{t(`missing.${q.id}.message`)}</p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* Email capture */}
                <div className="mx-6 sm:mx-10 mb-10 rounded-xl bg-navy-50 border border-navy-100 px-6 py-7">
                  {!submitted ? (
                    <>
                      <div className="flex items-start gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-navy-800 flex items-center justify-center shrink-0">
                          <Mail size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-navy-950 leading-snug">{t('email.title')}</p>
                          <p className="mt-1 text-xs leading-relaxed text-stone-500">{t('email.sub')}</p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} noValidate className="space-y-3">
                        <div>
                          <label htmlFor="rs-name" className="block text-xs font-medium text-navy-900 mb-1">
                            {t('email.nameLabel')} <span className="text-stone-400 font-normal">{t('email.optional')}</span>
                          </label>
                          <input
                            id="rs-name" type="text" name="name" autoComplete="given-name"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder={t('email.namePlaceholder')}
                            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-navy-950 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent transition"
                          />
                        </div>
                        <div>
                          <label htmlFor="rs-email" className="block text-xs font-medium text-navy-900 mb-1">
                            {t('email.emailLabel')} <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="rs-email" type="email" name="email" autoComplete="email" required
                            value={form.email}
                            onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormError(null) }}
                            placeholder={t('email.emailPlaceholder')}
                            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-navy-950 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent transition"
                          />
                        </div>

                        {formError && (
                          <p className="text-xs text-red-600 flex items-center gap-1.5">
                            <AlertCircle size={13} className="shrink-0" />
                            {formError}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 bg-navy-950 hover:bg-navy-800 text-white rounded-full px-5 py-3 text-sm font-medium transition-colors duration-150 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
                        >
                          {submitting
                            ? <><Loader2 size={15} className="animate-spin" /> {t('email.sending')}</>
                            : <>{t('email.send')} <ArrowRight size={15} /></>}
                        </button>

                        <p className="text-center text-[11px] text-stone-400 leading-relaxed">{t('email.noSpam')}</p>
                      </form>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sage-100 mb-4">
                        <CheckCircle2 size={24} className="text-sage-600" />
                      </div>
                      <p className="font-display text-xl font-light text-navy-950 mb-2">{t('email.sentTitle')}</p>
                      <p className="text-sm leading-relaxed text-stone-500 mb-6 max-w-xs mx-auto">
                        {t('email.sentBody', { name: form.name ? `, ${form.name}` : '' })}
                      </p>
                      <Link to="/get-started" className="btn-aurora inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors duration-150">
                        {t('email.cta')}
                        <ArrowRight size={15} />
                      </Link>
                      <p className="mt-3 text-xs text-stone-400">{t('email.ctaNote')}</p>
                    </div>
                  )}
                </div>

                {!submitted && (
                  <div className="text-center pb-10 px-6">
                    <p className="text-sm text-stone-500 mb-3">{t('soft.ready')}</p>
                    <Link to="/get-started" className="inline-flex items-center gap-2 text-sm font-medium text-navy-800 hover:text-navy-600 underline underline-offset-2 transition-colors">
                      {t('soft.cta')}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )}

                <div className="text-center pb-8">
                  <button
                    onClick={() => {
                      setStep(0)
                      setAnswers({})
                      setAnimate(false)
                      setSubmitted(false)
                      setForm({ name: '', email: '' })
                      setFormError(null)
                    }}
                    className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 rounded"
                  >
                    {t('results.retake')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-stone-400 mt-6 leading-relaxed">{t('footnote')}</p>
        </section>
      </div>
    </>
  )
}
