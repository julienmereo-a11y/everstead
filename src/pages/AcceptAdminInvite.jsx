import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Shield, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * AcceptAdminInvite — /accept-admin-invite?token=<uuid>
 *
 * Flow:
 * 1. Verify the token exists in admin_invites and is still pending
 * 2. If user is not signed in → prompt them to sign in / sign up
 * 3. Once signed in → mark invite as accepted, set profile.role = 'admin'
 * 4. Redirect to /admin
 *
 * Demo mode: token 'demo' always succeeds without any DB call.
 */
export default function AcceptAdminInvite() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  const token   = searchParams.get('token')
  const isDemo  = token === 'demo'

  // state: 'verifying' | 'needs-auth' | 'accepting' | 'done' | 'error'
  const [stage, setStage]     = useState('verifying')
  const [invite, setInvite]   = useState(null)
  const [errMsg, setErrMsg]   = useState('')

  // inline registration form state
  const [formName, setFormName]   = useState('')
  const [formPw, setFormPw]       = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formErr, setFormErr]     = useState('')

  // ── 1. Verify token ────────────────────────────────────────
  useEffect(() => {
    if (!token) { setErrMsg('No invite token found in this link.'); setStage('error'); return }

    if (isDemo) {
      setInvite({ email: 'demo@everstead.care', token: 'demo' })
      setStage(user ? 'accepting' : 'needs-auth')
      return
    }

    supabase
      .from('admin_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrMsg('This invite link is invalid or has already been used.')
          setStage('error')
          return
        }
        setInvite(data)
        setStage(user ? 'accepting' : 'needs-auth')
      })
  }, [token, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Once user signs in, move to accepting ───────────────
  useEffect(() => {
    if (user && stage === 'needs-auth' && invite) {
      setStage('accepting')
    }
  }, [user, stage, invite])

  // ── 3. Accept the invite ───────────────────────────────────
  useEffect(() => {
    if (stage !== 'accepting' || !user || !invite) return

    const accept = async () => {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 800))
        setStage('done')
        return
      }

      try {
        const { data, error } = await supabase.rpc('accept_admin_invite', { p_token: token })
        if (error) throw error
        if (data?.error === 'invalid_or_used') throw new Error('This invite link is invalid or has already been used.')
        if (data?.error === 'not_authenticated') throw new Error('You must be signed in to accept this invite.')
        await refreshProfile()
        setStage('done')
      } catch (err) {
        setErrMsg(err.message || 'Something went wrong accepting the invite.')
        setStage('error')
      }
    }

    accept()
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Auto-redirect to admin panel ───────────────────────
  useEffect(() => {
    if (stage !== 'done') return
    const t = setTimeout(() => navigate('/admin'), 2500)
    return () => clearTimeout(t)
  }, [stage, navigate])

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    setFormErr('')
    setFormLoading(true)
    try {
      const res = await fetch('/api/auth/delegate-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'admin', email: invite.email, password: formPw, name: formName, token }),
      })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error || 'Something went wrong.'); return }
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
    } catch {
      setFormErr('Network error. Please try again.')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="min-h-screen aurora-field aurora-dim flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-10">

        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-xl bg-navy-800 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-display text-xl font-semibold text-navy-900">Everstead</span>
        </div>

        {/* Verifying */}
        {stage === 'verifying' && (
          <div className="text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-navy-400 mx-auto" />
            <p className="text-sm text-stone-500">Checking your invite link…</p>
          </div>
        )}

        {/* Needs sign-in — inline registration form */}
        {stage === 'needs-auth' && invite && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="font-semibold text-navy-900 text-lg">Create your admin account</h2>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Access is reserved for <strong className="text-navy-800">{invite.email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email</label>
              <input
                type="email"
                value={invite.email}
                readOnly
                className="w-full border border-stone-100 rounded-xl px-4 py-3 text-sm text-stone-400 bg-stone-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formPw}
                  onChange={e => setFormPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 pr-10 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {formErr && <p className="text-xs text-red-600 leading-relaxed">{formErr}</p>}

            <button
              type="submit"
              disabled={formLoading}
              className="btn-aurora inline-flex items-center justify-center gap-2 w-full text-white text-sm font-semibold py-3 rounded-full transition-colors disabled:opacity-60"
            >
              {formLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              {formLoading ? 'Creating account…' : 'Create account & get access'}
            </button>
          </form>
        )}

        {/* Accepting */}
        {stage === 'accepting' && (
          <div className="text-center space-y-3">
            <Loader2 size={28} className="animate-spin text-navy-400 mx-auto" />
            <p className="text-sm text-stone-500">Granting admin access…</p>
          </div>
        )}

        {/* Done */}
        {stage === 'done' && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-navy-900 text-lg">Admin access granted</h2>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                Your account now has admin access. Redirecting you to the admin panel…
              </p>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center w-full bg-navy-900 text-white text-sm font-semibold py-3 rounded-full hover:bg-navy-800 transition-colors"
            >
              Go to admin panel
            </Link>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <div>
              <h2 className="font-semibold text-navy-900 text-lg">Invite unavailable</h2>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">{errMsg}</p>
            </div>
            <p className="text-xs text-stone-400">
              Ask an admin to send you a new invite from the Team section of the admin panel.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full border border-stone-200 text-navy-800 text-sm font-semibold py-3 rounded-full hover:bg-stone-50 transition-colors"
            >
              Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
