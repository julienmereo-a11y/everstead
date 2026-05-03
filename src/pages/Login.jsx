import React, { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

      // Route advisor to their portal
      const userId = sessionData?.user?.id
      let destination = from ?? '/dashboard'
      if (userId && !from) {
        const { data: prof } = await supabase.from('profiles').select('plan').eq('id', userId).single()
        if (prof?.plan === 'advisor') destination = '/advisor-portal'
      }
      navigate(destination, { replace: true })
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

              <div className="mt-6 pt-6 border-t border-stone-100">
                <p className="text-center text-xs text-stone-400 mb-3">Just browsing?</p>
                <div className="flex flex-col gap-2">
                  <Link to="/dashboard?demo=true"
                    className="w-full flex items-center justify-center gap-2 border border-stone-200 rounded-lg py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors">
                    Preview owner dashboard
                  </Link>
                  <Link to="/delegate-dashboard?demo=true"
                    className="w-full flex items-center justify-center gap-2 border border-stone-200 rounded-lg py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors">
                    Preview executor view
                  </Link>
                  <Link to="/advisor-portal?demo=true"
                    className="w-full flex items-center justify-center gap-2 border border-stone-200 rounded-lg py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors">
                    Preview advisor portal
                  </Link>
                </div>
              </div>
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
  )
}
