import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DEMO_DELEGATE, DEMO_DOCUMENTS, DEMO_ACCOUNTS, DEMO_INSTRUCTIONS, DEMO_ALERTS, DEMO_ACTIVITY, DEMO_MESSAGES, DEMO_DELEGATE_MESSAGES, submitReport, getOwnerStatus } from '../lib/demoData'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  Download,
  FileText,
  FolderOpen,
  Lock,
  LogOut,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
  CheckCircle2,
  Info,
  AlertTriangle,
  HeartCrack,
  ShieldAlert,
  Upload,
  Send,
  MessageSquare,
  Play,
  Video,
  FileEdit,
  Settings,
  Eye,
  EyeOff,
  Users,
  HelpCircle,
  Mail,
  Loader2,
  Sparkles,
  ListChecks,
  ChevronUp,
  Copy,
  Check,
  Menu,
  Printer,
  Globe,
  Search,
  BellRing,
  ClipboardCheck,
} from 'lucide-react'
import { getDocumentUrl, supabase } from '../lib/supabase'

const tabs = [
  { id: 'overview',      label: 'Overview',            icon: ShieldCheck },
  { id: 'documents',     label: 'Documents',            icon: FileText },
  { id: 'accounts',      label: 'Accounts',             icon: Wallet },
  { id: 'instructions',  label: 'Instructions',         icon: BookOpen },
  { id: 'notify',        label: 'Notification tracker', icon: ClipboardCheck },
  { id: 'messages',      label: 'Messages',             icon: MessageSquare },
  { id: 'alerts',        label: 'Alerts',               icon: Bell },
  { id: 'activity',      label: 'Activity',             icon: Clock3 },
  { id: 'resources',     label: 'Help & Guides',        icon: HelpCircle },
  { id: 'settings',      label: 'My settings',          icon: Settings },
]

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

const normalise = (value) => (value || '').toString().trim().toLowerCase()

function getSharedCategories(grants, resourceType) {
  return grants
    .filter(grant => normalise(grant.resource_type) === resourceType)
    .map(grant => normalise(grant.resource_category))
    .filter(Boolean)
}

function hasAllAccess(grants, resourceType) {
  return grants.some(grant => normalise(grant.resource_type) === resourceType && !normalise(grant.resource_category))
}

function filterByAccess(items, grants, resourceType, categoryField) {
  if (!items?.length) return []
  if (hasAllAccess(grants, resourceType)) return items
  const categories = getSharedCategories(grants, resourceType)
  if (!categories.length) return []
  return items.filter(item => categories.includes(normalise(item[categoryField])))
}

