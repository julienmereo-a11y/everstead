// /accept-delivery?token=... — what an organisation sent you, for someone who
// may have no Everstead account at all.
//
// The page never shows the file and never links to one until two things are
// true: you hold the link, and you can read the address it was sent to. That
// second factor is the point. A forwarded email carries the token; it does not
// carry the code.
//
// Once verified there are two honest ways out. Take the file and go, which is
// a finished outcome and not a failed signup, or keep it in a vault you own.
// Someone being sent a contract by an employer they have not started with yet
// should not have to open an account to read it.
//
// A signed-in visitor whose address matches skips the code: they have already
// proved that address to us, and asking twice is theatre.
import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Check, Download, FileText, Loader2, Mail, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiPost } from '../lib/platform'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/acceptDelivery.json'
import frCopy from '../i18n/locales/fr/acceptDelivery.json'

if (!i18n.hasResourceBundle('en', 'acceptDelivery')) {
  i18n.addResourceBundle('en', 'acceptDelivery', enCopy)
  i18n.addResourceBundle('fr', 'acceptDelivery', frCopy)
}

const card = 'rounded-[28px] border border-stone-200 bg-white p-8 sm:p-10'
const primaryBtn = 'inline-flex items-center justify-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-3 transition-colors disabled:opacity-60'
const quietBtn = 'inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-medium px-5 py-3 hover:bg-stone-50 transition-colors disabled:opacity-60'

