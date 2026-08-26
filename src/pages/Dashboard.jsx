import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Users, Bell, Settings, LogOut, Lock, HeartCrack, CreditCard, Heart, BookOpen, Home, X, Landmark, Activity, MessageSquare, Send, Menu, Loader2, Sparkles, ChevronUp, UserCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Markdown            from '../components/Markdown'
import ReferralCard         from '../components/ReferralCard'
import FeedbackWidget       from '../components/FeedbackWidget'
import WelcomeOnboarding    from '../components/WelcomeOnboarding'
import GuidedOnboarding     from '../components/GuidedOnboarding'
import { redirectToCheckout, PLANS } from '../lib/stripe'
import { planLabel } from '../config/pricing'
import { trackEvent } from '../lib/analytics'
import { useAccounts } from '../hooks/useData'
import { useDocuments } from '../hooks/useData'
import { usePeople } from '../hooks/useData'
import { CheckoutSuccessBanner, GiftRedeemedBanner } from '../components/Onboarding'
import { useInstructions } from '../hooks/useData'
import { useSubscriptions } from '../hooks/useData'
import { useAlerts } from '../hooks/useData'
import { useActivityLog } from '../hooks/useData'
import { useMessages } from '../hooks/useData'
import { useAboutMe } from '../hooks/useData'
import { useWishes } from '../hooks/useData'
import AIAssistantSection   from '../components/AIAssistantSection'
import { DEMO_PROFILE, DEMO_ACCOUNTS, DEMO_DOCUMENTS, DEMO_PEOPLE, DEMO_INSTRUCTIONS, DEMO_SUBSCRIPTIONS, DEMO_ALERTS, DEMO_ACTIVITY, DEMO_MESSAGES, getOwnerStatus } from '../lib/demoData'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import enDashboard from '../i18n/locales/en/dashboard.json'
import frDashboard from '../i18n/locales/fr/dashboard.json'
import { input } from './dashboard/ui'
import { SettingsSection } from './dashboard/sections/SettingsSection'
import { MessagesSection } from './dashboard/sections/MessagesSection'
import { DocumentsSection } from './dashboard/sections/DocumentsSection'
import { OverviewSection } from './dashboard/sections/OverviewSection'
import { InstructionsSection } from './dashboard/sections/InstructionsSection'
import { AboutMeSection } from './dashboard/sections/AboutMeSection'
import { PeopleSection } from './dashboard/sections/PeopleSection'
import { AccountsSection } from './dashboard/sections/AccountsSection'
import { SubscriptionsSection } from './dashboard/sections/SubscriptionsSection'
import { ActivitySection } from './dashboard/sections/ActivitySection'
import { AlertsSection } from './dashboard/sections/AlertsSection'
import { ResourcesSection } from './dashboard/sections/ResourcesSection'
import { AdvisorCancelledBanner, AdvisorCancelledModal, CelebrationToast, DashboardTour, ExecutorPreviewModal, FamilyWrapper, LifeEventPromptModal, TrialBanner, TrialExpiredModal, getAdvisorDaysLeft, getTrialDaysLeft } from './dashboard/banners'
// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later, re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'dashboard', enDashboard)
i18n.addResourceBundle('fr', 'dashboard', frDashboard)


// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',       label: 'Overview',         icon: Home },
  { id: 'aboutme',        label: 'About Me',         icon: UserCircle },
  { id: 'assistant',      label: 'Your AI Assistant',icon: Sparkles,     aiOnly: true },

  { id: 'accounts',       label: 'Accounts',         icon: Landmark,     group: 'Your vault' },
  { id: 'documents',      label: 'Documents',        icon: FileText,     group: 'Your vault' },
  { id: 'subscriptions',  label: 'Subscriptions',    icon: CreditCard,   group: 'Your vault' },

  { id: 'people',         label: 'People',           icon: Users,        group: 'People & wishes' },
  { id: 'family',         label: 'Family',           icon: Heart,        group: 'People & wishes', familyOnly: true },
  { id: 'messages',       label: 'Personal Messages',icon: MessageSquare,group: 'People & wishes' },
  { id: 'instructions',   label: 'Instructions',     icon: BookOpen,     group: 'People & wishes' },

  { id: 'alerts',         label: 'Alerts',           icon: Bell,         group: 'More' },
  { id: 'activity',       label: 'Activity',         icon: Activity,     group: 'More' },
  { id: 'resources',      label: 'Help & Resources', icon: BookOpen,     group: 'More' },
]

