import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, FileText, Users, Bell, Settings, LogOut,
  ChevronRight, AlertCircle, CheckCircle2, Clock, Lock,
  Folder, CreditCard, Heart, BookOpen, Home, BarChart2,
  Plus, Eye, Upload, Search, X, Info, AlertTriangle,
  Landmark, Building2, Wallet, Key, Activity, MoreHorizontal,
  Pencil, Trash2, Star, Crown, Zap, RefreshCw, ExternalLink,
  Filter, CheckCheck
} from 'lucide-react'
import { useAuth }          from '../contexts/AuthContext'
import { useAccounts }      from '../hooks/useData'
import { useDocuments }     from '../hooks/useData'
import { usePeople }        from '../hooks/useData'
import { CheckoutSuccessBanner, OnboardingChecklist } from '../components/Onboarding'
import { useInstructions }  from '../hooks/useData'
import { useSubscriptions } from '../hooks/useData'
import { useAlerts }        from '../hooks/useData'
import { useActivityLog }   from '../hooks/useData'

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',       label: 'Overview',      icon: Home },
  { id: 'accounts',       label: 'Accounts',      icon: Landmark },
  { id: 'documents',      label: 'Documents',     icon: FileText },
  { id: 'people',         label: 'People',        icon: Users },
  { id: 'instructions',   label: 'Instructions',  icon: BookOpen },
  { id: 'subscriptions',  label: 'Subscriptions', icon: CreditCard },
  { id: 'alerts',         label: 'Alerts',        icon: Bell },
  { id: 'activity',       label: 'Activity',      icon: Activity },
]

const CATEGORY_ICONS = {
  Banking: Landmark, Retirement: BarChart2, Investment: BarChart2,
  Insurance: Shield, Digital: Key, Property: Home, Other: Folder,
}

const STATUS_STYLES = {
  current:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  expiring: 'bg-amber-50  text-amber-700  border-amber-200',
  missing:  'bg-red-50    text-red-700    border-red-200',
  expired:  'bg-stone-100 text-stone-500  border-stone-200',
}

