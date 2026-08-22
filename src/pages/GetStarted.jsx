import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, ArrowRight, Shield, Lock, Users,
  Eye, EyeOff, AlertCircle, Loader2, CheckCheck,
  CreditCard, Zap, Star, X,
} from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import enGetStarted from '../i18n/locales/en/getStarted.json'
import frGetStarted from '../i18n/locales/fr/getStarted.json'
import { useAuth } from '../contexts/AuthContext'
import { PLANS, getStripe } from '../lib/stripe'
import { PRICING } from '../config/pricing'
import { trackEvent } from '../lib/analytics'
import { supabase } from '../lib/supabase'

// Self-registered namespace (page-scoped strings stay in this lazy chunk;
// central src/i18n/index.js keeps only the shared always-loaded namespaces).
i18n.addResourceBundle('en', 'getStarted', enGetStarted)
i18n.addResourceBundle('fr', 'getStarted', frGetStarted)

// Stripe endpoints require the caller's JWT — the server derives the user from it
// (never from a client-supplied userId).
async function stripeAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

// Essential is retired — no longer offered to new signups (existing subscribers keep it).
// Free is the no-card entry tier; Everstead+ (key 'family') keeps its 14-day card trial.
// NON-TEXT META ONLY — all visible copy (name, desc, features, badge) lives in the
// "getStarted" i18n namespace under plans.<id>, merged inside the component below.
const PLAN_OPTIONS = [
  {
    id: 'free',
    isFree: true,
  },
  {
    id: 'family',
    monthly: PRICING.family.monthly.perMonth, yearly: PRICING.family.annual.perMonth,
    badge: true,     // translated badge text comes from plans.family.badge
    highlight: true, // rendered as the dark, featured card (mirrors /pricing)
  },
  // Everstead Pro (advisers) is intentionally NOT a self-serve option — it's sold via
  // demo and presented as its own band below the two consumer cards (mirrors /pricing).
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

// Password strength checker — `label` is an i18n key under passwordStrength.*
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'weak',   color: 'bg-red-400'   }
  if (score <= 3) return { score, label: 'fair',   color: 'bg-amber-400' }
  return              { score, label: 'strong', color: 'bg-emerald-500' }
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function GetStarted() {
  const { t, i18n } = useTranslation('getStarted')
  const { signUp, user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  // Display copy for the plan cards — PLAN_OPTIONS holds the non-text meta,
  // all visible strings come from the "getStarted" namespace (plans.<id>.*).
  const planOptions = PLAN_OPTIONS.map(p => ({
    ...p,
    name:     t(`plans.${p.id}.name`),
    desc:     t(`plans.${p.id}.desc`),
    features: t(`plans.${p.id}.features`, { returnObjects: true }),
    badge:    p.badge ? t(`plans.${p.id}.badge`) : undefined,
  }))

  // Geo access control — 'loading' | 'allowed' | 'soft-warn' | 'blocked-africa' | 'blocked-sanctioned'
  const [geoStatus, setGeoStatus]     = useState('loading')
  const [geoDismissed, setGeoDismissed] = useState(false)

  const [step, setStep]               = useState(1) // 1 = plan, 2 = account, 3 = payment
  const [selectedPlan, setSelectedPlan] = useState('free')
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

  // Promo code from ?promo= URL param (e.g. FOUNDING50 — Everstead+ free for life).
  // Validated against Stripe on mount; threaded into create-subscription.
  // Persisted in sessionStorage so it survives OAuth and ?resume= round-trips
  // that bring the user back to /get-started WITHOUT the query param — otherwise
  // the founding discount would be silently dropped at checkout.
  const urlPromo = (searchParams.get('promo') || '').trim().toUpperCase() || null
  const [promoCode, setPromoCode] = useState(() => {
    if (urlPromo) return urlPromo
    try { return sessionStorage.getItem('everstead_promo') || null } catch { return null }
  })
  useEffect(() => {
    if (!urlPromo) return
    setPromoCode(urlPromo)
    try { sessionStorage.setItem('everstead_promo', urlPromo) } catch {}
  }, [urlPromo])
  const [promoState, setPromoState] = useState({ status: 'idle', label: null, reason: null })
  // The founding offer is a Family-plan offer, so an active promo locks the plan to Family.
  const planLocked = !!promoCode
  // Once the discount is confirmed valid, lead the copy with the lifetime deal
  // (the 14-day trial stays only as a quiet cancel-anytime safety).
  const foundingActive = planLocked && promoState.status === 'valid'

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
        else             setPromoState({ status: 'invalid', label: null, reason: data?.reason || t('promo.fallbackInvalid') })
      })
      .catch(() => { if (!cancelled) setPromoState({ status: 'invalid', label: null, reason: t('promo.fallbackError') }) })
    return () => { cancelled = true }
  }, [promoCode])

  // Adviser invite branding: ?adviser=<firmId> shows the firm's logo + name at signup.
  // Persisted in sessionStorage (like the promo code) so it survives the OAuth round-trip.
  const urlAdviser = searchParams.get('adviser') || null
  const [adviserId, setAdviserId] = useState(() => {
    if (urlAdviser) return urlAdviser
    try { return sessionStorage.getItem('everstead_adviser') || null } catch { return null }
  })
  useEffect(() => {
    if (!urlAdviser) return
    setAdviserId(urlAdviser)
    try { sessionStorage.setItem('everstead_adviser', urlAdviser) } catch { /* ignore */ }
  }, [urlAdviser])
  const [adviserFirm, setAdviserFirm] = useState(null)
  useEffect(() => {
    if (!adviserId) return
    let cancelled = false
    supabase.rpc('get_adviser_public', { firm_id: adviserId }).then(({ data }) => {
      if (cancelled) return
      const f = Array.isArray(data) ? data[0] : data
      if (f?.firm_name) setAdviserFirm(f)
    }, () => {})
    return () => { cancelled = true }
  }, [adviserId])

  // Once their account exists, link them to the inviting firm (server verifies a
  // pending invite matches their email and enforces the firm's family cap).
  useEffect(() => {
    if (!adviserId || !user) return
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/adviser/claim-client-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (data?.linked) { try { sessionStorage.removeItem('everstead_adviser') } catch { /* ignore */ } }
      } catch { /* non-blocking */ }
    })()
  }, [adviserId, user]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Resume checkout — handles ?resume=true (dashboard gate), the Google OAuth
  // callback flag, AND any signed-in user landing here without them. That last case
  // is a mid-signup page reload (very common on mobile: switching to a password
  // manager or email app can discard the tab) — the account already exists, so
  // without resuming they'd be dumped at step 1 and re-registering would fail with
  // "already registered". Logged-out visitors are unaffected (no session → normal flow).
  useEffect(() => {
    const isOAuth = localStorage.getItem('everstead_oauth_pending') === 'true'
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      // Clear the OAuth flag only AFTER the session is confirmed — otherwise a
      // null session on the first post-redirect run would consume the flag and
      // strand the Google user on step 1 with no retry.
      if (isOAuth) localStorage.removeItem('everstead_oauth_pending')

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, stripe_subscription_id, subscription_status, legacy_trial_access, full_name, email, plan, billing_cycle, country')
        .eq('id', session.user.id)
        .single()

      if (!profile) return

      // Already has real access — nothing to resume. Go straight to the dashboard
      // rather than recreating a SetupIntent and showing the card step again.
      // This MUST mirror ProtectedRoute's access test exactly: bare 'trialing' is
      // NOT access (every new account is stamped 'trialing' with no card), so a
      // genuine trial is proven only by a stripe_subscription_id. Otherwise this
      // would send a no-card user to /dashboard, which ProtectedRoute immediately
      // bounces back here — an infinite redirect loop.
      if (
        profile.stripe_subscription_id ||
        profile.legacy_trial_access === true ||
        ['active', 'cancelling', 'past_due'].includes(profile.subscription_status)
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
      const resumePlan = planLocked
        ? 'family'                                              // founding offer is Family-only
        : (urlPlan && PLAN_OPTIONS.find(p => p.id === urlPlan))
          ? urlPlan
          : (oauthPlan?.plan || profile.plan || 'free')
      const resumeBilling = profile.billing_cycle
        ? profile.billing_cycle === 'yearly'
        : (oauthPlan?.billing ?? true)
      setSelectedPlan(resumePlan)
      setAnnualBilling(resumeBilling)

      // Free tier has no checkout — a free user resumed here belongs on the dashboard,
      // never at the card step (this path must not create a Stripe customer for them).
      if (resumePlan === 'free') { navigate('/dashboard'); return }

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
        headers: await stripeAuthHeaders(),
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

  // Anchor the flow to the top on every step change. The resume effect can
  // auto-advance step 1 → 3 while the founding promo + geo checks are still
  // resolving (each of which reflows the page); without this the user is left
  // stranded mid-page and the layout appears to "jump" under them. A wizard
  // should always start each step at the top anyway.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Pre-select plan from URL params (e.g. from Pricing page CTA).
  // A founding-offer promo link locks the plan to Family, overriding ?plan=.
  useEffect(() => {
    const plan    = searchParams.get('plan')
    const billing = searchParams.get('billing')
    if (planLocked) {
      // Founding offer is Family YEARLY only — lock both, ignore any ?plan/?billing.
      setSelectedPlan('family')
      setAnnualBilling(true)
    } else if (plan && PLAN_OPTIONS.find(p => p.id === plan)) {
      setSelectedPlan(plan)
      setStep(2)
    }
    if (!planLocked && billing === 'monthly') setAnnualBilling(false)
    if (!planLocked && billing === 'yearly')  setAnnualBilling(true)
  }, [searchParams, planLocked])

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
        throw new Error(t('errors.restrictedCountry'))
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t('errors.sessionExpired'))

      await supabase.from('profiles').upsert(
        // OAuth signups skip the register endpoint, so the language preference
        // is captured here instead of via the signup trigger.
        { id: session.user.id, country: form.country || null, language: i18n.language === 'fr' ? 'fr' : 'en' },
        { onConflict: 'id', ignoreDuplicates: false }
      )

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, full_name, email, plan, billing_cycle')
        .eq('id', session.user.id)
        .single()

      const intentRes = await fetch('/api/stripe/setup-intent', {
        method:  'POST',
        headers: await stripeAuthHeaders(),
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
        throw new Error(error || t('errors.paymentSetup'))
      }
      const { clientSecret: secret, customerId } = await intentRes.json()
      setClientSecret(secret)
      setStripeCustomerId(customerId)
      setIsOAuthProfile(false)
      setStep(3)
    } catch (err) {
      setError(err.message ?? t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  // ── SUBMIT: create account → create Stripe subscription → show inline card form ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    trackEvent('signup_started', { plan: selectedPlan })

    try {
      // 0. Sanctions check — block restricted countries before any registration
      if (RESTRICTED_COUNTRIES.has(form.country)) {
        throw new Error(t('errors.restrictedCountry'))
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
          language:   i18n.language === 'fr' ? 'fr' : 'en',
        }),
      })

      if (!registerRes.ok) {
        const { error } = await registerRes.json().catch(() => ({}))
        throw new Error(error || t('errors.accountCreate'))
      }

      const { access_token, refresh_token } = await registerRes.json()
      await supabase.auth.setSession({ access_token, refresh_token })
      trackEvent('signup_completed', { plan: selectedPlan })

      const { data: { user } } = await supabase.auth.getUser()

      // 1b. Save country to profile (trigger only creates basic row).
      // Use upsert so this works even if the trigger row isn't written yet.
      if (user?.id) {
        await supabase.from('profiles').upsert(
          { id: user.id, country: form.country || null },
          { onConflict: 'id', ignoreDuplicates: false }
        )
      }

      // 1c. FREE TIER — no card, no Stripe. The account was created server-side with
      // plan='free' (delegate-register sets it); go straight into the product. A full
      // reload lets AuthContext pick up the new session + free profile before the gate runs.
      if (selectedPlan === 'free') {
        window.location.href = '/dashboard'
        return
      }

      // 2. Create Stripe customer + subscription with trial → get client secret
      //    for the inline PaymentElement (no redirect to Stripe)
      const intentRes = await fetch('/api/stripe/setup-intent', {
        method:  'POST',
        headers: await stripeAuthHeaders(),
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
        throw new Error(error || t('errors.paymentSetup'))
      }

      const { clientSecret: secret, customerId } = await intentRes.json()
      setClientSecret(secret)
      setStripeCustomerId(customerId)
      trackEvent('checkout_started', { plan: selectedPlan, billing: annualBilling ? 'yearly' : 'monthly' })
      setStep(3)
    } catch (err) {
      setError(err.message ?? t('errors.generic'))
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="description" content={t('meta.description')} />
      <link rel="canonical" href="https://www.everstead.care/get-started" />
      <meta property="og:title" content={t('meta.ogTitle')} />
      <meta property="og:description" content={t('meta.ogDescription')} />
      <meta property="og:url" content="https://www.everstead.care/get-started" />
    </Helmet>
    <HreflangLinks path="/get-started" />
    <div className="bg-stone-50 pt-24 min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          {adviserFirm && (
            <div className="mb-6 inline-flex flex-col items-center gap-2">
              {adviserFirm.logo_url && (
                <span className="inline-flex items-center bg-white rounded-lg px-3 py-2 shadow-sm">
                  <img src={adviserFirm.logo_url} alt={adviserFirm.firm_name} className="h-8 w-auto max-w-[180px] object-contain" />
                </span>
              )}
              <p className="text-sm text-stone-300">
                {t('hero.invitedBy')}{' '}<span className="font-semibold text-white">{adviserFirm.firm_name}</span>{' '}{t('hero.poweredBy')}
              </p>
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('hero.eyebrow')}</p>
          <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance">
            {t('hero.title')}
          </h1>
          <p className="mt-4 text-stone-300 text-base leading-relaxed max-w-md mx-auto">
            {foundingActive
              ? <><span className="text-sage-300 font-semibold">{t('hero.subtitleFoundingLead')}</span>{' '}{t('hero.subtitleFoundingBody')}</>
              : referralCode
              ? <><span className="text-sage-300 font-semibold">{t('hero.subtitleReferralLead')}</span>{' '}{t('hero.subtitleReferralBody')}</>
              : selectedPlan === 'free'
              ? <><span className="text-sage-300 font-semibold">{t('hero.subtitleFreeLead')}</span>{' '}{t('hero.subtitleFreeBody')}</>
              : t('hero.subtitleDefault', { days: trialDays })
            }
          </p>

          {/* Promo banner — only when ?promo= is present. The slot reserves a fixed
              height so the checking → valid/invalid transition doesn't change the
              hero's height and shove the plan grid below it (the founding "jump"). */}
          {promoCode && (
            <div className="mt-6 min-h-[44px] flex items-center justify-center">
              {promoState.status === 'valid' && (
                <div className="inline-flex items-center gap-2 rounded-full bg-sage-500/15 border border-sage-400/30 px-5 py-2.5 text-sm">
                  <span aria-hidden="true">🎉</span>
                  <span className="text-sage-200 font-semibold">{t('promo.applied', { label: promoState.label.toLowerCase() })}</span>
                  <span className="text-stone-400 hidden sm:inline">{t('promo.code', { code: promoCode })}</span>
                </div>
              )}
              {promoState.status === 'invalid' && (
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-400/30 px-5 py-2.5 text-sm">
                  <span className="text-amber-200">{t('promo.invalid', { code: promoCode, reason: promoState.reason.toLowerCase() })}</span>
                </div>
              )}
              {promoState.status === 'checking' && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-5 py-2.5 text-sm">
                  <span className="text-stone-400">{t('promo.checking')}</span>
                </div>
              )}
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
              <p className="text-stone-400 text-sm">{t('geo.loading')}</p>
            </div>
          )}

          {/* Tier 1 — Sanctioned country */}
          {geoStatus === 'blocked-sanctioned' && (
            <div className="max-w-md mx-auto text-center py-20">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
                <Shield size={22} className="text-red-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                {t('geo.sanctionedTitle')}
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                {t('geo.sanctionedBody')}
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
                {t('geo.blockedTitle')}
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                {t('geo.blockedBody')}
              </p>
            </div>
          )}

          {/* Tier 3 — Soft warning, dismissible */}
          {geoStatus === 'soft-warn' && !geoDismissed && (
            <div className="mb-8 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <div className="flex-1 text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">{t('geo.softWarnLead')}</span>{' '}
                {t('geo.softWarnBody')}
              </div>
              <button
                onClick={() => setGeoDismissed(true)}
                aria-label={t('geo.dismiss')}
                className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0 mt-0.5"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Form — hidden while loading or hard-blocked */}
          {(geoStatus === 'allowed' || geoStatus === 'soft-warn') && (<>

          {/* Billing toggle — visible only on step 1. Founding offer is Family Yearly only,
              so it's locked (no monthly option). */}
          {step === 1 && (
            <div className="flex justify-center mb-8">
              {planLocked ? (
                <div className="inline-flex items-center gap-2 bg-white border border-stone-200 rounded-full px-5 py-2 shadow-sm text-sm">
                  <Lock size={13} className="text-stone-400" />
                  <span className="font-medium text-navy-800">{t('billing.billedAnnuallyLocked')}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-full p-1 shadow-sm">
                  <button
                    onClick={() => setAnnualBilling(false)}
                    className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${!annualBilling ? 'bg-navy-800 text-white' : 'text-stone-500 hover:text-navy-800'}`}
                  >
                    {t('billing.monthly')}
                  </button>
                  <button
                    onClick={() => setAnnualBilling(true)}
                    className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${annualBilling ? 'bg-navy-800 text-white' : 'text-stone-500 hover:text-navy-800'}`}
                  >
                    {t('billing.yearly')}{' '}
                    {annualBilling
                      ? <span className="text-sage-300 font-semibold ml-1">{t('billing.savingActive')}</span>
                      : <span className="text-sage-500 font-semibold ml-1">{t('billing.save')}</span>
                    }
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step indicator */}
          {step <= 3 && (
            <div className="flex items-center justify-center gap-3 mb-14">
              {[
                { n: 1, label: t('stepIndicator.choosePlan') },
                { n: 2, label: isOAuthProfile ? t('stepIndicator.yourDetails') : t('stepIndicator.createAccount') },
                { n: 3, label: t('stepIndicator.payment') },
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
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-4">
                {planLocked ? t('step1.titleFounding') : t('step1.title')}
              </h2>
              {planLocked && (
                <p className="text-center text-stone-500 text-sm mb-8 max-w-md mx-auto">
                  {t('step1.foundingNotePrefix')} <span className="font-semibold text-navy-800">Everstead+</span> {t('step1.foundingNoteSuffix')}
                </p>
              )}
              <div className="grid md:grid-cols-2 gap-5 mb-8 max-w-2xl mx-auto">
                {planOptions.map(plan => {
                  const locked = planLocked && plan.id !== 'family'
                  return (
                  <button
                    key={plan.id}
                    disabled={locked}
                    onClick={() => { if (locked) return; setSelectedPlan(plan.id) }}
                    className={`relative text-left rounded-[2rem] border p-7 flex flex-col transition-all ${
                      plan.highlight
                        ? 'border-navy-300 bg-navy-950 text-white shadow-xl shadow-navy-950/10'
                        : 'border-stone-200 bg-white text-navy-950 hover:border-navy-300'
                    } ${
                      selectedPlan === plan.id
                        ? (plan.highlight ? 'ring-2 ring-sage-400' : 'ring-2 ring-navy-300')
                        : ''
                    } ${locked ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                    {/* selection indicator */}
                    <div className={`absolute top-6 right-6 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      selectedPlan === plan.id
                        ? (plan.highlight ? 'border-sage-300 bg-sage-300' : 'border-navy-700 bg-navy-700')
                        : (plan.highlight ? 'border-white/30' : 'border-stone-300')
                    }`}>
                      {selectedPlan === plan.id && <div className={`w-2 h-2 rounded-full ${plan.highlight ? 'bg-navy-950' : 'bg-white'}`} />}
                    </div>

                    {(plan.badge || plan.promo) && (
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        {plan.badge && (
                          <span className="inline-flex items-center gap-1 bg-sage-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                            <Star size={10} />{plan.badge}
                          </span>
                        )}
                        {plan.promo && (
                          <span className="inline-block bg-amber-400 text-amber-950 text-xs font-semibold px-3 py-1 rounded-full">
                            {t('plans.launchOffer')}
                          </span>
                        )}
                      </div>
                    )}

                    <p className={`text-sm font-semibold ${plan.highlight ? 'text-sage-300' : 'text-navy-700'}`}>{plan.name}</p>
                    <p className={`mt-2 text-sm leading-relaxed pr-6 ${plan.highlight ? 'text-stone-300' : 'text-stone-600'}`}>{plan.desc}</p>

                    <div className="mt-6">
                      {plan.isFree ? (
                        <>
                          <div className="flex items-end gap-2">
                            <span className="font-display text-4xl font-light">{t('plans.freePrice')}</span>
                            <span className={`pb-1.5 text-sm ${plan.highlight ? 'text-stone-400' : 'text-stone-500'}`}>{t('plans.forever')}</span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-stone-400">{t('plans.noCard')}</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-end gap-2">
                            <span className="font-display text-4xl font-light">£{annualBilling ? plan.yearly : plan.monthly}</span>
                            <span className={`pb-1.5 text-sm ${plan.highlight ? 'text-stone-400' : 'text-stone-500'}`}>{t('plans.perMonth')}</span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-stone-400">
                            {annualBilling
                              ? t('plans.billedAnnuallyDetail', { price: PRICING.family.annual.perYear.toFixed(2) })
                              : t('plans.billedMonthly')}
                          </p>
                        </>
                      )}
                    </div>

                    <ul className="mt-6 space-y-2.5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed">
                          <CheckCircle2 size={15} className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-sage-300' : 'text-sage-600'}`} />
                          <span className={plan.highlight ? 'text-stone-200' : 'text-stone-600'}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                  )
                })}
              </div>

              {/* Continue with the selected consumer plan — primary action, so it sits
                  directly under the two cards, above the Everstead Pro band. */}
              <div className="text-center mt-6">
                <button
                  onClick={() => {
                    trackEvent('plan_selected', { plan: selectedPlan, billing: annualBilling ? 'yearly' : 'monthly' })
                    setStep(clientSecret ? 3 : 2)
                  }}
                  className="btn-aurora inline-flex items-center gap-2 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-transform hover:-translate-y-0.5"
                >
                  {clientSecret
                    ? t('step1.backToPayment', { plan: planOptions.find(p => p.id === selectedPlan)?.name })
                    : t('step1.continueWith', { plan: planOptions.find(p => p.id === selectedPlan)?.name })}
                  <ArrowRight size={16} />
                </button>
                <p className="mt-3 text-xs text-stone-400">
                  {selectedPlan === 'free'
                    ? t('step1.microFree')
                    : foundingActive
                    ? t('step1.microFounding')
                    : t('step1.microTrial', { days: trialDays })}
                </p>
              </div>

              {/* Everstead Pro — advisers: a separate sales motion, shown as its own band
                  below the consumer cards + primary CTA (mirrors /pricing), never a
                  selectable self-serve option. */}
              <div className="max-w-2xl mx-auto mt-12">
                <div className="rounded-2xl border border-navy-200 bg-navy-950 text-white p-6 sm:flex sm:items-center sm:justify-between gap-6">
                  <div className="sm:max-w-sm">
                    <p className="text-sm font-semibold text-sage-300">Everstead Pro</p>
                    <p className="mt-1.5 text-stone-300 text-xs leading-relaxed">
                      {t('step1.pro.desc')}
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3 shrink-0">
                    <Link to="/for-advisers" className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold border border-white/25 text-white hover:bg-white/10 transition-colors">
                      {t('step1.pro.learnMore')}
                    </Link>
                    <Link to="/book-demo" className="btn-aurora inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
                      {t('step1.pro.bookDemo')} <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2a: OAuth profile completion (Google users only) ─ */}
          {step === 2 && isOAuthProfile && (
            <div className="max-w-md mx-auto">
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">{t('oauth.title')}</h2>
              <p className="text-center text-stone-500 text-sm mb-10">
                {foundingActive ? t('oauth.subtitleFounding') : t('oauth.subtitleTrial')}
              </p>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-6">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleOAuthProfileSubmit} className="space-y-4">

                {/* Country of residence */}
                <Field label={t('fields.country')} required>
                  <select name="country" value={form.country} onChange={handleChange} required autoFocus className={inputClass}>
                    <option value="">{t('fields.selectCountry')}</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>

                {/* Terms */}
                <p className="text-xs text-stone-400 leading-relaxed pt-1">
                  {t('oauth.termsPrefix')}{' '}
                  <Link to="/terms" className="text-navy-700 underline underline-offset-2" target="_blank">{t('terms.termsOfService')}</Link>
                  {' '}{t('terms.and')}{' '}
                  <Link to="/privacy" className="text-navy-700 underline underline-offset-2" target="_blank">{t('terms.privacyPolicy')}</Link>.
                </p>

                <button
                  type="submit"
                  disabled={loading || !form.country}
                  className="w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#4c7d47' }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" />{t('oauth.settingUp')}</>
                  ) : (
                    <><CreditCard size={15} />{t('oauth.continueToPayment')}</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2b: Email account creation ───────────────────── */}
          {step === 2 && !isOAuthProfile && (
            <div className="max-w-md mx-auto">
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">{t('step2.title')}</h2>
              <p className="text-center text-stone-500 text-sm mb-10">
                {t('step2.startingWith')}{' '}
                <button
                  onClick={() => setStep(1)}
                  className="text-navy-700 underline underline-offset-2 font-medium hover:text-navy-900"
                >
                  {t('plans.planWithName', { plan: planOptions.find(p => p.id === selectedPlan)?.name })}
                </button>
                {' '}· {annualBilling ? t('step2.yearlyBilling') : t('step2.monthlyBilling')}
              </p>

              {/* Google sign-up */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-3 border border-stone-300 bg-white text-navy-900 font-medium text-sm py-3 rounded-full hover:bg-stone-50 transition-colors mb-5"
              >
                <GoogleIcon />
                {t('step2.googleButton')}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400">{t('step2.divider')}</span>
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
                <Field label={t('fields.fullName')} required>
                  <input
                    type="text" name="fullName" value={form.fullName} onChange={handleChange}
                    placeholder={t('fields.fullNamePlaceholder')} required autoFocus
                    className={inputClass}
                  />
                </Field>

                {/* Email */}
                <Field label={t('fields.email')} required>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder={t('fields.emailPlaceholder')} required
                    className={inputClass}
                  />
                </Field>

                {/* Password */}
                <Field label={t('fields.password')} required>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                      placeholder={t('fields.passwordPlaceholder')} required minLength={8}
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button" onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? t('fields.hidePassword') : t('fields.showPassword')}
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
                      }`}>{t(`passwordStrength.${passwordStrength.label}`)}</p>
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
                      <span className="text-xs text-stone-400 font-medium">{t('fields.oneMoreDetail')}</span>
                      <div className="flex-1 h-px bg-stone-200" />
                    </div>

                    {/* Country of residence */}
                    <Field label={t('fields.country')} required>
                      <select name="country" value={form.country} onChange={handleChange} required={basicFieldsValid} className={inputClass}>
                        <option value="">{t('fields.selectCountry')}</option>
                        {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Terms */}
                <p className="text-xs text-stone-400 leading-relaxed pt-1">
                  {t('step2.termsPrefix')}{' '}
                  <Link to="/terms" className="text-navy-700 underline underline-offset-2" target="_blank">{t('terms.termsOfService')}</Link>
                  {' '}{t('terms.and')}{' '}
                  <Link to="/privacy" className="text-navy-700 underline underline-offset-2" target="_blank">{t('terms.privacyPolicy')}</Link>.
                </p>

                <button
                  type="submit"
                  disabled={loading || !basicFieldsValid}
                  className="w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#4c7d47' }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" />{t('step2.creating')}</>
                  ) : selectedPlan === 'free' ? (
                    <><CheckCircle2 size={15} />{t('step2.createFree')}</>
                  ) : (
                    <><CreditCard size={15} />{foundingActive ? t('step2.claimFounding') : t('step2.startTrial')}</>
                  )}
                </button>
              </form>

              {/* Trust note */}
              <div className="mt-5 flex items-start gap-3 bg-stone-100 rounded-xl p-4">
                <Lock size={14} className="text-navy-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-stone-500 leading-relaxed">
                  {selectedPlan === 'free'
                    ? t('step2.trustFree')
                    : foundingActive
                    ? t('step2.trustFounding')
                    : t('step2.trustTrial', { days: trialDays })}
                </p>
              </div>

              <p className="text-center mt-5 text-xs text-stone-400">
                {t('step2.haveAccount')}{' '}
                <Link to="/login" className="text-navy-700 font-medium hover:text-navy-900">{t('step2.signIn')}</Link>
              </p>
              <p className="text-center mt-3 text-xs text-stone-400">
                {t('step2.exportNote')}{' '}
                <Link to="/data-promise" className="text-navy-600 hover:text-navy-800">{t('step2.dataPromise')}</Link>
              </p>
            </div>
          )}

          {/* ── STEP 3: Inline payment ─────────────────────── */}
          {step === 3 && clientSecret && (
            <div className="max-w-md mx-auto">
              <h2 className="font-display text-3xl font-light text-navy-950 text-center mb-2">{t('step3.title')}</h2>
              <p className="text-center text-stone-500 text-sm mb-3">
                {foundingActive
                  ? t('step3.subtitleFounding')
                  : t('step3.subtitleTrial', { days: trialDays })}
              </p>
              <p className={`text-center text-sm text-stone-600 ${promoCode && promoState.status === 'valid' ? 'mb-3' : 'mb-8'}`}>
                {t('plans.planWithName', { plan: planOptions.find(p => p.id === selectedPlan)?.name })} · {annualBilling ? t('step3.billedAnnually') : t('step3.billedMonthly')}
                {' · '}
                <button
                  onClick={() => setStep(1)}
                  className="text-navy-700 underline underline-offset-2 font-medium hover:text-navy-900"
                >
                  {t('step3.changePlan')}
                </button>
              </p>
              {promoCode && promoState.status === 'valid' && (
                <div className="mb-8 mx-auto max-w-sm flex items-center justify-center gap-2 rounded-xl bg-sage-50 border border-sage-200 px-4 py-2.5 text-sm">
                  <span aria-hidden="true">🎉</span>
                  <span className="text-sage-700 font-semibold">{promoState.label}</span>
                  <span className="text-stone-400">{t('promo.appliedAtCheckout')}</span>
                </div>
              )}

              {!annualBilling && (() => {
                const plan = PLAN_OPTIONS.find(p => p.id === selectedPlan)
                const saving = plan ? Math.round((plan.monthly - plan.yearly) * 12) : 0
                return (
                  <div className="mb-5 flex items-center justify-between bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-sage-700">
                      {t('step3.switchSave')} <strong>{t('step3.switchSaveAmount', { amount: saving })}</strong>
                    </p>
                    <button
                      onClick={() => setAnnualBilling(true)}
                      className="text-xs font-semibold text-sage-700 hover:text-sage-900 underline underline-offset-2 ml-3 whitespace-nowrap"
                    >
                      {t('step3.switchCta')}
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
                  {t('step3.stripeNote')}
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
              { icon: Lock,   label: t('trustFooter.encryption') },
              { icon: Shield, label: foundingActive ? t('trustFooter.firstYearFree') : t('trustFooter.trial', { days: trialDays }) },
              { icon: Users,  label: t('trustFooter.trustedBy') },
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
  const { t } = useTranslation('getStarted')
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
        headers: await stripeAuthHeaders(),
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
        throw new Error(error || t('errors.subscriptionActivate'))
      }

      try { sessionStorage.removeItem('everstead_promo') } catch {}
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
        className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" />{t('checkout.processing')}</>
        ) : (
          <><CreditCard size={15} />{promoCode ? t('checkout.claimFreeYear') : t('checkout.startTrial', { days: trialDays })}</>
        )}
      </button>

      <p className="text-center text-xs text-stone-400">
        {promoCode
          ? t('checkout.finePrintFounding')
          : t('checkout.finePrintTrial', { days: trialDays })}
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
