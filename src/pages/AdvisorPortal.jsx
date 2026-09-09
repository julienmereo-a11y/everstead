// Adviser Portal v2. A persistent navy sidebar, an action-first Overview, and
// a solicitor experience (review queue, document requests, matters) switched
// on by the firm's type. Screens live in ./adviser/screens.jsx and
// ./adviser/solicitor.jsx; this file loads the data, owns the navigation and
// performs every write.
//
// Data rules that never change: a firm only ever sees the sections a client
// consented to (get_adviser_client_plan), and the client's own rows are never
// modified from here. Requests, reviews and matters are firm-side records.
//
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, BookOpen, FileText, LayoutDashboard, LogOut, Scale, Settings, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_ADVISER_WORKSPACE, DEMO_ADVISOR, DEMO_ADVISOR_FAMILIES } from '../lib/demoData'
import { supabase } from '../lib/supabase'
import { AdviserAssistant, InviteFamilyModal, initialOf } from './adviser/shared'
import { AlertsScreen, ClientDetailScreen, ClientsScreen, GuidesScreen, OverviewScreen, SettingsScreen, deriveOverview } from './adviser/screens'
import { MattersScreen, ReviewQueueScreen } from './adviser/solicitor'

const roleFromType = (t) => (t === 'solicitor' || t === 'notaire') ? 'solicitor' : 'adviser'
const EMPTY_WS = { requests: [], reviews: [], matters: [] }

