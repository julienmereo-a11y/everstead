// Adviser Portal v2: the pieces every screen shares. Helpers, the design
// tokens as class strings, status pills, the per-client tab panels, the
// document viewer, the estate pack button, modals and the assistant.
//
// Style rules come from the v2 handoff: Cormorant Garamond for headings,
// DM Sans for UI, sage for "good", navy for action, stone for everything else.
//
import React, { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertCircle, Bell, BookOpen, CheckCircle2, Download, ExternalLink, Eye, EyeOff,
  FileText, Landmark, Loader2, Lock, Mail, Printer, Send, Shield, Sparkles, UserPlus, Users, Wallet, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Helpers ──────────────────────────────────────────────────────────────────
export const STALE_DAYS = 60

export const fmtDate = (iso, style = 'medium') => {
  if (!iso) return ''
  try { return new Intl.DateTimeFormat('en-GB', { dateStyle: style }).format(new Date(iso)) } catch { return '' }
}

export function daysSince(iso) {
  if (!iso) return Infinity
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function daysUntil(iso) {
  if (!iso) return Infinity
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export function relativeTime(iso) {
  if (!iso) return ''
  const days = daysSince(iso)
  if (!Number.isFinite(days)) return ''
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`
}

/** "2d", "3w", "4mo": the compact form the activity feed uses. */
export function shortAgo(iso) {
  const d = daysSince(iso)
  if (!Number.isFinite(d)) return ''
  if (d <= 0) return 'now'
  if (d < 7) return `${d}d`
  if (d < 30) return `${Math.floor(d / 7)}w`
  if (d < 365) return `${Math.floor(d / 30)}mo`
  return `${Math.floor(d / 365)}y`
}

export const initialOf = (name) => (String(name || '?').trim()[0] || '?').toUpperCase()
export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || ''

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// ── Tokens as classes ────────────────────────────────────────────────────────
export const primaryBtn   = 'inline-flex items-center justify-center gap-2 rounded-full bg-navy-600 hover:bg-navy-700 text-white text-[13.5px] font-semibold px-[18px] py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
export const secondaryBtn = 'inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-[13.5px] font-semibold px-[18px] py-2.5 transition-colors disabled:opacity-50'
export const pillBtn      = 'inline-flex items-center justify-center gap-1.5 rounded-full border border-stone-300 bg-white hover:bg-navy-50 hover:border-navy-200 text-navy-600 text-[12.5px] font-semibold px-3.5 py-[7px] transition-colors whitespace-nowrap disabled:opacity-50'
export const linkBtn      = 'text-[13px] font-semibold text-navy-600 hover:text-navy-800 transition-colors'
export const inputCls     = 'w-full border border-stone-300 rounded-[10px] px-3 py-2.5 text-[13.5px] bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-navy-300'
export const eyebrowCls   = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500'

export const READINESS_COLOR = (score) => {
  if (score >= 80) return { bar: 'bg-sage-500', text: 'text-sage-700', hex: '#4c7d47' }
  if (score >= 50) return { bar: 'bg-amber-600', text: 'text-amber-800', hex: '#d97706' }
  return               { bar: 'bg-red-600',   text: 'text-red-800',   hex: '#dc2626' }
}

const PILL_CLASSES = {
  sage:  'bg-sage-100 text-sage-700 border-sage-200',
  navy:  'bg-navy-100 text-navy-700 border-navy-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  stone: 'bg-stone-100 text-stone-600 border-stone-200',
  red:   'bg-red-100 text-red-800 border-red-200',
}
const PILL_TONE = {
  current: 'sage', accepted: 'sage', signed: 'sage', stored: 'sage', active: 'sage', reviewed: 'sage',
  'in review': 'navy', in_review: 'navy', info: 'navy', uploaded: 'navy',
  expiring: 'amber', pending: 'amber', warning: 'amber',
  draft: 'stone', requested: 'stone', expired: 'stone', cancelled: 'stone',
  missing: 'red', critical: 'red',
}
export const pillTone = (status) => PILL_TONE[status] || 'stone'
export function Pill({ status, tone, children, className = '' }) {
  const cls = PILL_CLASSES[tone || pillTone(status)]
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-[9px] py-[3px] rounded-full border whitespace-nowrap ${cls} ${className}`}>
      {children ?? String(status || '').replace('_', ' ')}
    </span>
  )
}

export const SEV_DOT = { critical: '#dc2626', warning: '#d97706', info: '#3b659d' }
export function Dot({ color, size = 8 }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: color }} />
}

