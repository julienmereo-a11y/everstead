// Portal panel: ask one person for one document, for a stated length of time.
//
// The employer half of onboarding, and equally useful to a firm that needs one
// deed rather than a whole vault. Nothing here grants access: the person
// chooses which of their own documents answers the ask, and that choice is what
// creates the share. Which is why the form asks for a plain description of what
// is needed rather than pointing at anything.
import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Ban, Bell, CheckCircle2, Clock, Loader2, Search, Send } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WINDOWS = [
  { value: 7,  label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: '', label: 'Until they stop it' },
]
// Starting points, not a fixed list: the field stays free text because what an
// employer needs at onboarding is not the same in London and in Lyon.
const COMMON = ['Proof of address', 'Photo ID', 'Right to work document', 'Bank details', 'Next of kin', 'Professional certificate']

const STATUS = {
  requested: { label: 'Waiting',   cls: 'bg-amber-50 text-amber-800 border-amber-200', Icon: Clock },
  uploaded:  { label: 'Shared',    cls: 'bg-sage-50 text-sage-700 border-sage-200',    Icon: CheckCircle2 },
  reviewed:  { label: 'Shared',    cls: 'bg-sage-50 text-sage-700 border-sage-200',    Icon: CheckCircle2 },
  stored:    { label: 'Shared',    cls: 'bg-sage-50 text-sage-700 border-sage-200',    Icon: CheckCircle2 },
  cancelled: { label: 'Declined',  cls: 'bg-stone-100 text-stone-600 border-stone-200', Icon: Ban },
}

const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } }

