import React, { useState } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isNative } from '../../lib/platform'

// Native-only sign-up. Deliberately skips the web GetStarted.jsx flow's plan
// picker and Stripe checkout — Apple requires in-app subscription purchases
// to go through IAP, so this just creates the account and hands off to
// IAPPaywall.jsx for the actual purchase. profiles rows are created by the
// handle_new_user DB trigger (see AuthContext.jsx's signUp), no manual insert.

export default function NativeSignUp() {
  const navigate = useNavigate()
  const { user, signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isNative()) return <Navigate to="/get-started" replace />
  if (user) return <Navigate to="/native/paywall" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await signUp({ email, password, fullName })
      navigate('/native/paywall', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.')
      console.error('Native sign up error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-16 pb-12 px-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-light text-navy-950">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-stone-200 rounded-2xl p-6">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-aurora w-full rounded-full py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link to="/login" className="text-navy-700 font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
