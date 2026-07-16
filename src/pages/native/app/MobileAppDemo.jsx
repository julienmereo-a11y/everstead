import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { computeReadiness } from './readiness'
import { ACCOUNT_CATEGORY_ORDER, docChip, personAccessChip, initialsOf, activityText, relativeTime } from './helpers'
import { HomeIcon, AccountsIcon, VaultIcon, PlanIcon, FamilyIcon, MoreIcon } from './icons'
import HomeScreen from './screens/HomeScreen'
import AccountsScreen from './screens/AccountsScreen'
import VaultScreen from './screens/VaultScreen'
import PlanScreen from './screens/PlanScreen'
import FamilyScreen from './screens/FamilyScreen'
import MoreScreen from './screens/MoreScreen'
import AboutMeScreen from './screens/AboutMeScreen'
import MessagesScreen from './screens/MessagesScreen'
import InstructionsScreen from './screens/InstructionsScreen'
import WishesScreen from './screens/WishesScreen'
import SubscriptionsScreen from './screens/SubscriptionsScreen'
import AlertsScreen from './screens/AlertsScreen'
import ActivityScreen from './screens/ActivityScreen'
import AssistantScreen from './screens/AssistantScreen'
import ResourcesScreen from './screens/ResourcesScreen'
import SettingsScreen from './screens/SettingsScreen'
import AddAccountSheet from './sheets/AddAccountSheet'
import UploadSheet from './sheets/UploadSheet'
import InviteSheet from './sheets/InviteSheet'
import LimitSheet from './sheets/LimitSheet'
import MobilePlanSelect from './MobilePlanSelect'
import SecuritySetup from './SecuritySetup'
import { isAtLimit } from '../../../lib/planLimits'
import { haptic } from '../../../lib/haptics'

// Demo mode — the full connected experience (5 tabs + the "More" hub and every
// section) rendered with sample data and NO backend, so it previews fully
// populated without a login or any writes to production. Reached via
// /mobile?demo=1. Screens read demo data / local mutators from the `app` object
// when `app.demo` is true; otherwise they use their real hooks.

const RING_CIRCUMFERENCE = 226.2
const TABS = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'accounts', label: 'Accounts', Icon: AccountsIcon },
  { key: 'vault', label: 'Vault', Icon: VaultIcon },
  { key: 'plan', label: 'Plan', Icon: PlanIcon },
  { key: 'family', label: 'Family', Icon: FamilyIcon },
  { key: 'more', label: 'More', Icon: MoreIcon },
]
const MAIN_TAB_KEYS = ['home', 'accounts', 'vault', 'plan', 'family']
const UP_NEXT = {
  accounts: { screen: 'accounts', label: 'Add your accounts' },
  documents: { screen: 'vault', label: 'Upload key documents' },
  people: { screen: 'family', label: 'Invite a trusted contact' },
  instructions: { screen: 'plan', label: 'Write instructions for your family' },
}
const SECONDARY = {
  more: MoreScreen, aboutme: AboutMeScreen, messages: MessagesScreen,
  instructions: InstructionsScreen, wishes: WishesScreen, subscriptions: SubscriptionsScreen,
  alerts: AlertsScreen, activity: ActivityScreen, assistant: AssistantScreen,
  resources: ResourcesScreen, settings: SettingsScreen,
}

