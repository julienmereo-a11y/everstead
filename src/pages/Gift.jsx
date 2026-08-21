import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import {
  ArrowRight, CheckCheck, Lock, AlertCircle, Loader2, CreditCard, Gift as GiftIcon,
} from 'lucide-react'
import { PRICING } from '../config/pricing'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripe } from '../lib/stripe'
import i18n from '../i18n'
import enGift from '../i18n/locales/en/gift.json'
import frGift from '../i18n/locales/fr/gift.json'

// The `gift` namespace is registered here rather than in src/i18n/index.js so
// the page (lazy-loaded in App.jsx) stays self-contained. Module-level, so it
// runs once, before the component ever renders.
if (!i18n.hasResourceBundle('en', 'gift')) i18n.addResourceBundle('en', 'gift', enGift)
if (!i18n.hasResourceBundle('fr', 'gift')) i18n.addResourceBundle('fr', 'gift', frGift)

// ─────────────────────────────────────────────────────────────
// CONSTANTS (non-text meta — all visible copy lives in the "gift" namespace)
// ─────────────────────────────────────────────────────────────

// A gift is a new paid subscription for the recipient. Essential is retired, so the
// only giftable plan is Everstead+ (Everstead Pro is sold to professionals via demo,
// and the Free tier needs no gifting). Copy for the plan card: `plan.*` keys.
const GIFT_PLANS = [
  {
    id: 'family',
    yearlyPrice: PRICING.family.annual.perYear,
  },
]

// `highlight: true` renders the "Most thoughtful" badge (step1.mostThoughtful).
const YEAR_OPTIONS = [
  { years: 1 },
  { years: 2 },
  { years: 3, highlight: true },
]

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition-colors'

// ─────────────────────────────────────────────────────────────
// STRIPE PAYMENT FORM (step 3 inner component)
// ─────────────────────────────────────────────────────────────

