import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n'
import { useAuth } from '../../../contexts/AuthContext'
import {
  useAccounts, useDocuments, usePeople, useInstructions, useActivityLog,
} from '../../../hooks/useData'
import { isNative } from '../../../lib/platform'
import { computeReadiness } from './readiness'
import {
  ACCOUNT_CATEGORY_ORDER, docChip, personAccessChip, initialsOf, relativeTime, activityText, docTypeLabel, dateLocale } from './helpers'
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
import { syncReminders, maybeAskNotificationPermission, registerForPush } from '../../../lib/notifications'

// Secondary ("More") screens are self-contained — each loads its own data only
// when opened. Keyed by the screen id used in navigation.
const SECONDARY = {
  more: MoreScreen, aboutme: AboutMeScreen, messages: MessagesScreen,
  instructions: InstructionsScreen, wishes: WishesScreen, subscriptions: SubscriptionsScreen,
  alerts: AlertsScreen, activity: ActivityScreen, assistant: AssistantScreen,
  resources: ResourcesScreen, settings: SettingsScreen,
}

const RING_CIRCUMFERENCE = 226.2

const TABS = [
  { key: 'home',     Icon: HomeIcon },
  { key: 'accounts', Icon: AccountsIcon },
  { key: 'vault',    Icon: VaultIcon },
  { key: 'plan',     Icon: PlanIcon },
  { key: 'family',   Icon: FamilyIcon },
  { key: 'more',     Icon: MoreIcon },
]

// The five primary tabs. The "More" tab stays highlighted for the hub itself and
// any of its secondary screens (Settings, Messages, …), so drilling in keeps a
// sensible active state in the bar.
const MAIN_TAB_KEYS = ['home', 'accounts', 'vault', 'plan', 'family']

const UP_NEXT = {
  accounts:     { screen: 'accounts', labelKey: 'shell.upAccounts' },
  documents:    { screen: 'vault',    labelKey: 'shell.upDocuments' },
  people:       { screen: 'family',   labelKey: 'shell.upPeople' },
  instructions: { screen: 'plan',     labelKey: 'shell.upInstructions' },
}

// Infer doc_type from the document name. Values MUST be from the DB CHECK list
// (Legal, Finance, Insurance, Property, Medical, Personal, Other) and should
// categorise the way the website's AI scan does, so a doc uploaded on the phone
// files under the same type the web shows/filters by.
function inferDocType(name) {
  if (/will|power of attorney|lpa|probate|trust|solicitor/i.test(name)) return 'Legal'
  if (/insurance|policy|cover/i.test(name)) return 'Insurance'
  if (/pension|bank|statement|isa|investment|savings|tax|mortgage|loan/i.test(name)) return 'Finance'
  if (/deed|property|lease|tenancy|title/i.test(name)) return 'Property'
  if (/medical|health|gp|prescription|nhs/i.test(name)) return 'Medical'
  return 'Personal'
}

