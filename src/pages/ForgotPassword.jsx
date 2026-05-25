import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent]             = useState(false)
  const [error, setError]           = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }
      setSent(true)
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div style={{ backgroundColor: '#f8f7f5' }} className="pt-24 min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={24} className="text-sage-600" />
              </div>
              <h1 className="font-display text-2xl font-light text-navy-950 mb-2" style={{ fontFamily: 'Georgia, serif' }}>Check your inbox</h1>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                We've sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors"
              >
                <ArrowLeft size={13} /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="font-display text-2xl font-light text-navy-950 mb-1" style={{ fontFamily: 'Georgia, serif' }}>Forgot your password?</h1>
                <p className="text-stone-500 text-sm">Enter your email address and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-white font-semibold text-sm py-3.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ backgroundColor: '#4c7d47' }} onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
                >
                  {submitting ? <><Loader2 size={15} className="animate-spin" />Sending…</> : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-navy-700 transition-colors"
                >
                  <ArrowLeft size={13} /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
