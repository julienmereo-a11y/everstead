import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DEMO_DELEGATE, DEMO_DOCUMENTS, DEMO_ACCOUNTS, DEMO_INSTRUCTIONS, DEMO_ALERTS, DEMO_ACTIVITY, DEMO_MESSAGES, DEMO_DELEGATE_MESSAGES, submitReport, getOwnerStatus } from '../lib/demoData'
import { resolveDocumentAccess, accessibleDocumentsFor, accessibleAccountsFor, accessibleInstructionsFor, grantSummary } from '../lib/documentAccess'
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
  Image as ImageIcon,
  RefreshCw,
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
import { useTranslation, Trans } from 'react-i18next'
import i18n from '../i18n'
import enDelegate from '../i18n/locales/en/delegate.json'
import frDelegate from '../i18n/locales/fr/delegate.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later: re-adding the same bundle is a no-op.
if (!i18n.hasResourceBundle('en', 'delegate')) i18n.addResourceBundle('en', 'delegate', enDelegate)
if (!i18n.hasResourceBundle('fr', 'delegate')) i18n.addResourceBundle('fr', 'delegate', frDelegate)

const tabs = [
  { id: 'overview',      labelKey: 'tabs.overview',     icon: ShieldCheck },
  { id: 'documents',     labelKey: 'tabs.documents',    icon: FileText },
  { id: 'accounts',      labelKey: 'tabs.accounts',     icon: Wallet },
  { id: 'instructions',  labelKey: 'tabs.instructions', icon: BookOpen },
  { id: 'notify',        labelKey: 'tabs.notify',       icon: ClipboardCheck },
  { id: 'messages',      labelKey: 'tabs.messages',     icon: MessageSquare },
  { id: 'alerts',        labelKey: 'tabs.alerts',       icon: Bell },
  { id: 'activity',      labelKey: 'tabs.activity',     icon: Clock3 },
  { id: 'resources',     labelKey: 'tabs.resources',    icon: HelpCircle },
  { id: 'settings',      labelKey: 'tabs.settings',     icon: Settings },
]