const DEMO_PROFILE = {
  id: 'demo', full_name: 'Eleanor Whitmore', email: 'eleanor@example.com', plan: 'family',
  subscription_status: 'active', phone: '', referral_code: 'ELEANOR', ai_features_enabled: true,
}
const ago = (ms) => new Date(Date.now() - ms).toISOString()
const DEMO = {
  accounts: [
    { id: 1, institution: 'Monzo', account_type: 'Current account', category: 'Banking', account_number_hint: '2841' },
    { id: 2, institution: 'NatWest', account_type: 'Cash ISA', category: 'Banking', account_number_hint: '7710' },
    { id: 3, institution: 'Aviva', account_type: 'Workplace pension', category: 'Retirement' },
    { id: 4, institution: 'Vanguard', account_type: 'Stocks & Shares ISA', category: 'Investment' },
    { id: 5, institution: 'Legal & General', account_type: 'Life insurance · joint', category: 'Insurance' },
  ],
  documents: [
    { id: 1, name: 'Will', doc_type: 'Legal', notes: 'Updated March 2026', status: 'current' },
    { id: 2, name: 'Property deeds', doc_type: 'Property', notes: '14 Elm Road, Bristol', status: 'current' },
    { id: 3, name: 'Life insurance policy', doc_type: 'Insurance', notes: 'Legal & General', status: 'current' },
    { id: 4, name: 'Passports', doc_type: 'Personal', notes: 'Eleanor · expires Nov 2026', status: 'expiring' },
  ],
  people: [
    { id: 1, name: 'Tom Whitmore', role: 'Partner', invite_status: 'accepted', access_grants: { accessTiming: 'always' } },
    { id: 2, name: 'Priya Shah', role: 'Sister · Executor', invite_status: 'accepted', access_grants: { accessTiming: 'emergency_only' } },
  ],
  instructions: [
    { id: 1, title: 'First 48 hours', category: 'Immediate', audience: 'Executor', body: 'What to do straight away.', instruction_steps: [{ id: 1, body: 'Contact the funeral director', step_order: 0 }, { id: 2, body: 'Notify the GP surgery', step_order: 1 }, { id: 3, body: 'Register the death within 5 days', step_order: 2 }] },
  ],
  wishes: [
    { id: 1, title: 'My funeral wishes', category: 'Funeral', body: 'A simple woodland burial, no black, and my favourite hymns.' },
  ],
  subscriptions: [
    { id: 1, name: 'Netflix', amount: 10.99, billing_cycle: 'Monthly' },
    { id: 2, name: 'Octopus Energy', amount: 148, billing_cycle: 'Monthly' },
    { id: 3, name: 'Amazon Prime', amount: 95, billing_cycle: 'Annual' },
  ],
  alerts: [
    { id: 1, title: 'Passport expires soon', detail: "Eleanor's passport expires in November 2026.", severity: 'warning', is_read: false, created_at: ago(2 * 86400000) },
    { id: 2, title: 'Add a Lasting Power of Attorney', detail: 'Everstead suggests adding this next.', severity: 'info', is_read: false, created_at: ago(5 * 86400000) },
  ],
  messages: [
    { id: 1, title: 'For your wedding day', recipient_name: 'Sophie', recipient_role: 'Daughter', type: 'note', content: 'My darling Sophie — if you are reading this…', released: false },
  ],
  aboutMe: {
    full_name: 'Eleanor Whitmore', date_of_birth: '1958-04-12',
    passions: 'Gardening, choral singing, and long walks on the Mendips.',
    reflections: 'Be kind, plant trees, and call your mother.',
    life_events: [{ year: '1982', description: 'Married Tom in Bristol' }, { year: '1986', description: 'Sophie was born' }],
    avatar_url: '',
  },
  activity: [
    { id: 1, action: 'document.uploaded', resource_name: 'Life insurance policy', created_at: ago(2 * 86400000) },
    { id: 2, action: 'account.updated', resource_name: 'Vanguard — Stocks & Shares ISA', created_at: ago(5 * 86400000) },
    { id: 3, action: 'person.invited', resource_name: 'Priya Shah', created_at: ago(7 * 86400000) },
  ],
}