export default function MobileAppAuthed() {
  const { t, i18n } = useTranslation('mobile')
  const { profile, refreshProfile } = useAuth()
  const accounts = useAccounts()
  const documents = useDocuments()
  const people = usePeople()
  const instructions = useInstructions()
  const activityLog = useActivityLog(20)

  const [screen, setScreen] = useState('home')
  const [sheet, setSheet] = useState(null)
  const [sheetPrefill, setSheetPrefill] = useState(null)
  const [limitNudge, setLimitNudge] = useState(null)
  const [toast, setToast] = useState(null)
  const bodyRef = useRef(null)
  const toastTimer = useRef(null)
  const prevScore = useRef(null)
  const milestoneTimer = useRef(null)
  useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(milestoneTimer.current) }, [])

  const go = useCallback((s) => {
    setSheet(null)
    setScreen(s)
    const b = bodyRef.current
    if (b) b.scrollTop = 0
  }, [])

  // Toast + a physical confirmation. `feel` picks the haptic ('light' default,
  // 'success' for milestone moments, 'error' for failures, null for none).
  // Errors look different (red toast), feel different (error haptic) and stay
  // up longer — a failure must never be mistakable for a confirmation.
  const say = useCallback((m, feel = 'light') => {
    if (feel) haptic[feel]?.()
    clearTimeout(toastTimer.current)
    setToast({ text: m, tone: feel === 'error' ? 'error' : 'ok' })
    toastTimer.current = setTimeout(() => setToast(null), feel === 'error' ? 4200 : 2600)
  }, [])

  const closeSheet = useCallback(() => { setSheet(null); setSheetPrefill(null) }, [])

  const acc = accounts.data || []
  const docs = documents.data || []
  const ppl = people.data || []
  const instr = instructions.data || []
  const isFamilyPlus = profile?.plan === 'family'

  const loading = accounts.loading || documents.loading || people.loading || instructions.loading

  // ── Actions (write to real backend) ──────────────────────────
  // Latest data, read at call time. `offerNotifications` fires right after a write,
  // when the captured `documents.data` is still the PRE-write array — scheduling from
  // it would miss the very document just uploaded. A ref always sees the fresh list.
  const liveData = useRef({ profile: null, documents: [] })
  liveData.current = { profile, documents: documents.data || [] }

  // Reschedule every on-device reminder from current data. Exposed on `app` so
  // Settings' "Enable" button can schedule immediately after permission is granted
  // (otherwise nothing would run until the next cold start).
  const refreshReminders = useCallback(() => {
    const { profile: p, documents: docs } = liveData.current
    if (p) syncReminders({ userId: p.id, profile: p, documents: docs })
  }, [])

  // Any first meaningful write is a natural moment to offer notifications — not
  // only document uploads (a free user at their doc cap would otherwise never see
  // the prompt). One-time; subsequent calls are no-ops.
  const offerNotifications = useCallback(() => {
    maybeAskNotificationPermission().then(granted => {
      if (granted) { refreshReminders(); registerForPush() }
    })
  }, [refreshReminders])

  const addAccount = useCallback(async ({ institution, account_type, category }) => {
    try {
      await accounts.add({ institution, account_type, category })
      closeSheet()
      say(t('shell.accountAdded', { name: institution }))
      offerNotifications()
    } catch { say(t('shell.addAccountFailed'), 'error') }
  }, [accounts, closeSheet, say, offerNotifications])

  const uploadDocument = useCallback(async ({ name, file, expires_at }) => {
    try {
      await documents.uploadFile({ name, doc_type: inferDocType(name), status: 'current', expires_at: expires_at || null }, file)
      closeSheet()
      say(/power of attorney|lpa|mandat de protection/i.test(name) ? t('shell.docSaved', { name }) : t('shell.docAdded', { name }))
      offerNotifications()
    } catch { say(t('shell.uploadFailed'), 'error') }
  }, [documents, closeSheet, say, offerNotifications])

  const invitePerson = useCallback(async ({ name, email, role, accessAreas, accessTiming }) => {
    try {
      const person = await people.invite({
        name, email, role,
        accessAreas: accessAreas || [],
        accountCategories: [],
        documentTypes: [],
        accessTiming: accessTiming || 'always',
      })
      closeSheet()
      // Don't claim "sent" if the email actually failed — the row exists either way.
      say(person?.emailSent === false
        ? t('shell.inviteNoEmail', { name })
        : t('shell.inviteSent', { name }))
      offerNotifications()
    } catch { say(t('shell.inviteFailed'), 'error') }
  }, [people, closeSheet, say, offerNotifications])

  // Refetch on app resume: data edited on the website (or an invite accepted)
  // otherwise stays stale until a cold start. Web preview (/mobile) skips this.
  useEffect(() => {
    if (!isNative()) return
    let handle
    ;(async () => {
      try {
        const { App } = await import('@capacitor/app')
        handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) return
          accounts.refetch?.(); documents.refetch?.(); people.refetch?.(); instructions.refetch?.(); activityLog.refetch?.()
          refreshProfile?.()
        })
      } catch { /* listener is a nicety, never block the app */ }
    })()
    return () => { handle?.remove?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Inputs low in a bottom sheet can sit under the iOS keyboard (WKWebView
  // doesn't resize the viewport). One delegated listener covers every sheet.
  useEffect(() => {
    const onFocusIn = (e) => {
      if (!e.target.closest?.('.sheet')) return
      setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch {} }, 250)
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  // ── Derived values ───────────────────────────────────────────
  const app = useMemo(() => {
    const { score, stats } = computeReadiness({
      accounts: acc, documents: docs, people: ppl, instructions: instr, isFamilyPlus,
    })
    const completeAreas = stats.filter(s => s.value >= s.target).length
    // No fallback name: '' makes HomeScreen greet with just "Good morning." /
    // "Bonjour." — French has no natural equivalent of the English "there".
    const first = (profile?.full_name || '').trim().split(/\s+/)[0] || ''
    const now = new Date()
    const hour = now.getHours()

    const accGroups = ACCOUNT_CATEGORY_ORDER.map(cat => ({
      cat,
      items: acc.filter(a => a.category === cat).map(a => ({
        id: a.id,
        name: a.institution,
        detail: [a.account_type, a.account_number_hint ? `··${a.account_number_hint}` : ''].filter(Boolean).join(' '),
        letter: (a.institution || '?')[0].toUpperCase(),
      })),
    })).filter(g => g.items.length)

    const docsV = docs.map(d => {
      const chip = docChip(d.status)
      const detail = d.notes || docTypeLabel(d.doc_type) || (d.expires_at ? t('shell.expires', { date: new Date(d.expires_at).toLocaleDateString(dateLocale(), { month: 'short', year: 'numeric' }) }) : t('shell.uploaded'))
      return { id: d.id, name: d.name, detail, status: chip.label, chipCls: chip.cls }
    })

    const ownerRow = {
      id: 'owner',
      name: profile?.full_name || t('shell.youRow'),
      rel: t('shell.youOwner'),
      access: t('shell.fullAccess'),
      chipCls: 'chip-sage',
      initials: initialsOf(profile?.full_name || t('shell.youRow')),
    }
    const memberRows = ppl.map(m => {
      const chip = personAccessChip(m)
      return { id: m.id, name: m.name, rel: m.role || t('shell.trustedContact'), access: chip.label, chipCls: chip.cls, initials: initialsOf(m.name) }
    })

    const upNext = stats.filter(s => s.value < s.target).slice(0, 2).map(s => ({
      key: s.key,
      label: UP_NEXT[s.key] ? t(UP_NEXT[s.key].labelKey) : s.label,
      detail: t('shell.ofTarget', { value: s.value, target: s.target }),
      screen: UP_NEXT[s.key]?.screen || 'plan',
    }))

    const readinessRows = stats.map(s => ({
      key: s.key,
      label: s.label,
      detail: t('shell.ofTarget', { value: Math.min(s.value, s.target), target: s.target }),
      done: s.value >= s.target,
      screen: UP_NEXT[s.key]?.screen || 'plan',
    }))

    const isFreeCapped = (key, count) => profile?.plan === 'free' && isAtLimit('free', key, count)

    return {
      go, say, score, refreshReminders,
      // identity
      firstName: first,
      initials: initialsOf(profile?.full_name || 'E'),
      greeting: hour < 12 ? t('shell.morning') : hour < 18 ? t('shell.afternoon') : t('shell.evening'),
      dateLabel: now.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' }),
      // score
      scorePct: score + '%',
      ringOff: RING_CIRCUMFERENCE * (1 - score / 100),
      ringCircumference: RING_CIRCUMFERENCE,
      scoreTxt: t('shell.areasComplete', { count: completeAreas, target: stats.length }),
      planSub: t('shell.planSub', { score, steps: stats.length - completeAreas }),
      upNext,
      upEmpty: upNext.length === 0,
      readinessRows,
      // counts
      accCount: acc.length,
      docCount: docs.length,
      memCount: ppl.length + 1,
      // lists
      accGroups,
      accSub: `${t('shell.accCount', { count: acc.length })} ${t('shell.acrossCats', { count: accGroups.length })}`,
      docsV,
      vaultSub: t('shell.vaultSub', { count: docs.length }),
      lpaMissing: !docs.some(d => /power of attorney|lpa|mandat de protection/i.test(d.name || '')),
      membersV: [ownerRow, ...memberRows],
      famSub: t('shell.famSub', { count: ppl.length + 1 }),
      activity: (activityLog.data || []).map(r => ({ id: r.id, text: activityText(r), when: relativeTime(r.created_at) })),
      // sheet actions — the free tier is capped at 5 accounts / 5 documents / 3 trusted
      // contact (DB-enforced). Intercept a capped FREE user with an upgrade nudge
      // instead of an add sheet that RLS would reject. Limit keys are the ones in
      // PLANS[plan].limits (maxAccounts / maxDocuments / trustedPeople). Only nudge on
      // free, so the "your free plan includes 1…" copy is always accurate.
      openAdd: () => isFreeCapped('maxAccounts', acc.length)
        ? (haptic.warning(), setLimitNudge({ noun: 'account' }), setSheet('limit'))
        : setSheet('add'),
      openUpload: () => {
        if (isFreeCapped('maxDocuments', docs.length)) { haptic.warning(); setLimitNudge({ noun: 'document' }); setSheet('limit'); return }
        setSheetPrefill(null); setSheet('upload')
      },
      openLpa: () => {
        if (isFreeCapped('maxDocuments', docs.length)) { haptic.warning(); setLimitNudge({ noun: 'document' }); setSheet('limit'); return }
        setSheetPrefill({ name: i18n.language === 'fr' ? 'Mandat de protection future' : 'Lasting Power of Attorney' }); setSheet('upload')
      },
      openInvite: () => isFreeCapped('trustedPeople', ppl.length)
        ? (haptic.warning(), setLimitNudge({ noun: 'trusted contact' }), setSheet('limit'))
        : setSheet('invite'),
      closeSheet,
      sheetPrefill,
      addAccount, uploadDocument, invitePerson,
    }
  // i18n.language: every derived string above must recompute when the language flips.
  }, [acc, docs, ppl, instr, isFamilyPlus, profile, activityLog.data, go, say, closeSheet, sheetPrefill, addAccount, uploadDocument, invitePerson, refreshReminders, t, i18n.language])

  // Keep on-device reminders (document expiry, annual review, birthday, vault
  // nudge) in step with live data. No-op on web / without permission.
  useEffect(() => {
    if (!profile || loading) return
    syncReminders({ userId: profile.id, profile, documents: docs })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, documents.data, loading])

  // Phase B: keep this device registered for event pushes (invite accepted, new
  // alerts). Idempotent; silently inert until permission + push setup exist.
  useEffect(() => {
    if (profile?.id) registerForPush()
  }, [profile?.id])

  // Milestone moments — celebrate crossing 25/50/75/100% readiness during THIS
  // session. The first computed score only primes the baseline, so opening an
  // already-complete account never triggers a stray celebration.
  useEffect(() => {
    if (loading) return
    const s = app.score
    if (prevScore.current === null) { prevScore.current = s; return }
    if (s > prevScore.current) {
      const crossed = [100, 75, 50, 25].find(m => prevScore.current < m && s >= m)
      // Delayed so the action's own toast ("X added to your vault") shows first,
      // then the celebration follows — instead of the two racing for the same slot.
      // Tracked in a ref so signing out mid-delay doesn't toast an unmounted tree.
      if (crossed) {
        clearTimeout(milestoneTimer.current)
        milestoneTimer.current = setTimeout(
          () => say(crossed === 100 ? t('shell.milestone100') : t('shell.milestone', { pct: crossed }), 'success'),
          1400,
        )
      }
    }
    prevScore.current = s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.score, loading])

  // Upgrade to Everstead+ — a full-screen in-app screen (no tab bar), reached from
  // Settings or a limit nudge. On success, refresh the profile so the new plan is
  // reflected, then drop the user back on Home.
  if (screen === 'upgrade') {
    return (
      <>
        {/* The paywall scrolls (.ob with overflow auto) — keep the status-bar zone
            opaque so content doesn't ride up behind the clock. */}
        <div className="sbcover sbcover-dark" />
        <MobilePlanSelect
          onBack={() => go('more')}
          onSubscribed={async () => {
          // plan flips to 'family' only when RevenueCat's WEBHOOK lands — often
          // several seconds after purchasePackage() resolves. Don't announce
          // success before it's true, and poll long enough for slow webhooks
          // (the old 6s window routinely lost the race, so a paying user kept
          // seeing free-tier limit nudges until a restart).
          go('home'); say(t('shell.upgradeProcessing'))
          for (let i = 0; i < 15; i++) {
            const p = await refreshProfile?.()
            if (p?.plan && p.plan !== 'free') { say(t('shell.upgradeWelcome'), 'success'); return }
            await new Promise(r => setTimeout(r, 2000))
          }
          say(t('shell.upgradeStillProcessing'))
        }}
        />
      </>
    )
  }

  // Set / change the app-lock passcode, reached from Settings. Full-screen (no tab
  // bar); returns to Settings when done or skipped.
  if (screen === 'security') {
    return <SecuritySetup onDone={(changed) => { go('settings'); if (changed) say(t('shell.lockUpdated')) }} />
  }

  return (
    <>
      <div className={`sbcover ${screen === 'home' ? 'sbcover-dark' : ''}`} />
      <div className="body" ref={bodyRef}>
        {loading ? (
          <div className="f1 fx ac jc" style={{ minHeight: 300 }}>
            <div style={{ width: 32, height: 32, border: '2px solid var(--color-stone-200)', borderTopColor: 'var(--color-navy-800)', borderRadius: '999px', animation: 'evstSpin 0.8s linear infinite' }} />
          </div>
        ) : (
          (() => {
            if (screen === 'home') return <HomeScreen app={app} />
            if (screen === 'accounts') return <AccountsScreen app={app} />
            if (screen === 'vault') return <VaultScreen app={app} />
            if (screen === 'plan') return <PlanScreen app={app} />
            if (screen === 'family') return <FamilyScreen app={app} />
            const Sec = SECONDARY[screen]
            return Sec ? <Sec app={app} /> : <HomeScreen app={app} />
          })()
        )}
      </div>

      <nav className="tabbar">
        {TABS.map(({ key, Icon }) => {
          const on = key === 'more' ? !MAIN_TAB_KEYS.includes(screen) : screen === key
          return (
            <button key={key} className={`tab ${on ? 'on' : ''}`} onClick={() => { haptic.tick(); go(key) }}>
              <Icon />{t('tabs.' + key)}
            </button>
          )
        })}
      </nav>

      {sheet && (
        <div className="sheet-wrap">
          <div className="scrim" onClick={closeSheet} />
          <div className="sheet">
            <button className="grab" aria-label="Close" onClick={() => closeSheet()} style={{ display: 'block', border: 0, cursor: 'pointer', padding: 10, margin: '-10px auto 4px', background: 'none' }}><span style={{ display: 'block', width: 36, height: 4, borderRadius: 99, background: 'var(--color-stone-300)' }} /></button>
            {sheet === 'add' && <AddAccountSheet app={app} />}
            {sheet === 'upload' && <UploadSheet app={app} />}
            {sheet === 'invite' && <InviteSheet app={app} />}
            {sheet === 'limit' && <LimitSheet nudge={limitNudge} onUpgrade={() => { closeSheet(); go('upgrade') }} onClose={closeSheet} />}
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.tone === 'error' ? 'toast-error' : ''}`}>{toast.text}</div>}
    </>
  )
}
