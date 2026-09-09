// Adviser Portal v2 screens shared by both roles: Overview, Clients, Client
// detail, Alerts, Guides and Settings. The solicitor-only screens live in
// ./solicitor.jsx; the shell that switches between them is AdvisorPortal.jsx.
//
import React, { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Loader2, Lock, Search, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  ActivationBanner, AdviserInvoicesCard, AdviserTeamCard, AdvisorAccessTab, Avatar, Card, CardTitle, Dot, EstatePackButton,
  FamilyAccountsTab, FamilyActivityTab, FamilyAlertsTab, FamilyDocumentsTab, FamilyInstructionsTab, FamilyPeopleTab,
  LockedTabPanel, Pill, READINESS_COLOR, SEV_DOT, STALE_DAYS, ScreenHeader, activityPhrase, daysSince, daysUntil, eyebrowCls,
  firstName, fmtDate, greeting, inputCls, linkBtn, pillBtn, primaryBtn, printClientSummary, relativeTime, secondaryBtn, shortAgo,
} from './shared'
import { KIND_LABEL, matterDue, matterStageLabel } from './solicitor'

const hasExecutor = (f) => (f.trusted_people || []).some(p => (p.role || '').toLowerCase().includes('executor'))
const unreadOf = (f, readIds) => (f.alerts || []).filter(a => !a.is_read && !readIds.has(`${f.id}:${a.id}`))

// ── Everything the Overview shows, derived from the loaded data ──────────────
export function deriveOverview({ families, workspace, role, readIds }) {
  const sol = role === 'solicitor'
  const accepted = families.filter(f => f.invite_status === 'accepted')
  const pending  = families.filter(f => f.invite_status !== 'accepted')
  const avg = accepted.length ? Math.round(accepted.reduce((t, f) => t + (f.readiness_score || 0), 0) / accepted.length) : 0
  const below50 = accepted.filter(f => (f.readiness_score || 0) < 50).length
  const stale = accepted.filter(f => daysSince(f.last_updated) > STALE_DAYS)
  const unread = families.flatMap(f => unreadOf(f, readIds))
  const reviews  = workspace.reviews || []
  const requests = workspace.requests || []
  const matters  = (workspace.matters || []).filter(m => !m.closed_at)
  const awaiting = reviews.filter(r => r.review_status === 'draft' || r.review_status === 'in_review').length
    + reviews.filter(r => r.review_status === 'signed').length
    + requests.filter(r => r.status === 'uploaded').length

  const actions = []
  if (sol) {
    for (const r of reviews.filter(r => r.review_status === 'draft' || r.review_status === 'in_review')) {
      actions.push({ sev: 'critical', title: `Review ${r.document_name}`, meta: `${r.client_name} · uploaded ${relativeTime(r.document_updated_at || r.reviewed_at)} · awaiting your sign-off`, cta: 'Open draft', go: { client: r.client_id, tab: 'documents' } })
    }
    for (const r of requests.filter(r => r.status === 'uploaded')) {
      actions.push({ sev: 'warning', title: `${r.doc_type} has arrived from ${firstName(r.client_name)}`, meta: `${r.client_name} · attached ${relativeTime(r.uploaded_at)}`, cta: 'Review', go: { screen: 'review' } })
    }
    for (const m of matters) {
      const due = matterDue(m)
      if (due.urgent) actions.push({ sev: daysUntil(m.due_date) < 0 ? 'critical' : 'warning', title: m.title, meta: `${m.next_step || matterStageLabel(m)} · ${due.text}`, cta: 'Open matter', go: { screen: 'matters' } })
    }
  }
  for (const f of accepted) {
    if (f.advisor_permissions?.people && f.trusted_people && !hasExecutor(f)) {
      actions.push({ sev: 'critical', title: `${f.owner_name} has no executor assigned`, meta: `Readiness ${f.readiness_score}%${f.documents?.length === 0 ? ' · no documents yet' : ''}`, cta: 'View plan', go: { client: f.id } })
    }
    const inactive = daysSince(f.last_updated)
    if (inactive > STALE_DAYS && Number.isFinite(inactive)) {
      actions.push({ sev: 'warning', title: `${f.owner_name} inactive for ${inactive} days`, meta: `Readiness ${f.readiness_score}%${unreadOf(f, readIds).length ? ` · ${unreadOf(f, readIds)[0].title}` : ''}`, cta: 'View plan', go: { client: f.id } })
    }
    if (f.next_review_date) {
      const d = daysUntil(f.next_review_date)
      if (d <= 14) actions.push({ sev: 'info', title: `Review ${d < 0 ? 'overdue' : 'due'} for ${f.owner_name}`, meta: `${d < 0 ? `Was due ${fmtDate(f.next_review_date)}` : d === 0 ? 'Due today' : `In ${d} day${d === 1 ? '' : 's'}`} · from your notes`, cta: 'Open notes', go: { client: f.id } })
    }
  }
  for (const f of pending) {
    const sent = daysSince(f.last_updated)
    if (sent > 7) actions.push({ sev: 'warning', title: `${f.owner_name} hasn't accepted their invite`, meta: `Sent ${sent} days ago`, cta: 'Resend invite', go: { client: f.id } })
  }
  const order = { critical: 0, warning: 1, info: 2 }
  actions.sort((a, b) => order[a.sev] - order[b.sev])

  const upcoming = []
  for (const f of accepted) {
    if (f.next_review_date) upcoming.push({ date: f.next_review_date, title: `Review meeting: ${f.owner_name}`, who: 'From your notes' })
    for (const d of f.documents || []) if (d.expires_at) upcoming.push({ date: d.expires_at, title: `${d.name} expires`, who: f.owner_name })
  }
  for (const m of matters) if (m.due_date) upcoming.push({ date: m.due_date, title: m.title, who: `${KIND_LABEL[m.kind] || m.kind} · ${m.next_step || matterStageLabel(m)}` })
  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date))
  const upcomingSoon = upcoming.filter(u => daysUntil(u.date) >= -7).slice(0, 5)

  const readiness = [...accepted].sort((a, b) => (a.readiness_score || 0) - (b.readiness_score || 0))

  const activity = families.flatMap(f => (f.activity_log || []).map(a => ({ ...a, who: f.owner_name, family_id: f.id })))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)

  return { sol, accepted, avg, below50, stale, unread, awaiting, actions, upcoming: upcomingSoon, readiness, activity }
}

