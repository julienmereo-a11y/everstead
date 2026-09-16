// Portal panel: ask one person for one document, for a stated length of time.
//
// The employer half of onboarding, and equally useful to a firm that needs one
// deed rather than a whole vault. Nothing here grants access: the person
// chooses which of their own documents answers the ask, and that choice is what
// creates the share. Which is why the form asks for a plain description of what
// is needed rather than pointing at anything.
import React, { useState } from 'react'
import { RecipientsField } from './recipients'
import { AlertTriangle, CheckCircle2, Loader2, Send, X } from 'lucide-react'

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
// A named set asked as one thing. Onboarding is where an employer feels this,
// and four separate emails for one new joiner is how a reasonable ask starts to
// feel like harassment.
const PACKS = [
  { name: 'New joiner', items: ['Photo ID', 'Right to work document', 'Proof of address', 'Bank details', 'Next of kin'] },
  { name: 'Right to work check', items: ['Photo ID', 'Right to work document'] },
  { name: 'Payroll setup', items: ['Bank details', 'Proof of address'] },
]


export function RequestPanel({ firm, isDemo }) {
  const [form, setForm] = useState({ note: '', days: 30, packName: '' })
  const [recipients, setRecipients] = useState([])
  const [items, setItems] = useState([])
  const [draft, setDraft] = useState('')
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

  const addItem = (label) => {
    const v = String(label || '').trim()
    if (!v || items.includes(v)) return
    setItems(list => [...list, v].slice(0, 8))
    setDraft('')
  }
  const usePack = (pack) => { setItems(pack.items.slice(0, 8)); setForm(f => ({ ...f, packName: pack.name })) }
  const reset = () => { setForm({ note: '', days: 30, packName: '' }); setItems([]); setDraft(''); setRecipients([]) }

  const ask = async (e) => {
    e.preventDefault()
    setError(null); setSentTo(null)
    const all = draft.trim() && !items.includes(draft.trim()) ? [...items, draft.trim()] : items
    if (!recipients.length) { setError('Add at least one email address.'); return }
    if (!all.length) { setError('Say what you are asking for.'); return }
    if (isDemo) { setSentTo({ sent: recipients.length, failed: 0, items: all.length }); reset(); return }

    setBusy(true)
    try {
      const res = await authed({
        action: 'create', orgId: firm.id,
        recipientEmails: recipients,
        docTypes: all,
        packName: all.length > 1 ? (form.packName.trim() || null) : null,
        note: form.note.trim() || null, expiresDays: form.days === '' ? null : form.days,
      })
      if (!res.ok) throw new Error(res.data?.error || 'Could not send that request.')
      setSentTo({ sent: res.data.sent, failed: res.data.failed, items: all.length })
      reset()
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
        <div className="grid sm:grid-cols-[1fr_200px] gap-4 items-start">
          <RecipientsField value={recipients} onChange={setRecipients} label="Who you are asking" />
          <label className="block">
            <span className={label}>How long you need it for</span>
            <select value={form.days} onChange={e => set('days', e.target.value === '' ? '' : Number(e.target.value))} className={input}>
              {WINDOWS.map(w => <option key={String(w.value)} value={w.value}>{w.label}</option>)}
            </select>
          </label>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3 mb-1.5">
            <span className="block text-xs font-semibold text-stone-600">What you are asking for</span>
            <span className="flex flex-wrap gap-1.5">
              {PACKS.map(p => (
                <button key={p.name} type="button" onClick={() => usePack(p)}
                  className="text-[11px] font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 border border-navy-200 rounded-full px-2.5 py-1 transition-colors">
                  {p.name}
                </button>
              ))}
            </span>
          </div>

          {items.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 mb-2 list-none m-0 p-0">
              {items.map(it => (
                <li key={it}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-900 bg-white border border-stone-200 rounded-full pl-3 pr-1.5 py-1">
                    {it}
                    <button type="button" onClick={() => setItems(list => list.filter(x => x !== it))}
                      className="text-stone-400 hover:text-red-600 transition-colors"><X size={12} /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(draft) } }}
            onBlur={() => addItem(draft)}
            placeholder={items.length ? 'Add another, then Enter' : 'Proof of address, then Enter'}
            className={input}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {COMMON.filter(c => !items.includes(c)).map(c => (
              <button key={c} type="button" onClick={() => addItem(c)}
                className="text-[11px] font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full px-2.5 py-1 transition-colors">
                {c}
              </button>
            ))}
          </div>
        </div>

        {items.length > 1 && (
          <label className="block">
            <span className={label}>Call the pack something, optional</span>
            <input value={form.packName} onChange={e => set('packName', e.target.value)} placeholder="New joiner" className={input} />
            <span className="block text-[11px] text-stone-400 mt-1">
              They get one email listing all {items.length}, and can answer or decline each one separately.
            </span>
          </label>
        )}

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
            <p className="text-sm text-sage-800 m-0">
              Asked {sentTo.sent} {sentTo.sent === 1 ? 'person' : 'people'} for {sentTo.items} {sentTo.items === 1 ? 'thing' : 'things'}
              {sentTo.failed ? `, ${sentTo.failed} could not be asked` : ''}. Answers land in History, and declining is a real answer.
            </p>
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