export function RequestPanel({ firm, isDemo }) {
  const [form, setForm] = useState({ email: '', docType: '', note: '', days: 30 })
  const [busy, setBusy] = useState(false)
  const [rowBusy, setRowBusy] = useState(null)
  const [error, setError] = useState(null)
  const [sentTo, setSentTo] = useState(null)
  const [history, setHistory] = useState([])

  const load = useCallback(async () => {
    if (isDemo || !firm?.id) return
    const { supabase } = await import('../../lib/supabase')
    const { data } = await supabase
      .from('adviser_document_requests')
      .select('id, recipient_email, doc_type, note, status, expires_days, created_at, reminded_at, uploaded_at')
      .eq('adviser_id', firm.id)
      .order('created_at', { ascending: false })
      .limit(40)
    setHistory(data || [])
  }, [firm?.id, isDemo])

  useEffect(() => { load() }, [load])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const authed = async (body) => {
    const { supabase } = await import('../../lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    const { apiPost } = await import('../../lib/platform')
    return apiPost('/api/org/request', body, { Authorization: `Bearer ${session?.access_token || ''}` })
  }

  const ask = async (e) => {
    e.preventDefault()
    setError(null); setSentTo(null)
    if (!EMAIL_RE.test(form.email.trim())) { setError('Enter a valid email address.'); return }
    if (!form.docType.trim()) { setError('Say what you are asking for.'); return }
    if (isDemo) { setSentTo(form.email.trim()); setForm({ email: '', docType: '', note: '', days: 30 }); return }

    setBusy(true)
    try {
      const res = await authed({
        action: 'create', orgId: firm.id,
        recipientEmail: form.email.trim(), docType: form.docType.trim(),
        note: form.note.trim() || null, expiresDays: form.days === '' ? null : form.days,
      })
      if (!res.ok) throw new Error(res.data?.error || 'Could not send that request.')
      setSentTo(form.email.trim())
      setForm({ email: '', docType: '', note: '', days: 30 })
      await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const rowAction = async (id, action) => {
    setRowBusy(id); setError(null)
    try {
      if (!isDemo) {
        const res = await authed({ action, requestId: id })
        if (!res.ok) throw new Error(res.data?.error || 'That did not work.')
        await load()
      }
    } catch (err) { setError(err.message) } finally { setRowBusy(null) }
  }

  const label = 'block text-xs font-semibold text-stone-600 mb-1.5'
  const input = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors'

  return (
    <div>
      <p className="text-stone-500 text-sm mb-6 max-w-2xl">
        They pick which of their own documents answers it, and that choice is what gives you access. You see the one item and nothing else, and it stops on its own.
      </p>

      <form onSubmit={ask} className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={label}>Who you are asking</span>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="person@company.com" className={input} />
          </label>
          <label className="block">
            <span className={label}>How long you need it for</span>
            <select value={form.days} onChange={e => set('days', e.target.value === '' ? '' : Number(e.target.value))} className={input}>
              {WINDOWS.map(w => <option key={String(w.value)} value={w.value}>{w.label}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className={label}>What you are asking for</span>
          <input value={form.docType} onChange={e => set('docType', e.target.value)} placeholder="Proof of address" className={input} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON.map(c => (
            <button key={c} type="button" onClick={() => set('docType', c)}
              className="text-[11px] font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full px-2.5 py-1 transition-colors">
              {c}
            </button>
          ))}
        </div>

        <label className="block">
          <span className={label}>Why, optional</span>
          <textarea rows={2} value={form.note} onChange={e => set('note', e.target.value)} placeholder="For your onboarding file. We delete our copy once you start." className={input} />
        </label>

        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
            <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 m-0">{error}</p>
          </div>
        )}
        {sentTo && (
          <div className="flex items-start gap-2.5 rounded-lg border border-sage-200 bg-sage-50 px-3.5 py-2.5">
            <CheckCircle2 size={15} className="text-sage-600 shrink-0 mt-0.5" />
            <p className="text-sm text-sage-800 m-0">Asked {sentTo}. You will see their answer below. They can decline, and that is a real answer.</p>
          </div>
        )}

        <button type="submit" disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {busy ? 'Sending…' : 'Send the request'}
        </button>
        <p className="text-xs text-stone-400 m-0">
          Everstead never asks for a document by email. The email tells them to open Everstead, where they see who is asking before deciding.
        </p>
      </form>

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-navy-950 m-0 mb-3">Asked</h2>
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr className="text-left text-xs font-semibold text-stone-500">
                  <th className="px-4 py-2.5">What</th>
                  <th className="px-4 py-2.5">From</th>
                  <th className="px-4 py-2.5">Asked</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {history.map(r => {
                  const s = STATUS[r.status] || STATUS.requested
                  const open = r.status === 'requested'
                  return (
                    <tr key={r.id} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-3 text-navy-950">
                        {r.doc_type}
                        <span className="block text-[11px] text-stone-400">
                          {r.expires_days ? `${r.expires_days} days of access` : 'until they stop it'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500">{r.recipient_email}</td>
                      <td className="px-4 py-3 text-stone-400 text-xs">
                        {fmt(r.created_at)}
                        {r.reminded_at && <span className="block text-[11px]">reminded {fmt(r.reminded_at)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${s.cls}`}>
                          <s.Icon size={11} />{s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {open && (
                          <span className="inline-flex items-center gap-3">
                            <button disabled={rowBusy === r.id} onClick={() => rowAction(r.id, 'remind')}
                              className="text-xs font-semibold text-navy-700 hover:text-navy-900 disabled:opacity-50 inline-flex items-center gap-1">
                              {rowBusy === r.id ? <Loader2 size={11} className="animate-spin" /> : <Bell size={11} />} Remind
                            </button>
                            <button disabled={rowBusy === r.id} onClick={() => rowAction(r.id, 'cancel')}
                              className="text-xs font-semibold text-stone-500 hover:text-red-600 disabled:opacity-50">
                              Withdraw
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-400">
            "Shared" means they chose a document and it is open to you for the window you asked for. You never see anything else in their vault.
          </p>
        </div>
      )}

      {history.length === 0 && !isDemo && (
        <p className="mt-8 flex items-center gap-2 text-sm text-stone-400">
          <Search size={14} /> Nothing asked yet.
        </p>
      )}
    </div>
  )
}
