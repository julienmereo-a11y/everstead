import React, { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, ArrowRight, ChevronLeft, Loader2, Mail } from 'lucide-react'

// ─── Quiz data ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: 'will',
    text: 'Do you have an up-to-date will?',
    hint: 'A will ensures your wishes are legally recognised and reduces burden on those left behind.',
    options: [
      { label: 'Yes, it\'s up to date',          points: 20 },
      { label: 'I have one but it\'s out of date', points: 8  },
      { label: 'No, I don\'t have one',            points: 0  },
    ],
  },
  {
    id: 'accounts',
    text: 'Have you documented your financial accounts and assets?',
    hint: 'Without a clear record, families can spend months locating accounts — or miss them entirely.',
    options: [
      { label: 'Yes, fully documented',   points: 20 },
      { label: 'Partially — some listed', points: 10 },
      { label: 'Not yet',                 points: 0  },
    ],
  },
  {
    id: 'lpa',
    text: 'Do you have a Lasting Power of Attorney in place?',
    hint: 'An LPA lets trusted people manage your affairs if you lose capacity — without one, families face court applications.',
    options: [
      { label: 'Yes, both types (property & health)', points: 20 },
      { label: 'One of them',                         points: 10 },
      { label: 'No',                                  points: 0  },
    ],
  },
  {
    id: 'people',
    text: 'Have you designated trusted people with access to your plan?',
    hint: 'Knowing who to contact — and what they\'re allowed to see — removes confusion in a crisis.',
    options: [
      { label: 'Yes, they know and have access', points: 20 },
      { label: 'I\'ve thought about it',          points: 5  },
      { label: 'No',                              points: 0  },
    ],
  },
  {
    id: 'wishes',
    text: 'Have you recorded your funeral wishes or final instructions?',
    hint: 'Leaving clear wishes is one of the most meaningful gifts you can give your family.',
    options: [
      { label: 'Yes, written down and shared', points: 20 },
      { label: 'In my head but not written',   points: 5  },
      { label: 'No',                           points: 0  },
    ],
  },
]

// ─── Score band config ────────────────────────────────────────────────────────

const BAND = (score) => {
  if (score <= 30) return {
    label:   'Your estate needs urgent attention',
    color:   '#dc2626',
    ringCls: 'text-red-600',
    bgCls:   'bg-red-50 border-red-200',
    textCls: 'text-red-700',
  }
  if (score <= 60) return {
    label:   'A good start — but critical gaps remain',
    color:   '#d97706',
    ringCls: 'text-amber-600',
    bgCls:   'bg-amber-50 border-amber-200',
    textCls: 'text-amber-700',
  }
  if (score <= 85) return {
    label:   'You\'re ahead of most — a few things to complete',
    color:   '#4c7d47',
    ringCls: 'text-sage-500',
    bgCls:   'bg-sage-50 border-sage-200',
    textCls: 'text-sage-600',
  }
  return {
    label:   'Excellent — your family will thank you',
    color:   '#0d1628',
    ringCls: 'text-navy-950',
    bgCls:   'bg-navy-50 border-navy-200',
    textCls: 'text-navy-900',
  }
}

// ─── Missing item explanations ────────────────────────────────────────────────

const MISSING_COPY = {
  will: {
    title:   'No up-to-date will',
    message: 'Without a valid will, the law decides how your estate is distributed — not you. Updating a will after major life events (marriage, children, new property) is essential to ensure it reflects your actual wishes.',
  },
  accounts: {
    title:   'Undocumented accounts and assets',
    message: 'Billions of pounds sit in dormant accounts every year because families don\'t know they exist. A clear inventory means nothing is overlooked and executors can act quickly.',
  },
  lpa: {
    title:   'No Lasting Power of Attorney',
    message: 'If you lost capacity tomorrow, your family could face lengthy and expensive Court of Protection proceedings to manage your affairs. An LPA avoids this entirely — and can only be set up while you still have capacity.',
  },
  people: {
    title:   'No designated trusted contacts',
    message: 'Even with perfect documents, if nobody knows where they are or who to call, the information is inaccessible when it matters most. Identifying and briefing trusted people is a critical step.',
  },
  wishes: {
    title:   'Funeral and final wishes not recorded',
    message: 'Families often disagree about arrangements because wishes weren\'t written down. Even a simple note removes the guesswork and reduces stress at an already difficult time.',
  },
}

