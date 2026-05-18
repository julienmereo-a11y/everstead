import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Eye, EyeOff, CheckCircle2, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-400'    }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-amber-400'  }
  return              { score, label: 'Strong', color: 'bg-emerald-500' }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState(null)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase sends the user back with an access token in the URL hash.
  // onAuthStateChange fires with event PASSWORD_RECOVERY once it's processed.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })
    // Also check if there's already an active session from the link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const strength = getPasswordStrength(password)
  const mismatch = confirm.length > 0 && password !== confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setError(null)
    setSubmitting(true)
    try {
      const { error: supaError } = await supabase.auth.updateUser({ password })
      if (supaError) throw supaError
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 3000)
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div className="bg-stone-50 pt-24 min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-xl bg-sage-500 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-display text-xl font-semibold text-navy-900">Everstead</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={24} className="text-sage-600" />
              </div>
              <h1 className="font-display text-2xl font-light text-navy-950 mb-2">Password updated</h1>
              <p className="text-stone-500 text-sm leading-relaxed">
                Your new password has been set. Redirecting you to the dashboard…
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center py-8">
              <Loader2 size={24} className="animate-spin text-navy-400 mx-auto mb-4" />
              <p className="text-stone-500 text-sm">Verifying your reset link…</p>
              <p className="text-stone-400 text-xs mt-2">
                If nothing happens,{' '}
                <Link to="/forgot-password" className="text-navy-600 hover:text-navy-900 underline">
                  request a new link
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="font-display text-2xl font-light text-navy-950 mb-1">Set a new password</h1>
                <p className="text-stone-500 text-sm">Choose a strong password for your Everstead account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="w-full border border-stone-300 rounded-lg px-4 py-3 pr-10 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${strength.color}`}
                          style={{ width: `${(strength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-400 w-12">{strength.label}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">Confirm password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className={`w-full border rounded-lg px-4 py-3 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition ${mismatch ? 'border-red-300 focus:ring-red-300' : 'border-stone-300'}`}
                  />
                  {mismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>}
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || mismatch || password.length < 8}
                  className="w-full bg-navy-800 text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 size={15} className="animate-spin" />Updating…</> : 'Set new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
