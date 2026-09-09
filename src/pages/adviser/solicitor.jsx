// Adviser Portal v2: the solicitor experience. A review queue for drafts,
// signed copies and requested documents, and matter tracking for estate-plan
// and probate work. Everything here is firm-side state; the client's own
// records are never modified.
//
import React, { useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { Card, Dot, Pill, ScreenHeader, daysUntil, eyebrowCls, fmtDate, inputCls, pillBtn, primaryBtn, relativeTime, secondaryBtn } from './shared'

export const DOC_TYPES = [
  'Letter of wishes',
  'Signed will (witnessed copy)',
  'LPA certificate provider statement',
  'Property deeds',
  'Pension nomination form',
  'Death certificate',
  'Grant of probate',
  'Other',
]

export const STAGES = {
  estate_plan: ['Instructed', 'Drafting', 'Client review', 'Signing', 'Stored'],
  probate:     ['Notified', 'Valuation', 'IHT400', 'Grant', 'Distribution'],
}
export const KIND_LABEL = { estate_plan: 'Estate plan', probate: 'Probate' }

export const matterStageLabel = (m) => (STAGES[m.kind] || STAGES.estate_plan)[Math.min(4, Math.max(0, m.stage || 0))]

/** Due-date wording for a matter, and whether it needs attention. */
export function matterDue(m) {
  if (!m.due_date) return { text: m.stage >= 4 ? 'Complete' : 'No date set', urgent: false }
  const d = daysUntil(m.due_date)
  if (d < 0)   return { text: `Overdue ${Math.abs(d) < 7 ? `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}` : `${Math.floor(Math.abs(d) / 7)} week${Math.floor(Math.abs(d) / 7) === 1 ? '' : 's'}`}`, urgent: true }
  if (d === 0) return { text: 'Due today', urgent: true }
  if (d <= 7)  return { text: `Due in ${d} day${d === 1 ? '' : 's'}`, urgent: true }
  return { text: fmtDate(m.due_date), urgent: false }
}

