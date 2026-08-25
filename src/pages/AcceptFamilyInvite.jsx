import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Loader2, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'
import enAcceptFamilyInvite from '../i18n/locales/en/acceptFamilyInvite.json'
import frAcceptFamilyInvite from '../i18n/locales/fr/acceptFamilyInvite.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later: re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'acceptFamilyInvite', enAcceptFamilyInvite)
i18n.addResourceBundle('fr', 'acceptFamilyInvite', frAcceptFamilyInvite)

export default function AcceptFamilyInvite() {
  const [searchParams]            = useSearchParams()
  const navigate                  = useNavigate()
  const token                     = searchParams.get('token')
  const { user }                  = useAuth()
  const { t }                     = useTranslation('acceptFamilyInvite')

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
      setErrorMsg(t('errors.invalidLink'))
      return
    }
    loadInvite()
  }, [token])

  const loadInvite = async () => {
    // Token-scoped, SECURITY DEFINER lookup (replaces the broad anon read of
    // family_memberships). Returns only the matching row + the primary's name.
    const { data, error } = await supabase.rpc('get_family_invite_details', { p_token: token })
    const row = data?.[0]

    if (error || !row) {
      setState('error')
      setErrorMsg(t('errors.invalidLink'))
      return
    }

    if (row.invite_status === 'accepted') {
      setState('already_accepted')
      return
    }

    if (row.invite_status === 'cancelled') {
      setState('error')
      setErrorMsg(t('errors.cancelled'))
      return
    }

    const age = (Date.now() - new Date(row.invited_at).getTime()) / 86400000
    if (age > 7) {
      setState('expired')
      return
    }

    setMembership(row)
    setPrimaryName(row.primary_name || t('fallbackPartner'))
    setState('found')
  }

  // If user is already logged in, link accounts directly
  const handleLoggedInAccept = async () => {
    if (!user || !membership) return
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t('errors.sessionNotFound'))

      // Server-side accept — uses service role key, validates token and expiry
      const res = await fetch('/api/family/accept-invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body:    JSON.stringify({ inviteToken: token }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'expired') { setState('expired'); return }
        throw new Error(data.error || t('errors.acceptFailed'))
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
      setErrorMsg(err.message || t('errors.generic'))
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
      if (!newUser) throw new Error(t('errors.accountCreationFailed'))

      // Write basic profile row so the server endpoint can find it
      await supabase.from('profiles').upsert({
        id:        newUser.id,
        full_name: form.fullName,
        email:     membership.secondary_email,
      }, { onConflict: 'id' })

      // Server-side accept — validates token, sets plan/status via service role
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t('errors.sessionError'))

      const res = await fetch('/api/family/accept-invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body:    JSON.stringify({ inviteToken: token }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'expired') { setState('expired'); return }
        throw new Error(data.error || t('errors.acceptFailed'))
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
      setErrorMsg(err.message || t('errors.generic'))
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
              <p className="text-stone-500 text-sm">{t('loading')}</p>
            </div>
          )}

          {/* FOUND — show invitation details */}
          {state === 'found' && membership && (
            <>
              <div className="aurora-field aurora-dim p-7">
                <p className="font-display text-xl font-light text-white leading-snug">
                  {t('found.title')}
                </p>
                <p className="text-stone-400 text-sm mt-2">
                  <Trans
                    t={t}
                    i18nKey="found.subtitle"
                    values={{ name: primaryName }}
                    components={{ bold: <strong className="text-white" /> }}
                  />
                </p>
              </div>

              <div className="p-7">
                {/* What you get */}
                <div className="space-y-2.5 mb-7">
                  {[
                    t('found.benefit1'),
                    t('found.benefit2'),
                    t('found.benefit3', { name: primaryName }),
                    t('found.benefit4'),
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
                      <Trans
                        t={t}
                        i18nKey="found.signedInNotice"
                        values={{ email: user.email }}
                        components={{ bold: <strong /> }}
                      />
                    </div>
                    <button
                      onClick={handleLoggedInAccept}
                      disabled={loading}
                      className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                      {t('found.accept')}
                    </button>
                  </div>
                )}

                {/* Wrong account logged in */}
                {user && user.email !== membership.secondary_email && (
                  <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                    <Trans
                      t={t}
                      i18nKey="found.wrongAccount"
                      values={{ invited: membership.secondary_email, current: user.email }}
                      components={{ bold: <strong /> }}
                    />
                  </div>
                )}

                {/* Not logged in — show signup form */}
                {!user && (
                  <>
                    {/* Pre-filled email */}
                    <div className="mb-5 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl">
                      <p className="text-xs text-stone-500 mb-1">{t('found.sentTo')}</p>
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
                          {t('found.form.nameLabel')} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={form.fullName}
                          onChange={handleChange}
                          placeholder={t('found.form.namePlaceholder')}
                          required
                          autoFocus
                          className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                          {t('found.form.passwordLabel')} <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPw ? 'text' : 'password'}
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder={t('found.form.passwordPlaceholder')}
                            required
                            minLength={8}
                            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 pr-10 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            aria-label={showPw ? t('found.form.hidePassword') : t('found.form.showPassword')}
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
                          <><Loader2 size={15} className="animate-spin" />{t('found.form.creating')}</>
                        ) : (
                          <>{t('found.form.submit')} <ArrowRight size={15} /></>
                        )}
                      </button>
                    </form>

                    <div className="flex items-start gap-3 bg-stone-50 rounded-xl p-4 mb-4">
                      <Lock size={14} className="text-navy-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-stone-500 leading-relaxed">
                        {t('found.privacyNote', { name: primaryName })}
                      </p>
                    </div>

                    <p className="text-center text-xs text-stone-400">
                      {t('found.haveAccount')}{' '}
                      <Link
                        to={`/login?redirect=${encodeURIComponent(`/accept-family-invite?token=${token}`)}`}
                        className="text-navy-700 font-medium hover:text-navy-900"
                      >
                        {t('found.signIn')}
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
              <p className="text-stone-500 text-sm">{t('submitting')}</p>
            </div>
          )}

          {/* SUCCESS */}
          {state === 'success' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-sage-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={28} className="text-sage-500" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('success.title')}</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8 max-w-xs">
                {t('success.body', { name: primaryName })}
              </p>
              <Link
                to="/dashboard?welcome=family"
                className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-5 py-3 text-sm text-white font-medium hover:bg-navy-700 transition-colors"
              >
                {t('success.cta')} <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* ALREADY ACCEPTED */}
          {state === 'already_accepted' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-sage-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={28} className="text-sage-500" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('alreadyAccepted.title')}</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8">
                {t('alreadyAccepted.body')}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-5 py-3 text-sm text-white font-medium hover:bg-navy-700 transition-colors"
              >
                {t('alreadyAccepted.cta')} <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* EXPIRED */}
          {state === 'expired' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-5">
                <Shield size={28} className="text-amber-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('expired.title')}</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                {t('expired.body')}
              </p>
            </div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
                <XCircle size={28} className="text-red-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('error.title')}</h2>
              <p className="text-stone-500 text-sm leading-relaxed">{errorMsg || t('error.fallback')}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