// ── Layout atoms ─────────────────────────────────────────────────────────────
export function ScreenHeader({ eyebrow, title, sub, right }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <span className="section-label section-label-light block mb-1.5">{eyebrow}</span>}
        <h1 className="font-display font-normal text-[34px] sm:text-[38px] leading-[1.1] text-navy-950 m-0">{title}</h1>
        {sub && <p className="mt-2 text-[15px] text-stone-500">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap gap-2.5">{right}</div>}
    </header>
  )
}

export function Card({ className = '', children, style }) {
  return <section className={`card-light ${className}`} style={style}>{children}</section>
}

export function CardTitle({ children, right, size = 24, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 mb-3 ${className}`}>
      <h2 className="font-display font-medium m-0 text-navy-950" style={{ fontSize: size }}>{children}</h2>
      {right}
    </div>
  )
}

export function Avatar({ name, size = 38, tone = 'navy', className = '' }) {
  const cls = tone === 'sage' ? 'bg-sage-100 text-sage-700' : tone === 'muted' ? 'bg-stone-100 text-stone-400' : 'bg-navy-100 text-navy-700'
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 ${cls} ${className}`} style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.37)) }}>
      {initialOf(name)}
    </span>
  )
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[22px] font-medium text-navy-950 m-0">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-stone-700 transition-colors rounded-lg p-1"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyTab({ label }) {
  return <p className="py-7 text-center text-[13.5px] text-stone-400 m-0">{label}</p>
}

export function LockedTabPanel({ section }) {
  return (
    <Card className="p-12 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto"><Lock size={20} className="text-stone-400" /></div>
      <p className="font-semibold text-navy-950 m-0">{section}, not shared with you</p>
      <p className="text-stone-500 text-[13.5px] max-w-xs mx-auto leading-relaxed m-0">This client has not shared this section with your firm. They can change that at any time from their own settings.</p>
    </Card>
  )
}

/** One bordered card of rows: title, sub, right-hand tag. The v2 list shape. */
export function RowList({ rows, empty, onRow }) {
  if (!rows.length) return <Card className="px-6 py-2"><EmptyTab label={empty} /></Card>
  return (
    <Card className="px-6 py-2">
      {rows.map((r, i) => {
        const inner = (
          <>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-stone-900 truncate">{r.title}</div>
              {r.sub && <div className="text-[12.5px] text-stone-500 mt-0.5">{r.sub}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">{r.right}</div>
          </>
        )
        const cls = 'grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center py-3.5 border-b border-stone-100 last:border-0 w-full text-left'
        return onRow && r.clickable !== false
          ? <button key={r.key ?? i} type="button" onClick={() => onRow(r)} className={`${cls} hover:bg-stone-50 -mx-2 px-2 rounded-lg`}>{inner}</button>
          : <div key={r.key ?? i} className={cls}>{inner}</div>
      })}
    </Card>
  )
}

// ── Per-client tab panels ────────────────────────────────────────────────────
export function AdvisorAccessTab({ family, permissions }) {
  const SECTIONS = [
    { key: 'accounts',     label: 'Accounts',     desc: 'Bank accounts, investments, pensions and their balances.', icon: Wallet },
    { key: 'documents',    label: 'Documents',    desc: 'Uploaded documents such as wills, LPAs and insurance policies.', icon: FileText },
    { key: 'instructions', label: 'Instructions', desc: 'Step-by-step instructions written for executors and family.', icon: BookOpen },
    { key: 'people',       label: 'People',       desc: 'Trusted contacts, executors and their roles.', icon: Users },
    { key: 'alerts',       label: 'Alerts',       desc: 'Plan readiness alerts and expiry warnings.', icon: Bell },
  ]
  const granted = SECTIONS.filter(s => permissions[s.key]).length
  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle size={22} className="mb-1">What {family.owner_name} shares with you</CardTitle>
          <p className="text-stone-500 text-[13.5px] leading-relaxed max-w-lg m-0">
            <strong>{family.owner_name}</strong> controls this from their own account and can change it at any time. You cannot request or widen your own access; if you need to see more, ask them directly.
          </p>
        </div>
        <Pill tone="navy" className="shrink-0">{granted} of {SECTIONS.length} shared</Pill>
      </div>
      <div className="space-y-2.5">
        {SECTIONS.map(({ key, label, desc, icon: Icon }) => {
          const on = !!permissions[key]
          return (
            <div key={key} className={`flex items-center gap-4 p-3.5 rounded-xl border ${on ? 'border-sage-200 bg-sage-50' : 'border-stone-200 bg-stone-50'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-sage-100' : 'bg-stone-200'}`}><Icon size={16} className={on ? 'text-sage-700' : 'text-stone-400'} /></div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13.5px] font-semibold m-0 ${on ? 'text-stone-900' : 'text-stone-500'}`}>{label}</p>
                <p className="text-[12px] text-stone-500 mt-0.5 leading-relaxed m-0">{desc}</p>
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${on ? 'bg-sage-100 text-sage-800' : 'bg-stone-200 text-stone-500'}`}>
                {on ? <Eye size={11} /> : <EyeOff size={11} />}{on ? 'Shared with you' : 'Not shared'}
              </span>
            </div>
          )
        })}
      </div>
      <p className="flex items-center gap-2 text-[12px] text-stone-400 pt-3 border-t border-stone-100 m-0"><Lock size={12} className="shrink-0" />Access is granted by the client, never by Everstead or the adviser. Changes they make apply immediately.</p>
    </Card>
  )
}

