import React, { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  HeartCrack, ShieldAlert, Clock, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, X, Send, RotateCcw, UserRound,
  FileText, Phone, Mail, Calendar, MapPin, Hash, MessageSquare,
  LogOut, Filter, ExternalLink, Shield, Users, Copy, Check,
  Loader2, Trash2, LayoutDashboard, Folder, BookOpen, Heart,
  CreditCard, ChevronDown, ChevronUp, Search,
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
          onSend={async (msg) => {
            setShowInfoModal(false)
            // Actually send the email to the reporter
            fetch('/api/emails/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'info-request',
                to: report.reporter_email,
                reporterName: report.reporter_name,
                ownerName: report.owner_name,
                message: msg,
              }),
            }).catch(console.error)
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

      // 2. Send invite email
      const emailRes = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin',
          inviteeEmail: trimmed,
          inviteUrl: `${window.location.origin}/accept-admin-invite?token=${token}`,
        }),
      })
      if (!emailRes.ok) {
        const emailErr = await emailRes.json().catch(() => ({}))
        throw new Error(emailErr.error || 'Invite inserted but email failed to send.')
      }

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
// DEMO USERS
// ─────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { id: 'u1', full_name: 'James Thornton',   email: 'james@example.com',   phone: '+44 7700 900111', plan: 'family',    subscription_status: 'active',        billing_cycle: 'yearly',  readiness_score: 72, created_at: '2026-04-15T10:00:00Z', trial_ends_at: null,                   stripe_customer_id: 'cus_demo1', stripe_subscription_id: 'sub_demo1', accounts_count: 6, documents_count: 4, people_count: 3, instructions_count: 5, wishes_count: 2 },
  { id: 'u2', full_name: 'Sarah Okafor',     email: 'sarah@example.com',   phone: '+44 7700 900222', plan: 'essential', subscription_status: 'trialing',       billing_cycle: 'monthly', readiness_score: 35, created_at: '2026-04-22T14:30:00Z', trial_ends_at: '2026-05-07T14:30:00Z', stripe_customer_id: 'cus_demo2', stripe_subscription_id: 'sub_demo2', accounts_count: 2, documents_count: 0, people_count: 1, instructions_count: 0, wishes_count: 0 },
  { id: 'u3', full_name: 'Marcus Webb',      email: 'marcus@example.com',  phone: null,              plan: 'essential', subscription_status: 'trialing',       billing_cycle: 'monthly', readiness_score: 10, created_at: '2026-05-01T09:00:00Z', trial_ends_at: '2026-05-15T09:00:00Z', stripe_customer_id: 'cus_demo3', stripe_subscription_id: 'sub_demo3', accounts_count: 1, documents_count: 0, people_count: 0, instructions_count: 0, wishes_count: 0 },
  { id: 'u4', full_name: 'Priya Sharma',     email: 'priya@example.com',   phone: '+44 7700 900444', plan: 'advisor',   subscription_status: 'active',        billing_cycle: 'yearly',  readiness_score: 91, created_at: '2026-04-10T08:00:00Z', trial_ends_at: null,                   stripe_customer_id: 'cus_demo4', stripe_subscription_id: 'sub_demo4', accounts_count: 12, documents_count: 8, people_count: 5, instructions_count: 9, wishes_count: 4 },
  { id: 'u5', full_name: 'Tom Blackwell',    email: 'tom@example.com',     phone: '+44 7700 900555', plan: 'family',    subscription_status: 'cancelling',    billing_cycle: 'monthly', readiness_score: 55, created_at: '2026-03-28T16:00:00Z', trial_ends_at: null,                   stripe_customer_id: 'cus_demo5', stripe_subscription_id: 'sub_demo5', accounts_count: 4, documents_count: 3, people_count: 2, instructions_count: 3, wishes_count: 1 },
  { id: 'u6', full_name: 'Helen Marsh',      email: 'helen@example.com',   phone: '+44 7700 900666', plan: 'essential', subscription_status: 'cancelled',     billing_cycle: 'monthly', readiness_score: 28, created_at: '2026-03-01T10:00:00Z', trial_ends_at: null,                   stripe_customer_id: 'cus_demo6', stripe_subscription_id: null,        accounts_count: 2, documents_count: 1, people_count: 1, instructions_count: 0, wishes_count: 0 },
  { id: 'u7', full_name: 'David Osei',       email: 'david@example.com',   phone: '+44 7700 900777', plan: 'essential', subscription_status: 'trial_expired', billing_cycle: 'monthly', readiness_score: 20, created_at: '2026-04-20T12:00:00Z', trial_ends_at: '2026-05-04T12:00:00Z', stripe_customer_id: 'cus_demo7', stripe_subscription_id: 'sub_demo7', accounts_count: 1, documents_count: 0, people_count: 0, instructions_count: 0, wishes_count: 0 },
]

