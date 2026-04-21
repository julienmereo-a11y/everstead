import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, signInWithMagicLink } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname ?? '/dashboard'

  const [mode, setMode]         = useState('password') // 'password' | 'magic'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [sent, setSent]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'magic') {
        await signInWithMagicLink(email)
        setSent(true)
      } else {
        await signIn({ email, password })
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-950 relative overflow-hidden flex-col justify-between p-12">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.04) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sage-500 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-display text-xl font-semibold text-white">Everstead</span>
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-10">
            <div className="w-7 h-7 rounded-lg bg-sage-500 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-display text-lg font-semibold text-navy-900">Everstead</span>
          </Link>

          <h1 className="font-display text-3xl font-light text-navy-950 mb-1">Welcome back</h1>
          <p className="text-stone-500 text-sm mb-8">Sign in to your plan</p>

          {sent ? (
            <div className="bg-sage-50 border border-sage-200 rounded-xl p-5 text-center">
              <Mail size={22} className="text-sage-600 mx-auto mb-3" />
              <p className="font-semibold text-sage-900 text-sm">Check your email</p>
              <p className="text-sage-700 text-xs mt-1">We sent a magic link to <strong>{email}</strong>. Click it to sign in.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mode toggle */}
              <div className="flex bg-stone-100 rounded-lg p-1 gap-1">
                <button type="button" onClick={() => setMode('password')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'password' ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                  Password
                </button>
                <button type="button" onClick={() => setMode('magic')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${mode === 'magic' ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                  <Sparkles size={13} /> Magic link
                </button>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              {mode === 'password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-stone-600">Password</label>
                    <Link to="/forgot-password" className="text-xs text-navy-600 hover:text-navy-900 transition-colors">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-navy-800 text-white font-semibold text-sm py-3 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in…' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-stone-400 mt-6">
            Don't have an account?{' '}
            <Link to="/get-started" className="text-navy-700 font-medium hover:text-navy-900 transition-colors">
              Start your free trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
