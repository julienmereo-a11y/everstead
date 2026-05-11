import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, ArrowRight, Shield, Lock, Users,
  Eye, EyeOff, AlertCircle, Loader2, CheckCheck,
  CreditCard, Zap, Star,
} from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAuth } from '../contexts/AuthContext'
import { PLANS, getStripe } from '../lib/stripe'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const PLAN_OPTIONS = [
  {
    id: 'essential',
    name: 'Essential',
    monthly: 7, yearly: 5, promo: true,
    desc: 'For individuals getting organised.',
    features: ['Unlimited accounts & documents', 'Step-by-step instructions', '2 trusted contacts', '5 GB storage'],
  },
  {
    id: 'family',
    name: 'Family',
    monthly: 15, yearly: 12,
    desc: 'For households planning together.',
    features: ['All household members', '10 trusted contacts', 'Emergency vault sharing', '25 GB storage'],
    badge: 'Most popular',
  },
  {
    id: 'advisor',
    name: 'Advisor',
    monthly: 60, yearly: 48,
    desc: 'For professionals with multiple clients.',
    features: ['Multi-client workspace', 'Co-branded portal', 'Client dashboards', '100 GB storage'],
  },
]

const COUNTRIES = [
  { name: 'United Kingdom', code: 'GB', dial: '+44' },
  { name: 'United States',  code: 'US', dial: '+1'  },
  { name: 'France',         code: 'FR', dial: '+33' },
  { name: 'Germany',        code: 'DE', dial: '+49' },
  { name: 'Spain',          code: 'ES', dial: '+34' },
  { name: 'Italy',          code: 'IT', dial: '+39' },
  { name: 'Portugal',       code: 'PT', dial: '+351'},
  { name: 'Netherlands',    code: 'NL', dial: '+31' },
  { name: 'Belgium',        code: 'BE', dial: '+32' },
  { name: 'Switzerland',    code: 'CH', dial: '+41' },
  { name: 'Sweden',         code: 'SE', dial: '+46' },
  { name: 'Norway',         code: 'NO', dial: '+47' },
  { name: 'Denmark',        code: 'DK', dial: '+45' },
  { name: 'Ireland',        code: 'IE', dial: '+353'},
  { name: 'Australia',      code: 'AU', dial: '+61' },
  { name: 'Canada',         code: 'CA', dial: '+1'  },
  { name: 'New Zealand',    code: 'NZ', dial: '+64' },
  { name: 'South Africa',   code: 'ZA', dial: '+27' },
  { name: 'India',          code: 'IN', dial: '+91' },
  { name: 'Singapore',      code: 'SG', dial: '+65' },
  { name: 'UAE',            code: 'AE', dial: '+971'},
  { name: 'Brazil',         code: 'BR', dial: '+55' },
]