export default function AcceptDelivery() {
  const { t } = useTranslation('acceptDelivery')
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { user } = useAuth()
  const navigate = useNavigate()

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('start')          // start | code | ready | done
  const [outcome, setOutcome] = useState(null)       // downloaded | declined | accepted
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    let on = true
    import('../lib/supabase').then(async ({ supabase: sb }) => {
      const { data } = await sb.rpc('get_delivery_by_claim_token', { p_token: token })
      if (!on) return
      setDelivery(Array.isArray(data) ? data[0] || null : data || null)
      setLoading(false)
    }).catch(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [token])

  const claim = async (action, extra = {}) => {
    const res = await apiPost('/api/org/delivery-claim', { action, token, ...extra })
    if (!res.ok) throw new Error(res.data?.error || t('error'))
    return res.data
  }

  const run = async (key, fn) => {
    setBusy(key); setError(null); setNotice(null)
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(null) }
  }

  const sendCode = () => run('send', async () => {
    await claim('send-code')
    setStep('code')
    setNotice(t('code.sent', { hint: delivery?.recipient_hint || '' }))
  })

  const verify = () => run('verify', async () => {
    await claim('verify', { code: code.replace(/\D/g, '') })
    setStep('ready')
  })

  const download = () => run('download', async () => {
    const { url } = await claim('download')
    // The tab has to open from the click that started this, so no new window.
    window.location.href = url
    setOutcome('downloaded'); setStep('done')
  })

  const decline = () => run('decline', async () => {
    await claim('decline')
    setOutcome('declined'); setStep('done')
  })

  // Signed in on the matching address: the old one-tap path, no code.
  const acceptSignedIn = () => run('accept', async () => {
    const { supabase: sb } = await import('../lib/supabase')
    const { data: { session } } = await sb.auth.getSession()
    const res = await apiPost('/api/org/delivery-respond', { claimToken: token, action: 'accept' },
      { Authorization: `Bearer ${session?.access_token || ''}` })
    if (!res.ok) throw new Error(res.data?.error || t('error'))
    setOutcome('accepted'); setStep('done')
    setTimeout(() => navigate('/dashboard?tab=documents'), 1600)
  })

  const loginHref = `/login?redirect=${encodeURIComponent(`/accept-delivery?token=${token}`)}`
  const dead = delivery && (delivery.status !== 'sent' || (delivery.expires_at && new Date(delivery.expires_at) < new Date()))

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-5 py-24">
        <div className="w-full max-w-lg">
          <div className={card}>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-stone-300" /></div>
            ) : !delivery ? (
              <Gone t={t} />
            ) : step === 'done' ? (
              <Done t={t} outcome={outcome} />
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-700 m-0">
                  {t('from', { name: delivery.sender_name || t('anOrganisation') })}
                </p>
                <h1 className="mt-3 font-display text-3xl font-light text-navy-950 leading-tight m-0">{t('title')}</h1>

                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><FileText size={18} /></span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-navy-950 m-0 break-words">{delivery.title}</p>
                    <p className="text-xs text-stone-500 m-0 mt-1">{delivery.doc_type}</p>
                    {delivery.note && <p className="mt-2.5 text-sm text-stone-600 italic border-l-2 border-stone-200 pl-3 m-0">{delivery.note}</p>}
                  </div>
                </div>

                {dead ? (
                  <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('expired')}</p>
                ) : user ? (
                  <>
                    <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('signedIn')}</p>
                    <Err error={error} />
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button disabled={!!busy} onClick={acceptSignedIn} className={primaryBtn}>
                        {busy === 'accept' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{t('accept')}
                      </button>
                      <button disabled={!!busy} onClick={decline} className={quietBtn}><X size={15} />{t('decline')}</button>
                    </div>
                  </>
                ) : step === 'start' ? (
                  <>
                    <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">
                      {t('code.intro', { hint: delivery.recipient_hint || '' })}
                    </p>
                    <Err error={error} />
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button disabled={!!busy} onClick={sendCode} className={primaryBtn}>
                        {busy === 'send' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}{t('code.send')}
                      </button>
                      <button disabled={!!busy} onClick={decline} className={quietBtn}><X size={15} />{t('decline')}</button>
                    </div>
                  </>
                ) : step === 'code' ? (
                  <>
                    {notice && <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{notice}</p>}
                    <form
                      onSubmit={(e) => { e.preventDefault(); verify() }}
                      className="mt-5"
                    >
                      <label className="block">
                        <span className="block text-xs font-semibold text-stone-600 mb-1.5">{t('code.label')}</span>
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="000000"
                          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-2xl tracking-[0.3em] text-center font-mono text-navy-900 placeholder-stone-300 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-300"
                        />
                      </label>
                      <Err error={error} />
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button type="submit" disabled={!!busy || code.length !== 6} className={primaryBtn}>
                          {busy === 'verify' ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}{t('code.verify')}
                        </button>
                        <button type="button" disabled={!!busy} onClick={sendCode} className={quietBtn}>{t('code.resend')}</button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('ready.lead')}</p>
                    <Err error={error} />
                    <div className="mt-6 flex flex-col gap-3">
                      <button disabled={!!busy} onClick={download} className={primaryBtn}>
                        {busy === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{t('ready.download')}
                      </button>
                      <Link to="/get-started?plan=free" className={quietBtn}>{t('ready.keep')} <ArrowRight size={15} /></Link>
                      <button disabled={!!busy} onClick={decline} className="text-sm font-medium text-stone-500 hover:text-red-600 transition-colors mt-1">{t('decline')}</button>
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-stone-400 m-0">{t('ready.note')}</p>
                  </>
                )}

                <div className="mt-8 pt-6 border-t border-stone-100 flex items-start gap-2.5">
                  <ShieldCheck size={15} className="text-sage-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-stone-500 m-0">{t('safety')}</p>
                </div>
              </>
            )}
          </div>
          <p className="mt-5 text-center text-xs text-stone-400">{t('footer')}</p>
        </div>
      </div>
    </>
  )
}

const Err = ({ error }) => error ? (
  <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
    <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
    <p className="text-sm text-red-700 m-0">{error}</p>
  </div>
) : null

function Gone({ t }) {
  return (
    <>
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-5"><AlertTriangle size={22} className="text-stone-400" /></div>
      <h1 className="font-display text-3xl font-light text-navy-950 m-0">{t('missing.title')}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-600 m-0">{t('missing.body')}</p>
      <Link to="/" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900">{t('missing.cta')} <ArrowRight size={15} /></Link>
    </>
  )
}

function Done({ t, outcome }) {
  const k = outcome === 'downloaded' ? 'downloaded' : outcome === 'declined' ? 'declined' : 'accepted'
  return (
    <>
      <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center mb-5"><Check size={22} className="text-sage-700" /></div>
      <h1 className="font-display text-3xl font-light text-navy-950 m-0">{t(`${k}.title`)}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-600 m-0">{t(`${k}.body`)}</p>
      {k === 'downloaded' && (
        <Link to="/get-started?plan=free" className={`mt-7 ${primaryBtn}`}>{t('downloaded.cta')} <ArrowRight size={15} /></Link>
      )}
      {k === 'accepted' && (
        <Link to="/dashboard?tab=documents" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900">{t('accepted.cta')} <ArrowRight size={15} /></Link>
      )}
    </>
  )
}