function GiftPaymentForm({ plan, years, gifterName, gifterEmail, recipientName, recipientEmail, personalMessage, scheduledSendAt, sendNow, amountPence, onSuccess }) {
  const stripe   = useStripe()
  const elements = useElements()
  const { t } = useTranslation('gift')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const totalGBP   = (amountPence / 100).toFixed(2)
  const yearsLabel = t('years', { count: years })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { paymentIntent, error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/gift`,
      },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message)
      setLoading(false)
      return
    }

    // Payment confirmed — call confirm endpoint
    try {
      const confirmRes = await fetch('/api/gift/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          paymentIntentId: paymentIntent.id,
          plan,
          years,
          gifterName,
          gifterEmail,
          recipientName,
          recipientEmail,
          personalMessage,
          scheduledSendAt,
        }),
      })

      if (!confirmRes.ok) {
        const { error: confErr } = await confirmRes.json().catch(() => ({}))
        throw new Error(confErr || t('errors.confirmFailed'))
      }

      onSuccess()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Order summary */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-2">
        <p className="text-xs font-semibold text-stone-500 mb-3">{t('payment.orderSummary')}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">{t('planYears', { plan: t('plan.name'), years: yearsLabel })}</span>
            <span className="font-semibold text-navy-900">£{totalGBP}</span>
          </div>
          <div className="flex justify-between text-xs text-stone-400">
            <span>{t('payment.forRecipient', { recipient: recipientName || recipientEmail })}</span>
            <span>{sendNow ? t('payment.sentImmediately') : t('payment.scheduledDelivery')}</span>
          </div>
        </div>
      </div>

      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" />{t('payment.processing')}</>
        ) : (
          <><GiftIcon size={15} />{t('payment.sendGift')}</>
        )}
      </button>

      <div className="flex items-start gap-3 bg-stone-100 rounded-xl p-4">
        <Lock size={14} className="text-navy-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-stone-500 leading-relaxed">
          {t('payment.securityNote')}
        </p>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function Gift() {
  const { t, i18n } = useTranslation('gift')
  const [step, setStep]           = useState(1)
  // Everstead+ is the only giftable plan, so this is fixed (not user-selected).
  const [selectedPlan] = useState('family')
  const [selectedYears, setSelectedYears] = useState(1)
  const [clientSecret, setClientSecret]   = useState(null)
  const [intentId, setIntentId]           = useState(null)
  const [amountPence, setAmountPence]     = useState(0)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [scheduledSendAt, setScheduledSendAt] = useState(null)
  const [sendNow, setSendNow]             = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')

  const [form, setForm] = useState({
    recipientName:   '',
    recipientEmail:  '',
    gifterName:      '',
    gifterEmail:     '',
    personalMessage: '',
  })

  const handleChange = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))

  const localePrefix = i18n.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/gift`
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-GB'

  const planObj      = GIFT_PLANS.find(p => p.id === selectedPlan)
  const planName     = t('plan.name')
  const planFeatures = t('plan.features', { returnObjects: true })
  const totalGBP     = planObj ? (planObj.yearlyPrice * selectedYears).toFixed(2) : '0.00'
  const yearsLabel   = t('years', { count: selectedYears })

  // Step 1 → Step 2
  const handleContinueToDetails = () => {
    setError(null)
    setStep(2)
  }

  // Step 2 → Step 3: create payment intent
  const handleContinueToPayment = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const finalSendAt = sendNow ? null : (scheduledDate ? new Date(scheduledDate).toISOString() : null)

    try {
      const res = await fetch('/api/stripe/gift-payment-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          plan:        selectedPlan,
          years:       selectedYears,
          gifterEmail: form.gifterEmail,
          gifterName:  form.gifterName,
        }),
      })

      if (!res.ok) {
        const { error: apiErr } = await res.json().catch(() => ({}))
        throw new Error(apiErr || t('errors.setupFailed'))
      }

      const { clientSecret: secret, intentId: iid, amountPence: ap } = await res.json()
      setClientSecret(secret)
      setIntentId(iid)
      setAmountPence(ap)
      setScheduledSendAt(finalSendAt)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    setStep(4)
  }

  // Form validation for step 2
  const step2Valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipientEmail) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.gifterEmail) &&
    form.gifterName.trim().length > 0 &&
    (sendNow || (scheduledDate && new Date(scheduledDate) > new Date()))

  const STEPS = [
    { n: 1, label: t('stepIndicator.length') },
    { n: 2, label: t('stepIndicator.details') },
    { n: 3, label: t('stepIndicator.payment') },
  ]

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.description')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>
      <HreflangLinks path="/gift" />
      <div className="min-h-screen">

        {/* ── HERO ── */}
        <section className="pt-32 pb-16 lg:pt-40 lg:pb-20 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('hero.eyebrow')}</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance">
              {t('hero.title')}
            </h1>
            <p className="mt-4 text-stone-300 text-base leading-relaxed max-w-md mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-stone-50">
          <div className="max-w-2xl mx-auto px-6 lg:px-8">

            {/* Step indicator */}
            {step <= 3 && (
              <div className="flex items-center justify-center gap-3 mb-14">
                {STEPS.map(({ n, label }, i, arr) => (
                  <React.Fragment key={n}>
                    <div className={`flex items-center gap-2 ${step >= n ? 'text-navy-800' : 'text-stone-400'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        step > n  ? 'bg-navy-800 border-navy-800 text-white' :
                        step === n ? 'border-navy-800 text-navy-800'          :
                        'border-stone-300 text-stone-400'
                      }`}>
                        {step > n ? <CheckCheck size={12} /> : n}
                      </div>
                      <span className="text-sm font-medium hidden sm:block">{label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`w-12 h-px transition-colors ${step > n ? 'bg-navy-800' : 'bg-stone-300'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* ── STEP 1: Choose plan & duration ── */}
            {step === 1 && (
              <div>
                <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-3">{t('step1.title')}</h2>
                <p className="text-center text-stone-500 text-sm mb-10">{t('step1.subtitle', { plan: planName })}</p>

                {/* What's included — Everstead+ is the only giftable plan, so this is a
                    fixed summary rather than a choice */}
                <div className="rounded-2xl border border-stone-200 bg-white p-6 mb-8">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <h3 className="font-semibold text-navy-900">{planName}</h3>
                      <span className="inline-block mt-1 text-[10px] font-semibold bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">
                        {t('plan.badge')}
                      </span>
                    </div>
                    <p className="font-display text-xl font-light text-navy-950 whitespace-nowrap">
                      £{planObj?.yearlyPrice.toFixed(2)}<span className="text-xs text-stone-400 ml-1">{t('plan.perYear')}</span>
                    </p>
                  </div>
                  <p className="text-stone-500 text-xs mb-4 leading-relaxed">{t('plan.desc')}</p>
                  <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {planFeatures.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-stone-600">
                        <svg className="w-3.5 h-3.5 text-sage-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Year selector — the primary choice on this step */}
                <div className="mb-10">
                  <p className="text-xs font-semibold text-stone-600 mb-3">{t('step1.howManyYears')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {YEAR_OPTIONS.map(opt => (
                      <button
                        key={opt.years}
                        onClick={() => setSelectedYears(opt.years)}
                        className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                          selectedYears === opt.years
                            ? 'border-navy-700 bg-navy-50 ring-2 ring-navy-200'
                            : 'border-stone-200 bg-white hover:border-navy-300'
                        }`}
                      >
                        {opt.highlight && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-sage-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                            {t('step1.mostThoughtful')}
                          </span>
                        )}
                        <p className="font-display text-xl font-light text-navy-950">{t('years', { count: opt.years })}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          £{((planObj?.yearlyPrice || 0) * opt.years).toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total & CTA */}
                <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{t('planYears', { plan: planName, years: yearsLabel })}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{t('step1.oneTimePayment')}</p>
                    </div>
                    <p className="font-display text-3xl font-light text-navy-950">£{totalGBP}</p>
                  </div>
                </div>

                <button
                  onClick={handleContinueToDetails}
                  className="btn-aurora w-full flex items-center justify-center gap-2 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-transform hover:-translate-y-0.5"
                >
                  {t('step1.continue')} <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ── STEP 2: Recipient & gifter details ── */}
            {step === 2 && (
              <div>
                <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">{t('step2.title')}</h2>
                <p className="text-center text-stone-500 text-sm mb-10">
                  {t('step2.gifting')}{' '}
                  <button onClick={() => setStep(1)} className="text-navy-700 underline underline-offset-2 font-medium hover:text-navy-900">
                    {t('planYears', { plan: planName, years: yearsLabel })}
                  </button>
                </p>

                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-6">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleContinueToPayment} className="space-y-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{t('step2.aboutRecipient')}</p>
                  </div>

                  <Field label={t('step2.recipientName.label')} required={false}>
                    <input
                      type="text" name="recipientName" value={form.recipientName} onChange={handleChange}
                      placeholder={t('step2.recipientName.placeholder')}
                      className={inputClass}
                    />
                  </Field>

                  <Field label={t('step2.recipientEmail.label')} required>
                    <input
                      type="email" name="recipientEmail" value={form.recipientEmail} onChange={handleChange}
                      placeholder={t('step2.recipientEmail.placeholder')} required
                      className={inputClass}
                    />
                  </Field>

                  <div className="pt-2 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{t('step2.aboutYou')}</p>
                  </div>

                  <Field label={t('step2.gifterName.label')} required>
                    <input
                      type="text" name="gifterName" value={form.gifterName} onChange={handleChange}
                      placeholder={t('step2.gifterName.placeholder')} required
                      className={inputClass}
                    />
                  </Field>

                  <Field label={t('step2.gifterEmail.label')} required>
                    <input
                      type="email" name="gifterEmail" value={form.gifterEmail} onChange={handleChange}
                      placeholder={t('step2.gifterEmail.placeholder')} required
                      className={inputClass}
                    />
                    <p className="text-xs text-stone-400 mt-1">{t('step2.gifterEmail.note')}</p>
                  </Field>

                  <Field label={t('step2.personalMessage.label')} required={false}>
                    <textarea
                      name="personalMessage" value={form.personalMessage} onChange={handleChange}
                      placeholder={t('step2.personalMessage.placeholder')}
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </Field>

                  {/* Delivery scheduling */}
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-stone-600 mb-3">{t('step2.delivery.title')}</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio" name="sendTiming" checked={sendNow}
                          onChange={() => { setSendNow(true); setScheduledDate('') }}
                          className="accent-navy-800"
                        />
                        <span className="text-sm text-navy-900">{t('step2.delivery.sendNow')}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio" name="sendTiming" checked={!sendNow}
                          onChange={() => setSendNow(false)}
                          className="accent-navy-800"
                        />
                        <span className="text-sm text-navy-900">{t('step2.delivery.schedule')}</span>
                      </label>
                    </div>

                    {!sendNow && (
                      <div className="mt-3">
                        <input
                          type="date"
                          value={scheduledDate}
                          min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                          onChange={e => setScheduledDate(e.target.value)}
                          className={inputClass}
                          required={!sendNow}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !step2Valid}
                    className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={15} className="animate-spin" />{t('step2.settingUp')}</>
                    ) : (
                      <><CreditCard size={15} />{t('step2.continueToPayment')}</>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP 3: Payment ── */}
            {step === 3 && clientSecret && (
              <div>
                <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">{t('step3.title')}</h2>
                <p className="text-center text-stone-500 text-sm mb-8">
                  {t('step3.subtitle')}
                </p>

                <Elements
                  stripe={getStripe()}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary:      '#0d1628',
                        colorBackground:   '#ffffff',
                        colorText:         '#0d1628',
                        colorDanger:       '#ef4444',
                        fontFamily:        'DM Sans, system-ui, sans-serif',
                        borderRadius:      '8px',
                        fontSizeBase:      '14px',
                        spacingUnit:       '4px',
                      },
                      rules: {
                        '.Input': { border: '1px solid #d6d3cd', boxShadow: 'none', padding: '10px 14px' },
                        '.Input:focus': { border: '1px solid #0d1628', boxShadow: '0 0 0 2px rgba(13,22,40,0.12)' },
                        '.Label': { fontWeight: '600', color: '#57534e', marginBottom: '6px' },
                      },
                    },
                  }}
                >
                  <GiftPaymentForm
                    plan={selectedPlan}
                    years={selectedYears}
                    gifterName={form.gifterName}
                    gifterEmail={form.gifterEmail}
                    recipientName={form.recipientName}
                    recipientEmail={form.recipientEmail}
                    personalMessage={form.personalMessage}
                    scheduledSendAt={scheduledSendAt}
                    sendNow={sendNow}
                    amountPence={amountPence}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              </div>
            )}

            {/* ── STEP 4: Confirmation ── */}
            {step === 4 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <GiftIcon size={28} className="text-sage-600" />
                </div>
                <h2 className="font-display text-3xl font-light text-navy-950 mb-3">{t('confirmation.title')}</h2>
                <p className="text-stone-500 text-base leading-relaxed max-w-sm mx-auto mb-2">
                  {sendNow
                    ? <Trans
                        t={t}
                        i18nKey="confirmation.sentNow"
                        values={{ recipient: form.recipientName || form.recipientEmail }}
                        components={{ bold: <strong className="text-navy-900" /> }}
                      />
                    : <Trans
                        t={t}
                        i18nKey="confirmation.scheduled"
                        values={{ date: new Date(scheduledDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) }}
                        components={{ bold: <strong className="text-navy-900" /> }}
                      />
                  }
                </p>
                <p className="text-stone-400 text-sm mb-10">{t('confirmation.receiptSent', { email: form.gifterEmail })}</p>

                <div className="bg-navy-50 border border-navy-100 rounded-2xl p-6 text-left max-w-sm mx-auto">
                  <p className="text-sm font-semibold text-navy-800 mb-1">{t('confirmation.upsellTitle')}</p>
                  <p className="text-xs text-stone-500 mb-4 leading-relaxed">{t('confirmation.upsellBody')}</p>
                  <Link
                    to="/get-started"
                    className="btn-aurora inline-flex items-center gap-2 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-transform hover:-translate-y-0.5"
                  >
                    {t('confirmation.upsellCta')} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ── TRUST FOOTER ── */}
        {step <= 3 && (
          <section className="py-12 border-t border-stone-200 bg-stone-50">
            <div className="max-w-3xl mx-auto px-6">
              <div className="flex flex-wrap justify-center gap-8">
                {t('trust.items', { returnObjects: true }).map(label => (
                  <div key={label} className="flex items-center gap-2 text-stone-500">
                    <Lock size={13} className="text-navy-600" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </>
  )
}