export default function MobileAppDemo() {
  const [screen, setScreen] = useState('home')
  const [d, setD] = useState(DEMO)
  const [sheet, setSheet] = useState(null)
  const [sheetPrefill, setSheetPrefill] = useState(null)
  const [limitNudge, setLimitNudge] = useState(null)
  const [toast, setToast] = useState(null)
  const bodyRef = useRef(null)
  const toastTimer = useRef(null)
  const prevScore = useRef(null)
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const go = useCallback((s) => { setSheet(null); setScreen(s); const b = bodyRef.current; if (b) b.scrollTop = 0 }, [])
  const say = useCallback((m, feel = 'light') => { if (feel) haptic[feel]?.(); clearTimeout(toastTimer.current); setToast(m); toastTimer.current = setTimeout(() => setToast(null), 2600) }, [])
  const closeSheet = useCallback(() => { setSheet(null); setSheetPrefill(null) }, [])

  const demoAppend = useCallback((key, row) => {
    const withId = { id: Date.now() + Math.random(), ...row }
    setD(prev => ({ ...prev, [key]: [withId, ...(prev[key] || [])] }))
    return withId
  }, [])
  const demoUpdate = useCallback((key, id, changes) => {
    setD(prev => ({ ...prev, [key]: prev[key].map(x => x.id === id ? { ...x, ...changes } : x) }))
  }, [])
  const demoSetAboutMe = useCallback((v) => setD(prev => ({ ...prev, aboutMe: { ...prev.aboutMe, ...v } })), [])

  const logActivity = useCallback((action, resource_name) => {
    setD(prev => ({ ...prev, activity: [{ id: Date.now(), action, resource_name, created_at: new Date().toISOString() }, ...prev.activity] }))
  }, [])

  const addAccount = useCallback(async ({ institution, account_type, category }) => {
    demoAppend('accounts', { institution, account_type, category }); logActivity('account.created', institution)
    closeSheet(); say(`${institution} added to your accounts`)
  }, [demoAppend, logActivity, closeSheet, say])
  const uploadDocument = useCallback(async ({ name }) => {
    demoAppend('documents', { name, doc_type: 'Personal', notes: 'Uploaded just now', status: 'current' }); logActivity('document.uploaded', name)
    closeSheet(); say(`${name} added to your vault`)
  }, [demoAppend, logActivity, closeSheet, say])
  const invitePerson = useCallback(async ({ name, role, accessAreas, accessTiming }) => {
    demoAppend('people', { name, role, invite_status: 'pending', access_grants: { accessAreas: accessAreas || [], accountCategories: [], documentTypes: [], accessTiming: accessTiming || 'always' } }); logActivity('person.invited', name)
    closeSheet(); say(`Invite sent to ${name}`)
  }, [demoAppend, logActivity, closeSheet, say])
  const onTapAccount = useCallback((a) => say(`${a.name} — detail view coming soon`), [say])

  const onSignOut = useCallback(() => { window.location.href = '/mobile' }, [])

  const app = useMemo(() => {
    const { score, stats } = computeReadiness({ accounts: d.accounts, documents: d.documents, people: d.people, instructions: d.instructions, isFamilyPlus: true })
    const completeAreas = stats.filter(s => s.value >= s.target).length
    const now = new Date()
    const hour = now.getHours()

    const accGroups = ACCOUNT_CATEGORY_ORDER.map(cat => ({
      cat, items: d.accounts.filter(a => a.category === cat).map(a => ({
        id: a.id, name: a.institution,
        detail: [a.account_type, a.account_number_hint ? `··${a.account_number_hint}` : ''].filter(Boolean).join(' '),
        letter: (a.institution || '?')[0].toUpperCase(),
      })),
    })).filter(g => g.items.length)

    const docsV = d.documents.map(x => { const c = docChip(x.status); return { id: x.id, name: x.name, detail: x.notes || x.doc_type, status: c.label, chipCls: c.cls } })
    const ownerRow = { id: 'owner', name: DEMO_PROFILE.full_name, rel: 'You · Owner', access: 'Full access', chipCls: 'chip-sage', initials: initialsOf(DEMO_PROFILE.full_name) }
    const memberRows = d.people.map(m => { const c = personAccessChip(m); return { id: m.id, name: m.name, rel: m.role, access: c.label, chipCls: c.cls, initials: initialsOf(m.name) } })
    const upNext = stats.filter(s => s.value < s.target).slice(0, 2).map(s => ({ key: s.key, label: UP_NEXT[s.key]?.label || s.label, detail: `${s.value} of ${s.target}`, screen: UP_NEXT[s.key]?.screen || 'plan' }))
    const readinessRows = stats.map(s => ({ key: s.key, label: s.label, detail: `${Math.min(s.value, s.target)} of ${s.target}`, done: s.value >= s.target, screen: UP_NEXT[s.key]?.screen || 'plan' }))

    const freeCapped = (key, count) => DEMO_PROFILE.plan === 'free' && isAtLimit('free', key, count)

    return {
      demo: true, profile: DEMO_PROFILE, demoData: d, demoAppend, demoUpdate, demoSetAboutMe, onSignOut,
      go, say, score,
      firstName: DEMO_PROFILE.full_name.split(' ')[0], initials: initialsOf(DEMO_PROFILE.full_name),
      greeting: hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening',
      dateLabel: now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      scorePct: score + '%', ringOff: RING_CIRCUMFERENCE * (1 - score / 100), ringCircumference: RING_CIRCUMFERENCE,
      scoreTxt: `${completeAreas} of ${stats.length} areas complete`,
      planSub: `${score}% ready · ${stats.length - completeAreas} steps left`,
      upNext, upEmpty: upNext.length === 0, readinessRows,
      accCount: d.accounts.length, docCount: d.documents.length, memCount: d.people.length + 1,
      accGroups, accSub: `${d.accounts.length} accounts across ${accGroups.length} categories`,
      docsV, vaultSub: `${d.documents.length} documents in your vault`,
      lpaMissing: !d.documents.some(x => /power of attorney|lpa/i.test(x.name || '')),
      membersV: [ownerRow, ...memberRows], famSub: `${d.people.length + 1} people in your household`,
      activity: d.activity.map(r => ({ id: r.id, text: activityText(r), when: relativeTime(r.created_at) })),
      openAdd: () => freeCapped('maxAccounts', d.accounts.length)
        ? (haptic.warning(), setLimitNudge({ noun: 'account' }), setSheet('limit'))
        : setSheet('add'),
      openUpload: () => {
        if (freeCapped('maxDocuments', d.documents.length)) { haptic.warning(); setLimitNudge({ noun: 'document' }); setSheet('limit'); return }
        setSheetPrefill(null); setSheet('upload')
      },
      openLpa: () => {
        if (freeCapped('maxDocuments', d.documents.length)) { haptic.warning(); setLimitNudge({ noun: 'document' }); setSheet('limit'); return }
        setSheetPrefill({ name: 'Lasting Power of Attorney' }); setSheet('upload')
      },
      openInvite: () => freeCapped('trustedPeople', d.people.length)
        ? (haptic.warning(), setLimitNudge({ noun: 'trusted contact' }), setSheet('limit'))
        : setSheet('invite'),
      closeSheet, sheetPrefill,
      addAccount, uploadDocument, invitePerson, onTapAccount,
    }
  }, [d, go, say, closeSheet, sheetPrefill, demoAppend, demoUpdate, demoSetAboutMe, onSignOut, addAccount, uploadDocument, invitePerson, onTapAccount])

  // Milestone moments — same as the live shell: celebrate crossing 25/50/75/100%
  // readiness during the session (first computed score only primes the baseline).
  useEffect(() => {
    const s = app.score
    if (prevScore.current === null) { prevScore.current = s; return }
    if (s > prevScore.current) {
      const crossed = [100, 75, 50, 25].find(m => prevScore.current < m && s >= m)
      // Delayed so the action's own toast ("Instruction saved") shows first, then
      // the celebration follows — instead of the two racing for the same slot.
      if (crossed) setTimeout(() => say(crossed === 100 ? 'Your plan is 100% ready — wonderful work' : `Milestone reached — ${crossed}% ready`, 'success'), 1400)
    }
    prevScore.current = s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.score])

  const Secondary = SECONDARY[screen]

  if (screen === 'upgrade') {
    return (
      <div className="evst-app">
        <div className="sbcover sbcover-dark" />
        <MobilePlanSelect demo onBack={() => go('more')} onSubscribed={() => { go('home'); say('Welcome to Everstead+') }} />
      </div>
    )
  }

  // Mirrors MobileAppAuthed's 'security' branch so Settings' app-lock buttons
  // (native-only UI, but reachable if demo ever runs on-device) never dead-end.
  if (screen === 'security') {
    return (
      <div className="evst-app">
        <SecuritySetup onDone={() => { go('settings'); say('App lock updated') }} />
      </div>
    )
  }

  return (
    <div className="evst-app">
      <div className={`sbcover ${screen === 'home' ? 'sbcover-dark' : ''}`} />
      <div className="body" ref={bodyRef}>
        {screen === 'home' && <HomeScreen app={app} />}
        {screen === 'accounts' && <AccountsScreen app={app} />}
        {screen === 'vault' && <VaultScreen app={app} />}
        {screen === 'plan' && <PlanScreen app={app} />}
        {screen === 'family' && <FamilyScreen app={app} />}
        {Secondary && <Secondary app={app} />}
      </div>
      <nav className="tabbar">
        {TABS.map(({ key, label, Icon }) => {
          const on = key === 'more' ? !MAIN_TAB_KEYS.includes(screen) : screen === key
          return <button key={key} className={`tab ${on ? 'on' : ''}`} onClick={() => { haptic.tick(); go(key) }}><Icon />{label}</button>
        })}
      </nav>
      {sheet && (
        <div className="sheet-wrap">
          <div className="scrim" onClick={closeSheet} />
          <div className="sheet">
            <div className="grab" />
            {sheet === 'add' && <AddAccountSheet app={app} />}
            {sheet === 'upload' && <UploadSheet app={app} />}
            {sheet === 'invite' && <InviteSheet app={app} />}
            {sheet === 'limit' && <LimitSheet nudge={limitNudge} onUpgrade={() => { closeSheet(); go('upgrade') }} onClose={closeSheet} />}
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
