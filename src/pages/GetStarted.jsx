import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, ArrowRight, Shield, Lock, Users,
  Eye, EyeOff, AlertCircle, Loader2, CheckCheck,
  CreditCard, Zap, Star, X,
} from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAuth } from '../contexts/AuthContext'
import { PLANS, getStripe } from '../lib/stripe'
import { PRICING } from '../config/pricing'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const PLAN_OPTIONS = [
  {
    id: 'essential',
    name: 'Essential',
    monthly: PRICING.essential.monthly.perMonth, yearly: PRICING.essential.annual.perMonth, promo: true,
    desc: 'For individuals getting started. Up to 10 accounts, 1 trusted contact, 1 GB storage.',
    features: ['Up to 10 accounts & documents', 'Step-by-step instructions', '1 trusted contact', '1 GB storage'],
  },
  {
    id: 'family',
    name: 'Family',
    monthly: PRICING.family.monthly.perMonth, yearly: PRICING.family.annual.perMonth,
    desc: 'For couples and households planning together.',
    features: ['Two private vaults — one subscription', 'Each person keeps their own private data', 'Share only what you choose', '10 trusted contacts', '25 GB storage'],
    badge: 'Most popular',
  },
  {
    id: 'advisor',
    name: 'Adviser',
    desc: 'For professionals with multiple clients. Pricing on application.',
    features: ['Multi-client workspace', 'Co-branded portal', 'Client dashboards', '100 GB storage'],
  },
]

// Sanctioned / restricted countries — registration blocked for compliance
const RESTRICTED_COUNTRIES = new Set([
  'Russia', 'North Korea', 'Iran', 'Syria', 'Belarus', 'Afghanistan',
  'Myanmar', 'Venezuela', 'Zimbabwe', 'Nicaragua', 'Libya', 'Somalia',
  'Yemen', 'Sudan', 'Mali', 'Burundi', 'Central African Republic',
  'Democratic Republic of Congo', 'Iraq', 'Lebanon', 'Bosnia and Herzegovina',
])

const COUNTRIES = [
  // Primary markets
  { name: 'United Kingdom', code: 'GB', dial: '+44'  },
  { name: 'Ireland',        code: 'IE', dial: '+353' },
  { name: 'United States',  code: 'US', dial: '+1'   },
  { name: 'Canada',         code: 'CA', dial: '+1'   },
  // Europe
  { name: 'Austria',        code: 'AT', dial: '+43'  },
  { name: 'Belgium',        code: 'BE', dial: '+32'  },
  { name: 'Denmark',        code: 'DK', dial: '+45'  },
  { name: 'Finland',        code: 'FI', dial: '+358' },
  { name: 'France',         code: 'FR', dial: '+33'  },
  { name: 'Germany',        code: 'DE', dial: '+49'  },
  { name: 'Greece',         code: 'GR', dial: '+30'  },
  { name: 'Italy',          code: 'IT', dial: '+39'  },
  { name: 'Luxembourg',     code: 'LU', dial: '+352' },
  { name: 'Netherlands',    code: 'NL', dial: '+31'  },
  { name: 'Norway',         code: 'NO', dial: '+47'  },
  { name: 'Poland',         code: 'PL', dial: '+48'  },
  { name: 'Portugal',       code: 'PT', dial: '+351' },
  { name: 'Spain',          code: 'ES', dial: '+34'  },
  { name: 'Sweden',         code: 'SE', dial: '+46'  },
  { name: 'Switzerland',    code: 'CH', dial: '+41'  },
  // Middle East
  { name: 'UAE',            code: 'AE', dial: '+971' },
  { name: 'Qatar',          code: 'QA', dial: '+974' },
  { name: 'Saudi Arabia',   code: 'SA', dial: '+966' },
]