export default function DelegateDashboard() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const isDemo = searchParams.get('demo') === 'true'
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState(null)
  const [owner, setOwner] = useState(null)
  const [myRole, setMyRole] = useState(null)
  const [documents, setDocuments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [instructions, setInstructions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [activity, setActivity] = useState([])
  const [downloadingId, setDownloadingId] = useState(null)
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [expandedAccount, setExpandedAccount] = useState(null)
  const [expandedAlert, setExpandedAlert] = useState(null)
  const [readAlertIds, setReadAlertIds] = useState(new Set())
  const [myMessages, setMyMessages] = useState([])
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [notifyStatuses, setNotifyStatuses] = useState({})

  useEffect(() => {
    // Demo mode — inject seed data without any Supabase calls
    if (isDemo) {
      setInvite(DEMO_DELEGATE.invite)
      setOwner(DEMO_DELEGATE.owner)
      setDocuments(DEMO_DOCUMENTS)
      setAccounts(DEMO_ACCOUNTS)
      setInstructions(DEMO_INSTRUCTIONS)
      setAlerts(DEMO_ALERTS)
      setActivity(DEMO_ACTIVITY)
      // Messages: released on death/incapacity verification (checked from live store)
      const liveOwnerStatus = getOwnerStatus(DEMO_DELEGATE.owner.email)
      const isOwnerSuspended = liveOwnerStatus === 'deceased' || liveOwnerStatus === 'incapacitated'
      if (isOwnerSuspended) {
        setMyMessages(DEMO_MESSAGES.filter(m => m.recipient_name === DEMO_DELEGATE.invite.name))
      } else {
        setMyMessages(DEMO_DELEGATE_MESSAGES)
      }
      setLoading(false)
      return
    }

    if (!token) {
      setError('This delegate dashboard needs a valid invite token.')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')

      // Use SECURITY DEFINER RPC for owner info (profiles are RLS-protected)
      const [{ data: trustedPerson, error: inviteError }, { data: inviteDetails }] = await Promise.all([
        supabase
          .from('trusted_people')
          .select('*, access_grants (*)')
          .eq('invite_token', token)
          .single(),
        supabase.rpc('get_invite_details', { p_token: token }),
      ])

      if (inviteError || !trustedPerson) {
        setError('We could not find a valid delegate invitation for this link.')
        setLoading(false)
        return
      }

      const ownerInfo = inviteDetails?.[0]
      setInvite(trustedPerson)
      setOwner({
        full_name:    ownerInfo?.owner_name  ?? null,
        email:        ownerInfo?.owner_email ?? null,
        owner_status: trustedPerson.owner_status ?? null,
        plan:         null,
      })

      // Fetch the logged-in delegate's own profile role
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single()
        setMyRole(myProfile?.role ?? null)
      }

      if (trustedPerson.invite_status !== 'accepted') {
        setLoading(false)
        return
      }

      const ownerId = trustedPerson.user_id
      const [{ data: docs }, { data: accs }, { data: steps }, { data: planAlerts }, { data: recentActivity }] = await Promise.all([
        supabase.from('documents').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }),
        supabase.from('accounts').select('*').eq('user_id', ownerId).order('sort_order', { ascending: true }),
        supabase.from('instructions').select('*, instruction_steps (*)').eq('user_id', ownerId).order('sort_order', { ascending: true }),
        supabase.from('alerts').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(12),
        supabase.from('activity_log').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(12),
      ])

      setDocuments(docs ?? [])
      setAccounts(accs ?? [])
      setInstructions(steps ?? [])
      setAlerts(planAlerts ?? [])
      setActivity(recentActivity ?? [])
      setLoading(false)
    }

    load()
  }, [token])

  const grants = invite?.access_grants ?? []
  const accessibleDocuments = useMemo(() => filterByAccess(documents, grants, 'documents', 'doc_type'), [documents, grants])
  const accessibleAccounts = useMemo(() => filterByAccess(accounts, grants, 'accounts', 'category'), [accounts, grants])
  const accessibleInstructions = useMemo(() => {
    if (hasAllAccess(grants, 'instructions')) return instructions
    const categories = getSharedCategories(grants, 'instructions')
    if (!categories.length) return []
    return instructions.filter(item => categories.includes(normalise(item.category)) || categories.includes(normalise(item.audience)))
  }, [instructions, grants])

  const accessibleCategories = useMemo(
    () => grants.map(grant => `${grant.resource_type}${grant.resource_category ? ` · ${grant.resource_category}` : ''}`),
    [grants],
  )

  const unreadAlerts = alerts.filter(item => !item.is_read)
  const criticalAlerts = unreadAlerts.filter(item => normalise(item.severity) === 'critical')
  const lastUpdated = [
    ...accessibleDocuments.map(item => item.updated_at || item.created_at),
    ...accessibleAccounts.map(item => item.updated_at || item.created_at),
    ...accessibleInstructions.map(item => item.updated_at || item.created_at),
  ]
    .filter(Boolean)
    .sort()
    .reverse()[0]

  const readinessScore = useMemo(() => {
    const components = [
      Math.min(accessibleDocuments.length / 4, 1),
      Math.min(accessibleAccounts.length / 4, 1),
      Math.min(accessibleInstructions.length / 2, 1),
    ]
    const rawScore = Math.round((components.reduce((sum, value) => sum + value, 0) / components.length) * 100)
    return Math.max(rawScore - Math.min(criticalAlerts.length * 6, 18), 0)
  }, [accessibleAccounts.length, accessibleDocuments.length, accessibleInstructions.length, criticalAlerts.length])

  // Owner status — live from store in demo, from profile field in production
  const resolvedOwnerStatus = isDemo
    ? getOwnerStatus(owner?.email ?? '')
    : (owner?.owner_status ?? 'active')
  const ownerDeceased      = resolvedOwnerStatus === 'deceased'
  const ownerIncapacitated = resolvedOwnerStatus === 'incapacitated'
  const ownerSuspended     = ownerDeceased || ownerIncapacitated

  // Persist notification tracker statuses in localStorage
  const notifyKey = `everstead-notify-${token || 'demo'}`
  useEffect(() => {
    try {
      const saved = localStorage.getItem(notifyKey)
      if (saved) setNotifyStatuses(JSON.parse(saved))
    } catch {}
  }, [notifyKey])
  const setNotifyStatus = (id, status) => {
    setNotifyStatuses(prev => {
      const next = { ...prev, [id]: status }
      try { localStorage.setItem(notifyKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Copy helper
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // Print handler
  const handlePrint = () => {
    const sections = []
    if (accessibleAccounts.length) {
      sections.push(`<h2>Accounts (${accessibleAccounts.length})</h2><ul>${
        accessibleAccounts.map(a => `<li><strong>${a.institution}</strong> — ${a.account_type}${a.account_number_hint ? ` (••••${a.account_number_hint})` : ''}${a.notes ? `<br><em>${a.notes}</em>` : ''}</li>`).join('')
      }</ul>`)
    }
    if (accessibleDocuments.length) {
      sections.push(`<h2>Documents (${accessibleDocuments.length})</h2><ul>${
        accessibleDocuments.map(d => `<li><strong>${d.name}</strong> — ${d.doc_type || 'Document'}${d.expires_at ? ` (expires ${formatDate(d.expires_at)})` : ''}${d.notes ? `<br><em>${d.notes}</em>` : ''}</li>`).join('')
      }</ul>`)
    }
    if (accessibleInstructions.length) {
      sections.push(`<h2>Instructions (${accessibleInstructions.length})</h2>${
        accessibleInstructions.map(i => `<div style="margin-bottom:1.5rem"><strong>${i.title}</strong> (${i.category} · ${i.audience})<br>${i.body || ''}<ol>${(i.instruction_steps || []).map(s => `<li>${s.body}</li>`).join('')}</ol></div>`).join('')
      }`)
    }
    const html = `<!DOCTYPE html><html><head><title>${owner?.full_name || 'Plan'} — Handoff Plan</title><style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;color:#1a1a1a;line-height:1.6}h1{font-size:1.8rem;margin-bottom:0.5rem}h2{font-size:1.1rem;text-transform:uppercase;letter-spacing:.08em;color:#666;border-bottom:1px solid #ddd;padding-bottom:.5rem;margin-top:2rem}ul{padding-left:1.2rem}li{margin-bottom:.75rem}@media print{body{margin:1rem}}</style></head><body><h1>${owner?.full_name || 'Plan owner'}'s handoff plan</h1><p style="color:#666;font-size:.9rem">Viewed by ${invite?.name || 'delegate'} (${invite?.role || 'trusted person'}) · Printed ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>${sections.join('')}<hr style="margin-top:3rem"><p style="font-size:.8rem;color:#999">Exported from Everstead — secure estate planning platform · everstead.care</p></body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  // Search filtering
  const searchLower = searchQuery.toLowerCase().trim()
  const searchResults = searchLower ? {
    documents: accessibleDocuments.filter(d =>
      [d.name, d.doc_type, d.notes].some(f => f?.toLowerCase().includes(searchLower))
    ),
    accounts: accessibleAccounts.filter(a =>
      [a.institution, a.account_type, a.category, a.notes].some(f => f?.toLowerCase().includes(searchLower))
    ),
    instructions: accessibleInstructions.filter(i =>
      [i.title, i.body, i.category].some(f => f?.toLowerCase().includes(searchLower))
    ),
  } : null

  // Expiring documents (within 90 days)
  const expiringDocs = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 90)
    return accessibleDocuments.filter(d => d.expires_at && new Date(d.expires_at) <= cutoff && new Date(d.expires_at) > new Date())
  }, [accessibleDocuments])

  const handleDownload = async (documentRecord) => {
    // Use direct file_url for demo/preview docs; fall back to signed Supabase URL for real uploads
    if (documentRecord.file_url && !documentRecord.storage_path) {
      window.open(documentRecord.file_url, '_blank', 'noopener,noreferrer')
      return
    }
    if (!documentRecord.storage_path) return
    setDownloadingId(documentRecord.id)
    try {
      const signedUrl = await getDocumentUrl(documentRecord.storage_path)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch {
      setError('We could not open that document right now.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-stone-200 border-t-navy-700 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-stone-500">Loading delegate access…</p>
        </div>
      </div>
    )
  }

  if (!isDemo && (!token || error)) {
    return <EmptyState title="Delegate access unavailable" body={error || 'This link is missing the required invite token.'} />
  }

  if (!invite) {
    return <EmptyState title="Invite not found" body="This delegate invitation could not be loaded." />
  }

  if (invite.invite_status !== 'accepted') {
    return (
      <EmptyState
        title="Accept the invitation first"
        body="This workspace becomes available after the invite is accepted. Return to the invitation link to confirm your role."
        action={<Link to={`/accept-invite?token=${token}`} className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-700 transition-colors">Review invitation <ArrowRight size={15} /></Link>}
      />
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 text-navy-950">
      {isDemo && (
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>Demo mode — showing Carol Thornton's executor view. Data is fictional.</span>
          <Link to="/get-started" className="underline hover:no-underline">Create your own plan →</Link>
        </div>
      )}
      {!isDemo && myRole === 'delegate' && (
        <div className="bg-navy-950 border-b border-navy-900 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-400">
            Want to protect your own family the same way {owner?.full_name} is protecting theirs?
          </p>
          <Link
            to="/get-started"
            className="text-xs font-semibold text-sage-400 hover:text-sage-300 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            Start a free 14-day trial <ArrowRight size={12} />
          </Link>
        </div>
      )}
      {ownerDeceased && (
        <div className="bg-stone-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HeartCrack size={18} className="text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                The passing of {owner?.full_name || 'the plan owner'} has been verified by Everstead
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                All sealed messages addressed to you and all after-death access permissions are now active. The plan owner's account has been suspended and is read-only.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('messages')}
            className="inline-flex items-center gap-2 bg-white text-navy-900 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-stone-100 transition-colors shrink-0"
          >
            <MessageSquare size={13} /> Open messages
          </button>
        </div>
      )}
      {ownerIncapacitated && (
        <div className="bg-amber-700 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-amber-200 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                An incapacity report for {owner?.full_name || 'the plan owner'} has been verified by Everstead
              </p>
              <p className="text-xs text-amber-200 mt-0.5">
                Your after-death / incapacity access permissions are now active. The plan owner's account has been suspended and is read-only pending further review.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('documents')}
            className="inline-flex items-center gap-2 bg-white text-amber-900 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors shrink-0"
          >
            <FileText size={13} /> View documents
          </button>
        </div>
      )}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileSidebarOpen(v => !v)}
                className="xl:hidden mt-1 p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600">Delegate dashboard</p>
                <h1 className="font-display text-3xl font-light text-navy-950 mt-2">
                  {(owner?.full_name || 'Plan owner') + "'s handoff workspace"}
                </h1>
                <p className="mt-2 text-sm text-stone-500">
                  You are viewing this plan as <span className="font-semibold text-navy-800">{invite.role}</span>. Access is read-only.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-stone-100 transition-colors"
                title="Export plan to PDF"
              >
                <Printer size={15} /> Export
              </button>
              <Link to="/security" className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-stone-100 transition-colors">
                Why protected
              </Link>
              <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors">
                <LogOut size={15} /> Exit
              </Link>
            </div>
          </div>
          {/* Search bar */}
          <div className="mt-4 relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents, accounts, instructions…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-200 rounded-xl bg-stone-50 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 xl:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 grid xl:grid-cols-[280px_1fr] gap-8 items-start">
        <aside
          className={`xl:sticky xl:top-24 space-y-5 xl:block fixed xl:relative inset-y-0 left-0 z-50 xl:z-auto w-72 xl:w-auto bg-stone-50 xl:bg-transparent overflow-y-auto xl:overflow-visible p-4 xl:p-0 transition-transform xl:transition-none ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}`}
          aria-label="Delegate sidebar"
        >
          {/* Close button — mobile only */}
          <div className="flex items-center justify-between xl:hidden mb-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Navigation</p>
            <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-700 flex items-center justify-center">
                <UserRound size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-950">{invite.name}</p>
                <p className="text-xs text-stone-500">{invite.role}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-stone-600">
              <Detail label="Plan owner" value={owner?.full_name || '—'} />
              <Detail label="Accepted" value={formatDate(invite.accepted_at)} />
              <Detail label="Last updated" value={formatDate(lastUpdated)} />
              <Detail label="Readiness" value={`${readinessScore}%`} />
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="mt-5 w-full flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-100 bg-navy-50 rounded-xl px-3.5 py-2.5 hover:bg-navy-100 transition-colors"
            >
              <Settings size={13} /> My settings
            </button>
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-4">
            <nav className="space-y-1" aria-label="Delegate dashboard navigation">
              {tabs.map(({ id, label, icon: Icon }) => {
                const tabCount =
                  id === 'documents'    ? accessibleDocuments.length    :
                  id === 'accounts'     ? accessibleAccounts.length      :
                  id === 'instructions' ? accessibleInstructions.length  :
                  id === 'alerts'       ? (unreadAlerts.length - readAlertIds.size) || null :
                  id === 'messages'     ? (myMessages.length || null)    :
                  id === 'notify'       ? null : null
                const alertBadge = id === 'alerts' && (unreadAlerts.length - readAlertIds.size) > 0
                const msgBadge   = id === 'messages' && myMessages.length > 0
                return (
                  <button
                    key={id}
                    onClick={() => { setActiveTab(id); setMobileSidebarOpen(false) }}
                    aria-current={activeTab === id ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${activeTab === id ? 'bg-navy-50 text-navy-900' : 'text-stone-600 hover:bg-stone-100 hover:text-navy-900'}`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    {alertBadge && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{unreadAlerts.length - readAlertIds.size}</span>}
                    {msgBadge   && <span className="rounded-full bg-navy-700 px-2 py-0.5 text-[11px] font-bold text-white">{myMessages.length}</span>}
                    {!alertBadge && !msgBadge && tabCount > 0 && (
                      <span className="text-[11px] text-stone-400 font-medium">{tabCount}</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-amber-700 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed text-amber-900">
                Everstead is an organisation platform, not a legal service. Use the information here alongside professional legal or financial advice where needed.
              </p>
            </div>
          </div>

          {/* Report a Death */}
          <button
            onClick={() => setActiveTab('report-death')}
            className={`w-full flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold transition-colors text-left border ${
              activeTab === 'report-death'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white border-red-200 text-red-700 hover:bg-red-50'
            }`}
          >
            <HeartCrack size={16} className="shrink-0" />
            <span>Report a death</span>
          </button>

          {/* Report an Incident */}
          <button
            onClick={() => setActiveTab('report-incident')}
            className={`w-full flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold transition-colors text-left border ${
              activeTab === 'report-incident'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            <ShieldAlert size={16} className="shrink-0" />
            <span>Report an incident</span>
          </button>
        </aside>

        <main className="space-y-6" aria-label="Plan content">

          {/* ── Search results ── */}
          {searchResults && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Search size={16} className="text-stone-400" />
                <p className="text-sm text-stone-600">
                  Results for <span className="font-semibold text-navy-900">"{searchQuery}"</span>
                  {' '}— {searchResults.documents.length + searchResults.accounts.length + searchResults.instructions.length} found
                </p>
              </div>
              {searchResults.documents.length > 0 && (
                <Panel title="Documents" icon={FileText} count={searchResults.documents.length}>
                  <div className="space-y-2">
                    {searchResults.documents.map(item => (
                      <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{item.name}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{item.doc_type || 'Document'}</p>
                        </div>
                        <button onClick={() => { setActiveTab('documents'); setSearchQuery('') }} className="text-xs text-navy-600 hover:text-navy-900 font-semibold whitespace-nowrap">View →</button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              {searchResults.accounts.length > 0 && (
                <Panel title="Accounts" icon={Wallet} count={searchResults.accounts.length}>
                  <div className="space-y-2">
                    {searchResults.accounts.map(item => (
                      <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{item.institution}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{item.account_type} · {item.category}</p>
                        </div>
                        <button onClick={() => { setActiveTab('accounts'); setSearchQuery('') }} className="text-xs text-navy-600 hover:text-navy-900 font-semibold whitespace-nowrap">View →</button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              {searchResults.instructions.length > 0 && (
                <Panel title="Instructions" icon={BookOpen} count={searchResults.instructions.length}>
                  <div className="space-y-2">
                    {searchResults.instructions.map(item => (
                      <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{item.title}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{item.category} · {item.audience}</p>
                        </div>
                        <button onClick={() => { setActiveTab('instructions'); setSearchQuery('') }} className="text-xs text-navy-600 hover:text-navy-900 font-semibold whitespace-nowrap">View →</button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              {(searchResults.documents.length + searchResults.accounts.length + searchResults.instructions.length) === 0 && (
                <div className="text-center py-16 text-stone-400">
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No results for "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {!searchResults && activeTab === 'overview' && (
            <>
              {/* First steps panel — shown when owner is deceased or incapacitated */}
              <FirstStepsPanel
                ownerStatus={resolvedOwnerStatus}
                ownerName={owner?.full_name}
                onNavigate={setActiveTab}
                onReportDeath={() => setActiveTab('report-death')}
              />

              {/* No-access-grants empty state */}
              {grants.length === 0 && (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900">No sections shared yet</h3>
                    <p className="text-sm text-amber-800 leading-relaxed mt-2 max-w-sm mx-auto">
                      <strong>{owner?.full_name || 'The plan owner'}</strong> has accepted your invitation but has not yet granted you access to any sections of their plan.
                      Once they update their sharing settings, the relevant accounts, documents, and instructions will appear here.
                    </p>
                  </div>
                  <p className="text-xs text-amber-700">
                    They can manage what you see from the <strong>People</strong> section of their Everstead dashboard at any time.
                  </p>
                </div>
              )}
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Shared documents', value: accessibleDocuments.length, icon: FileText, tab: 'documents' },
                  { label: 'Shared accounts', value: accessibleAccounts.length, icon: Wallet, tab: 'accounts' },
                  { label: 'Shared instructions', value: accessibleInstructions.length, icon: BookOpen, tab: 'instructions' },
                  { label: 'Unread alerts', value: unreadAlerts.length - readAlertIds.size, icon: Bell, tab: 'alerts' },
                ].map(({ label, value, icon: Icon, tab }) => (
                  <button
                    key={label}
                    onClick={() => setActiveTab(tab)}
                    className="rounded-[1.75rem] border border-stone-200 bg-white p-6 text-left hover:border-navy-300 hover:bg-navy-50/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center mb-4 group-hover:bg-navy-100 transition-colors">
                      <Icon size={18} />
                    </div>
                    <p className="text-3xl font-light font-display text-navy-950">{Math.max(0, value)}</p>
                    <p className="mt-1 text-sm text-stone-500">{label}</p>
                    <p className="mt-2 text-xs text-navy-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      View <ChevronRight size={11} />
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
                <Panel title="What you can access" icon={FolderOpen}>
                  {accessibleCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {accessibleCategories.map(category => (
                        <span key={category} className="rounded-full border border-navy-200 bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-700">
                          {category}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">No explicit access grants were found on this invite yet.</p>
                  )}
                </Panel>

                <Panel title="Critical attention items" icon={AlertCircle}>
                  {criticalAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {criticalAlerts.map(item => (
                        <div key={item.id} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                          <p className="text-sm font-semibold text-red-900">{item.title}</p>
                          {item.message && <p className="mt-1 text-sm text-red-800 leading-relaxed">{item.message}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">No unread critical alerts are currently visible in the shared plan.</p>
                  )}
                </Panel>
              </div>

              <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
                <Panel title="Recent instructions" icon={BookOpen}>
                  {accessibleInstructions.length > 0 ? (
                    <div className="space-y-3">
                      {accessibleInstructions.slice(0, 3).map(item => (
                        <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-navy-950">{item.title}</p>
                            <span className="text-xs font-medium text-stone-500">{item.category || item.audience || 'Instruction'}</span>
                          </div>
                          <p className="mt-2 text-sm text-stone-600 leading-relaxed">{item.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">No instructions are currently shared with this role.</p>
                  )}
                </Panel>

                <Panel title="Recent activity" icon={Clock3}>
                  {activity.length > 0 ? (
                    <div className="space-y-3">
                      {activity.slice(0, 4).map(item => (
                        <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                          <div className="w-9 h-9 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-navy-700">
                            <Clock3 size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-navy-950">{item.resource_name || item.action}</p>
                            <p className="mt-1 text-sm text-stone-500">{humaniseAction(item.action)} · {formatDate(item.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">No recent activity is visible yet.</p>
                  )}
                </Panel>
              </div>

              {/* Expiring documents callout */}
              {expiringDocs.length > 0 && (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <Clock3 size={16} className="text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Documents expiring soon</p>
                      <p className="text-xs text-amber-700 mt-0.5">{expiringDocs.length} document{expiringDocs.length > 1 ? 's' : ''} expire within the next 90 days</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {expiringDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-amber-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{doc.name}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{doc.doc_type}</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-700 shrink-0">Expires {formatDate(doc.expires_at)}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab('documents')} className="mt-3 text-xs font-semibold text-amber-800 hover:text-amber-900 transition-colors">
                    View all documents →
                  </button>
                </div>
              )}

              {/* Useful external links */}
              <ExternalLinksPanel />
            </>
          )}

          {!searchResults && activeTab === 'documents' && (
            <Panel title="Shared documents" icon={FileText} count={accessibleDocuments.length}>
              {accessibleDocuments.length > 0 ? (
                <div className="space-y-2">
                  {accessibleDocuments.map(item => {
                    const isOpen = expandedDoc === item.id
                    return (
                      <div key={item.id} className={`rounded-2xl border transition-all overflow-hidden ${isOpen ? 'border-navy-200 bg-navy-50' : 'border-stone-200 bg-stone-50 hover:border-stone-300'}`}>
                        <button
                          className="w-full flex items-center gap-4 p-5 text-left"
                          onClick={() => setExpandedDoc(isOpen ? null : item.id)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-navy-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-navy-950 text-sm">{item.name}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{item.doc_type || 'Document'} · Updated {formatDate(item.updated_at || item.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.expires_at && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                Expires {formatDate(item.expires_at)}
                              </span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              item.status === 'expiring' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              item.status === 'missing'  ? 'bg-red-50 border-red-200 text-red-700' :
                              'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}>{item.status || 'current'}</span>
                            <ChevronDown size={15} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-5 pb-5 border-t border-navy-100 pt-4 space-y-4">
                            {item.notes && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Notes</p>
                                <p className="text-sm text-stone-700 leading-relaxed">{item.notes}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Type</p>
                                <p className="text-sm text-navy-900">{item.doc_type || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Last updated</p>
                                <p className="text-sm text-navy-900">{formatDate(item.updated_at || item.created_at)}</p>
                              </div>
                              {item.expires_at && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Expiry date</p>
                                  <p className="text-sm text-amber-700 font-medium">{formatDate(item.expires_at)}</p>
                                </div>
                              )}
                            </div>
                            {(item.storage_path || item.file_url) ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDownload(item)}
                                  disabled={downloadingId === item.id}
                                  className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors disabled:opacity-50"
                                >
                                  <ExternalLink size={15} /> {downloadingId === item.id ? 'Opening…' : 'Open / preview'}
                                </button>
                                {item.file_url && (
                                  <a
                                    href={item.file_url}
                                    download={item.name}
                                    className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                                  >
                                    <Download size={15} /> Download
                                  </a>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-stone-400 italic">No file attached — this is a reference record only.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No documents are currently shared with this role.</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'accounts' && (
            <Panel title="Shared accounts" icon={Wallet} count={accessibleAccounts.length}>
              {accessibleAccounts.length > 0 ? (
                <div className="space-y-2">
                  {accessibleAccounts.map(item => {
                    const isOpen = expandedAccount === item.id
                    return (
                      <div key={item.id} className={`rounded-2xl border transition-all overflow-hidden ${isOpen ? 'border-navy-200 bg-navy-50' : 'border-stone-200 bg-stone-50 hover:border-stone-300'}`}>
                        <button
                          className="w-full flex items-center gap-4 p-5 text-left"
                          onClick={() => setExpandedAccount(isOpen ? null : item.id)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0">
                            <Wallet size={16} className="text-navy-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-navy-950 text-sm">{item.institution}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{item.account_type} · {item.category || 'Account'}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.balance_display && (
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                                {item.balance_display}
                              </span>
                            )}
                            <ChevronDown size={15} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-5 pb-5 border-t border-navy-100 pt-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Category</p>
                                <p className="text-sm text-navy-900">{item.category || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Reference</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-navy-900 font-mono">{item.account_number_hint ? `•••• ${item.account_number_hint}` : 'Not provided'}</p>
                                  {item.account_number_hint && (
                                    <button
                                      onClick={() => copyToClipboard(item.account_number_hint, `ref-${item.id}`)}
                                      className="p-1 rounded-md text-stone-400 hover:text-navy-700 hover:bg-navy-50 transition-colors"
                                      title="Copy reference"
                                    >
                                      {copiedId === `ref-${item.id}` ? <Check size={12} className="text-sage-600" /> : <Copy size={12} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Last updated</p>
                                <p className="text-sm text-navy-900">{formatDate(item.updated_at || item.created_at)}</p>
                              </div>
                              {item.balance_display && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Balance / status</p>
                                  <p className="text-sm font-semibold text-emerald-700">{item.balance_display}</p>
                                </div>
                              )}
                            </div>
                            {item.notes && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Notes & instructions</p>
                                <p className="text-sm text-stone-700 leading-relaxed">{item.notes}</p>
                              </div>
                            )}
                            <div className="pt-1 flex flex-wrap gap-2">
                              <button
                                onClick={() => copyToClipboard(item.institution, `inst-${item.id}`)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {copiedId === `inst-${item.id}` ? <><Check size={11} className="text-sage-600" /> Copied!</> : <><Copy size={11} /> Copy institution name</>}
                              </button>
                              <button
                                onClick={() => setActiveTab('notify')}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <ClipboardCheck size={11} /> Track notification
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No accounts are currently shared with this role.</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'instructions' && (
            <Panel title="Shared instructions" icon={BookOpen} count={accessibleInstructions.length}>
              {accessibleInstructions.length > 0 ? (
                <div className="space-y-4">
                  {accessibleInstructions.map(item => (
                    <div key={item.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-navy-950">{item.title}</p>
                          <p className="mt-1 text-sm text-stone-500">{item.category || 'Instruction'} · {item.audience || 'Shared guidance'}</p>
                        </div>
                        <span className="rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
                          {item.instruction_steps?.length || 0} steps
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-stone-600">{item.body}</p>
                      {item.instruction_steps?.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {item.instruction_steps.map((step, index) => (
                            <div key={step.id || `${item.id}-${index}`} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-4">
                              <div className="w-7 h-7 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-semibold shrink-0">{index + 1}</div>
                              <p className="text-sm text-stone-600 leading-relaxed">{step.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No instructions are currently shared with this role.</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'alerts' && (
            <Panel
              title="Plan alerts"
              icon={Bell}
              count={alerts.filter(a => !a.is_read && !readAlertIds.has(a.id)).length || null}
              countLabel="unread"
              action={
                alerts.some(a => !a.is_read && !readAlertIds.has(a.id)) ? (
                  <button
                    onClick={() => setReadAlertIds(new Set(alerts.map(a => a.id)))}
                    className="text-xs font-medium text-navy-600 hover:text-navy-900 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 size={13} /> Mark all read
                  </button>
                ) : null
              }
            >
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map(item => {
                    const isRead = item.is_read || readAlertIds.has(item.id)
                    const isOpen = expandedAlert === item.id
                    const sev = normalise(item.severity)
                    const severityStyle = sev === 'critical'
                      ? { border: 'border-red-200', bg: isOpen ? 'bg-red-50' : 'bg-red-50/60', text: 'text-red-900', icon: AlertCircle, iconColor: 'text-red-500', badge: 'bg-red-100 text-red-700 border-red-200' }
                      : sev === 'warning'
                      ? { border: 'border-amber-200', bg: isOpen ? 'bg-amber-50' : 'bg-amber-50/60', text: 'text-amber-900', icon: AlertTriangle, iconColor: 'text-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200' }
                      : { border: 'border-sky-200', bg: isOpen ? 'bg-sky-50' : 'bg-sky-50/60', text: 'text-navy-950', icon: Info, iconColor: 'text-sky-500', badge: 'bg-sky-100 text-sky-700 border-sky-200' }
                    const SevIcon = severityStyle.icon

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${isRead ? 'opacity-60' : ''} ${severityStyle.border} ${severityStyle.bg}`}
                      >
                        <button
                          className="w-full flex items-start gap-4 p-5 text-left"
                          onClick={() => {
                            setExpandedAlert(isOpen ? null : item.id)
                            setReadAlertIds(prev => new Set([...prev, item.id]))
                          }}
                        >
                          <div className={`w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0 mt-0.5`}>
                            <SevIcon size={16} className={severityStyle.iconColor} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${severityStyle.text}`}>{item.title}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{formatDate(item.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isRead && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityStyle.badge}`}>
                                {item.severity}
                              </span>
                            )}
                            <ChevronDown size={15} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-5 pb-5 pt-1 border-t border-white/50 space-y-3">
                            {(item.detail || item.message) && (
                              <p className="text-sm leading-relaxed text-stone-700">{item.detail || item.message}</p>
                            )}
                            <div className="flex items-center justify-between gap-3 text-xs text-stone-400 pt-1">
                              <span>Received {formatDate(item.created_at)}</span>
                              <span className={`font-semibold capitalize px-2 py-0.5 rounded-full border ${severityStyle.badge}`}>{item.severity}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No alerts are visible right now.</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'activity' && (
            <Panel title="Recent plan activity" icon={Clock3}>
              {activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map(item => (
                    <div key={item.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                      <p className="text-base font-semibold text-navy-950">{item.resource_name || item.action}</p>
                      <p className="mt-1 text-sm text-stone-500">{humaniseAction(item.action)} · {formatDate(item.created_at)}</p>
                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <div className="mt-3 space-y-1">
                          {Object.entries(item.metadata).map(([k, v]) => (
                            <p key={k} className="text-xs text-stone-500">
                              <span className="font-semibold text-stone-600 capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No recent activity is visible yet.</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'messages' && (
            <Panel
              title="Personal messages"
              icon={MessageSquare}
              count={myMessages.length}
              countLabel={ownerDeceased ? 'auto-released on death' : 'released to you'}
            >
              {ownerDeceased && (
                <div className="flex items-start gap-3 bg-stone-900 text-white rounded-xl px-4 py-3.5 mb-5">
                  <HeartCrack size={15} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Following the verified passing of <strong className="text-white">{owner?.full_name}</strong>, all personal messages addressed to you have been automatically released. These messages were written and sealed by {owner?.full_name} for you to read when the time came.
                  </p>
                </div>
              )}

              {!ownerDeceased && myMessages.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-400 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-sm font-semibold text-navy-900">No messages released yet</p>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    {owner?.full_name || 'The plan owner'} has not yet released any personal messages to you. Messages are released manually or automatically when Everstead verifies the passing.
                  </p>
                </div>
              )}

              {myMessages.length > 0 && (
                <div className="space-y-4">
                  {myMessages.map(msg => (
                    <DelegateMessageCard key={msg.id} msg={msg} ownerName={owner?.full_name} />
                  ))}
                </div>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'notify' && (
            <NotificationTracker
              accounts={accessibleAccounts}
              statuses={notifyStatuses}
              onSetStatus={setNotifyStatus}
              ownerSuspended={ownerSuspended}
            />
          )}

          {!searchResults && activeTab === 'resources' && (
            <>
              <ExternalLinksPanel />
              <DelegateResourcesPanel />
            </>
          )}

          {!searchResults && activeTab === 'settings' && (
            <DelegateSettingsPanel invite={invite} isDemo={isDemo} />
          )}

          {!searchResults && activeTab === 'report-death' && (
            <ReportDeathPanel owner={owner} invite={invite} isDemo={isDemo} onSubmit={submitReport} />
          )}

          {!searchResults && activeTab === 'report-incident' && (
            <ReportIncidentPanel owner={owner} invite={invite} isDemo={isDemo} onSubmit={submitReport} />
          )}
        </main>
      </div>

      {/* AI guide — floating chat, always accessible */}
      <DelegateAIGuide
        ownerName={owner?.full_name}
        delegateName={invite?.name}
        role={invite?.role}
        ownerStatus={resolvedOwnerStatus}
        docCount={accessibleDocuments.length}
        accountCount={accessibleAccounts.length}
        instructionCount={accessibleInstructions.length}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DELEGATE / EXECUTOR RESOURCES PANEL
// ─────────────────────────────────────────────────────────────
const DELEGATE_GUIDES = [
  {
    icon: ShieldCheck,
    title: 'Understanding your role',
    color: 'bg-navy-50 text-navy-700',
    items: [
      { label: 'What is a trusted person?', detail: 'A trusted person on Everstead is someone the plan owner has chosen to share part or all of their estate plan with. Depending on your role, you may be an executor, next of kin, financial power of attorney holder, or simply a trusted family member.' },
      { label: 'What does an executor do?', detail: 'An executor is legally responsible for administering the estate after death. This includes locating the will, applying for probate, notifying institutions, settling debts, and distributing assets. Everstead gives you the information you need to do this — it does not replace legal advice for complex estates.' },
      { label: 'What does a power of attorney holder do?', detail: 'If you hold a Lasting Power of Attorney (LPA) for property and financial affairs, you can act on behalf of the plan owner if they lose mental capacity. This is a serious legal responsibility. Only act within the scope of the LPA and keep records of all decisions.' },
      { label: 'Your access level', detail: 'You can only see what the plan owner has explicitly shared with you. Some people see the full plan; others see only specific sections. If you need access to something not shown here, contact the plan owner directly.' },
    ],
  },
  {
    icon: FileText,
    title: 'Working with documents',
    color: 'bg-emerald-50 text-emerald-700',
    items: [
      { label: 'Finding the will', detail: 'Look in the Documents section. If the original is held by a solicitor, the document record should include their contact details. You will need the original signed will — not a scan — to apply for probate in England and Wales.' },
      { label: 'Locating the LPA', detail: 'The LPA must be registered with the Office of the Public Guardian (OPG) before it can be used. The registration certificate will show the OPG reference number. Financial institutions will ask to see a certified copy.' },
      { label: 'Downloading documents', detail: 'Use the Download button next to any document to save a copy. Store these securely — you may need to send certified copies to banks, insurers, and HMRC.' },
      { label: 'What to do if documents are missing', detail: 'If you cannot find a key document here, check with the plan owner\'s solicitor, bank, or family members. For a missing will, the Certainty National Will Register can run a search. For lost LPAs, contact the OPG directly.' },
    ],
  },
  {
    icon: Wallet,
    title: 'Handling accounts and finances',
    color: 'bg-blue-50 text-blue-700',
    items: [
      { label: 'Notifying financial institutions', detail: 'Each bank, insurer, and pension provider must be notified separately. Most accept a death certificate and grant of probate. Use the Tell Us Once service (gov.uk) to notify multiple government departments in a single step.' },
      { label: 'Freezing and closing accounts', detail: 'Accounts are typically frozen on notification of death. Joint accounts may transfer automatically to the surviving holder. Sole accounts require probate before funds can be released.' },
      { label: 'Pensions and life insurance', detail: 'These are usually written in trust and paid outside of probate — check the nomination of beneficiary forms. Contact the provider directly with the policy number shown in the Accounts section.' },
      { label: 'Subscriptions and direct debits', detail: 'Cancel ongoing subscriptions as quickly as possible to avoid charges. Check the Subscriptions section for a list. Contact each provider with proof of death.' },
      { label: 'Tax and final returns', detail: 'A final income tax return may be required for the year of death. If the estate exceeds the inheritance tax threshold (currently £325,000 + any allowances), an IHT400 form must be filed with HMRC before probate.' },
    ],
  },
  {
    icon: Users,
    title: 'Working with other people',
    color: 'bg-violet-50 text-violet-700',
    items: [
      { label: 'Co-executors', detail: 'If there are multiple executors, all must act together unless one formally steps aside. Decisions should be agreed in writing where possible. Disagreements between executors can delay probate significantly.' },
      { label: 'Beneficiaries', detail: 'You are not obliged to share the details of the estate with beneficiaries during administration — only the final distribution. However, keeping them reasonably informed reduces disputes.' },
      { label: 'Solicitors and professionals', detail: 'For complex estates, instruct a probate solicitor early. Look in the People section for the plan owner\'s nominated solicitor. Most estate solicitors charge a percentage of the estate value or an hourly rate.' },
      { label: 'When to seek legal advice', detail: 'Always seek legal advice if: the estate includes a business, overseas assets, disputed property, estranged family members, or debts that exceed the estate\'s value.' },
    ],
  },
  {
    icon: AlertTriangle,
    title: 'Practical steps when the time comes',
    color: 'bg-amber-50 text-amber-700',
    items: [
      { label: 'Register the death', detail: 'In England and Wales, a death must be registered within 5 days at a local register office. You will receive a death certificate — request at least 10 certified copies, as institutions will ask for originals.' },
      { label: 'Locate the will and contact solicitors', detail: 'Do this before making any major financial decisions. The will may name specific funeral wishes, executors, and bequests that affect immediate next steps.' },
      { label: 'Apply for probate', detail: 'If the estate requires it, apply to the Probate Registry for a Grant of Probate (or Letters of Administration if there is no will). This typically takes 4–8 weeks. Estates under £10,000 may not require probate.' },
      { label: 'Notify Everstead via this dashboard', detail: 'Use the Report a Death button in the left panel to formally notify Everstead. This will trigger a verification process and, once confirmed, release any personal messages addressed to you.' },
    ],
  },
]

function DelegateResourcesPanel() {
  const [expanded, setExpanded] = useState(null)
  const toggle = i => setExpanded(v => v === i ? null : i)

  return (
    <Panel title="Help & Guides" icon={HelpCircle}>
      <div className="space-y-3">
        {DELEGATE_GUIDES.map((guide, i) => {
          const Icon = guide.icon
          return (
            <div key={i} className="rounded-2xl border border-stone-200 overflow-hidden bg-white">
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

      <div className="mt-5 bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-navy-900 text-sm">Need further help?</p>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">Our support team can assist with questions about accessing this plan. For legal and probate matters, we always recommend consulting a qualified solicitor.</p>
        </div>
        <a
          href="mailto:support@everstead.care"
          className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-100 transition-colors shrink-0"
        >
          <Mail size={13} /> Contact support
        </a>
      </div>
    </Panel>
  )
}

// ─────────────────────────────────────────────────────────────
// DELEGATE SETTINGS PANEL
// ─────────────────────────────────────────────────────────────
function DelegateSettingsPanel({ invite, isDemo }) {
  const inputCls = 'w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white'

  // Profile state — pre-filled from invite
  const [profile, setProfile] = useState({
    full_name:     invite?.name  || '',
    email:         invite?.email || '',
    phone:         invite?.phone || '',
    address_line1: invite?.address_line1 || '',
    address_line2: invite?.address_line2 || '',
    city:          invite?.city  || '',
    postcode:      invite?.postcode || '',
    country:       invite?.country  || 'United Kingdom',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)

  // Password state
  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw]       = useState({ current: false, next: false, confirm: false })
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwSaved, setPwSaved]     = useState(false)
  const [pwError, setPwError]     = useState('')

  // Notification prefs
  const [notifs, setNotifs] = useState({
    plan_updates:    true,
    new_messages:    true,
    alerts_critical: true,
    alerts_info:     false,
    digest_weekly:   false,
  })
  const [notifSaved, setNotifSaved] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      if (!isDemo) {
        await supabase
          .from('trusted_people')
          .update({
            name:         profile.full_name,
            phone:        profile.phone,
            address_line1: profile.address_line1,
            address_line2: profile.address_line2,
            city:         profile.city,
            postcode:     profile.postcode,
            country:      profile.country,
          })
          .eq('id', invite.id)
      } else {
        await new Promise(r => setTimeout(r, 700))
      }
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return }
    if (pwForm.next.length < 8) { setPwError('Password must be at least 8 characters.'); return }
    setPwSaving(true)
    try {
      if (!isDemo) {
        const { error } = await supabase.auth.updateUser({ password: pwForm.next })
        if (error) throw error
      } else {
        await new Promise(r => setTimeout(r, 700))
      }
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err) {
      setPwError(err.message || 'Could not update password.')
    } finally {
      setPwSaving(false)
    }
  }

  const handleNotifSave = async () => {
    try {
      if (!isDemo && invite?.id) {
        const { error } = await supabase
          .from('trusted_people')
          .update({ notification_prefs: notifs })
          .eq('id', invite.id)
        if (error) throw error
      }
    } catch (err) {
      console.error('Notification prefs save error:', err)
    }
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  const PwInput = ({ id, label, field }) => (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-stone-600">{label}</label>
      <div className="relative">
        <input
          type={showPw[field] ? 'text' : 'password'}
          className={`${inputCls} pr-10`}
          value={pwForm[field]}
          onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
          autoComplete={field === 'current' ? 'current-password' : 'new-password'}
          required
        />
        <button
          type="button"
          onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
          aria-label={showPw[field] ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
        >
          {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )

  const SavedBadge = () => (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
      <CheckCircle2 size={12} /> Saved
    </span>
  )

  return (
    <div className="space-y-6">

      {/* ── Personal details ─────────────────────────── */}
      <section className="rounded-[2rem] border border-stone-200 bg-white p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center">
              <UserRound size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-navy-950 leading-none">Personal details</h2>
              <p className="text-xs text-stone-400 mt-0.5">How Everstead contacts you</p>
            </div>
          </div>
          {profileSaved && <SavedBadge />}
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
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
              <label className="block text-xs font-semibold text-stone-600">Phone number</label>
              <input type="tel" className={inputCls} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+44 7700 000000" />
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs font-semibold text-stone-500 mb-3 uppercase tracking-wide">Address</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-600">Address line 1</label>
                <input className={inputCls} value={profile.address_line1} onChange={e => setProfile(p => ({ ...p, address_line1: e.target.value }))} placeholder="House name or number, street" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-600">Address line 2</label>
                <input className={inputCls} value={profile.address_line2} onChange={e => setProfile(p => ({ ...p, address_line2: e.target.value }))} placeholder="Apartment, suite, etc. (optional)" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-600">City</label>
                <input className={inputCls} value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="London" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-600">Postcode</label>
                <input className={inputCls} value={profile.postcode} onChange={e => setProfile(p => ({ ...p, postcode: e.target.value }))} placeholder="SW1A 1AA" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-600">Country</label>
                <select className={inputCls} value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}>
                  <option>United Kingdom</option>
                  <option>Ireland</option>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>New Zealand</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {profileSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Change password ───────────────────────────── */}
      <section className="rounded-[2rem] border border-stone-200 bg-white p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-navy-950 leading-none">Change password</h2>
              <p className="text-xs text-stone-400 mt-0.5">Minimum 8 characters</p>
            </div>
          </div>
          {pwSaved && <SavedBadge />}
        </div>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <PwInput id="current" label="Current password" field="current" />
            <div /> {/* spacer */}
            <PwInput id="next" label="New password" field="next" />
            <PwInput id="confirm" label="Confirm new password" field="confirm" />
          </div>

          {pwError && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <AlertCircle size={13} /> {pwError}
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving}
            className="inline-flex items-center gap-2 bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      {/* ── Notification preferences ──────────────────── */}
      <section className="rounded-[2rem] border border-stone-200 bg-white p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-navy-950 leading-none">Notification preferences</h2>
              <p className="text-xs text-stone-400 mt-0.5">Choose what Everstead sends you</p>
            </div>
          </div>
          {notifSaved && <SavedBadge />}
        </div>

        <div className="space-y-3">
          {[
            { key: 'plan_updates',    label: 'Plan updates',          desc: 'When the plan owner adds or changes something' },
            { key: 'new_messages',    label: 'New personal messages', desc: 'When a message is released to you' },
            { key: 'alerts_critical', label: 'Critical alerts',       desc: 'Urgent items that need your attention' },
            { key: 'alerts_info',     label: 'Informational alerts',  desc: 'Non-urgent updates and reminders' },
            { key: 'digest_weekly',   label: 'Weekly digest',         desc: 'A summary of plan activity every Monday' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between gap-4 py-3 border-b border-stone-100 last:border-0 cursor-pointer group">
              <div>
                <p className="text-sm font-medium text-navy-900">{label}</p>
                <p className="text-xs text-stone-400">{desc}</p>
              </div>
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={notifs[key]}
                onClick={() => setNotifs(p => ({ ...p, [key]: !p[key] }))}
                className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${notifs[key] ? 'bg-navy-700' : 'bg-stone-200'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifs[key] ? 'translate-x-4' : ''}`} />
              </button>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleNotifSave}
          className="mt-5 inline-flex items-center gap-2 bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy-700 transition-colors"
        >
          Save preferences
        </button>
      </section>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DELEGATE MESSAGE CARD
// ─────────────────────────────────────────────────────────────
function DelegateMessageCard({ msg, ownerName }) {
  const [open, setOpen] = useState(false)

  const fmtDate = (iso) => {
    try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(iso)) } catch { return '—' }
  }

  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.type === 'video' ? 'bg-purple-50 text-purple-600' : 'bg-navy-50 text-navy-700'}`}>
          {msg.type === 'video' ? <Video size={17} /> : <FileEdit size={17} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-900 text-sm truncate">{msg.title}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            From <span className="font-medium text-navy-700">{ownerName || 'plan owner'}</span>
            {msg.released_at ? ` · Released ${fmtDate(msg.released_at)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${msg.type === 'video' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-navy-50 text-navy-700 border-navy-200'}`}>
            {msg.type === 'video' ? 'Video' : 'Note'}
          </span>
          <ChevronDown size={15} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-5 py-5 bg-stone-50 space-y-4">
          {msg.type === 'video' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 bg-navy-950 rounded-xl text-white">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                <Play size={26} className="text-white ml-1" />
              </div>
              <p className="text-sm text-stone-300 font-medium">{msg.title}</p>
              <p className="text-xs text-stone-500">Tap to play — video playback available in your live plan</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-3 uppercase tracking-wide">
                A personal message from {ownerName || 'the plan owner'}
              </p>
              <blockquote className="border-l-4 border-navy-300 pl-4 text-sm text-navy-900 leading-relaxed italic whitespace-pre-wrap">
                {msg.content}
              </blockquote>
            </div>
          )}
          <p className="text-xs text-stone-400 pt-1">
            This message was written by {ownerName || 'the plan owner'} and addressed specifically to you.
            {msg.released_at ? ` It was released on ${fmtDate(msg.released_at)}.` : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// REPORT A DEATH PANEL
// ─────────────────────────────────────────────────────────────
function ReportDeathPanel({ owner, invite, isDemo, onSubmit }) {
  const [step, setStep] = useState('intro') // intro | form | submitted
  const emptyForm = {
    reporter_name: invite?.name || '',
    reporter_email: invite?.email || '',
    reporter_phone: invite?.phone || '',
    reporter_role: invite?.role || '',
    date_of_death: '',
    place_of_death: '',
    death_cert_number: '',
    relationship: '',
    additional_notes: '',
    consent: false,
  }
  const [form, setForm]   = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.consent) { setError('Please confirm the declaration before submitting.'); return }
    setError('')
    setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 900))
      onSubmit?.({
        type: 'death',
        owner_name: owner?.full_name || 'Unknown',
        owner_email: owner?.email || '',
        owner_plan: owner?.plan || 'unknown',
        ...form,
      })
      setStep('submitted')
    } catch (err) {
      setError('Something went wrong. Please try again or contact support@everstead.care.')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'submitted') {
    return (
      <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="text-xl font-semibold text-emerald-900">Report received</h2>
        <p className="text-sm text-emerald-800 leading-relaxed max-w-lg mx-auto">
          We have received your notification. The Everstead team will review and verify the information within <strong>2 business days</strong>. The plan owner's subscription will be placed in a 30-day wind-down period, after which the account will be closed and data securely handled in accordance with our retention policy.
        </p>
        <p className="text-xs text-emerald-700">
          A confirmation has been sent to <strong>{form.reporter_email}</strong>. If you have any questions, contact{' '}
          <a href="mailto:support@everstead.care" className="underline">support@everstead.care</a>.
        </p>
      </section>
    )
  }

  if (step === 'intro') {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-white overflow-hidden">
        <div className="bg-red-600 px-8 py-6 flex items-center gap-4">
          <HeartCrack size={26} className="text-white shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-white">Report a death</h2>
            <p className="text-sm text-red-100 mt-0.5">Notify Everstead that {owner?.full_name || 'the plan owner'} has passed away</p>
          </div>
        </div>
        <div className="px-8 py-7 space-y-5">
          <p className="text-sm text-stone-700 leading-relaxed">
            We are deeply sorry for your loss. This process allows you to formally notify Everstead of the passing of <strong>{owner?.full_name || 'the plan owner'}</strong>. Once verified by our team:
          </p>
          <ul className="space-y-2 text-sm text-stone-700">
            {[
              'The subscription will enter a 30-day wind-down period — no further charges will be taken.',
              'Delegate access to this plan will remain active for 90 days to allow proper handoff.',
              'Data will be securely archived and then deleted in accordance with our retention policy.',
              'You will receive a confirmation email and reference number within 2 business days.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
            <AlertCircle size={15} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              This form is for notifications only. Everstead is not a legal service. Please also contact relevant authorities, financial institutions, and legal professionals as required.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-red-700 transition-colors"
            >
              Continue to form <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
    )
  }

  // step === 'form'
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white overflow-hidden">
      <div className="bg-red-600 px-8 py-6 flex items-center gap-4">
        <HeartCrack size={26} className="text-white shrink-0" />
        <div>
          <h2 className="text-xl font-semibold text-white">Report a death — notification form</h2>
          <p className="text-sm text-red-100 mt-0.5">All fields marked * are required</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">
        {/* Reporter details */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">Your details (reporter)</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Full name *</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.reporter_name}
                onChange={e => setForm(p => ({ ...p, reporter_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Email address *</label>
              <input
                type="email"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.reporter_email}
                onChange={e => setForm(p => ({ ...p, reporter_email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Phone number *</label>
              <input
                type="tel"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.reporter_phone}
                onChange={e => setForm(p => ({ ...p, reporter_phone: e.target.value }))}
                placeholder="+44 7700 000000"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Your role in this plan *</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.reporter_role}
                onChange={e => setForm(p => ({ ...p, reporter_role: e.target.value }))}
                placeholder="e.g. Primary Executor"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Relationship to the deceased *</label>
              <select
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.relationship}
                onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}
                required
              >
                <option value="" disabled>Select…</option>
                <option>Spouse / Partner</option>
                <option>Child</option>
                <option>Sibling</option>
                <option>Parent</option>
                <option>Named Executor</option>
                <option>Solicitor / Attorney</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Death details */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">Details of passing</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Date of death *</label>
              <input
                type="date"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.date_of_death}
                onChange={e => setForm(p => ({ ...p, date_of_death: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Place of death</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.place_of_death}
                onChange={e => setForm(p => ({ ...p, place_of_death: e.target.value }))}
                placeholder="e.g. London, United Kingdom"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-600">Death certificate number (if available)</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.death_cert_number}
                onChange={e => setForm(p => ({ ...p, death_cert_number: e.target.value }))}
                placeholder="Leave blank if not yet obtained"
              />
            </div>
          </div>
        </div>

        {/* Supporting document upload */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">Supporting document (optional)</h3>
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-5 text-center">
            <Upload size={22} className="mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">Upload a copy of the death certificate or coroner's letter</p>
            <p className="text-xs text-stone-400 mt-1">PDF, JPG, PNG — max 10 MB. Document will be securely stored.</p>
            <label className="cursor-pointer mt-3 inline-flex items-center gap-2 border border-stone-300 text-stone-600 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">
              <Upload size={13} /> Choose file
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
            </label>
          </div>
        </div>

        {/* Additional notes */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">Additional notes</label>
          <textarea
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 min-h-[90px] resize-y"
            value={form.additional_notes}
            onChange={e => setForm(p => ({ ...p, additional_notes: e.target.value }))}
            placeholder="Any additional context for the Everstead team…"
          />
        </div>

        {/* Consent declaration */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-5 py-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded border-stone-300 text-navy-700 focus:ring-navy-400"
              checked={form.consent}
              onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))}
            />
            <p className="text-xs text-stone-600 leading-relaxed">
              I confirm that I am an authorised delegate on this Everstead plan, that the information provided is accurate to the best of my knowledge, and that I have the right to notify Everstead of the death of the plan owner. I understand that Everstead will verify this report before taking any action on the account.
            </p>
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Submitting…' : <><Send size={15} /> Submit report</>}
          </button>
          <button
            type="button"
            onClick={() => setStep('intro')}
            className="inline-flex items-center gap-2 border border-stone-300 text-stone-600 text-sm font-semibold px-5 py-3 rounded-xl hover:bg-stone-100 transition-colors"
          >
            Back
          </button>
        </div>
      </form>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// REPORT AN INCIDENT PANEL
// ─────────────────────────────────────────────────────────────
function ReportIncidentPanel({ owner, invite, isDemo, onSubmit }) {
  const [step, setStep] = useState('intro') // intro | form | submitted
  const emptyForm = {
    reporter_name: invite?.name || '',
    reporter_email: invite?.email || '',
    reporter_phone: invite?.phone || '',
    reporter_role: invite?.role || '',
    relationship: '',
    incident_type: '',
    incident_date: '',
    location: '',
    description: '',
    access_reason: '',
    consent: false,
  }
  const [form, setForm]     = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.consent) { setError('Please confirm the declaration before submitting.'); return }
    setError('')
    setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 900))
      onSubmit?.({
        type: 'incident',
        owner_name: owner?.full_name || 'Unknown',
        owner_email: owner?.email || '',
        owner_plan: owner?.plan || 'unknown',
        ...form,
      })
      setStep('submitted')
    } catch (err) {
      setError('Something went wrong. Please try again or contact support@everstead.care.')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'submitted') {
    return (
      <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="text-xl font-semibold text-emerald-900">Incident report received</h2>
        <p className="text-sm text-emerald-800 leading-relaxed max-w-lg mx-auto">
          We have received your notification. The Everstead team will review the report within <strong>2 business days</strong> and may contact you for further verification. Relevant access permissions will be unlocked once the report is confirmed.
        </p>
        <p className="text-xs text-emerald-700">
          A confirmation has been sent to <strong>{form.reporter_email}</strong>. If you have any questions, contact{' '}
          <a href="mailto:support@everstead.care" className="underline">support@everstead.care</a>.
        </p>
      </section>
    )
  }

  if (step === 'intro') {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-white overflow-hidden">
        <div className="bg-amber-600 px-8 py-6 flex items-center gap-4">
          <ShieldAlert size={26} className="text-white shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-white">Report an incident</h2>
            <p className="text-sm text-amber-100 mt-0.5">Notify Everstead that {owner?.full_name || 'the plan owner'} is incapacitated or unable to act</p>
          </div>
        </div>
        <div className="px-8 py-7 space-y-5">
          <p className="text-sm text-stone-700 leading-relaxed">
            This form is for situations where <strong>{owner?.full_name || 'the plan owner'}</strong> is alive but temporarily or permanently incapacitated — such as a serious accident, medical emergency, or a loss of mental capacity — and direct family or trusted contacts need access to act on their behalf.
          </p>
          <ul className="space-y-2 text-sm text-stone-700">
            {[
              'Your report will be reviewed by the Everstead team within 2 business days.',
              'Access permissions configured for incapacity will be unlocked once verified.',
              'The plan owner\'s account will not be closed — this is a temporary or situational access release.',
              'You will receive a confirmation email and reference number after submission.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
            <AlertCircle size={15} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              This form is for notifications only. Everstead is not a legal or medical service. Please also consult relevant authorities, medical professionals, and legal advisers as appropriate.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-amber-700 transition-colors"
            >
              Continue to form <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
    )
  }

  // step === 'form'
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white overflow-hidden">
      <div className="bg-amber-600 px-8 py-6 flex items-center gap-4">
        <ShieldAlert size={26} className="text-white shrink-0" />
        <div>
          <h2 className="text-xl font-semibold text-white">Report an incident — notification form</h2>
          <p className="text-sm text-amber-100 mt-0.5">All fields marked * are required</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">

        {/* Reporter details */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">Your details (reporter)</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Full name *</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.reporter_name}
                onChange={e => setForm(p => ({ ...p, reporter_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Email address *</label>
              <input
                type="email"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.reporter_email}
                onChange={e => setForm(p => ({ ...p, reporter_email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Phone number *</label>
              <input
                type="tel"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.reporter_phone}
                onChange={e => setForm(p => ({ ...p, reporter_phone: e.target.value }))}
                placeholder="+44 7700 000000"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Your role in this plan *</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.reporter_role}
                onChange={e => setForm(p => ({ ...p, reporter_role: e.target.value }))}
                placeholder="e.g. Primary Executor, Family Member"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Relationship to the plan owner *</label>
              <select
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.relationship}
                onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}
                required
              >
                <option value="" disabled>Select…</option>
                <option>Spouse / Partner</option>
                <option>Child</option>
                <option>Sibling</option>
                <option>Parent</option>
                <option>Named Executor</option>
                <option>Healthcare Proxy</option>
                <option>Solicitor / Attorney</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incident details */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">Details of the incident</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Type of incident *</label>
              <select
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.incident_type}
                onChange={e => setForm(p => ({ ...p, incident_type: e.target.value }))}
                required
              >
                <option value="" disabled>Select…</option>
                <option>Medical emergency (hospitalisation)</option>
                <option>Serious accident or injury</option>
                <option>Diagnosed loss of mental capacity</option>
                <option>Degenerative condition (e.g. dementia)</option>
                <option>Prolonged unresponsiveness / coma</option>
                <option>Other incapacity</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Date of incident *</label>
              <input
                type="date"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.incident_date}
                onChange={e => setForm(p => ({ ...p, incident_date: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-600">Location / hospital (if applicable)</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="e.g. St Thomas' Hospital, London"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-600">Brief description of the situation *</label>
              <textarea
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 min-h-[90px] resize-y"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe what happened and the current condition of the plan owner…"
                required
              />
            </div>
          </div>
        </div>

        {/* Access reason */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">Why is access needed now? *</label>
          <textarea
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 min-h-[80px] resize-y"
            value={form.access_reason}
            onChange={e => setForm(p => ({ ...p, access_reason: e.target.value }))}
            placeholder="Explain which information needs to be accessed and why it is needed urgently…"
            required
          />
        </div>

        {/* Supporting document upload */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">Supporting document (optional)</h3>
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-5 text-center">
            <Upload size={22} className="mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">Upload a medical letter, LPA document, or other supporting evidence</p>
            <p className="text-xs text-stone-400 mt-1">PDF, JPG, PNG — max 10 MB. Document will be securely stored.</p>
            <label className="cursor-pointer mt-3 inline-flex items-center gap-2 border border-stone-300 text-stone-600 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">
              <Upload size={13} /> Choose file
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
            </label>
          </div>
        </div>

        {/* Consent declaration */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-5 py-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded border-stone-300 text-amber-600 focus:ring-amber-400"
              checked={form.consent}
              onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))}
            />
            <p className="text-xs text-stone-600 leading-relaxed">
              I confirm that I am an authorised delegate on this Everstead plan, that the information provided is accurate to the best of my knowledge, and that I have reasonable grounds to believe the plan owner is incapacitated and unable to act. I understand that Everstead will verify this report before releasing any additional access.
            </p>
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Submitting…' : <><Send size={15} /> Submit report</>}
          </button>
          <button
            type="button"
            onClick={() => setStep('intro')}
            className="inline-flex items-center gap-2 border border-stone-300 text-stone-600 text-sm font-semibold px-5 py-3 rounded-xl hover:bg-stone-100 transition-colors"
          >
            Back
          </button>
        </div>
      </form>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXTERNAL LINKS PANEL
// ─────────────────────────────────────────────────────────────
const EXTERNAL_LINKS = [
  { label: 'Tell Us Once', desc: 'Notify multiple UK government departments about a death in one step', url: 'https://www.gov.uk/tell-us-once', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Settld', desc: 'Free service to notify banks, utilities and companies about a bereavement', url: 'https://settld.care', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Apply for probate', desc: 'GOV.UK guide to applying for a Grant of Probate or Letters of Administration', url: 'https://www.gov.uk/wills-probate-inheritance/applying-for-probate', color: 'bg-navy-50 text-navy-700 border-navy-200' },
  { label: 'National Will Register', desc: 'Search the Certainty register to locate a missing will', url: 'https://www.nationalwillregister.co.uk', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { label: 'Office of the Public Guardian', desc: 'Check or register a Lasting Power of Attorney with the OPG', url: 'https://www.gov.uk/government/organisations/office-of-the-public-guardian', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'HMRC bereavement', desc: 'Tell HMRC about a death and deal with tax affairs and final returns', url: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/bereavement', color: 'bg-stone-50 text-stone-700 border-stone-200' },
]

function ExternalLinksPanel() {
  return (
    <Panel title="Useful services" icon={Globe}>
      <p className="text-xs text-stone-500 mb-4 -mt-1">External UK services that are commonly needed during estate administration.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {EXTERNAL_LINKS.map(link => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start gap-3 rounded-2xl border p-4 hover:shadow-sm transition-shadow ${link.color}`}
          >
            <ExternalLink size={14} className="shrink-0 mt-0.5 opacity-70" />
            <div>
              <p className="text-sm font-semibold leading-snug">{link.label}</p>
              <p className="text-xs leading-relaxed mt-0.5 opacity-80">{link.desc}</p>
            </div>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-stone-400">Everstead is not affiliated with these services. Always verify information on official websites.</p>
    </Panel>
  )
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION TRACKER
// ─────────────────────────────────────────────────────────────
const UK_INSTITUTIONS = [
  { id: 'tell-us-once',    name: 'Tell Us Once (GOV.UK)',       category: 'Government',  how: 'Online at gov.uk/tell-us-once — notifies DWP, DVLA, HMRC, and others in one step', url: 'https://www.gov.uk/tell-us-once' },
  { id: 'hmrc',            name: 'HMRC',                        category: 'Government',  how: 'Call 0300 200 3300 or write. Final tax return may be needed for year of death.' },
  { id: 'dwp',             name: 'DWP / State pension',         category: 'Government',  how: 'Call 0800 731 0469. Stop pension payments and claim any arrears.' },
  { id: 'probate',         name: 'Probate Registry',            category: 'Legal',       how: 'Apply online at gov.uk for Grant of Probate. Allow 4–8 weeks.', url: 'https://www.gov.uk/wills-probate-inheritance/applying-for-probate' },
  { id: 'nhs-gp',          name: 'NHS / GP surgery',            category: 'Healthcare',  how: 'Contact the GP surgery directly to cancel NHS records and return unused medications.' },
  { id: 'council-tax',     name: 'Council tax',                 category: 'Local',       how: 'Contact the local council to update or cancel the council tax account.' },
  { id: 'electoral',       name: 'Electoral register',          category: 'Government',  how: 'Contact the local council to remove from the electoral register.' },
  { id: 'dvla',            name: 'DVLA',                        category: 'Government',  how: 'Return driving licence and notify about any vehicles. gov.uk/tell-dvla-about-bereavement' },
  { id: 'passport',        name: 'HM Passport Office',          category: 'Government',  how: 'Cancel and return the passport by post to HM Passport Office, Newport, NP20 9AR.' },
  { id: 'energy',          name: 'Energy supplier',             category: 'Utilities',   how: 'Contact provider to take final meter readings and close or transfer the account.' },
  { id: 'broadband',       name: 'Broadband / phone',           category: 'Utilities',   how: 'Contact provider to cancel or transfer contract. Early exit fees may be waived on death.' },
  { id: 'water',           name: 'Water company',               category: 'Utilities',   how: 'Contact local water company to update account name or close if property is empty.' },
  { id: 'royal-mail',      name: 'Royal Mail redirect',         category: 'Postal',      how: 'Set up mail redirection at royalmail.com to avoid missing important correspondence.', url: 'https://www.royalmail.com/track-my-mail/redirection' },
  { id: 'subscriptions',   name: 'Subscriptions & direct debits', category: 'Financial', how: 'Cancel all standing orders via the bank. Check accounts list for known subscriptions.' },
  { id: 'life-insurance',  name: 'Life insurance',              category: 'Insurance',   how: 'Contact insurer with policy number. Life policies are usually paid outside probate.' },
  { id: 'pension-private', name: 'Private pension provider',    category: 'Financial',   how: 'Contact each provider. Pensions written in trust are paid to nominated beneficiaries.' },
]

const STATUS_OPTIONS = [
  { value: 'todo',       label: 'To do',     cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  { value: 'notified',   label: 'Notified',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'done',       label: 'Done',      cls: 'bg-sage-100 text-sage-700 border-sage-200' },
]

function NotificationTracker({ accounts, statuses, onSetStatus, ownerSuspended }) {
  const categories = useMemo(() => {
    const cats = {}
    // Standard institutions
    UK_INSTITUTIONS.forEach(inst => {
      if (!cats[inst.category]) cats[inst.category] = []
      cats[inst.category].push(inst)
    })
    // Accounts from the plan as extra rows
    accounts.forEach(acc => {
      const cat = 'From this plan'
      if (!cats[cat]) cats[cat] = []
      cats[cat].push({
        id: `account-${acc.id}`,
        name: acc.institution,
        category: cat,
        how: `${acc.account_type}${acc.account_number_hint ? ` — ref: ••••${acc.account_number_hint}` : ''}${acc.notes ? ` — ${acc.notes}` : ''}`,
      })
    })
    return cats
  }, [accounts])

  const allItems = [...UK_INSTITUTIONS, ...accounts.map(a => ({ id: `account-${a.id}` }))]
  const doneCount = allItems.filter(item => statuses[item.id] === 'done').length
  const notifiedCount = allItems.filter(item => statuses[item.id] === 'notified').length
  const pct = Math.round((doneCount / allItems.length) * 100)

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center">
            <ClipboardCheck size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-950 leading-none">Institution notification tracker</h2>
            <p className="text-xs text-stone-400 mt-0.5">Track which organisations you've contacted — saved to this device</p>
          </div>
        </div>
        {!ownerSuspended && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
            <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">This tracker is designed for use after a death or incapacity event has been verified. You can prepare now by reviewing the list.</p>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-sage-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs font-semibold text-stone-600 shrink-0">{doneCount} of {allItems.length} done</p>
        </div>
        {notifiedCount > 0 && <p className="text-xs text-amber-700 mt-1.5">{notifiedCount} awaiting response</p>}
      </div>

      {/* Institution groups */}
      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} className="rounded-[2rem] border border-stone-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">{cat}</p>
          <div className="space-y-2">
            {items.map(inst => {
              const status = statuses[inst.id] || 'todo'
              const next = status === 'todo' ? 'notified' : status === 'notified' ? 'done' : 'todo'
              const statusInfo = STATUS_OPTIONS.find(s => s.value === status)
              return (
                <div key={inst.id} className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                  <button
                    onClick={() => onSetStatus(inst.id, next)}
                    className={`shrink-0 mt-0.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${statusInfo.cls}`}
                    title={`Mark as ${next}`}
                  >
                    {status === 'done' ? <Check size={11} className="inline" /> : statusInfo.label}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold leading-snug ${status === 'done' ? 'line-through text-stone-400' : 'text-navy-950'}`}>{inst.name}</p>
                      {inst.url && (
                        <a href={inst.url} target="_blank" rel="noopener noreferrer" className="text-navy-500 hover:text-navy-700">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{inst.how}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-stone-400 text-center pb-2">Progress is saved to this browser only. Screenshot or print to share with co-executors.</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DELEGATE AI GUIDE — floating chat widget
// ─────────────────────────────────────────────────────────────
function DelegateAIGuide({ ownerName, delegateName, role, ownerStatus, docCount, accountCount, instructionCount }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = React.useRef(null)

  const openingMessage = ownerStatus === 'deceased'
    ? `I'm here to help you through the next steps after ${ownerName || 'the plan owner'}'s passing. This is a difficult time — I'll keep things clear and practical.\n\nWhat would you like to start with? You might ask:\n• "What do I need to do this week?"\n• "How do I notify the bank?"\n• "What is probate and do I need it?"\n• "How do I find the will?"`
    : ownerStatus === 'incapacitated'
      ? `I'm here to help you act as ${role || 'trusted person'} for ${ownerName || 'the plan owner'}. Their account is now suspended and your access permissions are active.\n\nWhat would you like help with? You might ask:\n• "What are my responsibilities as ${role || 'a trusted person'}?"\n• "How do I use a Lasting Power of Attorney?"\n• "Which accounts should I contact first?"`
      : `I'm here to help you understand this plan and your role as ${role || 'trusted person'} for ${ownerName || 'the plan owner'}.\n\nWhat would you like to know? For example:\n• "What does an executor do?"\n• "Where should I start?"\n• "How do I prepare for when the time comes?"`

  const [messages, setMessages] = useState([
    { role: 'assistant', content: openingMessage },
  ])
  const [input, setInput] = useState('')

  const context = { ownerName, delegateName, role, ownerStatus, docCount, accountCount, instructionCount }

  React.useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMessages = messages.slice(1) // exclude opening message from history
    const conversationHistory = userMessages.map(m => ({ role: m.role, content: m.content }))
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const vaultSummary = `The delegate can see ${accountCount} account${accountCount !== 1 ? 's' : ''}, ${docCount} document${docCount !== 1 ? 's' : ''}, and ${instructionCount} instruction set${instructionCount !== 1 ? 's' : ''}.`
      const res = await fetch('/api/ai/executor-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          delegateName,
          ownerName,
          vaultSummary,
          conversationHistory,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t connect right now. Please try again in a moment.' }])
    } finally {
      setLoading(false)
    }
  }

  const urgencyColor = ownerStatus === 'deceased'
    ? 'bg-stone-900 hover:bg-stone-800'
    : ownerStatus === 'incapacitated'
      ? 'bg-amber-700 hover:bg-amber-600'
      : 'bg-navy-800 hover:bg-navy-700'

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-50 inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-lg transition-all ${urgencyColor} ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Open guide"
      >
        <Sparkles size={16} />
        {ownerStatus === 'deceased' || ownerStatus === 'incapacitated' ? 'What do I do now?' : 'Ask for guidance'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-[1.75rem] border border-stone-200 bg-white shadow-2xl flex flex-col overflow-hidden" style={{ height: '520px' }}>
          {/* Header */}
          <div className={`px-5 py-4 flex items-center justify-between gap-3 ${
            ownerStatus === 'deceased' ? 'bg-stone-900' : ownerStatus === 'incapacitated' ? 'bg-amber-700' : 'bg-navy-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">Everstead guide</p>
                <p className="text-xs text-white/60 mt-0.5">Here to help — ask anything</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close guide"
            >
              <ChevronUp size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-navy-800 text-white rounded-br-sm'
                    : 'bg-stone-100 text-navy-900 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-stone-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin text-stone-400" />
                  <span className="text-xs text-stone-400">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts — shown only when there's just the opening message */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {(ownerStatus === 'deceased'
                ? ['What do I do this week?', 'How do I notify banks?', 'Do I need probate?']
                : ownerStatus === 'incapacitated'
                  ? ['What are my responsibilities?', 'How do I use an LPA?', 'Who should I contact?']
                  : ['What does an executor do?', 'How do I prepare?', 'What is probate?']
              ).map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); }}
                  className="text-xs text-navy-700 bg-navy-50 border border-navy-200 px-2.5 py-1.5 rounded-xl hover:bg-navy-100 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-stone-100 p-3 flex gap-2">
            <input
              className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-400"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything…"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="shrink-0 bg-navy-800 text-white p-2.5 rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// FIRST STEPS PANEL — shown in Overview when owner is suspended
// ─────────────────────────────────────────────────────────────
function FirstStepsPanel({ ownerStatus, ownerName, onNavigate, onReportDeath }) {
  if (ownerStatus !== 'deceased' && ownerStatus !== 'incapacitated') return null

  const isDeceased = ownerStatus === 'deceased'
  const steps = isDeceased ? [
    { n: '1', label: 'Register the death', detail: 'Within 5 days at a local register office. Request at least 10 certified death certificates — banks and institutions each need an original.' },
    { n: '2', label: 'Locate the will', detail: 'Check the Documents tab. The original signed will (not a scan) is needed for probate. Check with their solicitor if it\'s not here.' },
    { n: '3', label: 'Notify close family', detail: 'Inform immediate family before making any formal notifications to institutions.' },
    { n: '4', label: 'Apply for probate', detail: 'A Grant of Probate from the Probate Registry is usually needed to access accounts. Takes 4–8 weeks. Estates under ~£10,000 may not require it.' },
    { n: '5', label: 'Notify financial institutions', detail: 'Check the Accounts tab for a full list. Use Tell Us Once (gov.uk) for government departments. Settld.com can notify banks and utilities in bulk.' },
    { n: '6', label: 'Cancel subscriptions', detail: 'Use the accounts list to find and cancel ongoing direct debits — they continue to charge until cancelled.' },
  ] : [
    { n: '1', label: 'Confirm your LPA is registered', detail: 'A Lasting Power of Attorney must be registered with the Office of the Public Guardian (OPG) before you can use it. Check you have the registration certificate.' },
    { n: '2', label: 'Review the documents', detail: 'Check the Documents tab for the LPA certificate, any medical directives, and care instructions.' },
    { n: '3', label: 'Contact the plan owner\'s bank', detail: 'Present your registered LPA to gain access to their accounts. Each institution has its own process — call ahead to find out what they need.' },
    { n: '4', label: 'Review the instructions', detail: 'Check the Instructions tab for any guidance the plan owner left for this situation.' },
    { n: '5', label: 'Keep a record of all decisions', detail: 'As attorney, you must act in the donor\'s best interests and keep records. Note all decisions and reasons.' },
  ]

  return (
    <div className={`rounded-[2rem] border p-6 ${isDeceased ? 'border-stone-300 bg-stone-900' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isDeceased ? 'bg-white/10' : 'bg-amber-100'}`}>
          <ListChecks size={18} className={isDeceased ? 'text-white' : 'text-amber-700'} />
        </div>
        <div>
          <h2 className={`text-base font-semibold leading-none ${isDeceased ? 'text-white' : 'text-amber-950'}`}>
            {isDeceased ? `What to do now — ${ownerName || 'next steps'}` : 'Your immediate priorities'}
          </h2>
          <p className={`text-xs mt-1 ${isDeceased ? 'text-stone-400' : 'text-amber-700'}`}>
            {isDeceased ? 'A prioritised checklist for the days ahead' : 'As attorney, here\'s where to start'}
          </p>
        </div>
      </div>
      <ol className="space-y-3">
        {steps.map(step => (
          <li key={step.n} className={`flex items-start gap-3.5 rounded-2xl px-4 py-3.5 ${isDeceased ? 'bg-white/5' : 'bg-white/60 border border-amber-100'}`}>
            <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDeceased ? 'bg-white/10 text-white' : 'bg-amber-200 text-amber-800'}`}>
              {step.n}
            </span>
            <div>
              <p className={`text-sm font-semibold leading-snug ${isDeceased ? 'text-white' : 'text-amber-950'}`}>{step.label}</p>
              <p className={`text-xs leading-relaxed mt-1 ${isDeceased ? 'text-stone-400' : 'text-amber-800'}`}>{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onNavigate('documents')}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors ${isDeceased ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-amber-200 text-amber-900 hover:bg-amber-300'}`}
        >
          <FileText size={12} /> View documents
        </button>
        <button
          onClick={() => onNavigate('accounts')}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors ${isDeceased ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-amber-200 text-amber-900 hover:bg-amber-300'}`}
        >
          <Wallet size={12} /> View accounts
        </button>
        {isDeceased && (
          <button
            onClick={onReportDeath}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-red-700 text-white hover:bg-red-600 transition-colors"
          >
            <HeartCrack size={12} /> Report the death to Everstead
          </button>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-navy-900 text-right">{value}</span>
    </div>
  )
}

function Panel({ title, icon: Icon, children, count, countLabel = 'total', action }) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center">
            <Icon size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-navy-950 leading-none">{title}</h2>
            {count != null && (
              <p className="text-xs text-stone-400 mt-0.5">{count} {countLabel}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, body, action = null }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="max-w-lg rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center mx-auto mb-5">
          <ShieldCheck size={26} />
        </div>
        <h1 className="font-display text-3xl font-light text-navy-950">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-500">{body}</p>
        <div className="mt-7 flex justify-center gap-3 flex-wrap">
          {action}
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-navy-800 hover:bg-stone-100 transition-colors">
            Back to Everstead
          </Link>
        </div>
      </div>
    </div>
  )
}

function humaniseAction(action) {
  return (action || 'updated')
    .split('.')
    .map(part => part.replace(/_/g, ' '))
    .join(' · ')
}