export function FamilyAccountsTab({ accounts }) {
  return (
    <RowList
      empty="Nothing shared under accounts yet."
      rows={accounts.map(a => ({
        key: a.id, title: a.institution,
        sub: [a.account_type, a.account_number_hint ? `•••• ${a.account_number_hint}` : null, a.category].filter(Boolean).join(' · '),
        right: <span className="text-[14px] font-semibold text-stone-900">{a.balance_display || ''}</span>,
      }))}
    />
  )
}

export const REVIEW_LABEL = { draft: 'Draft', in_review: 'In review', signed: 'Signed', stored: 'Stored' }

export function FamilyDocumentsTab({ documents, clientId, isDemo, reviews = {}, onSetReview, solicitor }) {
  const [viewing, setViewing] = useState(null)
  const [menuFor, setMenuFor] = useState(null)
  return (
    <>
      <RowList
        empty="Nothing shared under documents yet."
        onRow={(r) => setViewing(r.doc)}
        rows={documents.map(d => {
          const rv = reviews[d.id]
          return {
            key: d.id, doc: d, title: d.name,
            sub: `${d.doc_type || ''}${d.updated_at ? ` · updated ${fmtDate(d.updated_at)}` : ''}${rv?.note ? ` · ${rv.note}` : ''}`,
            right: (
              <>
                {rv && <Pill status={rv.review_status}>{REVIEW_LABEL[rv.review_status]}</Pill>}
                <Pill status={d.status} />
                {solicitor && onSetReview && (
                  <span className="relative" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => setMenuFor(menuFor === d.id ? null : d.id)} className={pillBtn}>Review</button>
                    {menuFor === d.id && (
                      <span className="absolute right-0 top-full mt-1 z-20 bg-white border border-stone-200 rounded-xl shadow-lg p-1.5 flex flex-col min-w-[150px]">
                        {Object.entries(REVIEW_LABEL).map(([k, label]) => (
                          <button key={k} type="button" onClick={() => { onSetReview(d.id, k); setMenuFor(null) }}
                            className={`text-left text-[12.5px] px-3 py-1.5 rounded-lg hover:bg-stone-100 ${rv?.review_status === k ? 'font-semibold text-navy-800' : 'text-stone-700'}`}>
                            {label}
                          </button>
                        ))}
                      </span>
                    )}
                  </span>
                )}
                <Eye size={13} className="text-stone-400" />
              </>
            ),
          }
        })}
      />
      {viewing && <DocumentViewerModal doc={viewing} clientId={clientId} isDemo={isDemo} onClose={() => setViewing(null)} />}
    </>
  )
}

export function FamilyInstructionsTab({ instructions }) {
  return (
    <RowList
      empty="Nothing shared under instructions yet."
      rows={instructions.map(i => ({
        key: i.id, title: i.title,
        sub: [i.category, `${i.steps?.length ?? i.steps_count ?? 0} steps`].filter(Boolean).join(' · '),
        right: <Pill tone="navy">{i.audience}</Pill>,
      }))}
    />
  )
}

