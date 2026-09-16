// Portal panel: ask one person for one document, for a stated length of time.
//
// The employer half of onboarding, and equally useful to a firm that needs one
// deed rather than a whole vault. Nothing here grants access: the person
// chooses which of their own documents answers the ask, and that choice is what
// creates the share. Which is why the form asks for a plain description of what
// is needed rather than pointing at anything.
import React, { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Send } from 'lucide-react'

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


export function RequestPanel({ firm, isDemo }) {
  const [form, setForm] = useState({ email: '', docType: '', note: '', days: 30 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sentTo, setSentTo] = useState(null)

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
    } catch (err) { setError(err.message) } finally { setBusy(false) }
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

    </div>
  )
}