// ─────────────────────────────────────────────────────────────
// USERS SECTION
// ─────────────────────────────────────────────────────────────
const PLAN_BADGE = {
  essential: 'bg-stone-100 text-stone-600 border-stone-200',
  family:    'bg-blue-50 text-blue-700 border-blue-200',
  advisor:   'bg-purple-50 text-purple-700 border-purple-200',
}
const STATUS_COLOR = {
  active:           'text-emerald-700 bg-emerald-50 border-emerald-200',
  trialing:         'text-sky-700 bg-sky-50 border-sky-200',
  cancelling:       'text-amber-700 bg-amber-50 border-amber-200',
  cancelled:        'text-stone-500 bg-stone-100 border-stone-200',
  canceled:         'text-stone-500 bg-stone-100 border-stone-200',
  past_due:         'text-red-700 bg-red-50 border-red-200',
  trial_expired:    'text-red-700 bg-red-50 border-red-200',
  incomplete:       'text-stone-500 bg-stone-100 border-stone-200',
  pending_deletion: 'text-red-700 bg-red-50 border-red-200',
}
const STATUS_LABEL = {
  active:           'Active',
  trialing:         'Free trial',
  cancelling:       'Cancelling',
  cancelled:        'Churned',
  canceled:         'Churned',
  past_due:         'Payment failed',
  trial_expired:    'Trial expired',
  incomplete:       'Incomplete',
  pending_deletion: 'Pending deletion',
}

function ReadinessBar({ score }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-stone-600 w-8 text-right">{score}%</span>
    </div>
  )
}

function TodoList({ u }) {
  const items = [
    { done: u.accounts_count > 0,      label: 'Add accounts' },
    { done: u.documents_count > 0,     label: 'Upload documents' },
    { done: u.people_count > 0,        label: 'Add trusted contacts' },
    { done: u.instructions_count > 0,  label: 'Write instructions' },
    { done: u.wishes_count > 0,        label: 'Record wishes' },
  ]
  const remaining = items.filter(i => !i.done)
  if (remaining.length === 0) return <span className="text-xs text-emerald-600 font-medium">All categories complete</span>
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {remaining.map(i => (
        <span key={i.label} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{i.label}</span>
      ))}
    </div>
  )
}

