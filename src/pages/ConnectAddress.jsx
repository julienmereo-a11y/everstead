// /connect-address?t=... — attaching a work address to a personal account.
//
// An organisation addresses everything to an email, and every rule that decides
// whether something is yours compares that email to the one on your account.
// For an employer those two are almost never the same, which used to mean a
// request simply never appeared and there was nothing on any page to say why.
//
// The link tells you an address is waiting. It is the code that proves the
// inbox is yours, and only the code, because an address on an account quietly
// receives everything sent to it afterwards.
//
// The signed-out branch matters as much as the rest: somebody invited by their
// employer would otherwise sign up with the work address and key a lifelong
// vault to an inbox they lose on their last day. This page says so, and tells
// them to use a personal address instead.
import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Check, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiPost } from '../lib/platform'
import { supabase } from '../lib/supabase'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/connectAddress.json'
import frCopy from '../i18n/locales/fr/connectAddress.json'

if (!i18n.hasResourceBundle('en', 'connectAddress')) {
  i18n.addResourceBundle('en', 'connectAddress', enCopy)
  i18n.addResourceBundle('fr', 'connectAddress', frCopy)
}

const card = 'rounded-[28px] border border-stone-200 bg-white p-8 sm:p-10'
const primaryBtn = 'inline-flex items-center justify-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-3 transition-colors disabled:opacity-60'
const quietBtn = 'inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-medium px-5 py-3 hover:bg-stone-50 transition-colors disabled:opacity-60'

