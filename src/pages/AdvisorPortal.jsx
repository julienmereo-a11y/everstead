import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Briefcase, Users, FileText, Wallet, BookOpen, Bell, ChevronRight,
  Plus, Settings, LogOut, Search, CheckCircle2, AlertCircle, AlertTriangle,
  Info, Clock, BarChart2, Landmark, Shield, Lock, UserPlus, X, RefreshCw,
  ChevronDown, Activity, ArrowRight, Mail, Send, Eye, EyeOff, ToggleLeft, ToggleRight, CreditCard,
  Download, ExternalLink, Loader2, Printer, SortAsc, Filter, LayoutDashboard,
  CheckSquare, Square, MessageSquare, Calendar, TrendingUp, Sparkles,
} from 'lucide-react'
import { DEMO_ADVISOR, DEMO_ADVISOR_FAMILIES } from '../lib/demoData'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—'
  try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(iso)) } catch { return '—' }
}

const STALE_DAYS = 60

function daysSince(iso) {
  if (!iso) return Infinity
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function relativeTime(iso) {
  if (!iso) return '—'
  const days = daysSince(iso)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`
}

const primaryBtn = 'inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50'
const secondaryBtn = 'inline-flex items-center gap-2 border border-stone-300 text-stone-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-colors'
const inputCls = 'w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white'

const READINESS_COLOR = (score) => {
  if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' }
  if (score >= 50) return { bar: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' }
  return               { bar: 'bg-red-500',         text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200' }
}

const STATUS_BADGE = {
  current:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  expiring: 'bg-amber-50 text-amber-700 border-amber-200',
  missing:  'bg-red-50 text-red-700 border-red-200',
  expired:  'bg-stone-100 text-stone-500 border-stone-200',
}

const SEVERITY = {
  critical: { icon: AlertCircle,   cls: 'bg-red-50 border-red-200 text-red-700' },
  warning:  { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  info:     { icon: Info,          cls: 'bg-sky-50 border-sky-200 text-sky-700' },
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  // Escape closes the dialog — standard keyboard affordance.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-stone-700 transition-colors rounded-lg p-1">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FAMILY CARD (sidebar item)
// ─────────────────────────────────────────────────────────────
function FamilyCard({ family, active, onClick, selectMode, selected, onToggle }) {
  const col = READINESS_COLOR(family.readiness_score)
  const isPending = family.invite_status !== 'accepted'
  const stale = daysSince(family.last_updated) > STALE_DAYS
  const daysAgo = daysSince(family.last_updated)

  const handleClick = (e) => {
    if (selectMode && !isPending) {
      e.stopPropagation()
      onToggle(family.id)
    } else {
      onClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all ${
        active && !selectMode
          ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-200'
          : selected
          ? 'border-navy-400 bg-navy-50 ring-1 ring-navy-300'
          : 'border-stone-200 bg-white hover:border-navy-200 hover:bg-navy-50/40'
      }`}
    >
      <div className="flex items-center gap-3">
        {selectMode && !isPending && (
          <div className="shrink-0 text-navy-600">
            {selected ? <CheckSquare size={16} /> : <Square size={16} className="text-stone-400" />}
          </div>
        )}
        <div className="w-9 h-9 rounded-xl bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-bold shrink-0 uppercase">
          {family.owner_name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900 truncate">{family.owner_name}</p>
          <p className="text-xs text-stone-500 truncate">{family.advisor_role}</p>
        </div>
        {isPending ? (
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">Pending</span>
        ) : (
          <span className={`text-xs font-semibold ${col.text} shrink-0`}>{family.readiness_score}%</span>
        )}
      </div>
      {!isPending && (
        <div className="mt-2.5 h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div className={`h-full rounded-full ${col.bar} transition-all`} style={{ width: `${family.readiness_score}%` }} />
        </div>
      )}
      {!isPending && family.last_updated && (
        <p className={`mt-1.5 text-[10px] ${stale ? 'text-amber-600 font-semibold' : 'text-stone-400'}`}>
          {stale && '⚠ '}Last updated {daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`}
        </p>
      )}
      {!isPending && !family.last_updated && (
        <p className="mt-1.5 text-[10px] text-stone-300">No activity recorded</p>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// PRINT SUMMARY
// ─────────────────────────────────────────────────────────────
function printClientSummary(family) {
  const win = window.open('', '_blank')
  if (!win) return
  // Escape every client-entered value — institution names, instruction titles,
  // trusted-person names etc. are free text and would otherwise execute as HTML/JS
  // in the ADVISER's browser when they print (stored XSS across the trust boundary).
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
  const fmtList = (arr, fn) => arr.length === 0 ? '<li style="color:#888">None recorded</li>' : arr.map(fn).join('')
  win.document.write(`<!DOCTYPE html><html><head><title>${esc(family.owner_name)} — Plan Summary</title>
<style>
  body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#1a1a1a;line-height:1.6;}
  h1{font-size:28px;font-weight:300;margin-bottom:4px;}
  h2{font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#555;margin:28px 0 8px;}
  .score{display:inline-block;font-size:22px;font-weight:700;padding:4px 14px;border-radius:99px;margin-bottom:16px;}
  .green{background:#d1fae5;color:#065f46;} .amber{background:#fef3c7;color:#92400e;} .red{background:#fee2e2;color:#991b1b;}
  ul{margin:0;padding-left:18px;} li{margin:4px 0;font-size:14px;}
  table{width:100%;border-collapse:collapse;font-size:13px;} td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;}
  th{font-weight:700;background:#f7f7f5;} .footer{margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;}
  @media print{body{margin:20px;}}
</style></head><body>
<p style="font-size:12px;color:#888;margin-bottom:4px;">Everstead Adviser Portal — Confidential</p>
<h1>${esc(family.owner_name)}</h1>
<p style="color:#666;font-size:13px;margin-top:2px;">${esc(family.advisor_role)} · Plan generated ${new Date().toLocaleDateString('en-GB',{dateStyle:'long'})}</p>
<span class="score ${family.readiness_score>=80?'green':family.readiness_score>=50?'amber':'red'}">${Number(family.readiness_score) || 0}% readiness</span>

<h2>Accounts (${family.accounts.length})</h2>
<table><tr><th>Institution</th><th>Type</th><th>Account</th><th>Balance</th></tr>
${family.accounts.length===0?'<tr><td colspan="4" style="color:#888">None shared</td></tr>':family.accounts.map(a=>`<tr><td>${esc(a.institution)}</td><td>${esc(a.account_type)}</td><td>···· ${esc(a.account_number_hint||'—')}</td><td>${esc(a.balance_display||'—')}</td></tr>`).join('')}
</table>

<h2>Documents (${family.documents.length})</h2>
<ul>${fmtList(family.documents,d=>`<li>${esc(d.name)} <span style="color:#888">(${esc(d.doc_type)} · ${esc(d.status)})</span></li>`)}</ul>

<h2>Instructions (${family.instructions.length})</h2>
<ul>${fmtList(family.instructions,i=>`<li>${esc(i.title)} <span style="color:#888">(${esc(i.audience)})</span></li>`)}</ul>

<h2>Trusted People (${family.trusted_people.length})</h2>
<ul>${fmtList(family.trusted_people,p=>`<li>${esc(p.name)} — ${esc(p.role)} <span style="color:#888">(${esc(p.invite_status)})</span></li>`)}</ul>

<div class="footer">Generated by Everstead · everstead.care · This document is confidential and intended for adviser use only.</div>
<script>window.onload=()=>window.print()</script>
</body></html>`)
  win.document.close()
}

// ─────────────────────────────────────────────────────────────
// FAMILY OVERVIEW (main panel for selected family)
// ─────────────────────────────────────────────────────────────
function FamilyView({ family, isDemo }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [resendState, setResendState] = useState('idle') // idle | sending | sent | error
  const defaultPerms = family.advisor_permissions ?? { accounts: true, documents: true, instructions: true, people: true, alerts: true }
  const [permissions, setPermissions] = useState(defaultPerms)

  // Notes state (demo: local only)
  const [advisorNotes, setAdvisorNotes]     = useState(family.advisor_notes ?? '')
  const [nextReviewDate, setNextReviewDate] = useState(family.next_review_date ?? '')
  const [meetingNotes, setMeetingNotes]     = useState(family.meeting_notes ?? '')
  const [notesSaved, setNotesSaved]         = useState(false)

  const hasNotes = advisorNotes.trim() || nextReviewDate || meetingNotes.trim()

  const tabs = [
    { id: 'overview',      label: 'Overview',      icon: Shield,    locked: false },
    { id: 'accounts',      label: 'Accounts',      icon: Wallet,    locked: !permissions.accounts },
    { id: 'documents',     label: 'Documents',     icon: FileText,  locked: !permissions.documents },
    { id: 'instructions',  label: 'Instructions',  icon: BookOpen,  locked: !permissions.instructions },
    { id: 'people',        label: 'People',        icon: Users,     locked: !permissions.people },
    { id: 'alerts',        label: 'Alerts',        icon: Bell,      locked: !permissions.alerts },
    { id: 'activity',      label: 'Activity',      icon: Activity,  locked: false },
    { id: 'notes',         label: 'Notes',         icon: MessageSquare, locked: false, dot: hasNotes },
    { id: 'access',        label: 'Adviser access',icon: Eye,       locked: false },
  ]

  const unreadAlerts = family.alerts.filter(a => !a.is_read).length
  const col = READINESS_COLOR(family.readiness_score)

  if (family.invite_status !== 'accepted') {
    return (
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Mail size={24} />
        </div>
        <h3 className="text-lg font-semibold text-amber-900">Invite pending</h3>
        <p className="text-sm text-amber-800 leading-relaxed max-w-sm mx-auto">
          <strong>{family.owner_name}</strong> has been sent an invitation to connect with you on Everstead. Once they accept, their plan will be visible here.
        </p>
        <button
          onClick={async () => {
            if (isDemo || resendState === 'sending') return
            setResendState('sending')
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const res = await fetch('/api/adviser/invite-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
                body: JSON.stringify({ name: family.owner_name, email: family.owner_email }),
              })
              setResendState(res.ok ? 'sent' : 'error')
            } catch { setResendState('error') }
            setTimeout(() => setResendState('idle'), 3000)
          }}
          disabled={resendState === 'sending'}
          className="inline-flex items-center gap-2 bg-amber-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-800 transition-colors disabled:opacity-60"
        >
          {resendState === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {resendState === 'sent' ? 'Invite sent ✓' : resendState === 'error' ? 'Failed — retry' : 'Resend invite'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="rounded-[2rem] border border-stone-200 bg-white px-7 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-500">{family.advisor_role}</p>
          <h2 className="font-display text-2xl font-light text-navy-950 mt-1">{family.owner_name}</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Last updated {fmtDate(family.last_updated)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => printClientSummary(family)}
            className={secondaryBtn}
            title="Print / Save as PDF"
          >
            <Printer size={14} /> Print summary
          </button>
          <div className="text-right">
            <p className="text-xs text-stone-500 mb-1">Plan readiness</p>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className={`h-full rounded-full ${col.bar}`} style={{ width: `${family.readiness_score}%` }} />
              </div>
              <span className={`text-sm font-bold ${col.text}`}>{family.readiness_score}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 flex-wrap bg-white border border-stone-200 rounded-2xl p-1.5">
        {tabs.map(({ id, label, icon: Icon, locked, dot }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors relative ${
              activeTab === id ? 'bg-navy-800 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {locked ? <Lock size={13} className="opacity-60" /> : <Icon size={14} />}
            {label}
            {id === 'alerts' && !locked && unreadAlerts > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadAlerts}</span>
            )}
            {id === 'notes' && dot && activeTab !== 'notes' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview'     && <FamilyOverviewTab family={family} setTab={setActiveTab} permissions={permissions} />}
      {activeTab === 'accounts'     && (!permissions.accounts     ? <LockedTabPanel section="Accounts" />     : <FamilyAccountsTab accounts={family.accounts} />)}
      {activeTab === 'documents'    && (!permissions.documents    ? <LockedTabPanel section="Documents" />    : <FamilyDocumentsTab documents={family.documents} />)}
      {activeTab === 'instructions' && (!permissions.instructions ? <LockedTabPanel section="Instructions" /> : <FamilyInstructionsTab instructions={family.instructions} />)}
      {activeTab === 'people'       && (!permissions.people       ? <LockedTabPanel section="People" />       : <FamilyPeopleTab people={family.trusted_people} />)}
      {activeTab === 'alerts'       && (!permissions.alerts       ? <LockedTabPanel section="Alerts" />       : <FamilyAlertsTab alerts={family.alerts} />)}
      {activeTab === 'activity'     && <FamilyActivityTab activityLog={family.activity_log ?? []} />}
      {activeTab === 'notes'        && (
        <FamilyNotesTab
          family={family}
          advisorNotes={advisorNotes} setAdvisorNotes={setAdvisorNotes}
          nextReviewDate={nextReviewDate} setNextReviewDate={setNextReviewDate}
          meetingNotes={meetingNotes} setMeetingNotes={setMeetingNotes}
          saved={notesSaved} setSaved={setNotesSaved}
          isDemo={isDemo}
        />
      )}
      {activeTab === 'access'       && <AdvisorAccessTab family={family} permissions={permissions} />}
    </div>
  )
}

// ── Locked tab placeholder ─────────────────────────────────────
function LockedTabPanel({ section }) {
  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white p-12 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto">
        <Lock size={20} className="text-stone-400" />
      </div>
      <p className="font-semibold text-navy-900">{section} — access restricted</p>
      <p className="text-stone-500 text-sm max-w-xs mx-auto leading-relaxed">
        This family has not granted you access to this section. They can change this at any time from their adviser access settings.
      </p>
    </div>
  )
}

// ── Adviser access tab — READ-ONLY for advisers. The client controls what they
// share from their own account; an adviser can never request or expand access here.
function AdvisorAccessTab({ family, permissions }) {
  const SECTIONS = [
    { key: 'accounts',     label: 'Accounts',      desc: 'Bank accounts, investments, pensions and their balances.', icon: Wallet },
    { key: 'documents',    label: 'Documents',     desc: 'Uploaded documents such as wills, LPAs, and insurance policies.', icon: FileText },
    { key: 'instructions', label: 'Instructions',  desc: 'Step-by-step instructions written for executors and family.', icon: BookOpen },
    { key: 'people',       label: 'People',        desc: 'Trusted contacts, executors, and their roles.', icon: Users },
    { key: 'alerts',       label: 'Alerts',        desc: 'Plan readiness alerts and expiry warnings.', icon: Bell },
  ]

  const grantedCount = Object.values(permissions).filter(Boolean).length

  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white p-7 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-navy-900 text-base">What {family.owner_name} shares with you</h3>
          <p className="text-stone-500 text-sm mt-1 leading-relaxed max-w-lg">
            <strong>{family.owner_name}</strong> controls this from their own account and can change it at any time.
            You cannot request or expand your own access — if you need to see more, ask them directly.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold bg-navy-50 text-navy-700 border border-navy-200 px-2.5 py-1 rounded-full">
          {grantedCount} of {SECTIONS.length} sections shared
        </span>
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ key, label, desc, icon: Icon }) => {
          const enabled = permissions[key]
          return (
            <div
              key={key}
              className={`flex items-center gap-4 p-4 rounded-2xl border ${enabled ? 'border-sage-200 bg-sage-50' : 'border-stone-200 bg-stone-50'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-sage-100' : 'bg-stone-200'}`}>
                <Icon size={17} className={enabled ? 'text-sage-700' : 'text-stone-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${enabled ? 'text-navy-900' : 'text-stone-500'}`}>{label}</p>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <span className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                enabled ? 'bg-sage-100 text-sage-800' : 'bg-stone-200 text-stone-500'
              }`}>
                {enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                {enabled ? 'Shared with you' : 'Not shared'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
        <Lock size={12} className="text-stone-400 shrink-0" />
        <p className="text-xs text-stone-400">Access is granted by the client, never by Everstead or the adviser. Changes they make apply immediately.</p>
      </div>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────
function FamilyOverviewTab({ family, setTab, permissions = {} }) {
  const col = READINESS_COLOR(family.readiness_score)

  // Onboarding checklist (feature 8)
  const onboardingItems = [
    { label: 'Vault created',        done: true },
    { label: 'First account added',  done: family.accounts.length > 0 },
    { label: 'First document added', done: family.documents.length > 0 },
    { label: 'Executor assigned',    done: family.trusted_people.some(p => (p.role || '').toLowerCase().includes('executor')) },
    { label: 'Instructions added',   done: family.instructions.length > 0 },
  ]
  const doneCount = onboardingItems.filter(i => i.done).length

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Accounts',     value: family.accounts.length,     icon: Wallet,   tab: 'accounts',     permKey: 'accounts' },
          { label: 'Documents',    value: family.documents.length,    icon: FileText, tab: 'documents',    permKey: 'documents' },
          { label: 'Instructions', value: family.instructions.length, icon: BookOpen, tab: 'instructions', permKey: 'instructions' },
          { label: 'Unread alerts',value: family.alerts.filter(a => !a.is_read).length, icon: Bell, tab: 'alerts', permKey: 'alerts' },
        ].map(({ label, value, icon: Icon, tab, permKey }) => {
          const locked = permissions[permKey] === false
          return (
          <button
            key={label}
            onClick={() => setTab(tab)}
            className={`rounded-[1.5rem] border bg-white p-5 text-left transition-all group ${locked ? 'border-stone-100 opacity-50 cursor-default' : 'border-stone-200 hover:border-navy-300 hover:bg-navy-50/40'}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-colors ${locked ? 'bg-stone-100 text-stone-400' : 'bg-navy-50 text-navy-700 group-hover:bg-navy-100'}`}>
              {locked ? <Lock size={15} /> : <Icon size={16} />}
            </div>
            <p className="text-2xl font-light font-display text-navy-950">{locked ? '—' : value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
            {!locked && (
              <p className="mt-1.5 text-xs text-navy-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View <ChevronRight size={11} />
              </p>
            )}
          </button>
          )
        })}
      </div>

      {/* Onboarding checklist (feature 8) */}
      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy-900">Getting started</h3>
          <span className="text-xs font-semibold text-stone-500">{doneCount} of {onboardingItems.length} complete</span>
        </div>
        <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(doneCount/onboardingItems.length)*100}%` }} />
        </div>
        <div className="grid sm:grid-cols-2 gap-1.5 pt-1">
          {onboardingItems.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <CheckCircle2 size={13} className={item.done ? 'text-emerald-500 shrink-0' : 'text-stone-200 shrink-0'} />
              <span className={`text-xs ${item.done ? 'text-navy-800' : 'text-stone-400'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent alerts */}
      {family.alerts.length > 0 && (
        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 space-y-3">
          <h3 className="text-sm font-semibold text-navy-900">Alerts</h3>
          {family.alerts.map(alert => {
            const sev = SEVERITY[alert.severity] || SEVERITY.info
            const SevIcon = sev.icon
            return (
              <div key={alert.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${sev.cls}`}>
                <SevIcon size={14} className="shrink-0" />
                <p className="text-xs font-medium">{alert.title}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Trusted people */}
      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-navy-900 mb-3">Trusted people</h3>
        <div className="space-y-2">
          {family.trusted_people.length === 0 ? (
            <p className="text-xs text-stone-400">No trusted people added yet.</p>
          ) : family.trusted_people.map(p => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {p.name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-900 truncate">{p.name}</p>
                <p className="text-xs text-stone-500">{p.role}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                p.invite_status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>{p.invite_status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Activity feed tab (feature 5) ─────────────────────────────
const ACTION_LABELS = {
  'document.uploaded':  { label: 'Uploaded document',    icon: FileText },
  'account.updated':    { label: 'Updated account',      icon: Wallet },
  'account.created':    { label: 'Added account',        icon: Wallet },
  'instruction.created':{ label: 'Created instruction',  icon: BookOpen },
  'person.invited':     { label: 'Invited person',       icon: UserPlus },
}

function groupByDate(items) {
  const now = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const groups = {}
  items.forEach(item => {
    const d = new Date(item.created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    let label
    if (day.getTime() === today.getTime()) label = 'Today'
    else if (day.getTime() === yesterday.getTime()) label = 'Yesterday'
    else label = 'Earlier'
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  })
  const order = ['Today', 'Yesterday', 'Earlier']
  return order.filter(k => groups[k]).map(k => ({ label: k, items: groups[k] }))
}

function FamilyActivityTab({ activityLog }) {
  if (!activityLog || activityLog.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-stone-200 bg-white py-12 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-400 flex items-center justify-center mx-auto mb-2">
          <Activity size={20} />
        </div>
        <p className="text-sm font-semibold text-navy-900">No activity recorded yet</p>
        <p className="text-xs text-stone-400 max-w-xs mx-auto">When this client adds accounts, documents or instructions, their activity will appear here.</p>
      </div>
    )
  }

  const groups = groupByDate(activityLog)

  return (
    <div className="space-y-5">
      {groups.map(({ label, items }) => (
        <div key={label} className="rounded-[1.5rem] border border-stone-200 bg-white p-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">{label}</h3>
          {items.map(item => {
            const meta = ACTION_LABELS[item.action] || { label: item.action, icon: Activity }
            const Icon = meta.icon
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900">{meta.label}</p>
                  <p className="text-xs text-stone-500 truncate">{item.resource_name}</p>
                </div>
                <p className="text-xs text-stone-400 shrink-0 mt-0.5">{relativeTime(item.created_at)}</p>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Notes tab (features 4 & 6) ────────────────────────────────
function FamilyNotesTab({ family, advisorNotes, setAdvisorNotes, nextReviewDate, setNextReviewDate, meetingNotes, setMeetingNotes, saved, setSaved, isDemo }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    if (isDemo) { setSaved(true); setTimeout(() => setSaved(false), 3000); return }
    setSaving(true)
    const { error: rpcError } = await supabase.rpc('save_adviser_client_note', {
      p_client_id: family.id,
      p_notes: advisorNotes || null,
      p_next_review: nextReviewDate || null,
      p_meeting_notes: meetingNotes || null,
    })
    setSaving(false)
    if (rpcError) { setError('Could not save your notes. Please try again.'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-navy-900 text-base">Adviser notes</h3>
          <p className="text-xs text-stone-400 mt-0.5">Private — only visible to you. Not shared with the client.</p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <CheckCircle2 size={12} /> Saved
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">Adviser notes</label>
          <textarea
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white min-h-[100px] resize-y"
            placeholder="Your private notes about this client's situation…"
            value={advisorNotes}
            onChange={e => { setAdvisorNotes(e.target.value); setSaved(false) }}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600 flex items-center gap-1.5">
            <Calendar size={12} /> Next review date
          </label>
          <input
            type="date"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
            value={nextReviewDate}
            onChange={e => { setNextReviewDate(e.target.value); setSaved(false) }}
          />
          {nextReviewDate && (
            <p className="text-xs text-stone-400">
              Review scheduled for {new Date(nextReviewDate).toLocaleDateString('en-GB', { dateStyle: 'long' })}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">Meeting notes</label>
          <textarea
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white min-h-[120px] resize-y"
            placeholder="Notes from your most recent meeting…"
            value={meetingNotes}
            onChange={e => { setMeetingNotes(e.target.value); setSaved(false) }}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <p className="text-xs text-stone-400">
          {isDemo ? 'These notes are stored locally in demo mode and are not persisted.' : 'Saved securely for your firm — never visible to the client.'}
        </p>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-60">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : saved ? <><CheckCircle2 size={14} /> Saved</> : 'Save notes'}
        </button>
      </div>
    </div>
  )
}

// ── Accounts ──────────────────────────────────────────────────
function FamilyAccountsTab({ accounts }) {
  if (!accounts.length) return <EmptyTab icon={Wallet} label="No accounts shared with you yet." />
  return (
    <div className="space-y-3">
      {accounts.map(acc => (
        <div key={acc.id} className="rounded-[1.5rem] border border-stone-200 bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
              <Landmark size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy-900 text-sm">{acc.institution}</p>
              <p className="text-xs text-stone-500">{acc.account_type} · ···· {acc.account_number_hint}</p>
            </div>
            <p className="text-sm font-semibold text-navy-900 shrink-0">{acc.balance_display}</p>
          </div>
          {acc.notes && <p className="mt-2.5 text-xs text-stone-500 leading-relaxed border-t border-stone-100 pt-2.5">{acc.notes}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Document Viewer Modal ──────────────────────────────────────
function DocumentViewerModal({ doc, onClose }) {
  // Uploaded client files are private (storage_path in the `documents` bucket, no
  // file_url column) — resolve a signed URL to preview/download, falling back to
  // file_url if a row ever carries a public one.
  const [url, setUrl]         = useState(doc?.file_url || null)
  const [loading, setLoading] = useState(!doc?.file_url && !!doc?.storage_path)

  useEffect(() => {
    let active = true
    if (doc?.file_url)      { setUrl(doc.file_url); setLoading(false); return () => { active = false } }
    if (!doc?.storage_path) { setUrl(null);         setLoading(false); return () => { active = false } }
    setLoading(true)
    ;(async () => {
      try {
        const { getDocumentUrl } = await import('../lib/supabase')
        const signed = await getDocumentUrl(doc.storage_path)
        if (active) setUrl(signed || null)
      } catch {
        if (active) setUrl(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [doc?.id, doc?.storage_path, doc?.file_url])

  if (!doc) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white rounded-[2rem] shadow-2xl flex flex-col w-full max-w-4xl"
        style={{ height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <p className="font-semibold text-navy-900 text-sm">{doc.name}</p>
              <p className="text-xs text-stone-500">{doc.doc_type} · Updated {fmtDate(doc.updated_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 px-3 py-2 rounded-xl transition-colors"
                >
                  <ExternalLink size={13} /> Open in tab
                </a>
                <a
                  href={url}
                  download={doc.name}
                  className="flex items-center gap-1.5 text-xs font-medium text-white btn-aurora hover:bg-navy-900 px-3 py-2 rounded-full transition-colors"
                >
                  <Download size={13} /> Download
                </a>
              </>
            )}
            <button onClick={onClose} className="ml-2 w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        {/* Viewer */}
        <div className="flex-1 overflow-hidden rounded-b-[2rem]">
          {url ? (
            <iframe
              src={url}
              title={doc.name}
              className="w-full h-full border-0"
            />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Loading preview…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3">
              <FileText size={40} />
              <p className="text-sm">No file available for this document.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Documents ─────────────────────────────────────────────────
function FamilyDocumentsTab({ documents }) {
  const [viewingDoc, setViewingDoc] = useState(null)
  if (!documents.length) return <EmptyTab icon={FileText} label="No documents shared with you yet." />
  return (
    <>
      <div className="space-y-3">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="rounded-[1.5rem] border border-stone-200 bg-white px-6 py-4 flex items-center gap-4 cursor-pointer hover:border-navy-300 hover:shadow-sm transition-all group"
            onClick={() => setViewingDoc(doc)}
          >
            <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy-900 text-sm truncate">{doc.name}</p>
              <p className="text-xs text-stone-500">{doc.doc_type} · Updated {fmtDate(doc.updated_at)}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[doc.status] || STATUS_BADGE.current}`}>
              {doc.status}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-navy-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Eye size={13} /> View
            </div>
          </div>
        ))}
      </div>
      {viewingDoc && <DocumentViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </>
  )
}

// ── Instructions ──────────────────────────────────────────────
function FamilyInstructionsTab({ instructions }) {
  if (!instructions.length) return <EmptyTab icon={BookOpen} label="No instructions shared with you yet." />
  return (
    <div className="space-y-3">
      {instructions.map(inst => (
        <div key={inst.id} className="rounded-[1.5rem] border border-stone-200 bg-white px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
            <BookOpen size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy-900 text-sm truncate">{inst.title}</p>
            <p className="text-xs text-stone-500">{inst.category} · {inst.instruction_steps?.length ?? inst.steps_count ?? 0} steps</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-navy-50 text-navy-700 border-navy-200">
            {inst.audience}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── People ────────────────────────────────────────────────────
function FamilyPeopleTab({ people }) {
  if (!people.length) return <EmptyTab icon={Users} label="No trusted people added yet." />
  return (
    <div className="space-y-3">
      {people.map(p => (
        <div key={p.id} className="rounded-[1.5rem] border border-stone-200 bg-white px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-bold uppercase shrink-0">
            {p.name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy-900 text-sm">{p.name}</p>
            <p className="text-xs text-stone-500">{p.role}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
            p.invite_status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>{p.invite_status}</span>
        </div>
      ))}
    </div>
  )
}

// ── Alerts ────────────────────────────────────────────────────
function FamilyAlertsTab({ alerts }) {
  if (!alerts.length) return <EmptyTab icon={Bell} label="No alerts for this family." />
  return (
    <div className="space-y-3">
      {alerts.map(alert => {
        const sev = SEVERITY[alert.severity] || SEVERITY.info
        const SevIcon = sev.icon
        return (
          <div key={alert.id} className={`rounded-[1.5rem] border px-6 py-4 flex items-center gap-4 ${sev.cls}`}>
            <SevIcon size={18} className="shrink-0" />
            <p className="text-sm font-medium">{alert.title}</p>
            {!alert.is_read && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-white/60 rounded-full px-2 py-0.5 border shrink-0">Unread</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EmptyTab({ icon: Icon, label }) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-400 flex items-center justify-center mx-auto mb-3">
        <Icon size={20} />
      </div>
      <p className="text-sm text-stone-400">{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// INVITE FAMILY MODAL
// ─────────────────────────────────────────────────────────────
function InviteFamilyModal({ onClose, isDemo, familiesCount, familiesLimit, onInvited }) {
  const [form, setForm] = useState({ owner_name: '', owner_email: '', plan: 'essential', message: '' })
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const atLimit = familiesCount >= familiesLimit

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 800))
        setSent(true)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/adviser/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ name: form.owner_name, email: form.owner_email, note: form.message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not send the invitation. Please try again.'); return }
      setSent(true)
      onInvited?.()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (atLimit) {
    return (
      <Modal title="Family limit reached" onClose={onClose}>
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Users size={24} />
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">
            Your Everstead Pro plan supports up to <strong>{familiesLimit} families</strong>. You have reached the limit.
          </p>
          <p className="text-xs text-stone-500">To add more families, contact <a href="mailto:support@everstead.care" className="text-navy-700 underline">support@everstead.care</a> to discuss a higher-volume arrangement.</p>
          <button onClick={onClose} className={secondaryBtn}>Close</button>
        </div>
      </Modal>
    )
  }

  if (sent) {
    return (
      <Modal title="Invitation sent" onClose={onClose}>
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={26} />
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">
            An invitation has been sent to <strong>{form.owner_email}</strong>. Once they accept and set up their Everstead plan, they will appear in your portal.
          </p>
          <button onClick={onClose} className={primaryBtn}>Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Invite a family" onClose={onClose}>
      <p className="text-xs text-stone-500 mb-4 leading-relaxed">
        Invite someone you represent to create an Everstead plan. They will receive an email with instructions. You will be added as their Financial Adviser automatically once they accept.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">Client full name (or family name) *</label>
          <input className={inputCls} value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} placeholder="e.g. James Thornton" required />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">Email address *</label>
          <input type="email" className={inputCls} value={form.owner_email} onChange={e => setForm(p => ({ ...p, owner_email: e.target.value }))} placeholder="client@example.com" required />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">Personal note (optional)</label>
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            placeholder="A short message to include in the invitation email…"
          />
        </div>
        <div className="flex items-center gap-2 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3">
          <Shield size={13} className="text-navy-600 shrink-0" />
          <p className="text-xs text-navy-700">You will only see information the client explicitly shares with you. They remain in full control of their plan.</p>
        </div>
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
            {saving ? 'Sending…' : <><Send size={14} /> Send invitation</>}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// ADVISOR RESOURCES SECTION
// ─────────────────────────────────────────────────────────────
const ADVISOR_GUIDES = [
  {
    icon: Users,
    title: 'Introducing clients to Everstead',
    color: 'bg-navy-50 text-navy-700',
    items: [
      { label: 'Who benefits most from Everstead?', detail: 'Clients in their 50s and 60s with assets across multiple institutions, recent life changes (retirement, bereavement, divorce), or those without an up-to-date will or LPA are typically the most receptive. Estate complexity — not wealth — is the main driver.' },
      { label: 'How to open the conversation', detail: 'Frame it around peace of mind rather than death planning. "We use a platform that helps families make sure everything is in one place if something unexpected happens" tends to land better than leading with mortality.' },
      { label: 'Presenting the delegate access model', detail: 'Reassure clients that you only see what they explicitly share with you. They remain in full control. You are listed as a trusted professional contact, not a co-owner. This addresses the most common privacy concern before it arises.' },
      { label: 'Handling hesitation', detail: 'Some clients worry about security. Point them to the Security page (everstead.care/security): AES-256 encryption, role-based access, audit logs, and the fact that Everstead is not a financial institution holding their money — only their documentation.' },
    ],
  },
  {
    icon: BookOpen,
    title: 'Onboarding a new client family',
    color: 'bg-sage-50 text-sage-700',
    items: [
      { label: 'Step 1 — Invite the client', detail: 'Use the Invite a family button in your portal to send an invitation by email. The client creates their own Everstead account and then accepts your connection request. You are only linked once they explicitly confirm.' },
      { label: 'Step 2 — Guide them through their first session', detail: 'Suggest they start with accounts and documents. A 30-minute guided call while they add their first few items dramatically increases completion rates. The onboarding checklist in their dashboard tracks progress.' },
      { label: 'Step 3 — Set appropriate access', detail: 'Once connected, the client sets what you can see. You cannot request or expand your own access. If you need visibility of specific sections for your work, ask the client to share those sections from their settings.' },
      { label: 'Step 4 — Review annually', detail: 'Estate plans go stale quickly. Build a brief Everstead review into your annual client meeting — new accounts, document updates, and changes to trusted people. Prompt clients who haven\'t logged in for 6+ months.' },
    ],
  },
  {
    icon: FileText,
    title: 'Documents advisers often reference',
    color: 'bg-emerald-50 text-emerald-700',
    items: [
      { label: 'Will', detail: 'If a client shares their will, you can see the named executor, any professional executor clauses, and the key bequests. This helps with planning conversations and avoids surprises at probate.' },
      { label: 'LPA — Property & Financial Affairs', detail: 'Knowing whether an LPA exists, and who holds it, is critical for clients with cognitive decline risk. If no LPA exists, the Court of Protection process is expensive and slow. Advisers are often the right people to prompt this.' },
      { label: 'Pension nomination forms', detail: 'Pensions typically sit outside the estate for IHT purposes but nominations go stale. Use the accounts section to remind clients to review their expression of wishes annually.' },
      { label: 'Insurance schedules', detail: 'A surprising number of clients are under-insured or have duplicate cover. Use what you can see in Everstead as a starting point for a protection review.' },
    ],
  },
  {
    icon: Shield,
    title: 'Privacy, compliance, and data sharing',
    color: 'bg-violet-50 text-violet-700',
    items: [
      { label: 'What data you can access', detail: 'You can only view what the client has explicitly shared. Everstead maintains an audit log of all access. You cannot download or copy documents without the client granting download permissions.' },
      { label: 'GDPR and data minimisation', detail: 'Encourage clients to add only what is relevant. Avoid storing personal data that serves no practical purpose in the estate plan. Everstead is the client\'s system of record — you are a view-only participant unless they grant more.' },
      { label: 'Your professional duty of care', detail: 'Information you access through Everstead remains subject to your existing professional confidentiality obligations. Do not share client plan details with third parties without explicit client consent.' },
      { label: 'When a client dies or loses capacity', detail: 'Your access does not automatically change on death or incapacity. Access changes are controlled by the executor or LPA holder through Everstead\'s verification process. Contact support if you need to escalate.' },
    ],
  },
  {
    icon: Landmark,
    title: 'Useful external resources',
    color: 'bg-amber-50 text-amber-700',
    items: [
      { label: 'STEP — Society of Trust and Estate Practitioners', detail: 'step.org — The professional body for estate planning specialists. Useful for referrals and technical guidance on complex cross-border or trust matters.' },
      { label: 'Office of the Public Guardian', detail: 'gov.uk/government/organisations/office-of-the-public-guardian — Registers LPAs and deputyships. Direct line for queries: 0300 456 0300.' },
      { label: 'HM Land Registry', detail: 'gov.uk/search-property-information-land-registry — Verify property ownership and title numbers for client estate records.' },
      { label: 'Tell Us Once (gov.uk)', detail: 'A government service that notifies multiple departments of a death in a single step. Executors can use it immediately after registering the death. Point families to this to reduce admin.' },
      { label: 'Certainty National Will Register', detail: 'certainty.co.uk — Search for registered wills in England and Wales. Useful when a client cannot locate a will they know exists.' },
      { label: 'The Probate Registry', detail: 'Apply for a Grant of Probate online at gov.uk/wills-probate-inheritance. For complex estates, direct advisers and executors to use a solicitor rather than a personal application.' },
    ],
  },
]

function AdvisorResourcesSection() {
  const [expanded, setExpanded] = React.useState(null)
  const toggle = i => setExpanded(v => v === i ? null : i)

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
        <h2 className="text-base font-semibold text-navy-950 mb-1">Adviser resources</h2>
        <p className="text-xs text-stone-400 mb-5">Practical guidance for using Everstead with your clients.</p>
        <div className="space-y-3">
          {ADVISOR_GUIDES.map((guide, i) => {
            const Icon = guide.icon
            return (
              <div key={i} className="rounded-2xl border border-stone-200 overflow-hidden">
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${guide.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy-900 text-sm">{guide.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{guide.items.length} topics</p>
                  </div>
                  <ChevronRight size={15} className={`text-stone-400 transition-transform shrink-0 ${expanded === i ? 'rotate-90' : ''}`} />
                </button>
                {expanded === i && (
                  <div className="border-t border-stone-100 divide-y divide-stone-50">
                    {guide.items.map((item, j) => (
                      <div key={j} className="px-5 py-4">
                        <p className="text-sm font-semibold text-navy-800 mb-1">{item.label}</p>
                        <p className="text-sm text-stone-500 leading-relaxed">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5 bg-navy-50 border border-navy-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-navy-900 text-sm">Questions about Everstead Pro?</p>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">Our team is happy to assist with onboarding or pilot rollout.</p>
          </div>
          <a
            href="mailto:support@everstead.care"
            className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-300 rounded-lg px-3 py-2 hover:bg-navy-100 transition-colors shrink-0"
          >
            <Mail size={13} /> Contact us
          </a>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ADVISOR SETTINGS PANEL
// ─────────────────────────────────────────────────────────────
// Firm team — the owner invites teammates who share the firm's clients.
// Custom-contract billing: advisers see the invoices the Everstead team uploads.
const DEMO_ADVISER_INVOICES = [
  { id: 'inv1', amount: 0, currency: 'GBP', issue_date: '2026-07-01', due_date: null, status: 'waived', file_path: null, notes: 'Pilot — first year free.' },
]
const INV_PILL = {
  paid:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
  waived: 'bg-stone-100 text-stone-500 border-stone-200',
}
function AdviserInvoicesCard({ isDemo }) {
  const [invoices, setInvoices] = useState(isDemo ? DEMO_ADVISER_INVOICES : [])
  const [loading, setLoading]   = useState(!isDemo)
  const [busyId, setBusyId]     = useState(null)
  useEffect(() => {
    if (isDemo) return
    supabase.rpc('get_adviser_invoices').then(({ data }) => { setInvoices(data || []); setLoading(false) }, () => setLoading(false))
  }, [isDemo])
  const gbp = (p) => '£' + ((Number(p) || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'
  const viewPdf = async (inv) => {
    if (!inv.file_path || isDemo) return
    setBusyId(inv.id)
    const { data } = await supabase.storage.from('adviser-invoices').createSignedUrl(inv.file_path, 300)
    setBusyId(null)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }
  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white p-8 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-navy-950">Billing &amp; invoices</h2>
        <p className="text-xs text-stone-400 mt-0.5">Your firm is on a custom Everstead plan. Invoices from the Everstead team appear here.</p>
      </div>
      {loading ? (
        <div className="py-6 text-center"><Loader2 size={18} className="animate-spin text-stone-400 mx-auto" /></div>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-stone-400">No invoices yet — your Everstead contact will add them here.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy-900">{gbp(inv.amount)} <span className="text-stone-400 font-normal">· {fmt(inv.issue_date)}</span></p>
                <p className="text-xs text-stone-500 truncate">{inv.notes || (inv.due_date ? `Due ${fmt(inv.due_date)}` : '')}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {inv.file_path && (
                  <button onClick={() => viewPdf(inv)} disabled={busyId === inv.id} className="text-xs font-medium text-navy-700 hover:text-navy-900 inline-flex items-center gap-1 disabled:opacity-50">
                    {busyId === inv.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} View PDF
                  </button>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${INV_PILL[inv.status] || INV_PILL.unpaid}`}>{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdviserTeamCard({ team, isOwner, isDemo, onReload }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState(null)

  const post = async (body) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/adviser/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data, error: data?.error }
  }
  const invite = async () => {
    const e = email.trim().toLowerCase(); if (!e) return
    if (isDemo) { setEmail(''); return }
    setBusy(true); setErr(null)
    const r = await post({ action: 'invite', email: e })
    setBusy(false)
    if (r.ok) { setEmail(''); onReload?.() } else setErr(r.error)
  }
  const revoke = async (memberId) => {
    if (isDemo) return
    const r = await post({ action: 'revoke', memberId })
    if (r.ok) onReload?.(); else setErr(r.error)
  }

  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
      <h3 className="font-semibold text-navy-900 text-base mb-1">Your team</h3>
      <p className="text-sm text-stone-500 mb-4">Advisers at your firm who can access this portal and manage the firm's clients.</p>
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
      <div className="divide-y divide-stone-100 mb-4">
        {(team || []).length === 0 && <p className="text-sm text-stone-400 py-2">Just you so far.</p>}
        {(team || []).map(m => (
          <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-900 truncate">{m.full_name || m.email}</p>
              <p className="text-xs text-stone-500 truncate">{m.full_name ? m.email : (m.invite_status === 'pending' ? 'Invited — set-up email sent' : m.email)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${m.role === 'owner' ? 'bg-navy-50 text-navy-700 border-navy-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>{m.role}</span>
              {isOwner && m.role !== 'owner' && (
                <button onClick={() => revoke(m.id)} className="text-stone-300 hover:text-red-500" title="Remove teammate"><X size={15} /></button>
              )}
            </div>
          </div>
        ))}
      </div>
      {isOwner ? (
        <div className="flex items-end gap-2">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@yourfirm.co.uk"
            className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
          <button onClick={invite} disabled={busy || !email.trim()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-navy-800 text-white hover:bg-navy-700 disabled:opacity-40">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Invite
          </button>
        </div>
      ) : (
        <p className="text-xs text-stone-400">Only the firm owner can invite teammates.</p>
      )}
    </div>
  )
}

function AdvisorSettings({ advisor, families, isDemo, team, onReload, firmId }) {
  const isOwner = isDemo || advisor?.role === 'Firm owner'
  const [profile, setProfile] = useState({
    full_name: advisor.full_name,
    email:     advisor.email,
    firm:      advisor.firm,
    phone:     '',
    logo_url:  advisor.logo_url || '',
  })
  const [saved, setSaved]           = useState(false)
  const [saving, setSaving]         = useState(false)
  const [cancelled, setCancelled]   = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]   = useState(null)

  // The logo is the FIRM's (shown in the portal header, on client signup, and to
  // clients). Only the owner can change it: upload to the firm's folder, then point
  // advisers.logo_url at it via the owner-only RPC, and refresh so the header updates.
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setLogoError('Please upload an image file.'); return }
    if (file.size > 2 * 1024 * 1024) { setLogoError('Logo must be under 2 MB.'); return }
    if (isDemo) { setLogoError('Logo upload is disabled in demo mode.'); return }
    setLogoError(null)
    setLogoUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${firmId}/logo-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('adviser-logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('adviser-logos').getPublicUrl(path)
      const { error: rpcError } = await supabase.rpc('set_firm_logo', { p_url: publicUrl })
      if (rpcError) throw rpcError
      setProfile(p => ({ ...p, logo_url: publicUrl }))
      onReload?.()  // refresh the firm so the header + preview show the new logo
    } catch (err) {
      setLogoError(err.message ?? 'Upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!isDemo) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: profile.full_name, firm: profile.firm, phone: profile.phone })
          .eq('id', advisor.id)
        if (error) throw error
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Profile save error:', err)
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Profile card ── */}
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-navy-950">Adviser profile</h2>
            <p className="text-xs text-stone-400 mt-0.5">Your details as displayed to clients</p>
          </div>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <CheckCircle2 size={12} /> Saved
            </span>
          )}
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Full name</label>
              <input className={inputCls} value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Email address</label>
              <input type="email" className={`${inputCls} bg-stone-50 text-stone-500 cursor-not-allowed`} value={profile.email} readOnly />
              <p className="text-xs text-stone-400">To change your email, contact support@everstead.care</p>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Firm / practice name</label>
              <input className={inputCls} value={profile.firm} onChange={e => setProfile(p => ({ ...p, firm: e.target.value }))} placeholder="e.g. Carter Wealth Management" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Phone number</label>
              <input type="tel" className={inputCls} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+44 7700 000000" />
            </div>
          </div>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* ── Logo upload card ── */}
      <div className="rounded-[2rem] border border-stone-200 bg-white p-8 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-navy-950">Firm logo</h2>
          <p className="text-xs text-stone-400 mt-0.5">Shown in your portal header, on client signup, and to clients. Max 2 MB, image files only.</p>
        </div>

        <div className="flex items-center gap-5">
          {advisor.logo_url ? (
            <img
              src={advisor.logo_url}
              alt="Firm logo"
              className="h-14 w-auto max-w-[140px] rounded-lg object-contain border border-stone-200 bg-stone-50 p-1"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center text-stone-400 text-xs">
              No logo
            </div>
          )}

          {isOwner ? (
            <label className={`${primaryBtn} cursor-pointer inline-flex items-center gap-2 ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} disabled={logoUploading || isDemo} />
              {logoUploading ? 'Uploading…' : advisor.logo_url ? 'Replace logo' : 'Upload logo'}
            </label>
          ) : (
            <p className="text-xs text-stone-400">Only the firm owner can change the logo.</p>
          )}
        </div>

        {logoError && (
          <p className="text-xs text-red-600">{logoError}</p>
        )}
        {isDemo && (
          <p className="text-xs text-stone-400 italic">Logo upload disabled in demo mode.</p>
        )}
      </div>

      {/* ── Team card ── */}
      <AdviserTeamCard team={team} isOwner={isDemo || advisor?.role === 'Firm owner'} isDemo={isDemo} onReload={onReload} />

      {/* ── Billing & invoices (custom contract — invoices uploaded by the Everstead team) ── */}
      <AdviserInvoicesCard isDemo={isDemo} />

    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// PORTFOLIO OVERVIEW (feature 1)
// ─────────────────────────────────────────────────────────────
function PortfolioOverview({ families, onSelectFamily, setActiveSection }) {
  const accepted = families.filter(f => f.invite_status === 'accepted')
  const avgReadiness = accepted.length
    ? Math.round(accepted.reduce((sum, f) => sum + f.readiness_score, 0) / accepted.length)
    : 0
  const belowFifty   = accepted.filter(f => f.readiness_score < 50).length
  const totalAlerts  = families.reduce((sum, f) => sum + f.alerts.filter(a => !a.is_read).length, 0)
  const staleClients = accepted.filter(f => daysSince(f.last_updated) > STALE_DAYS)

  const statsCards = [
    { label: 'Avg readiness',        value: `${avgReadiness}%`, icon: TrendingUp,     color: avgReadiness >= 80 ? 'text-emerald-700 bg-emerald-50' : avgReadiness >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50' },
    { label: 'Below 50% readiness',  value: belowFifty,         icon: AlertTriangle,  color: belowFifty > 0 ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50' },
    { label: 'Unread alerts',        value: totalAlerts,        icon: Bell,           color: totalAlerts > 0 ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50' },
    { label: 'Stale plans (60+ days)',value: staleClients.length, icon: Clock,         color: staleClients.length > 0 ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50' },
  ]

  // Clients needing attention: below 80% readiness, has alerts, or stale
  const needsAttention = accepted.filter(f =>
    f.readiness_score < 80 || f.alerts.some(a => !a.is_read) || daysSince(f.last_updated) > STALE_DAYS
  ).sort((a, b) => a.readiness_score - b.readiness_score)

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-stone-200 bg-white px-7 py-5">
        <h2 className="font-display text-2xl font-light text-navy-950">Portfolio overview</h2>
        <p className="text-sm text-stone-500 mt-1">A snapshot of all your clients across {families.length} plan{families.length !== 1 ? 's' : ''}.</p>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={16} />
            </div>
            <p className="text-3xl font-light font-display text-navy-950">{value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Readiness bar for all accepted clients */}
      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 space-y-3">
        <h3 className="text-sm font-semibold text-navy-900">Readiness by client</h3>
        {accepted.length === 0
          ? <p className="text-xs text-stone-400">No accepted clients yet.</p>
          : accepted.sort((a, b) => a.readiness_score - b.readiness_score).map(f => {
            const col = READINESS_COLOR(f.readiness_score)
            return (
              <button
                key={f.id}
                onClick={() => { onSelectFamily(f.id); setActiveSection('families') }}
                className="w-full flex items-center gap-4 group text-left"
              >
                <p className="text-sm font-medium text-navy-900 w-44 shrink-0 truncate group-hover:text-navy-600 transition-colors">{f.owner_name}</p>
                <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className={`h-full rounded-full ${col.bar}`} style={{ width: `${f.readiness_score}%` }} />
                </div>
                <span className={`text-xs font-bold ${col.text} w-10 text-right shrink-0`}>{f.readiness_score}%</span>
              </button>
            )
          })
        }
      </div>

      {/* Clients needing attention */}
      {needsAttention.length > 0 && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <AlertTriangle size={14} /> Needs attention ({needsAttention.length})
          </h3>
          {needsAttention.map(f => (
            <button
              key={f.id}
              onClick={() => { onSelectFamily(f.id); setActiveSection('families') }}
              className="w-full flex items-center gap-3 bg-white border border-amber-200 rounded-2xl px-4 py-3 text-left hover:border-amber-300 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {f.owner_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900 truncate">{f.owner_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {f.readiness_score < 80 && <span className="text-[10px] text-amber-700">{f.readiness_score}% readiness</span>}
                  {f.alerts.some(a => !a.is_read) && <span className="text-[10px] text-red-600">{f.alerts.filter(a=>!a.is_read).length} unread alert{f.alerts.filter(a=>!a.is_read).length !== 1 ? 's' : ''}</span>}
                  {daysSince(f.last_updated) > STALE_DAYS && <span className="text-[10px] text-stone-500">⚠ {daysSince(f.last_updated)} days inactive</span>}
                </div>
              </div>
              <ChevronRight size={14} className="text-stone-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Stale clients section */}
      {staleClients.length > 0 && (
        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 space-y-3">
          <h3 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
            <Clock size={14} className="text-stone-400" /> Plans not updated in 60+ days
          </h3>
          {staleClients.map(f => (
            <button
              key={f.id}
              onClick={() => { onSelectFamily(f.id); setActiveSection('families') }}
              className="w-full flex items-center gap-3 rounded-xl border border-stone-100 px-4 py-3 text-left hover:bg-stone-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center text-xs font-bold uppercase shrink-0">{f.owner_name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-900">{f.owner_name}</p>
                <p className="text-xs text-amber-600">Last updated {relativeTime(f.last_updated)}</p>
              </div>
              <ChevronRight size={14} className="text-stone-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PORTAL ALERTS FEED (feature 10)
// ─────────────────────────────────────────────────────────────
function PortalAlertsSection({ families, onSelectFamily, setActiveSection }) {
  const allAlerts = families
    .flatMap(f => (f.alerts || []).map(a => ({ ...a, family_name: f.owner_name, family_id: f.id })))
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 }
      const diff = (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
      if (diff !== 0) return diff
      return (a.is_read ? 1 : 0) - (b.is_read ? 1 : 0)
    })

  const unread = allAlerts.filter(a => !a.is_read)

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-stone-200 bg-white px-7 py-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-light text-navy-950">All alerts</h2>
          <p className="text-sm text-stone-500 mt-1">{unread.length} unread · {allAlerts.length} total across all clients</p>
        </div>
      </div>

      {allAlerts.length === 0 ? (
        <div className="rounded-[1.5rem] border border-stone-200 bg-white py-12 text-center space-y-2">
          <CheckCircle2 size={28} className="text-emerald-400 mx-auto" />
          <p className="text-sm font-semibold text-navy-900">No alerts across your portfolio</p>
          <p className="text-xs text-stone-400">All clients are up to date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allAlerts.map(alert => {
            const sev = SEVERITY[alert.severity] || SEVERITY.info
            const SevIcon = sev.icon
            return (
              <button
                key={`${alert.family_id}-${alert.id}`}
                onClick={() => { onSelectFamily(alert.family_id); setActiveSection('families') }}
                className={`w-full flex items-start gap-4 rounded-[1.5rem] border px-5 py-4 text-left hover:opacity-90 transition-opacity ${sev.cls}`}
              >
                <SevIcon size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs mt-0.5 opacity-75">{alert.family_name}</p>
                </div>
                {!alert.is_read && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-white/60 rounded-full px-2 py-0.5 border shrink-0">Unread</span>
                )}
                <ChevronRight size={14} className="shrink-0 mt-0.5 opacity-60" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PORTAL ROOT
// ─────────────────────────────────────────────────────────────
// Floating AI assistant for advisers — platform guidance + questions about their OWN
// portfolio. Gated server-side (the adviser-assistant edge function only ever sees the
// caller's firm via the firm-scoped RPCs).
function AdviserAssistant({ isDemo }) {
  const [open, setOpen]         = useState(false)
  // The greeting is scripted (local only) — it must NOT be sent to the API, which
  // requires conversations to start with a user message.
  const [messages, setMessages] = useState([{ role: 'assistant', scripted: true, content: "Hi — I'm your Everstead adviser assistant. Ask me how to do something in the portal, or about your own client portfolio (e.g. “who has the lowest readiness?”)." }])
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
      setTimeout(() => {
        setMessages(m => [...m, { role: 'assistant', content: "In demo mode I can't reach a real portfolio. In your live portal I answer questions about your own clients and guide you around Everstead — always gated to your firm." }])
        setLoading(false)
      }, 500)
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
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 px-5 py-3 text-white text-sm font-semibold rounded-full shadow-lg transition-all ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(100deg, #2d5082 0%, #6f6bc6 50%, #6e9b6a 100%)', boxShadow: '0 8px 24px -6px rgba(111,107,198,0.5)' }}
        aria-label="Open adviser assistant"
      >
        <Sparkles size={16} /> Ask Everstead
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] rounded-[1.75rem] border border-stone-200 bg-white shadow-2xl flex flex-col overflow-hidden" style={{ height: '540px' }}>
          <div className="px-5 py-4 bg-navy-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><Sparkles size={15} className="text-sage-400" /></div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">Adviser assistant</p>
                <p className="text-[11px] text-stone-400 truncate">Guidance + your portfolio · gated to your firm</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="text-stone-400 hover:text-white transition-colors shrink-0"><X size={18} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-stone-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-navy-800 text-white rounded-tr-sm' : 'bg-white border border-stone-200 text-navy-900 rounded-tl-sm'}`}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 rounded-2xl px-3.5 py-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                  <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '160ms', animationDuration: '1s' }} />
                  <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '320ms', animationDuration: '1s' }} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 p-3">
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={1}
                placeholder="Ask about the portal or your clients…"
                disabled={loading}
                className="flex-1 resize-none border border-stone-200 rounded-xl px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 max-h-28 disabled:bg-stone-50"
              />
              <button onClick={send} disabled={loading || !input.trim()} aria-label="Send message" className="shrink-0 w-9 h-9 rounded-xl bg-navy-800 text-white flex items-center justify-center hover:bg-navy-700 transition-colors disabled:opacity-40"><Send size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function AdvisorPortal() {
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  // ── Real data state ─────────────────────────────────────────
  const [realFamilies, setRealFamilies] = useState([])
  const [realFirm, setRealFirm]         = useState(null)
  const [realTeam, setRealTeam]         = useState([])
  const [dataLoading, setDataLoading]   = useState(!isDemo)

  const loadPortal = async () => {
    setDataLoading(true)
    // Link any pending firm invites for this email, then resolve firm + clients + team.
    await supabase.rpc('claim_adviser_invites').then(() => {}, () => {})
    const [firmRes, clientRes, teamRes, inviteRes, notesRes] = await Promise.all([
      supabase.rpc('get_adviser_firm'),
      supabase.rpc('get_adviser_clients'),
      supabase.rpc('get_adviser_team'),
      supabase.rpc('get_adviser_client_invites'),
      supabase.rpc('get_adviser_client_notes'),
    ])
    setRealFirm(Array.isArray(firmRes.data) ? (firmRes.data[0] ?? null) : (firmRes.data ?? null))
    setRealTeam(teamRes.data || [])
    const notesById = {}
    for (const n of notesRes.data || []) notesById[n.client_id] = n
    // Map client profiles into the portal's family shape. Deep plan data (accounts,
    // documents, permissions) is the separate next phase — empty for now.
    const linked = (clientRes.data || []).map(c => ({
      id: c.id,
      owner_name: c.full_name || c.email,
      owner_email: c.email,
      readiness_score: c.readiness_score ?? 0,
      invite_status: 'accepted',
      advisor_role: 'Client',
      last_updated: c.created_at,
      advisor_notes: notesById[c.id]?.notes ?? '',
      next_review_date: notesById[c.id]?.next_review_date ?? '',
      meeting_notes: notesById[c.id]?.meeting_notes ?? '',
      accounts: [], documents: [], instructions: [], trusted_people: [], alerts: [],
      permissions: {},
    }))
    // Pending client invites appear in the list until the family signs up.
    const linkedEmails = new Set(linked.map(f => (f.owner_email || '').toLowerCase()))
    const pending = (inviteRes.data || [])
      .filter(i => !linkedEmails.has((i.email || '').toLowerCase()))
      .map(i => ({
        id: `invite-${i.id}`,
        owner_name: i.client_name || i.email,
        owner_email: i.email,
        readiness_score: 0,
        invite_status: 'pending',
        advisor_role: 'Invited',
        last_updated: i.created_at,
        accounts: [], documents: [], instructions: [], trusted_people: [], alerts: [],
        permissions: {},
      }))
    setRealFamilies([...linked, ...pending])
    setDataLoading(false)
  }

  useEffect(() => {
    if (isDemo || !user) return
    loadPortal()
  }, [user, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // ── Data resolution ──────────────────────────────────────────
  const advisor  = isDemo ? DEMO_ADVISOR : profile ? {
    id:              user.id,
    full_name:       profile.full_name,
    email:           profile.email ?? user.email,
    firm:            realFirm?.firm_name ?? '',
    logo_url:        realFirm?.logo_url ?? null,
    role:            realFirm?.role === 'owner' ? 'Firm owner' : 'Financial Adviser',
    plan:            profile.plan,
    families_limit:  realFirm?.max_families ?? profile.families_limit ?? 5,
    subscription_status: profile.subscription_status,
    billing_cycle:   profile.billing_cycle ?? 'monthly',
    next_billing_date: profile.next_billing_date ?? null,
    plan_started_at: profile.created_at ?? null,
  } : null

  const families = isDemo ? DEMO_ADVISOR_FAMILIES : realFamilies

  const [selectedFamilyId, setSelectedFamilyId] = useState(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [showInvite, setShowInvite] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('readiness') // readiness | name | updated
  const [filterStatus, setFilterStatus] = useState('all') // all | accepted | pending
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [nudgeSent, setNudgeSent] = useState(false)

  // Auto-select first family once loaded
  useEffect(() => {
    if (families.length > 0 && !selectedFamilyId) {
      setSelectedFamilyId(families[0].id)
    }
  }, [families])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkNudge = () => {
    setNudgeSent(true)
    setTimeout(() => { setNudgeSent(false); setSelectMode(false); setSelectedIds(new Set()) }, 3000)
  }

  const filteredFamilies = useMemo(() => {
    let list = families.filter(f => f.owner_name.toLowerCase().includes(search.toLowerCase()))
    if (filterStatus !== 'all') list = list.filter(f => f.invite_status === filterStatus)
    if (sortBy === 'readiness') list = [...list].sort((a, b) => a.readiness_score - b.readiness_score)
    else if (sortBy === 'name') list = [...list].sort((a, b) => a.owner_name.localeCompare(b.owner_name))
    else if (sortBy === 'updated') list = [...list].sort((a, b) => daysSince(a.last_updated) - daysSince(b.last_updated))
    return list
  }, [families, search, sortBy, filterStatus])

  const totalUnreadAlerts = families.reduce((sum, f) => sum + (f.alerts||[]).filter(a => !a.is_read).length, 0)
  const selectedFamily = families.find(f => f.id === selectedFamilyId) ?? null

  if (!isDemo && dataLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Loading your portal…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 text-navy-950">
      {isDemo && (
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>Demo mode — showing Sophie Carter's adviser portal. Data is fictional.</span>
          <Link to="/get-started" className="underline hover:no-underline">Create your own plan →</Link>
        </div>
      )}

      {/* ── Top bar ──────────────────────────────── */}
      <header className="border-b border-navy-800" style={{ background: 'linear-gradient(100deg, #0d1628 0%, #1d3052 38%, #2a2a55 70%, #18301f 100%)' }}>
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src="/logo-v2-white.png" alt="Everstead" className="h-8 w-auto" />
            </Link>
            <div className="hidden sm:block w-px h-6 bg-navy-700" />
            {advisor?.logo_url ? (
              <span className="hidden sm:flex items-center bg-white rounded-md px-2 py-1" title={advisor.firm}>
                <img src={advisor.logo_url} alt={advisor.firm || 'Firm logo'} className="h-6 w-auto max-w-[150px] object-contain" />
              </span>
            ) : (
              <span className="hidden sm:block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">Adviser Portal</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{advisor?.full_name}</p>
              <p className="text-xs text-stone-400">{advisor?.firm}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-navy-700 flex items-center justify-center text-sm font-bold text-white uppercase">
              {advisor?.full_name?.[0] ?? 'A'}
            </div>
            <button
              onClick={isDemo ? () => navigate('/') : handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="text-stone-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* pb-24 keeps the floating "Ask Everstead" pill from covering the last content on mobile */}
      <div className="max-w-screen-2xl mx-auto px-6 pt-8 pb-24 grid xl:grid-cols-[300px_1fr] gap-8 items-start">

        {/* ── SIDEBAR ──────────────────────────────────── */}
        <aside className="space-y-4 xl:sticky xl:top-8">

          {/* Adviser identity */}
          <div className="rounded-[2rem] border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-3">
              {advisor?.logo_url ? (
                <img src={advisor.logo_url} alt={advisor.firm || ''} className="w-12 h-12 rounded-2xl object-contain bg-white border border-stone-200 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-700 flex items-center justify-center shrink-0">
                  <Briefcase size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-950 truncate">{advisor?.full_name}</p>
                <p className="text-xs text-stone-500 truncate">{advisor?.firm}</p>
              </div>
            </div>
            <div className="mt-4 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5">
              <p className="text-xs text-stone-500 mb-1.5">{families.length} / {advisor?.families_limit ?? 5} families</p>
              <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                <div className="h-full rounded-full bg-navy-700" style={{ width: `${Math.min(100, (families.length / (advisor?.families_limit || 1)) * 100)}%` }} />
              </div>
            </div>
            {/* 5-section nav */}
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {[
                { id: 'overview',   icon: LayoutDashboard, label: 'Overview' },
                { id: 'families',   icon: Users,           label: 'Clients' },
                { id: 'allAlerts',  icon: Bell,            label: 'Alerts',  badge: totalUnreadAlerts },
                { id: 'resources',  icon: BookOpen,        label: 'Guides' },
                { id: 'settings',   icon: Settings,        label: 'Settings' },
              ].map(({ id, icon: Icon, label, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`relative flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold transition-colors ${activeSection === id ? 'bg-navy-800 text-white' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                >
                  <Icon size={13} />
                  {label}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Family list */}
          {activeSection === 'families' && (
            <div className="rounded-[2rem] border border-stone-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Client families</p>
                <div className="flex items-center gap-2">
                  {/* Bulk nudge is demo-only until the real nudge email exists. */}
                  {isDemo && (
                    <button
                      onClick={() => { setSelectMode(v => !v); setSelectedIds(new Set()) }}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${selectMode ? 'bg-navy-100 text-navy-700' : 'text-stone-500 hover:text-navy-700'}`}
                    >
                      {selectMode ? 'Cancel' : 'Select'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowInvite(true)}
                    disabled={families.length >= (advisor?.families_limit ?? 5)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  className="w-full border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-navy-300"
                  placeholder="Search families…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Sort + filter */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-[11px] text-stone-600 bg-white focus:outline-none focus:ring-1 focus:ring-navy-300"
                >
                  <option value="readiness">Sort: Readiness ↑</option>
                  <option value="name">Sort: Name A–Z</option>
                  <option value="updated">Sort: Last updated</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-[11px] text-stone-600 bg-white focus:outline-none focus:ring-1 focus:ring-navy-300"
                >
                  <option value="all">All</option>
                  <option value="accepted">Accepted</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="space-y-2">
                {filteredFamilies.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-4">No families match your search.</p>
                ) : filteredFamilies.map(family => (
                  <FamilyCard
                    key={family.id}
                    family={family}
                    active={selectedFamilyId === family.id && activeSection === 'families'}
                    onClick={() => { setSelectedFamilyId(family.id); setActiveSection('families') }}
                    selectMode={selectMode}
                    selected={selectedIds.has(family.id)}
                    onToggle={toggleSelect}
                  />
                ))}
              </div>

              {/* Bulk nudge bar (demo-only, like the Select toggle above) */}
              {isDemo && selectMode && (
                <div className="border-t border-stone-100 pt-3 space-y-2">
                  {nudgeSent ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                      <CheckCircle2 size={13} /> Nudge sent to {selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''}.
                    </div>
                  ) : (
                    <button
                      onClick={handleBulkNudge}
                      disabled={selectedIds.size === 0}
                      className="w-full flex items-center justify-center gap-2 btn-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-40"
                    >
                      <Send size={12} /> Send readiness nudge{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                    </button>
                  )}
                  <p className="text-[10px] text-stone-400 text-center">Sends a "your plan needs attention" email to selected clients.</p>
                </div>
              )}

              {families.length === 0 && (
                <div className="py-6 text-center space-y-2">
                  <p className="text-sm text-stone-400">No families yet.</p>
                  <button onClick={() => setShowInvite(true)} className={primaryBtn}>
                    <UserPlus size={14} /> Invite first client
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <Lock size={14} className="text-amber-700 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed text-amber-900">
                You only see information explicitly shared with you. Clients retain full control of their plans at all times.
              </p>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────── */}
        <main>
          {activeSection === 'overview' ? (
            <PortfolioOverview families={families} onSelectFamily={(id) => { setSelectedFamilyId(id); setActiveSection('families') }} setActiveSection={setActiveSection} />
          ) : activeSection === 'allAlerts' ? (
            <PortalAlertsSection families={families} onSelectFamily={(id) => { setSelectedFamilyId(id); setActiveSection('families') }} setActiveSection={setActiveSection} />
          ) : activeSection === 'settings' ? (
            <AdvisorSettings advisor={advisor} families={families} isDemo={isDemo}
              team={isDemo
                ? [{ id: 't1', email: DEMO_ADVISOR.email, role: 'owner', invite_status: 'accepted', full_name: DEMO_ADVISOR.full_name },
                   { id: 't2', email: 'james@carterwealth.co.uk', role: 'member', invite_status: 'accepted', full_name: 'James Reid' }]
                : realTeam}
              onReload={isDemo ? undefined : loadPortal} firmId={realFirm?.id} />
          ) : activeSection === 'resources' ? (
            <AdvisorResourcesSection />
          ) : selectedFamily ? (
            <FamilyView family={selectedFamily} isDemo={isDemo} />
          ) : (
            <div className="rounded-[2rem] border border-stone-200 bg-white py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-navy-50 text-navy-400 flex items-center justify-center mx-auto">
                <Users size={24} />
              </div>
              <p className="text-base font-semibold text-navy-900">Select a family to view their plan</p>
              <p className="text-sm text-stone-400 max-w-xs mx-auto">Choose a client from the sidebar, or invite your first family to get started.</p>
              <button onClick={() => setShowInvite(true)} className={`${primaryBtn} mt-2`}>
                <UserPlus size={14} /> Invite first client
              </button>
            </div>
          )}
        </main>
      </div>

      {showInvite && (
        <InviteFamilyModal
          onClose={() => setShowInvite(false)}
          isDemo={isDemo}
          familiesCount={families.length}
          familiesLimit={advisor?.families_limit ?? 5}
          onInvited={isDemo ? undefined : loadPortal}
        />
      )}

      {/* Adviser AI assistant — gated to this firm's portfolio */}
      <AdviserAssistant isDemo={isDemo} />
    </div>
  )
}