// ─── SVG Score Ring ───────────────────────────────────────────────────────────

function ScoreRing({ score, color, animated }) {
  const radius    = 72
  const stroke    = 10
  const normalise = radius - stroke / 2
  const circumference = 2 * Math.PI * normalise
  const offset = circumference - (score / 100) * circumference

  return (
    <svg
      viewBox="0 0 160 160"
      className="w-44 h-44 sm:w-52 sm:h-52 -rotate-90"
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx="80" cy="80" r={normalise}
        fill="none"
        stroke="#e7e5e4"
        strokeWidth={stroke}
      />
      {/* Progress */}
      <circle
        cx="80" cy="80" r={normalise}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animated ? offset : circumference}
        style={{
          transition: animated ? 'stroke-dashoffset 1.4s cubic-bezier(0.34,1.2,0.64,1)' : 'none',
        }}
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
      // ease-out-expo
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
  const [step, setStep]       = useState(0)           // 0–4 = questions, 5 = results
  const [answers, setAnswers] = useState({})           // { [questionId]: points }
  const [animate, setAnimate] = useState(false)

  // Email capture
  const [form, setForm]           = useState({ name: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError]  = useState(null)

  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0)
  const band       = BAND(totalScore)
  const displayScore = useCountUp(totalScore, 1400, animate)

  // Kick off ring + count-up animation when we reach results
  useEffect(() => {
    if (step === QUESTIONS.length) {
      const t = setTimeout(() => setAnimate(true), 120)
      return () => clearTimeout(t)
    }
  }, [step])

  const currentQuestion = QUESTIONS[step]

  function handleAnswer(questionId, points) {
    setAnswers(prev => ({ ...prev, [questionId]: points }))
    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1)
    } else {
      setStep(QUESTIONS.length)
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email) { setFormError('Please enter your email address.'); return }
    setFormError(null)
    setSubmitting(true)

    try {
      const answersForPayload = QUESTIONS.map(q => ({
        question: q.text,
        answer:   q.options.find(o => o.points === answers[q.id])?.label ?? 'Not answered',
        points:   answers[q.id] ?? 0,
      }))

      const res = await fetch('/api/emails/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:    'tool-report',
          name:    form.name,
          email:   form.email,
          score:   totalScore,
          answers: answersForPayload,
        }),
      })

      if (!res.ok) throw new Error('Send failed')
      setSubmitted(true)
    } catch {
      setFormError('Something went wrong. Please try again or email hello@everstead.care.')
    } finally {
      setSubmitting(false)
    }
  }

  // Missing-item list: questions answered with less than full score
  const missingItems = QUESTIONS.filter(q => (answers[q.id] ?? 0) < 20)

  return (
    <>
      <Helmet>
        <title>Estate Readiness Score — Free Tool | Everstead</title>
        <meta
          name="description"
          content="Take our free 5-question quiz and instantly see how ready your estate really is. No sign-up required. Get your personalised score out of 100."
        />
        <link rel="canonical" href="https://www.everstead.care/estate-readiness-score" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Estate Readiness Score — Free Tool | Everstead" />
        <meta property="og:description" content="Take our free 5-question quiz and instantly see how ready your estate really is. No sign-up required. Get your personalised score out of 100." />
        <meta property="og:url" content="https://www.everstead.care/estate-readiness-score" />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>

      <div className="bg-stone-50 min-h-screen">

        {/* ── Hero header ── */}
        <section className="relative overflow-hidden grain">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
          <div className="relative max-w-3xl mx-auto px-6 pt-28 pb-16 lg:pt-32 lg:pb-20 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-4">
              Free tool — no sign-up needed
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
              Estate Readiness Score
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-stone-300 max-w-xl mx-auto">
              Five questions. Instant results. Find out exactly where you stand — and what your family actually needs from you.
            </p>
          </div>
        </section>

        {/* ── Quiz / Results panel ── */}
        <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 -mt-6">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden">

            {/* ── Question steps ── */}
            {step < QUESTIONS.length && (
              <div>
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2 pt-7 pb-1 px-6">
                  {QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={[
                        'rounded-full transition-all duration-300',
                        i < step
                          ? 'w-2.5 h-2.5 bg-sage-500'
                          : i === step
                            ? 'w-3.5 h-3.5 bg-navy-800'
                            : 'w-2.5 h-2.5 bg-stone-200',
                      ].join(' ')}
                      aria-label={`Question ${i + 1}${i < step ? ' (answered)' : i === step ? ' (current)' : ''}`}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-stone-400 mt-1 mb-0 pb-0">
                  Question {step + 1} of {QUESTIONS.length}
                </p>

                {/* Question body */}
                <div className="px-6 sm:px-10 pt-8 pb-2">
                  <h2 className="font-display text-2xl sm:text-3xl font-light text-navy-950 leading-snug text-balance">
                    {currentQuestion.text}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-stone-500">
                    {currentQuestion.hint}
                  </p>
                </div>

                {/* Answer options */}
                <div className="px-6 sm:px-10 pt-6 pb-8 space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handleAnswer(currentQuestion.id, option.points)}
                      className="w-full text-left px-5 py-4 rounded-xl border-2 border-stone-200 bg-stone-50 hover:border-navy-700 hover:bg-navy-50 active:bg-navy-100 transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
                    >
                      <span className="text-sm sm:text-base font-medium text-navy-950 group-hover:text-navy-900 leading-snug">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Back button */}
                {step > 0 && (
                  <div className="px-6 sm:px-10 pb-7 pt-0">
                    <button
                      onClick={handleBack}
                      className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-navy-700 transition-colors duration-150 focus:outline-none focus-visible:underline"
                    >
                      <ChevronLeft size={14} />
                      Back
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Results ── */}
            {step === QUESTIONS.length && (
              <div>

                {/* Score ring + band label */}
                <div className="flex flex-col items-center px-6 pt-10 pb-8 text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <ScoreRing score={totalScore} color={band.color} animated={animate} />
                    {/* Text sits on top of the SVG; SVG is rotated but this overlay is not */}
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span
                        className="font-display text-4xl sm:text-5xl font-light leading-none tabular-nums"
                        style={{ color: band.color }}
                      >
                        {displayScore}
                      </span>
                      <span className="text-xs text-stone-400 mt-1 font-sans">out of 100</span>
                    </div>
                  </div>

                  <div className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 border text-sm font-medium ${band.bgCls} ${band.textCls}`}>
                    {totalScore <= 60
                      ? <AlertCircle size={15} />
                      : <CheckCircle2 size={15} />
                    }
                    {band.label}
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-stone-500 max-w-md">
                    {totalScore <= 30 &&
                      'Right now, your family would face real difficulty if something happened to you. The good news: this is entirely fixable, and Everstead is built to help you work through it step by step.'
                    }
                    {totalScore > 30 && totalScore <= 60 &&
                      'You\'ve made a start, but there are still gaps that could cause real stress for those you leave behind. A little more preparation goes a long way.'
                    }
                    {totalScore > 60 && totalScore <= 85 &&
                      'You\'re more prepared than most people. A few final steps would give your family complete clarity — and you complete peace of mind.'
                    }
                    {totalScore > 85 &&
                      'You\'ve done the hard work. Your family will be well-supported. Consider keeping your plan updated annually as life changes.'
                    }
                  </p>
                </div>

                {/* Missing items breakdown */}
                {missingItems.length > 0 && (
                  <div className="mx-6 sm:mx-10 mb-8 rounded-xl border border-stone-200 overflow-hidden">
                    <div className="bg-stone-50 px-5 py-3.5 border-b border-stone-200">
                      <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                        What to address
                      </p>
                    </div>
                    <ul className="divide-y divide-stone-100">
                      {missingItems.map(q => {
                        const copy      = MISSING_COPY[q.id]
                        const pts       = answers[q.id] ?? 0
                        const isPartial = pts > 0 && pts < 20
                        return (
                          <li key={q.id} className="px-5 py-4 flex gap-4">
                            <div className="mt-0.5 shrink-0">
                              {isPartial
                                ? <div className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                                  </div>
                                : <div className="w-5 h-5 rounded-full border-2 border-red-400 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                  </div>
                              }
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-navy-950 leading-snug">
                                {copy.title}
                                {isPartial && (
                                  <span className="ml-2 text-xs font-normal text-amber-600">(partial)</span>
                                )}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                                {copy.message}
                              </p>
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
                          <p className="text-sm font-semibold text-navy-950 leading-snug">
                            Get your full personalised report
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-stone-500">
                            We'll send a detailed breakdown of your score, what it means, and the exact steps to improve it — at your own pace.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} noValidate className="space-y-3">
                        <div>
                          <label htmlFor="rs-name" className="block text-xs font-medium text-navy-900 mb-1">
                            Your first name <span className="text-stone-400 font-normal">(optional)</span>
                          </label>
                          <input
                            id="rs-name"
                            type="text"
                            name="name"
                            autoComplete="given-name"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Sarah"
                            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-navy-950 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-navy-700 focus:border-transparent transition"
                          />
                        </div>
                        <div>
                          <label htmlFor="rs-email" className="block text-xs font-medium text-navy-900 mb-1">
                            Email address <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="rs-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            required
                            value={form.email}
                            onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormError(null) }}
                            placeholder="you@example.com"
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
                          className="w-full flex items-center justify-center gap-2 bg-navy-950 hover:bg-navy-800 text-white rounded-lg px-5 py-3 text-sm font-medium transition-colors duration-150 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
                        >
                          {submitting
                            ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
                            : <>Send my report <ArrowRight size={15} /></>
                          }
                        </button>

                        <p className="text-center text-[11px] text-stone-400 leading-relaxed">
                          No spam. One email. You can unsubscribe at any time.
                        </p>
                      </form>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sage-100 mb-4">
                        <CheckCircle2 size={24} className="text-sage-600" />
                      </div>
                      <p className="font-display text-xl font-light text-navy-950 mb-2">
                        Report on its way
                      </p>
                      <p className="text-sm leading-relaxed text-stone-500 mb-6 max-w-xs mx-auto">
                        Check your inbox{form.name ? `, ${form.name}` : ''} — your personalised estate readiness report will arrive shortly.
                      </p>
                      <Link
                        to="/get-started"
                        className="inline-flex items-center gap-2 bg-navy-950 hover:bg-navy-800 text-white rounded-lg px-5 py-3 text-sm font-medium transition-colors duration-150"
                      >
                        Start your estate plan with Everstead
                        <ArrowRight size={15} />
                      </Link>
                      <p className="mt-3 text-xs text-stone-400">
                        Free 14-day trial · Card required · No charge until trial ends
                      </p>
                    </div>
                  )}
                </div>

                {/* Soft CTA (always visible) */}
                {!submitted && (
                  <div className="text-center pb-10 px-6">
                    <p className="text-sm text-stone-500 mb-3">
                      Ready to act on your score?
                    </p>
                    <Link
                      to="/get-started"
                      className="inline-flex items-center gap-2 text-sm font-medium text-navy-800 hover:text-navy-600 underline underline-offset-2 transition-colors"
                    >
                      Start building your estate plan — free for 14 days
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )}

                {/* Retake */}
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
                    Retake the quiz
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Trust footnote */}
          <p className="text-center text-xs text-stone-400 mt-6 leading-relaxed">
            Your answers are never stored without your consent.
            Everstead is a UK digital estate planning service — not legal or financial advice.
          </p>
        </section>

      </div>
    </>
  )
}
