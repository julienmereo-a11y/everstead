// /accept-delivery?token=... — what an organisation sent you, for someone who
// may have no Everstead account at all.
//
// This is the first screen most recipients ever see of Everstead, so it has
// two jobs at once: open one document safely, and be worth trusting. It never
// shows the file and never links to one until two things are true: you hold
// the link, and you can read the address it was sent to. A forwarded email
// carries the token; it does not carry the code. That holds for a signed-in
// visitor too: an account that has not proved that address answers the code
// like anyone else, and proving it adds the address to the account, so the
// next delivery from the same organisation needs no code at all.
//
// Once verified there are two honest ways out, presented as equals. Take the
// file and go, which is a finished outcome and not a failed signup, or keep it
// in a vault you own. The vault path carries the link along to signup, so the
// document is waiting in the new vault instead of lost to a different address.
//
// ?demo=1&state=start|code|ready|signedin|needscode|done[&outcome=accepted|downloaded|declined]
// renders fictional data and calls nothing, so the page can be looked at
// without a real delivery.
import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Check, Clock, Download, EyeOff, FileText, Loader2, Lock, Mail, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiPost } from '../lib/platform'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/acceptDelivery.json'
import frCopy from '../i18n/locales/fr/acceptDelivery.json'

if (!i18n.hasResourceBundle('en', 'acceptDelivery')) {
  i18n.addResourceBundle('en', 'acceptDelivery', enCopy)
  i18n.addResourceBundle('fr', 'acceptDelivery', frCopy)
}

const primaryBtn = 'inline-flex items-center justify-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-3 transition-colors disabled:opacity-60'
const quietBtn   = 'inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-medium px-5 py-3 hover:bg-stone-50 transition-colors disabled:opacity-60'
const linkBtn    = 'text-sm font-medium text-stone-500 hover:text-red-600 transition-colors disabled:opacity-60'

const DEMO_DELIVERY = {
  title: 'Employment contract, 2026 revision',
  doc_type: 'Legal',
  note: 'Signed copy for your records. Welcome aboard.',
  sender_name: 'Marlow & Finch',
  sent_at: new Date(Date.now() - 86400000).toISOString(),
  expires_at: new Date(Date.now() + 13 * 86400000).toISOString(),
  status: 'sent',
  recipient_hint: 'a•••••@marlowfinch.example',
}

const fmtDay = (iso, lang) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const s = d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long' })
    // French writes the first of the month as an ordinal: « 1er octobre ».
    return lang === 'fr' && d.getDate() === 1 ? s.replace(/^1 /, '1er ') : s
  } catch { return '' }
}

