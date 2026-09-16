// Portal screen: send one document into someone's own Everstead vault.
//
// The organisation's half of the delivery flow. Deliberately simple, because
// the interesting decisions are not here: the file goes to a private staging
// bucket, the recipient accepts or declines, and only then does it become a
// document they own. Nothing on this screen can reach anybody's vault.
//
// The recipient does not need an Everstead account. If they have none the
// email carries a claim link; once they open a free account on that address the
// delivery is simply there.
import React, { useState } from 'react'
import { RecipientsField } from './recipients'
import { AlertTriangle, CheckCircle2, FileText, Loader2, Send, ShieldCheck, Upload, X } from 'lucide-react'

const DOC_TYPES = ['Legal', 'Finance', 'Insurance', 'Property', 'Personal', 'Medical', 'Other']
const MAX_BYTES = 25 * 1024 * 1024


export function SendPanel({ firm, isDemo }) {
  const [form, setForm] = useState({ title: '', docType: 'Other', note: '' })
  const [recipients, setRecipients] = useState([])
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sentTo, setSentTo] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const pick = (f) => {
    setError(null)
    if (!f) return
    if (f.size > MAX_BYTES) { setError('That file is larger than 25 MB.'); return }
    setFile(f)
    if (!form.title) set('title', f.name.replace(/\.[^.]+$/, ''))
  }

  const send = async (e) => {
    e.preventDefault()
    setError(null); setSentTo(null)
    if (!recipients.length) { setError('Add at least one email address.'); return }
    if (recipients.length > 250) { setError('That is more than 250 addresses. Split it into smaller batches.'); return }
    if (!file) { setError('Choose the file to send.'); return }
    if (!form.title.trim()) { setError('Give the document a name the recipient will recognise.'); return }
    if (isDemo) { setSentTo({ sent: recipients.length, failed: 0 }); setFile(null); setForm({ title: '', docType: 'Other', note: '' }); setRecipients([]); return }

    setBusy(true)
    try {
      const { supabase } = await import('../../lib/supabase')
      const ext = (file.name.split('.').pop() || 'bin').slice(0, 10)
      const path = `${firm.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('deliveries').upload(path, file, { contentType: file.type || undefined })
      if (upErr) throw new Error(upErr.message)

      const { data: { session } } = await supabase.auth.getSession()
      const { apiPost } = await import('../../lib/platform')
      const res = await apiPost('/api/org/deliver', {
        orgId: firm.id,
        recipientEmails: recipients,
        title: form.title.trim(),
        docType: form.docType,
        note: form.note.trim() || null,
        storagePath: path,
        mimeType: file.type || null,
        fileSize: file.size,
      }, { Authorization: `Bearer ${session?.access_token || ''}` })
      if (!res.ok) {
        await supabase.storage.from('deliveries').remove([path]).catch(() => {})
        throw new Error(res.data?.error || 'Could not send that document.')
      }
      setSentTo({ sent: res.data.sent, failed: res.data.failed, results: res.data.results })
      setFile(null)
      setForm({ title: '', docType: 'Other', note: '' })
      setRecipients([])
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const blocked = !isDemo && firm && firm.can_deliver === false
  const label = 'block text-xs font-semibold text-stone-600 mb-1.5'
  const input = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors'

  return (
    <div>
      <p className="text-stone-500 text-sm mb-6 max-w-2xl">
        Into the person's own Everstead vault. They accept it before anything is stored, and it stays theirs afterwards, including if they leave you.
      </p>

      {blocked && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 m-0">Sending is not switched on for {firm?.firm_name} yet.</p>
            <p className="text-sm text-amber-800 mt-1 m-0">
              We verify an organisation's email domain before it can put a document in anyone's vault, because "we have sent you a document, click here" is exactly what a phishing email looks like. Email hello@everstead.care and we will turn it on.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={send} className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <div className="grid sm:grid-cols-[1fr_200px] gap-4 items-start">
          <div className={blocked ? 'opacity-50 pointer-events-none' : ''}>
            <RecipientsField value={recipients} onChange={setRecipients} />
          </div>
          <label className="block">
            <span className={label}>Type</span>
            <select value={form.docType} onChange={e => set('docType', e.target.value)} className={input} disabled={blocked}>
              {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className={label}>What they will see it called</span>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Employment contract, 2026 revision" className={input} disabled={blocked} />
        </label>

        <label className="block">
          <span className={label}>A note, optional</span>
          <textarea rows={3} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Signed copy for your records." className={input} disabled={blocked} />
        </label>

        <div>
          <span className={label}>File, up to 25 MB</span>
          {file ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
              <FileText size={15} className="text-stone-400 shrink-0" />
              <span className="text-sm text-navy-950 min-w-0 flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-stone-400 hover:text-red-600 transition-colors"><X size={15} /></button>
            </div>
          ) : (
            <label className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-5 text-sm text-stone-500 transition-colors ${blocked ? 'opacity-50' : 'cursor-pointer hover:border-navy-300 hover:text-navy-700'}`}>
              <Upload size={15} /> Choose a file
              <input type="file" className="hidden" disabled={blocked} onChange={e => pick(e.target.files?.[0])} />
            </label>
          )}
        </div>

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
              Sent to {sentTo.sent} {sentTo.sent === 1 ? 'person' : 'people'}
              {sentTo.failed ? `, ${sentTo.failed} could not be sent` : ''}. Each of them decides whether to keep it, and the answers land in History.
            </p>
          </div>
        )}

        <button type="submit" disabled={busy || blocked}
          className="inline-flex items-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {busy ? 'Sending…' : 'Send it'}
        </button>
        <p className="text-xs text-stone-400 m-0">
          The email never carries the file and never links to one. It links to Everstead, where they see who sent it before deciding.
        </p>
      </form>

    </div>
  )
}