// ─────────────────────────────────────────────────────────────
// GEO-ACCESS CONFIG
// Edit these lists here — they drive all three access tiers.
//
// ⚠️  CLIENT-SIDE ONLY — trivially bypassed with a VPN.
//     A matching server-side check via a Supabase Edge Function
//     should be added before production launch for full enforcement.
// ─────────────────────────────────────────────────────────────
const GEO_CONFIG = {
  // Tier 1 — Hard block: sanctioned / compliance-restricted nations
  sanctioned: new Set([
    'RU', 'BY', 'KP', 'IR', 'SY', 'MM', 'VE', 'AF', 'IQ', 'LY', 'SD', 'YE',
  ]),

  // Tier 2 — Hard block: Africa (except South Africa)
  africa: new Set([
    'DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD','KM','CD','CG','CI',
    'DJ','EG','GQ','ER','ET','GA','GM','GH','GN','GW','KE','LS','LR',
    'MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN',
    'SC','SL','SO','SS','SZ','TZ','TG','TN','UG','ZM','ZW',
    // LY and SD are already caught by Tier 1
  ]),

  // Tier 3 — Allowed markets (no warning shown).
  // Everyone else gets a soft dismissible notice.
  allowed: new Set([
    'GB','IE',                          // Primary
    'US','CA','AU',                     // English-speaking
    'AE','QA','SA','KW','BH','OM',      // Gulf
    // EU
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
    'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
    // EEA + Switzerland
    'IS','LI','NO','CH',
  ]),
}

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

  // Geo access control — 'loading' | 'allowed' | 'soft-warn' | 'blocked-africa' | 'blocked-sanctioned'
  const [geoStatus, setGeoStatus]     = useState('loading')
  const [geoDismissed, setGeoDismissed] = useState(false)

  const [step, setStep]               = useState(1) // 1 = plan, 2 = account, 3 = payment
  const [selectedPlan, setSelectedPlan] = useState('family')
  const [annualBilling, setAnnualBilling] = useState(true)
  const [advisorFamilyCount, setAdvisorFamilyCount] = useState(null) // null = not asked yet
  const [showPw, setShowPw]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [stripeCustomerId, setStripeCustomerId] = useState(null)
  const [isOAuthProfile, setIsOAuthProfile] = useState(false) // true = Google user filling in missing details

  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    country: 'United Kingdom',
  })

  // Referral code from ?ref= URL param — gives the new user a 21-day trial
  const referralCode = searchParams.get('ref') || null
  const trialDays    = referralCode ? 21 : 14

  // Promo code from ?promo= URL param (e.g. FOUNDING50 — first year free).
  // Validated against Stripe on mount; threaded into create-subscription.
  const promoCode = (searchParams.get('promo') || '').trim().toUpperCase() || null
  const [promoState, setPromoState] = useState({ status: 'idle', label: null, reason: null })

  useEffect(() => {
    if (!promoCode) return
    let cancelled = false
    setPromoState({ status: 'checking', label: null, reason: null })
    fetch('/api/stripe/validate-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data?.valid) setPromoState({ status: 'valid', label: data.label, reason: null })
        else             setPromoState({ status: 'invalid', label: null, reason: data?.reason || 'Code not valid' })
      })
      .catch(() => { if (!cancelled) setPromoState({ status: 'invalid', label: null, reason: 'Could not validate code' }) })
    return () => { cancelled = true }
  }, [promoCode])

  // Geo access check — runs once on mount, 3-second timeout, fails open
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const cc = data?.country_code
        if (!cc) { setGeoStatus('allowed'); return }
        if (GEO_CONFIG.sanctioned.has(cc))    setGeoStatus('blocked-sanctioned')
        else if (GEO_CONFIG.africa.has(cc))   setGeoStatus('blocked-africa')
        else if (!GEO_CONFIG.allowed.has(cc)) setGeoStatus('soft-warn')
        else                                  setGeoStatus('allowed')
      })
      .catch(() => setGeoStatus('allowed')) // API failed / timed out — allow silently
      .finally(() => clearTimeout(timer))
    return () => { controller.abort(); clearTimeout(timer) }
  }, [])

  // Resume checkout — handles ?resume=true (dashboard gate) and localStorage flag (Google OAuth callback)
  useEffect(() => {
    const isResume  = searchParams.get('resume') === 'true'
    const isOAuth   = localStorage.getItem('everstead_oauth_pending') === 'true'
    if (!isResume && !isOAuth) return
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      // Clear the OAuth flag only AFTER the session is confirmed — otherwise a
      // null session on the first post-redirect run would consume the flag and
      // strand the Google user on step 1 with no retry.
      if (isOAuth) localStorage.removeItem('everstead_oauth_pending')

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, stripe_subscription_id, subscription_status, full_name, email, plan, billing_cycle, country')
        .eq('id', session.user.id)
        .single()

      if (!profile) return

      // Already subscribed — nothing to resume. Go straight to the dashboard
      // rather than recreating a SetupIntent and showing the card step again.
      if (
        profile.stripe_subscription_id ||
        ['trialing', 'active', 'cancelling', 'past_due'].includes(profile.subscription_status)
      ) {
        navigate('/dashboard')
        return
      }

      // Restore plan from localStorage if coming from Google OAuth
      let oauthPlan = null
      try { oauthPlan = JSON.parse(localStorage.getItem('everstead_oauth_plan') || 'null') } catch {}
      if (oauthPlan) localStorage.removeItem('everstead_oauth_plan')

      // URL param plan always wins over profile default (prevents race condition
      // where async resume effect overwrites plan set by the URL param effect)
      const urlPlan    = searchParams.get('plan')
      const resumePlan = (urlPlan && PLAN_OPTIONS.find(p => p.id === urlPlan))
        ? urlPlan
        : (oauthPlan?.plan || profile.plan || 'essential')
      const resumeBilling = profile.billing_cycle
        ? profile.billing_cycle === 'yearly'
        : (oauthPlan?.billing ?? true)
      setSelectedPlan(resumePlan)
      setAnnualBilling(resumeBilling)

      // Google OAuth users skip step 2 — collect missing profile fields first
      if (isOAuth && !profile.country) {
        setForm(v => ({
          ...v,
          fullName: profile.full_name || session.user.user_metadata?.full_name || '',
          email:    profile.email     || session.user.email || '',
          country:  profile.country   || 'United Kingdom',
        }))
        setIsOAuthProfile(true)
        setStep(2)
        return
      }

      const intentRes = await fetch('/api/stripe/setup-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:             session.user.id,
          email:              profile.email || session.user.email,
          name:               profile.full_name,
          existingCustomerId: profile.stripe_customer_id || undefined,
          plan:               resumePlan,
          billingCycle:       resumeBilling,
          trialPeriodDays:    referralCode ? 21 : 14,
        }),
      })
      if (!intentRes.ok) return
      const { clientSecret: secret, customerId } = await intentRes.json()
      setClientSecret(secret)
      setStripeCustomerId(customerId)
      setStep(3)
    })()
  }, [])

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

  // ── GOOGLE SIGNUP ─────────────────────────────────────────────
  const handleGoogleSignup = async () => {
    // Persist plan choice + flag so we can restore them after the OAuth redirect
    localStorage.setItem('everstead_oauth_pending', 'true')
    localStorage.setItem('everstead_oauth_plan', JSON.stringify({
      plan:    selectedPlan,
      billing: annualBilling,
    }))
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/get-started` },
    })
  }

  // ── OAUTH PROFILE COMPLETION: save country → setup-intent → step 3 ──
  const handleOAuthProfileSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (RESTRICTED_COUNTRIES.has(form.country)) {
        throw new Error('We\'re unable to offer our services in your country due to regulatory restrictions. If you believe this is an error, please contact support@everstead.care.')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired. Please sign in again.')

      await supabase.from('profiles').upsert(
        { id: session.user.id, country: form.country || null },
        { onConflict: 'id', ignoreDuplicates: false }
      )

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, full_name, email, plan, billing_cycle')
        .eq('id', session.user.id)
        .single()

      const intentRes = await fetch('/api/stripe/setup-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:             session.user.id,
          email:              profile?.email || session.user.email,
          name:               profile?.full_name,
          existingCustomerId: profile?.stripe_customer_id || undefined,
          plan:               selectedPlan,
          billingCycle:       annualBilling ? 'yearly' : 'monthly',
          trialPeriodDays:    referralCode ? 21 : 14,
          country:            form.country,
        }),
      })
      if (!intentRes.ok) {
        const { error } = await intentRes.json().catch(() => ({}))
        throw new Error(error || 'Could not set up payment. Please try again.')
      }
      const { clientSecret: secret, customerId } = await intentRes.json()
      setClientSecret(secret)
      setStripeCustomerId(customerId)
      setIsOAuthProfile(false)
      setStep(3)
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── SUBMIT: create account → create Stripe subscription → show inline card form ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 0. Sanctions check — block restricted countries before any registration
      if (RESTRICTED_COUNTRIES.has(form.country)) {
        throw new Error('We\'re unable to offer our services in your country due to regulatory restrictions. If you believe this is an error, please contact support@everstead.care.')
      }

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
          plan:       selectedPlan,
        }),
      })

      if (!registerRes.ok) {
        const { error } = await registerRes.json().catch(() => ({}))
        throw new Error(error || 'Could not create account. Please try again.')
      }

      const { access_token, refresh_token } = await registerRes.json()
      await supabase.auth.setSession({ access_token, refresh_token })

      const { data: { user } } = await supabase.auth.getUser()

      // 1b. Save country to profile (trigger only creates basic row).
      // Use upsert so this works even if the trigger row isn't written yet.
      if (user?.id) {
        await supabase.from('profiles').upsert(
          { id: user.id, country: form.country || null },
          { onConflict: 'id', ignoreDuplicates: false }
        )
      }

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
          country:         form.country,
        }),
      })

      if (!intentRes.ok) {
        const { error } = await intentRes.json().catch(() => ({}))
        throw new Error(error || 'Could not set up payment. Please try again.')
      }

      const { clientSecret: secret, customerId } = await intentRes.json()
      setClientSecret(secret)
      setStripeCustomerId(customerId)
      setStep(3)
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Helmet>
      <title>Get Started — Everstead</title>
      <meta name="description" content="Start your Everstead plan in minutes. Choose your plan, create your account, and begin your 14-day free trial. No charge until the trial ends." />
      <link rel="canonical" href="https://www.everstead.care/get-started" />
      <meta property="og:title" content="Get Started — Everstead" />
      <meta property="og:description" content="Start your estate plan in minutes. 14-day free trial on every plan — card required, no charge until the trial ends." />
      <meta property="og:url" content="https://www.everstead.care/get-started" />
    </Helmet>
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

          {/* Promo banner — only when ?promo= is present */}
          {promoCode && promoState.status === 'valid' && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-sage-500/15 border border-sage-400/30 px-5 py-2.5 text-sm">
              <span aria-hidden="true">🎉</span>
              <span className="text-sage-200 font-semibold">Founding offer applied — {promoState.label.toLowerCase()}.</span>
              <span className="text-stone-400 hidden sm:inline">Code {promoCode}</span>
            </div>
          )}
          {promoCode && promoState.status === 'invalid' && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-400/30 px-5 py-2.5 text-sm">
              <span className="text-amber-200">Code {promoCode} couldn't be applied — {promoState.reason.toLowerCase()}. You can still start your free trial.</span>
            </div>
          )}
          {promoCode && promoState.status === 'checking' && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-5 py-2.5 text-sm">
              <span className="text-stone-400">Checking your code…</span>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">

          {/* ── GEO GATE ─────────────────────────────────────────── */}

          {/* Loading — form hidden until geo resolves */}
          {geoStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-navy-600 animate-spin" />
              <p className="text-stone-400 text-sm">Just a moment…</p>
            </div>
          )}

          {/* Tier 1 — Sanctioned country */}
          {geoStatus === 'blocked-sanctioned' && (
            <div className="max-w-md mx-auto text-center py-20">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
                <Shield size={22} className="text-red-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Everstead is not available in your country.
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                We're unable to offer our services in your location due to regulatory restrictions.
              </p>
            </div>
          )}

          {/* Tier 2 — Africa (except South Africa) */}
          {geoStatus === 'blocked-africa' && (
            <div className="max-w-md mx-auto text-center py-20">
              <div className="w-14 h-14 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-6">
                <Shield size={22} className="text-stone-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                Everstead is not currently available in your location.
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                We're focused on a small number of markets right now. We hope to expand — check back soon.
              </p>
            </div>
          )}

          {/* Tier 3 — Soft warning, dismissible */}
          {geoStatus === 'soft-warn' && !geoDismissed && (
            <div className="mb-8 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <div className="flex-1 text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">Everstead is currently designed for people in the UK and Ireland.</span>{' '}
                Some features may not match the legal requirements in your country — but we're expanding, so this may change.
              </div>
              <button
                onClick={() => setGeoDismissed(true)}
                aria-label="Dismiss"
                className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0 mt-0.5"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Form — hidden while loading or hard-blocked */}
          {(geoStatus === 'allowed' || geoStatus === 'soft-warn') && (<>

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
                  Yearly{' '}
                  {annualBilling
                    ? <span className="text-sage-300 font-semibold ml-1">✓ Saving 20%</span>
                    : <span className="text-sage-500 font-semibold ml-1">Save 20%</span>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Step indicator */}
          {step <= 3 && (
            <div className="flex items-center justify-center gap-3 mb-14">
              {[
                { n: 1, label: 'Choose plan' },
                { n: 2, label: isOAuthProfile ? 'Your details' : 'Create account' },
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
                      {plan.id === 'advisor' ? (
                        <span className="font-display text-2xl font-light text-navy-950">Pricing on application</span>
                      ) : (
                        <>
                          <span className="font-display text-2xl font-light text-navy-950">
                            £{annualBilling ? plan.yearly : plan.monthly}
                          </span>
                          <span className="text-xs text-stone-400 ml-1.5">/mo · {annualBilling ? 'billed annually (save 20%)' : 'billed monthly'}</span>
                        </>
                      )}
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

              {/* Advisor — redirect straight to book-demo */}
              {selectedPlan === 'advisor' && (
                <div className="mt-6 bg-navy-50 border border-navy-200 rounded-2xl p-6 text-center max-w-md mx-auto">
                  <p className="font-semibold text-navy-900 text-sm mb-2">Adviser accounts are set up personally.</p>
                  <p className="text-xs text-stone-500 mb-5">Book a 20-minute call and we'll get you onboarded.</p>
                  <button
                    onClick={() => navigate('/book-demo')}
                    className="inline-flex items-center justify-center gap-2 text-white font-semibold text-sm px-8 py-3.5 rounded-lg transition-colors bg-navy-900 hover:bg-navy-800 w-full"
                  >
                    Book a demo →
                  </button>
                </div>
              )}

              {/* Standard continue — shown only for non-advisor plans */}
              {selectedPlan !== 'advisor' && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setStep(clientSecret ? 3 : 2)}
                    className="inline-flex items-center gap-2 text-white font-semibold text-sm px-8 py-3.5 rounded-lg transition-colors"
                    style={{ backgroundColor: '#4c7d47' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#3d6b3a'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
                  >
                    {clientSecret
                      ? <>Back to payment with {PLAN_OPTIONS.find(p => p.id === selectedPlan)?.name}</>
                      : <>Continue with {PLAN_OPTIONS.find(p => p.id === selectedPlan)?.name}</>}
                    <ArrowRight size={16} />
                  </button>
                  <p className="mt-3 text-xs text-stone-400">{trialDays}-day free trial · Cancel before it ends and pay nothing</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2a: OAuth profile completion (Google users only) ─ */}
          {step === 2 && isOAuthProfile && (
            <div className="max-w-md mx-auto">
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">One last step</h2>
              <p className="text-center text-stone-500 text-sm mb-10">
                We just need a few more details before setting up your trial.
              </p>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-6">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleOAuthProfileSubmit} className="space-y-4">

                {/* Country of residence */}
                <Field label="Country of residence" required>
                  <select name="country" value={form.country} onChange={handleChange} required autoFocus className={inputClass}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>

                {/* Terms */}
                <p className="text-xs text-stone-400 leading-relaxed pt-1">
                  By continuing you agree to our{' '}
                  <Link to="/terms" className="text-navy-700 underline underline-offset-2" target="_blank">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-navy-700 underline underline-offset-2" target="_blank">Privacy Policy</Link>.
                </p>

                <button
                  type="submit"
                  disabled={loading || !form.country}
                  className="w-full text-white font-semibold text-sm py-3.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#4c7d47' }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" />Setting up…</>
                  ) : (
                    <><CreditCard size={15} />Continue to payment</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2b: Email account creation ───────────────────── */}
          {step === 2 && !isOAuthProfile && (
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

              {/* Google sign-up */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-3 border border-stone-300 bg-white text-navy-900 font-medium text-sm py-3 rounded-lg hover:bg-stone-50 transition-colors mb-5"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400">or continue with email</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

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
                      <span className="text-xs text-stone-400 font-medium">One more detail</span>
                      <div className="flex-1 h-px bg-stone-200" />
                    </div>

                    {/* Country of residence */}
                    <Field label="Country of residence" required>
                      <select name="country" value={form.country} onChange={handleChange} required={basicFieldsValid} className={inputClass}>
                        <option value="">Select country…</option>
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
                  className="w-full text-white font-semibold text-sm py-3.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#4c7d47' }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
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
              <p className="text-center mt-3 text-xs text-stone-400">
                Not ready to commit? You can export all your data anytime.{' '}
                <Link to="/data-promise" className="text-navy-600 hover:text-navy-800">Our data promise →</Link>
              </p>
            </div>
          )}

          {/* ── STEP 3: Inline payment ─────────────────────── */}
          {step === 3 && clientSecret && (
            <div className="max-w-md mx-auto">
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">Add your card</h2>
              <p className="text-center text-stone-500 text-sm mb-3">
                Your card won't be charged for {trialDays} days. Cancel any time before then and pay nothing.
              </p>
              <p className="text-center text-sm text-stone-600 mb-8">
                {PLAN_OPTIONS.find(p => p.id === selectedPlan)?.name} plan · {annualBilling ? 'billed annually' : 'billed monthly'}
                {' · '}
                <button
                  onClick={() => setStep(1)}
                  className="text-navy-700 underline underline-offset-2 font-medium hover:text-navy-900"
                >
                  Change plan
                </button>
              </p>

              {!annualBilling && (() => {
                const plan = PLAN_OPTIONS.find(p => p.id === selectedPlan)
                const saving = plan ? Math.round((plan.monthly - plan.yearly) * 12) : 0
                return (
                  <div className="mb-5 flex items-center justify-between bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-sage-700">
                      💡 Switch to annual and save <strong>£{saving}/yr (20%)</strong>
                    </p>
                    <button
                      onClick={() => setAnnualBilling(true)}
                      className="text-xs font-semibold text-sage-700 hover:text-sage-900 underline underline-offset-2 ml-3 whitespace-nowrap"
                    >
                      Switch to annual →
                    </button>
                  </div>
                )
              })()}

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
                <CheckoutForm
                  trialDays={trialDays}
                  plan={selectedPlan}
                  billingCycle={annualBilling ? 'yearly' : 'monthly'}
                  customerId={stripeCustomerId}
                  referredBy={referralCode}
                  promoCode={promoState.status === 'valid' ? promoCode : null}
                />
              </Elements>

              <div className="mt-5 flex items-start gap-3 bg-stone-100 rounded-xl p-4">
                <Lock size={14} className="text-navy-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-stone-500 leading-relaxed">
                  Your card details are handled directly by Stripe and never touch our servers. Secured with 256-bit encryption.
                </p>
              </div>
            </div>
          )}

        </>)}

        </div>
      </section>

      {/* ── TRUST FOOTER ─────────────────────────────────────── */}
      <section className="py-12 border-t border-stone-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { icon: Lock,   label: 'AES-256 encryption'          },
              { icon: Shield, label: '14-day free trial'            },
              { icon: Users,  label: 'Trusted by families & advisers' },
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
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// INLINE CHECKOUT FORM (step 3)
// ─────────────────────────────────────────────────────────────
function CheckoutForm({ trialDays, plan, billingCycle, customerId, referredBy, promoCode }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    // Confirm the SetupIntent — saves the card to the Stripe customer
    const { setupIntent, error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?checkout=success`,
      },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message)
      setLoading(false)
      return
    }

    // Card confirmed — now create the subscription with the saved payment method
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const paymentMethodId = typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id

      const subRes = await fetch('/api/stripe/create-subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          customerId,
          paymentMethodId,
          plan,
          billingCycle,
          userId:          user?.id,
          trialPeriodDays: trialDays,
          referredBy,
          promoCode,
        }),
      })

      if (!subRes.ok) {
        const { error } = await subRes.json().catch(() => ({}))
        throw new Error(error || 'Could not activate your subscription. Please contact support.')
      }

      window.location.href = '/dashboard?checkout=success'
    } catch (err) {
      setError(err.message)
      setLoading(false)
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
        className="w-full text-white font-semibold text-sm py-3.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ backgroundColor: '#4c7d47' }}
        onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </g>
    </svg>
  )
}
