import React, { useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from     = location.state?.from?.pathname ?? null

  // step 1: email + password  →  step 2: 6-digit code
  const [step, setStep]         = useState(1)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [digits, setDigits]     = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const digitRefs               = useRef([])

  const code = digits.join('')

  // ── Digit input helpers ──────────────────────────────────────
  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) digitRefs.current[i + 1]?.focus()
  }

  const handleDigitKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus()
    }
  }

  const handleDigitPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...digits]
    text.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    digitRefs.current[Math.min(text.length, 5)]?.focus()
  }

  // ── Google sign-in ───────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  // ── Step 1: verify password + send code ─────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/mfa-send-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify code + sign in ───────────────────────────
  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/mfa-verify-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')

      // Apply the verified session client-side
      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
      })
      if (sessionErr) throw sessionErr

      // If user was redirected here from a protected page, honour that destination
      if (from) { navigate(from, { replace: true }); return }

      const userId    = sessionData?.user?.id
      const userEmail = sessionData?.user?.email

      const [{ data: prof }, { data: delegateRows }] = await Promise.all([
        supabase.from('profiles').select('plan, role, subscription_status').eq('id', userId).single(),
        supabase.from('trusted_people').select('id, invite_token').eq('email', userEmail).eq('invite_status', 'accepted'),
      ])

      if (prof?.plan === 'advisor') { navigate('/advisor-portal', { replace: true }); return }

      const isOwner    = prof?.role !== 'delegate'
      const isDelegate = !!delegateRows?.length
      const isDualRole = isOwner && isDelegate

      if (isDualRole) {
        navigate('/choose-account', { replace: true })
      } else if (isDelegate && !isOwner) {
        navigate(`/delegate-dashboard?token=${delegateRows[0].invite_token}`, { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Left panel (shared) ──────────────────────────────────────
  const LeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 bg-navy-950 relative overflow-hidden flex-col justify-between p-12">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.04) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <Link to="/" className="relative">
        <img src="/logo-v2-white.png" alt="Everstead" className="h-10 w-auto" />
      </Link>
      <div className="relative">
        <blockquote className="text-2xl font-display font-light text-white leading-relaxed text-balance mb-6">
          "My father passed suddenly. Everstead made an incredibly painful time so much more manageable."
        </blockquote>
        <div>
          <p className="text-white font-medium text-sm">Margaret T.</p>
          <p className="text-stone-400 text-xs">Daughter & executor</p>
        </div>
      </div>
      <div className="relative grid grid-cols-3 gap-4">
        {[
          { value: '14 days', label: 'Free trial' },
          { value: 'AES-256', label: 'Encrypted' },
          { value: '24/7',    label: 'Access' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="font-display text-2xl font-light text-white">{value}</p>
            <p className="text-xs text-stone-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
    <Helmet>
      <title>Sign In — Everstead</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="min-h-screen bg-stone-50 flex">
      <LeftPanel />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden mb-10">
            <img src="/everstead-logo-dark.png" alt="Everstead" className="h-9 w-auto" />
          </Link>

          {/* ── STEP 1: Email + Password ── */}
          {step === 1 && (
            <>
              <h1 className="font-display text-3xl font-light text-navy-950 mb-1">Welcome back</h1>
              <p className="text-stone-500 text-sm mb-8">Sign in to your account</p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 border border-stone-200 bg-white text-navy-900 font-medium text-sm py-3 rounded-lg hover:bg-stone-50 transition-colors mb-5"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400">or sign in with email</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" autoComplete="email"
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-stone-600">Password</label>
                    <Link to="/forgot-password" className="text-xs text-navy-600 hover:text-navy-900 transition-colors">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" autoComplete="current-password"
                      className="w-full pl-9 pr-10 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-700">{error}</div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-navy-800 text-white font-semibold text-sm py-3 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Verifying…' : 'Continue'}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>

              <p className="text-center text-xs text-stone-400 mt-6">
                Don't have an account?{' '}
                <Link to="/get-started" className="text-navy-700 font-medium hover:text-navy-900 transition-colors">
                  Get started free
                </Link>
              </p>

              {/* Preview dashboard — hidden for launch, keep for future use */}
            </>
          )}

          {/* ── STEP 2: 6-digit code ── */}
          {step === 2 && (
            <>
              <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center mb-6">
                <ShieldCheck size={22} className="text-navy-700" />
              </div>
              <h1 className="font-display text-3xl font-light text-navy-950 mb-1">Check your email</h1>
              <p className="text-stone-500 text-sm mb-1">We sent a 6-digit code to</p>
              <p className="text-navy-800 font-medium text-sm mb-8">{email}</p>

              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div>
                  <div className="flex gap-2 justify-between" onPaste={handleDigitPaste}>
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => digitRefs.current[i] = el}
                        type="text" inputMode="numeric" maxLength={1}
                        value={d}
                        onChange={e => handleDigit(i, e.target.value)}
                        onKeyDown={e => handleDigitKey(i, e)}
                        autoFocus={i === 0}
                        className="w-12 h-14 text-center text-2xl font-semibold text-navy-900 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors bg-white"
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-700">{error}</div>
                )}

                <button type="submit" disabled={loading || code.length < 6}
                  className="w-full bg-navy-800 text-white font-semibold text-sm py-3 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Verifying…' : 'Sign in'}
                  {!loading && <ArrowRight size={16} />}
                </button>

                <p className="text-center text-xs text-stone-400">
                  Wrong email?{' '}
                  <button type="button" onClick={() => { setStep(1); setDigits(['','','','','','']); setError(null) }}
                    className="text-navy-700 font-medium hover:text-navy-900 transition-colors">
                    Go back
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
