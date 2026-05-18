import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, CheckCircle2, Gift as GiftIcon, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

const PLAN_NAMES   = { essential: 'Essential', family: 'Family' }
const PLAN_DESCS   = {
  essential: 'For individuals getting their digital life in order.',
  family:    'Two private vaults — one subscription. For couples and families.',
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function RedeemGift() {
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const code              = searchParams.get('code') || ''

  const [validating, setValidating]   = useState(true)
  const [giftInfo, setGiftInfo]       = useState(null)   // { plan, years, gifterName, status }
  const [validateError, setValidateError] = useState(null)

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [showPw, setShowPw]     = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    email:    '',
    password: '',
    country:  'United Kingdom',
  })

  // Validate the code on load
  useEffect(() => {
    if (!code) {
      setValidateError('No gift code found in the URL. Check the link in your gift email.')
      setValidating(false)
      return
    }

    fetch(`/api/gift/validate?code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setValidateError(data.error)
        } else {
          setGiftInfo(data)
          // Pre-fill email if provided in gift
          setForm(v => ({ ...v, email: '' }))
        }
      })
      .catch(() => setValidateError('Could not validate gift code. Please try again.'))
      .finally(() => setValidating(false))
  }, [code])

  const handleChange = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Register account
      const registerRes = await fetch('/api/auth/delegate-register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mode:       'register',
          wantsTrial: false,
          email:      form.email,
          password:   form.password,
          name:       form.fullName,
        }),
      })

      if (!registerRes.ok) {
        const { error: regErr } = await registerRes.json().catch(() => ({}))
        throw new Error(regErr || 'Could not create account. Please try again.')
      }

      const { access_token, refresh_token } = await registerRes.json()
      await supabase.auth.setSession({ access_token, refresh_token })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Session error. Please try again.')

      // 2. Save country to profile
      if (form.country) {
        await supabase.from('profiles').update({ country: form.country }).eq('id', user.id)
      }

      // 3. Redeem gift
      const redeemRes = await fetch('/api/gift/redeem', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          code,
          userId: user.id,
          email:  form.email,
          name:   form.fullName,
        }),
      })

      if (!redeemRes.ok) {
        const { error: redeemErr } = await redeemRes.json().catch(() => ({}))
        throw new Error(redeemErr || 'Could not redeem gift. Please contact support@everstead.care.')
      }

      navigate('/dashboard?gift=redeemed')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid =
    form.fullName.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.password.length >= 8

  const planName   = giftInfo ? (PLAN_NAMES[giftInfo.plan] || giftInfo.plan) : ''
  const yearsLabel = giftInfo ? (giftInfo.years === 1 ? '1 year' : `${giftInfo.years} years`) : ''

  return (
    <>
      <Helmet>
        <title>Claim your Everstead gift | Everstead</title>
        <meta name="description" content="You've received an Everstead plan as a gift. Create your account to claim it." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="bg-stone-50 pt-24 min-h-screen">

        {/* ── HERO ── */}
        <section className="py-16 lg:py-20 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">You've received a gift</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance">
              Claim your Everstead plan.
            </h1>
            <p className="mt-4 text-stone-300 text-base leading-relaxed max-w-md mx-auto">
              Create your account to activate your gift. No credit card needed.
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="max-w-md mx-auto px-6 lg:px-8">

            {/* Loading state */}
            {validating && (
              <div className="text-center py-12">
                <Loader2 size={28} className="animate-spin text-navy-600 mx-auto mb-3" />
                <p className="text-sm text-stone-500">Validating your gift…</p>
              </div>
            )}

            {/* Validation error */}
            {!validating && validateError && (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <h2 className="font-display text-2xl font-light text-navy-950 mb-3">This gift link isn't valid.</h2>
                <p className="text-stone-500 text-sm leading-relaxed mb-6">{validateError}</p>
                <p className="text-sm text-stone-400">
                  Need help?{' '}
                  <a href="mailto:support@everstead.care" className="text-navy-700 font-medium hover:text-navy-900">
                    Contact support
                  </a>
                </p>
              </div>
            )}

            {/* Valid code — show registration form */}
            {!validating && giftInfo && (
              <>
                {/* Gift info card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <GiftIcon size={18} className="text-sage-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">Your gift</p>
                      <p className="font-semibold text-navy-900">
                        Everstead {planName} — {yearsLabel}
                      </p>
                      {giftInfo.gifterName && (
                        <p className="text-xs text-stone-500 mt-1">
                          From <span className="font-medium text-stone-700">{giftInfo.gifterName}</span>
                        </p>
                      )}
                      <p className="text-xs text-stone-400 mt-1">{PLAN_DESCS[giftInfo.plan]}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-sage-700 bg-sage-50 rounded-lg px-3 py-2">
                    <CheckCircle2 size={13} className="text-sage-500 flex-shrink-0" />
                    No credit card required to get started
                  </div>
                </div>

                <h2 className="font-display text-2xl font-light text-navy-950 mb-2">Create your account</h2>
                <p className="text-stone-500 text-sm mb-8">It only takes a minute. Your gift will be activated immediately.</p>

                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-6">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="Full name" required>
                    <input
                      type="text" name="fullName" value={form.fullName} onChange={handleChange}
                      placeholder="Jane Smith" required autoFocus
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Email address" required>
                    <input
                      type="email" name="email" value={form.email} onChange={handleChange}
                      placeholder="jane@example.com" required
                      className={inputClass}
                    />
                  </Field>

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
                  </Field>

                  <Field label="Country" required={false}>
                    <select name="country" value={form.country} onChange={handleChange} className={inputClass}>
                      {[
                        'United Kingdom','United States','France','Germany','Spain','Italy',
                        'Portugal','Netherlands','Belgium','Switzerland','Sweden','Norway',
                        'Denmark','Ireland','Australia','Canada','New Zealand','South Africa',
                        'India','Singapore','UAE','Brazil',
                      ].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>

                  <p className="text-xs text-stone-400 leading-relaxed pt-1">
                    By creating an account you agree to our{' '}
                    <Link to="/terms" className="text-navy-700 underline underline-offset-2" target="_blank">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-navy-700 underline underline-offset-2" target="_blank">Privacy Policy</Link>.
                  </p>

                  <button
                    type="submit"
                    disabled={loading || !isFormValid}
                    className="w-full bg-navy-800 text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={15} className="animate-spin" />Activating your gift…</>
                    ) : (
                      <><GiftIcon size={15} />Claim my gift</>
                    )}
                  </button>
                </form>

                <p className="text-center mt-5 text-xs text-stone-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-navy-700 font-medium hover:text-navy-900">Sign in</Link>
                </p>
              </>
            )}

          </div>
        </section>

      </div>
    </>
  )
}
