import React, { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  HeartCrack, ShieldAlert, Clock, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, X, Send, RotateCcw, UserRound,
  FileText, Phone, Mail, Calendar, MapPin, Hash, MessageSquare,
  LogOut, Filter, ExternalLink, Shield, Users, Copy, Check,
  Loader2, Trash2, LayoutDashboard,
} from 'lucide-react'
import { getLiveReports, updateReportStatus, verifyReport, setOwnerStatus } from '../lib/demoData'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:        { label: 'Pending review',  color: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-400' },
  verified:       { label: 'Verified',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  rejected:       { label: 'Rejected',        color: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-400' },
  actioned:       { label: 'Actioned',        color: 'bg-sky-50 text-sky-700 border-sky-200',           dot: 'bg-sky-400' },
  info_requested: { label: 'Info requested',  color: 'bg-purple-50 text-purple-700 border-purple-200',  dot: 'bg-purple-400' },
}

const TYPE_META = {
  death:    { label: 'Death',    Icon: HeartCrack,  bg: 'bg-red-600',   light: 'bg-red-50 text-red-700 border-red-200' },
  incident: { label: 'Incident', Icon: ShieldAlert, bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-200' },
}

// Demo pending invites shown in demo mode
const DEMO_INVITES = [
  { id: 'di1', email: 'sarah@everstead.care',   invited_at: '2026-04-28T10:00:00Z', status: 'pending' },
  { id: 'di2', email: 'marcus@everstead.care',  invited_at: '2026-04-27T14:30:00Z', status: 'accepted' },
]

const DEMO_TEAM = [
  { id: 'dt1', email: 'founder@everstead.care', full_name: 'Everstead Admin', role: 'admin' },
  { id: 'dt2', email: 'marcus@everstead.care',  full_name: 'Marcus Webb',     role: 'admin' },
]

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(iso)) } catch { return '—' }
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) } catch { return '—' }
}

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, Icon, color }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-navy-950">{value}</p>
        <p className="text-xs text-stone-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BADGES
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
function TypeBadge({ type }) {
  const meta = TYPE_META[type] ?? TYPE_META.incident
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${meta.light}`}>
      {meta.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// TIMELINE ITEM
// ─────────────────────────────────────────────────────────────
function TimelineItem({ event, at, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-navy-300 mt-1.5 shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-stone-100 mt-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm text-navy-900">{event}</p>
        <p className="text-xs text-stone-400 mt-0.5">{fmtDateTime(at)}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// REPORT DETAIL PANEL
// ─────────────────────────────────────────────────────────────
function ReportDetail({ report, onClose, onAction }) {
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [actioning, setActioning] = useState(null)

  const typeMeta = TYPE_META[report.type] ?? TYPE_META.incident

  const action = async (newStatus, timelineEvent) => {
    setActioning(newStatus)
    await new Promise(r => setTimeout(r, 600))
    if (newStatus === 'verified') {
      // verifyReport sets owner_status + appends timeline in one call
      verifyReport(report.id)
      onAction(report.id, 'verified',
        `Report verified — owner status set to "${report.type === 'death' ? 'deceased' : 'incapacitated'}" and after-death access grants unlocked`)
    } else {
      onAction(report.id, newStatus, timelineEvent)
    }
    setActioning(null)
    if (newStatus === 'rejected') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className={`${typeMeta.bg} px-6 py-5 flex items-start gap-4 shrink-0`}>
          <typeMeta.Icon size={22} className="text-white shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold">{report.type === 'death' ? 'Death report' : 'Incident report'}</p>
            <p className="text-white/80 text-sm mt-0.5">{report.owner_name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-6">

          {/* Status + actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <StatusBadge status={report.status} />
            <div className="flex gap-2 flex-wrap">
              {report.status === 'pending' && (
                <>
                  <button
                    onClick={() => action('verified', 'Report verified by admin')}
                    disabled={!!actioning}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    {actioning === 'verified' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Verify &amp; unlock access
                  </button>
                  <button
                    onClick={() => setShowInfoModal(true)}
                    disabled={!!actioning}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-60"
                  >
                    <Send size={12} /> Request info
                  </button>
                  <button
                    onClick={() => action('rejected', 'Report rejected by admin')}
                    disabled={!!actioning}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {actioning === 'rejected' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                    Reject
                  </button>
                </>
              )}
              {report.status === 'verified' && (
                <button
                  onClick={() => action('actioned', 'Report marked as fully actioned')}
                  disabled={!!actioning}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-60"
                >
                  {actioning === 'actioned' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Mark as actioned
                </button>
              )}
              {['rejected','actioned','info_requested'].includes(report.status) && (
                <button
                  onClick={() => action('pending', 'Report re-opened by admin')}
                  disabled={!!actioning}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-60"
                >
                  {actioning === 'pending' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  Re-open
                </button>
              )}
            </div>
          </div>

          {/* Owner */}
          <section>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Owner</p>
            <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
              {[
                [UserRound, 'Full name',    report.owner_name],
                [Mail,      'Email',        report.owner_email],
                [Phone,     'Phone',        report.owner_phone],
                [MapPin,    'Address',      report.owner_address],
                [Calendar,  'Date of birth',fmtDate(report.owner_dob)],
                [Hash,      'National Insurance', report.owner_nin],
              ].filter(([,,v]) => v).map(([Icon, label, value]) => (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <Icon size={14} className="text-stone-400 mt-0.5 shrink-0" />
                  <span className="text-stone-500 w-28 shrink-0">{label}</span>
                  <span className="text-navy-900 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Reporter */}
          <section>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Reported by</p>
            <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
              {[
                [UserRound, 'Name',     report.reporter_name],
                [Mail,      'Email',    report.reporter_email],
                [Phone,     'Phone',    report.reporter_phone],
                [Shield,    'Role',     report.reporter_role],
                [Calendar,  'Submitted',fmtDateTime(report.submitted_at)],
              ].filter(([,,v]) => v).map(([Icon, label, value]) => (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <Icon size={14} className="text-stone-400 mt-0.5 shrink-0" />
                  <span className="text-stone-500 w-28 shrink-0">{label}</span>
                  <span className="text-navy-900 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Type-specific fields */}
          {report.type === 'death' ? (
            <section>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Details of passing</p>
              <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                {[
                  [Calendar, 'Date of death',    fmtDate(report.death_date)],
                  [MapPin,   'Place of death',   report.death_place],
                  [FileText, 'Death cert ref',   report.death_cert_ref],
                  [FileText, 'Solicitor / firm', report.solicitor],
                ].filter(([,,v]) => v).map(([Icon, label, value]) => (
                  <div key={label} className="flex items-start gap-3 text-sm">
                    <Icon size={14} className="text-stone-400 mt-0.5 shrink-0" />
                    <span className="text-stone-500 w-28 shrink-0">{label}</span>
                    <span className="text-navy-900 font-medium">{value}</span>
                  </div>
                ))}
                {report.notes && (
                  <div className="flex items-start gap-3 text-sm">
                    <MessageSquare size={14} className="text-stone-400 mt-0.5 shrink-0" />
                    <span className="text-stone-500 w-28 shrink-0">Notes</span>
                    <span className="text-navy-900">{report.notes}</span>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Incident details</p>
              <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                {[
                  [Calendar,  'Date of incident', fmtDate(report.incident_date)],
                  [Shield,    'Incident type',    report.incident_type],
                  [FileText,  'Medical provider', report.medical_provider],
                ].filter(([,,v]) => v).map(([Icon, label, value]) => (
                  <div key={label} className="flex items-start gap-3 text-sm">
                    <Icon size={14} className="text-stone-400 mt-0.5 shrink-0" />
                    <span className="text-stone-500 w-28 shrink-0">{label}</span>
                    <span className="text-navy-900 font-medium">{value}</span>
                  </div>
                ))}
                {report.incident_description && (
                  <div className="flex items-start gap-3 text-sm">
                    <MessageSquare size={14} className="text-stone-400 mt-0.5 shrink-0" />
                    <span className="text-stone-500 w-28 shrink-0">Description</span>
                    <span className="text-navy-900">{report.incident_description}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Supporting documents */}
          {report.documents?.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Supporting documents</p>
              <div className="space-y-2">
                {report.documents.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm bg-stone-50 rounded-xl px-4 py-3 hover:bg-navy-50 transition-colors group"
                  >
                    <FileText size={14} className="text-stone-400 shrink-0" />
                    <span className="flex-1 text-navy-900 font-medium">{doc.name}</span>
                    <ExternalLink size={13} className="text-stone-300 group-hover:text-navy-500 transition-colors" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Timeline */}
          {report.timeline?.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Activity timeline</p>
              <div className="bg-stone-50 rounded-2xl p-4">
                {report.timeline.map((item, i) => (
                  <TimelineItem key={i} event={item.event} at={item.at} isLast={i === report.timeline.length - 1} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Info request modal */}
      {showInfoModal && (
        <InfoRequestModal
          report={report}
          onClose={() => setShowInfoModal(false)}
          onSend={(msg) => {
            setShowInfoModal(false)
            action('info_requested', `Info requested: "${msg}"`)
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// INFO REQUEST MODAL
// ─────────────────────────────────────────────────────────────
function InfoRequestModal({ report, onClose, onSend }) {
  const [msg, setMsg] = useState('')
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-navy-900">Request more information</h3>
          <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-stone-700 transition-colors"><X size={18} /></button>
        </div>
        <p className="text-xs text-stone-500">This message will be sent to {report.reporter_email}.</p>
        <textarea
          autoFocus
          rows={4}
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Please provide a copy of the death certificate and a form of your own ID…"
          className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-stone-500 hover:text-stone-700 px-4 py-2 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={() => msg.trim() && onSend(msg.trim())}
            disabled={!msg.trim()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-navy-900 text-white hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            <Send size={13} /> Send request
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TEAM SECTION
// ─────────────────────────────────────────────────────────────
function TeamSection({ isDemo, currentUserEmail }) {
  const [email, setEmail]       = useState('')
  const [sending, setSending]   = useState(false)
  const [sentTo, setSentTo]     = useState(null)
  const [error, setError]       = useState(null)
  const [copied, setCopied]     = useState(null) // invite id that was just copied
  const [removing, setRemoving] = useState(null) // invite id being removed

  // In demo mode, use static data. In production, these would be fetched from Supabase.
  const [invites, setInvites] = useState(isDemo ? DEMO_INVITES : [])
  const team                  = isDemo ? DEMO_TEAM : []

  const handleInvite = async (e) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setSending(true)
    setError(null)

    if (isDemo) {
      await new Promise(r => setTimeout(r, 700))
      const token = Math.random().toString(36).slice(2)
      setInvites(prev => [...prev, {
        id: token,
        email: trimmed,
        invited_at: new Date().toISOString(),
        status: 'pending',
        token,
      }])
      setSentTo(trimmed)
      setEmail('')
      setSending(false)
      return
    }

    try {
      // 1. Insert invite row in Supabase
      const token = crypto.randomUUID()
      const { error: insertErr } = await supabase
        .from('admin_invites')
        .insert({ email: trimmed, token, invited_by: currentUserEmail, status: 'pending' })
      if (insertErr) throw insertErr

      // 2. Send invite email via Edge Function
      const { error: fnErr } = await supabase.functions.invoke('send-admin-invite', {
        body: {
          email: trimmed,
          inviteUrl: `${window.location.origin}/accept-admin-invite?token=${token}`,
        },
      })
      if (fnErr) throw fnErr

      setSentTo(trimmed)
      setEmail('')
      // Reload invites
      const { data } = await supabase
        .from('admin_invites')
        .select('*')
        .order('invited_at', { ascending: false })
      if (data) setInvites(data)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    }
    setSending(false)
  }

  const copyInviteLink = (invite) => {
    const token = invite.token ?? invite.id
    const url = `${window.location.origin}/accept-admin-invite?token=${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(invite.id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const revokeInvite = async (invite) => {
    setRemoving(invite.id)
    if (!isDemo) {
      await supabase.from('admin_invites').delete().eq('id', invite.id)
    } else {
      await new Promise(r => setTimeout(r, 400))
    }
    setInvites(prev => prev.filter(i => i.id !== invite.id))
    setRemoving(null)
  }

  const pendingInvites  = invites.filter(i => i.status === 'pending')
  const acceptedInvites = invites.filter(i => i.status === 'accepted')

  return (
    <div className="space-y-8">

      {/* Invite form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <h2 className="font-semibold text-navy-950 mb-1">Invite a team member</h2>
        <p className="text-sm text-stone-500 mb-5">
          Send an invite link to a colleague. Once they accept and sign in, their account will have admin access.
        </p>

        {sentTo && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Invite sent to {sentTo}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {isDemo
                  ? 'Demo mode — no real email was sent. Copy the invite link from the list below.'
                  : 'They will receive an email with a link to set up their admin account.'}
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={e => { setEmail(e.target.value); setSentTo(null); setError(null) }}
            placeholder="colleague@yourfirm.com"
            className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="inline-flex items-center gap-2 bg-navy-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {sending ? <><Loader2 size={14} className="animate-spin" />Sending…</> : <><Send size={14} />Send invite</>}
          </button>
        </form>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h3 className="font-semibold text-navy-950 mb-4">Pending invites</h3>
          <div className="space-y-2">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3">
                <Mail size={15} className="text-stone-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{invite.email}</p>
                  <p className="text-xs text-stone-400">Invited {fmtDate(invite.invited_at)}</p>
                </div>
                <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending</span>
                <button
                  onClick={() => copyInviteLink(invite)}
                  title="Copy invite link"
                  aria-label="Copy invite link"
                  className="p-1.5 text-stone-400 hover:text-navy-700 transition-colors rounded-lg hover:bg-white"
                >
                  {copied === invite.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => revokeInvite(invite)}
                  disabled={removing === invite.id}
                  title="Revoke invite"
                  aria-label="Revoke invite"
                  className="p-1.5 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {removing === invite.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current team */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <h3 className="font-semibold text-navy-950 mb-4">Admin team</h3>
        {[...team, ...acceptedInvites.map(i => ({ id: i.id, email: i.email, full_name: i.email, role: 'admin' }))].length === 0 ? (
          <p className="text-sm text-stone-400">No team members yet — invite someone above.</p>
        ) : (
          <div className="space-y-2">
            {[...team, ...acceptedInvites.map(i => ({ id: i.id, email: i.email, full_name: i.email, role: 'admin' }))].map(member => (
              <div key={member.id} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {member.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900">{member.full_name}</p>
                  <p className="text-xs text-stone-400">{member.email}</p>
                </div>
                <span className="text-xs font-medium text-navy-700 bg-navy-50 border border-navy-200 px-2 py-0.5 rounded-full capitalize">{member.role}</span>
              </div>
            ))}
          </div>
        )}
        {isDemo && (
          <p className="text-xs text-stone-400 mt-4 border-t border-stone-100 pt-4">
            Demo mode — team data is illustrative only. In production this reads from the <code className="font-mono bg-stone-100 px-1 rounded">profiles</code> table where <code className="font-mono bg-stone-100 px-1 rounded">role = 'admin'</code>.
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN ADMIN PANEL
// ─────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const { user, signOut } = useAuth()
  const isDemo = searchParams.get('demo') === 'true'

  const [activeTab, setActiveTab]           = useState('reports')
  const [reports, setReports]               = useState(() => getLiveReports())
  const [selected, setSelected]             = useState(null)
  const [filterType, setFilterType]         = useState('all')
  const [filterStatus, setFilterStatus]     = useState('all')

  const handleAction = (id, newStatus, timelineEvent) => {
    updateReportStatus(id, newStatus, timelineEvent)
    const updated = getLiveReports()
    setReports(updated)
    const updatedReport = updated.find(r => r.id === id)
    if (updatedReport) setSelected(updatedReport)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const filtered = reports.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    return true
  })

  const pendingCount  = reports.filter(r => r.status === 'pending').length
  const deathCount    = reports.filter(r => r.type === 'death').length
  const incidentCount = reports.filter(r => r.type === 'incident').length
  const actionedCount = reports.filter(r => r.status === 'actioned').length

  const NAV = [
    { id: 'reports', label: 'Reports',     Icon: LayoutDashboard },
    { id: 'team',    label: 'Team',        Icon: Users },
  ]

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">

      {/* Top bar */}
      <header className="bg-navy-950 border-b border-navy-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/">
            <img src="/logo-v2-white.png" alt="Everstead" className="h-8 w-auto" />
          </Link>
          <span className="text-xs font-semibold bg-white/10 text-stone-300 px-2.5 py-1 rounded-full">Admin panel</span>
          {isDemo && (
            <span className="text-xs font-semibold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full">Demo</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Tab nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                  activeTab === id
                    ? 'bg-white/15 text-white'
                    : 'text-stone-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </nav>
          <button
            onClick={isDemo ? () => navigate('/') : handleSignOut}
            className="flex items-center gap-2 text-stone-400 hover:text-white text-sm transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {/* Mobile tab nav */}
      <div className="sm:hidden bg-navy-900 border-b border-navy-800 px-4 flex">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-3 border-b-2 transition-colors ${
              activeTab === id ? 'border-white text-white' : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">

        {/* ── Reports tab ── */}
        {activeTab === 'reports' && (
          <>
            <div>
              <h1 className="text-2xl font-semibold text-navy-950">Reports</h1>
              <p className="text-sm text-stone-500 mt-1">Death and incident notifications submitted by delegates</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Pending review"   value={pendingCount}  Icon={Clock}        color="bg-amber-100 text-amber-700" />
              <StatCard label="Death reports"    value={deathCount}    Icon={HeartCrack}   color="bg-red-100 text-red-600" />
              <StatCard label="Incident reports" value={incidentCount} Icon={ShieldAlert}  color="bg-orange-100 text-orange-600" />
              <StatCard label="Actioned"         value={actionedCount} Icon={CheckCircle2} color="bg-emerald-100 text-emerald-700" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Filter size={13} /> Filter:
              </div>
              <div className="flex rounded-xl border border-stone-200 bg-white overflow-hidden text-xs font-medium">
                {[['all','All types'],['death','Death'],['incident','Incident']].map(([v,l]) => (
                  <button key={v} onClick={() => setFilterType(v)}
                    className={`px-3 py-2 transition-colors ${filterType === v ? 'bg-navy-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
                  >{l}</button>
                ))}
              </div>
              <div className="flex rounded-xl border border-stone-200 bg-white overflow-hidden text-xs font-medium">
                {[
                  ['all','All statuses'],['pending','Pending'],['verified','Verified'],
                  ['info_requested','Info requested'],['actioned','Actioned'],['rejected','Rejected'],
                ].map(([v,l]) => (
                  <button key={v} onClick={() => setFilterStatus(v)}
                    className={`px-3 py-2 transition-colors ${filterStatus === v ? 'bg-navy-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
                  >{l}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
                <p className="text-stone-400 text-sm">No reports match the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(report => {
                  const typeMeta = TYPE_META[report.type] ?? TYPE_META.incident
                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelected(report)}
                      className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 flex items-center gap-4 text-left hover:border-navy-300 hover:shadow-sm transition-all group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeMeta.bg}`}>
                        <typeMeta.Icon size={17} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-navy-900">{report.owner_name}</p>
                          <TypeBadge type={report.type} />
                        </div>
                        <p className="text-xs text-stone-500">
                          Reported by {report.reporter_name} ({report.reporter_role}) · {fmtDateTime(report.submitted_at)}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <StatusBadge status={report.status} />
                        <ChevronRight size={15} className="text-stone-300 group-hover:text-navy-500 transition-colors" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Team tab ── */}
        {activeTab === 'team' && (
          <>
            <div>
              <h1 className="text-2xl font-semibold text-navy-950">Team</h1>
              <p className="text-sm text-stone-500 mt-1">Manage who has admin access to this panel</p>
            </div>
            <TeamSection isDemo={isDemo} currentUserEmail={user?.email} />
          </>
        )}
      </div>

      {/* Detail slide-over */}
      {selected && (
        <ReportDetail report={selected} onClose={() => setSelected(null)} onAction={handleAction} />
      )}
    </div>
  )
}