export default function ConnectAddress() {
  const { t } = useTranslation('connectAddress')
  const [params] = useSearchParams()
  const token = params.get('t') || ''
  const { user } = useAuth()
  const navigate = useNavigate()

  const [req, setReq] = useState(null)
  const [loading, setLoading] = useState(!!token)
  const [step, setStep] = useState('confirm')   // confirm | code | done | already
  const [code, setCode] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState('')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    let live = true
    ;(async () => {
      const { data } = await supabase.rpc('get_request_by_claim_token', { p_token: token })
      if (live) { setReq(Array.isArray(data) ? data[0] : data); setLoading(false) }
    })()
    return () => { live = false }
  }, [token])

  const call = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    return apiPost('/api/account/link-address', { action, ...(token ? { token } : { email: typed.trim() }), ...extra },
      { Authorization: `Bearer ${session?.access_token || ''}` })
  }

  const sendCode = async () => {
    setBusy(true); setError(null)
    try {
      const res = await call('send-code')
      if (res.data?.alreadyYours) { setStep('already'); return }
      if (!res.ok) throw new Error(res.data?.error || 'Could not send the code.')
      setStep('code')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const verify = async () => {
    setBusy(true); setError(null)
    try {
      const res = await call('verify', { code })
      if (!res.ok) throw new Error(res.data?.error || 'That did not work.')
      setSaved(res.data.email)
      setStep('done')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const hint = req?.recipient_hint || typed || ''
  const firm = req?.sender_name || ''

  const frame = (children) => (
    <main className="min-h-screen bg-stone-50 px-5 py-16 sm:py-24">
      <Helmet><title>{t('meta.title')}</title><meta name="robots" content="noindex" /></Helmet>
      <div className="max-w-xl mx-auto">{children}</div>
    </main>
  )

  if (loading) return frame(
    <div className={`${card} text-center`}>
      <Loader2 size={22} className="animate-spin text-stone-300 mx-auto" />
      <p className="text-sm text-stone-500 mt-4 m-0">{t('loading')}</p>
    </div>
  )

  if (token && !req) return frame(
    <div className={card}>
      <AlertTriangle size={20} className="text-amber-600" />
      <h1 className="font-display text-2xl font-light text-navy-950 mt-4 mb-2">{t('invalid.title')}</h1>
      <p className="text-stone-600 text-sm leading-relaxed m-0">{t('invalid.body')}</p>
      <Link to="/" className={`mt-7 ${quietBtn}`}>{t('invalid.cta')}</Link>
    </div>
  )

  // Not signed in. With a link we can say who is waiting and, more importantly,
  // which address to sign up with: someone invited by their employer would
  // otherwise key a lifelong vault to an inbox they lose on their last day.
  // Without a link there is nothing to describe, so do not pretend there is.
  if (!user) {
    const here = `/connect-address${token ? `?t=${encodeURIComponent(token)}` : ''}`
    const k = req ? 'signedOut' : 'noLink'
    return frame(
      <div className={card}>
        <Mail size={20} className="text-navy-700" />
        <h1 className="font-display text-2xl font-light text-navy-950 mt-4 mb-2">
          {t(`${k}.title`, { firm })}
        </h1>
        <p className="text-stone-600 text-sm leading-relaxed m-0">{t(`${k}.body`, { firm, hint })}</p>
        <p className="mt-4 rounded-2xl bg-sage-50 border border-sage-200 p-4 text-sm text-navy-900 leading-relaxed m-0">
          {t(`${k}.advice`)}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {req && <Link to="/get-started?plan=free" className={primaryBtn}>{t('signedOut.signUp')} <ArrowRight size={15} /></Link>}
          <Link to={`/login?redirect=${encodeURIComponent(here)}`} className={req ? quietBtn : primaryBtn}>{t('signedOut.signIn')}</Link>
        </div>
        {req && <p className="text-xs text-stone-400 mt-5 m-0">{t('signedOut.after')}</p>}
      </div>
    )
  }

  if (step === 'already') return frame(
    <div className={card}>
      <Check size={20} className="text-sage-600" />
      <h1 className="font-display text-2xl font-light text-navy-950 mt-4 mb-2">{t('already.title')}</h1>
      <p className="text-stone-600 text-sm leading-relaxed m-0">{t('already.body')}</p>
      <Link to="/dashboard?tab=documents" className={`mt-7 ${primaryBtn}`}>{t('already.cta')} <ArrowRight size={15} /></Link>
    </div>
  )

  if (step === 'done') return frame(
    <div className={card}>
      <ShieldCheck size={20} className="text-sage-600" />
      <h1 className="font-display text-2xl font-light text-navy-950 mt-4 mb-2">{t('done.title')}</h1>
      <p className="text-stone-600 text-sm leading-relaxed m-0">{t('done.body', { email: saved })}</p>
      <button onClick={() => navigate('/dashboard?tab=documents')} className={`mt-7 ${primaryBtn}`}>
        {t('done.cta')} <ArrowRight size={15} />
      </button>
    </div>
  )

  if (step === 'code') return frame(
    <div className={card}>
      <h1 className="font-display text-2xl font-light text-navy-950 mt-0 mb-2">{t('code.title')}</h1>
      <p className="text-stone-600 text-sm leading-relaxed m-0">{t('code.body', { hint })}</p>
      <label className="block mt-6">
        <span className="block text-xs font-semibold text-stone-500 mb-1.5">{t('code.label')}</span>
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric" autoComplete="one-time-code" placeholder="000000"
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-2xl tracking-[.3em] font-mono text-center focus:outline-none focus:ring-2 focus:ring-navy-300" />
      </label>
      {error && <p className="text-sm text-red-600 mt-3 m-0">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button disabled={busy || code.length < 6} onClick={verify} className={primaryBtn}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}{busy ? t('code.checking') : t('code.submit')}
        </button>
        <button disabled={busy} onClick={sendCode} className={quietBtn}>{t('code.resend')}</button>
      </div>
    </div>
  )

  return frame(
    <div className={card}>
      <p className="text-xs font-semibold tracking-[.12em] uppercase text-stone-400 m-0">{t('confirm.eyebrow')}</p>
      <h1 className="font-display text-2xl font-light text-navy-950 mt-2 mb-2">
        {hint ? t('confirm.title', { hint }) : t('confirm.eyebrow')}
      </h1>
      <p className="text-stone-600 text-sm leading-relaxed m-0">
        {firm ? t('confirm.body', { firm }) : t('confirm.bodyPlain')}
      </p>

      {Array.isArray(req?.doc_types) && req.doc_types.length > 0 && (
        <div className="mt-5 rounded-2xl bg-stone-50 border border-stone-200 p-4">
          <p className="text-xs font-semibold text-stone-500 m-0 mb-2">{req.pack_name || t('confirm.asked')}</p>
          <ul className="m-0 pl-4 text-sm text-navy-900 space-y-1">
            {req.doc_types.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {!token && (
        <label className="block mt-5">
          <span className="block text-xs font-semibold text-stone-500 mb-1.5">{t('manual.label')}</span>
          <input value={typed} onChange={e => setTyped(e.target.value)} type="email" placeholder={t('manual.placeholder')}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
        </label>
      )}

      {error && <p className="text-sm text-red-600 mt-4 m-0">{error}</p>}

      <button disabled={busy || (!token && !typed.trim())} onClick={sendCode} className={`mt-6 ${primaryBtn}`}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}{busy ? t('confirm.sending') : t('confirm.send')}
      </button>
      <p className="text-xs text-stone-400 mt-5 m-0 leading-relaxed">{t('confirm.why')}</p>
    </div>
  )
}