// ── Request a document ───────────────────────────────────────────────────────
export function RequestDocumentPanel({ families, onSend, onClose, busy, error, preselectClientId }) {
  const accepted = families.filter(f => f.invite_status === 'accepted')
  const [clientId, setClientId] = useState(preselectClientId || accepted[0]?.id || '')
  const [docType, setDocType]   = useState(DOC_TYPES[0])
  const [custom, setCustom]     = useState('')
  const [note, setNote]         = useState('')
  const finalType = docType === 'Other' ? custom.trim() : docType
  const submit = (e) => { e.preventDefault(); if (!clientId || !finalType) return; onSend({ clientId, docType: finalType, note: note.trim() }) }
  const labelCls = `${eyebrowCls} !text-navy-600 !font-bold flex flex-col gap-1.5`
  return (
    <Card className="p-6 !border-navy-200 !bg-navy-50">
      <form onSubmit={submit}>
        <div className="grid gap-3 items-end" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label className={labelCls}>Client
            <select value={clientId} onChange={e => setClientId(e.target.value)} className={`${inputCls} normal-case tracking-normal font-normal`}>
              {accepted.map(f => <option key={f.id} value={f.id}>{f.owner_name}</option>)}
            </select>
          </label>
          <label className={labelCls}>Document
            <select value={docType} onChange={e => setDocType(e.target.value)} className={`${inputCls} normal-case tracking-normal font-normal`}>
              {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          {docType === 'Other' && (
            <label className={labelCls}>Which document
              <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="e.g. Bank statement, last 3 months" className={`${inputCls} normal-case tracking-normal font-normal`} />
            </label>
          )}
          <label className={labelCls}>Note to client
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional, why you need it" className={`${inputCls} normal-case tracking-normal font-normal`} />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
            <button type="submit" disabled={busy || !clientId || !finalType} className={primaryBtn}>{busy ? <Loader2 size={14} className="animate-spin" /> : 'Send request'}</button>
          </div>
        </div>
        {error && <p className="mt-3 text-[12.5px] text-red-700 m-0">{error}</p>}
        <p className="mt-3 text-[12px] text-stone-600 m-0">The client receives a secure prompt in their vault and an email. You'll be notified when it's uploaded; nothing is shared until they choose to.</p>
      </form>
    </Card>
  )
}

// ── Review queue ─────────────────────────────────────────────────────────────
export function ReviewQueueScreen({ families, workspace, requestOpen, setRequestOpen, requestBusy, requestError, onCreateRequest, onRemind, onRequestStatus, onSetReview, openClient, isDemo }) {
  const reviews  = workspace.reviews || []
  const requests = workspace.requests || []
  const nameOf = (id, fallback) => families.find(f => f.id === id)?.owner_name || fallback || 'Client'

  const awaiting = [
    ...reviews.filter(r => r.review_status === 'draft' || r.review_status === 'in_review').map(r => ({
      key: `rv-${r.document_id}`, title: r.document_name, tag: r.review_status === 'draft' ? 'Draft' : 'In review', tagStatus: r.review_status,
      client: nameOf(r.client_id, r.client_name), when: `uploaded ${relativeTime(r.document_updated_at || r.reviewed_at)}`,
      cta: 'Open & annotate', go: () => openClient(r.client_id, 'documents'),
    })),
    ...requests.filter(r => r.status === 'uploaded').map(r => ({
      key: `rq-${r.id}`, title: r.document_name || r.doc_type, tag: 'Uploaded', tagStatus: 'uploaded',
      client: nameOf(r.client_id, r.client_name), when: `attached ${relativeTime(r.uploaded_at)}`,
      cta: 'Open & review', go: () => openClient(r.client_id, 'documents'),
      secondary: { label: 'Mark reviewed', go: () => onRequestStatus(r.id, 'reviewed') },
    })),
  ]
  const signed = reviews.filter(r => r.review_status === 'signed').map(r => ({
    key: `sg-${r.document_id}`, title: r.document_name, tag: 'Signed', tagStatus: 'signed',
    client: nameOf(r.client_id, r.client_name), when: relativeTime(r.reviewed_at),
    cta: 'Confirm & store', go: () => onSetReview(r.client_id, r.document_id, 'stored'),
  }))
  const requested = requests.filter(r => r.status === 'requested').map(r => ({
    key: `rq-${r.id}`, title: r.doc_type, tag: 'Requested', tagStatus: 'requested',
    client: nameOf(r.client_id, r.client_name), when: `${relativeTime(r.created_at)}${r.reminded_at ? ' · reminder sent' : ''}`,
    cta: 'Remind again', go: () => onRemind(r.id),
    secondary: { label: 'Cancel', go: () => onRequestStatus(r.id, 'cancelled') },
  }))

  const lanes = [
    { title: 'Awaiting your review', dot: '#dc2626', items: awaiting, empty: 'Nothing waiting. Drafts a client uploads appear here once you mark them for review.' },
    { title: 'Signed, to file',      dot: '#d97706', items: signed,   empty: 'No signed copies to store.' },
    { title: 'Requested from client', dot: '#3b659d', items: requested, empty: 'No open requests.' },
  ]

  return (
    <div className="es-in flex flex-col gap-6 max-w-[1240px]">
      <ScreenHeader eyebrow="Documents" title="Review queue" sub="Drafts, signed copies and requested documents across your clients."
        right={!requestOpen && <button onClick={() => setRequestOpen(true)} className={primaryBtn}>Request a document</button>} />
      {requestOpen && <RequestDocumentPanel families={families} onSend={onCreateRequest} onClose={() => setRequestOpen(false)} busy={requestBusy} error={requestError} />}
      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {lanes.map(lane => (
          <section key={lane.title} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 px-1"><Dot color={lane.dot} /><span className="text-[12px] uppercase tracking-[0.1em] font-bold text-stone-700">{lane.title}</span><span className="text-[12px] text-stone-400">{lane.items.length}</span></div>
            {lane.items.length === 0 && <p className="text-[12.5px] text-stone-400 px-1 m-0">{lane.empty}</p>}
            {lane.items.map(it => (
              <Card key={it.key} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between gap-2 items-start">
                  <div className="text-[14px] font-semibold text-stone-900 leading-[1.3]">{it.title}</div>
                  <Pill status={it.tagStatus}>{it.tag}</Pill>
                </div>
                <div className="text-[12.5px] text-stone-500">{it.client} · {it.when}</div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <button type="button" onClick={it.go} className={pillBtn}>{it.cta}</button>
                  {it.secondary && <button type="button" onClick={it.secondary.go} className="text-[12px] font-semibold text-stone-400 hover:text-stone-700">{it.secondary.label}</button>}
                </div>
              </Card>
            ))}
          </section>
        ))}
      </div>
      {isDemo && <p className="text-[12px] text-stone-400 m-0">Demo mode: requests and status changes stay on this screen and no emails are sent.</p>}
    </div>
  )
}

// ── Matters ──────────────────────────────────────────────────────────────────
function MatterEditor({ families, initial, onSave, onCancel, busy }) {
  const accepted = families.filter(f => f.invite_status === 'accepted')
  const [m, setM] = useState(() => ({
    id: initial?.id ?? null, client_id: initial?.client_id ?? accepted[0]?.id ?? '', kind: initial?.kind ?? 'estate_plan',
    title: initial?.title ?? '', stage: initial?.stage ?? 0, next_step: initial?.next_step ?? '', due_date: initial?.due_date ?? '',
  }))
  const set = (k, v) => setM(s => ({ ...s, [k]: v }))
  const names = STAGES[m.kind]
  const labelCls = `${eyebrowCls} flex flex-col gap-1.5`
  return (
    <form onSubmit={e => { e.preventDefault(); if (!m.client_id || !m.title.trim()) return; onSave({ ...m, title: m.title.trim(), next_step: m.next_step.trim() || null, due_date: m.due_date || null }) }}
      className="card-light p-6 !border-navy-200 !bg-navy-50 flex flex-col gap-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <label className={labelCls}>Client<select value={m.client_id} onChange={e => set('client_id', e.target.value)} className={`${inputCls} normal-case tracking-normal font-normal`} disabled={!!initial}>{accepted.map(f => <option key={f.id} value={f.id}>{f.owner_name}</option>)}</select></label>
        <label className={labelCls}>Kind<select value={m.kind} onChange={e => set('kind', e.target.value)} className={`${inputCls} normal-case tracking-normal font-normal`}><option value="estate_plan">Estate plan</option><option value="probate">Probate</option></select></label>
        <label className={labelCls}>Title<input value={m.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Okafor: mirror wills and joint LPA" className={`${inputCls} normal-case tracking-normal font-normal`} required /></label>
        <label className={labelCls}>Stage<select value={m.stage} onChange={e => set('stage', Number(e.target.value))} className={`${inputCls} normal-case tracking-normal font-normal`}>{names.map((n, i) => <option key={n} value={i}>{i + 1}. {n}</option>)}</select></label>
        <label className={labelCls}>Next step<input value={m.next_step} onChange={e => set('next_step', e.target.value)} placeholder="What has to happen next" className={`${inputCls} normal-case tracking-normal font-normal`} /></label>
        <label className={labelCls}>Due<input type="date" value={m.due_date || ''} onChange={e => set('due_date', e.target.value)} className={`${inputCls} normal-case tracking-normal font-normal`} /></label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={secondaryBtn}>Cancel</button>
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? <Loader2 size={14} className="animate-spin" /> : initial ? 'Save matter' : 'Open matter'}</button>
      </div>
    </form>
  )
}

export function MattersScreen({ families, workspace, onSaveMatter, onDeleteMatter, busy, isDemo }) {
  const [editing, setEditing] = useState(null)   // null | 'new' | matter
  const matters = workspace.matters || []
  const nameOf = (id, fallback) => families.find(f => f.id === id)?.owner_name || fallback || 'Client'
  const save = async (m) => { await onSaveMatter(m); setEditing(null) }

  return (
    <div className="es-in flex flex-col gap-6 max-w-[1240px]">
      <ScreenHeader eyebrow="Matters" title="Estate & probate progress" sub="Where each matter stands, and what's blocking the next step."
        right={editing !== 'new' && <button onClick={() => setEditing('new')} className={primaryBtn}><Plus size={14} /> New matter</button>} />
      {editing === 'new' && <MatterEditor families={families} onSave={save} onCancel={() => setEditing(null)} busy={busy} />}
      {matters.length === 0 && editing !== 'new' && (
        <Card className="p-10 text-center"><p className="text-[13.5px] text-stone-400 m-0">No matters yet. Open one to track an estate plan or a probate from instruction to storage.</p></Card>
      )}
      <div className="flex flex-col gap-4">
        {matters.map(m => {
          const names = STAGES[m.kind] || STAGES.estate_plan
          const stage = Math.min(4, Math.max(0, m.stage || 0))
          const due = matterDue(m)
          if (editing && editing !== 'new' && editing.id === m.id) {
            return <MatterEditor key={m.id} families={families} initial={m} onSave={save} onCancel={() => setEditing(null)} busy={busy} />
          }
          return (
            <Card key={m.id} className="p-6 grid gap-7 items-center" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="min-w-0">
                <Pill tone={m.kind === 'probate' ? 'navy' : 'sage'}>{KIND_LABEL[m.kind] || m.kind}</Pill>
                <div className="font-display text-[22px] text-navy-950 mt-2 leading-[1.15]">{m.title}</div>
                <div className="text-[12.5px] text-stone-500 mt-1">{nameOf(m.client_id, m.client_name)} · opened {fmtDate(m.opened_at)}{m.closed_at ? ` · closed ${fmtDate(m.closed_at)}` : ''}</div>
              </div>
              <div>
                <div className="grid grid-cols-5 gap-1">
                  {names.map((n, i) => <div key={n} title={n} className={`h-2 rounded-full ${i < stage ? 'bg-navy-600' : i === stage ? 'bg-navy-300' : 'bg-stone-200'}`} />)}
                </div>
                <div className="flex justify-between mt-2 text-[11px] text-stone-400"><span>{names[0]}</span><span className="text-navy-600 font-semibold">{names[stage]}</span><span>{names[4]}</span></div>
              </div>
              <div className="min-w-0 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className={eyebrowCls}>Next step</div>
                  <div className="text-[13.5px] font-semibold text-stone-900 mt-1">{m.next_step || (stage >= 4 ? 'Nothing further' : 'Not set')}</div>
                  <div className={`text-[12px] mt-0.5 ${due.urgent ? 'text-amber-800 font-semibold' : 'text-stone-500'}`}>{due.text}</div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button type="button" onClick={() => setEditing(m)} className={pillBtn}>Update</button>
                  {stage < 4 && <button type="button" onClick={() => onSaveMatter({ ...m, stage: stage + 1 })} className="text-[12px] font-semibold text-navy-600 hover:text-navy-800">Advance to {names[stage + 1]}</button>}
                  <button type="button" onClick={() => onDeleteMatter(m.id)} className="text-[12px] text-stone-400 hover:text-red-600 inline-flex items-center gap-1"><Trash2 size={11} /> Remove</button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      {isDemo && <p className="text-[12px] text-stone-400 m-0">Demo mode: changes stay on this screen.</p>}
    </div>
  )
}

export { X }
