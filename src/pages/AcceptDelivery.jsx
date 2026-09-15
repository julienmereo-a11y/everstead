// /accept-delivery?token=... — the landing page for a document an organisation
// sent to somebody who does not have an Everstead account yet.
//
// The page never shows the file. It shows who sent it and what it is called,
// then asks the person to sign in or open a free account. Once they have an
// account on the address it was sent to, the delivery is simply there: the
// row-level policy matches on auth.email(), so no token is needed after that.
// The token only exists so this page can show something before signing up.
import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Check, Download, FileText, Loader2, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiPost } from '../lib/platform'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/acceptDelivery.json'
import frCopy from '../i18n/locales/fr/acceptDelivery.json'

if (!i18n.hasResourceBundle('en', 'acceptDelivery')) {
  i18n.addResourceBundle('en', 'acceptDelivery', enCopy)
  i18n.addResourceBundle('fr', 'acceptDelivery', frCopy)
}

export default function AcceptDelivery() {
  const { t, i18n: inst } = useTranslation('acceptDelivery')
  const lang = inst.language === 'fr' ? 'fr' : 'en'
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { user } = useAuth()
  const navigate = useNavigate()

  const [delivery, setDelivery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

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

  const respond = async (action) => {
    setBusy(action); setError(null)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await apiPost('/api/org/delivery-respond', { claimToken: token, action },
        { Authorization: `Bearer ${session?.access_token || ''}` })
      if (!res.ok) throw new Error(res.data?.error || t('error'))
      setDone(action)
      if (action === 'accept') setTimeout(() => navigate('/dashboard?tab=documents'), 1600)
    } catch (err) { setError(err.message) } finally { setBusy(null) }
  }

  const loginHref = `/login?redirect=${encodeURIComponent(`/accept-delivery?token=${token}`)}`
  const expired = delivery && (delivery.status !== 'sent' || (delivery.expires_at && new Date(delivery.expires_at) < new Date()))

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-5 py-24">
        <div className="w-full max-w-lg">
          <div className="rounded-[28px] border border-stone-200 bg-white p-8 sm:p-10">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-stone-300" /></div>
            ) : !delivery ? (
              <>
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-5"><AlertTriangle size={22} className="text-stone-400" /></div>
                <h1 className="font-display text-3xl font-light text-navy-950 m-0">{t('missing.title')}</h1>
                <p className="mt-3 text-[15px] leading-relaxed text-stone-600 m-0">{t('missing.body')}</p>
                <Link to="/" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900">{t('missing.cta')} <ArrowRight size={15} /></Link>
              </>
            ) : done ? (
              <>
                <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center mb-5"><Check size={22} className="text-sage-700" /></div>
                <h1 className="font-display text-3xl font-light text-navy-950 m-0">{t(done === 'accept' ? 'accepted.title' : 'declined.title')}</h1>
                <p className="mt-3 text-[15px] leading-relaxed text-stone-600 m-0">{t(done === 'accept' ? 'accepted.body' : 'declined.body')}</p>
                {done === 'accept' && <Link to="/dashboard?tab=documents" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:text-navy-900">{t('accepted.cta')} <ArrowRight size={15} /></Link>}
              </>
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

                {expired ? (
                  <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('expired')}</p>
                ) : user ? (
                  <>
                    <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('signedIn')}</p>
                    {error && <p className="mt-4 text-sm text-red-600 m-0">{error}</p>}
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button disabled={!!busy} onClick={() => respond('accept')} className="inline-flex items-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-3 transition-colors disabled:opacity-60">
                        {busy === 'accept' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{t('accept')}
                      </button>
                      <button disabled={!!busy} onClick={() => respond('decline')} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-medium px-5 py-3 hover:bg-stone-50 transition-colors disabled:opacity-60">
                        <X size={15} />{t('decline')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-6 text-[15px] leading-relaxed text-stone-600 m-0">{t('signedOut')}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link to="/get-started?plan=free" className="inline-flex items-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-3 transition-colors">
                        {t('createAccount')} <ArrowRight size={15} />
                      </Link>
                      <Link to={loginHref} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-medium px-5 py-3 hover:bg-stone-50 transition-colors">
                        {t('logIn')}
                      </Link>
                    </div>
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