export default function AcceptDelivery() {
  const { t, i18n: i18nHook } = useTranslation('acceptDelivery')
  const lang = i18nHook.language === 'fr' ? 'fr' : 'en'
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const demo = params.get('demo') === '1'
  const demoState = demo ? (params.get('state') || 'start') : null
  const { user } = useAuth()
  const navigate = useNavigate()

  const signedIn = demo ? ['signedin', 'needscode'].includes(demoState) : !!user
  const email = demo ? 'you@example.com' : (user?.email || '')

  const [delivery, setDelivery] = useState(demo ? DEMO_DELIVERY : null)
  const [loading, setLoading]   = useState(!demo)
  const [step, setStep]         = useState(() => {
    if (!demo) return 'start'
    if (demoState === 'needscode') return 'code'
    return ['start', 'code', 'ready', 'done'].includes(demoState) ? demoState : 'start'
  })
  const [outcome, setOutcome]   = useState(demo ? (params.get('outcome') || 'accepted') : null)
  const [accepted, setAccepted] = useState(demo ? { documentId: 'demo', sender: DEMO_DELIVERY.sender_name } : null)
  const [needsCode, setNeedsCode] = useState(demo && demoState === 'needscode')
  const [code, setCode]     = useState('')
  const [busy, setBusy]     = useState(null)
  const [error, setError]   = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (demo) return
    if (!token) { setLoading(false); return }
    let on = true
    import('../lib/supabase').then(async ({ supabase: sb }) => {
      const { data } = await sb.rpc('get_delivery_by_claim_token', { p_token: token })
      if (!on) return
      setDelivery(Array.isArray(data) ? data[0] || null : data || null)
      setLoading(false)
    }).catch(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [token, demo])

  const sender = delivery?.sender_name || t('anOrganisation')
  const hint   = delivery?.recipient_hint || ''
  const dead   = delivery && (delivery.status !== 'sent' || (delivery.expires_at && new Date(delivery.expires_at) < new Date()))

  const claimPath = `/accept-delivery?token=${encodeURIComponent(token)}`
  const loginHref = `/login?redirect=${encodeURIComponent(claimPath)}`
  const keepHref  = `/get-started?plan=free&next=${encodeURIComponent(claimPath)}`
  const vaultHref = accepted
    ? `/dashboard?tab=documents&delivered=${encodeURIComponent(accepted.documentId)}&from=${encodeURIComponent(accepted.sender || '')}`
    : '/dashboard?tab=documents'

  const claim = async (action, extra = {}) => {
    if (demo) { await new Promise(r => setTimeout(r, 350)); return {} }
    const res = await apiPost('/api/org/delivery-claim', { action, token, ...extra })
    if (!res.ok) throw new Error(res.data?.error || t('error'))
    return res.data
  }

  const run = async (key, fn) => {
    setBusy(key); setError(null); setNotice(null)
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(null) }
  }

  const finishAccepted = (data) => {
    setAccepted({ documentId: data?.documentId || 'demo', sender: data?.delivery?.sender_name || delivery?.sender_name || '' })
    setOutcome('accepted'); setStep('done')
  }

  const sendCode = async () => {
    await claim('send-code')
    setStep('code')
    setNotice(t('code.sent', { hint }))
  }

  // Signed in: one tap, unless this address is not yet proved on the account.
  // Then the server asks for the code, the page sends it, and the accept is
  // retried once the code is confirmed.
  const acceptSignedIn = () => run('accept', async () => {
    if (demo) { finishAccepted(); return }
    const { supabase: sb } = await import('../lib/supabase')
    const { data: { session } } = await sb.auth.getSession()
    const res = await apiPost('/api/org/delivery-respond', { claimToken: token, action: 'accept' },
      { Authorization: `Bearer ${session?.access_token || ''}` })
    if (!res.ok) {
      if (res.data?.needsCode) { setNeedsCode(true); await sendCode(); return }
      throw new Error(res.data?.error || t('error'))
    }
    finishAccepted(res.data)
    setTimeout(() => navigate(vaultHrefFor(res.data)), 1800)
  })
  const vaultHrefFor = (data) => `/dashboard?tab=documents&delivered=${encodeURIComponent(data?.documentId || '')}&from=${encodeURIComponent(data?.delivery?.sender_name || delivery?.sender_name || '')}`

  const verify = () => run('verify', async () => {
    await claim('verify', { code: code.replace(/\D/g, '') })
    if (signedIn) {
      if (demo) { finishAccepted(); return }
      setStep('start')
      await acceptSignedIn()
      return
    }
    setStep('ready')
  })

  const download = () => run('download', async () => {
    const { url } = await claim('download')
    // The tab has to open from the click that started this, so no new window.
    if (url) window.location.href = url
    setOutcome('downloaded'); setStep('done')
  })

  const decline = () => run('decline', async () => {
    await claim('decline')
    setOutcome('declined'); setStep('done')
  })

  const stepIndex = step === 'ready' ? 1 : step === 'done' ? 2 : 0

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="min-h-screen bg-stone-50 px-5 py-8 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8 flex items-center justify-between gap-4">
            <Link to="/" className="font-display text-[22px] leading-none text-navy-950 no-underline">Everstead</Link>
            {signedIn && (
              <span className="text-xs text-stone-500 truncate">{t('signedInAs', { email })}</span>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_296px] lg:items-start">
            <section className="es-in rounded-[28px] border border-stone-200 bg-white p-6 sm:p-10 shadow-[0_28px_60px_-48px_rgba(13,22,40,0.45)]">
              {loading ? (
                <div className="flex justify-center py-14"><Loader2 size={24} className="animate-spin text-stone-300" /></div>
              ) : !delivery ? (
                <Gone t={t} />
              ) : step === 'done' ? (
                <Done t={t} outcome={outcome} sender={sender} vaultHref={vaultHref} />
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-700 m-0">
                    {t('from', { name: sender })}{delivery.sent_at ? ` · ${t('sentOn', { date: fmtDay(delivery.sent_at, lang) })}` : ''}
                  </p>
                  <h1 className="mt-3 font-display text-[28px] sm:text-[34px] font-light text-navy-950 leading-[1.15] m-0 text-balance">
                    {delivery.sender_name ? t('title', { name: delivery.sender_name }) : t('titleNoSender')}
                  </h1>

                  <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5">
                    <div className="flex items-start gap-3.5">
                      <span className="w-11 h-11 rounded-xl bg-white border border-stone-200 text-navy-700 flex items-center justify-center shrink-0"><FileText size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-semibold text-navy-950 m-0 break-words leading-snug">{delivery.title}</p>
                        <p className="text-xs text-stone-500 m-0 mt-1">{delivery.doc_type}</p>
                        {delivery.note && <p className="mt-3 text-sm text-stone-600 italic border-l-2 border-stone-200 pl-3 m-0">{delivery.note}</p>}
                      </div>
                    </div>
                    {!dead && delivery.expires_at && (
                      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 m-0">
                        <Clock size={12} className="text-stone-400" />{t('waitingUntil', { date: fmtDay(delivery.expires_at, lang) })}
                      </p>
                    )}
                  </div>

                  {dead ? (
                    <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('expired')}</p>
                  ) : (
                    <>
                      {!signedIn && <Steps current={stepIndex} t={t} />}

                      {signedIn && step === 'start' && (
                        <>
                          <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('signedIn.lead', { email })}</p>
                          <Err error={error} />
                          <div className="mt-6 flex flex-wrap gap-3">
                            <button disabled={!!busy} onClick={acceptSignedIn} className={primaryBtn}>
                              {busy === 'accept' || busy === 'verify' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{t('accept')}
                            </button>
                            <button disabled={!!busy} onClick={decline} className={quietBtn}><X size={15} />{t('decline')}</button>
                          </div>
                        </>
                      )}

                      {!signedIn && step === 'start' && (
                        <>
                          <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('start.intro', { hint })}</p>
                          <Err error={error} />
                          <div className="mt-6 flex flex-wrap gap-3">
                            <button disabled={!!busy} onClick={() => run('send', sendCode)} className={primaryBtn}>
                              {busy === 'send' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}{t('start.send')}
                            </button>
                            <Link to={loginHref} className={quietBtn}>{t('start.signIn')}</Link>
                          </div>
                          <p className="mt-3 text-xs text-stone-400 m-0">{t('start.signInHint')}</p>
                          <button disabled={!!busy} onClick={decline} className={`${linkBtn} mt-5`}>{t('decline')}</button>
                        </>
                      )}

                      {step === 'code' && (
                        <>
                          {needsCode && <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('signedIn.needsCode', { hint })}</p>}
                          {notice && <p className={`${needsCode ? 'mt-3' : 'mt-6'} text-[15px] leading-relaxed text-stone-600 m-0`}>{notice}</p>}
                          {!notice && !needsCode && <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('code.sent', { hint })}</p>}
                          <form onSubmit={(e) => { e.preventDefault(); verify() }} className="mt-5">
                            <label className="block">
                              <span className="block text-xs font-semibold text-stone-600 mb-1.5">{t('code.label')}</span>
                              <input
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                autoFocus
                                placeholder="000000"
                                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-2xl tracking-[0.3em] text-center font-mono text-navy-900 placeholder-stone-300 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-300"
                              />
                            </label>
                            <Err error={error} />
                            <div className="mt-5 flex flex-wrap gap-3">
                              <button type="submit" disabled={!!busy || code.length !== 6} className={primaryBtn}>
                                {busy === 'verify' || busy === 'accept' ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}{t('code.verify')}
                              </button>
                              <button type="button" disabled={!!busy} onClick={() => run('send', sendCode)} className={quietBtn}>{t('code.resend')}</button>
                            </div>
                          </form>
                        </>
                      )}

                      {step === 'ready' && (
                        <>
                          <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('ready.lead')}</p>
                          <Err error={error} />
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <Choice
                              Icon={Lock}
                              tone="navy"
                              title={t('ready.keep.title')}
                              points={t('ready.keep.points', { returnObjects: true })}
                              cta={<Link to={keepHref} className={`${primaryBtn} w-full`}>{t('ready.keep.cta')} <ArrowRight size={15} /></Link>}
                            />
                            <Choice
                              Icon={Download}
                              title={t('ready.download.title')}
                              points={t('ready.download.points', { returnObjects: true })}
                              cta={<button disabled={!!busy} onClick={download} className={`${quietBtn} w-full`}>{busy === 'download' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{t('ready.download.cta')}</button>}
                            />
                          </div>
                          <p className="mt-4 text-sm text-stone-500 m-0">
                            {t('ready.haveAccount')}{' '}<Link to={loginHref} className="font-semibold text-navy-700 hover:text-navy-900">{t('start.signIn')}</Link>
                          </p>
                          <button disabled={!!busy} onClick={decline} className={`${linkBtn} mt-4`}>{t('decline')}</button>
                        </>
                      )}
                    </>
                  )}

                  <div className="mt-8 pt-6 border-t border-stone-100 flex items-start gap-2.5">
                    <ShieldCheck size={15} className="text-sage-600 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-stone-500 m-0">{t('safety')}</p>
                  </div>
                </>
              )}
            </section>

            <aside className="aurora-field rounded-[24px] p-6 sm:p-7 text-stone-100">
              <TrustPanel sender={sender} t={t} />
            </aside>
          </div>

          <p className="mt-8 text-center text-xs text-stone-400">{t('footer')}</p>
        </div>
      </main>
    </>
  )
}