async function authed(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

export default function AdvisorPortal() {
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  // ── Data ─────────────────────────────────────────────────────
  const [realFamilies, setRealFamilies] = useState([])
  const [realFirm, setRealFirm]         = useState(null)
  const [realTeam, setRealTeam]         = useState([])
  const [realWs, setRealWs]             = useState(EMPTY_WS)
  const [demoWs, setDemoWs]             = useState(() => JSON.parse(JSON.stringify(DEMO_ADVISER_WORKSPACE)))
  const [demoFamilies, setDemoFamilies] = useState(() => DEMO_ADVISOR_FAMILIES.map(f => ({ ...f })))
  const [demoRole, setDemoRole]         = useState('solicitor')
  const [dataLoading, setDataLoading]   = useState(!isDemo)

  const loadPortal = async () => {
    setDataLoading(true)
    await supabase.rpc('claim_adviser_invites').then(() => {}, () => {})
    const [firmRes, clientRes, teamRes, inviteRes, notesRes, wsRes] = await Promise.all([
      supabase.rpc('get_adviser_firm'),
      supabase.rpc('get_adviser_clients'),
      supabase.rpc('get_adviser_team'),
      supabase.rpc('get_adviser_client_invites'),
      supabase.rpc('get_adviser_client_notes'),
      supabase.rpc('get_adviser_workspace'),
    ])
    setRealFirm(Array.isArray(firmRes.data) ? (firmRes.data[0] ?? null) : (firmRes.data ?? null))
    setRealTeam(teamRes.data || [])
    setRealWs(wsRes.data && typeof wsRes.data === 'object' ? { ...EMPTY_WS, ...wsRes.data } : EMPTY_WS)
    const notesById = {}
    for (const n of notesRes.data || []) notesById[n.client_id] = n
    // Each linked client's plan, limited to the sections THEY consented to.
    const plans = {}
    await Promise.all((clientRes.data || []).map(async (c) => {
      const { data } = await supabase.rpc('get_adviser_client_plan', { p_client_id: c.id })
      if (data && typeof data === 'object') plans[c.id] = data
    }))
    const NO_CONSENT = { accounts: false, documents: false, instructions: false, people: false, alerts: false }
    const linked = (clientRes.data || []).map(c => {
      const plan = plans[c.id] || {}
      const cons = plan.consents || {}
      const latest = [c.created_at, cons.updated_at, ...(plan.activity || []).map(a => a.created_at), ...(plan.accounts || []).map(a => a.updated_at), ...(plan.documents || []).map(d => d.updated_at)].filter(Boolean).sort().pop()
      return {
        id: c.id, owner_name: c.full_name || c.email, owner_email: c.email, plan: c.plan,
        readiness_score: c.readiness_score ?? 0, invite_status: 'accepted', last_updated: latest || c.created_at,
        owner_status: c.owner_status || null, activation: plan.activation || null, notify_on_activation: !!cons.notify_on_activation,
        advisor_notes: notesById[c.id]?.notes ?? '', next_review_date: notesById[c.id]?.next_review_date ?? '', meeting_notes: notesById[c.id]?.meeting_notes ?? '',
        accounts: plan.accounts || [], documents: plan.documents || [],
        instructions: (plan.instructions || []).map(i => ({ ...i, steps_count: i.steps?.length ?? 0 })),
        trusted_people: plan.trusted_people || [], alerts: plan.alerts || [], activity_log: plan.activity || [],
        advisor_permissions: plan.consents ? { accounts: !!cons.accounts, documents: !!cons.documents, instructions: !!cons.instructions, people: !!cons.people, alerts: !!cons.alerts } : NO_CONSENT,
      }
    })
    const linkedEmails = new Set(linked.map(f => (f.owner_email || '').toLowerCase()))
    const pending = (inviteRes.data || []).filter(i => !linkedEmails.has((i.email || '').toLowerCase())).map(i => ({
      id: `invite-${i.id}`, owner_name: i.client_name || i.email, owner_email: i.email, readiness_score: 0, invite_status: 'pending',
      last_updated: i.created_at, accounts: [], documents: [], instructions: [], trusted_people: [], alerts: [], activity_log: [],
    }))
    setRealFamilies([...linked, ...pending])
    setDataLoading(false)
  }
  useEffect(() => { if (isDemo || !user) return; loadPortal() }, [user, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  const families  = isDemo ? demoFamilies : realFamilies
  const workspace = isDemo ? demoWs : realWs
  const firm      = isDemo ? { id: 'demo-firm', firm_name: demoRole === 'solicitor' ? 'Carter & Vale Solicitors' : DEMO_ADVISOR.firm, firm_type: demoRole === 'solicitor' ? 'solicitor' : 'ifa', plan_type: 'pilot', max_families: 5, role: 'owner', pilot_end_date: '2027-06-01' } : realFirm
  const role      = isDemo ? demoRole : roleFromType(realFirm?.firm_type)
  const team      = isDemo
    ? [{ id: 't1', email: DEMO_ADVISOR.email, role: 'owner', invite_status: 'accepted', full_name: DEMO_ADVISOR.full_name }, { id: 't2', email: 'james@carterwealth.example', role: 'member', invite_status: 'accepted', full_name: 'James Reid' }]
    : realTeam
  const advisor = isDemo ? { ...DEMO_ADVISOR, firm: firm.firm_name, isOwner: true } : profile ? {
    id: user.id, full_name: profile.full_name, email: profile.email ?? user.email, phone: profile.phone || '',
    firm: realFirm?.firm_name ?? '', logo_url: realFirm?.logo_url ?? null, isOwner: realFirm?.role === 'owner',
    families_limit: realFirm?.max_families ?? 5,
  } : null

  // ── Navigation ───────────────────────────────────────────────
  const [tab, setTab]                 = useState('overview')
  const [selectedId, setSelectedId]   = useState(null)
  const [detailTab, setDetailTab]     = useState('overview')
  const [query, setQuery]             = useState('')
  const [readIds, setReadIds]         = useState(() => new Set())
  const [showInvite, setShowInvite]   = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestBusy, setRequestBusy] = useState(false)
  const [requestError, setRequestError] = useState(null)
  const [matterBusy, setMatterBusy]   = useState(false)
  const [roleBusy, setRoleBusy]       = useState(false)

  const go = (next) => { setTab(next); setRequestOpen(false); window.scrollTo({ top: 0 }) }
  const openClient = (id, dtab = 'overview') => { setSelectedId(id); setDetailTab(dtab); setTab('client'); window.scrollTo({ top: 0 }) }
  const selected = families.find(f => f.id === selectedId) || null
  useEffect(() => { if (tab === 'client' && !selected) setTab('clients') }, [tab, selected])

  const overview = useMemo(() => deriveOverview({ families, workspace, role, readIds }), [families, workspace, role, readIds])
  const nav = role === 'solicitor'
    ? [['overview', 'Overview', LayoutDashboard], ['clients', 'Clients', Users], ['review', 'Review queue', FileText, overview.awaiting, 'sage'], ['matters', 'Matters', Scale], ['alerts', 'Alerts', Bell, overview.unread.length, 'red'], ['guides', 'Guides', BookOpen], ['settings', 'Settings', Settings]]
    : [['overview', 'Overview', LayoutDashboard], ['clients', 'Clients', Users], ['alerts', 'Alerts', Bell, overview.unread.length, 'red'], ['guides', 'Guides', BookOpen], ['settings', 'Settings', Settings]]
  useEffect(() => { if (role !== 'solicitor' && (tab === 'review' || tab === 'matters')) setTab('overview') }, [role, tab])

  // ── Writes ───────────────────────────────────────────────────
  const patchFamily = (id, patch) => (isDemo ? setDemoFamilies : setRealFamilies)(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f))
  const patchWs = (fn) => (isDemo ? setDemoWs : setRealWs)(ws => fn(ws))

  const createRequest = async ({ clientId, docType, note }) => {
    setRequestBusy(true); setRequestError(null)
    try {
      if (isDemo) {
        const fam = families.find(f => f.id === clientId)
        patchWs(ws => ({ ...ws, requests: [{ id: `rq-${Date.now()}`, client_id: clientId, client_name: fam?.owner_name, doc_type: docType, note, status: 'requested', created_at: new Date().toISOString(), reminded_at: null, uploaded_at: null }, ...ws.requests] }))
      } else {
        const { request } = await authed('/api/adviser/document-request', { action: 'create', clientId, docType, note })
        patchWs(ws => ({ ...ws, requests: [request, ...ws.requests] }))
      }
      setRequestOpen(false)
      if (tab !== 'review') setTab('review')
    } catch (err) { setRequestError(err.message) }
    finally { setRequestBusy(false) }
  }
  const remindRequest = async (id) => {
    if (isDemo) { patchWs(ws => ({ ...ws, requests: ws.requests.map(r => r.id === id ? { ...r, reminded_at: new Date().toISOString() } : r) })); return }
    try { const { request } = await authed('/api/adviser/document-request', { action: 'remind', requestId: id }); patchWs(ws => ({ ...ws, requests: ws.requests.map(r => r.id === id ? { ...r, ...request } : r) })) } catch { /* the queue keeps the request; the adviser can retry */ }
  }
  const setRequestStatus = async (id, status) => {
    if (!isDemo) { const { error } = await supabase.rpc('set_document_request_status', { p_id: id, p_status: status }); if (error) return }
    patchWs(ws => ({ ...ws, requests: ws.requests.map(r => r.id === id ? { ...r, status } : r) }))
  }
  const setReview = async (clientId, documentId, status) => {
    const fam = families.find(f => f.id === clientId)
    const doc = (fam?.documents || []).find(d => d.id === documentId)
    if (!isDemo) { const { error } = await supabase.rpc('set_document_review', { p_client_id: clientId, p_document_id: documentId, p_status: status, p_note: null }); if (error) return }
    patchWs(ws => {
      const others = ws.reviews.filter(r => !(r.client_id === clientId && r.document_id === documentId))
      const prev = ws.reviews.find(r => r.client_id === clientId && r.document_id === documentId)
      return { ...ws, reviews: [{ ...(prev || {}), document_id: documentId, client_id: clientId, client_name: fam?.owner_name, document_name: doc?.name || prev?.document_name, doc_type: doc?.doc_type || prev?.doc_type, document_updated_at: doc?.updated_at || prev?.document_updated_at, review_status: status, reviewed_at: new Date().toISOString() }, ...others] }
    })
  }
  const saveMatter = async (m) => {
    setMatterBusy(true)
    try {
      let id = m.id
      if (!isDemo) {
        const { data, error } = await supabase.rpc('save_adviser_matter', { p_id: m.id, p_client_id: m.client_id, p_kind: m.kind, p_title: m.title, p_stage: m.stage, p_next_step: m.next_step || null, p_due_date: m.due_date || null })
        if (error) throw error
        id = data
      } else id = id || `m-${Date.now()}`
      const fam = families.find(f => f.id === m.client_id)
      patchWs(ws => {
        const row = { ...m, id, client_name: fam?.owner_name, opened_at: m.opened_at || new Date().toISOString().slice(0, 10), closed_at: m.stage >= 4 ? (m.closed_at || new Date().toISOString().slice(0, 10)) : null, updated_at: new Date().toISOString() }
        const exists = ws.matters.some(x => x.id === id)
        return { ...ws, matters: exists ? ws.matters.map(x => x.id === id ? { ...x, ...row } : x) : [row, ...ws.matters] }
      })
    } catch { /* the editor stays open with the values typed */ }
    finally { setMatterBusy(false) }
  }
  const deleteMatter = async (id) => {
    if (!isDemo) { const { error } = await supabase.rpc('delete_adviser_matter', { p_id: id }); if (error) return }
    patchWs(ws => ({ ...ws, matters: ws.matters.filter(m => m.id !== id) }))
  }
  const setRole = async (type) => {
    if (isDemo) { setDemoRole(roleFromType(type)); return }
    setRoleBusy(true)
    const { error } = await supabase.rpc('set_firm_type', { p_type: type })
    setRoleBusy(false)
    if (!error) setRealFirm(f => ({ ...f, firm_type: type }))
  }
  const resendInvite = async (family) => { await authed('/api/adviser/invite-client', { name: family.owner_name, email: family.owner_email }) }
  const markRead = (key) => setReadIds(s => new Set([...s, key]))
  const markAllRead = () => setReadIds(new Set(families.flatMap(f => (f.alerts || []).map(a => `${f.id}:${a.id}`))))
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  if (!isDemo && dataLoading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" /><p className="text-sm text-stone-500">Loading your portal…</p></div></div>
  }

  const familiesUsed = families.length
  const familiesLimit = advisor?.families_limit ?? 5
  const activeNav = tab === 'client' ? 'clients' : tab

  const NavButton = ({ id, label, Icon, badge, tone, compact }) => (
    <button onClick={() => go(id)} className={`flex items-center gap-3 rounded-xl text-[13.5px] font-medium whitespace-nowrap transition-colors ${compact ? 'px-3 py-2 shrink-0' : 'w-full px-3 py-2.5'} ${activeNav === id ? 'bg-white/[0.12] text-stone-50' : 'text-navy-200 hover:bg-white/[0.07] hover:text-stone-50'}`}>
      <Icon size={16} className="shrink-0" /><span className={compact ? '' : 'flex-1 text-left'}>{label}</span>
      {badge > 0 && <span className={`text-[11px] font-bold min-w-[18px] h-[18px] px-1.5 rounded-full inline-flex items-center justify-center text-white ${tone === 'red' ? 'bg-red-600' : 'bg-sage-600'}`}>{badge}</span>}
    </button>
  )

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col lg:flex-row">
      {isDemo && (
        <div className="lg:hidden bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4">Demo mode, showing {DEMO_ADVISOR.full_name}'s adviser portal. Data is fictional. <Link to="/get-started" className="underline">Create your own plan →</Link></div>
      )}

      {/* ── Sidebar (a horizontal bar below lg) ── */}
      <aside className="lg:w-[236px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen flex flex-col text-stone-50 px-4 py-5 lg:py-6" style={{ background: 'linear-gradient(180deg,#0d1628 0%,#1d3052 100%)' }}>
        <div className="flex items-center justify-between lg:justify-start gap-2.5 px-2 lg:pb-[22px]">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-[30px] h-[30px] rounded-full bg-white/[0.08] border border-white/[0.14] inline-flex items-center justify-center font-display text-[20px] font-medium text-sage-300">E</span>
            <span className="flex flex-col"><span className="font-display text-[21px] leading-none font-medium">Everstead</span><span className="text-[9.5px] tracking-[0.16em] uppercase text-navy-300 mt-[3px]">Adviser portal</span></span>
          </Link>
          <button onClick={isDemo ? () => navigate('/') : handleSignOut} title="Sign out" aria-label="Sign out" className="lg:hidden text-navy-200 hover:text-white p-1.5"><LogOut size={16} /></button>
        </div>
        <nav className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible mt-3 lg:mt-0 -mx-1 px-1 pb-1 lg:pb-0">
          {nav.map(([id, label, Icon, badge, tone]) => <NavButton key={id} id={id} label={label} Icon={Icon} badge={badge} tone={tone} compact={false} />)}
        </nav>
        <div className="hidden lg:flex mt-auto flex-col gap-3">
          <div className="card-dark px-3.5 py-3">
            <div className="flex justify-between text-[11px] text-navy-200"><span>Families</span><span className="text-stone-50 font-semibold">{familiesUsed} / {familiesLimit}</span></div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden mt-2"><div className="h-full rounded-full bg-sage-500" style={{ width: `${Math.min(100, (familiesUsed / (familiesLimit || 1)) * 100)}%` }} /></div>
            <div className="flex items-center gap-1.5 mt-2 text-[10.5px] text-navy-200"><span className="w-1.5 h-1.5 rounded-full bg-sage-400" />{role === 'solicitor' ? 'Solicitor' : 'Financial adviser'} · {firm?.plan_type === 'paid' ? 'paid' : 'pilot'}</div>
          </div>
          <div className="flex items-center gap-2.5 px-1">
            <button onClick={() => go('settings')} className="flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-xl px-2 py-1.5 hover:bg-white/[0.07] transition-colors">
              <span className="w-8 h-8 rounded-full bg-navy-600 inline-flex items-center justify-center text-[12px] font-bold shrink-0">{initialOf(advisor?.full_name)}{(advisor?.full_name || '').split(' ')[1]?.[0]?.toUpperCase() || ''}</span>
              <span className="min-w-0"><span className="block text-[13px] font-semibold truncate">{advisor?.full_name}</span><span className="block text-[11px] text-navy-200 truncate">{advisor?.firm}</span></span>
            </button>
            <button onClick={isDemo ? () => navigate('/') : handleSignOut} title="Sign out" aria-label="Sign out" className="text-navy-200 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.07]"><LogOut size={15} /></button>
          </div>
          {isDemo && <p className="text-[10.5px] text-navy-200 px-1 m-0">Demo: fictional data. <Link to="/get-started" className="underline">Create your own plan</Link></p>}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-10 pt-7 lg:pt-8 pb-28">
        {tab === 'overview' && <OverviewScreen advisor={advisor} role={role} families={families} workspace={workspace} readIds={readIds} go={go} openClient={openClient} onInvite={() => setShowInvite(true)} onRequest={() => { setTab('review'); setRequestOpen(true) }} />}
        {tab === 'clients'  && <ClientsScreen role={role} families={families} workspace={workspace} query={query} setQuery={setQuery} openClient={openClient} onInvite={() => setShowInvite(true)} />}
        {tab === 'client' && selected && (
          <ClientDetailScreen family={selected} role={role} isDemo={isDemo} workspace={workspace} detailTab={detailTab} setDetailTab={setDetailTab}
            goClients={() => go('clients')} onNotesSaved={(patch) => patchFamily(selected.id, patch)} onSetReview={setReview} onResendInvite={resendInvite} />
        )}
        {tab === 'review'   && role === 'solicitor' && <ReviewQueueScreen families={families} workspace={workspace} requestOpen={requestOpen} setRequestOpen={setRequestOpen} requestBusy={requestBusy} requestError={requestError} onCreateRequest={createRequest} onRemind={remindRequest} onRequestStatus={setRequestStatus} onSetReview={setReview} openClient={openClient} isDemo={isDemo} />}
        {tab === 'matters'  && role === 'solicitor' && <MattersScreen families={families} workspace={workspace} onSaveMatter={saveMatter} onDeleteMatter={deleteMatter} busy={matterBusy} isDemo={isDemo} />}
        {tab === 'alerts'   && <AlertsScreen families={families} readIds={readIds} markRead={markRead} markAllRead={markAllRead} openClient={openClient} />}
        {tab === 'guides'   && <GuidesScreen role={role} />}
        {tab === 'settings' && <SettingsScreen advisor={advisor} firm={firm} role={role} canSetRole={isDemo || !!advisor?.isOwner} onSetRole={setRole} roleBusy={roleBusy} team={team} isDemo={isDemo} onReload={isDemo ? undefined : loadPortal} firmId={realFirm?.id} families={families} />}
      </main>

      {showInvite && <InviteFamilyModal onClose={() => setShowInvite(false)} isDemo={isDemo} familiesCount={families.length} familiesLimit={familiesLimit} onInvited={isDemo ? undefined : loadPortal} />}
      <AdviserAssistant isDemo={isDemo} />
    </div>
  )
}
