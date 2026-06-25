import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Loader2, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function AcceptFamilyInvite() {
  const [searchParams]            = useSearchParams()
  const navigate                  = useNavigate()
  const token                     = searchParams.get('token')
  const { user }                  = useAuth()

  const [state, setState]         = useState('loading') // loading | found | submitting | success | error | expired | already_accepted
  const [membership, setMembership] = useState(null)
  const [primaryName, setPrimaryName] = useState('')
  const [errorMsg, setErrorMsg]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [form, setForm]           = useState({ fullName: '', password: '' })

  useEffect(() => {
    if (!token) {
      setState('error')
      setErrorMsg('This invitation link is invalid or has expired.')
      return
    }
    loadInvite()
  }, [token])

  const loadInvite = async () => {
    const { data, error } = await supabase
      .from('family_memberships')
      .select('*')
      .eq('invite_token', token)
      .maybeSingle()

    if (error || !data) {
      setState('error')
      setErrorMsg('This invitation link is invalid or has expired.')
      return
    }

    if (data.invite_status === 'accepted') {
      setState('already_accepted')
      return
    }

    if (data.invite_status === 'cancelled') {
      setState('error')
      setErrorMsg('This invitation has been cancelled.')
      return
    }

    const age = (Date.now() - new Date(data.invited_at).getTime()) / 86400000
    if (age > 7) {
      setState('expired')
      return
    }

    setMembership(data)

    // Fetch primary user's name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.primary_user_id)
      .maybeSingle()

    setPrimaryName(profile?.full_name || 'Your partner')
    setState('found')
  }

  // If user is already logged in, link accounts directly
  const handleLoggedInAccept = async () => {
    if (!user || !membership) return
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session not found. Please refresh and try again.')

      // Server-side accept — uses service role key, validates token and expiry
      const res = await fetch('/api/family/accept-invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body:    JSON.stringify({ inviteToken: token }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'expired') { setState('expired'); return }
        throw new Error(data.error || 'Could not accept invitation.')
      }

      // Notify primary (fire and forget)
      if (data.primaryEmail) {
        fetch('/api/emails/send-family-invite-accepted', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body:    JSON.stringify({ primaryEmail: data.primaryEmail, primaryName: data.primaryName, secondaryName: user.email }),
        }).catch(console.error)
      }

      navigate('/dashboard?welcome=family')
    } catch (err) {
      setState('error')
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!membership) return
    setLoading(true)
    setErrorMsg('')

    try {
      // Sign up with Supabase auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email:    membership.secondary_email,
        password: form.password,
        options:  {
          data: { full_name: form.fullName },
        },
      })

      if (signUpError) throw signUpError
      const newUser = signUpData.user
      if (!newUser) throw new Error('Account creation failed. Please try again.')

      // Write basic profile row so the server endpoint can find it
      await supabase.from('profiles').upsert({
        id:        newUser.id,
        full_name: form.fullName,
        email:     membership.secondary_email,
      }, { onConflict: 'id' })

      // Server-side accept — validates token, sets plan/status via service role
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session error. Please try again.')

      const res = await fetch('/api/family/accept-invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body:    JSON.stringify({ inviteToken: token }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'expired') { setState('expired'); return }
        throw new Error(data.error || 'Could not accept invitation.')
      }

      // Notify primary (fire and forget)
      if (data.primaryEmail) {
        fetch('/api/emails/send-family-invite-accepted', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body:    JSON.stringify({ primaryEmail: data.primaryEmail, primaryName: data.primaryName, secondaryName: form.fullName }),
        }).catch(console.error)
      }

      navigate('/dashboard?welcome=family')
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="flex justify-center mb-10">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" className="h-10 w-auto" style={{ filter: 'invert(1) sepia(1) saturate(0) brightness(0.2)' }} />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

          {/* LOADING */}
          {state === 'loading' && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-stone-500 text-sm">Loading your invitation…</p>
            </div>
          )}

          {/* FOUND — show invitation details */}
          {state === 'found' && membership && (
            <>
              <div className="aurora-field aurora-dim p-7">
                <p className="font-display text-xl font-light text-white leading-snug">
                  You've been invited to Everstead
                </p>
                <p className="text-stone-400 text-sm mt-2">
                  <strong className="text-white">{primaryName}</strong> has invited you to set up your own private vault — as part of their Family plan.
                </p>
              </div>

              <div className="p-7">
                {/* What you get */}
                <div className="space-y-2.5 mb-7">
                  {[
                    'Your own completely private vault',
                    'Organise accounts, documents, and final wishes',
                    primaryName + ' cannot see your data unless you share it',
                    'Covered by their Family plan — no cost to you',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="text-sage-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-stone-600">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Already logged in — show quick-accept */}
                {user && user.email === membership.secondary_email && (
                  <div className="mb-5">
                    <div className="px-4 py-3 bg-sage-50 border border-sage-200 rounded-xl text-xs text-sage-800 mb-4 leading-relaxed">
                      You're signed in as <strong>{user.email}</strong>. Click below to accept and link your accounts.
                    </div>
                    <button
                      onClick={handleLoggedInAccept}
                      disabled={loading}
                      className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                      Accept invitation
                    </button>
                  </div>
                )}

                {/* Wrong account logged in */}
                {user && user.email !== membership.secondary_email && (
                  <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                    <strong>Heads up:</strong> This invite is for <strong>{membership.secondary_email}</strong>. You're signed in as <strong>{user.email}</strong>. Sign out first to accept with the correct account.
                  </div>
                )}

                {/* Not logged in — show signup form */}
                {!user && (
                  <>
                    {/* Pre-filled email */}
                    <div className="mb-5 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl">
                      <p className="text-xs text-stone-500 mb-1">Invitation sent to</p>
                      <p className="text-sm font-medium text-navy-900">{membership.secondary_email}</p>
                    </div>

                    {errorMsg && (
                      <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed">
                        {errorMsg}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 mb-5">
                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                          Your full name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={form.fullName}
                          onChange={handleChange}
                          placeholder="Jane Smith"
                          required
                          autoFocus
                          className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                          Choose a password <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPw ? 'text' : 'password'}
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Min. 8 characters"
                            required
                            minLength={8}
                            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 pr-10 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            aria-label={showPw ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                          >
                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !form.fullName.trim() || form.password.length < 8}
                        className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <><Loader2 size={15} className="animate-spin" />Creating your vault…</>
                        ) : (
                          <>Create your vault <ArrowRight size={15} /></>
                        )}
                      </button>
                    </form>

                    <div className="flex items-start gap-3 bg-stone-50 rounded-xl p-4 mb-4">
                      <Lock size={14} className="text-navy-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Your vault is completely private. {primaryName} won't be able to see your data unless you choose to share it.
                      </p>
                    </div>

                    <p className="text-center text-xs text-stone-400">
                      Already have an account?{' '}
                      <Link
                        to={`/login?redirect=${encodeURIComponent(`/accept-family-invite?token=${token}`)}`}
                        className="text-navy-700 font-medium hover:text-navy-900"
                      >
                        Sign in instead
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {/* SUBMITTING */}
          {state === 'submitting' && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-stone-500 text-sm">Setting up your vault…</p>
            </div>
          )}

          {/* SUCCESS */}
          {state === 'success' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-sage-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={28} className="text-sage-500" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">Your vault is ready.</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8 max-w-xs">
                You're now part of {primaryName}'s Family plan. Your vault is completely private to you.
              </p>
              <Link
                to="/dashboard?welcome=family"
                className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-5 py-3 text-sm text-white font-medium hover:bg-navy-700 transition-colors"
              >
                Go to your dashboard <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* ALREADY ACCEPTED */}
          {state === 'already_accepted' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-sage-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={28} className="text-sage-500" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">Already accepted.</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8">
                This invitation has already been accepted. Sign in to access your vault.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-5 py-3 text-sm text-white font-medium hover:bg-navy-700 transition-colors"
              >
                Sign in <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* EXPIRED */}
          {state === 'expired' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-5">
                <Shield size={28} className="text-amber-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">Invitation expired.</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                This invite link is more than 7 days old. Ask the plan owner to send a new invitation from their account settings.
              </p>
            </div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
                <XCircle size={28} className="text-red-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">Something went wrong.</h2>
              <p className="text-stone-500 text-sm leading-relaxed">{errorMsg || 'Please try again or contact support.'}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
