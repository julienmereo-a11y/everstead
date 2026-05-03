import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Shield, CheckCircle2, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DelegateRegister() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const token          = searchParams.get('token')
  const { user, updateProfile } = useAuth()

  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [invite, setInvite]       = useState(null)
  const [owner, setOwner]         = useState(null)

  const [mode, setMode]     = useState('register') // register | login
  const [name, setName]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!token) { setLoadState('error'); return }
    loadInvite()
  }, [token])

  // If the user is already logged in and email matches, accept immediately
  useEffect(() => {
    if (user && invite && user.email === invite.email) {
      acceptAndRedirect()
    }
  }, [user, invite])

  const loadInvite = async () => {
    const { data, error } = await supabase.rpc('get_invite_details', { p_token: token })
    const person = data?.[0]

    if (error || !person || person.invite_status === 'declined') {
      setLoadState('error')
      return
    }
    if (person.invite_status === 'accepted') {
      navigate(`/delegate-dashboard?token=${token}`, { replace: true })
      return
    }

    setInvite(person)
    setOwner({ full_name: person.owner_name, email: person.owner_email })
    setName(person.name ?? '')
    setLoadState('ready')
  }

  const acceptAndRedirect = async () => {
    await supabase
      .from('trusted_people')
      .update({ invite_status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('invite_token', token)

    fetch('/api/emails/send-invite-accepted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerName:   owner?.full_name,
        ownerEmail:  owner?.email,
        inviteeName: invite?.name,
        role:        invite?.role,
      }),
    }).catch(console.error)

    navigate(`/delegate-dashboard?token=${token}`, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Route through server-side API to bypass Supabase captcha protection
      const res = await fetch('/api/auth/delegate-register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: invite.email, password, name, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')

      // Set the session on the client — triggers onAuthStateChange → acceptAndRedirect
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <Shell>
        <div className="p-10 flex flex-col items-center text-center gap-4">
          <Loader2 size={28} className="text-navy-400 animate-spin" />
          <p className="text-stone-500 text-sm">Loading your invitation…</p>
        </div>
      </Shell>
    )
  }

  if (loadState === 'error') {
    return (
      <Shell>
        <div className="p-10 flex flex-col items-center text-center">
          <p className="text-stone-500 text-sm">This invitation link is invalid or has expired. Ask the plan owner to re-send it.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="bg-navy-950 px-7 py-6">
        <p className="font-display text-lg font-light text-white leading-snug">
          {owner?.full_name} invited you as their <strong className="text-sage-400">{invite?.role}</strong>
        </p>
        <p className="text-stone-400 text-xs mt-1">
          {mode === 'register' ? 'Create a free account to accept.' : 'Sign in to your existing account to accept.'}
        </p>
      </div>

      <div className="p-7">
        {/* Mode toggle */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
          {[
            { key: 'register', label: 'Create account' },
            { key: 'login',    label: 'Sign in' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => { setMode(opt.key); setError(null) }}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                mode === opt.key
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-stone-500 hover:text-navy-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name — only for registration */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Full name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Jane Smith"
                className={inputCls}
              />
            </div>
          )}

          {/* Email — pre-filled and locked to invite email */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email address</label>
            <input
              type="email"
              value={invite?.email ?? ''}
              readOnly
              className={`${inputCls} bg-stone-50 text-stone-500 cursor-not-allowed`}
            />
            <p className="text-xs text-stone-400 mt-1">This is the email the invitation was sent to.</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={mode === 'register' ? 'Min. 8 characters' : 'Your password'}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full bg-navy-800 text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {submitting
              ? <><Loader2 size={15} className="animate-spin" />{mode === 'register' ? 'Creating account…' : 'Signing in…'}</>
              : mode === 'register' ? 'Create account & accept' : 'Sign in & accept'
            }
          </button>
        </form>

        {mode === 'register' && (
          <div className="mt-5 flex items-start gap-2.5 bg-sage-50 border border-sage-200 rounded-xl px-3.5 py-3">
            <CheckCircle2 size={14} className="text-sage-600 mt-0.5 shrink-0" />
            <p className="text-xs text-sage-800 leading-relaxed">
              Your account is <strong>free</strong> — delegates never pay. You're only getting access to {owner?.full_name}'s plan.
            </p>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <img src="/everstead-logo-dark.png" alt="Everstead" className="h-10 w-auto" />
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition-colors'