// Password strength checker
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-400'   }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-amber-400' }
  return              { score, label: 'Strong', color: 'bg-emerald-500' }
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function GetStarted() {
  const { signUp } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const [step, setStep]               = useState(1) // 1 = plan, 2 = account, 3 = payment
  const [selectedPlan, setSelectedPlan] = useState('family')
  const [annualBilling, setAnnualBilling] = useState(true)
  const [advisorFamilyCount, setAdvisorFamilyCount] = useState(null) // null = not asked yet
  const [showPw, setShowPw]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [clientSecret, setClientSecret] = useState(null)

  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    dialCode: '+44', phone: '', country: 'United Kingdom', nationality: 'United Kingdom',
  })

  // Referral code from ?ref= URL param — gives the new user a 21-day trial
  const referralCode = searchParams.get('ref') || null
  const trialDays    = referralCode ? 21 : 14

  // Pre-select plan from URL params (e.g. from Pricing page CTA)
  useEffect(() => {
    const plan    = searchParams.get('plan')
    const billing = searchParams.get('billing')
    if (plan && PLAN_OPTIONS.find(p => p.id === plan)) {
      setSelectedPlan(plan)
      setStep(2)
    }
    if (billing === 'monthly') setAnnualBilling(false)
    if (billing === 'yearly')  setAnnualBilling(true)
  }, [searchParams])

  const handleChange = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))

  // Derived state
  const passwordStrength = getPasswordStrength(form.password)
  const basicFieldsValid =
    form.fullName.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.password.length >= 8

  // ── SUBMIT: create account → create Stripe subscription → show inline card form ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Register server-side to bypass Supabase CAPTCHA protection
      const registerRes = await fetch('/api/auth/delegate-register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mode:       'register',
          wantsTrial: true,
          email:      form.email,
          password:   form.password,
          name:       form.fullName,
        }),
      })

      if (!registerRes.ok) {
        const { error } = await registerRes.json().catch(() => ({}))
        throw new Error(error || 'Could not create account. Please try again.')
      }

      const { access_token, refresh_token } = await registerRes.json()
      await supabase.auth.setSession({ access_token, refresh_token })

      const { data: { user } } = await supabase.auth.getUser()

      // 1b. Save phone, country, nationality to profile (trigger only creates basic row)
      const fullPhone = (form.dialCode && form.phone) ? `${form.dialCode} ${form.phone}` : null
      await supabase.from('profiles').update({
        phone:       fullPhone,
        country:     form.country     || null,
        nationality: form.nationality || null,
      }).eq('id', user?.id)

      // 1c. Notify owner — fire-and-forget
      fetch('/api/emails/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:         'owner-registration',
          name:         form.fullName,
          email:        form.email,
          plan:         selectedPlan,
          billingCycle: annualBilling ? 'yearly' : 'monthly',
        }),
      }).catch(console.error)

      // 2. Create Stripe customer + subscription with trial → get client secret
      //    for the inline PaymentElement (no redirect to Stripe)
      const intentRes = await fetch('/api/stripe/setup-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:          user?.id,
          email:           form.email,
          name:            form.fullName,
          plan:            selectedPlan,
          billingCycle:    annualBilling ? 'yearly' : 'monthly',
          referredBy:      referralCode,
          trialPeriodDays: trialDays,
        }),
      })

      if (!intentRes.ok) {
        const { error } = await intentRes.json().catch(() => ({}))
        throw new Error(error || 'Could not set up payment. Please try again.')
      }

      const { clientSecret: secret } = await intentRes.json()
      setClientSecret(secret)
      setStep(3)
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-stone-50 pt-24 min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Get started</p>
          <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance">
            Start your plan in minutes.
          </h1>
          <p className="mt-4 text-stone-300 text-base leading-relaxed max-w-md mx-auto">
            {referralCode
              ? <><span className="text-sage-300 font-semibold">You've been referred — enjoy a 21-day free trial.</span> Enter your card details and you won't be charged until day 21.</>
              : `${trialDays}-day free trial on every plan. Enter your card details — you won't be charged until the trial ends.`
            }
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">

          {/* Billing toggle — visible only on step 1 */}
          {step === 1 && (
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-full p-1 shadow-sm">
                <button
                  onClick={() => setAnnualBilling(false)}
                  className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${!annualBilling ? 'bg-navy-800 text-white' : 'text-stone-500 hover:text-navy-800'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setAnnualBilling(true)}
                  className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${annualBilling ? 'bg-navy-800 text-white' : 'text-stone-500 hover:text-navy-800'}`}
                >
                  Yearly <span className="text-sage-500 font-semibold ml-1">Save 20%</span>
                </button>
              </div>
            </div>
          )}

          {/* Step indicator */}
          {step <= 3 && (
            <div className="flex items-center justify-center gap-3 mb-14">
              {[
                { n: 1, label: 'Choose plan' },
                { n: 2, label: 'Create account' },
                { n: 3, label: 'Payment' },
              ].map(({ n, label }, i, arr) => (
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

          {/* ── STEP 1: Plan selection ─────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-10">Choose your plan</h2>
              <div className="grid md:grid-cols-3 gap-5 mb-10">
                {PLAN_OPTIONS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => { setSelectedPlan(plan.id); if (plan.id !== 'advisor') setAdvisorFamilyCount(null) }}
                    className={`text-left rounded-2xl border-2 p-6 transition-all ${
                      selectedPlan === plan.id
                        ? 'border-navy-700 bg-navy-50 ring-2 ring-navy-200'
                        : 'border-stone-200 bg-white hover:border-navy-300'
                    }`}
                  >
                    {(plan.badge || plan.promo) && (
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {plan.badge && (
                          <div className="inline-flex items-center gap-1 bg-sage-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            <Star size={10} />{plan.badge}
                          </div>
                        )}
                        {plan.promo && (
                          <div className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            Launch offer
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-navy-900">{plan.name}</h3>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                        selectedPlan === plan.id ? 'border-navy-700 bg-navy-700' : 'border-stone-300'
                      }`}>
                        {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-stone-500 text-xs mb-4 leading-relaxed">{plan.desc}</p>
                    <div className="mb-5">
                      <span className="font-display text-2xl font-light text-navy-950">
                        £{annualBilling ? plan.yearly : plan.monthly}
                      </span>
                      <span className="text-xs text-stone-400 ml-1.5">/mo · {annualBilling ? 'billed yearly' : 'billed monthly'}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-stone-600">
                          <CheckCircle2 size={12} className="text-sage-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              {/* Advisor family count gate */}
              {selectedPlan === 'advisor' && advisorFamilyCount === null && (
                <div className="mt-6 bg-navy-50 border border-navy-200 rounded-2xl p-6 space-y-4 max-w-md mx-auto">
                  <div>
                    <p className="font-semibold text-navy-900 text-sm">How many client families are you managing?</p>
                    <p className="text-xs text-stone-500 mt-1">This helps us set you up on the right plan.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAdvisorFamilyCount('lte5')}
                      className="flex flex-col items-center gap-1 border-2 border-stone-200 bg-white rounded-xl p-4 hover:border-navy-400 transition-all"
                    >
                      <span className="font-display text-2xl font-light text-navy-950">≤ 5</span>
                      <span className="text-xs text-stone-500">Up to 5 families</span>
                    </button>
                    <button
                      onClick={() => navigate('/book-demo?reason=advisor-large')}
                      className="flex flex-col items-center gap-1 border-2 border-stone-200 bg-white rounded-xl p-4 hover:border-navy-400 transition-all"
                    >
                      <span className="font-display text-2xl font-light text-navy-950">5+</span>
                      <span className="text-xs text-stone-500">More than 5 families</span>
                    </button>
                  </div>
                  <p className="text-xs text-stone-400 text-center">Managing more than 5 families? We'll connect you with our team for a tailored setup.</p>
                </div>
              )}

              {/* Standard continue — shown when not advisor, or advisor has selected ≤5 */}
              {(selectedPlan !== 'advisor' || advisorFamilyCount === 'lte5') && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 bg-navy-800 text-white font-semibold text-sm px-8 py-3.5 rounded-lg hover:bg-navy-700 transition-colors"
                  >
                    Continue with {PLAN_OPTIONS.find(p => p.id === selectedPlan)?.name}
                    <ArrowRight size={16} />
                  </button>
                  <p className="mt-3 text-xs text-stone-400">{trialDays}-day free trial · Cancel before it ends and pay nothing</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Account creation ───────────────────── */}
          {step === 2 && (
            <div className="max-w-md mx-auto">
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">Create your account</h2>
              <p className="text-center text-stone-500 text-sm mb-10">
                Starting with the{' '}
                <button
                  onClick={() => setStep(1)}
                  className="text-navy-700 underline underline-offset-2 font-medium hover:text-navy-900"
                >
                  {PLAN_OPTIONS.find(p => p.id === selectedPlan)?.name} plan
                </button>
                {' '}· {annualBilling ? 'yearly billing' : 'monthly billing'}
              </p>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-6">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Full name */}
                <Field label="Full name" required>
                  <input
                    type="text" name="fullName" value={form.fullName} onChange={handleChange}
                    placeholder="Jane Smith" required autoFocus
                    className={inputClass}
                  />
                </Field>

                {/* Email */}
                <Field label="Email address" required>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="jane@example.com" required
                    className={inputClass}
                  />
                </Field>

                {/* Password */}
                <Field label="Password" required>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                      placeholder="Min. 8 characters" required minLength={8}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button" onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {form.password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength.score ? passwordStrength.color : 'bg-stone-200'}`} />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        passwordStrength.score <= 1 ? 'text-red-500' :
                        passwordStrength.score <= 3 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>{passwordStrength.label}</p>
                    </div>
                  )}
                </Field>

                {/* ── Slides in once basics are valid ─────── */}
                <div style={{
                  maxHeight:  basicFieldsValid ? '500px' : '0px',
                  opacity:    basicFieldsValid ? 1 : 0,
                  overflow:   'hidden',
                  transition: 'max-height 0.45s ease, opacity 0.35s ease',
                }}>
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-stone-200" />
                      <span className="text-xs text-stone-400 font-medium">A few more details</span>
                      <div className="flex-1 h-px bg-stone-200" />
                    </div>

                    {/* Phone */}
                    <Field label="Phone number" required>
                      <div className="flex gap-2">
                        <select
                          name="dialCode" value={form.dialCode} onChange={handleChange}
                          className={`${inputClass} !w-28 flex-shrink-0 px-3`}
                        >
                          {COUNTRIES.map(c => (
                            <option key={c.code + c.dial} value={c.dial}>{c.dial} {c.code}</option>
                          ))}
                        </select>
                        <input
                          type="tel" name="phone" value={form.phone} onChange={handleChange}
                          placeholder="7911 123456"
                          inputMode="tel"
                          autoComplete="tel-national"
                          required={basicFieldsValid}
                          className={`${inputClass} min-w-0 flex-1`}
                        />
                      </div>
                    </Field>

                    {/* Country of residence */}
                    <Field label="Country of residence" required>
                      <select name="country" value={form.country} onChange={handleChange} required={basicFieldsValid} className={inputClass}>
                        <option value="">Select country…</option>
                        {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                      </select>
                    </Field>

                    {/* Nationality */}
                    <Field label="Nationality" required>
                      <select name="nationality" value={form.nationality} onChange={handleChange} required={basicFieldsValid} className={inputClass}>
                        <option value="">Select nationality…</option>
                        {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Terms */}
                <p className="text-xs text-stone-400 leading-relaxed pt-1">
                  By creating an account you agree to our{' '}
                  <Link to="/terms" className="text-navy-700 underline underline-offset-2" target="_blank">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-navy-700 underline underline-offset-2" target="_blank">Privacy Policy</Link>.
                </p>

                <button
                  type="submit"
                  disabled={loading || !basicFieldsValid}
                  className="w-full bg-navy-800 text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" />Creating your account…</>
                  ) : (
                    <><CreditCard size={15} />Start my Everstead trial</>
                  )}
                </button>
              </form>

              {/* Trust note */}
              <div className="mt-5 flex items-start gap-3 bg-stone-100 rounded-xl p-4">
                <Lock size={14} className="text-navy-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-stone-500 leading-relaxed">
                  Your card is stored securely by Stripe and will not be charged until your {trialDays}-day trial ends. Cancel anytime before then and pay nothing.
                </p>
              </div>

              <p className="text-center mt-5 text-xs text-stone-400">
                Already have an account?{' '}
                <Link to="/login" className="text-navy-700 font-medium hover:text-navy-900">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── STEP 3: Inline payment ─────────────────────── */}
          {step === 3 && clientSecret && (
            <div className="max-w-md mx-auto">
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">Add your card</h2>
              <p className="text-center text-stone-500 text-sm mb-8">
                Your card won't be charged for {trialDays} days. Cancel any time before then and pay nothing.
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
                <CheckoutForm trialDays={trialDays} plan={selectedPlan} />
              </Elements>

              <div className="mt-5 flex items-start gap-3 bg-stone-100 rounded-xl p-4">
                <Lock size={14} className="text-navy-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-stone-500 leading-relaxed">
                  Your card details are handled directly by Stripe and never touch our servers. Secured with 256-bit encryption.
                </p>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ── TRUST FOOTER ─────────────────────────────────────── */}
      <section className="py-12 border-t border-stone-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { icon: Lock,   label: 'AES-256 encryption'          },
              { icon: Shield, label: '14-day free trial'            },
              { icon: Users,  label: 'Trusted by families & advisors' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-stone-500">
                <Icon size={15} className="text-navy-600" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// INLINE CHECKOUT FORM (step 3)
// ─────────────────────────────────────────────────────────────
function CheckoutForm({ trialDays, plan }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?checkout=success`,
      },
      // Don't redirect if Stripe can confirm without 3DS
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message)
      setLoading(false)
    } else {
      // Confirmed without redirect — go straight to dashboard
      window.location.href = '/dashboard?checkout=success'
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        className="w-full bg-navy-800 text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" />Processing…</>
        ) : (
          <><CreditCard size={15} />Start my {trialDays}-day free trial</>
        )}
      </button>

      <p className="text-center text-xs text-stone-400">
        You won't be charged until day {trialDays}. Cancel any time before then.
      </p>
    </form>
  )
}

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
