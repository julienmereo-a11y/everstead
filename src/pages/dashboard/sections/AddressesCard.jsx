// Settings: the addresses that are you.
//
// An organisation addresses everything to an email and every rule that decides
// whether something is yours compares that email to the one on your account.
// For an employer the two are almost never the same, so an account can hold
// more than one address once each has been proved.
//
// Adding is deliberately not a text field that saves. It sends a code to the
// address and waits, because an address here quietly receives everything sent
// to it afterwards, and a typed claim is not evidence of anything.
import React, { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Mail, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { apiPost } from '../../../lib/platform'
import { input, primaryBtn, secondaryBtn } from '../../dashboard/ui'

const DEMO = [
  { email: 'sophie@example.com', is_primary: true,  source: 'account', verified_at: null },
  { email: 'sophie.carter@marlowfinch.example', is_primary: false, source: 'delivery_claim', verified_at: '2026-09-02T09:10:00Z' },
]

export function AddressesCard({ isDemo }) {
  const { t } = useTranslation('dashboard')
  const [rows, setRows] = useState(isDemo ? DEMO : [])
  const [loading, setLoading] = useState(!isDemo)
  const [loadError, setLoadError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState('idle')   // idle | code
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [note, setNote] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)

  const load = useCallback(async () => {
    if (isDemo) { setRows(DEMO); setLoading(false); return }
    // get_my_emails always returns at least the sign-in address, so an empty
    // result is not "no addresses", it is a failed read. Rendering it as an
    // empty list told the member their account holds nothing, which is both
    // untrue and alarming on the one screen about who they are.
    const { data, error: readErr } = await supabase.rpc('get_my_emails')
    setLoadError(!!readErr || !data?.length)
    setRows(data || [])
    setLoading(false)
  }, [isDemo])
  useEffect(() => { load() }, [load])

  const call = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    return apiPost('/api/account/link-address', { action, email: email.trim(), ...extra },
      { Authorization: `Bearer ${session?.access_token || ''}` })
  }

  const send = async () => {
    setBusy(true); setError(null); setNote(null)
    try {
      const res = await call('send-code')
      if (res.data?.alreadyYours) { setNote(t('settings.addresses.alreadyYours')); setAdding(false); return }
      if (!res.ok) throw new Error(res.data?.error || 'Could not send the code.')
      setStage('code')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const verify = async () => {
    setBusy(true); setError(null)
    try {
      const res = await call('verify', { code })
      if (!res.ok) throw new Error(res.data?.error || 'That did not work.')
      setAdding(false); setStage('idle'); setEmail(''); setCode('')
      setNote(t('settings.addresses.added'))
      await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const remove = async (addr) => {
    if (isDemo) return
    await supabase.rpc('remove_my_email', { p_email: addr })
    await load()
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6">
      <h2 className="font-semibold text-navy-950 text-sm mb-1.5 flex items-center gap-2">
        <Mail size={15} className="text-navy-600" /> {t('settings.addresses.heading')}
      </h2>
      <p className="text-stone-500 text-sm mb-5 m-0">{t('settings.addresses.intro')}</p>

      {loading ? (
        <Loader2 size={16} className="animate-spin text-stone-300" />
      ) : loadError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3">
          <p className="text-sm text-stone-600 m-0">{t('settings.addresses.loadFailed')}</p>
          <button onClick={load} className="text-sm font-semibold text-navy-800 hover:underline shrink-0">
            {t('settings.addresses.retry')}
          </button>
        </div>
      ) : (
        <ul className="space-y-2 m-0 p-0 list-none">
          {rows.map(r => (
            <li key={r.email} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-2.5">
              <span className="flex items-center gap-2 min-w-0">
                {r.is_primary
                  ? <ShieldCheck size={14} className="text-navy-600 shrink-0" />
                  : <Check size={14} className="text-sage-600 shrink-0" />}
                <span className="text-sm text-navy-900 truncate">{r.email}</span>
                <span className="text-xs text-stone-400 shrink-0">
                  {r.is_primary ? t('settings.addresses.signIn') : t('settings.addresses.confirmed')}
                </span>
              </span>
              {!r.is_primary && (
                <button onClick={() => setConfirmRemove(r.email)} disabled={isDemo}
                  className="text-stone-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  aria-label={t('settings.addresses.remove')}>
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {confirmRemove && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900 m-0">
            {t('settings.addresses.confirmRemove', { email: confirmRemove })}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => { const e = confirmRemove; setConfirmRemove(null); await remove(e) }}
              className="text-sm font-semibold text-white bg-red-600 px-3.5 py-1.5 rounded-full hover:bg-red-700 transition-colors"
            >
              {t('settings.addresses.confirmRemoveYes')}
            </button>
            <button onClick={() => setConfirmRemove(null)} className={secondaryBtn}>
              {t('settings.addresses.cancel')}
            </button>
          </div>
        </div>
      )}

      {note && <p className="text-sm text-sage-700 mt-4 m-0">{note}</p>}

      {!adding ? (
        <button onClick={() => { setAdding(true); setNote(null); setError(null) }} disabled={isDemo}
          className={`mt-4 ${secondaryBtn}`}>
          <Plus size={14} /> {t('settings.addresses.add')}
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          {stage === 'idle' ? (
            <>
              <input className={input} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t('settings.addresses.placeholder')} />
              <p className="text-xs text-stone-500 mt-2 m-0">{t('settings.addresses.why')}</p>
            </>
          ) : (
            <>
              <input className={input} inputMode="numeric" autoComplete="one-time-code" value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
              <p className="text-xs text-stone-500 mt-2 m-0">{t('settings.addresses.codeSent', { email })}</p>
            </>
          )}
          {error && <p className="text-sm text-red-600 mt-2 m-0">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy || (stage === 'idle' ? !email.trim() : code.length < 6)}
              onClick={stage === 'idle' ? send : verify} className={primaryBtn}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              {stage === 'idle' ? t('settings.addresses.sendCode') : t('settings.addresses.confirm')}
            </button>
            <button onClick={() => { setAdding(false); setStage('idle'); setCode(''); setError(null) }}
              className={secondaryBtn}>{t('settings.addresses.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