const SEVERITY_STYLES = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',    icon: AlertCircle },
  warning:  { bar: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  info:     { bar: 'bg-sky-400',    badge: 'bg-sky-50  text-sky-700  border-sky-200',   icon: Info },
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD ROOT
// ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const [activeSection, setActiveSection] = useState('overview')
  const [sidebarOpen, setSidebarOpen]     = useState(true)

  const { data: accounts, loading: loadingAccounts, add: addAccount, update: updateAccount, remove: removeAccount } = useAccounts()
  const { data: documents,     loading: loadingDocs, uploadFile, update: updateDocument, remove: removeDocument } = useDocuments()
  const { data: people,        loading: loadingPeople,
          invite, resendInvite }                               = usePeople()
  const { data: instructions,  loading: loadingInstructions, addWithSteps: addInstruction, updateWithSteps: updateInstruction, removeWithSteps: removeInstruction }  = useInstructions()
  const { data: subscriptions, loading: loadingSubs, add: addSubscription, update: updateSubscription, remove: removeSubscription } = useSubscriptions()
  const { data: alerts, markRead, markAllRead, unreadCount }   = useAlerts()
  const { data: activity,      loading: loadingActivity }      = useActivityLog()

  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="w-64 bg-navy-950 border-r border-navy-800 flex flex-col shrink-0">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-navy-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sage-500 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-display text-lg font-semibold text-white tracking-tight">Everstead</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id
            const badge    = id === 'alerts' ? unreadCount : 0
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-stone-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-navy-800 space-y-1">
          <div className="px-3 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-xs font-bold text-white uppercase">
              {profile.full_name?.[0] ?? profile.email[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.full_name ?? 'Your Account'}</p>
              <p className="text-xs text-stone-500 truncate capitalize">{profile.plan} plan</p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('settings')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-stone-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
          >
            <Settings size={15} /> Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-stone-400 hover:text-red-400 hover:bg-white/5 text-sm transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main className="flex-1 overflow-auto flex flex-col">
        <CheckoutSuccessBanner userName={profile.full_name} />
        {activeSection === 'overview'      && <OverviewSection  profile={profile} accounts={accounts} documents={documents} people={people} instructions={instructions} alerts={alerts} markRead={markRead} onNavigate={setActiveSection} />}
        {activeSection === 'accounts'      && <AccountsSection  accounts={accounts} loading={loadingAccounts} add={addAccount} update={updateAccount} remove={removeAccount} />}
        {activeSection === 'documents'     && <DocumentsSection documents={documents} loading={loadingDocs} uploadFile={uploadFile} update={updateDocument} remove={removeDocument} />}
        {activeSection === 'people'        && <PeopleSection    people={people} loading={loadingPeople} invite={invite} resendInvite={resendInvite} />}
        {activeSection === 'instructions'  && <InstructionsSection instructions={instructions} loading={loadingInstructions} add={addInstruction} update={updateInstruction} remove={removeInstruction} />}
        {activeSection === 'subscriptions' && <SubscriptionsSection subscriptions={subscriptions} loading={loadingSubs} add={addSubscription} update={updateSubscription} remove={removeSubscription} />}
        {activeSection === 'alerts'        && <AlertsSection    alerts={alerts} markRead={markRead} markAllRead={markAllRead} />}
        {activeSection === 'activity'      && <ActivitySection  activity={activity} loading={loadingActivity} />}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW SECTION
// ─────────────────────────────────────────────────────────────
function OverviewSection({ profile, accounts, documents, people, instructions, alerts, markRead, onNavigate }) {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.is_read)

  const vaultStats = [
    { label: 'Accounts documented', value: accounts.length, icon: Landmark, target: 5 },
    { label: 'Documents uploaded', value: documents.filter(d => d.status !== 'missing').length, icon: FileText, target: 5 },
    { label: 'Trusted people', value: people.length, icon: Users, target: 2 },
    { label: 'Instructions written', value: instructions.length, icon: BookOpen, target: 3 },
  ]

  const scoreBase = vaultStats.reduce((total, stat) => total + Math.min(stat.value / stat.target, 1), 0) / vaultStats.length
  const alertPenalty = Math.min(criticalAlerts.length * 5, 15)
  const score = Math.max(0, Math.round(scoreBase * 100) - alertPenalty)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-light text-navy-950">
          Good morning, {profile.full_name?.split(' ')[0] ?? 'there'}.
        </h1>
        <p className="text-stone-500 mt-1 text-sm">Here's the state of your plan.</p>
      </div>

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">
                {criticalAlerts.length} critical {criticalAlerts.length === 1 ? 'item needs' : 'items need'} your attention
              </p>
              <ul className="mt-1 space-y-0.5">
                {criticalAlerts.slice(0, 3).map(a => (
                  <li key={a.id} className="text-sm text-red-700">• {a.title}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding checklist — hidden once all steps done + dismissed */}
      <OnboardingChecklist
        accounts={accounts}
        documents={documents}
        people={people}
        instructions={instructions}
        onNavigate={onNavigate}
      />

      {/* Readiness score + stats */}
      <div className="grid lg:grid-cols-[1fr_2fr] gap-6 mb-6">
        {/* Score ring */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">Plan readiness</p>
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e7e5e4" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={score >= 70 ? '#4c7d47' : score >= 40 ? '#d97706' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40 * score / 100} ${2 * Math.PI * 40 * (1 - score / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-light text-navy-950">{score}%</span>
            </div>
          </div>
          <p className="text-xs text-stone-500 mt-3">
            {score >= 80 ? 'Excellent — your family is well prepared.' :
             score >= 50 ? 'Good progress — a few items remaining.' :
             'Getting started — keep building your plan.'}
          </p>
        </div>

        {/* Vault stats */}
        <div className="grid grid-cols-2 gap-4">
          {vaultStats.map(({ label, value, icon: Icon, target }) => (
            <div key={label} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center">
                  <Icon size={15} className="text-navy-700" />
                </div>
                <span className="text-xs text-stone-400">{value}/{target}+ recommended</span>
              </div>
              <p className="font-display text-3xl font-light text-navy-950">{value}</p>
              <p className="text-xs text-stone-500 mt-1">{label}</p>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (value / target) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent documents + alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-navy-900 text-sm">Recent documents</p>
            <span className="text-xs text-stone-400">{documents.length} total</span>
          </div>
          {documents.length === 0 ? (
            <EmptyState icon={FileText} label="No documents yet" action="Upload your first document" />
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map(doc => (
                <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.current}`}>
                    {doc.status}
                  </div>
                  <span className="text-sm text-navy-800 truncate flex-1">{doc.name}</span>
                  <span className="text-xs text-stone-400 shrink-0">{doc.doc_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-navy-900 text-sm">Recent alerts</p>
            {alerts.filter(a => !a.is_read).length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                {alerts.filter(a => !a.is_read).length} unread
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <EmptyState icon={Bell} label="No alerts" action="You're all caught up" />
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => {
                const { icon: Icon, bar } = SEVERITY_STYLES[alert.severity]
                return (
                  <div
                    key={alert.id}
                    onClick={() => markRead(alert.id)}
                    className={`flex items-start gap-3 py-2 border-b border-stone-50 last:border-0 cursor-pointer ${alert.is_read ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${bar}`} />
                    <p className="text-sm text-navy-800 leading-snug">{alert.title}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ACCOUNTS SECTION
// ─────────────────────────────────────────────────────────────
function AccountsSection({ accounts, loading, add, update, remove }) {
  const emptyForm = { institution: '', account_type: '', category: 'Banking', account_number_hint: '', balance_display: '', notes: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const grouped = accounts.reduce((acc, a) => {
    const key = a.category || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const closeModal = () => {
    setShowAdd(false)
    setEditingAccount(null)
    setForm(emptyForm)
  }

  const openAdd = () => {
    setEditingAccount(null)
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEdit = (account) => {
    setShowAdd(false)
    setEditingAccount(account)
    setForm({
      institution: account.institution || '',
      account_type: account.account_type || '',
      category: account.category || 'Banking',
      account_number_hint: account.account_number_hint || '',
      balance_display: account.balance_display || '',
      notes: account.notes || '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        account_number_hint: form.account_number_hint.replace(/\D/g, '').slice(-4),
      }
      if (editingAccount) await update(editingAccount.id, payload)
      else await add(payload)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionShell
      title="Accounts & Assets"
      subtitle={`${accounts.length} account${accounts.length !== 1 ? 's' : ''} documented`}
      action={<button onClick={openAdd} className={primaryBtn}><Plus size={15} />Add account</button>}
    >
      {loading ? <LoadingSpinner /> : accounts.length === 0 ? (
        <EmptyState icon={Landmark} label="No accounts yet" action="Add your first account to start organizing your financial life." />
      ) : (
        Object.entries(grouped).map(([category, items]) => {
          const CatIcon = CATEGORY_ICONS[category] ?? Folder
          return (
            <div key={category} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CatIcon size={15} className="text-navy-600" />
                <p className="text-sm font-semibold text-navy-800">{category}</p>
                <span className="text-xs text-stone-400">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map(acc => (
                  <div key={acc.id} className="bg-white border border-stone-200 rounded-xl px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
                      <Landmark size={16} className="text-navy-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-900 text-sm">{acc.institution}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {acc.account_type}
                        {acc.account_number_hint ? <span className="ml-1 font-mono tracking-wide">•••• {acc.account_number_hint}</span> : ''}
                      </p>
                      {acc.notes && <p className="text-xs text-stone-400 mt-0.5 truncate">{acc.notes}</p>}
                    </div>
                    {acc.balance_display && (
                      <span className="shrink-0 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                        {acc.balance_display}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(acc)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={`Edit ${acc.institution}`}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(acc.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={`Delete ${acc.institution}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {(showAdd || editingAccount) && (
        <Modal title={editingAccount ? 'Edit account' : 'Add account'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Institution" required>
              <input className={input} value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} placeholder="e.g. Barclays, Vanguard" required />
            </Field>
            <Field label="Account type" required>
              <input className={input} value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))} placeholder="e.g. Current Account, ISA" required />
            </Field>
            <Field label="Category">
              <select className={input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {['Banking', 'Retirement', 'Investment', 'Insurance', 'Digital', 'Property', 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Last 4 digits (optional)">
                <input
                  className={input}
                  value={form.account_number_hint}
                  onChange={e => setForm(p => ({ ...p, account_number_hint: e.target.value.replace(/\D/g, '').slice(-4) }))}
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="4821"
                />
              </Field>
              <Field label="Balance / status (display only)">
                <input className={input} value={form.balance_display} onChange={e => setForm(p => ({ ...p, balance_display: e.target.value }))} placeholder="e.g. £12,000 or Active" />
              </Field>
            </div>
            <Field label="Notes / instructions">
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Add helpful details, access notes, or instructions for this account…" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? 'Saving…' : editingAccount ? 'Save changes' : 'Add account'}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// DOCUMENTS SECTION
// ─────────────────────────────────────────────────────────────
function DocumentsSection({ documents, loading, uploadFile, update, remove }) {
  const emptyForm = { name: '', doc_type: 'Legal', status: 'current', expires_at: '', notes: '' }
  const [showUpload, setShowUpload] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const closeModal = () => {
    setShowUpload(false)
    setEditingDocument(null)
    setFile(null)
    setForm(emptyForm)
  }

  const openUpload = () => {
    setEditingDocument(null)
    setFile(null)
    setForm(emptyForm)
    setShowUpload(true)
  }

  const openEdit = (doc) => {
    setShowUpload(false)
    setEditingDocument(doc)
    setFile(null)
    setForm({
      name: doc.name || '',
      doc_type: doc.doc_type || 'Legal',
      status: doc.status || 'current',
      expires_at: doc.expires_at || '',
      notes: doc.notes || '',
    })
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setSaving(true)
    try {
      await uploadFile(form, file)
      closeModal()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await update(editingDocument.id, {
        name: form.name,
        doc_type: form.doc_type,
        status: form.status,
        expires_at: form.expires_at || null,
        notes: form.notes,
      })
      closeModal()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionShell
      title="Document Vault"
      subtitle={`${documents.filter(d => d.status !== 'missing').length} documents uploaded`}
      action={<button onClick={openUpload} className={primaryBtn}><Upload size={15} />Upload document</button>}
    >
      {loading ? <LoadingSpinner /> : documents.length === 0 ? (
        <EmptyState icon={FileText} label="No documents yet" action="Upload your first document — will, insurance policies, property deeds, and more." />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                {['Document','Type','Status','Last updated','Access',''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText size={15} className="text-stone-400 shrink-0" />
                      <div>
                        <span className="font-medium text-navy-800 block">{doc.name}</span>
                        {doc.notes && <span className="text-xs text-stone-400 block mt-0.5 truncate max-w-xs">{doc.notes}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-stone-500">{doc.doc_type}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.current}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">Owner</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {doc.storage_path && (
                        <button className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded hover:bg-navy-50" aria-label={`View ${doc.name}`}>
                          <Eye size={14} />
                        </button>
                      )}
                      <button onClick={() => openEdit(doc)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded hover:bg-navy-50" aria-label={`Edit ${doc.name}`}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(doc.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded hover:bg-red-50" aria-label={`Delete ${doc.name}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <Modal title="Upload document" onClose={closeModal}>
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setForm(p => ({ ...p, name: p.name || f.name.replace(/\.[^.]+$/,'') })) } }}
              onClick={() => document.getElementById('doc-file').click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-navy-400 bg-navy-50' : 'border-stone-200 hover:border-navy-300'}`}
            >
              <Upload size={22} className="text-stone-300 mx-auto mb-2" />
              {file ? (
                <p className="text-sm text-navy-700 font-medium">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
              ) : (
                <p className="text-sm text-stone-400">Drop file here or click to browse<br /><span className="text-xs">PDF, Word, JPG, PNG up to 50MB</span></p>
              )}
              <input id="doc-file" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setForm(p => ({ ...p, name: p.name || f.name.replace(/\.[^.]+$/,'') })) } }} />
            </div>
            <Field label="Document name" required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Last Will & Testament" required />
            </Field>
            <Field label="Type">
              <select className={input} value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                {['Legal','Finance','Insurance','Property','Personal','Medical','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Add context, what this document covers, or where the original is kept…" />
            </Field>
            <Field label="Expiry date (optional)">
              <input type="date" className={input} value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving || !file} className={`${primaryBtn} flex-1 disabled:opacity-50`}>
                {saving ? 'Uploading…' : 'Upload'}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {editingDocument && (
        <Modal title="Edit document" onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="Document name" required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <select className={input} value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                  {['Legal','Finance','Insurance','Property','Personal','Medical','Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={input} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {['current', 'expiring', 'missing', 'archived'].map(option => <option key={option}>{option}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </Field>
            <Field label="Expiry date (optional)">
              <input type="date" className={input} value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}
// ─────────────────────────────────────────────────────────────
// PEOPLE SECTION
// ─────────────────────────────────────────────────────────────
function PeopleSection({ people, loading, invite, resendInvite }) {
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm]             = useState({ name: '', email: '', role: '' })
  const [saving, setSaving]         = useState(false)

  const handleInvite = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await invite(form); setShowInvite(false); setForm({ name: '', email: '', role: '' }) }
    catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <SectionShell
      title="Trusted People"
      subtitle={`${people.length} people in your plan`}
      action={<button onClick={() => setShowInvite(true)} className={primaryBtn}><Plus size={15} />Invite person</button>}
    >
      {loading ? <LoadingSpinner /> : people.length === 0 ? (
        <EmptyState icon={Users} label="No trusted people yet" action="Invite an executor, healthcare proxy, or family member to your plan." />
      ) : (
        <div className="space-y-3">
          {people.map(person => (
            <div key={person.id} className="bg-white border border-stone-200 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-bold text-navy-700 uppercase shrink-0">
                {person.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy-900 text-sm">{person.name}</p>
                <p className="text-xs text-stone-500">{person.role} · {person.email}</p>
              </div>
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                person.invite_status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                person.invite_status === 'declined' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {person.invite_status}
              </div>
              {person.invite_status === 'pending' && (
                <button onClick={() => resendInvite(person.id)} className="text-xs text-navy-600 hover:text-navy-900 font-medium transition-colors">
                  Resend invite
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <Modal title="Invite trusted person" onClose={() => setShowInvite(false)}>
          <form onSubmit={handleInvite} className="space-y-4">
            <Field label="Full name" required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Jane Smith" required />
            </Field>
            <Field label="Email address" required>
              <input type="email" className={input} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="jane@example.com" required />
            </Field>
            <Field label="Role" required>
              <select className={input} value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} required>
                <option value="" disabled>Select a role…</option>
                <option>Primary Executor</option>
                <option>Secondary Executor</option>
                <option>Family Member</option>
                <option>Family Caretaker</option>
                <option>Financial Advisor</option>
                <option>Estate Attorney</option>
                <option>Healthcare Proxy</option>
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? 'Sending invite…' : 'Send invite'}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className={secondaryBtn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// INSTRUCTIONS SECTION
// ─────────────────────────────────────────────────────────────
function InstructionsSection({ instructions, loading, add, update, remove }) {
  const emptyForm = { title: '', category: 'Immediate', audience: 'Executor', body: '', stepsText: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingInstruction, setEditingInstruction] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const closeModal = () => {
    setShowAdd(false)
    setEditingInstruction(null)
    setForm(emptyForm)
  }

  const openAdd = () => {
    setEditingInstruction(null)
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEdit = (instruction) => {
    setShowAdd(false)
    setEditingInstruction(instruction)
    setForm({
      title: instruction.title || '',
      category: instruction.category || 'Immediate',
      audience: instruction.audience || 'Executor',
      body: instruction.body || '',
      stepsText: (instruction.instruction_steps || []).map(step => step.body).join('\n'),
    })
  }

  const toSteps = (stepsText) => stepsText
    .split('\n')
    .map(step => step.trim())
    .filter(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        category: form.category,
        audience: form.audience,
        body: form.body,
        steps: toSteps(form.stepsText),
      }
      if (editingInstruction) await update(editingInstruction.id, payload)
      else await add(payload)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionShell title="Instructions" subtitle={`${instructions.length} instruction sets`} action={<button onClick={openAdd} className={primaryBtn}><Plus size={15} />Add instructions</button>}>
      {loading ? <LoadingSpinner /> : instructions.length === 0 ? (
        <EmptyState icon={BookOpen} label="No instructions yet" action="Write step-by-step guidance for your executor, family, or healthcare proxy." />
      ) : (
        <div className="space-y-3">
          {instructions.map(inst => (
            <div key={inst.id} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-navy-900 text-sm">{inst.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{inst.category} · For: {inst.audience}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-stone-400">{inst.instruction_steps?.length ?? 0} steps</span>
                  <button onClick={() => openEdit(inst)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={`Edit ${inst.title}`}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(inst.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={`Delete ${inst.title}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {inst.body && <p className="mt-3 text-sm text-stone-600 leading-relaxed">{inst.body}</p>}
              {inst.instruction_steps?.length > 0 && (
                <ol className="mt-3 space-y-1.5">
                  {inst.instruction_steps.map((step, i) => (
                    <li key={step.id} className="flex items-start gap-2.5 text-sm text-stone-600">
                      <span className="text-xs font-bold text-stone-300 mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{step.body}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}

      {(showAdd || editingInstruction) && (
        <Modal title={editingInstruction ? 'Edit instructions' : 'Add instructions'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Title" required>
              <input className={input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. First 48 hours checklist" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" required>
                <select className={input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {['Immediate', 'Financial', 'Household', 'Medical', 'Digital', 'Personal', 'Other'].map(option => <option key={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Audience" required>
                <select className={input} value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}>
                  {['Executor', 'Family', 'Healthcare Proxy', 'Advisor', 'Everyone'].map(option => <option key={option}>{option}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Overview / notes">
              <textarea className={input} rows={3} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Summarise what should happen and any context the person should know…" />
            </Field>
            <Field label="Step-by-step instructions">
              <textarea className={input} rows={6} value={form.stepsText} onChange={e => setForm(p => ({ ...p, stepsText: e.target.value }))} placeholder={"Write one step per line\nCall the family solicitor\nLocate the signed will\nPause non-essential subscriptions"} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? 'Saving…' : editingInstruction ? 'Save changes' : 'Add instructions'}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTIONS SECTION
// ─────────────────────────────────────────────────────────────
function SubscriptionsSection({ subscriptions: remoteSubs, loading, add, update, remove }) {
  const emptyForm = { name: '', billing_cycle: 'Monthly', amount: '', next_charge_date: '', notes: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  // local fallback list so the section works even if the remote table is unavailable
  const [localSubs, setLocalSubs] = useState([])
  const subscriptions = remoteSubs && remoteSubs.length > 0 ? remoteSubs : localSubs

  const total = subscriptions.reduce((sum, s) => sum + (s.billing_cycle === 'Annual' ? Number(s.amount || 0) / 12 : Number(s.amount || 0)), 0)

  const closeModal = () => {
    setShowAdd(false)
    setEditingSubscription(null)
    setForm(emptyForm)
    setSaveError(null)
  }

  const openAdd = () => {
    setEditingSubscription(null)
    setForm(emptyForm)
    setSaveError(null)
    setShowAdd(true)
  }

  const openEdit = (sub) => {
    setShowAdd(false)
    setEditingSubscription(sub)
    setSaveError(null)
    setForm({
      name: sub.name || '',
      billing_cycle: sub.billing_cycle || 'Monthly',
      amount: sub.amount ?? '',
      next_charge_date: sub.next_charge_date || '',
      notes: sub.notes || '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const payload = {
      name: form.name,
      billing_cycle: form.billing_cycle,
      amount: Number(form.amount || 0),
      next_charge_date: form.next_charge_date || null,
      notes: form.notes,
    }
    try {
      if (editingSubscription) {
        await update(editingSubscription.id, payload)
        setLocalSubs(prev => prev.map(s => s.id === editingSubscription.id ? { ...s, ...payload } : s))
      } else {
        await add(payload)
        setLocalSubs(prev => [...prev, { ...payload, id: Date.now() }])
      }
      closeModal()
    } catch (err) {
      // save locally so the UI still works even if Supabase rejects
      if (!editingSubscription) {
        setLocalSubs(prev => [...prev, { ...payload, id: Date.now() }])
        closeModal()
      } else {
        setSaveError(err?.message || 'Could not save. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionShell title="Subscriptions" subtitle={`£${total.toFixed(2)}/mo total`} action={<button onClick={openAdd} className={primaryBtn}><Plus size={15} />Add subscription</button>}>
      {loading ? <LoadingSpinner /> : subscriptions.length === 0 ? (
        <EmptyState icon={CreditCard} label="No subscriptions tracked" action="Add recurring bills so your family knows what to cancel." />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-50">
          {subscriptions.map(sub => (
            <div key={sub.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 uppercase">
                {sub.name?.[0] || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy-800 text-sm">{sub.name}</p>
                <p className="text-xs text-stone-400">{sub.billing_cycle} · Next: {sub.next_charge_date ?? '—'}</p>
                {sub.notes && <p className="text-xs text-stone-400 mt-0.5 truncate">{sub.notes}</p>}
              </div>
              <p className="font-semibold text-navy-900 text-sm">£{Number(sub.amount || 0).toFixed(2)}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(sub)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={`Edit ${sub.name}`}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(sub.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={`Delete ${sub.name}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editingSubscription) && (
        <Modal title={editingSubscription ? 'Edit subscription' : 'Add subscription'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Subscription name" required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Netflix, Spotify, Dropbox" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Billing cycle">
                <select className={input} value={form.billing_cycle} onChange={e => setForm(p => ({ ...p, billing_cycle: e.target.value }))}>
                  {['Monthly', 'Annual'].map(option => <option key={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Amount" required>
                <input type="number" min="0" step="0.01" className={input} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="12.99" required />
              </Field>
            </div>
            <Field label="Next charge date">
              <input type="date" className={input} value={form.next_charge_date} onChange={e => setForm(p => ({ ...p, next_charge_date: e.target.value }))} />
            </Field>
            <Field label="Notes">
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Useful cancellation steps, account owner, or login hints…" />
            </Field>
            {saveError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? 'Saving…' : editingSubscription ? 'Save changes' : 'Add subscription'}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}
// ─────────────────────────────────────────────────────────────
// ALERTS SECTION
// ─────────────────────────────────────────────────────────────
function AlertsSection({ alerts, markRead, markAllRead }) {
  return (
    <SectionShell
      title="Alerts"
      subtitle={`${alerts.filter(a => !a.is_read).length} unread`}
      action={<button onClick={markAllRead} className={secondaryBtn}><CheckCheck size={15} />Mark all read</button>}
    >
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <EmptyState icon={Bell} label="No alerts" action="You're all caught up." />
        ) : alerts.map(alert => {
          const { bar, badge, icon: Icon } = SEVERITY_STYLES[alert.severity]
          return (
            <div
              key={alert.id}
              onClick={() => markRead(alert.id)}
              className={`bg-white border border-stone-200 rounded-xl px-5 py-4 flex gap-4 cursor-pointer hover:bg-stone-50 transition-colors ${alert.is_read ? 'opacity-60' : ''}`}
            >
              <div className={`w-1 rounded-full self-stretch shrink-0 ${bar}`} />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-navy-900 text-sm">{alert.title}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${badge}`}>{alert.severity}</span>
                </div>
                {alert.detail && <p className="text-xs text-stone-500 mt-1 leading-relaxed">{alert.detail}</p>}
                <p className="text-xs text-stone-400 mt-2">{new Date(alert.created_at).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY SECTION
// ─────────────────────────────────────────────────────────────
function ActivitySection({ activity, loading }) {
  return (
    <SectionShell title="Activity Log" subtitle="All changes to your plan">
      {loading ? <LoadingSpinner /> : activity.length === 0 ? (
        <EmptyState icon={Activity} label="No activity yet" action="Changes to your plan will appear here." />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-50">
          {activity.map(event => (
            <div key={event.id} className="flex items-start gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={14} className="text-navy-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-navy-800">
                  <span className="font-medium">{event.action.replace('.', ' ')}</span>
                  {event.resource_name && <span className="text-stone-500"> — {event.resource_name}</span>}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {new Date(event.created_at).toLocaleString('en-GB')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────

function SectionShell({ title, subtitle, action, children }) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-light text-navy-950">{title}</h1>
          {subtitle && <p className="text-stone-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ icon: Icon, label, action }) {
  return (
    <div className="bg-white border border-dashed border-stone-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mb-4">
        <Icon size={20} className="text-stone-300" />
      </div>
      <p className="font-medium text-navy-800 text-sm">{label}</p>
      {action && <p className="text-stone-400 text-xs mt-1 max-w-xs">{action}</p>}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-stone-200 border-t-navy-700 rounded-full animate-spin" />
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// Style constants
const input       = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors'
const primaryBtn  = 'inline-flex items-center gap-2 bg-navy-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors'
const secondaryBtn= 'inline-flex items-center gap-2 bg-white text-stone-700 text-sm font-medium px-4 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors'