const dateLocale = () => ((i18n.language || 'en').startsWith('fr') ? 'fr-FR' : 'en-GB')

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(dateLocale(), { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

const normalise = (value) => (value || '').toString().trim().toLowerCase()

export default function DelegateDashboard() {
  const { t } = useTranslation('delegate')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const isDemo = searchParams.get('demo') === 'true'

  // Real death/incident report submission (demo mode keeps the in-memory stub).
  const submitRealReport = async (payload) => {
    const res = await fetch('/api/reports/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ inviteToken: token, ...payload }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.error || t('errors.reportSubmit'))
    }
    return res.json()
  }

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
      setError(t('errors.needToken'))
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
          // Plain * — access_grants is the JSONB column on this row (the owner's
          // role-level grants). The old `access_grants (*)` embed read a separate,
          // always-empty table, which hid EVERYTHING from real delegates.
          .select('*')
          .eq('invite_token', token)
          .single(),
        supabase.rpc('get_invite_details', { p_token: token }),
      ])

      if (inviteError || !trustedPerson) {
        setError(t('errors.invalidInvite'))
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

      // Personal Messages addressed to this delegate. Messages RLS is
      // owner-only, so this goes through a SECURITY DEFINER RPC that
      // re-validates the caller (auth email must match the accepted invite)
      // and only returns released messages — plus after-death ones once the
      // owner's passing is verified. Before this, released messages had NO
      // surface for trusted people in production (only the demo showed them).
      const { data: delegateMsgs } = await supabase.rpc('get_delegate_messages', { p_token: token })
      setMyMessages(delegateMsgs ?? [])

      setLoading(false)

      // Audit: record that this delegate accessed the owner's vault. The RPC is
      // SECURITY DEFINER and re-checks the caller is an accepted delegate, so the
      // entry can't be forged, and the owner sees it in their activity trail.
      supabase.rpc('log_delegate_access', { p_owner: ownerId, p_action: 'delegate.viewed_vault' }).then(() => {})
    }

    load()
  }, [token])

  // Owner status — live from store in demo, from profile field in production.
  // Computed BEFORE the access memos: per-document/person release timing depends on it.
  const resolvedOwnerStatus = isDemo
    ? getOwnerStatus(owner?.email ?? '')
    : (owner?.owner_status ?? 'active')
  const ownerDeceased      = resolvedOwnerStatus === 'deceased'
  const ownerIncapacitated = resolvedOwnerStatus === 'incapacitated'
  const ownerSuspended     = ownerDeceased || ownerIncapacitated

  const grants = invite?.access_grants ?? {}
  const accessibleDocuments = useMemo(
    () => accessibleDocumentsFor(invite, documents, ownerSuspended),
    [invite, documents, ownerSuspended],
  )
  // Documents this person WILL receive but that are sealed until release — shown
  // as locked entries so they know the document exists and is taken care of.
  const sealedDocuments = useMemo(
    () => (documents || []).filter(d => {
      const r = resolveDocumentAccess(invite, d, { ownerReleased: ownerSuspended })
      return r.eventual && !r.access
    }),
    [invite, documents, ownerSuspended],
  )
  const accessibleAccounts = useMemo(
    () => accessibleAccountsFor(invite, accounts, ownerSuspended),
    [invite, accounts, ownerSuspended],
  )
  const accessibleInstructions = useMemo(
    () => accessibleInstructionsFor(invite, instructions, ownerSuspended),
    [invite, instructions, ownerSuspended],
  )

  const accessibleCategories = useMemo(() => grantSummary(grants), [grants])

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
    // Escape every owner-entered value before it's written into the print window —
    // account names, notes, instruction bodies etc. are free text and would otherwise
    // execute as HTML/JS in the delegate's browser (stored XSS across the trust boundary).
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ))
    const sections = []
    if (accessibleAccounts.length) {
      sections.push(`<h2>${esc(t('print.accountsHeading', { count: accessibleAccounts.length }))}</h2><ul>${
        accessibleAccounts.map(a => `<li><strong>${esc(a.institution)}</strong>, ${esc(a.account_type)}${a.account_number_hint ? ` (••••${esc(a.account_number_hint)})` : ''}${a.notes ? `<br><em>${esc(a.notes)}</em>` : ''}</li>`).join('')
      }</ul>`)
    }
    if (accessibleDocuments.length) {
      sections.push(`<h2>${esc(t('print.documentsHeading', { count: accessibleDocuments.length }))}</h2><ul>${
        accessibleDocuments.map(d => `<li><strong>${esc(d.name)}</strong>, ${esc(d.doc_type || t('common.document'))}${d.expires_at ? ` (${esc(t('print.expires'))} ${esc(formatDate(d.expires_at))})` : ''}${d.notes ? `<br><em>${esc(d.notes)}</em>` : ''}</li>`).join('')
      }</ul>`)
    }
    if (accessibleInstructions.length) {
      sections.push(`<h2>${esc(t('print.instructionsHeading', { count: accessibleInstructions.length }))}</h2>${
        accessibleInstructions.map(i => `<div style="margin-bottom:1.5rem"><strong>${esc(i.title)}</strong> (${esc(i.category)} · ${esc(i.audience)})<br>${esc(i.body || '')}<ol>${(i.instruction_steps || []).map(s => `<li>${esc(s.body)}</li>`).join('')}</ol></div>`).join('')
      }`)
    }
    const html = `<!DOCTYPE html><html><head><title>${t('print.docTitle', { name: esc(owner?.full_name || t('print.planFallback')) })}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;color:#1a1a1a;line-height:1.6}h1{font-size:1.8rem;margin-bottom:0.5rem}h2{font-size:1.1rem;text-transform:uppercase;letter-spacing:.08em;color:#666;border-bottom:1px solid #ddd;padding-bottom:.5rem;margin-top:2rem}ul{padding-left:1.2rem}li{margin-bottom:.75rem}@media print{body{margin:1rem}}</style></head><body><h1>${t('print.heading', { name: esc(owner?.full_name || t('common.planOwner')) })}</h1><p style="color:#666;font-size:.9rem">${t('print.viewedBy', { name: esc(invite?.name || t('print.delegateFallback')), role: esc(invite?.role || t('print.roleFallback')), date: new Date().toLocaleDateString(dateLocale(), { dateStyle: 'long' }) })}</p>${sections.join('')}<hr style="margin-top:3rem"><p style="font-size:.8rem;color:#999">${esc(t('print.footer'))}</p></body></html>`
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
      setError(t('errors.openDoc'))
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-stone-200 border-t-navy-700 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-stone-500">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!isDemo && (!token || error)) {
    return <EmptyState title={t('empty.unavailableTitle')} body={error || t('empty.missingToken')} />
  }

  if (!invite) {
    return <EmptyState title={t('empty.notFoundTitle')} body={t('empty.notFoundBody')} />
  }

  if (invite.invite_status !== 'accepted') {
    return (
      <EmptyState
        title={t('empty.acceptTitle')}
        body={t('empty.acceptBody')}
        action={<Link to={`/accept-invite?token=${token}`} className="inline-flex items-center gap-2 rounded-full btn-aurora px-5 py-3 text-sm font-semibold text-white hover:bg-navy-700 transition-colors">{t('empty.reviewInvite')} <ArrowRight size={15} /></Link>}
      />
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 text-navy-950">
      {isDemo && (
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>{t('banners.demo')}</span>
          <Link to="/get-started" className="underline hover:no-underline">{t('banners.demoCta')}</Link>
        </div>
      )}
      {!isDemo && myRole === 'delegate' && (
        <div className="border-b border-navy-900 px-6 py-3 flex flex-wrap items-center justify-between gap-3" style={{ background: 'linear-gradient(100deg, #0d1628 0%, #1d3052 38%, #2a2a55 70%, #18301f 100%)' }}>
          <p className="text-xs text-stone-400">
            {t('banners.upsell', { name: owner?.full_name })}
          </p>
          <Link
            to="/get-started"
            className="text-xs font-semibold text-sage-400 hover:text-sage-300 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            {t('banners.upsellCta')} <ArrowRight size={12} />
          </Link>
        </div>
      )}
      {ownerDeceased && (
        <div className="bg-stone-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HeartCrack size={18} className="text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {t('banners.deceasedTitle', { name: owner?.full_name || t('common.thePlanOwner') })}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {t('banners.deceasedBody')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('messages')}
            className="inline-flex items-center gap-2 bg-white text-navy-900 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-stone-100 transition-colors shrink-0"
          >
            <MessageSquare size={13} /> {t('banners.openMessages')}
          </button>
        </div>
      )}
      {ownerIncapacitated && (
        <div className="bg-amber-700 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-amber-200 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {t('banners.incapTitle', { name: owner?.full_name || t('common.thePlanOwner') })}
              </p>
              <p className="text-xs text-amber-200 mt-0.5">
                {t('banners.incapBody')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('documents')}
            className="inline-flex items-center gap-2 bg-white text-amber-900 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors shrink-0"
          >
            <FileText size={13} /> {t('banners.viewDocuments')}
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
                aria-label={t('header.toggleNav')}
              >
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600">{t('header.eyebrow')}</p>
                <h1 className="font-display text-3xl font-light text-navy-950 mt-2">
                  {t('header.workspaceTitle', { name: owner?.full_name || t('common.planOwner') })}
                </h1>
                <p className="mt-2 text-sm text-stone-500">
                  <Trans t={t} i18nKey="header.viewingAs" values={{ role: invite.role }} components={{ role: <span className="font-semibold text-navy-800" /> }} />
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-stone-100 transition-colors"
                title={t('header.exportTitle')}
              >
                <Printer size={15} /> {t('header.export')}
              </button>
              <Link to="/security" className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-stone-100 transition-colors">
                {t('header.whyProtected')}
              </Link>
              <Link to="/" className="inline-flex items-center gap-2 rounded-full btn-aurora px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors">
                <LogOut size={15} /> {t('header.exit')}
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
              placeholder={t('header.searchPlaceholder')}
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
          aria-label={t('sidebar.ariaSidebar')}
        >
          {/* Close button — mobile only */}
          <div className="flex items-center justify-between xl:hidden mb-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">{t('sidebar.navigation')}</p>
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
              <Detail label={t('sidebar.planOwner')} value={owner?.full_name || '—'} />
              <Detail label={t('sidebar.accepted')} value={formatDate(invite.accepted_at)} />
              <Detail label={t('sidebar.lastUpdated')} value={formatDate(lastUpdated)} />
              <Detail label={t('sidebar.readiness')} value={t('sidebar.readinessValue', { score: readinessScore })} />
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="mt-5 w-full flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-100 bg-navy-50 rounded-xl px-3.5 py-2.5 hover:bg-navy-100 transition-colors"
            >
              <Settings size={13} /> {t('sidebar.mySettings')}
            </button>
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-4">
            <nav className="space-y-1" aria-label={t('sidebar.ariaNav')}>
              {tabs.map(({ id, labelKey, icon: Icon }) => {
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
                    <span className="flex-1 text-left">{t(labelKey)}</span>
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
                {t('sidebar.disclaimer')}
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
            <span>{t('sidebar.reportDeath')}</span>
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
            <span>{t('sidebar.reportIncident')}</span>
          </button>
        </aside>

        <main className="space-y-6" aria-label={t('sidebar.ariaMain')}>

          {/* ── Search results ── */}
          {searchResults && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Search size={16} className="text-stone-400" />
                <p className="text-sm text-stone-600">
                  {t('search.resultsFor')} <span className="font-semibold text-navy-900">{t('search.queryQuoted', { query: searchQuery })}</span>
                  {' '}, {t('search.found', { count: searchResults.documents.length + searchResults.accounts.length + searchResults.instructions.length })}
                </p>
              </div>
              {searchResults.documents.length > 0 && (
                <Panel title={t('tabs.documents')} icon={FileText} count={searchResults.documents.length}>
                  <div className="space-y-2">
                    {searchResults.documents.map(item => (
                      <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{item.name}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{item.doc_type || t('common.document')}</p>
                        </div>
                        <button onClick={() => { setActiveTab('documents'); setSearchQuery('') }} className="text-xs text-navy-600 hover:text-navy-900 font-semibold whitespace-nowrap">{t('search.view')}</button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              {searchResults.accounts.length > 0 && (
                <Panel title={t('tabs.accounts')} icon={Wallet} count={searchResults.accounts.length}>
                  <div className="space-y-2">
                    {searchResults.accounts.map(item => (
                      <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{item.institution}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{item.account_type} · {item.category}</p>
                        </div>
                        <button onClick={() => { setActiveTab('accounts'); setSearchQuery('') }} className="text-xs text-navy-600 hover:text-navy-900 font-semibold whitespace-nowrap">{t('search.view')}</button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              {searchResults.instructions.length > 0 && (
                <Panel title={t('tabs.instructions')} icon={BookOpen} count={searchResults.instructions.length}>
                  <div className="space-y-2">
                    {searchResults.instructions.map(item => (
                      <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{item.title}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{item.category} · {item.audience}</p>
                        </div>
                        <button onClick={() => { setActiveTab('instructions'); setSearchQuery('') }} className="text-xs text-navy-600 hover:text-navy-900 font-semibold whitespace-nowrap">{t('search.view')}</button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              {(searchResults.documents.length + searchResults.accounts.length + searchResults.instructions.length) === 0 && (
                <div className="text-center py-16 text-stone-400">
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('search.noResults', { query: searchQuery })}</p>
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
              {(grants.accessAreas || []).length === 0 && (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900">{t('overview.noAccessTitle')}</h3>
                    <p className="text-sm text-amber-800 leading-relaxed mt-2 max-w-sm mx-auto">
                      <Trans t={t} i18nKey="overview.noAccessBody" values={{ name: owner?.full_name || t('common.thePlanOwnerCap') }} />
                    </p>
                  </div>
                  <p className="text-xs text-amber-700">
                    <Trans t={t} i18nKey="overview.noAccessFootnote" />
                  </p>
                </div>
              )}
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: t('overview.sharedDocuments'), value: accessibleDocuments.length, icon: FileText, tab: 'documents' },
                  { label: t('overview.sharedAccounts'), value: accessibleAccounts.length, icon: Wallet, tab: 'accounts' },
                  { label: t('overview.sharedInstructions'), value: accessibleInstructions.length, icon: BookOpen, tab: 'instructions' },
                  { label: t('overview.unreadAlerts'), value: unreadAlerts.length - readAlertIds.size, icon: Bell, tab: 'alerts' },
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
                      {t('overview.statView')} <ChevronRight size={11} />
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
                <Panel title={t('overview.accessTitle')} icon={FolderOpen}>
                  {accessibleCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {accessibleCategories.map(category => (
                        <span key={category} className="rounded-full border border-navy-200 bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-700">
                          {category}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">{t('overview.accessEmpty')}</p>
                  )}
                </Panel>

                <Panel title={t('overview.criticalTitle')} icon={AlertCircle}>
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
                    <p className="text-sm text-stone-500">{t('overview.criticalEmpty')}</p>
                  )}
                </Panel>
              </div>

              <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
                <Panel title={t('overview.recentInstructionsTitle')} icon={BookOpen}>
                  {accessibleInstructions.length > 0 ? (
                    <div className="space-y-3">
                      {accessibleInstructions.slice(0, 3).map(item => (
                        <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-navy-950">{item.title}</p>
                            <span className="text-xs font-medium text-stone-500">{item.category || item.audience || t('overview.instructionFallback')}</span>
                          </div>
                          <p className="mt-2 text-sm text-stone-600 leading-relaxed">{item.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">{t('instructions.empty')}</p>
                  )}
                </Panel>

                <Panel title={t('overview.recentActivityTitle')} icon={Clock3}>
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
                    <p className="text-sm text-stone-500">{t('activity.empty')}</p>
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
                      <p className="text-sm font-semibold text-amber-900">{t('overview.expiringTitle')}</p>
                      <p className="text-xs text-amber-700 mt-0.5">{t('overview.expiringCount', { count: expiringDocs.length })}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {expiringDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-amber-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-navy-950">{doc.name}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{doc.doc_type}</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-700 shrink-0">{t('documents.expires', { date: formatDate(doc.expires_at) })}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab('documents')} className="mt-3 text-xs font-semibold text-amber-800 hover:text-amber-900 transition-colors">
                    {t('overview.viewAllDocs')}
                  </button>
                </div>
              )}

              {/* Useful external links */}
              <ExternalLinksPanel />
            </>
          )}

          {!searchResults && activeTab === 'documents' && (
            <Panel title={t('documents.title')} icon={FileText} count={accessibleDocuments.length}>
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
                            <p className="text-xs text-stone-500 mt-0.5">{item.doc_type || t('common.document')} · {t('documents.updated', { date: formatDate(item.updated_at || item.created_at) })}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.expires_at && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                {t('documents.expires', { date: formatDate(item.expires_at) })}
                              </span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                              item.status === 'expiring' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              item.status === 'missing'  ? 'bg-red-50 border-red-200 text-red-700' :
                              'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}>{t(`documents.status.${item.status || 'current'}`, { defaultValue: item.status || 'current' })}</span>
                            <ChevronDown size={15} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="px-5 pb-5 border-t border-navy-100 pt-4 space-y-4">
                            {item.notes && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('documents.notes')}</p>
                                <p className="text-sm text-stone-700 leading-relaxed">{item.notes}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('documents.type')}</p>
                                <p className="text-sm text-navy-900">{item.doc_type || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('documents.lastUpdated')}</p>
                                <p className="text-sm text-navy-900">{formatDate(item.updated_at || item.created_at)}</p>
                              </div>
                              {item.expires_at && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('documents.expiryDate')}</p>
                                  <p className="text-sm text-amber-700 font-medium">{formatDate(item.expires_at)}</p>
                                </div>
                              )}
                            </div>
                            {(item.storage_path || item.file_url) ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDownload(item)}
                                  disabled={downloadingId === item.id}
                                  className="inline-flex items-center gap-2 rounded-full btn-aurora px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors disabled:opacity-50"
                                >
                                  <ExternalLink size={15} /> {downloadingId === item.id ? t('documents.opening') : t('documents.open')}
                                </button>
                                {item.file_url && (
                                  <a
                                    href={item.file_url}
                                    download={item.name}
                                    className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                                  >
                                    <Download size={15} /> {t('documents.download')}
                                  </a>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-stone-400 italic">{t('documents.noFile')}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500">{t('documents.empty')}</p>
              )}

              {/* Sealed documents — this person will receive these, but they only
                  unlock once the owner's passing is verified. Shown so they know
                  the document exists and is taken care of. */}
              {sealedDocuments.length > 0 && (
                <div className="mt-6 pt-5 border-t border-stone-100 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                    {t('documents.sealedHeading')}
                  </p>
                  {sealedDocuments.map(item => (
                    <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50/60 flex items-center gap-4 p-5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0">
                        <Lock size={15} className="text-stone-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-600 text-sm">{item.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{item.doc_type || t('common.document')} · {t('documents.sealedMeta')}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border border-stone-200 bg-white text-stone-500">
                        {t('documents.sealedBadge')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'accounts' && (
            <Panel title={t('accounts.title')} icon={Wallet} count={accessibleAccounts.length}>
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
                            <p className="text-xs text-stone-500 mt-0.5">{item.account_type} · {item.category || t('accounts.accountFallback')}</p>
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
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('accounts.category')}</p>
                                <p className="text-sm text-navy-900">{item.category || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('accounts.reference')}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-navy-900 font-mono">{item.account_number_hint ? `•••• ${item.account_number_hint}` : t('accounts.notProvided')}</p>
                                  {item.account_number_hint && (
                                    <button
                                      onClick={() => copyToClipboard(item.account_number_hint, `ref-${item.id}`)}
                                      className="p-1 rounded-md text-stone-400 hover:text-navy-700 hover:bg-navy-50 transition-colors"
                                      title={t('accounts.copyReference')}
                                    >
                                      {copiedId === `ref-${item.id}` ? <Check size={12} className="text-sage-600" /> : <Copy size={12} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('accounts.lastUpdated')}</p>
                                <p className="text-sm text-navy-900">{formatDate(item.updated_at || item.created_at)}</p>
                              </div>
                              {item.balance_display && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('accounts.balance')}</p>
                                  <p className="text-sm font-semibold text-emerald-700">{item.balance_display}</p>
                                </div>
                              )}
                            </div>
                            {item.notes && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">{t('accounts.notes')}</p>
                                <p className="text-sm text-stone-700 leading-relaxed">{item.notes}</p>
                              </div>
                            )}
                            <div className="pt-1 flex flex-wrap gap-2">
                              <button
                                onClick={() => copyToClipboard(item.institution, `inst-${item.id}`)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {copiedId === `inst-${item.id}` ? <><Check size={11} className="text-sage-600" /> {t('accounts.copied')}</> : <><Copy size={11} /> {t('accounts.copyInstitution')}</>}
                              </button>
                              <button
                                onClick={() => setActiveTab('notify')}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <ClipboardCheck size={11} /> {t('accounts.trackNotification')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500">{t('accounts.empty')}</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'instructions' && (
            <Panel title={t('instructions.title')} icon={BookOpen} count={accessibleInstructions.length}>
              {accessibleInstructions.length > 0 ? (
                <div className="space-y-4">
                  {accessibleInstructions.map(item => (
                    <div key={item.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-navy-950">{item.title}</p>
                          <p className="mt-1 text-sm text-stone-500">{item.category || t('instructions.categoryFallback')} · {item.audience || t('instructions.audienceFallback')}</p>
                        </div>
                        <span className="rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
                          {t('instructions.steps', { count: item.instruction_steps?.length || 0 })}
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
                <p className="text-sm text-stone-500">{t('instructions.empty')}</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'alerts' && (
            <Panel
              title={t('alerts.title')}
              icon={Bell}
              count={alerts.filter(a => !a.is_read && !readAlertIds.has(a.id)).length || null}
              countLabel={t('alerts.unreadLabel')}
              action={
                alerts.some(a => !a.is_read && !readAlertIds.has(a.id)) ? (
                  <button
                    onClick={() => setReadAlertIds(new Set(alerts.map(a => a.id)))}
                    className="text-xs font-medium text-navy-600 hover:text-navy-900 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 size={13} /> {t('alerts.markAllRead')}
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
                                {t(`alerts.severity.${sev}`, { defaultValue: item.severity })}
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
                              <span>{t('alerts.received', { date: formatDate(item.created_at) })}</span>
                              <span className={`font-semibold capitalize px-2 py-0.5 rounded-full border ${severityStyle.badge}`}>{t(`alerts.severity.${sev}`, { defaultValue: item.severity })}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-stone-500">{t('alerts.empty')}</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'activity' && (
            <Panel title={t('activity.title')} icon={Clock3}>
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
                <p className="text-sm text-stone-500">{t('activity.empty')}</p>
              )}
            </Panel>
          )}

          {!searchResults && activeTab === 'messages' && (
            <Panel
              title={t('messages.title')}
              icon={MessageSquare}
              count={myMessages.length}
              countLabel={ownerDeceased ? t('messages.autoReleased') : t('messages.releasedToYou')}
            >
              {ownerDeceased && (
                <div className="flex items-start gap-3 bg-stone-900 text-white rounded-xl px-4 py-3.5 mb-5">
                  <HeartCrack size={15} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-stone-300 leading-relaxed">
                    <Trans t={t} i18nKey="messages.deceasedNotice" values={{ name: owner?.full_name }} components={{ strong: <strong className="text-white" /> }} />
                  </p>
                </div>
              )}

              {!ownerDeceased && myMessages.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-400 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare size={20} />
                  </div>
                  <p className="text-sm font-semibold text-navy-900">{t('messages.emptyTitle')}</p>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    {t('messages.emptyBody', { name: owner?.full_name || t('common.thePlanOwnerCap') })}
                  </p>
                </div>
              )}

              {myMessages.length > 0 && (
                <div className="space-y-4">
                  {myMessages.map(msg => (
                    <DelegateMessageCard key={msg.id} msg={msg} ownerName={owner?.full_name} inviteToken={token} isDemo={isDemo} />
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
            <ReportDeathPanel owner={owner} invite={invite} isDemo={isDemo} onSubmit={isDemo ? submitReport : submitRealReport} />
          )}

          {!searchResults && activeTab === 'report-incident' && (
            <ReportIncidentPanel owner={owner} invite={invite} isDemo={isDemo} onSubmit={isDemo ? submitReport : submitRealReport} />
          )}
        </main>
      </div>

      {/* AI guide — floating chat, always accessible */}
      <DelegateAIGuide
        ownerName={owner?.full_name}
        ownerId={invite?.user_id}
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
  { icon: ShieldCheck,   key: 'role',      color: 'bg-navy-50 text-navy-700' },
  { icon: FileText,      key: 'documents', color: 'bg-emerald-50 text-emerald-700' },
  { icon: Wallet,        key: 'finances',  color: 'bg-blue-50 text-blue-700' },
  { icon: Users,         key: 'people',    color: 'bg-violet-50 text-violet-700' },
  { icon: AlertTriangle, key: 'practical', color: 'bg-amber-50 text-amber-700' },
]

function DelegateResourcesPanel() {
  const { t } = useTranslation('delegate')
  const [expanded, setExpanded] = useState(null)
  const toggle = i => setExpanded(v => v === i ? null : i)

  return (
    <Panel title={t('resources.title')} icon={HelpCircle}>
      <div className="space-y-3">
        {DELEGATE_GUIDES.map((guide, i) => {
          const Icon = guide.icon
          const items = t(`resources.guides.${guide.key}.items`, { returnObjects: true })
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
                  <p className="font-semibold text-navy-900 text-sm">{t(`resources.guides.${guide.key}.title`)}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{t('resources.topics', { count: items.length })}</p>
                </div>
                <ChevronRight size={15} className={`text-stone-400 transition-transform shrink-0 ${expanded === i ? 'rotate-90' : ''}`} />
              </button>
              {expanded === i && (
                <div className="border-t border-stone-100 divide-y divide-stone-50">
                  {items.map((item, j) => (
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
          <p className="font-semibold text-navy-900 text-sm">{t('resources.supportTitle')}</p>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{t('resources.supportBody')}</p>
        </div>
        <a
          href="mailto:support@everstead.care"
          className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-stone-300 rounded-lg px-3 py-2 hover:bg-stone-100 transition-colors shrink-0"
        >
          <Mail size={13} /> {t('resources.contactSupport')}
        </a>
      </div>
    </Panel>
  )
}

// ─────────────────────────────────────────────────────────────
// DELEGATE SETTINGS PANEL
// ─────────────────────────────────────────────────────────────
function DelegateSettingsPanel({ invite, isDemo }) {
  const { t } = useTranslation('delegate')
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
    if (pwForm.next !== pwForm.confirm) { setPwError(t('settings.pwMismatch')); return }
    if (pwForm.next.length < 8) { setPwError(t('settings.pwTooShort')); return }
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
      setPwError(err.message || t('settings.pwUpdateFailed'))
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
          aria-label={showPw[field] ? t('settings.hidePassword') : t('settings.showPassword')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
        >
          {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )

  const SavedBadge = () => (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
      <CheckCircle2 size={12} /> {t('settings.saved')}
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
              <h2 className="text-base font-semibold text-navy-950 leading-none">{t('settings.personalTitle')}</h2>
              <p className="text-xs text-stone-400 mt-0.5">{t('settings.personalSubtitle')}</p>
            </div>
          </div>
          {profileSaved && <SavedBadge />}
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('settings.fullName')}</label>
              <input className={inputCls} value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('settings.email')}</label>
              <input type="email" className={`${inputCls} bg-stone-50 text-stone-500 cursor-not-allowed`} value={profile.email} readOnly />
              <p className="text-xs text-stone-400">{t('settings.emailNote')}</p>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('settings.phone')}</label>
              <input type="tel" className={inputCls} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder={t('settings.phonePlaceholder')} />
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs font-semibold text-stone-500 mb-3 uppercase tracking-wide">{t('settings.addressHeading')}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-600">{t('settings.address1')}</label>
                <input className={inputCls} value={profile.address_line1} onChange={e => setProfile(p => ({ ...p, address_line1: e.target.value }))} placeholder={t('settings.address1Placeholder')} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-600">{t('settings.address2')}</label>
                <input className={inputCls} value={profile.address_line2} onChange={e => setProfile(p => ({ ...p, address_line2: e.target.value }))} placeholder={t('settings.address2Placeholder')} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-600">{t('settings.city')}</label>
                <input className={inputCls} value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} placeholder={t('settings.cityPlaceholder')} />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-600">{t('settings.postcode')}</label>
                <input className={inputCls} value={profile.postcode} onChange={e => setProfile(p => ({ ...p, postcode: e.target.value }))} placeholder={t('settings.postcodePlaceholder')} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-600">{t('settings.country')}</label>
                {/* Stored values stay in English in every locale — only the visible labels are translated. */}
                <select className={inputCls} value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}>
                  <option value="United Kingdom">{t('settings.countries.uk')}</option>
                  <option value="Ireland">{t('settings.countries.ireland')}</option>
                  <option value="United States">{t('settings.countries.us')}</option>
                  <option value="Canada">{t('settings.countries.canada')}</option>
                  <option value="Australia">{t('settings.countries.australia')}</option>
                  <option value="New Zealand">{t('settings.countries.nz')}</option>
                  <option value="Other">{t('settings.countries.other')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {profileSaving ? t('settings.saving') : t('settings.saveChanges')}
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
              <h2 className="text-base font-semibold text-navy-950 leading-none">{t('settings.passwordTitle')}</h2>
              <p className="text-xs text-stone-400 mt-0.5">{t('settings.passwordSubtitle')}</p>
            </div>
          </div>
          {pwSaved && <SavedBadge />}
        </div>

        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <PwInput id="current" label={t('settings.currentPassword')} field="current" />
            <div /> {/* spacer */}
            <PwInput id="next" label={t('settings.newPassword')} field="next" />
            <PwInput id="confirm" label={t('settings.confirmPassword')} field="confirm" />
          </div>

          {pwError && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <AlertCircle size={13} /> {pwError}
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving}
            className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {pwSaving ? t('settings.updating') : t('settings.updatePassword')}
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
              <h2 className="text-base font-semibold text-navy-950 leading-none">{t('settings.notifsTitle')}</h2>
              <p className="text-xs text-stone-400 mt-0.5">{t('settings.notifsSubtitle')}</p>
            </div>
          </div>
          {notifSaved && <SavedBadge />}
        </div>

        <div className="space-y-3">
          {['plan_updates', 'new_messages', 'alerts_critical', 'alerts_info', 'digest_weekly'].map(key => (
            <label key={key} className="flex items-center justify-between gap-4 py-3 border-b border-stone-100 last:border-0 cursor-pointer group">
              <div>
                <p className="text-sm font-medium text-navy-900">{t(`settings.notifs.${key}.label`)}</p>
                <p className="text-xs text-stone-400">{t(`settings.notifs.${key}.desc`)}</p>
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
          className="mt-5 inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-navy-700 transition-colors"
        >
          {t('settings.savePrefs')}
        </button>
      </section>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DELEGATE MESSAGE CARD
// ─────────────────────────────────────────────────────────────
function DelegateMessageCard({ msg, ownerName, inviteToken, isDemo }) {
  const { t } = useTranslation('delegate')
  const [open, setOpen] = useState(false)
  const isMedia = msg.type === 'video' || msg.type === 'photo'
  const hasMedia = !!(msg.media_url || msg.video_url)
  // Signed URL fetched lazily on first expand — the private `messages` bucket
  // isn't readable by delegates directly, so the server authorises and signs
  // (api/messages/delegate-media.js re-checks the invite + release state).
  const [mediaUrl, setMediaUrl] = useState(null)
  const [mediaState, setMediaState] = useState('idle') // idle | loading | ready | failed
  useEffect(() => {
    if (!open || !isMedia || !hasMedia || isDemo || mediaState !== 'idle') return
    let on = true
    setMediaState('loading')
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/messages/delegate-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ inviteToken, messageId: msg.id }),
        })
        const data = await res.json().catch(() => ({}))
        if (!on) return
        if (res.ok && data.url) { setMediaUrl(data.url); setMediaState('ready') }
        else setMediaState('failed')
      } catch { if (on) setMediaState('failed') }
    })()
    return () => { on = false }
  }, [open, isMedia, hasMedia, isDemo, mediaState, inviteToken, msg.id])

  const fmtDate = (iso) => {
    try { return new Intl.DateTimeFormat(dateLocale(), { dateStyle: 'long' }).format(new Date(iso)) } catch { return '—' }
  }

  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.type === 'video' ? 'bg-purple-50 text-purple-600' : msg.type === 'photo' ? 'bg-sage-50 text-sage-600' : 'bg-navy-50 text-navy-700'}`}>
          {msg.type === 'video' ? <Video size={17} /> : msg.type === 'photo' ? <ImageIcon size={17} /> : <FileEdit size={17} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-900 text-sm truncate">{msg.title}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {t('messages.card.from')} <span className="font-medium text-navy-700">{ownerName || t('messages.card.planOwnerFallback')}</span>
            {msg.released_at ? ` · ${t('messages.card.released', { date: fmtDate(msg.released_at) })}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${msg.type === 'video' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-navy-50 text-navy-700 border-navy-200'}`}>
            {msg.type === 'video' ? t('messages.card.typeVideo') : msg.type === 'photo' ? t('messages.card.typePhoto') : t('messages.card.typeNote')}
          </span>
          <ChevronDown size={15} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-5 py-5 bg-stone-50 space-y-4">
          {isMedia ? (
            isDemo || !hasMedia ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 aurora-field aurora-dim rounded-xl text-white">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  {msg.type === 'video' ? <Play size={26} className="text-white ml-1" /> : <ImageIcon size={26} className="text-white" />}
                </div>
                <p className="text-sm text-stone-300 font-medium">{msg.title}</p>
                <p className="text-xs text-stone-500">{isDemo ? t('messages.card.demoPlayback') : t('messages.card.storedSecurely', { type: t(`messages.card.typeNoun.${msg.type}`, { defaultValue: msg.type }) })}</p>
              </div>
            ) : mediaState === 'ready' && mediaUrl ? (
              <div className="rounded-xl overflow-hidden border border-stone-200 bg-white">
                {msg.type === 'video'
                  ? <video src={mediaUrl} controls playsInline className="w-full max-h-96 bg-black" />
                  : <img src={mediaUrl} alt={msg.title} className="w-full max-h-96 object-contain bg-stone-50" />}
              </div>
            ) : mediaState === 'failed' ? (
              <p className="text-xs text-stone-400 py-8 text-center">{t('messages.card.loadFailed', { type: t(`messages.card.typeNoun.${msg.type}`, { defaultValue: msg.type }) })}</p>
            ) : (
              <div className="flex items-center justify-center py-10"><RefreshCw size={18} className="animate-spin text-stone-300" /></div>
            )
          ) : (
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-3 uppercase tracking-wide">
                {t('messages.card.personalFrom', { name: ownerName || t('common.thePlanOwner') })}
              </p>
              <blockquote className="border-l-4 border-navy-300 pl-4 text-sm text-navy-900 leading-relaxed italic whitespace-pre-wrap">
                {msg.content}
              </blockquote>
            </div>
          )}
          <p className="text-xs text-stone-400 pt-1">
            {t('messages.card.footer', { name: ownerName || t('common.thePlanOwner') })}
            {msg.released_at ? ` ${t('messages.card.footerReleased', { date: fmtDate(msg.released_at) })}` : ''}
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
  const { t } = useTranslation('delegate')
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
    if (!form.consent) { setError(t('report.consentError')); return }
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
      setError(t('report.submitFailed'))
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
        <h2 className="text-xl font-semibold text-emerald-900">{t('reportDeath.submittedTitle')}</h2>
        <p className="text-sm text-emerald-800 leading-relaxed max-w-lg mx-auto">
          <Trans t={t} i18nKey="reportDeath.submittedBody" />
        </p>
        <p className="text-xs text-emerald-700">
          <Trans t={t} i18nKey="report.confirmationSent" values={{ email: form.reporter_email }} components={{ a: <a href="mailto:support@everstead.care" className="underline" /> }} />
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
            <h2 className="text-xl font-semibold text-white">{t('reportDeath.title')}</h2>
            <p className="text-sm text-red-100 mt-0.5">{t('reportDeath.subtitle', { name: owner?.full_name || t('common.thePlanOwner') })}</p>
          </div>
        </div>
        <div className="px-8 py-7 space-y-5">
          <p className="text-sm text-stone-700 leading-relaxed">
            <Trans t={t} i18nKey="reportDeath.intro" values={{ name: owner?.full_name || t('common.thePlanOwner') }} />
          </p>
          <ul className="space-y-2 text-sm text-stone-700">
            {t('reportDeath.bullets', { returnObjects: true }).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
            <AlertCircle size={15} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              {t('reportDeath.notice')}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-red-700 transition-colors"
            >
              {t('report.continueToForm')} <ArrowRight size={15} />
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
          <h2 className="text-xl font-semibold text-white">{t('reportDeath.formTitle')}</h2>
          <p className="text-sm text-red-100 mt-0.5">{t('report.requiredNote')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">
        {/* Reporter details */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">{t('report.reporterHeading')}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('report.fullName')}</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.reporter_name}
                onChange={e => setForm(p => ({ ...p, reporter_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('report.email')}</label>
              <input
                type="email"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.reporter_email}
                onChange={e => setForm(p => ({ ...p, reporter_email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('report.phone')}</label>
              <input
                type="tel"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.reporter_phone}
                onChange={e => setForm(p => ({ ...p, reporter_phone: e.target.value }))}
                placeholder={t('report.phonePlaceholder')}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('report.role')}</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.reporter_role}
                onChange={e => setForm(p => ({ ...p, reporter_role: e.target.value }))}
                placeholder={t('reportDeath.rolePlaceholder')}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('reportDeath.relationshipLabel')}</label>
              {/* Submitted relationship values stay in English in every locale — only the visible labels are translated. */}
              <select
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.relationship}
                onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}
                required
              >
                <option value="" disabled>{t('report.select')}</option>
                <option value="Spouse / Partner">{t('report.relationship.spouse')}</option>
                <option value="Child">{t('report.relationship.child')}</option>
                <option value="Sibling">{t('report.relationship.sibling')}</option>
                <option value="Parent">{t('report.relationship.parent')}</option>
                <option value="Named Executor">{t('report.relationship.executor')}</option>
                <option value="Solicitor / Attorney">{t('report.relationship.solicitor')}</option>
                <option value="Other">{t('report.relationship.other')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Death details */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">{t('reportDeath.detailsHeading')}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('reportDeath.dateLabel')}</label>
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
              <label className="block text-xs font-semibold text-stone-600">{t('reportDeath.placeLabel')}</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.place_of_death}
                onChange={e => setForm(p => ({ ...p, place_of_death: e.target.value }))}
                placeholder={t('reportDeath.placePlaceholder')}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-600">{t('reportDeath.certLabel')}</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                value={form.death_cert_number}
                onChange={e => setForm(p => ({ ...p, death_cert_number: e.target.value }))}
                placeholder={t('reportDeath.certPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Supporting document upload */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">{t('report.uploadHeading')}</h3>
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-5 text-center">
            <Upload size={22} className="mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">{t('reportDeath.uploadLead')}</p>
            <p className="text-xs text-stone-400 mt-1">{t('report.uploadMeta')}</p>
            <label className="cursor-pointer mt-3 inline-flex items-center gap-2 border border-stone-300 text-stone-600 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">
              <Upload size={13} /> {t('report.chooseFile')}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" />
            </label>
          </div>
        </div>

        {/* Additional notes */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">{t('reportDeath.notesLabel')}</label>
          <textarea
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 min-h-[90px] resize-y"
            value={form.additional_notes}
            onChange={e => setForm(p => ({ ...p, additional_notes: e.target.value }))}
            placeholder={t('reportDeath.notesPlaceholder')}
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
              {t('reportDeath.consent')}
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
            {saving ? t('report.submitting') : <><Send size={15} /> {t('report.submit')}</>}
          </button>
          <button
            type="button"
            onClick={() => setStep('intro')}
            className="inline-flex items-center gap-2 border border-stone-300 text-stone-600 text-sm font-semibold px-5 py-3 rounded-xl hover:bg-stone-100 transition-colors"
          >
            {t('report.back')}
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
  const { t } = useTranslation('delegate')
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
    if (!form.consent) { setError(t('report.consentError')); return }
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
      setError(t('report.submitFailed'))
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
        <h2 className="text-xl font-semibold text-emerald-900">{t('reportIncident.submittedTitle')}</h2>
        <p className="text-sm text-emerald-800 leading-relaxed max-w-lg mx-auto">
          <Trans t={t} i18nKey="reportIncident.submittedBody" />
        </p>
        <p className="text-xs text-emerald-700">
          <Trans t={t} i18nKey="report.confirmationSent" values={{ email: form.reporter_email }} components={{ a: <a href="mailto:support@everstead.care" className="underline" /> }} />
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
            <h2 className="text-xl font-semibold text-white">{t('reportIncident.title')}</h2>
            <p className="text-sm text-amber-100 mt-0.5">{t('reportIncident.subtitle', { name: owner?.full_name || t('common.thePlanOwner') })}</p>
          </div>
        </div>
        <div className="px-8 py-7 space-y-5">
          <p className="text-sm text-stone-700 leading-relaxed">
            <Trans t={t} i18nKey="reportIncident.intro" values={{ name: owner?.full_name || t('common.thePlanOwner') }} />
          </p>
          <ul className="space-y-2 text-sm text-stone-700">
            {t('reportIncident.bullets', { returnObjects: true }).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
            <AlertCircle size={15} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              {t('reportIncident.notice')}
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-amber-700 transition-colors"
            >
              {t('report.continueToForm')} <ArrowRight size={15} />
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
          <h2 className="text-xl font-semibold text-white">{t('reportIncident.formTitle')}</h2>
          <p className="text-sm text-amber-100 mt-0.5">{t('report.requiredNote')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">

        {/* Reporter details */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">{t('report.reporterHeading')}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('report.fullName')}</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.reporter_name}
                onChange={e => setForm(p => ({ ...p, reporter_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('report.email')}</label>
              <input
                type="email"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.reporter_email}
                onChange={e => setForm(p => ({ ...p, reporter_email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('report.phone')}</label>
              <input
                type="tel"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.reporter_phone}
                onChange={e => setForm(p => ({ ...p, reporter_phone: e.target.value }))}
                placeholder={t('report.phonePlaceholder')}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('report.role')}</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.reporter_role}
                onChange={e => setForm(p => ({ ...p, reporter_role: e.target.value }))}
                placeholder={t('reportIncident.rolePlaceholder')}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('reportIncident.relationshipLabel')}</label>
              {/* Submitted relationship values stay in English in every locale — only the visible labels are translated. */}
              <select
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.relationship}
                onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}
                required
              >
                <option value="" disabled>{t('report.select')}</option>
                <option value="Spouse / Partner">{t('report.relationship.spouse')}</option>
                <option value="Child">{t('report.relationship.child')}</option>
                <option value="Sibling">{t('report.relationship.sibling')}</option>
                <option value="Parent">{t('report.relationship.parent')}</option>
                <option value="Named Executor">{t('report.relationship.executor')}</option>
                <option value="Healthcare Proxy">{t('report.relationship.healthcareProxy')}</option>
                <option value="Solicitor / Attorney">{t('report.relationship.solicitor')}</option>
                <option value="Other">{t('report.relationship.other')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incident details */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">{t('reportIncident.detailsHeading')}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('reportIncident.typeLabel')}</label>
              {/* Submitted incident_type values stay in English in every locale — only the visible labels are translated. */}
              <select
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.incident_type}
                onChange={e => setForm(p => ({ ...p, incident_type: e.target.value }))}
                required
              >
                <option value="" disabled>{t('report.select')}</option>
                <option value="Medical emergency (hospitalisation)">{t('reportIncident.types.medical')}</option>
                <option value="Serious accident or injury">{t('reportIncident.types.accident')}</option>
                <option value="Diagnosed loss of mental capacity">{t('reportIncident.types.capacity')}</option>
                <option value="Degenerative condition (e.g. dementia)">{t('reportIncident.types.degenerative')}</option>
                <option value="Prolonged unresponsiveness / coma">{t('reportIncident.types.coma')}</option>
                <option value="Other incapacity">{t('reportIncident.types.other')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">{t('reportIncident.dateLabel')}</label>
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
              <label className="block text-xs font-semibold text-stone-600">{t('reportIncident.locationLabel')}</label>
              <input
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder={t('reportIncident.locationPlaceholder')}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-600">{t('reportIncident.descLabel')}</label>
              <textarea
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 min-h-[90px] resize-y"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder={t('reportIncident.descPlaceholder')}
                required
              />
            </div>
          </div>
        </div>

        {/* Access reason */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-stone-600">{t('reportIncident.accessLabel')}</label>
          <textarea
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 min-h-[80px] resize-y"
            value={form.access_reason}
            onChange={e => setForm(p => ({ ...p, access_reason: e.target.value }))}
            placeholder={t('reportIncident.accessPlaceholder')}
            required
          />
        </div>

        {/* Supporting document upload */}
        <div>
          <h3 className="text-sm font-semibold text-navy-900 mb-4 pb-2 border-b border-stone-100">{t('report.uploadHeading')}</h3>
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-5 text-center">
            <Upload size={22} className="mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500">{t('reportIncident.uploadLead')}</p>
            <p className="text-xs text-stone-400 mt-1">{t('report.uploadMeta')}</p>
            <label className="cursor-pointer mt-3 inline-flex items-center gap-2 border border-stone-300 text-stone-600 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">
              <Upload size={13} /> {t('report.chooseFile')}
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
              {t('reportIncident.consent')}
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
            {saving ? t('report.submitting') : <><Send size={15} /> {t('report.submit')}</>}
          </button>
          <button
            type="button"
            onClick={() => setStep('intro')}
            className="inline-flex items-center gap-2 border border-stone-300 text-stone-600 text-sm font-semibold px-5 py-3 rounded-xl hover:bg-stone-100 transition-colors"
          >
            {t('report.back')}
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
  { key: 'tellUsOnce',   url: 'https://www.gov.uk/tell-us-once', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'settld',       url: 'https://settld.care', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'probate',      url: 'https://www.gov.uk/wills-probate-inheritance/applying-for-probate', color: 'bg-navy-50 text-navy-700 border-navy-200' },
  { key: 'willRegister', url: 'https://www.nationalwillregister.co.uk', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'opg',          url: 'https://www.gov.uk/government/organisations/office-of-the-public-guardian', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'hmrc',         url: 'https://www.gov.uk/government/organisations/hm-revenue-customs/contact/bereavement', color: 'bg-stone-50 text-stone-700 border-stone-200' },
]

function ExternalLinksPanel() {
  const { t } = useTranslation('delegate')
  return (
    <Panel title={t('externalLinks.title')} icon={Globe}>
      <p className="text-xs text-stone-500 mb-4 -mt-1">{t('externalLinks.intro')}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {EXTERNAL_LINKS.map(link => (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start gap-3 rounded-2xl border p-4 hover:shadow-sm transition-shadow ${link.color}`}
          >
            <ExternalLink size={14} className="shrink-0 mt-0.5 opacity-70" />
            <div>
              <p className="text-sm font-semibold leading-snug">{t(`externalLinks.items.${link.key}.label`)}</p>
              <p className="text-xs leading-relaxed mt-0.5 opacity-80">{t(`externalLinks.items.${link.key}.desc`)}</p>
            </div>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs text-stone-400">{t('externalLinks.disclaimer')}</p>
    </Panel>
  )
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION TRACKER
// ─────────────────────────────────────────────────────────────
// Names and "how" details live in the delegate namespace under
// notify.institutions.<id>; category values are stable grouping keys
// translated at render via notify.categories.
const UK_INSTITUTIONS = [
  { id: 'tell-us-once',    category: 'Government', url: 'https://www.gov.uk/tell-us-once' },
  { id: 'hmrc',            category: 'Government' },
  { id: 'dwp',             category: 'Government' },
  { id: 'probate',         category: 'Legal',      url: 'https://www.gov.uk/wills-probate-inheritance/applying-for-probate' },
  { id: 'nhs-gp',          category: 'Healthcare' },
  { id: 'council-tax',     category: 'Local' },
  { id: 'electoral',       category: 'Government' },
  { id: 'dvla',            category: 'Government' },
  { id: 'passport',        category: 'Government' },
  { id: 'energy',          category: 'Utilities' },
  { id: 'broadband',       category: 'Utilities' },
  { id: 'water',           category: 'Utilities' },
  { id: 'royal-mail',      category: 'Postal',     url: 'https://www.royalmail.com/track-my-mail/redirection' },
  { id: 'subscriptions',   category: 'Financial' },
  { id: 'life-insurance',  category: 'Insurance' },
  { id: 'pension-private', category: 'Financial' },
]

const STATUS_OPTIONS = [
  { value: 'todo',       labelKey: 'notify.status.todo',     cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  { value: 'notified',   labelKey: 'notify.status.notified', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'done',       labelKey: 'notify.status.done',     cls: 'bg-sage-100 text-sage-700 border-sage-200' },
]

function NotificationTracker({ accounts, statuses, onSetStatus, ownerSuspended }) {
  const { t } = useTranslation('delegate')
  const categories = useMemo(() => {
    const cats = {}
    // Standard institutions
    UK_INSTITUTIONS.forEach(inst => {
      if (!cats[inst.category]) cats[inst.category] = []
      cats[inst.category].push({
        ...inst,
        name: t(`notify.institutions.${inst.id}.name`),
        how: t(`notify.institutions.${inst.id}.how`),
      })
    })
    // Accounts from the plan as extra rows
    accounts.forEach(acc => {
      const cat = 'From this plan'
      if (!cats[cat]) cats[cat] = []
      cats[cat].push({
        id: `account-${acc.id}`,
        name: acc.institution,
        category: cat,
        how: `${acc.account_type}${acc.account_number_hint ? ` (${t('notify.refPrefix')}••••${acc.account_number_hint}` : ''}${acc.notes ? `) ${acc.notes}` : ''}`,
      })
    })
    return cats
  }, [accounts, t])

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
            <h2 className="text-lg font-semibold text-navy-950 leading-none">{t('notify.title')}</h2>
            <p className="text-xs text-stone-400 mt-0.5">{t('notify.subtitle')}</p>
          </div>
        </div>
        {!ownerSuspended && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
            <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">{t('notify.preNote')}</p>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-sage-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs font-semibold text-stone-600 shrink-0">{t('notify.progress', { done: doneCount, total: allItems.length })}</p>
        </div>
        {notifiedCount > 0 && <p className="text-xs text-amber-700 mt-1.5">{t('notify.awaiting', { count: notifiedCount })}</p>}
      </div>

      {/* Institution groups */}
      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} className="rounded-[2rem] border border-stone-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">{t(`notify.categories.${cat}`, { defaultValue: cat })}</p>
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
                    title={t(`notify.markAs.${next}`)}
                  >
                    {status === 'done' ? <Check size={11} className="inline" /> : t(statusInfo.labelKey)}
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
      <p className="text-xs text-stone-400 text-center pb-2">{t('notify.footer')}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DELEGATE AI GUIDE — floating chat widget
// ─────────────────────────────────────────────────────────────
function DelegateAIGuide({ ownerName, ownerId, delegateName, role, ownerStatus, docCount, accountCount, instructionCount }) {
  const { t } = useTranslation('delegate')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = React.useRef(null)

  const openingMessage = ownerStatus === 'deceased'
    ? t('aiGuide.opening.deceased', { name: ownerName || t('common.thePlanOwner') })
    : ownerStatus === 'incapacitated'
      ? t('aiGuide.opening.incapacitated', { role: role || t('aiGuide.trustedPerson'), name: ownerName || t('common.thePlanOwner'), roleA: role || t('aiGuide.aTrustedPerson') })
      : t('aiGuide.opening.default', { role: role || t('aiGuide.trustedPerson'), name: ownerName || t('common.thePlanOwner') })

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
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.access_token) {
        setMessages(prev => [...prev, { role: 'assistant', content: t('aiGuide.previewReply') }])
        setLoading(false)
        return
      }
      const res = await fetch('/api/ai/executor-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          question: text,
          delegateName,
          ownerName,
          ownerId,
          vaultSummary,
          conversationHistory,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('aiGuide.errorReply') }])
    } finally {
      setLoading(false)
    }
  }

  const urgencyColor = ownerStatus === 'deceased'
    ? 'bg-stone-900 hover:bg-stone-800'
    : ownerStatus === 'incapacitated'
      ? 'bg-amber-700 hover:bg-amber-600'
      : 'btn-aurora hover:bg-navy-700'

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-50 inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-lg transition-all ${urgencyColor} ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label={t('aiGuide.openAria')}
      >
        <Sparkles size={16} />
        {ownerStatus === 'deceased' || ownerStatus === 'incapacitated' ? t('aiGuide.triggerUrgent') : t('aiGuide.triggerDefault')}
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
                <p className="text-sm font-semibold text-white leading-none">{t('aiGuide.headerTitle')}</p>
                <p className="text-xs text-white/60 mt-0.5">{t('aiGuide.headerSubtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label={t('aiGuide.closeAria')}
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
                  <span className="text-xs text-stone-400">{t('aiGuide.thinking')}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts — shown only when there's just the opening message */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {(ownerStatus === 'deceased'
                ? t('aiGuide.prompts.deceased', { returnObjects: true })
                : ownerStatus === 'incapacitated'
                  ? t('aiGuide.prompts.incapacitated', { returnObjects: true })
                  : t('aiGuide.prompts.default', { returnObjects: true })
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
              placeholder={t('aiGuide.inputPlaceholder')}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="shrink-0 btn-aurora text-white p-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t('aiGuide.sendAria')}
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
  const { t } = useTranslation('delegate')
  if (ownerStatus !== 'deceased' && ownerStatus !== 'incapacitated') return null

  const isDeceased = ownerStatus === 'deceased'
  const steps = (isDeceased
    ? t('firstSteps.deceasedSteps', { returnObjects: true })
    : t('firstSteps.incapSteps', { returnObjects: true })
  ).map((step, i) => ({ n: String(i + 1), ...step }))

  return (
    <div className={`rounded-[2rem] border p-6 ${isDeceased ? 'border-stone-300 bg-stone-900' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isDeceased ? 'bg-white/10' : 'bg-amber-100'}`}>
          <ListChecks size={18} className={isDeceased ? 'text-white' : 'text-amber-700'} />
        </div>
        <div>
          <h2 className={`text-base font-semibold leading-none ${isDeceased ? 'text-white' : 'text-amber-950'}`}>
            {isDeceased ? t('firstSteps.deceasedTitle', { name: ownerName || t('firstSteps.nextStepsFallback') }) : t('firstSteps.incapTitle')}
          </h2>
          <p className={`text-xs mt-1 ${isDeceased ? 'text-stone-400' : 'text-amber-700'}`}>
            {isDeceased ? t('firstSteps.deceasedSubtitle') : t('firstSteps.incapSubtitle')}
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
          <FileText size={12} /> {t('firstSteps.viewDocuments')}
        </button>
        <button
          onClick={() => onNavigate('accounts')}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors ${isDeceased ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-amber-200 text-amber-900 hover:bg-amber-300'}`}
        >
          <Wallet size={12} /> {t('firstSteps.viewAccounts')}
        </button>
        {isDeceased && (
          <button
            onClick={onReportDeath}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-red-700 text-white hover:bg-red-600 transition-colors"
          >
            <HeartCrack size={12} /> {t('firstSteps.reportDeathCta')}
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

function Panel({ title, icon: Icon, children, count, countLabel, action }) {
  const { t } = useTranslation('delegate')
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
              <p className="text-xs text-stone-400 mt-0.5">{count} {countLabel ?? t('panel.total')}</p>
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
  const { t } = useTranslation('delegate')
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
            {t('empty.backHome')}
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
