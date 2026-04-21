import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Clock3,
  ExternalLink,
  FileText,
  FolderOpen,
  Lock,
  LogOut,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react'
import { getDocumentUrl, supabase } from '../lib/supabase'

const tabs = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'instructions', label: 'Instructions', icon: BookOpen },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'activity', label: 'Activity', icon: Clock3 },
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
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState(null)
  const [owner, setOwner] = useState(null)
  const [documents, setDocuments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [instructions, setInstructions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [activity, setActivity] = useState([])
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    if (!token) {
      setError('This delegate dashboard needs a valid invite token.')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')

      const { data: trustedPerson, error: inviteError } = await supabase
        .from('trusted_people')
        .select(`
          *,
          access_grants (*),
          profiles!trusted_people_user_id_fkey(full_name, email, plan)
        `)
        .eq('invite_token', token)
        .single()

      if (inviteError || !trustedPerson) {
        setError('We could not find a valid delegate invitation for this link.')
        setLoading(false)
        return
      }

      setInvite(trustedPerson)
      setOwner(trustedPerson.profiles ?? null)

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

  const handleDownload = async (documentRecord) => {
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

  if (!token || error) {
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
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600">Delegate dashboard</p>
            <h1 className="font-display text-3xl font-light text-navy-950 mt-2">
              {owner?.full_name || 'Plan owner'}’s handoff workspace
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              You are viewing this plan as <span className="font-semibold text-navy-800">{invite.role}</span>. Access is read-only and limited to the sections shared with you.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/security" className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:bg-stone-100 transition-colors">
              Why this is protected
            </Link>
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors">
              <LogOut size={15} /> Exit dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 grid xl:grid-cols-[280px_1fr] gap-8 items-start">
        <aside className="xl:sticky xl:top-24 space-y-5">
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
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-4">
            <nav className="space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${activeTab === id ? 'bg-navy-50 text-navy-900' : 'text-stone-600 hover:bg-stone-100 hover:text-navy-900'}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {id === 'alerts' && unreadAlerts.length > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{unreadAlerts.length}</span>
                  )}
                </button>
              ))}
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
        </aside>

        <main className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Shared documents', value: accessibleDocuments.length, icon: FileText },
                  { label: 'Shared accounts', value: accessibleAccounts.length, icon: Wallet },
                  { label: 'Shared instructions', value: accessibleInstructions.length, icon: BookOpen },
                  { label: 'Unread alerts', value: unreadAlerts.length, icon: Bell },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
                    <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center mb-4">
                      <Icon size={18} />
                    </div>
                    <p className="text-3xl font-light font-display text-navy-950">{value}</p>
                    <p className="mt-1 text-sm text-stone-500">{label}</p>
                  </div>
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
            </>
          )}

          {activeTab === 'documents' && (
            <Panel title="Shared documents" icon={FileText}>
              {accessibleDocuments.length > 0 ? (
                <div className="space-y-4">
                  {accessibleDocuments.map(item => (
                    <div key={item.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-navy-950">{item.name}</p>
                          <p className="mt-1 text-sm text-stone-500">{item.doc_type || 'Document'} · Updated {formatDate(item.updated_at || item.created_at)}</p>
                        </div>
                        {item.storage_path ? (
                          <button onClick={() => handleDownload(item)} className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors" disabled={downloadingId === item.id}>
                            <ExternalLink size={15} /> {downloadingId === item.id ? 'Opening…' : 'Open file'}
                          </button>
                        ) : (
                          <span className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-500">Metadata only</span>
                        )}
                      </div>
                      {item.notes && <p className="mt-4 text-sm leading-relaxed text-stone-600">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No documents are currently shared with this role.</p>
              )}
            </Panel>
          )}

          {activeTab === 'accounts' && (
            <Panel title="Shared accounts" icon={Wallet}>
              {accessibleAccounts.length > 0 ? (
                <div className="grid gap-4">
                  {accessibleAccounts.map(item => (
                    <div key={item.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-navy-950">{item.institution}</p>
                          <p className="mt-1 text-sm text-stone-500">{item.account_type} · {item.category || 'Account'}</p>
                        </div>
                        {item.balance_display && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.balance_display}</span>}
                      </div>
                      <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm text-stone-600">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-stone-400 mb-1">Reference</p>
                          <p>{item.account_number_hint ? `•••• ${item.account_number_hint}` : 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-stone-400 mb-1">Last updated</p>
                          <p>{formatDate(item.updated_at || item.created_at)}</p>
                        </div>
                      </div>
                      {item.notes && <p className="mt-4 text-sm leading-relaxed text-stone-600">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No accounts are currently shared with this role.</p>
              )}
            </Panel>
          )}

          {activeTab === 'instructions' && (
            <Panel title="Shared instructions" icon={BookOpen}>
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

          {activeTab === 'alerts' && (
            <Panel title="Plan alerts" icon={Bell}>
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map(item => (
                    <div key={item.id} className={`rounded-3xl border p-5 ${normalise(item.severity) === 'critical' ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-stone-50'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className={`text-base font-semibold ${normalise(item.severity) === 'critical' ? 'text-red-900' : 'text-navy-950'}`}>{item.title}</p>
                          <p className="mt-1 text-sm text-stone-500">{formatDate(item.created_at)}</p>
                        </div>
                        {!item.is_read && <span className="rounded-full bg-navy-800 px-3 py-1 text-xs font-semibold text-white">Unread</span>}
                      </div>
                      {item.message && <p className="mt-4 text-sm leading-relaxed text-stone-600">{item.message}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No alerts are visible right now.</p>
              )}
            </Panel>
          )}

          {activeTab === 'activity' && (
            <Panel title="Recent plan activity" icon={Clock3}>
              {activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map(item => (
                    <div key={item.id} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                      <p className="text-base font-semibold text-navy-950">{item.resource_name || item.action}</p>
                      <p className="mt-1 text-sm text-stone-500">{humaniseAction(item.action)} · {formatDate(item.created_at)}</p>
                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <pre className="mt-4 overflow-auto rounded-2xl bg-white border border-stone-200 p-4 text-xs text-stone-600 whitespace-pre-wrap">{JSON.stringify(item.metadata, null, 2)}</pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No recent activity is visible yet.</p>
              )}
            </Panel>
          )}
        </main>
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

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center">
          <Icon size={18} />
        </div>
        <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
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
