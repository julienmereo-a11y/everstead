import React, { useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()

  const [step, setStep]         = useState(1)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [digits, setDigits]     = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const digitRefs               = useRef([])

  const code = digits.join('')

  // ── Digit helpers ──────────────────────────────────────────
  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) digitRefs.current[i + 1]?.focus()
  }

  const handleDigitKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) digitRefs.current[i - 1]?.focus()
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

  // ── Step 1: send MFA code ──────────────────────────────────
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
      if (!res.ok) throw new Error(data.error || 'Invalid credentials.')
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify code → confirm admin role ───────────────
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
      if (!res.ok) throw new Error(data.error || 'Invalid code.')

      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
      })
      if (sessionErr) throw sessionErr

      const userId = sessionData?.user?.id
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (prof?.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Access denied — this account does not have admin privileges.')
      }

      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-stone-700 bg-navy-900 text-white placeholder-stone-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-500 transition-colors'

  return (
    <>
      <Helmet>
        <title>Admin — Everstead</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Logo + label */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-800 border border-navy-700 mb-4">
              <Shield size={24} className="text-sage-400" />
            </div>
            <h1 className="font-display text-2xl font-light text-white">Admin access</h1>
            <p className="text-stone-500 text-sm mt-1">Everstead internal panel</p>
          </div>

          {/* Card */}
          <div className="bg-navy-900 border border-navy-700 rounded-3xl p-8 space-y-5">

            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/60 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* ── Step 1: credentials ── */}
            {step === 1 && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@everstead.care"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sage-600 hover:bg-sage-500 text-white font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? 'Checking…' : 'Continue'}
                </button>
              </form>
            )}

            {/* ── Step 2: MFA code ── */}
            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-stone-300 leading-relaxed">
                    A verification code was sent to <span className="text-white font-medium">{email}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-3 text-center">Enter 6-digit code</label>
                  <div className="flex gap-2 justify-center">
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => digitRefs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        autoFocus={i === 0}
                        onChange={e => handleDigit(i, e.target.value)}
                        onKeyDown={e => handleDigitKey(i, e)}
                        onPaste={i === 0 ? handleDigitPaste : undefined}
                        className="w-10 h-12 text-center text-lg font-semibold border border-stone-700 bg-navy-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-500 transition-colors"
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full bg-sage-600 hover:bg-sage-500 text-white font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading ? 'Verifying…' : 'Sign in to admin panel'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep(1); setDigits(['','','','','','']); setError(null) }}
                  className="w-full text-xs text-stone-500 hover:text-stone-300 transition-colors py-1"
                >
                  ← Back
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-stone-600 mt-6">
            This page is for Everstead internal use only.
          </p>
        </div>
      </div>
    </>
  )
}