function EmailUserModal({ u, onClose }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState]     = useState('idle')

  const send = async () => {
    if (!subject.trim() || !message.trim()) return
    setState('sending')
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin-direct',
          to: u.email,
          toName: u.full_name,
          subject: subject.trim(),
          message: message.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      setState('sent')
      setTimeout(onClose, 1500)
    } catch { setState('error') }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-navy-900">Email {u.full_name ?? u.email}</h3>
            <p className="text-xs text-stone-400 mt-0.5">Sends from hello@everstead.care</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors"><X size={18} /></button>
        </div>
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
        />
        <textarea
          autoFocus
          rows={5}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Write your message…"
          className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 resize-none"
        />
        {state === 'error' && <p className="text-xs text-red-600">Failed to send — please try again.</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm text-stone-500 hover:text-stone-700 px-4 py-2 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={send}
            disabled={state === 'sending' || !subject.trim() || !message.trim()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-navy-900 text-white hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            {state === 'sending' ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : state === 'sent' ? 'Sent ✓' : <><Send size={13} /> Send</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminActions({ u }) {
  const [pwState, setPwState]         = useState('idle')
  const [trialState, setTrialState]   = useState('idle')
  const [cancelState, setCancelState] = useState('idle')
  const [suspendState, setSuspendState] = useState('idle')
  const [extendDays, setExtendDays]   = useState(7)
  const [showEmail, setShowEmail]     = useState(false)
  const [isSuspended, setIsSuspended] = useState(u.is_suspended ?? false)

  const sendPasswordReset = async () => {
    setPwState('sending')
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email }),
      })
      setPwState('sent')
      setTimeout(() => setPwState('idle'), 3000)
    } catch { setPwState('error') }
  }

  const extendTrial = async () => {
    setTrialState('sending')
    try {
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: u.stripe_subscription_id || null, userId: u.id, action: 'extend-trial', days: extendDays }),
      })
      if (!res.ok) throw new Error()
      setTrialState('sent')
      setTimeout(() => setTrialState('idle'), 3000)
    } catch { setTrialState('error') }
  }

  const cancelSubscription = async () => {
    if (!u.stripe_subscription_id || !window.confirm(`Cancel subscription for ${u.full_name ?? u.email}? They will keep access until the billing period ends.`)) return
    setCancelState('sending')
    try {
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: u.stripe_subscription_id, userId: u.id }),
      })
      if (!res.ok) throw new Error()
      setCancelState('sent')
      setTimeout(() => setCancelState('idle'), 3000)
    } catch { setCancelState('error') }
  }

  const toggleSuspend = async () => {
    const newSuspended = !isSuspended
    if (!window.confirm(newSuspended
      ? `Suspend ${u.full_name ?? u.email}? They will be immediately logged out and unable to sign in.`
      : `Unsuspend ${u.full_name ?? u.email}? They will regain access immediately.`
    )) return
    setSuspendState('sending')
    try {
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, action: newSuspended ? 'suspend-user' : 'unsuspend-user' }),
      })
      if (!res.ok) throw new Error()
      setIsSuspended(newSuspended)
      setSuspendState('idle')
    } catch { setSuspendState('error'); setTimeout(() => setSuspendState('idle'), 3000) }
  }

  return (
    <>
      <div className="space-y-2">
        {/* Email user */}
        <button
          onClick={() => setShowEmail(true)}
          className="w-full flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors"
        >
          <Send size={12} /> Email user
        </button>

        {/* Password reset */}
        <button
          onClick={sendPasswordReset}
          disabled={pwState === 'sending'}
          className="w-full flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          {pwState === 'sending' ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
          {pwState === 'sent' ? 'Reset sent ✓' : pwState === 'error' ? 'Failed — retry' : 'Send password reset'}
        </button>

        {/* Extend trial — always visible for trialing or no-sub users */}
        <div className="flex gap-1">
          <select
            value={extendDays}
            onChange={e => setExtendDays(Number(e.target.value))}
            className="text-xs border border-stone-200 rounded-xl px-2 py-2 bg-white text-stone-700 focus:outline-none w-20"
          >
            {[3, 7, 14, 30].map(d => <option key={d} value={d}>+{d}d</option>)}
          </select>
          <button
            onClick={extendTrial}
            disabled={trialState === 'sending'}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors disabled:opacity-50"
          >
            {trialState === 'sending' ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
            {trialState === 'sent' ? 'Extended ✓' : trialState === 'error' ? 'Failed' : 'Extend trial'}
          </button>
        </div>

        {/* Suspend / unsuspend */}
        <button
          onClick={toggleSuspend}
          disabled={suspendState === 'sending'}
          className={`w-full flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-colors disabled:opacity-50 ${
            isSuspended
              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              : 'border-amber-200 text-amber-700 hover:bg-amber-50'
          }`}
        >
          {suspendState === 'sending' ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
          {suspendState === 'error' ? 'Failed — retry' : isSuspended ? 'Unsuspend user' : 'Suspend user'}
        </button>

        {/* Cancel subscription */}
        {u.stripe_subscription_id && !['cancelled','canceled','cancelling'].includes(u.subscription_status) && (
          <button
            onClick={cancelSubscription}
            disabled={cancelState === 'sending'}
            className="w-full flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {cancelState === 'sending' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            {cancelState === 'sent' ? 'Cancelled ✓' : cancelState === 'error' ? 'Failed — retry' : 'Cancel subscription'}
          </button>
        )}
      </div>

      {showEmail && <EmailUserModal u={u} onClose={() => setShowEmail(false)} />}
    </>
  )
}

function UserRow({ u }) {
  const [open, setOpen] = useState(false)
  const statusCls  = STATUS_COLOR[u.subscription_status] ?? STATUS_COLOR.incomplete
  const planCls    = PLAN_BADGE[u.plan] ?? PLAN_BADGE.essential
  const daysLeft   = u.trial_ends_at ? Math.ceil((new Date(u.trial_ends_at) - Date.now()) / 86400000) : null
  const statusLabel = STATUS_LABEL[u.subscription_status] ?? (u.subscription_status?.replace(/_/g, ' ') ?? '—')

  // Build Stripe dashboard URLs
  const stripeCustomerUrl     = u.stripe_customer_id     ? `https://dashboard.stripe.com/customers/${u.stripe_customer_id}` : null
  const stripeSubscriptionUrl = u.stripe_subscription_id ? `https://dashboard.stripe.com/subscriptions/${u.stripe_subscription_id}` : null

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-sm font-semibold shrink-0">
          {u.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-navy-900 truncate">{u.full_name ?? '—'}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${planCls}`}>{u.plan}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCls}`}>
              {statusLabel}
              {daysLeft !== null && daysLeft > 0 && ` · ${daysLeft}d left`}
            </span>
            {u.is_suspended && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                <ShieldAlert size={10} /> Suspended
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-0.5 truncate">{u.email}</p>
        </div>
        <div className="shrink-0 w-28 hidden sm:block">
          <ReadinessBar score={u.readiness_score ?? 0} />
        </div>
        <div className="shrink-0 text-stone-300">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-5 py-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Contact details */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Contact</p>
            {[
              [Mail,     'Email',  u.email],
              [Phone,    'Phone',  u.phone],
              [Calendar, 'Joined', fmtDate(u.created_at)],
            ].map(([Icon, label, val]) => val ? (
              <div key={label} className="flex items-start gap-2 text-sm">
                <Icon size={13} className="text-stone-400 mt-0.5 shrink-0" />
                <span className="text-stone-500 w-16 shrink-0 text-xs">{label}</span>
                <span className="text-navy-900 font-medium text-xs">{val}</span>
              </div>
            ) : null)}
          </div>

          {/* Billing */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Billing</p>
            {/* Status */}
            <div className="flex items-start gap-2">
              <CreditCard size={13} className="text-stone-400 mt-0.5 shrink-0" />
              <span className="text-stone-500 w-16 shrink-0 text-xs">Status</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCls}`}>{statusLabel}</span>
            </div>
            {/* Billing cycle */}
            {u.billing_cycle && (
              <div className="flex items-start gap-2">
                <Calendar size={13} className="text-stone-400 mt-0.5 shrink-0" />
                <span className="text-stone-500 w-16 shrink-0 text-xs">Cycle</span>
                <span className="text-navy-900 font-medium text-xs capitalize">{u.billing_cycle}</span>
              </div>
            )}
            {/* Trial end date */}
            {u.trial_ends_at && (
              <div className="flex items-start gap-2">
                <Calendar size={13} className="text-stone-400 mt-0.5 shrink-0" />
                <span className="text-stone-500 w-16 shrink-0 text-xs">
                  {['trialing'].includes(u.subscription_status) ? 'Trial ends' : 'Trial ended'}
                </span>
                <span className="text-navy-900 font-medium text-xs">{fmtDate(u.trial_ends_at)}</span>
              </div>
            )}
            {/* Stripe customer link */}
            {stripeCustomerUrl ? (
              <div className="flex items-start gap-2">
                <ExternalLink size={13} className="text-stone-400 mt-0.5 shrink-0" />
                <span className="text-stone-500 w-16 shrink-0 text-xs">Stripe</span>
                <a
                  href={stripeCustomerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-600 hover:text-sky-800 hover:underline font-medium"
                >
                  View customer →
                </a>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <ExternalLink size={13} className="text-stone-400 mt-0.5 shrink-0" />
                <span className="text-stone-500 w-16 shrink-0 text-xs">Stripe</span>
                <span className="text-xs text-stone-400">No Stripe record</span>
              </div>
            )}
            {/* Stripe subscription link */}
            {stripeSubscriptionUrl && (
              <div className="flex items-start gap-2">
                <ExternalLink size={13} className="text-stone-400 mt-0.5 shrink-0" />
                <span className="text-stone-500 w-16 shrink-0 text-xs">Subscription</span>
                <a
                  href={stripeSubscriptionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-600 hover:text-sky-800 hover:underline font-medium"
                >
                  View subscription →
                </a>
              </div>
            )}
          </div>

          {/* Completion */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Completion</p>
            <div className="sm:hidden mb-2"><ReadinessBar score={u.readiness_score ?? 0} /></div>
            <div className="grid grid-cols-3 gap-2">
              {[
                [Folder,   'Accounts',     u.accounts_count],
                [FileText, 'Documents',    u.documents_count],
                [Users,    'Contacts',     u.people_count],
                [BookOpen, 'Instructions', u.instructions_count],
                [Heart,    'Wishes',       u.wishes_count],
              ].map(([Icon, label, count]) => (
                <div key={label} className="bg-stone-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-navy-950">{count}</p>
                  <p className="text-xs text-stone-400">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-1">
              <p className="text-xs text-stone-400 mb-1">Still to do</p>
              <TodoList u={u} />
            </div>
          </div>

          {/* Admin actions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">Admin actions</p>
            <AdminActions u={u} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW SECTION
// ─────────────────────────────────────────────────────────────
const MRR_RATES = {
  essential: { monthly: 7,  yearly: 5  },
  family:    { monthly: 15, yearly: 12 },
  advisor:   { monthly: 60, yearly: 48 },
}

function OverviewSection({ isDemo }) {
  const [users, setUsers]     = useState(isDemo ? DEMO_USERS : [])
  const [loading, setLoading] = useState(!isDemo)

  useEffect(() => {
    if (isDemo) return
    supabase.rpc('get_user_stats_for_admin').then(({ data, error }) => {
      if (!error && data) setUsers(data)
      setLoading(false)
    })
  }, [isDemo])

  const active     = users.filter(u => ['active', 'trialing'].includes(u.subscription_status))
  const trialing   = users.filter(u => u.subscription_status === 'trialing')
  const churned    = users.filter(u => ['cancelled', 'canceled'].includes(u.subscription_status))
  const issues     = users.filter(u => ['trial_expired', 'past_due'].includes(u.subscription_status))
  const cancelling = users.filter(u => u.subscription_status === 'cancelling')
  const pendingDel = users.filter(u => u.subscription_status === 'pending_deletion')

  const mrr = active.reduce((sum, u) => {
    const rates = MRR_RATES[u.plan] ?? { monthly: 0, yearly: 0 }
    return sum + (rates[u.billing_cycle ?? 'monthly'] ?? 0)
  }, 0)

  const recent = [...users]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)

  const endingSoon = trialing.filter(u => {
    if (!u.trial_ends_at) return false
    const d = Math.ceil((new Date(u.trial_ends_at) - Date.now()) / 86400000)
    return d >= 0 && d <= 7
  }).sort((a, b) => new Date(a.trial_ends_at) - new Date(b.trial_ends_at))

  const planCounts = ['essential', 'family', 'advisor'].map(plan => ({
    plan,
    count: active.filter(u => u.plan === plan).length,
    mrr: active.filter(u => u.plan === plan).reduce((s, u) => {
      const rates = MRR_RATES[plan] ?? { monthly: 0, yearly: 0 }
      return s + (rates[u.billing_cycle ?? 'monthly'] ?? 0)
    }, 0),
  }))

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-stone-400" />
    </div>
  )

  return (
    <div className="space-y-8">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
          <p className="text-xs text-stone-500 mb-1">Est. MRR</p>
          <p className="text-3xl font-semibold text-navy-950">£{mrr.toLocaleString()}</p>
          <p className="text-xs text-stone-400 mt-0.5">active + trialing users</p>
        </div>
        <StatCard label="Total users"    value={users.length}   Icon={Users}        color="bg-navy-100 text-navy-700" />
        <StatCard label="Active / trial" value={active.length}  Icon={CheckCircle2} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="Churned"        value={churned.length} Icon={XCircle}      color="bg-stone-200 text-stone-600" />
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {issues.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {issues.length} user{issues.length > 1 ? 's' : ''} with a payment issue (trial expired or past due)
            </p>
          </div>
        )}
        {pendingDel.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <Trash2 size={15} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {pendingDel.length} user{pendingDel.length > 1 ? 's' : ''} scheduled for hard deletion — check the cron timeline
            </p>
          </div>
        )}
        {cancelling.length > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 font-medium">
              {cancelling.length} user{cancelling.length > 1 ? 's' : ''} cancelling — consider reaching out
            </p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h3 className="font-semibold text-navy-950 mb-4">Recent signups</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-stone-400">No users yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map(u => {
                const statusCls = STATUS_COLOR[u.subscription_status] ?? STATUS_COLOR.incomplete
                const planCls   = PLAN_BADGE[u.plan] ?? PLAN_BADGE.essential
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-semibold shrink-0">
                      {u.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{u.full_name ?? u.email}</p>
                      <p className="text-xs text-stone-400">{fmtDate(u.created_at)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${planCls}`}>{u.plan}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCls}`}>
                      {STATUS_LABEL[u.subscription_status] ?? u.subscription_status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Plan breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h3 className="font-semibold text-navy-950 mb-4">
              Plan breakdown <span className="text-stone-400 font-normal text-sm">(active + trial)</span>
            </h3>
            <div className="space-y-3">
              {planCounts.map(({ plan, count, mrr: planMrr }) => (
                <div key={plan} className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize w-20 text-center ${PLAN_BADGE[plan] ?? PLAN_BADGE.essential}`}>{plan}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-navy-500 rounded-full" style={{ width: active.length ? `${(count / active.length) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-sm font-semibold text-navy-900 w-6 text-right">{count}</span>
                  <span className="text-xs text-stone-400 w-16 text-right">£{planMrr}/mo</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trials ending soon */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h3 className="font-semibold text-navy-950 mb-1">Trials ending in 7 days</h3>
            <p className="text-xs text-stone-400 mb-4">These users haven't converted yet</p>
            {endingSoon.length === 0 ? (
              <p className="text-sm text-stone-400">None ending soon 🎉</p>
            ) : (
              <div className="space-y-3">
                {endingSoon.map(u => {
                  const d = Math.ceil((new Date(u.trial_ends_at) - Date.now()) / 86400000)
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-900 truncate">{u.full_name ?? u.email}</p>
                        <p className="text-xs text-stone-400 truncate">{u.email}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${d <= 2 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {d === 0 ? 'Today' : `${d}d left`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CSV EXPORT
// ─────────────────────────────────────────────────────────────
function exportCsv(users) {
  const headers = ['Name','Email','Phone','Plan','Billing','Status','Readiness %','Joined','Trial ends','Stripe customer']
  const rows = users.map(u => [
    u.full_name ?? '',
    u.email ?? '',
    u.phone ?? '',
    u.plan ?? '',
    u.billing_cycle ?? '',
    u.subscription_status ?? '',
    u.readiness_score ?? '',
    u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '',
    u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString('en-GB') : '',
    u.stripe_customer_id ?? '',
  ])
  const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `everstead-users-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function UsersSection({ isDemo }) {
  const [users, setUsers]           = useState(isDemo ? DEMO_USERS : [])
  const [loading, setLoading]       = useState(!isDemo)
  const [search, setSearch]         = useState('')
  const [planFilter, setPlan]       = useState('all')
  const [statusFilter, setStatus]   = useState('all')

  useEffect(() => {
    if (isDemo) return
    supabase.rpc('get_user_stats_for_admin').then(({ data, error }) => {
      if (!error && data) setUsers(data)
      setLoading(false)
    })
  }, [isDemo])

  const visible = users.filter(u => {
    if (planFilter !== 'all' && u.plan !== planFilter) return false
    if (statusFilter === 'active')   return ['active', 'trialing'].includes(u.subscription_status)
    if (statusFilter === 'cancelling') return u.subscription_status === 'cancelling'
    if (statusFilter === 'payment')  return ['trial_expired', 'past_due'].includes(u.subscription_status)
    if (statusFilter === 'churned')  return ['cancelled', 'canceled'].includes(u.subscription_status)
    if (search) {
      const q = search.toLowerCase()
      return (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
    }
    return true
  }).filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
  })

  const activeCount      = users.filter(u => ['active', 'trialing'].includes(u.subscription_status)).length
  const cancellingCount  = users.filter(u => u.subscription_status === 'cancelling').length
  const churnedCount     = users.filter(u => ['cancelled', 'canceled'].includes(u.subscription_status)).length
  const paymentIssueCount = users.filter(u => ['trial_expired', 'past_due'].includes(u.subscription_status)).length

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users"      value={users.length}      Icon={Users}        color="bg-navy-100 text-navy-700" />
        <StatCard label="Active / trial"   value={activeCount}       Icon={CheckCircle2} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="Cancelling"       value={cancellingCount}   Icon={AlertCircle}  color="bg-amber-100 text-amber-700" />
        <StatCard label="Churned"          value={churnedCount}      Icon={XCircle}      color="bg-stone-200 text-stone-600" />
      </div>
      {paymentIssueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {paymentIssueCount} user{paymentIssueCount > 1 ? 's' : ''} with a payment issue — use the filter below to view them.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
        </div>
        <div className="flex rounded-xl border border-stone-200 bg-white overflow-hidden text-xs font-medium">
          {[['all','All plans'],['essential','Essential'],['family','Family'],['advisor','Advisor']].map(([v,l]) => (
            <button key={v} onClick={() => setPlan(v)}
              className={`px-3 py-2 transition-colors ${planFilter === v ? 'bg-navy-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
            >{l}</button>
          ))}
        </div>
        <div className="flex rounded-xl border border-stone-200 bg-white overflow-hidden text-xs font-medium">
          {[
            ['all',        'All statuses'],
            ['active',     'Active'],
            ['cancelling', 'Cancelling'],
            ['payment',    'Payment issue'],
            ['churned',    'Churned'],
          ].map(([v,l]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={`px-3 py-2 transition-colors ${statusFilter === v ? 'bg-navy-900 text-white' : 'text-stone-500 hover:bg-stone-50'}`}
            >{l}</button>
          ))}
        </div>
        <button
          onClick={() => exportCsv(visible)}
          title="Export visible users to CSV"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors"
        >
          <FileText size={13} /> Export CSV
        </button>
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-stone-400" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
          <p className="text-stone-400 text-sm">No users match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(u => <UserRow key={u.id} u={u} />)}
        </div>
      )}
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

  const [activeTab, setActiveTab]           = useState('overview')
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
    { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { id: 'reports',  label: 'Reports',  Icon: Clock },
    { id: 'users',    label: 'Users',    Icon: UserRound },
    { id: 'team',     label: 'Team',     Icon: Users },
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

        {/* ── Overview tab ── */}
        {activeTab === 'overview' && (
          <>
            <div>
              <h1 className="text-2xl font-semibold text-navy-950">Overview</h1>
              <p className="text-sm text-stone-500 mt-1">Key metrics and recent activity</p>
            </div>
            <OverviewSection isDemo={isDemo} />
          </>
        )}

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

        {/* ── Users tab ── */}
        {activeTab === 'users' && (
          <>
            <div>
              <h1 className="text-2xl font-semibold text-navy-950">Users</h1>
              <p className="text-sm text-stone-500 mt-1">Profile details and readiness progress — no private plan content is shown</p>
            </div>
            <UsersSection isDemo={isDemo} />
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