export function FamilyPeopleTab({ people }) {
  return (
    <RowList
      empty="Nothing shared under people yet."
      rows={people.map(p => ({
        key: p.id, title: p.name, sub: [p.role, p.email].filter(Boolean).join(' · '),
        right: <Pill status={p.invite_status} />,
      }))}
    />
  )
}

export function FamilyAlertsTab({ alerts }) {
  return (
    <RowList
      empty="No alerts for this client."
      rows={alerts.map(a => ({
        key: a.id, title: a.title, sub: [a.detail, relativeTime(a.created_at)].filter(Boolean).join(' · '),
        right: <><Pill status={a.severity} />{!a.is_read && <Pill tone="stone">Unread</Pill>}</>,
      }))}
    />
  )
}

const ACTION_PHRASE = {
  'document.uploaded':   (n) => `uploaded ${n || 'a document'}`,
  'document.updated':    (n) => `updated ${n || 'a document'}`,
  'document.deleted':    (n) => `removed ${n || 'a document'}`,
  'account.created':     (n) => `added ${n || 'an account'}`,
  'account.updated':     (n) => `updated ${n || 'an account'}`,
  'account.deleted':     (n) => `removed ${n || 'an account'}`,
  'instruction.created': (n) => `wrote instructions${n ? `: ${n}` : ''}`,
  'instruction.updated': (n) => `updated instructions${n ? `: ${n}` : ''}`,
  'person.invited':      (n) => `invited ${n || 'a trusted person'}`,
  'person.updated':      (n) => `changed access for ${n || 'a trusted person'}`,
  'person.removed':      (n) => `removed ${n || 'a trusted person'}`,
  'profile.updated':     ()  => 'updated their details',
}
export const activityPhrase = (item) => {
  const f = ACTION_PHRASE[item.action]
  if (f) return f(item.resource_name)
  return `${String(item.action || '').replace(/[._]/g, ' ')}${item.resource_name ? `: ${item.resource_name}` : ''}`
}

export function FamilyActivityTab({ activityLog, ownerName }) {
  return (
    <RowList
      empty="No activity recorded yet."
      rows={activityLog.map(a => ({
        key: a.id, title: `${firstName(ownerName)} ${activityPhrase(a)}`, sub: a.resource_type ? String(a.resource_type).replace('_', ' ') : '',
        right: <span className="text-[12px] text-stone-400">{relativeTime(a.created_at)}</span>,
      }))}
    />
  )
}