// Three steps, so a stranger can see how long this takes before starting.
function Steps({ current, t }) {
  const labels = t('steps', { returnObjects: true })
  if (!Array.isArray(labels)) return null
  return (
    <ol className="mt-7 flex items-center gap-x-3 gap-y-2 flex-wrap list-none m-0 p-0" aria-label={t('stepsAria')}>
      {labels.map((label, i) => {
        const done = i < current, now = i === current
        return (
          <li key={label} className={`inline-flex items-center gap-2 text-xs font-semibold ${now ? 'text-navy-950' : done ? 'text-sage-700' : 'text-stone-400'}`} aria-current={now ? 'step' : undefined}>
            <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] ${done ? 'bg-sage-600 text-white' : now ? 'bg-navy-900 text-white' : 'bg-stone-100 text-stone-500'}`}>
              {done ? <Check size={11} /> : i + 1}
            </span>
            {label}
            {i < labels.length - 1 && <span className="w-5 h-px bg-stone-200 ml-1" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

// One honest way out, with what it means in three lines.
function Choice({ Icon, tone, title, points, cta }) {
  const navy = tone === 'navy'
  return (
    <div className={`rounded-2xl border p-5 flex flex-col ${navy ? 'border-navy-200 bg-navy-50/60' : 'border-stone-200 bg-white'}`}>
      <span className={`w-9 h-9 rounded-xl inline-flex items-center justify-center ${navy ? 'bg-navy-900 text-white' : 'bg-stone-100 text-navy-700'}`}><Icon size={16} /></span>
      <p className="mt-3 text-[15px] font-semibold text-navy-950 m-0">{title}</p>
      <ul className="mt-2 mb-4 space-y-1.5 list-none m-0 p-0 flex-1">
        {(Array.isArray(points) ? points : []).map(p => (
          <li key={p} className="flex items-start gap-2 text-[13px] leading-relaxed text-stone-600">
            <Check size={13} className={`shrink-0 mt-1 ${navy ? 'text-navy-700' : 'text-sage-600'}`} />{p}
          </li>
        ))}
      </ul>
      {cta}
    </div>
  )
}

// The three answers a recipient arrives with, in the sender's name.
function TrustPanel({ sender, t }) {
  const rows = [[EyeOff, 'sees'], [Lock, 'keep'], [ShieldCheck, 'never']]
  return (
    <div className="relative">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sage-300 m-0">{t('trust.eyebrow')}</p>
      <ul className="mt-5 space-y-5 list-none m-0 p-0">
        {rows.map(([Icon, k]) => (
          <li key={k} className="flex gap-3">
            <span className="w-8 h-8 rounded-lg bg-white/10 inline-flex items-center justify-center shrink-0"><Icon size={15} className="text-sage-300" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white m-0">{t(`trust.${k}.title`, { sender })}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-300 m-0">{t(`trust.${k}.body`, { sender })}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
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

function Done({ t, outcome, sender, vaultHref }) {
  const k = outcome === 'downloaded' ? 'downloaded' : outcome === 'declined' ? 'declined' : 'accepted'
  return (
    <>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-5 ${k === 'declined' ? 'bg-stone-100' : 'bg-sage-100'}`}>
        {k === 'declined' ? <X size={22} className="text-stone-500" /> : <Check size={22} className="text-sage-700" />}
      </div>
      <h1 className="font-display text-3xl font-light text-navy-950 m-0">{t(`${k}.title`)}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-600 m-0">{t(`${k}.body`, { sender })}</p>
      {k === 'accepted' && (
        <>
          <Link to={vaultHref} className={`mt-7 ${primaryBtn}`}>{t('accepted.cta')} <ArrowRight size={15} /></Link>
          <p className="mt-3 text-xs text-stone-400 m-0">{t('accepted.auto')}</p>
        </>
      )}
      {k === 'downloaded' && (
        <Link to="/get-started?plan=free" className={`mt-7 ${primaryBtn}`}>{t('downloaded.cta')} <ArrowRight size={15} /></Link>
      )}
      {k === 'declined' && (
        <Link to="/" className={`mt-7 ${quietBtn}`}>{t('declined.cta')}</Link>
      )}
    </>
  )
}