// The raw `group` values above stay as stable ids (the section-header comparison
// relies on them); only the displayed text goes through the `dashboard` namespace.
const NAV_GROUP_KEYS = { 'Your vault': 'vault', 'People & wishes': 'peopleWishes', 'More': 'more' }

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDemo          = searchParams.get('demo') === 'true'
  const checkoutSuccess = searchParams.get('checkout') === 'success'

  // Conversion event: fired here (the post-payment landing) rather than in the payment
  // form, because 3DS/SCA card confirmations redirect through Stripe and back — the
  // form's success handler never runs in that flow, but everyone lands on
  // /dashboard?checkout=success. Effect runs once per mount.
  useEffect(() => {
    if (checkoutSuccess && !isDemo) {
      trackEvent('subscription_created', { plan: profile?.plan || 'unknown' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Honour ?tab= param so /settings and other deep-links open the right section
  const tabParam = searchParams.get('tab')
  const DASHBOARD_TABS = ['overview','aboutme','assistant','accounts','documents','people','family','messages','instructions','subscriptions','alerts','activity','resources','settings']
  const [activeSection, setActiveSection] = useState(
    tabParam && DASHBOARD_TABS.includes(tabParam) ? tabParam : 'overview'
  )
  const mainRef = React.useRef(null)
  React.useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [activeSection])

  // Keep the active section in the URL so the browser Back button steps through
  // dashboard sections instead of jumping straight back to the public site
  // (which made people feel logged out). First sync replaces; later ones push.
  const tabSynced = React.useRef(false)
  React.useEffect(() => {
    if (searchParams.get('tab') === activeSection) { tabSynced.current = true; return }
    const next = new URLSearchParams(searchParams)
    next.set('tab', activeSection)
    setSearchParams(next, { replace: !tabSynced.current })
    tabSynced.current = true
  }, [activeSection]) // eslint-disable-line
  // Respond to browser Back/Forward (URL change) by switching section.
  React.useEffect(() => {
    if (tabParam && tabParam !== activeSection && DASHBOARD_TABS.includes(tabParam)) setActiveSection(tabParam)
  }, [tabParam]) // eslint-disable-line

  const [lifeEventPrompt, setLifeEventPrompt]       = useState(null)
  const [showExecutorPreview, setShowExecutorPreview] = useState(false)

  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [trialDismissed, setTrialDismissed] = useState(false)
  const [upgradeError, setUpgradeError]   = useState(null)
  // Demo-mode mutable people state (so invite/edit/remove reflect in UI)
  const [demoPeople, setDemoPeople] = useState(DEMO_PEOPLE)
  // First-run "Welcome to Everstead" guided onboarding — shown once on first login
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTour, setShowTour] = useState(false)

  // Real data hooks — only used when not in demo mode
  const realAccounts      = useAccounts()
  const realDocuments     = useDocuments()
  const realPeople        = usePeople()
  const realInstructions  = useInstructions()
  const realSubscriptions = useSubscriptions()
  const realAlerts        = useAlerts()
  const realActivity      = useActivityLog()
  const realWishes        = useWishes()

  const navigate = useNavigate()

  // ── Milestone celebration toast ────────────────────────────
  const [celebration, setCelebration] = React.useState(null)

  const celebrate = React.useCallback((key, emoji, headline, body) => {
    const storageKey = `everstead_celebrated_${key}_${profile?.id}`
    if (localStorage.getItem(storageKey)) return
    localStorage.setItem(storageKey, '1')
    setCelebration({ emoji, headline, body })
  }, [profile?.id])

  // ── Sync plan from localStorage after email confirmation ───
  // The DB trigger may have used default values if Supabase didn't propagate
  // custom metadata. GetStarted stored the real plan in localStorage; we read
  // and apply it here, then clear the entry.
  React.useEffect(() => {
    if (!user || !profile) return

    const raw = localStorage.getItem('everstead_pending_signup')
    if (!raw) return
    try {
      const pending = JSON.parse(raw)
      if (pending.email !== user.email) return

      const needsSync =
        (pending.plan          && profile.plan          !== pending.plan) ||
        (pending.billing_cycle && profile.billing_cycle !== pending.billing_cycle)

      if (needsSync) {
        updateProfile({
          plan:          pending.plan,
          billing_cycle: pending.billing_cycle,
          trial_ends_at: pending.trial_ends_at,
        }).catch(() => {})
      }

      localStorage.removeItem('everstead_pending_signup')
    } catch {}
  }, [user, profile])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // In demo mode, use seed data; otherwise require a real profile
  const activeProfile = isDemo ? DEMO_PROFILE : profile

  // AI features master switch (default on). When off: hide the assistant nav
  // item and block its route. The Edge Function enforces the same flag server-side.
  const aiEnabled = activeProfile?.ai_features_enabled !== false

  useEffect(() => {
    if (activeSection === 'assistant' && !aiEnabled) setActiveSection('overview')
  }, [activeSection, aiEnabled])

  const accounts      = isDemo ? DEMO_ACCOUNTS      : realAccounts.data
  const loadingAccounts = isDemo ? false             : realAccounts.loading
  const addAccount    = isDemo ? () => {}            : realAccounts.add
  const updateAccount = isDemo ? () => {}            : realAccounts.update
  const removeAccount = isDemo ? () => {}            : realAccounts.remove

  const documents     = isDemo ? DEMO_DOCUMENTS     : realDocuments.data
  const loadingDocs   = isDemo ? false               : realDocuments.loading
  const uploadFile    = isDemo ? () => {}            : realDocuments.uploadFile
  const updateDocument = isDemo ? () => {}           : realDocuments.update
  const removeDocument = isDemo ? () => {}           : realDocuments.remove

  // Raw insert handles for the AI Assistant's confirmed entries (demo-safe).
  const addPersonRow   = isDemo ? () => {}           : realPeople.add
  const addDocumentRow = isDemo ? () => {}           : realDocuments.add
  const addWish        = isDemo ? () => {}           : realWishes.add

  const people        = isDemo ? demoPeople          : realPeople.data
  const loadingPeople = isDemo ? false               : realPeople.loading
  const invite        = isDemo
    ? (payload) => setDemoPeople(prev => [...prev, {
        id: String(Date.now()), user_id: 'demo-user',
        name: payload.name, email: payload.email, role: payload.role,
        invite_status: 'pending',
        access_grants: {
          accessAreas: payload.accessAreas ?? [],
          accountCategories: payload.accountCategories ?? [],
          documentTypes: payload.documentTypes ?? [],
          accessTiming: payload.accessTiming ?? 'always',
        },
      }])
    : realPeople.invite
  const resendInvite  = isDemo ? () => {}            : realPeople.resendInvite
  const updatePerson  = isDemo
    ? (id, payload) => setDemoPeople(prev => prev.map(p => p.id !== id ? p : {
        ...p, role: payload.role,
        access_grants: {
          accessAreas: payload.accessAreas ?? [],
          accountCategories: payload.accountCategories ?? [],
          documentTypes: payload.documentTypes ?? [],
          accessTiming: payload.accessTiming ?? 'always',
        },
      }))
    : realPeople.update
  const removePerson  = isDemo
    ? (id) => setDemoPeople(prev => prev.filter(p => p.id !== id))
    : realPeople.remove

  const instructions     = isDemo ? DEMO_INSTRUCTIONS  : realInstructions.data
  const loadingInstructions = isDemo ? false            : realInstructions.loading
  const addInstruction   = isDemo ? () => {}            : realInstructions.addWithSteps
  const updateInstruction = isDemo ? () => {}           : realInstructions.updateWithSteps
  const removeInstruction = isDemo ? () => {}           : realInstructions.removeWithSteps

  const subscriptions  = isDemo ? DEMO_SUBSCRIPTIONS : realSubscriptions.data
  const loadingSubs    = isDemo ? false               : realSubscriptions.loading
  const addSubscription    = isDemo ? () => {}        : realSubscriptions.add
  const updateSubscription = isDemo ? () => {}        : realSubscriptions.update
  const removeSubscription = isDemo ? () => {}        : realSubscriptions.remove

  const [demoAlerts, setDemoAlerts] = useState(DEMO_ALERTS)
  const alerts      = isDemo ? demoAlerts  : realAlerts.data
  const markRead    = isDemo
    ? (id) => setDemoAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    : realAlerts.markRead
  const markAllRead = isDemo
    ? () => setDemoAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    : realAlerts.markAllRead
  const unreadCount = isDemo
    ? demoAlerts.filter(a => !a.is_read).length
    : realAlerts.unreadCount

  const activity        = isDemo ? DEMO_ACTIVITY : realActivity.data
  const loadingActivity = isDemo ? false          : realActivity.loading

  const messagesHook    = useMessages()
  const messages        = isDemo ? DEMO_MESSAGES : messagesHook.data
  const loadingMessages = isDemo ? false : messagesHook.loading

  const aboutMeHook     = useAboutMe()
  const aboutMe         = isDemo ? null : aboutMeHook.data

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
      </div>
    )
  }

  // New Google OAuth users who signed in via /login and never went through checkout
  // will have no stripe_customer_id — redirect them to checkout to get a subscription.
  // Free-tier users legitimately have no subscription and belong on the dashboard, so
  // they must be excluded (otherwise every free signup is bounced into the card step).
  const hasNoSubscription = !isDemo
    && activeProfile.plan !== 'free'
    && !activeProfile.stripe_customer_id
    && !['trialing', 'active', 'cancelling'].includes(activeProfile.subscription_status)

  const isTrialing = activeProfile.subscription_status === 'trialing'
  const trialDaysLeft = isTrialing ? getTrialDaysLeft(activeProfile.trial_ends_at) : null
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0

  const lastSignIn = user?.last_sign_in_at
  const daysSinceLogin = lastSignIn
    ? Math.floor((Date.now() - new Date(lastSignIn).getTime()) / 86400000)
    : null

  const advisorCancelledAt = activeProfile.advisor_cancelled_at ?? null
  const advisorDaysLeft    = getAdvisorDaysLeft(advisorCancelledAt)
  const advisorGraceExpired = advisorDaysLeft !== null && advisorDaysLeft <= 0
  const advisorGraceActive  = advisorDaysLeft !== null && advisorDaysLeft > 0

  // Owner suspension — set by admin when a death/incident report is verified
  const ownerStatus    = isDemo
    ? getOwnerStatus(activeProfile.email)
    : (activeProfile.owner_status ?? 'active')
  const isSuspended    = ownerStatus === 'deceased' || ownerStatus === 'incapacitated'
  const isDeceased     = ownerStatus === 'deceased'

  const planLimits = PLANS[activeProfile.plan]?.limits ?? PLANS.essential.limits

  // First-run welcome — shown once for brand-new users, gated on
  // profiles.onboarding_completed (existing users were marked done by migration).
  React.useEffect(() => {
    if (isDemo || !activeProfile?.id) return
    if (activeProfile.role === 'delegate') return
    if (activeProfile.onboarding_completed) return
    try { if (localStorage.getItem(`everstead_welcome_done_${activeProfile.id}`) === '1') return } catch { /* ignore */ }
    // Small delay so the dashboard renders first
    const t = setTimeout(() => setShowWelcome(true), 700)
    return () => clearTimeout(t)
  }, [activeProfile?.id, activeProfile?.onboarding_completed]) // eslint-disable-line

  const handleUpgrade = async (planId, billingCycle = 'yearly') => {
    if (isDemo) { navigate('/get-started'); return }
    setUpgradeError(null)
    const targetPlan = planId || activeProfile.plan || 'essential'
    trackEvent('upgrade_click', { plan: targetPlan, billing: billingCycle, from_plan: activeProfile.plan })
    try {
      await redirectToCheckout({
        plan:            targetPlan,
        billingCycle,
        userEmail:       user.email,
        customerId:      activeProfile.stripe_customer_id || undefined,
        trialPeriodDays: 0, // user is converting from trial, charge immediately
      })
    } catch (err) {
      setUpgradeError(err.message)
      setActiveSection('settings')
    }
  }

  const handleDeleteAccount = async () => {
    if (isDemo) return
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/auth/delete-account', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || t('shell.deletionFailed'))
      }
      await signOut()
      navigate('/')
    } catch (err) {
      throw err
    }
  }

  // ── Milestone effects ──────────────────────────────────────
  React.useEffect(() => {
    if (!isDemo && accounts.length === 1) celebrate('first_account', '🏦', t('shell.milestones.firstAccount.headline'), t('shell.milestones.firstAccount.body'))
  }, [accounts.length, isDemo])

  React.useEffect(() => {
    if (!isDemo && documents.length === 1) celebrate('first_document', '📄', t('shell.milestones.firstDocument.headline'), t('shell.milestones.firstDocument.body'))
  }, [documents.length, isDemo])

  // Redirect Google OAuth users who signed in via /login without a subscription
  if (hasNoSubscription) {
    navigate('/get-started?resume=true', { replace: true })
    return null
  }

  return (
    <>
    <Helmet>
      <title>{t('shell.title')}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {!isDemo && <FeedbackWidget profile={activeProfile} />}
      {/* Trial expired overlay */}
      {trialExpired && <TrialExpiredModal profile={activeProfile} onUpgrade={handleUpgrade} />}
      {/* Advisor grace period expired overlay */}
      {!trialExpired && advisorGraceExpired && (
        <AdvisorCancelledModal advisorName={activeProfile.advisor_name} onAddPayment={handleUpgrade} />
      )}

      {/* Demo banner */}
      {isDemo && (
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4 flex items-center justify-center gap-3 z-50">
          <span>{t('banners.demo.notice')}</span>
          <Link to="/get-started" className="underline hover:no-underline">{t('banners.demo.startReal')}</Link>
        </div>
      )}

      {/* Checkout success — handled by CheckoutSuccessBanner inside main content */}

      {/* Suspended / deceased banner */}
      {isSuspended && (
        <div className={`px-6 py-4 flex items-start gap-4 z-40 ${isDeceased ? 'bg-stone-900 text-white' : 'bg-amber-700 text-white'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDeceased ? 'bg-white/10' : 'bg-white/15'}`}>
            {isDeceased ? <HeartCrack size={16} className="text-red-300" /> : <Lock size={16} className="text-amber-200" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {isDeceased
                ? t('banners.suspended.deceasedTitle')
                : t('banners.suspended.incapacitatedTitle')}
            </p>
            <p className={`text-xs mt-1 ${isDeceased ? 'text-stone-400' : 'text-amber-200'}`}>
              {t('banners.suspended.body')}{' '}
              <a href="mailto:support@everstead.care" className="underline font-medium">support@everstead.care</a> {t('banners.suspended.bodyEnd')}
            </p>
          </div>
        </div>
      )}

      {/* Read-only overlay when suspended */}
      {isSuspended && (
        <div className="fixed inset-0 z-30 pointer-events-none" style={{ background: 'rgba(0,0,0,0.08)' }} />
      )}

      <div className="flex flex-1 overflow-hidden" style={isSuspended ? { filter: 'grayscale(0.35)', pointerEvents: 'none' } : undefined}>

      {/* ── MOBILE SIDEBAR BACKDROP ─────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(170deg, #0d1628 0%, #182a4d 38%, #2a2a55 66%, #18301f 100%)', borderRight: '1px solid #1a2942' }}
        aria-label={t('shell.sidebar')}
      >

        {/* Logo */}
        <div className="flex items-center justify-between" style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '8px', paddingTop: '24px' }}>
          <Link to="/">
            <img src="/logo-v2-white.png" alt="Everstead" className="h-10 w-auto" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={t('shell.closeMenu')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto" style={{ padding: '8px 0' }} aria-label={t('shell.dashboardNav')}>
          {(() => {
            const items = NAV_ITEMS.filter(({ familyOnly, aiOnly }) =>
              (!familyOnly || activeProfile.plan === 'family') && (!aiOnly || aiEnabled))
            return items.map(({ id, label, icon: Icon, group }, idx) => {
            const isActive = activeSection === id
            const badge    = id === 'alerts' ? unreadCount : 0
            const locked   = id === 'messages' && !planLimits.personalMessages
            const showHeader = group && group !== (idx > 0 ? items[idx - 1].group : undefined)
            return (
              <React.Fragment key={id}>
              {showHeader && (
                <p style={{ paddingLeft: '25px', margin: '14px 0 4px' }} className="text-[10px] font-semibold uppercase tracking-widest text-white/30 select-none">
                  {t(`shell.navGroups.${NAV_GROUP_KEYS[group]}`)}
                </p>
              )}
              <button
                onClick={() => { setActiveSection(id); setSidebarOpen(false) }}
                title={locked ? t('shell.messagesLocked') : undefined}
                aria-current={isActive && !locked ? 'page' : undefined}
                className={`w-full flex items-center gap-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isActive && !locked
                    ? 'text-white'
                    : locked
                    ? 'cursor-pointer'
                    : ''
                }`}
                style={{
                  margin: '2px 12px',
                  width: 'calc(100% - 24px)',
                  borderRadius: '8px',
                  letterSpacing: '0.01em',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingRight: '16px',
                  paddingLeft: '13px',
                  borderLeft: isActive && !locked ? '3px solid #8e8ad8' : '3px solid transparent',
                  backgroundColor: isActive && !locked ? 'rgba(142,138,216,0.18)' : 'transparent',
                  color: isActive && !locked ? '#ffffff' : locked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)',
                }}
                onMouseEnter={e => { if (!isActive && !locked) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' } }}
                onMouseLeave={e => { if (!isActive && !locked) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' } }}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{t(`shell.nav.${id}`)}</span>
                {locked && <Lock size={12} className="text-stone-600" />}
                {!locked && badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
              </React.Fragment>
            )
          })
          })()}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-3 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-xs font-bold text-white uppercase">
              {activeProfile.full_name?.[0] ?? activeProfile.email[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{activeProfile.full_name ?? t('shell.yourAccount')}</p>
              {activeProfile.is_founding_member ? (
                <p className="text-xs truncate flex items-center gap-1" style={{ color: '#a5b4fc' }}>
                  <Sparkles size={10} /> {t('shell.foundingMember')}
                </p>
              ) : (
                <p className="text-xs text-stone-500 truncate">{t('shell.planSuffix', { plan: planLabel(activeProfile.plan) })}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => { setActiveSection('settings'); setSidebarOpen(false) }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-full text-stone-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
          >
            <Settings size={15} /> {t('shell.settings')}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-full text-stone-400 hover:text-red-400 hover:bg-white/5 text-sm transition-colors"
          >
            <LogOut size={15} /> {t('shell.signOut')}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main ref={mainRef} className="flex-1 overflow-auto flex flex-col min-w-0 pb-24" style={{ backgroundColor: '#f8f7f5' }} aria-label={t('shell.mainContent')}>

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-navy-950 border-b border-navy-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={t('shell.openMenu')}
          >
            <Menu size={20} />
          </button>
          <Link to="/">
            <img src="/logo-v2-white.png" alt="Everstead" className="h-8 w-auto" />
          </Link>
          <div className="flex-1" />
          {unreadCount > 0 && (
            <button
              onClick={() => { setActiveSection('alerts'); setSidebarOpen(false) }}
              className="relative text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label={t('shell.unreadAlerts', { n: unreadCount })}
            >
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            </button>
          )}
        </div>
        {!isDemo && <CheckoutSuccessBanner userName={activeProfile.full_name} subscriptionStatus={activeProfile.subscription_status} />}
        {!isDemo && <GiftRedeemedBanner userName={activeProfile.full_name} />}
        {isTrialing && !trialExpired && (
          <TrialBanner daysLeft={trialDaysLeft} onUpgrade={() => { setActiveSection('settings') }} />
        )}
        {advisorGraceActive && (
          <AdvisorCancelledBanner
            daysLeft={advisorDaysLeft}
            advisorName={activeProfile.advisor_name}
            onAddPayment={() => handleUpgrade()}
          />
        )}
        {activeSection === 'overview'      && <OverviewSection  profile={activeProfile} accounts={accounts} documents={documents} people={people} instructions={instructions} messages={messages} alerts={alerts} markRead={markRead} onNavigate={setActiveSection} planLimits={planLimits} loading={loadingAccounts || loadingDocs} daysSinceLogin={daysSinceLogin} onCelebrate={celebrate} onExecutorPreview={() => setShowExecutorPreview(true)} aboutMe={aboutMe} onUpgrade={() => handleUpgrade('family', 'yearly')} persistScore={isDemo ? undefined : updateProfile} scoreInputsLoaded={!loadingAccounts && !loadingDocs && !loadingPeople && !loadingInstructions} />}
        {activeSection === 'accounts'      && <AccountsSection  accounts={accounts} loading={loadingAccounts} add={addAccount} update={updateAccount} remove={removeAccount} profile={activeProfile} onUpgrade={() => handleUpgrade('family', 'yearly')} onLifeEvent={isDemo ? undefined : setLifeEventPrompt} />}
        {activeSection === 'documents'     && <DocumentsSection documents={documents} loading={loadingDocs} uploadFile={uploadFile} update={updateDocument} remove={removeDocument} planLimits={planLimits} profile={activeProfile} onUpgrade={() => handleUpgrade('family', 'yearly')} updateProfile={isDemo ? undefined : updateProfile} addAlert={isDemo ? undefined : realAlerts.add} onLifeEvent={isDemo ? undefined : setLifeEventPrompt} people={people} />}
        {activeSection === 'people'        && <PeopleSection    people={people} loading={loadingPeople} invite={invite} resendInvite={resendInvite} updatePerson={updatePerson} removePerson={removePerson} planLimits={planLimits} profile={activeProfile} onUpgrade={() => handleUpgrade('family', 'yearly')} />}
        {activeSection === 'aboutme'       && <AboutMeSection   aboutMe={aboutMe} loading={isDemo ? false : aboutMeHook.loading} save={aboutMeHook.save} uploadAvatar={aboutMeHook.uploadAvatar} profile={activeProfile} people={people} isDemo={isDemo} onCelebrate={celebrate} />}
        {activeSection === 'assistant' && aiEnabled && <AIAssistantSection profile={activeProfile} isDemo={isDemo} addAccount={addAccount} addPerson={addPersonRow} addDocument={addDocumentRow} addWish={addWish} uploadFile={uploadFile} saveAboutMe={aboutMeHook.save} aboutMe={aboutMe} />}
        {activeSection === 'messages'      && <MessagesSection  messages={messages} loading={loadingMessages} people={people} isDemo={isDemo} planLimits={planLimits} onUpgrade={() => handleUpgrade('family', 'yearly')} addMessage={messagesHook.add} updateMessage={messagesHook.update} uploadVideo={messagesHook.uploadVideo} uploadMedia={messagesHook.uploadMedia} releaseExternal={messagesHook.releaseExternal} aiEnabled={aiEnabled} />}
        {activeSection === 'instructions'  && <InstructionsSection instructions={instructions} loading={loadingInstructions} add={addInstruction} update={updateInstruction} remove={removeInstruction} profile={activeProfile} onUpgrade={() => handleUpgrade('family', 'yearly')} />}
        {activeSection === 'subscriptions' && <SubscriptionsSection subscriptions={subscriptions} loading={loadingSubs} add={addSubscription} update={updateSubscription} remove={removeSubscription} />}
        {activeSection === 'alerts'        && <AlertsSection    alerts={alerts} markRead={markRead} markAllRead={markAllRead} />}
        {activeSection === 'activity'      && <ActivitySection  activity={activity} loading={loadingActivity} />}
        {activeSection === 'resources'     && <ResourcesSection />}
        {activeSection === 'family'        && <FamilyWrapper    profile={activeProfile} />}
        {activeSection === 'settings'      && <SettingsSection  profile={activeProfile} isDemo={isDemo} updateProfile={updateProfile} refreshProfile={refreshProfile} onUpgrade={handleUpgrade} onDeleteAccount={handleDeleteAccount} upgradeError={upgradeError} />}
      </main>
      </div>
    </div>
    {lifeEventPrompt && (
      <LifeEventPromptModal
        prompt={lifeEventPrompt}
        onNavigate={(section) => { setActiveSection(section); setLifeEventPrompt(null) }}
        onClose={() => setLifeEventPrompt(null)}
      />
    )}
    {showExecutorPreview && (
      <ExecutorPreviewModal
        profile={activeProfile}
        people={people}
        accounts={accounts}
        documents={documents}
        instructions={instructions}
        onClose={() => setShowExecutorPreview(false)}
      />
    )}
    {celebration && (
      <CelebrationToast
        message={celebration}
        onDone={() => setCelebration(null)}
      />
    )}
    {!isDemo && (
      <OwnerAIGuide
        userName={activeProfile.full_name}
        plan={activeProfile.plan}
        accountCount={accounts.length}
        documentCount={documents.filter(d => d.status !== 'missing').length}
        contactCount={people.length}
        instructionCount={instructions.length}
      />
    )}
    {showWelcome && !isDemo && (
      aiEnabled ? (
        <GuidedOnboarding
          profile={activeProfile}
          updateProfile={updateProfile}
          addAccount={addAccount}
          addPerson={addPersonRow}
          saveAboutMe={aboutMeHook.save}
          aboutMe={aboutMe}
          onClose={() => setShowWelcome(false)}
          onStartTour={() => setShowTour(true)}
        />
      ) : (
        <WelcomeOnboarding
          profile={activeProfile}
          updateProfile={updateProfile}
          onClose={() => setShowWelcome(false)}
          onGoToAboutMe={() => { setShowWelcome(false); setActiveSection('aboutme') }}
        />
      )
    )}
    {showTour && !isDemo && (
      <DashboardTour
        setActiveSection={setActiveSection}
        onClose={() => { setShowTour(false); setActiveSection('overview') }}
      />
    )}
    </>
  )
}


// ─────────────────────────────────────────────────────────────
// OWNER AI GUIDE — floating chat widget
// ─────────────────────────────────────────────────────────────
function OwnerAIGuide({ userName, plan, accountCount, documentCount, contactCount, instructionCount }) {
  const { t } = useTranslation('dashboard')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = React.useRef(null)

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: userName
      ? t('aiGuide.greetingNamed', { name: userName.split(' ')[0] })
      : t('aiGuide.greeting'),
  }])

  React.useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.access_token) {
        setMessages(prev => [...prev, { role: 'assistant', content: t('aiGuide.previewOnly') }])
        setLoading(false)
        return
      }
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          type: 'owner-guide',
          context: { userName, plan, accountCount, documentCount, contactCount, instructionCount },
          messages: next,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t('aiGuide.error') }])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    t('aiGuide.quickPrompts.focus'),
    t('aiGuide.quickPrompts.addNext'),
    t('aiGuide.quickPrompts.executor'),
    t('aiGuide.quickPrompts.lpa'),
  ]

  // Listen for events from OverviewSection "Ask your planning coach" link
  React.useEffect(() => {
    const handler = (e) => {
      setOpen(true)
      if (e.detail) setInput(e.detail)
    }
    window.addEventListener('everstead:coach', handler)
    return () => window.removeEventListener('everstead:coach', handler)
  }, [])

  // Broadcast coach open/close so the feedback button can hide while the
  // coach panel occupies the bottom-right corner.
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('everstead:coach-state', { detail: { open } }))
  }, [open])

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-50 inline-flex items-center gap-2.5 px-5 py-3 text-white text-sm font-semibold transition-all ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(100deg, #2d5082 0%, #6f6bc6 50%, #6e9b6a 100%)', borderRadius: '24px', border: 'none', boxShadow: '0 8px 24px -6px rgba(111, 107, 198, 0.5)', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px -6px rgba(111, 107, 198, 0.62)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(111, 107, 198, 0.5)' }}
        aria-label={t('aiGuide.openCoach')}
      >
        <Sparkles size={16} />
        {t('aiGuide.askCoach')}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-[1.75rem] border border-stone-200 bg-white shadow-2xl flex flex-col overflow-hidden" style={{ height: '520px' }}>
          {/* Header */}
          <div className="px-5 py-4 bg-navy-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Sparkles size={15} className="text-sage-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">{t('aiGuide.title')}</p>
                <p className="text-xs text-white/50 mt-0.5">{t('aiGuide.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label={t('common.close')}
            >
              <ChevronUp size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-navy-800 text-white rounded-br-sm whitespace-pre-line'
                    : 'bg-stone-100 text-navy-900 rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' ? <Markdown>{msg.content}</Markdown> : msg.content}
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

          {/* Quick prompts — only before first user message */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="text-xs text-navy-700 bg-navy-50 border border-navy-200 px-2.5 py-1.5 rounded-full hover:bg-navy-100 transition-colors"
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
              placeholder={t('aiGuide.placeholder')}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="shrink-0 btn-aurora text-white p-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t('aiGuide.send')}
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
// OVERVIEW SECTION
// ─────────────────────────────────────────────────────────────