export function OverviewScreen({ advisor, role, families, workspace, readIds, go, openClient, onInvite, onRequest }) {
  const d = useMemo(() => deriveOverview({ families, workspace, role, readIds }), [families, workspace, role, readIds])
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const summary = d.sol
    ? `${d.actions.length} thing${d.actions.length === 1 ? '' : 's'} need${d.actions.length === 1 ? 's' : ''} you today · ${d.awaiting} document${d.awaiting === 1 ? '' : 's'} awaiting review · ${d.unread.length} unread alert${d.unread.length === 1 ? '' : 's'}`
    : `${d.actions.length} thing${d.actions.length === 1 ? '' : 's'} need${d.actions.length === 1 ? 's' : ''} you today · ${d.unread.length} unread alert${d.unread.length === 1 ? '' : 's'} · ${d.stale.length} stale plan${d.stale.length === 1 ? '' : 's'}`
  const kpis = [
    { label: 'Avg readiness', value: `${d.avg}%`, hint: `across ${d.accepted.length} active plan${d.accepted.length === 1 ? '' : 's'}`, go: () => go('clients') },
    { label: 'Below 50%', value: d.below50, hint: 'plans needing a nudge', go: () => go('clients') },
    d.sol
      ? { label: 'Awaiting review', value: d.awaiting, hint: 'drafts, signed copies, arrivals', go: () => go('review'), delta: d.awaiting ? `${d.awaiting} open` : '', deltaCls: 'text-amber-800' }
      : { label: 'Unread alerts', value: d.unread.length, hint: 'across all clients', go: () => go('alerts') },
    { label: 'Stale plans', value: d.stale.length, hint: `no activity in ${STALE_DAYS}+ days`, go: () => go('clients') },
  ]
  const follow = (a) => a.go.screen ? go(a.go.screen) : openClient(a.go.client, a.go.tab)

  return (
    <div className="es-in flex flex-col gap-7 max-w-[1240px]">
      <ScreenHeader eyebrow={today} title={`${greeting()}, ${firstName(advisor?.full_name) || 'there'}.`} sub={summary}
        right={<>
          {d.sol && <button onClick={onRequest} className={secondaryBtn}>Request a document</button>}
          <button onClick={onInvite} className={primaryBtn}>+ Invite a client</button>
        </>} />

      <div className="card-light overflow-hidden grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {kpis.map(k => (
          <button key={k.label} onClick={k.go} className="text-left px-6 py-5 border-r border-b border-stone-200 -mb-px bg-white hover:bg-stone-100 transition-colors flex flex-col gap-1.5">
            <span className={eyebrowCls}>{k.label}</span>
            <span className="flex items-baseline gap-2"><span className="font-display text-[36px] leading-none text-navy-950">{k.value}</span>{k.delta && <span className={`text-[12px] font-semibold ${k.deltaCls || 'text-sage-700'}`}>{k.delta}</span>}</span>
            <span className="text-[12px] text-stone-400">{k.hint}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card className="px-6 pt-6 pb-3">
          <CardTitle right={<span className="text-[12px] text-stone-500">{d.actions.length} item{d.actions.length === 1 ? '' : 's'} · sorted by urgency</span>} className="mb-1.5">Needs your attention</CardTitle>
          {d.actions.length === 0 && <p className="text-[13.5px] text-stone-400 py-6 m-0">Nothing needs you right now. Everything your clients shared is up to date.</p>}
          {d.actions.map((a, i) => (
            <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3.5 items-center py-3.5 border-t border-stone-100">
              <Dot color={SEV_DOT[a.sev]} />
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-stone-900">{a.title}</div>
                <div className="text-[12.5px] text-stone-500 mt-0.5">{a.meta}</div>
              </div>
              <button onClick={() => follow(a)} className={pillBtn}>{a.cta}</button>
            </div>
          ))}
        </Card>
        <Card className="p-6">
          <CardTitle className="mb-3.5">Coming up</CardTitle>
          {d.upcoming.length === 0 && <p className="text-[13.5px] text-stone-400 m-0">Nothing dated yet. Review dates from your notes, document expiries and matter due dates appear here.</p>}
          <div className="flex flex-col gap-3">
            {d.upcoming.map((u, i) => {
              const dt = new Date(u.date)
              return (
                <div key={i} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 items-center">
                  <div className="text-center bg-navy-50 rounded-[10px] py-1.5 leading-none">
                    <div className="text-[10px] tracking-[0.08em] uppercase text-navy-600 font-bold">{dt.toLocaleDateString('en-GB', { month: 'short' })}</div>
                    <div className="font-display text-[22px] text-navy-950 mt-0.5">{String(dt.getDate()).padStart(2, '0')}</div>
                  </div>
                  <div className="min-w-0"><div className="text-[13.5px] font-semibold text-stone-900 truncate">{u.title}</div><div className="text-[12px] text-stone-500 truncate">{u.who}</div></div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Card className="p-6">
          <CardTitle right={<button onClick={() => go('clients')} className={linkBtn}>All clients →</button>} className="mb-3.5">Readiness by client</CardTitle>
          {d.readiness.length === 0 && <p className="text-[13.5px] text-stone-400 m-0">No accepted clients yet.</p>}
          {d.readiness.map(f => {
            const col = READINESS_COLOR(f.readiness_score || 0)
            const days = daysSince(f.last_updated)
            const staleF = days > STALE_DAYS
            return (
              <button key={f.id} onClick={() => openClient(f.id)} className="w-full grid grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_44px] gap-4 items-center py-3 border-t border-stone-100 text-left hover:bg-stone-50 -mx-2 px-2 rounded-lg">
                <div className="min-w-0"><div className="text-[14px] font-semibold text-stone-900 truncate">{f.owner_name}</div><div className={`text-[12px] ${staleF ? 'text-amber-800' : 'text-stone-500'}`}>{Number.isFinite(days) ? `${staleF ? 'Last active' : 'Active'} ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}` : 'No activity yet'}</div></div>
                <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden"><div className={`h-full rounded-full ${col.bar}`} style={{ width: `${f.readiness_score || 0}%` }} /></div>
                <div className={`text-[13px] font-bold text-right ${col.text}`}>{f.readiness_score || 0}%</div>
              </button>
            )
          })}
        </Card>
        <Card className="p-6">
          <CardTitle className="mb-3.5">Recent client activity</CardTitle>
          {d.activity.length === 0 && <p className="text-[13.5px] text-stone-400 m-0">When clients add accounts, documents or people, it shows here.</p>}
          <div className="flex flex-col gap-3.5">
            {d.activity.map(ev => (
              <div key={`${ev.family_id}-${ev.id}`} className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-2.5 items-start">
                <Avatar name={ev.who} size={28} tone="sage" />
                <div className="min-w-0 text-[13px] text-stone-700 leading-[1.4]"><strong className="text-stone-900 font-semibold">{ev.who}</strong> {activityPhrase(ev)}</div>
                <span className="text-[11.5px] text-stone-400 whitespace-nowrap">{shortAgo(ev.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-[12px] text-stone-500 m-0"><Lock size={14} className="shrink-0" />You only see what clients have explicitly shared with you. Clients retain full control of their plans at all times.</p>
    </div>
  )
}

// ── Clients ──────────────────────────────────────────────────────────────────
export function ClientsScreen({ role, families, workspace, query, setQuery, openClient, onInvite }) {
  const sol = role === 'solicitor'
  const q = query.trim().toLowerCase()
  const rows = families.filter(f => f.owner_name.toLowerCase().includes(q))
  const matterFor = (id) => (workspace.matters || []).filter(m => m.client_id === id && !m.closed_at).sort((a, b) => new Date(a.due_date || '2999-01-01') - new Date(b.due_date || '2999-01-01'))[0]
  const gridCols = 'minmax(0,2fr) minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr) 32px'
  return (
    <div className="es-in flex flex-col gap-6 max-w-[1240px]">
      <ScreenHeader eyebrow="Clients" title="Your families" right={<>
        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clients…" className="w-[220px] max-w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-white text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy-300" /></div>
        <button onClick={onInvite} className={primaryBtn}>+ Invite a client</button>
      </>} />
      <Card className="overflow-hidden">
        <div className="hidden md:grid gap-4 px-6 py-3 border-b border-stone-200" style={{ gridTemplateColumns: gridCols }}>
          {['Client', 'Readiness', sol ? 'Matter status' : 'Shared with you', 'Last activity', ''].map(h => <span key={h} className={eyebrowCls}>{h}</span>)}
        </div>
        {rows.length === 0 && <p className="px-6 py-8 text-center text-[13.5px] text-stone-400 m-0">{families.length === 0 ? 'No clients yet. Invite your first family to get started.' : 'No clients match your search.'}</p>}
        {rows.map(f => {
          const pending = f.invite_status !== 'accepted'
          const col = READINESS_COLOR(f.readiness_score || 0)
          const days = daysSince(f.last_updated)
          const staleF = !pending && days > STALE_DAYS
          const m = sol ? matterFor(f.id) : null
          const third = pending ? '' : sol
            ? (m ? `${matterStageLabel(m)} · ${m.title}` : 'No matter yet')
            : `${(f.documents || []).length} doc${(f.documents || []).length === 1 ? '' : 's'} · ${(f.accounts || []).length} account${(f.accounts || []).length === 1 ? '' : 's'}`
          return (
            <button key={f.id} onClick={() => openClient(f.id)} className="w-full grid gap-3 md:gap-4 items-center px-6 py-4 border-b border-stone-100 last:border-0 text-left hover:bg-stone-50 transition-colors" style={{ gridTemplateColumns: gridCols }}>
              <div className="flex items-center gap-3 min-w-0 col-span-5 md:col-span-1">
                <Avatar name={f.owner_name} tone={pending ? 'muted' : 'navy'} />
                <div className="min-w-0"><div className="text-[14.5px] font-semibold text-stone-900 truncate">{f.owner_name}</div><div className="text-[12px] text-stone-500 truncate">{pending ? `Invited ${relativeTime(f.last_updated)}` : f.owner_status === 'deceased' ? 'Vault activated' : (f.owner_email || '')}</div></div>
              </div>
              {pending
                ? <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-[3px] w-max col-span-5 md:col-span-1">Invite pending · {Number.isFinite(days) ? `${days} days` : ''}</span>
                : <div className="flex items-center gap-2.5 col-span-5 md:col-span-1"><div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden"><div className={`h-full rounded-full ${col.bar}`} style={{ width: `${f.readiness_score || 0}%` }} /></div><span className={`text-[13px] font-bold w-9 text-right ${col.text}`}>{f.readiness_score || 0}%</span></div>}
              <span className="text-[13px] text-stone-700 truncate hidden md:block">{third || '—'}</span>
              <span className={`text-[13px] hidden md:block ${staleF ? 'text-amber-800 font-semibold' : 'text-stone-700'}`}>{pending ? 'Not yet joined' : Number.isFinite(days) ? (days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`) : '—'}</span>
              <ChevronRight size={16} className="text-stone-400 hidden md:block justify-self-end" />
            </button>
          )
        })}
      </Card>
    </div>
  )
}

// ── Client detail ────────────────────────────────────────────────────────────
function PrivateNotesCard({ family, isDemo, onSaved }) {
  const [notes, setNotes]   = useState(family.advisor_notes ?? '')
  const [review, setReview] = useState(family.next_review_date ?? '')
  const [state, setState]   = useState('idle')
  useEffect(() => { setNotes(family.advisor_notes ?? ''); setReview(family.next_review_date ?? '') }, [family.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    setState('saving')
    try {
      if (!isDemo) {
        const { error } = await supabase.rpc('save_adviser_client_note', { p_client_id: family.id, p_notes: notes || null, p_next_review: review || null, p_meeting_notes: family.meeting_notes || null })
        if (error) throw error
      }
      onSaved?.({ advisor_notes: notes, next_review_date: review })
      setState('saved'); setTimeout(() => setState('idle'), 2000)
    } catch { setState('error') }
  }
  return (
    <section className="rounded-2xl p-[22px] text-stone-50" style={{ background: 'linear-gradient(135deg,#0d1628,#1d3052)' }}>
      <span className="section-label section-label-dark block mb-2">Private notes</span>
      <textarea value={notes} onChange={e => { setNotes(e.target.value); if (state !== 'idle') setState('idle') }} placeholder="Only visible to you and your firm…"
        className="w-full min-h-[96px] resize-y rounded-[10px] border border-white/15 bg-white/5 text-stone-50 placeholder:text-navy-200/70 px-3 py-2.5 text-[13px] leading-[1.5] focus:outline-none focus:ring-2 focus:ring-white/20" />
      <div className="flex flex-wrap justify-between items-center gap-2 mt-2.5">
        <label className="flex items-center gap-2 text-[11.5px] text-navy-200">Next review
          <input type="date" value={review || ''} onChange={e => { setReview(e.target.value); if (state !== 'idle') setState('idle') }} className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-[11.5px] text-stone-50 focus:outline-none" />
        </label>
        <button onClick={save} disabled={state === 'saving'} className="rounded-full bg-stone-50 text-navy-950 text-[12.5px] font-semibold px-3.5 py-[7px] disabled:opacity-60">
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved ✓' : state === 'error' ? 'Could not save' : 'Save notes'}
        </button>
      </div>
    </section>
  )
}

export function ClientDetailScreen({ family, role, isDemo, workspace, detailTab, setDetailTab, goClients, onNotesSaved, onSetReview, onResendInvite }) {
  const sol = role === 'solicitor'
  const perms = family.advisor_permissions ?? { accounts: true, documents: true, instructions: true, people: true, alerts: true }
  const col = READINESS_COLOR(family.readiness_score || 0)
  const pending = family.invite_status !== 'accepted'
  const reviewsById = useMemo(() => Object.fromEntries((workspace.reviews || []).filter(r => r.client_id === family.id).map(r => [r.document_id, r])), [workspace.reviews, family.id])
  const days = daysSince(family.last_updated)
  const [resend, setResend] = useState('idle')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Accounts', count: family.accounts?.length, locked: !perms.accounts },
    { id: 'documents', label: 'Documents', count: family.documents?.length, locked: !perms.documents },
    { id: 'instructions', label: 'Instructions', count: family.instructions?.length, locked: !perms.instructions },
    { id: 'people', label: 'People', count: family.trusted_people?.length, locked: !perms.people },
    { id: 'alerts', label: 'Alerts', count: family.alerts?.length, locked: !perms.alerts },
    { id: 'activity', label: 'Activity' },
    { id: 'access', label: 'Adviser access' },
  ]
  const checklist = [
    { label: 'Vault created', done: true },
    { label: 'First account added', done: (family.accounts || []).length > 0, hidden: !perms.accounts },
    { label: 'First document added', done: (family.documents || []).length > 0, hidden: !perms.documents },
    { label: 'Executor assigned', done: hasExecutor(family), hidden: !perms.people },
    { label: 'Instructions added', done: (family.instructions || []).length > 0, hidden: !perms.instructions },
  ].filter(i => !i.hidden)

  const doResend = async () => {
    if (isDemo || resend === 'sending') return
    setResend('sending')
    try { await onResendInvite?.(family); setResend('sent') } catch { setResend('error') }
    setTimeout(() => setResend('idle'), 3000)
  }

  return (
    <div className="es-in flex flex-col gap-[22px] max-w-[1240px]">
      <button onClick={goClients} className={`${linkBtn} self-start`}>← All clients</button>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-[18px]">
          <span className="w-[60px] h-[60px] rounded-full bg-navy-100 text-navy-700 inline-flex items-center justify-center font-display text-[28px] font-medium shrink-0">{family.owner_name?.[0]?.toUpperCase()}</span>
          <div>
            <span className="section-label section-label-light block mb-1">{pending ? 'Invited' : family.owner_status === 'deceased' ? 'Vault activated' : family.owner_status === 'incapacitated' ? 'Vault activated' : 'Client'}</span>
            <h1 className="font-display font-normal text-[32px] sm:text-[36px] leading-[1.1] text-navy-950 m-0">{family.owner_name}</h1>
            <p className="mt-1.5 text-[13.5px] text-stone-500 m-0">
              {pending ? 'Invite pending: their plan becomes visible once they accept' : `${Number.isFinite(days) ? `Last active ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}` : 'No activity yet'} · ${(family.documents || []).length} document${(family.documents || []).length === 1 ? '' : 's'} · ${(family.trusted_people || []).length} trusted ${(family.trusted_people || []).length === 1 ? 'person' : 'people'}`}
            </p>
          </div>
        </div>
        {!pending && (
          <div className="flex items-center gap-[18px] flex-wrap">
            <div>
              <div className={eyebrowCls}>Plan readiness</div>
              <div className="flex items-center gap-2.5 mt-1.5"><div className="w-[140px] h-1.5 rounded-full bg-stone-100 overflow-hidden"><div className={`h-full rounded-full ${col.bar}`} style={{ width: `${family.readiness_score || 0}%` }} /></div><span className={`font-display text-[26px] leading-none ${col.text}`}>{family.readiness_score || 0}%</span></div>
            </div>
            <button onClick={() => printClientSummary(family)} className={secondaryBtn}>Print summary</button>
            <EstatePackButton family={family} isDemo={isDemo} />
          </div>
        )}
      </header>

      {pending ? (
        <Card className="p-10 text-center space-y-3">
          <p className="text-[14px] text-stone-700 m-0"><strong>{family.owner_name}</strong> has been sent an invitation to join Everstead. Once they accept, their plan appears here.</p>
          <button onClick={doResend} disabled={resend === 'sending'} className={primaryBtn}>{resend === 'sending' ? <Loader2 size={14} className="animate-spin" /> : null}{resend === 'sent' ? 'Invite sent ✓' : resend === 'error' ? 'Could not resend' : 'Resend invite'}</button>
        </Card>
      ) : (
        <>
          <ActivationBanner family={family} />
          <div className="flex flex-wrap gap-1 border-b border-stone-200">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setDetailTab(t.id)} className={`px-3.5 py-2.5 text-[13.5px] font-semibold whitespace-nowrap -mb-px border-b-2 transition-colors inline-flex items-center gap-1.5 ${detailTab === t.id ? 'text-navy-950 border-navy-600' : 'text-stone-500 border-transparent hover:text-navy-950'}`}>
                {t.locked && <Lock size={11} className="opacity-60" />}{t.label}
                {t.count > 0 && !t.locked && <span className="text-[11px] bg-navy-50 text-navy-600 rounded-full px-[7px] py-px">{t.count}</span>}
              </button>
            ))}
          </div>

          {detailTab === 'overview' && (
            <div className="grid gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <div className="flex flex-col gap-6">
                <Card className="p-6">
                  <CardTitle size={22} className="mb-3">What's missing</CardTitle>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    {checklist.map(i => (
                      <div key={i.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-stone-50">
                        <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[12px] font-bold ${i.done ? 'bg-sage-500 text-white' : 'bg-stone-200 text-stone-500'}`}>{i.done ? '✓' : '·'}</span>
                        <span className={`text-[13px] ${i.done ? 'text-stone-900' : 'text-stone-500'}`}>{i.label}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-6">
                  <CardTitle size={22} className="mb-3" right={perms.documents && (family.documents || []).length > 0 && <button onClick={() => setDetailTab('documents')} className={linkBtn}>All →</button>}>Documents</CardTitle>
                  {!perms.documents ? <p className="text-[13px] text-stone-400 m-0">Not shared with your firm.</p>
                    : (family.documents || []).length === 0 ? <p className="text-[13px] text-stone-400 m-0">No documents yet.</p>
                    : (family.documents || []).slice(0, 5).map(d => (
                      <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center py-3 border-t border-stone-100">
                        <div className="min-w-0"><div className="text-[14px] font-semibold text-stone-900 truncate">{d.name}</div><div className="text-[12px] text-stone-500">{d.doc_type}{d.updated_at ? ` · updated ${fmtDate(d.updated_at)}` : ''}</div></div>
                        <div className="flex gap-1.5">{reviewsById[d.id] && <Pill status={reviewsById[d.id].review_status}>{reviewsById[d.id].review_status.replace('_', ' ')}</Pill>}<Pill status={d.status} /></div>
                      </div>
                    ))}
                </Card>
              </div>
              <div className="flex flex-col gap-6">
                <Card className="p-6">
                  <CardTitle size={22} className="mb-3">Trusted people</CardTitle>
                  {!perms.people ? <p className="text-[13px] text-stone-400 m-0">Not shared with your firm.</p>
                    : (family.trusted_people || []).length === 0 ? <p className="text-[13px] text-stone-400 m-0">No trusted people yet.</p>
                    : <div className="flex flex-col gap-3">{(family.trusted_people || []).map(p => (
                        <div key={p.id} className="flex items-center gap-3"><Avatar name={p.name} size={32} /><div className="flex-1 min-w-0"><div className="text-[13.5px] font-semibold text-stone-900 truncate">{p.name}</div><div className="text-[12px] text-stone-500">{p.role}</div></div><Pill status={p.invite_status} /></div>
                      ))}</div>}
                </Card>
                <PrivateNotesCard family={family} isDemo={isDemo} onSaved={onNotesSaved} />
              </div>
            </div>
          )}
          {detailTab === 'accounts'     && (!perms.accounts     ? <LockedTabPanel section="Accounts" />     : <FamilyAccountsTab accounts={family.accounts || []} />)}
          {detailTab === 'documents'    && (!perms.documents    ? <LockedTabPanel section="Documents" />    : <FamilyDocumentsTab documents={family.documents || []} clientId={family.id} isDemo={isDemo} reviews={reviewsById} solicitor={sol} onSetReview={(docId, status) => onSetReview(family.id, docId, status)} />)}
          {detailTab === 'instructions' && (!perms.instructions ? <LockedTabPanel section="Instructions" /> : <FamilyInstructionsTab instructions={family.instructions || []} />)}
          {detailTab === 'people'       && (!perms.people       ? <LockedTabPanel section="People" />       : <FamilyPeopleTab people={family.trusted_people || []} />)}
          {detailTab === 'alerts'       && (!perms.alerts       ? <LockedTabPanel section="Alerts" />       : <FamilyAlertsTab alerts={family.alerts || []} />)}
          {detailTab === 'activity'     && <FamilyActivityTab activityLog={family.activity_log || []} ownerName={family.owner_name} />}
          {detailTab === 'access'       && <AdvisorAccessTab family={family} permissions={perms} />}
        </>
      )}
    </div>
  )
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export function AlertsScreen({ families, readIds, markRead, markAllRead, openClient }) {
  const rows = families.flatMap(f => (f.alerts || []).map(a => ({ ...a, key: `${f.id}:${a.id}`, family_id: f.id, client: f.owner_name })))
    .map(a => ({ ...a, read: a.is_read || readIds.has(a.key) }))
    .sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1
      const o = { critical: 0, warning: 1, info: 2 }
      return (o[a.severity] ?? 2) - (o[b.severity] ?? 2)
    })
  const unread = rows.filter(a => !a.read).length
  return (
    <div className="es-in flex flex-col gap-6 max-w-[960px]">
      <ScreenHeader eyebrow="Alerts" title={`${unread} unread`} right={unread > 0 && <button onClick={markAllRead} className={linkBtn}>Mark all as read</button>} />
      {rows.length === 0 && <Card className="p-10 text-center"><p className="text-[13.5px] text-stone-400 m-0">No alerts across your clients. Alerts only show for clients who share them with you.</p></Card>}
      <div className="flex flex-col gap-2.5">
        {rows.map(a => (
          <button key={a.key} onClick={() => { markRead(a.key); openClient(a.family_id, 'alerts') }} className={`grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3.5 items-center w-full px-5 py-4 rounded-2xl border border-stone-200 text-left hover:border-navy-200 transition-colors ${a.read ? 'bg-stone-50' : 'bg-white'}`}>
            <Dot color={a.read ? '#e7e5e4' : SEV_DOT[a.severity] || SEV_DOT.info} />
            <div className="min-w-0"><div className={`text-[14px] ${a.read ? 'font-medium text-stone-500' : 'font-semibold text-stone-900'}`}>{a.title}</div><div className="text-[12.5px] text-stone-500 mt-0.5">{a.client} · {relativeTime(a.created_at) || 'recently'}</div></div>
            <Pill status={a.severity} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Guides ───────────────────────────────────────────────────────────────────
const GUIDES = {
  intro: ['Introducing Everstead to a client', [
    ['Lead with control', 'Reassure clients you only see what they explicitly share. They remain in full control, and you are a trusted professional contact, not a co-owner.'],
    ['Start with one natural event', 'A new will, an LPA, a pension nomination update: anchor the invitation to something already happening.'],
    ['Review annually', 'Build a brief Everstead review into your annual meeting and prompt clients inactive for six months or more.'],
  ]],
  see: ['What you can see and why it matters', [
    ['Wills and LPAs', 'Named executors, attorneys and professional executor clauses, so there are no surprises at probate.'],
    ['Pension nominations', 'Pensions sit outside the estate for inheritance tax but nominations go stale; remind clients yearly.'],
    ['Instructions', 'Client-written guidance for executors, and a rich source of planning conversations.'],
  ]],
  review: ['Reviewing drafts in the portal', [
    ['Annotate, do not edit', 'Your review status and notes are attached to your firm\'s copy of the record; the client always keeps the original.'],
    ['Requesting documents', 'Requests appear as a secure prompt in the client\'s vault and by email. Nothing is shared until they choose to.'],
    ['Storing signed copies', 'Confirm and store: mark the signed copy as stored so the estate pack and your matters show where the original lives.'],
  ]],
  duties: ['Your professional duties', [
    ['Duty of care', 'Information accessed here remains subject to your professional confidentiality obligations.'],
    ['Data processing', 'The Adviser DPA covers how Everstead processes data on your behalf. It is linked from the footer of every page.'],
  ]],
  bodies: ['Useful bodies', [
    ['STEP', 'The Society of Trust and Estate Practitioners: referrals and technical guidance on complex or cross-border matters.'],
    ['Probate Registry', 'Grants of probate are applied for on gov.uk; complex estates should go through a solicitor.'],
    ['Office of the Public Guardian', 'LPA registration and attorney supervision. Direct line for queries: 0300 456 0300.'],
  ]],
}
export function GuidesScreen({ role }) {
  const [open, setOpen] = useState(0)
  const keys = role === 'solicitor' ? ['intro', 'see', 'review', 'bodies'] : ['intro', 'see', 'duties', 'bodies']
  return (
    <div className="es-in flex flex-col gap-6 max-w-[960px]">
      <ScreenHeader eyebrow="Guides" title="Working with clients on Everstead" />
      <div className="flex flex-col gap-2.5">
        {keys.map((k, i) => {
          const [title, items] = GUIDES[k]
          const isOpen = open === i
          return (
            <Card key={k} className="overflow-hidden">
              <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full justify-between items-center gap-4 px-[22px] py-[18px] text-left hover:bg-stone-50 transition-colors">
                <span className="font-display text-[21px] text-navy-950">{title}</span>
                <span className="text-[22px] text-stone-400 inline-block transition-transform duration-200" style={{ transform: `rotate(${isOpen ? 90 : 0}deg)` }}>›</span>
              </button>
              {isOpen && (
                <div className="px-[22px] pb-5 flex flex-col gap-3">
                  {items.map(([label, detail]) => (
                    <div key={label} className="border-t border-stone-100 pt-3"><div className="text-[13.5px] font-semibold text-stone-900">{label}</div><div className="text-[13px] text-stone-600 leading-[1.55] mt-0.5">{detail}</div></div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ── Settings ─────────────────────────────────────────────────────────────────
export function SettingsScreen({ advisor, firm, role, canSetRole, onSetRole, roleBusy, team, isDemo, onReload, firmId, families }) {
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState(null)
  const [profile, setProfile] = useState({ full_name: advisor?.full_name || '', phone: advisor?.phone || '' })
  const [profileState, setProfileState] = useState('idle')
  const isOwner = isDemo || advisor?.isOwner

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setLogoError('Please upload an image file.'); return }
    if (file.size > 2 * 1024 * 1024) { setLogoError('Logo must be under 2 MB.'); return }
    if (isDemo) { setLogoError('Logo upload is disabled in demo mode.'); return }
    setLogoError(null); setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${firmId}/logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('adviser-logos').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('adviser-logos').getPublicUrl(path)
      const { error: rpcErr } = await supabase.rpc('set_firm_logo', { p_url: publicUrl })
      if (rpcErr) throw rpcErr
      onReload?.()
    } catch (err) { setLogoError(err.message ?? 'Upload failed. Please try again.') }
    finally { setLogoUploading(false) }
  }
  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileState('saving')
    try {
      if (!isDemo) { const { error } = await supabase.from('profiles').update({ full_name: profile.full_name, phone: profile.phone }).eq('id', advisor.id); if (error) throw error }
      setProfileState('saved'); setTimeout(() => setProfileState('idle'), 2500)
    } catch { setProfileState('error') }
  }
  const planLine = [
    firm?.plan_type === 'paid' ? 'Paid plan' : 'Pilot plan',
    `up to ${advisor?.families_limit ?? 5} families`,
    firm?.pilot_end_date ? `renews ${fmtDate(firm.pilot_end_date)}` : null,
  ].filter(Boolean).join(' · ')
  const seg = (on) => `px-4 py-2 rounded-[9px] text-[13px] font-semibold transition-colors ${on ? 'bg-white text-navy-950 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`

  return (
    <div className="es-in flex flex-col gap-6 max-w-[760px]">
      <ScreenHeader eyebrow="Settings" title="Your firm" />
      <Card className="p-6 flex flex-col gap-[18px]">
        <div>
          <div className={`${eyebrowCls} mb-2`}>Your role</div>
          <div className="inline-flex bg-stone-100 rounded-xl p-1 gap-1">
            <button type="button" disabled={!canSetRole || roleBusy} onClick={() => onSetRole('ifa')} className={seg(role !== 'solicitor')}>Financial adviser</button>
            <button type="button" disabled={!canSetRole || roleBusy} onClick={() => onSetRole('solicitor')} className={seg(role === 'solicitor')}>Solicitor</button>
          </div>
          <p className="mt-2.5 text-[13px] text-stone-600 leading-[1.5] m-0">Solicitors get a review queue for wills and LPAs, document requests, and matter tracking for estate and probate work.{!canSetRole && !isDemo ? ' Only the firm owner can change this.' : ''}</p>
        </div>
        <div className="border-t border-stone-100 pt-[18px]">
          <div className={`${eyebrowCls} mb-2`}>Firm</div>
          <div className="flex items-center gap-4">
            {advisor?.logo_url ? <img src={advisor.logo_url} alt="" className="h-12 w-auto max-w-[120px] rounded-lg object-contain border border-stone-200 bg-stone-50 p-1" /> : null}
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-semibold text-stone-900">{advisor?.firm || firm?.firm_name || 'Your firm'}</div>
              <div className="text-[13px] text-stone-500">{planLine}{families ? ` · ${families.length} linked` : ''}</div>
            </div>
            {isOwner && (
              <label className={`${pillBtn} cursor-pointer ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} disabled={logoUploading || isDemo} />
                <Upload size={12} /> {logoUploading ? 'Uploading…' : advisor?.logo_url ? 'Replace logo' : 'Add logo'}
              </label>
            )}
          </div>
          {logoError && <p className="text-[12px] text-red-600 mt-2 m-0">{logoError}</p>}
        </div>
        <div className="border-t border-stone-100 pt-[18px]">
          <AdviserTeamCard team={team} isOwner={isOwner} isDemo={isDemo} onReload={onReload} />
        </div>
        <div className="border-t border-stone-100 pt-[18px]">
          <AdviserInvoicesCard isDemo={isDemo} />
        </div>
      </Card>
      <Card className="p-6">
        <div className={`${eyebrowCls} mb-3`}>You</div>
        <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1"><span className="text-[12px] font-semibold text-stone-600">Full name</span><input className={inputCls} value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} required /></label>
          <label className="block space-y-1"><span className="text-[12px] font-semibold text-stone-600">Phone</span><input className={inputCls} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+44 7700 000000" /></label>
          <label className="block space-y-1 sm:col-span-2"><span className="text-[12px] font-semibold text-stone-600">Email</span><input className={`${inputCls} bg-stone-50 text-stone-500`} value={advisor?.email || ''} readOnly /><span className="text-[11.5px] text-stone-400">To change your email, contact support@everstead.care</span></label>
          <div className="sm:col-span-2 flex items-center gap-3"><button type="submit" disabled={profileState === 'saving'} className={primaryBtn}>{profileState === 'saving' ? 'Saving…' : profileState === 'saved' ? 'Saved ✓' : 'Save changes'}</button>{profileState === 'error' && <span className="text-[12.5px] text-red-600">Could not save.</span>}</div>
        </form>
      </Card>
    </div>
  )
}