// ── Document viewer ──────────────────────────────────────────────────────────
export function DocumentViewerModal({ doc, onClose, clientId, isDemo }) {
  const hasFile = !!(doc?.has_file || doc?.storage_path || doc?.file_url)
  const [url, setUrl]         = useState(doc?.file_url || null)
  const [loading, setLoading] = useState(!doc?.file_url && hasFile)

  useEffect(() => {
    let active = true
    if (doc?.file_url) { setUrl(doc.file_url); setLoading(false); return () => { active = false } }
    if (!hasFile)      { setUrl(null);         setLoading(false); return () => { active = false } }
    setLoading(true)
    ;(async () => {
      try {
        let signed = null
        if (clientId && !isDemo) {
          // The documents bucket is owner-read-only, so the server signs the URL
          // after checking the firm link and the client's documents consent.
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch('/api/adviser/document-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
            body: JSON.stringify({ clientId, documentId: doc.id }),
          })
          const data = await res.json().catch(() => ({}))
          signed = res.ok ? data.url : null
        } else if (doc.storage_path) {
          const { getDocumentUrl } = await import('../../lib/supabase')
          signed = await getDocumentUrl(doc.storage_path)
        }
        if (active) setUrl(signed || null)
      } catch { if (active) setUrl(null) }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [doc?.id, doc?.storage_path, doc?.has_file, doc?.file_url, clientId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!doc) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl" style={{ height: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><FileText size={16} /></div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-900 text-[14px] m-0 truncate">{doc.name}</p>
              <p className="text-[12px] text-stone-500 m-0">{doc.doc_type}{doc.updated_at ? ` · updated ${fmtDate(doc.updated_at)}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {url && (
              <>
                <a href={url} target="_blank" rel="noopener noreferrer" className={secondaryBtn + ' !py-2 !px-3 !text-[12.5px]'}><ExternalLink size={13} /> Open in tab</a>
                <a href={url} download={doc.name} className={primaryBtn + ' !py-2 !px-3 !text-[12.5px]'}><Download size={13} /> Download</a>
              </>
            )}
            <button onClick={onClose} className="ml-1 w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-2xl">
          {url ? <iframe src={url} title={doc.name} className="w-full h-full border-0" />
            : loading ? <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3"><Loader2 size={28} className="animate-spin" /><p className="text-sm m-0">Loading preview…</p></div>
            : <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3"><FileText size={40} /><p className="text-sm m-0">No file available for this document.</p></div>}
        </div>
      </div>
    </div>
  )
}

// ── Estate pack: inventory PDF plus the shared document files, one ZIP ───────
export function EstatePackButton({ family, isDemo }) {
  const [state, setState] = useState('idle')
  const run = async () => {
    if (state === 'busy') return
    setState('busy')
    try {
      const headers = { 'Content-Type': 'application/json' }
      let body
      if (isDemo) body = { demo: true, lang: 'en' }
      else {
        const { data: { session } } = await supabase.auth.getSession()
        headers.Authorization = `Bearer ${session?.access_token || ''}`
        body = { clientId: family.id }
      }
      const res = await fetch('/api/adviser/probate-pack', { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('pack failed')
      const blob = await res.blob()
      const m = /filename\*=UTF-8''([^;]+)/.exec(res.headers.get('Content-Disposition') || '')
      const name = m ? decodeURIComponent(m[1]) : `Estate pack - ${family.owner_name}.zip`
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = href; a.download = name
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 5000)
      setState('idle')
    } catch { setState('error'); setTimeout(() => setState('idle'), 3500) }
  }
  return (
    <button onClick={run} disabled={state === 'busy'} className={secondaryBtn} title="Inventory PDF plus every shared document file, in one ZIP">
      {state === 'busy' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {state === 'busy' ? 'Building pack…' : state === 'error' ? 'Could not build the pack' : 'Estate pack'}
    </button>
  )
}

// ── Shown once Everstead has verified a death or incapacity report ────────────
export function ActivationBanner({ family }) {
  if (!family.owner_status || !['deceased', 'incapacitated'].includes(family.owner_status)) return null
  const when = family.activation?.verified_at ? ` on ${fmtDate(family.activation.verified_at)}` : ''
  return (
    <div className="rounded-2xl border border-navy-200 bg-navy-50 px-5 py-4 flex items-start gap-3">
      <Shield size={16} className="text-navy-700 mt-0.5 shrink-0" />
      <div>
        <p className="text-[14px] font-semibold text-navy-950 m-0">Vault activated{when}</p>
        <p className="text-[12.5px] text-stone-600 mt-0.5 leading-relaxed m-0">
          {family.owner_status === 'deceased' ? 'Everstead verified a death report. ' : 'Everstead verified an incapacity report. '}
          {family.activation?.date_of_death ? `Date of death recorded by the reporter: ${family.activation.date_of_death}. ` : ''}
          {family.notify_on_activation ? 'Your firm was notified by email.' : 'The client had not asked for your firm to be notified.'}
          {' '}The estate pack gathers everything they shared with you into one file.
        </p>
      </div>
    </div>
  )
}

// ── Print summary ────────────────────────────────────────────────────────────
export function printClientSummary(family) {
  const win = window.open('', '_blank')
  if (!win) return
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const fmtList = (arr, fn) => arr.length === 0 ? '<li style="color:#888">None recorded</li>' : arr.map(fn).join('')
  win.document.write(`<!DOCTYPE html><html><head><title>${esc(family.owner_name)} | Plan Summary</title>
<style>
  body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#1a1a1a;line-height:1.6;}
  h1{font-size:28px;font-weight:300;margin-bottom:4px;}
  h2{font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#555;margin:28px 0 8px;}
  .score{display:inline-block;font-size:22px;font-weight:700;padding:4px 14px;border-radius:99px;margin-bottom:16px;}
  .green{background:#e4ece3;color:#2f4f2c;} .amber{background:#fef3c7;color:#92400e;} .red{background:#fee2e2;color:#991b1b;}
  ul{margin:0;padding-left:18px;} li{margin:4px 0;font-size:14px;}
  table{width:100%;border-collapse:collapse;font-size:13px;} td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;}
  th{font-weight:700;background:#f7f7f5;} .footer{margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;}
  @media print{body{margin:20px;}}
</style></head><body>
<p style="font-size:12px;color:#888;margin-bottom:4px;">Everstead Adviser Portal: Confidential</p>
<h1>${esc(family.owner_name)}</h1>
<p style="color:#666;font-size:13px;margin-top:2px;">Plan summary generated ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>
<span class="score ${family.readiness_score >= 80 ? 'green' : family.readiness_score >= 50 ? 'amber' : 'red'}">${Number(family.readiness_score) || 0}% readiness</span>
<h2>Accounts (${family.accounts.length})</h2>
<table><tr><th>Institution</th><th>Type</th><th>Reference</th><th>Last known value</th><th>Updated</th></tr>
${family.accounts.length === 0 ? '<tr><td colspan="5" style="color:#888">None shared</td></tr>' : family.accounts.map(a => `<tr><td>${esc(a.institution)}</td><td>${esc(a.account_type)}</td><td>•••• ${esc(a.account_number_hint || '')}</td><td>${esc(a.balance_display || '')}</td><td>${esc(fmtDate(a.updated_at))}</td></tr>`).join('')}
</table>
<h2>Documents (${family.documents.length})</h2>
<ul>${fmtList(family.documents, d => `<li>${esc(d.name)} <span style="color:#888">(${esc(d.doc_type)} · ${esc(d.status)})</span></li>`)}</ul>
<h2>Instructions (${family.instructions.length})</h2>
<ul>${fmtList(family.instructions, i => `<li>${esc(i.title)} <span style="color:#888">(${esc(i.audience)})</span></li>`)}</ul>
<h2>Trusted people (${family.trusted_people.length})</h2>
<ul>${fmtList(family.trusted_people, p => `<li>${esc(p.name)}, ${esc(p.role)} <span style="color:#888">(${esc(p.invite_status)})</span></li>`)}</ul>
<div class="footer">Generated by Everstead · everstead.care · This document is confidential and intended for adviser use only.</div>
<script>window.onload=()=>window.print()</script>
</body></html>`)
  win.document.close()
}

// ── Invite a client ──────────────────────────────────────────────────────────
export function InviteFamilyModal({ onClose, isDemo, familiesCount, familiesLimit, onInvited }) {
  const [form, setForm] = useState({ owner_name: '', owner_email: '', message: '' })
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const atLimit = familiesCount >= familiesLimit

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      if (isDemo) { await new Promise(r => setTimeout(r, 600)); setSent(true); return }
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/adviser/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ name: form.owner_name, email: form.owner_email, note: form.message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not send the invitation. Please try again.'); return }
      setSent(true); onInvited?.()
    } catch { setError('Network error. Please try again.') }
    finally { setSaving(false) }
  }

  if (atLimit) return (
    <Modal title="Family limit reached" onClose={onClose}>
      <div className="text-center space-y-4 py-2">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto"><Users size={24} /></div>
        <p className="text-[13.5px] text-stone-700 leading-relaxed m-0">Your plan supports up to <strong>{familiesLimit} families</strong>. You have reached the limit.</p>
        <p className="text-[12.5px] text-stone-500 m-0">To add more, contact <a href="mailto:support@everstead.care" className="text-navy-700 underline">support@everstead.care</a>.</p>
        <button onClick={onClose} className={secondaryBtn}>Close</button>
      </div>
    </Modal>
  )
  if (sent) return (
    <Modal title="Invitation sent" onClose={onClose}>
      <div className="text-center space-y-4 py-2">
        <div className="w-14 h-14 rounded-full bg-sage-50 text-sage-700 flex items-center justify-center mx-auto"><CheckCircle2 size={26} /></div>
        <p className="text-[13.5px] text-stone-700 leading-relaxed m-0">An invitation has been sent to <strong>{form.owner_email}</strong>. Once they accept and set up their Everstead plan, they will appear in your portal.</p>
        <button onClick={onClose} className={primaryBtn}>Done</button>
      </div>
    </Modal>
  )
  return (
    <Modal title="Invite a client" onClose={onClose}>
      <p className="text-[12.5px] text-stone-500 mb-4 leading-relaxed">They receive an email with a link to create their Everstead plan, already connected to your firm. They then choose what to share with you.</p>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <label className="block space-y-1"><span className={eyebrowCls}>Client full name</span><input className={inputCls} value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} placeholder="e.g. James Thornton" required /></label>
        <label className="block space-y-1"><span className={eyebrowCls}>Email address</span><input type="email" className={inputCls} value={form.owner_email} onChange={e => setForm(p => ({ ...p, owner_email: e.target.value }))} placeholder="client@example.com" required /></label>
        <label className="block space-y-1"><span className={eyebrowCls}>Personal note (optional)</span><textarea className={`${inputCls} min-h-[80px] resize-y`} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="A short message to include in the invitation…" /></label>
        <div className="flex items-start gap-2 bg-navy-50 border border-navy-100 rounded-xl px-3.5 py-3"><Shield size={13} className="text-navy-600 shrink-0 mt-0.5" /><p className="text-[12px] text-navy-700 m-0">You will only see what the client explicitly shares with you. They remain in full control of their plan.</p></div>
        {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-[12px] text-red-700"><AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}</div>}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>{saving ? 'Sending…' : <><Send size={14} /> Send invitation</>}</button>
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Team, billing ────────────────────────────────────────────────────────────
export function AdviserTeamCard({ team, isOwner, isDemo, onReload }) {
  const [email, setEmail] = useState('')
  const [open, setOpen]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState(null)
  const post = async (body) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/adviser/team', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data, error: data?.error }
  }
  const invite = async () => {
    const e = email.trim().toLowerCase(); if (!e) return
    if (isDemo) { setEmail(''); setOpen(false); return }
    setBusy(true); setErr(null)
    const r = await post({ action: 'invite', email: e })
    setBusy(false)
    if (r.ok) { setEmail(''); setOpen(false); onReload?.() } else setErr(r.error)
  }
  const revoke = async (memberId) => {
    if (isDemo) return
    const r = await post({ action: 'revoke', memberId })
    if (r.ok) onReload?.(); else setErr(r.error)
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <p className={`${eyebrowCls} m-0`}>Team</p>
        {isOwner && !open && <button type="button" onClick={() => setOpen(true)} className={pillBtn}><UserPlus size={12} /> Invite a colleague</button>}
      </div>
      {err && <p className="text-[12.5px] text-red-600 mb-2">{err}</p>}
      <div className="space-y-2.5">
        {(team || []).length === 0 && <p className="text-[13px] text-stone-400 m-0">Just you so far.</p>}
        {(team || []).map(m => (
          <div key={m.id} className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-navy-600 text-white inline-flex items-center justify-center text-[12px] font-bold shrink-0">{initialOf(m.full_name || m.email)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-stone-900 m-0 truncate">{m.full_name || m.email}</p>
              <p className="text-[12px] text-stone-500 m-0 truncate">{m.role === 'owner' ? 'Owner' : m.invite_status === 'pending' ? 'Invited, set-up email sent' : m.email}</p>
            </div>
            {isOwner && m.role !== 'owner' && <button onClick={() => revoke(m.id)} className="text-stone-300 hover:text-red-500" title="Remove teammate"><X size={14} /></button>}
          </div>
        ))}
      </div>
      {isOwner && open && (
        <div className="flex items-center gap-2 mt-3">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@yourfirm.co.uk" className={inputCls} />
          <button onClick={invite} disabled={busy || !email.trim()} className={primaryBtn + ' shrink-0'}>{busy ? <Loader2 size={14} className="animate-spin" /> : 'Send'}</button>
          <button onClick={() => setOpen(false)} className={secondaryBtn + ' shrink-0'}>Cancel</button>
        </div>
      )}
      {!isOwner && <p className="text-[12px] text-stone-400 mt-2 m-0">Only the firm owner can invite colleagues.</p>}
    </div>
  )
}

const DEMO_ADVISER_INVOICES = [{ id: 'inv1', amount: 0, currency: 'GBP', issue_date: '2026-07-01', due_date: null, status: 'waived', file_path: null, notes: 'Pilot, first year free.' }]
export function AdviserInvoicesCard({ isDemo }) {
  const [invoices, setInvoices] = useState(isDemo ? DEMO_ADVISER_INVOICES : [])
  const [loading, setLoading]   = useState(!isDemo)
  const [busyId, setBusyId]     = useState(null)
  useEffect(() => {
    if (isDemo) return
    supabase.rpc('get_adviser_invoices').then(({ data }) => { setInvoices(data || []); setLoading(false) }, () => setLoading(false))
  }, [isDemo])
  const gbp = (p) => '£' + ((Number(p) || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const viewPdf = async (inv) => {
    if (!inv.file_path || isDemo) return
    setBusyId(inv.id)
    const { data } = await supabase.storage.from('adviser-invoices').createSignedUrl(inv.file_path, 300)
    setBusyId(null)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }
  return (
    <div>
      <p className={`${eyebrowCls} mb-2.5`}>Billing and invoices</p>
      {loading ? <Loader2 size={16} className="animate-spin text-stone-400" />
        : invoices.length === 0 ? <p className="text-[13px] text-stone-400 m-0">No invoices yet. Your Everstead contact will add them here.</p>
        : <div className="divide-y divide-stone-100">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-stone-900 m-0">{gbp(inv.amount)} <span className="text-stone-400 font-normal">· {fmtDate(inv.issue_date)}</span></p>
                  <p className="text-[12px] text-stone-500 m-0 truncate">{inv.notes || (inv.due_date ? `Due ${fmtDate(inv.due_date)}` : '')}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {inv.file_path && <button onClick={() => viewPdf(inv)} disabled={busyId === inv.id} className={linkBtn + ' inline-flex items-center gap-1'}>{busyId === inv.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} View PDF</button>}
                  <Pill status={inv.status === 'paid' ? 'current' : inv.status === 'unpaid' ? 'pending' : 'draft'}>{inv.status}</Pill>
                </div>
              </div>
            ))}
          </div>}
    </div>
  )
}

// ── Adviser assistant (gated server-side to the firm) ────────────────────────
export function AdviserAssistant({ isDemo }) {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', scripted: true, content: "Hi, I'm your Everstead adviser assistant. Ask me how to do something in the portal, or about your own client portfolio (for example, who has the lowest readiness?)." }])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const scrollRef = useRef(null)
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next); setInput(''); setError(null); setLoading(true)
    if (isDemo) {
      setTimeout(() => { setMessages(m => [...m, { role: 'assistant', content: "In demo mode I can't reach a real portfolio. In your live portal I answer questions about your own clients and guide you around Everstead, always gated to your firm." }]); setLoading(false) }, 500)
      return
    }
    try {
      const apiHistory = next.filter(m => !m.scripted && (m.role === 'user' || m.role === 'assistant')).map(m => ({ role: m.role, content: m.content }))
      const { data, error: invokeErr } = await supabase.functions.invoke('adviser-assistant', { body: { messages: apiHistory } })
      if (invokeErr) {
        let msg = 'The assistant is taking a moment. Please try again.'
        try { msg = (await invokeErr.context?.json())?.error || msg } catch { /* keep default */ }
        throw new Error(msg)
      }
      setMessages(m => [...m, { role: 'assistant', content: data?.reply || '…' }])
    } catch (err) { setError(err.message || 'Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(v => !v)} className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 px-5 py-3 text-white text-sm font-semibold rounded-full shadow-lg transition-all ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: '#2d5082', boxShadow: '0 8px 20px -10px rgba(13, 22, 40, 0.45)' }} aria-label="Open adviser assistant">
        <Sparkles size={16} /> Ask Everstead
      </button>
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] rounded-2xl border border-stone-200 bg-white shadow-2xl flex flex-col overflow-hidden" style={{ height: '540px' }}>
          <div className="px-5 py-4 bg-navy-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Sparkles size={15} className="text-sage-400" /></div>
              <div className="min-w-0"><p className="text-sm font-semibold text-white truncate m-0">Adviser assistant</p><p className="text-[11px] text-stone-400 truncate m-0">Guidance and your portfolio, gated to your firm</p></div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="text-stone-400 hover:text-white transition-colors shrink-0"><X size={18} /></button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-stone-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-navy-800 text-white rounded-tr-sm' : 'bg-white border border-stone-200 text-navy-900 rounded-tl-sm'}`}>{m.content}</div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-white border border-stone-200 rounded-2xl px-3.5 py-3 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" /><span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '160ms' }} /><span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '320ms' }} /></div></div>}
          </div>
          <div className="border-t border-stone-200 p-3">
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={1} placeholder="Ask about the portal or your clients…" disabled={loading}
                className="flex-1 resize-none border border-stone-200 rounded-xl px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 max-h-28 disabled:bg-stone-50" />
              <button onClick={send} disabled={loading || !input.trim()} aria-label="Send message" className="shrink-0 w-9 h-9 rounded-xl bg-navy-800 text-white flex items-center justify-center hover:bg-navy-700 transition-colors disabled:opacity-40"><Send size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { Activity, Landmark, Mail, Printer }
