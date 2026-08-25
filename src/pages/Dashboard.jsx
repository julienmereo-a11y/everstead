import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Shield, FileText, Users, Bell, Settings, LogOut,
  ChevronRight, AlertCircle, CheckCircle2, Clock, Lock, HeartCrack,
  Folder, CreditCard, Heart, BookOpen, Home, BarChart2,
  Plus, Eye, Upload, Search, X, Info, AlertTriangle, ArrowRight,
  Landmark, Building2, Wallet, Key, Activity, MoreHorizontal,
  Pencil, Trash2, Star, Crown, Zap, RefreshCw, ExternalLink, Download,
  Filter, CheckCheck, MessageSquare, Video, Play, FileEdit, Send, Menu, ShieldCheck, Loader2,
  Gift, Check, Copy, Sparkles, ChevronUp, UserCircle, Music, Image as ImageIcon, Camera, Square, CircleStop
} from 'lucide-react'
import { useAuth }          from '../contexts/AuthContext'
import Markdown            from '../components/Markdown'
import ReferralCard         from '../components/ReferralCard'
import FeedbackWidget       from '../components/FeedbackWidget'
import WelcomeOnboarding    from '../components/WelcomeOnboarding'
import GuidedOnboarding     from '../components/GuidedOnboarding'
import { redirectToCheckout, redirectToCustomerPortal, PLANS } from '../lib/stripe'
import { baseDocumentAccess } from '../lib/documentAccess'
import { PRICING, PLAN_LABELS, planLabel } from '../config/pricing'
import { trackEvent } from '../lib/analytics'
import { isAtLimit, getLimit, canUseFeature } from '../lib/planLimits'
import { useAccounts }      from '../hooks/useData'
import { useDocuments }     from '../hooks/useData'
import { usePeople }        from '../hooks/useData'
import { CheckoutSuccessBanner, GiftRedeemedBanner } from '../components/Onboarding'
import { SkeletonStats } from '../components/Skeleton'
import { useInstructions }  from '../hooks/useData'
import { useSubscriptions } from '../hooks/useData'
import { useAlerts }        from '../hooks/useData'
import { useActivityLog }   from '../hooks/useData'
import { useMessages }      from '../hooks/useData'
import { useAboutMe }       from '../hooks/useData'
import { useWishes }        from '../hooks/useData'
import AIAssistantSection   from '../components/AIAssistantSection'
import { FamilySection }    from './Settings'
import {
  DEMO_PROFILE, DEMO_ACCOUNTS, DEMO_DOCUMENTS, DEMO_PEOPLE,
  DEMO_INSTRUCTIONS, DEMO_SUBSCRIPTIONS, DEMO_ALERTS, DEMO_ACTIVITY, DEMO_MESSAGES,
  getOwnerStatus,
} from '../lib/demoData'
import { Trans, useTranslation } from 'react-i18next'
import i18n from '../i18n'
import enDashboard from '../i18n/locales/en/dashboard.json'
import frDashboard from '../i18n/locales/fr/dashboard.json'

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
// TRIAL HELPERS
// ─────────────────────────────────────────────────────────────
function getTrialDaysLeft(trialEndsAt) {
  if (!trialEndsAt) return null
  const ms = new Date(trialEndsAt) - Date.now()
  if (ms <= 0) return 0
  // Always show at least 1 day while any time remains today
  return Math.max(1, Math.ceil(ms / 86400000))
}

function TrialBanner({ daysLeft, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  if (daysLeft <= 0 || daysLeft > 14) return null
  const critical = daysLeft <= 1
  const urgent   = daysLeft <= 3
  const warning  = daysLeft <= 7
  // Days 8–14: subtle info strip; days 1–7: escalating colour
  const cls = critical ? 'bg-red-50 border-b border-red-200'
    : urgent   ? 'bg-amber-50 border-b border-amber-200'
    : warning  ? 'bg-stone-100 border-b border-stone-200'
    : 'bg-navy-950/5 border-b border-navy-100'
  const textCls = critical ? 'text-red-700 font-medium'
    : urgent  ? 'text-amber-700'
    : warning ? 'text-stone-600'
    : 'text-navy-700'
  const iconCls = critical ? 'text-red-500'
    : urgent  ? 'text-amber-600'
    : warning ? 'text-stone-400'
    : 'text-navy-400'
  const btnCls = critical ? 'bg-red-600 text-white hover:bg-red-700'
    : urgent  ? 'bg-amber-500 text-white hover:bg-amber-600'
    : warning ? 'bg-stone-700 text-white hover:bg-stone-800'
    : 'btn-aurora text-white hover:bg-navy-700'
  const msg = daysLeft === 1
    ? t('banners.trial.endsTomorrow')
    : daysLeft <= 7
    ? t('banners.trial.endsInDays', { days: daysLeft })
    : t('banners.trial.remaining', { days: daysLeft })
  return (
    <div className={`flex items-center justify-between gap-4 px-6 py-3 text-sm ${cls}`}>
      <div className="flex items-center gap-2">
        <Clock size={15} className={iconCls} />
        <span className={textCls}>{msg}</span>
      </div>
      {daysLeft <= 7 && (
        <button
          onClick={onUpgrade}
          className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors ${btnCls}`}
        >
          {t('banners.trial.managePlan')}
        </button>
      )}
    </div>
  )
}

function TrialExpiredModal({ profile, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  return (
    <div className="fixed inset-0 z-[60] bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <Lock size={28} className="text-red-500" />
        </div>
        <h2 className="font-display text-3xl font-light text-navy-950 mb-3">{t('banners.trialExpired.title')}</h2>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          {t('banners.trialExpired.body')}
        </p>
        <div className="space-y-3 mb-8">
          {[
            { name: 'Everstead+', price: t('banners.trialExpired.plusPrice'), note: t('banners.trialExpired.plusNote'), id: 'family', highlight: profile.plan !== 'advisor' },
            ...(profile.plan === 'advisor' ? [{ name: 'Everstead Pro', price: t('banners.trialExpired.proPrice'), note: t('banners.trialExpired.proNote'), id: 'advisor', highlight: true }] : []),
          ].map(plan => (
            <button
              key={plan.id}
              onClick={() => onUpgrade(plan.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all text-left ${plan.highlight ? 'border-navy-700 bg-navy-50 hover:bg-navy-100' : 'border-stone-200 hover:border-navy-300'}`}
            >
              <div>
                <p className="font-semibold text-navy-900 text-sm">{plan.name}</p>
                <p className="text-stone-400 text-xs mt-0.5">{plan.note}</p>
              </div>
              <p className="font-display text-xl font-light text-navy-900">{plan.price}</p>
            </button>
          ))}
        </div>
        <p className="text-stone-400 text-xs">
          {t('banners.trialExpired.questions')}{' '}
          <a href="mailto:support@everstead.care" className="underline hover:text-navy-700">support@everstead.care</a>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ADVISOR CANCELLATION HELPERS
// ─────────────────────────────────────────────────────────────
function getAdvisorDaysLeft(cancelledAt) {
  if (!cancelledAt) return null
  const deadline = new Date(cancelledAt).getTime() + 30 * 86400000
  return Math.ceil((deadline - Date.now()) / 86400000)
}

function AdvisorCancelledBanner({ daysLeft, advisorName, onAddPayment }) {
  const { t } = useTranslation('dashboard')
  const urgent = daysLeft <= 7
  return (
    <div className={`flex items-start justify-between gap-4 px-6 py-4 text-sm ${urgent ? 'bg-red-50 border-b border-red-200' : 'bg-orange-50 border-b border-orange-200'}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${urgent ? 'text-red-500' : 'text-orange-500'}`} />
        <div>
          <p className={`font-semibold ${urgent ? 'text-red-800' : 'text-orange-800'}`}>
            {advisorName ? t('banners.advisorCancelled.titleNamed', { name: advisorName }) : t('banners.advisorCancelled.titleUnnamed')}
          </p>
          <p className={`text-xs mt-0.5 leading-relaxed ${urgent ? 'text-red-700' : 'text-orange-700'}`}>
            {daysLeft === 1
              ? t('banners.advisorCancelled.lockedTomorrow')
              : t('banners.advisorCancelled.graceDays', { days: daysLeft })}
          </p>
        </div>
      </div>
      <button
        onClick={onAddPayment}
        className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap ${urgent ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
      >
        {t('banners.advisorCancelled.addPayment')}
      </button>
    </div>
  )
}

function AdvisorCancelledModal({ advisorName, onAddPayment }) {
  const { t } = useTranslation('dashboard')
  return (
    <div className="fixed inset-0 z-[60] bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-6">
          <CreditCard size={28} className="text-orange-500" />
        </div>
        <h2 className="font-display text-3xl font-light text-navy-950 mb-3">{t('banners.advisorModal.title')}</h2>
        <p className="text-stone-500 text-sm leading-relaxed mb-2">
          {advisorName
            ? <><strong>{advisorName}</strong> {t('banners.advisorModal.cancelledNamedSuffix')}</>
            : <>{t('banners.advisorModal.cancelledUnnamed')}</>}
        </p>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          {t('banners.advisorModal.graceEnded')}
        </p>
        <div className="space-y-3 mb-8">
          {[
            { name: 'Everstead+', price: t('banners.advisorModal.plusPrice'), note: t('banners.advisorModal.plusNote'), id: 'family', highlight: true },
          ].map(plan => (
            <button
              key={plan.id}
              onClick={() => onAddPayment(plan.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all text-left ${plan.highlight ? 'border-navy-700 bg-navy-50 hover:bg-navy-100' : 'border-stone-200 hover:border-navy-300'}`}
            >
              <div>
                <p className="font-semibold text-navy-900 text-sm">{plan.name}</p>
                <p className="text-stone-400 text-xs mt-0.5">{plan.note}</p>
              </div>
              <p className="font-display text-xl font-light text-navy-900">{plan.price}</p>
            </button>
          ))}
        </div>
        <p className="text-stone-400 text-xs">
          {t('banners.advisorModal.questions')}{' '}
          <a href="mailto:support@everstead.care" className="underline hover:text-navy-700">support@everstead.care</a>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FAMILY WRAPPER — fetches session so FamilySection has access_token
// ─────────────────────────────────────────────────────────────
function FamilyWrapper({ profile }) {
  const { t } = useTranslation('dashboard')
  const [session, setSession] = React.useState(null)
  React.useEffect(() => {
    import('../lib/supabase').then(({ supabase: s }) => {
      s.auth.getSession().then(({ data: { session: sess } }) => setSession(sess))
    })
  }, [])
  if (!session) return null
  return (
    <SectionShell
      title={t('shell.family.title')}
      subtitle={profile.family_role === 'secondary'
        ? t('shell.family.subtitleSecondary')
        : t('shell.family.subtitlePrimary')}
    >
      <FamilySection profile={profile} session={session} />
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// CELEBRATION TOAST
// ─────────────────────────────────────────────────────────────
function CelebrationToast({ message, onDone }) {
  const [visible, setVisible] = React.useState(true)
  React.useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, 5000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] max-w-sm bg-white border border-sage-200 rounded-2xl shadow-xl p-5 flex items-start gap-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center shrink-0 text-xl">
        {message.emoji}
      </div>
      <div>
        <p className="font-semibold text-navy-900 text-sm">{message.headline}</p>
        <p className="text-stone-500 text-xs mt-0.5 leading-relaxed">{message.body}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD ROOT
// ─────────────────────────────────────────────────────────────
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
        {activeSection === 'overview'      && <OverviewSection  profile={activeProfile} accounts={accounts} documents={documents} people={people} instructions={instructions} messages={messages} alerts={alerts} markRead={markRead} onNavigate={setActiveSection} planLimits={planLimits} loading={loadingAccounts || loadingDocs} daysSinceLogin={daysSinceLogin} onCelebrate={celebrate} onExecutorPreview={() => setShowExecutorPreview(true)} aboutMe={aboutMe} onUpgrade={() => handleUpgrade('family', 'yearly')} />}
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
const PLAN_BADGE = {
  free:      { label: PLAN_LABELS.free,      cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  essential: { label: PLAN_LABELS.essential, cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  family:    { label: PLAN_LABELS.family,    cls: 'bg-navy-50  text-navy-700  border-navy-200'  },
  advisor:   { label: PLAN_LABELS.advisor,   cls: 'bg-sage-50  text-sage-700  border-sage-200'  },
}

function OverviewSection({ profile, accounts, documents, people, instructions, messages, alerts, markRead, onNavigate, planLimits, loading, daysSinceLogin, onCelebrate, onExecutorPreview, aboutMe, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.is_read)
  const [staleBannerDismissed, setStaleBannerDismissed] = React.useState(false)
  const showStaleBanner = !staleBannerDismissed && daysSinceLogin !== null && daysSinceLogin >= 180
  const isFamilyPlus = planLimits?.personalMessages ?? false // family and advisor have messages

  // Family member status (Family plan only)
  const [familyMembership, setFamilyMembership] = React.useState(null)
  const [familyLoading, setFamilyLoading] = React.useState(false)
  const isSecondaryUser = profile.family_role === 'secondary'
  React.useEffect(() => {
    if (profile.plan !== 'family') return
    setFamilyLoading(true)
    import('../lib/supabase').then(({ supabase: sb }) => {
      const query = isSecondaryUser && profile.family_id
        // Secondary: look up the membership row by family_id
        ? sb.from('family_memberships').select('*').eq('id', profile.family_id).maybeSingle()
        // Primary: look up membership where they are the primary
        : sb.from('family_memberships').select('*')
            .eq('primary_user_id', profile.id)
            .in('invite_status', ['pending', 'accepted'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
      query.then(({ data }) => { setFamilyMembership(data || null); setFamilyLoading(false) })
    })
  }, [profile.id, profile.plan, profile.family_id, isSecondaryUser])

  const vaultStats = [
    { label: t('overview.stats.accounts'), value: accounts.length, icon: Landmark, target: 5, navSection: 'accounts' },
    { label: t('overview.stats.documents'), value: documents.filter(d => d.status !== 'missing').length, icon: FileText, target: 5, navSection: 'documents' },
    { label: isFamilyPlus ? t('overview.stats.trustedPeople') : t('overview.stats.trustedContacts'), value: people.length, icon: Users, target: isFamilyPlus ? 5 : 2, navSection: 'people' },
    { label: t('overview.stats.instructions'), value: instructions.length, icon: BookOpen, target: 3, navSection: 'instructions' },
  ]

  const scoreBase = vaultStats.reduce((total, stat) => total + Math.min(stat.value / stat.target, 1), 0) / vaultStats.length
  const alertPenalty = Math.min(criticalAlerts.length * 5, 15)
  const score = Math.max(0, Math.round(scoreBase * 100) - alertPenalty)

  React.useEffect(() => {
    if (score === 100) onCelebrate?.('readiness_100', '⭐', t('overview.readiness100Title'), t('overview.readiness100Body'))
  }, [score])

  const planBadge = PLAN_BADGE[profile.plan] ?? PLAN_BADGE.essential
  const scoreLabel = isFamilyPlus ? t('overview.familyReadiness') : t('overview.planReadiness')

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto" style={{ backgroundColor: '#f8f7f5', minHeight: '100%' }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', fontWeight: '400', color: '#0d1628', letterSpacing: '-0.02em', marginBottom: '4px', lineHeight: 1.2 }}>
            {(() => {
              const h = new Date().getHours()
              const slot = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
              const first = profile.full_name?.split(' ')[0]
              return first ? t(`overview.greeting.${slot}`, { name: first }) : t(`overview.greeting.${slot}NoName`)
            })()}
          </h1>
          <p style={{ fontSize: '15px', color: '#78716c', fontWeight: '400' }}>{t('overview.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onExecutorPreview}
            className="inline-flex items-center gap-1.5 transition-colors hover:bg-stone-50 hover:text-navy-700"
            style={{ border: '1px solid #e5e2dc', backgroundColor: 'transparent', color: '#44403c', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}
          >
            <Eye size={12} /> {t('overview.executorView')}
          </button>
          <Link
            to="/print"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:bg-stone-50 hover:text-navy-700"
            style={{ border: '1px solid #e5e2dc', backgroundColor: 'transparent', color: '#44403c', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}
          >
            <FileText size={12} /> {t('overview.exportPlan')}
          </Link>
          {profile.is_founding_member && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full text-white shadow-sm"
              style={{ background: 'linear-gradient(100deg,#2d5082,#6f6bc6,#6e9b6a)' }}
              title={t('overview.foundingMemberTitle')}
            >
              <Sparkles size={12} /> {t('shell.foundingMember')}
            </span>
          )}
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${planBadge.cls}`}>
            {t('shell.planSuffix', { plan: planBadge.label })}
          </span>
        </div>
      </div>

      {/* Recommended first step — About Me (until it's been filled in) */}
      {!aboutMe && (
        <button
          onClick={() => onNavigate('aboutme')}
          className="w-full mb-6 text-left rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 to-white p-5 flex items-center gap-4 hover:border-sage-300 transition-colors group"
        >
          <div className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #2d5082 0%, #6f6bc6 55%, #6e9b6a 100%)' }}>
            <UserCircle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-700 mb-0.5">{t('overview.aboutMeCta.kicker')}</p>
            <h3 className="font-display text-lg font-light text-navy-950 leading-snug">{t('overview.aboutMeCta.title')}</h3>
            <p className="text-sm text-stone-500 mt-0.5">{t('overview.aboutMeCta.body')}</p>
          </div>
          <ArrowRight size={18} className="text-sage-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">
                {t('overview.criticalAlerts', { count: criticalAlerts.length })}
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

      {/* Stale plan banner — shown when user hasn't logged in for 180+ days */}
      {showStaleBanner && (
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <RefreshCw size={16} className="text-stone-400 mt-0.5 shrink-0" />
            <p className="text-sm text-stone-600">
              {t('overview.staleBanner', { days: daysSinceLogin })}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('accounts')}
              className="text-xs font-semibold text-navy-700 hover:text-navy-900 transition-colors whitespace-nowrap"
            >
              {t('overview.reviewNow')}
            </button>
            <button
              onClick={() => setStaleBannerDismissed(true)}
              className="text-stone-400 hover:text-stone-600 transition-colors"
              aria-label={t('overview.dismiss')}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Readiness score + stats */}
      <div className="grid lg:grid-cols-[1fr_2fr] gap-6 mb-6">
        {/* Score ring */}
        <div className="rounded-2xl flex flex-col items-center justify-center text-center" style={{ background: 'linear-gradient(135deg, #f8f7f5 0%, #f0ede8 100%)', border: '1px solid #e5e2dc', padding: '32px', gap: '0' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', color: '#78716c', textTransform: 'uppercase', marginBottom: '20px' }}>{scoreLabel}</p>
          <div className="relative" style={{ width: '152px', height: '152px' }}>
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="auroraRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2d5082" />
                  <stop offset="0.5" stopColor="#6f6bc6" />
                  <stop offset="1" stopColor="#6e9b6a" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="48" fill="none" stroke="#e5e2dc" strokeWidth="9" />
              <circle
                cx="60" cy="60" r="48" fill="none"
                stroke={score >= 70 ? 'url(#auroraRing)' : score >= 40 ? '#d97706' : '#ef4444'}
                strokeWidth="9"
                strokeDasharray={`${2 * Math.PI * 48 * score / 100} ${2 * Math.PI * 48 * (1 - score / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {score === 0 ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#78716c', fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{t('overview.scoreZero')}</div>
                </div>
              ) : (
                <span className="font-display" style={{ fontSize: '36px', fontWeight: '300', color: '#0d1628', lineHeight: 1 }}>{t('overview.scorePercent', { score })}</span>
              )}
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#78716c', marginTop: '16px', marginBottom: '20px', lineHeight: 1.5 }}>
            {score >= 80 ? t('overview.scoreMsgHigh') :
             score >= 50 ? t('overview.scoreMsgMid') :
             t('overview.scoreMsgLow')}
          </p>

          {/* Open planning coach */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('everstead:coach', { detail: t('aiGuide.quickPrompts.focus') }))}
            className="inline-flex items-center gap-1.5 transition-all"
            style={{ background: 'linear-gradient(100deg, #2d5082 0%, #6f6bc6 50%, #6e9b6a 100%)', border: 'none', color: '#ffffff', borderRadius: '9999px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 6px 18px -6px rgba(111,107,198,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <Sparkles size={13} /> {t('aiGuide.quickPrompts.focus')}
          </button>
        </div>

        {/* Vault stats */}
        {loading ? (
          <SkeletonStats count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {vaultStats.map(({ label, value, icon: Icon, target, navSection }, index) => (
              <div
                key={label}
                onClick={() => onNavigate(navSection)}
                className="relative overflow-hidden"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e2dc',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  animation: 'fadeSlideUp 0.4s ease forwards',
                  animationDelay: `${index * 0.08}s`,
                  opacity: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center">
                    <Icon size={15} className="text-navy-700" />
                  </div>
                  <span className="text-xs" style={{ color: value === 0 ? '#4c7d47' : '#a8a29e' }}>
                    {value === 0 ? t('overview.startHere') : t('overview.statProgress', { value, target, count: value })}
                  </span>
                </div>
                {value === 0 ? (
                  <div className="mb-1">
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px dashed #b9d3b5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4c7d47', fontSize: '18px', marginBottom: '8px' }}>+</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600', color: '#ffffff', background: '#4c7d47', borderRadius: '9999px', padding: '5px 12px' }}>{t('overview.addFirst')}</span>
                  </div>
                ) : (
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: '#0d1628', fontWeight: '700', lineHeight: 1, marginBottom: '4px' }}>{value}</p>
                )}
                <p className="text-xs text-stone-500">{label}</p>
                {/* Bottom progress bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', borderRadius: '0 0 12px 12px', backgroundColor: '#f0ede8' }}>
                  <div style={{ height: '100%', width: `${Math.min((value / target) * 100, 100)}%`, backgroundColor: '#4c7d47', borderRadius: '0 0 0 12px', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Readiness coach card removed — the floating "Ask your coach" covers this. */}

      {/* Legacy messages CTA — Family/Advisor plans */}
      {planLimits?.personalMessages && (
        <div className="mb-6">
          {!messages || messages.length === 0 ? (
            <div className="bg-gradient-to-br from-stone-50 to-navy-50 border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-navy-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm">{t('overview.messagesCta.emptyTitle')}</p>
                <p className="text-xs text-stone-500 mt-0.5">{t('overview.messagesCta.emptyBody')}</p>
              </div>
              <button
                onClick={() => onNavigate('messages')}
                className="shrink-0 text-xs font-semibold text-navy-700 bg-white border border-navy-200 px-3 py-2 rounded-full hover:bg-navy-50 transition-colors whitespace-nowrap"
              >
                {t('overview.messagesCta.writeMessage')}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-navy-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm">{t('overview.messagesCta.saved', { count: messages.length })}</p>
                <p className="text-xs text-stone-500 mt-0.5">{t('overview.messagesCta.savedBody')}</p>
              </div>
              <button
                onClick={() => onNavigate('messages')}
                className="shrink-0 text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-2 rounded-full hover:bg-navy-100 transition-colors whitespace-nowrap"
              >
                {t('overview.messagesCta.addAnother')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Family member card — Family plan only */}
      {profile.plan === 'family' && !familyLoading && (
        <div className="mb-6">
          {familyMembership?.invite_status === 'accepted' ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-sage-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">
                  {isSecondaryUser ? t('overview.family.secondaryActive') : t('overview.family.active')}
                </p>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  {isSecondaryUser
                    ? t('overview.family.secondaryBody')
                    : t('overview.family.primaryBody', { email: familyMembership.secondary_email })}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2.5 py-1 rounded-full">{t('overview.family.activeBadge')}</span>
            </div>
          ) : familyMembership?.invite_status === 'pending' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">{t('overview.family.pending')}</p>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  {t('overview.family.pendingBody', { email: familyMembership.secondary_email })}
                </p>
              </div>
              <button
                onClick={() => onNavigate('family')}
                className="shrink-0 text-xs font-semibold text-amber-700 bg-white border border-amber-300 px-3 py-1.5 rounded-full hover:bg-amber-50 transition-colors"
              >
                {t('overview.family.manage')}
              </button>
            </div>
          ) : (
            <div className="bg-navy-50 border border-navy-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-navy-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">{t('overview.family.addTitle')}</p>
                <p className="text-xs text-stone-500 mt-0.5">{t('overview.family.addBody')}</p>
              </div>
              <button
                onClick={() => onNavigate('family')}
                className="shrink-0 text-xs font-semibold text-white btn-aurora px-3 py-1.5 rounded-full hover:bg-navy-700 transition-colors"
              >
                {t('overview.family.invite')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent documents + alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-navy-900 text-sm">{t('overview.recentDocuments')}</p>
            <span className="text-xs text-stone-400">{t('overview.totalCount', { count: documents.length })}</span>
          </div>
          {documents.length === 0 ? (
            <EmptyState icon={FileText} label={t('overview.noDocuments')} action={t('overview.uploadFirstDocument')} onAction={() => onNavigate("documents")} />
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map(doc => (
                <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.current}`}>
                    {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                  </div>
                  <span className="text-sm text-navy-800 truncate flex-1">{doc.name}</span>
                  <span className="text-xs text-stone-400 shrink-0">{t(`documents.type.${doc.doc_type}`, { defaultValue: doc.doc_type })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-navy-900 text-sm">{t('overview.recentAlerts')}</p>
            {alerts.filter(a => !a.is_read).length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                {t('overview.unreadCount', { count: alerts.filter(a => !a.is_read).length })}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <EmptyState icon={Bell} label={t('overview.noAlerts')} action={t('overview.allCaughtUp')} />
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

      {/* ── Free users: nudge to upgrade instead of the referral trial offer.
             Paid users: the refer-a-friend (extended trial) card. ── */}
      <div className="mt-6">
        {profile?.plan === 'free' ? (
          <div className="rounded-2xl border border-navy-200 bg-navy-950 text-white p-6 sm:flex sm:items-center sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-sage-300" />
              </div>
              <div className="max-w-lg">
                <p className="font-semibold text-white text-base">{t('overview.upgrade.title')}</p>
                <p className="mt-1 text-sm text-stone-300 leading-relaxed">
                  {t('overview.upgrade.body')}
                </p>
              </div>
            </div>
            <button
              onClick={onUpgrade}
              className="mt-4 sm:mt-0 shrink-0 inline-flex items-center justify-center gap-2 btn-aurora text-white font-semibold text-sm px-6 py-3 rounded-full hover:-translate-y-0.5 transition-transform"
            >
              {t('overview.upgrade.button')} <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <ReferralCard userId={profile?.id} />
        )}
      </div>
    </div>
  )
}

// Friendly, at-the-limit upgrade nudge shown inline when a vault cap is hit.
// Plan-aware: Free users get the free-tier framing and are pointed to Everstead+;
// grandfathered Essential subscribers keep their original wording. It's never a
// blocking modal — it sits above the (disabled) add control, so nothing the user
// has already saved is touched. The database is the real authority (free_tier_allows
// + restrictive INSERT policies); this just gates the UI before an insert would be
// rejected.
// The free-tier caps are enforced by restrictive RLS INSERT policies, which reject
// with Postgres code 42501 ("new row violates row-level security policy"). The UI
// gates before that point, but if a rejection ever reaches a form, show friendly
// copy instead of the raw policy string.
function friendlyLimitError(err, fallback) {
  const raw = err?.message || ''
  if (err?.code === '42501' || /row-level security/i.test(raw)) {
    return i18n.t('dashboard:shell.limitError', { freePlan: PLAN_LABELS.free, plusPlan: PLAN_LABELS.family })
  }
  return raw || fallback
}

function PlanLimitNotice({ plan, limit, noun, benefit, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  const isFree = plan === 'free'
  // `noun` is a stable id ('account' | 'document') used only to pick the translated noun.
  const nounSingular = t(`overview.planLimit.noun.${noun}`, { count: 1 })
  const nounPlural   = t(`overview.planLimit.noun.${noun}`, { count: limit })
  return (
    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3 mb-4">
      {isFree
        ? t('overview.planLimit.freeIntro', { plan: PLAN_LABELS.free, limit, nounSingular, nounPlural })
        : t('overview.planLimit.reachedIntro', { plan: planLabel(plan), limit, nounSingular, nounPlural })}{' '}
      <button onClick={onUpgrade} className="font-semibold underline underline-offset-2 hover:text-amber-900">
        {t('overview.planLimit.upgradeCta', { plan: PLAN_LABELS.family })}
      </button>{' '}
      {benefit}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────
// ACCOUNTS SECTION
// ─────────────────────────────────────────────────────────────
function AccountsSection({ accounts, loading, add, update, remove, profile, onUpgrade, onLifeEvent }) {
  const { t } = useTranslation('dashboard')
  const emptyForm = { institution: '', account_type: '', category: 'Banking', account_number_hint: '', balance_display: '', notes: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

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
    setFormError(null)
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
    setFormError(null)
    try {
      const payload = {
        ...form,
        account_number_hint: form.account_number_hint.replace(/\D/g, '').slice(-4),
      }
      if (editingAccount) await update(editingAccount.id, payload)
      else {
        await add(payload)
        // Life event prompt — property additions are a key life milestone
        if (form.category === 'Property') {
          onLifeEvent?.({
            message: t('accounts.propertyLifeEvent'),
            cta: { label: t('accounts.reviewContacts'), section: 'people' },
          })
        }
      }
      closeModal()
    } catch (err) {
      setFormError(friendlyLimitError(err, t('accounts.saveError')))
    } finally {
      setSaving(false)
    }
  }

  const atAccountLimit = isAtLimit(profile?.plan, 'maxAccounts', accounts.length)

  return (
    <SectionShell
      title={t('accounts.title')}
      subtitle={t('accounts.subtitle', { count: accounts.length })}
      action={
        <button onClick={atAccountLimit ? undefined : openAdd} disabled={atAccountLimit} className={primaryBtn} style={atAccountLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
          <Plus size={15} />{t('accounts.addAccount')}
        </button>
      }
    >
      {atAccountLimit && (
        <PlanLimitNotice
          plan={profile?.plan}
          limit={getLimit(profile?.plan, 'maxAccounts')}
          noun="account"
          benefit={t('accounts.limitBenefit')}
          onUpgrade={onUpgrade}
        />
      )}
      {loading ? <LoadingSpinner /> : accounts.length === 0 ? (
        <EmptyState icon={Landmark} label={t('accounts.empty')} action={t('accounts.emptyAction')} onAction={atAccountLimit ? undefined : openAdd} />
      ) : (
        Object.entries(grouped).map(([category, items]) => {
          const CatIcon = CATEGORY_ICONS[category] ?? Folder
          return (
            <div key={category} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CatIcon size={15} className="text-navy-600" />
                <p className="text-sm font-semibold text-navy-800">{t(`accounts.category.${category}`, { defaultValue: category })}</p>
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
                      <button onClick={() => openEdit(acc)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={t('accounts.editAria', { name: acc.institution })}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(acc.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={t('accounts.deleteAria', { name: acc.institution })}>
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
        <Modal title={editingAccount ? t('accounts.editAccount') : t('accounts.addAccount')} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('accounts.fields.institution')} required>
              <input className={input} value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} placeholder={t('accounts.fields.institutionPlaceholder')} required />
            </Field>
            <Field label={t('accounts.fields.type')} required>
              <input className={input} value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))} placeholder={t('accounts.fields.typePlaceholder')} required />
            </Field>
            <Field label={t('accounts.fields.category')}>
              <select className={input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {/* Stored category VALUES stay English (grouping + icons rely on them); only labels translate. */}
                {['Banking', 'Retirement', 'Investment', 'Insurance', 'Digital', 'Property', 'Other'].map(c => <option key={c} value={c}>{t(`accounts.category.${c}`, { defaultValue: c })}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('accounts.fields.last4')}>
                <input
                  className={input}
                  value={form.account_number_hint}
                  onChange={e => setForm(p => ({ ...p, account_number_hint: e.target.value.replace(/\D/g, '').slice(-4) }))}
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="4821"
                />
              </Field>
              <Field label={t('accounts.fields.balance')}>
                <input className={input} value={form.balance_display} onChange={e => setForm(p => ({ ...p, balance_display: e.target.value }))} placeholder={t('accounts.fields.balancePlaceholder')} />
              </Field>
            </div>
            <Field label={t('accounts.fields.notes')}>
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('accounts.fields.notesPlaceholder')} />
            </Field>
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{formError}</div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('accounts.saving') : editingAccount ? t('accounts.saveChanges') : t('accounts.addAccount')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('accounts.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT VIEWER MODAL (owner dashboard)
// ─────────────────────────────────────────────────────────────
function OwnerDocViewerModal({ doc, onClose }) {
  const { t } = useTranslation('dashboard')
  // Uploaded files live in the private `documents` storage bucket, referenced by
  // storage_path (there is no file_url column). Resolve a short-lived signed URL to
  // preview/download; fall back to file_url if a row ever carries a public one.
  const [url, setUrl]         = useState(doc?.file_url || null)
  const [loading, setLoading] = useState(!doc?.file_url && !!doc?.storage_path)

  useEffect(() => {
    let active = true
    if (doc?.file_url)      { setUrl(doc.file_url); setLoading(false); return () => { active = false } }
    if (!doc?.storage_path) { setUrl(null);         setLoading(false); return () => { active = false } }
    setLoading(true)
    ;(async () => {
      try {
        const { getDocumentUrl } = await import('../lib/supabase')
        const signed = await getDocumentUrl(doc.storage_path)
        if (active) setUrl(signed || null)
      } catch {
        if (active) setUrl(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [doc?.id, doc?.storage_path, doc?.file_url])

  if (!doc) return null
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative bg-white rounded-[2rem] shadow-2xl flex flex-col w-full max-w-4xl"
        style={{ height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <p className="font-semibold text-navy-900 text-sm">{doc.name}</p>
              <p className="text-xs text-stone-400">{t(`documents.type.${doc.doc_type}`, { defaultValue: doc.doc_type })} · {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 px-3 py-2 rounded-full transition-colors">
                  <ExternalLink size={13} /> {t('documents.viewer.openInTab')}
                </a>
                <a href={url} download={doc.name}
                  className="flex items-center gap-1.5 text-xs font-medium text-white btn-aurora hover:bg-navy-900 px-3 py-2 rounded-full transition-colors">
                  <Download size={13} /> {t('documents.viewer.download')}
                </a>
              </>
            )}
            <button onClick={onClose} className="ml-2 w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-[2rem]">
          {url ? (
            <iframe src={url} title={doc.name} className="w-full h-full border-0" />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">{t('documents.viewer.loadingPreview')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3">
              <FileText size={40} />
              <p className="text-sm">{t('documents.viewer.noFile')}</p>
              <p className="text-xs text-stone-300">{t('documents.viewer.noFileHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DOCUMENTS SECTION
// ─────────────────────────────────────────────────────────────
// ── Per-document access editor — who can see this document, and when ─────────
// Layered on top of each person's role-level access settings: overriding here
// affects THIS document only, and is changeable at any time.
function DocumentAccessEditor({ people, form, setForm }) {
  const { t } = useTranslation('dashboard')
  const contacts = (people || []).filter(p => p.id)
  const ov = form.access_overrides || {}
  const allow = Array.isArray(ov.allow) ? ov.allow : []
  const deny  = Array.isArray(ov.deny)  ? ov.deny  : []

  const effectiveFor = (person) => {
    if (deny.includes(person.id)) return false
    if (allow.includes(person.id)) return true
    return baseDocumentAccess(person.access_grants, { doc_type: form.doc_type })
  }

  const toggle = (person) => {
    const base = baseDocumentAccess(person.access_grants, { doc_type: form.doc_type })
    const next = !effectiveFor(person)
    const newAllow = allow.filter(id => id !== person.id)
    const newDeny  = deny.filter(id => id !== person.id)
    if (next && !base) newAllow.push(person.id)
    if (!next && base) newDeny.push(person.id)
    setForm(p => ({ ...p, access_overrides: { allow: newAllow, deny: newDeny } }))
  }

  return (
    <div className="border border-stone-200 rounded-xl p-4 space-y-3 bg-stone-50/60">
      <div>
        <p className="text-xs font-semibold text-stone-600">{t('documents.access.title')}</p>
        <p className="text-[11px] text-stone-400 mt-0.5">{t('documents.access.subtitle')}</p>
      </div>
      {contacts.length === 0 ? (
        <p className="text-xs text-stone-400">{t('documents.access.noPeople')}</p>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {contacts.map(person => {
            const base = baseDocumentAccess(person.access_grants, { doc_type: form.doc_type })
            const has  = effectiveFor(person)
            const overridden = has !== base
            return (
              <button
                type="button"
                key={person.id}
                onClick={() => toggle(person)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white border border-stone-200 hover:border-navy-300 transition-colors text-left"
              >
                <Checkbox checked={has} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{person.name}</p>
                  <p className="text-[11px] text-stone-400">{person.role || t('documents.access.trustedContact')}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  overridden
                    ? 'bg-navy-50 border-navy-200 text-navy-700'
                    : has ? 'bg-sage-50 border-sage-200 text-sage-800' : 'bg-stone-100 border-stone-200 text-stone-400'
                }`}>
                  {overridden ? (has ? t('documents.access.addedOverride') : t('documents.access.removedOverride')) : has ? t('documents.access.viaSettings') : t('documents.access.noAccess')}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <Field label={t('documents.access.releaseLabel')}>
        <select className={input} value={form.release_timing || 'default'} onChange={e => setForm(p => ({ ...p, release_timing: e.target.value }))}>
          <option value="default">{t('documents.access.releaseDefault')}</option>
          <option value="immediate">{t('documents.access.releaseImmediate')}</option>
          <option value="sealed">{t('documents.access.releaseSealed')}</option>
        </select>
      </Field>
      {form.release_timing === 'sealed' && (
        <p className="text-[11px] text-stone-400">{t('documents.access.sealedNote')}</p>
      )}
    </div>
  )
}

function DocumentsSection({ documents, loading, uploadFile, update, remove, planLimits, profile, onUpgrade, updateProfile, addAlert, onLifeEvent, people }) {
  const { t, i18n } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const emptyForm = { name: '', doc_type: 'Legal', status: 'current', expires_at: '', notes: '', access_overrides: {}, release_timing: 'default' }
  const [showUpload, setShowUpload] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null)
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState(null)

  // AI document scanning (Feature 2)
  const [aiScanning, setAiScanning] = useState(false)
  const [aiScanDone, setAiScanDone] = useState(false)

  const handleFileSelect = (f) => {
    setFile(f)
    setForm(p => ({ ...p, name: p.name || f.name.replace(/\.[^.]+$/, '') }))
    setAiScanDone(false)
  }

  const handleAIScan = async () => {
    if (!file) return
    // Respect the AI master switch — never scan when AI is off.
    if (profile?.ai_features_enabled === false) return
    setAiScanning(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1]
        const mimeType = file.type || 'application/octet-stream'
        const supported = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!supported.includes(mimeType)) {
          setAiScanning(false)
          return
        }
        try {
          const { supabase: sb } = await import('../lib/supabase')
          const { data: { session } } = await sb.auth.getSession()
          const res = await fetch('/api/ai/extract-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
            body: JSON.stringify({ fileBase64: base64, mimeType, fileName: file.name }),
          })
          const data = await res.json()
          if (data.extracted) {
            const ex = data.extracted
            // Build enriched notes from AI-extracted fields the form has no dedicated input for
            const extraLines = [
              ex.provider      && t('documents.ai.providerLine', { value: ex.provider }),
              ex.accountNumber && t('documents.ai.accountLine', { value: ex.accountNumber }),
              ex.value         && t('documents.ai.valueLine', { value: ex.value }),
              ex.notes,
            ].filter(Boolean).join('\n')
            setForm(p => ({
              ...p,
              name: ex.documentName || p.name,
              doc_type: ex.documentType ? normaliseDocType(ex.documentType.replace(/_/g, ' ')) : p.doc_type,
              expires_at: ex.expiryDate || p.expires_at,
              notes: extraLines ? (p.notes ? p.notes + '\n' + extraLines : extraLines) : p.notes,
            }))
            setAiScanDone(true)
          }
        } catch {}
        setAiScanning(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setAiScanning(false)
    }
  }

  // Will & solicitor details
  const [willForm, setWillForm] = useState({
    will_location:    profile?.will_location    ?? '',
    solicitor_name:   profile?.solicitor_name   ?? '',
    solicitor_firm:   profile?.solicitor_firm   ?? '',
    solicitor_contact: profile?.solicitor_contact ?? '',
  })
  const [willSaving, setWillSaving] = useState(false)
  const [willSaved,  setWillSaved]  = useState(false)

  const handleWillSave = async (e) => {
    e.preventDefault()
    if (!updateProfile) return
    setWillSaving(true)
    try { await updateProfile(willForm); setWillSaved(true); setTimeout(() => setWillSaved(false), 2500) }
    catch {}
    finally { setWillSaving(false) }
  }

  const closeModal = () => {
    setShowUpload(false)
    setEditingDocument(null)
    setFile(null)
    setForm(emptyForm)
    setFormError(null)
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
      access_overrides: doc.access_overrides || {},
      release_timing: doc.release_timing || 'default',
    })
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setSaving(true)
    setFormError(null)
    try {
      // Clamp doc_type to an allowed value (defence in depth — the AI scan or a stale
      // form value could otherwise send a type the CHECK constraint rejects).
      await uploadFile({ ...form, doc_type: normaliseDocType(form.doc_type) }, file)
      // Life event prompt — will and LPA uploads are key estate planning moments
      const lowerType = form.doc_type?.toLowerCase() ?? ''
      if (lowerType.includes('will')) {
        onLifeEvent?.({
          message: t('documents.willLifeEvent'),
          cta: { label: t('documents.reviewInstructions'), section: 'instructions' },
        })
      } else if (lowerType.includes('lpa')) {
        onLifeEvent?.({
          message: t('documents.lpaLifeEvent'),
          cta: { label: t('documents.reviewContacts'), section: 'people' },
        })
      }
      // Feature 6: Smart expiry alert creation
      if (form.expires_at && addAlert) {
        const expiryDate = new Date(form.expires_at)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((expiryDate - today) / 86400000)
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
          const severity = daysUntilExpiry <= 30 ? 'critical' : 'warning'
          const fmtDate = expiryDate.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
          // Column is `detail` (there is no `message` column — the insert was
          // silently rejected for as long as this feature existed); category
          // 'documents' matches the expiry cron's dedup filter.
          await addAlert({
            title: t('documents.expiryAlertTitle', { name: form.name || t('documents.docFallbackName') }),
            detail: t('documents.expiryAlertDetail', { name: form.name || t('documents.docFallbackNameLower'), date: fmtDate }),
            severity,
            category: 'documents',
          }).catch(err => console.error('expiry alert failed:', err?.message))
        }
      }
      closeModal()
    } catch (err) {
      setFormError(friendlyLimitError(err, t('documents.uploadError')))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await update(editingDocument.id, {
        name: form.name,
        doc_type: normaliseDocType(form.doc_type),
        status: form.status,
        expires_at: form.expires_at || null,
        notes: form.notes,
        access_overrides: form.access_overrides || {},
        release_timing: form.release_timing || 'default',
      })
      // Feature 6: also create expiry alert when editing adds/changes an expiry date
      const prevExpiry = editingDocument.expires_at
      if (form.expires_at && form.expires_at !== prevExpiry && addAlert) {
        const expiryDate = new Date(form.expires_at)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const daysUntilExpiry = Math.ceil((expiryDate - today) / 86400000)
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
          const severity = daysUntilExpiry <= 30 ? 'critical' : 'warning'
          const fmtDate = expiryDate.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
          // Column is `detail` (there is no `message` column — the insert was
          // silently rejected for as long as this feature existed); category
          // 'documents' matches the expiry cron's dedup filter.
          await addAlert({
            title: t('documents.expiryAlertTitle', { name: form.name || t('documents.docFallbackName') }),
            detail: t('documents.expiryAlertDetail', { name: form.name || t('documents.docFallbackNameLower'), date: fmtDate }),
            severity,
            category: 'documents',
          }).catch(err => console.error('expiry alert failed:', err?.message))
        }
      }
      closeModal()
    } catch (err) {
      setFormError(err.message ?? t('documents.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const atDocLimit = isAtLimit(profile?.plan, 'maxDocuments', documents.length)

  return (
    <SectionShell
      title={t('documents.title')}
      subtitle={t('documents.subtitle', { count: documents.filter(d => d.status !== 'missing').length })}
      action={
        <button onClick={atDocLimit ? undefined : openUpload} disabled={atDocLimit} className={primaryBtn} style={atDocLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
          <Upload size={15} />{t('documents.uploadDocument')}
        </button>
      }
    >
      {/* Storage usage bar */}
      {planLimits && (() => {
        const limitGB = planLimits.storageGb
        // Demo: estimate ~0.5 MB per uploaded doc; real mode: sum storage_size fields
        const usedMB = documents.filter(d => d.file_url || d.storage_path).length * 0.5
        const usedGB = usedMB / 1024
        const pct    = Math.min(100, (usedGB / limitGB) * 100)
        const warn   = pct >= 80
        return (
          <div className="mb-5 bg-white border border-stone-200 rounded-xl px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-stone-600">{t('documents.storage')}</p>
              <p className={`text-xs font-medium ${warn ? 'text-amber-600' : 'text-stone-400'}`}>
                {t('documents.storageUsed', {
                  used: usedMB < 1 ? t('documents.kb', { n: (usedMB * 1024).toFixed(0) }) : t('documents.mb', { n: usedMB.toFixed(1) }),
                  limit: limitGB,
                })}
              </p>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${warn ? 'bg-amber-400' : 'bg-navy-600'}`}
                style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
              />
            </div>
            {warn && (
              <p className="text-xs text-amber-600 mt-1.5">{t('documents.storageWarn')}</p>
            )}
          </div>
        )
      })()}
      {atDocLimit && (
        <PlanLimitNotice
          plan={profile?.plan}
          limit={getLimit(profile?.plan, 'maxDocuments')}
          noun="document"
          benefit={t('documents.limitBenefit')}
          onUpgrade={onUpgrade}
        />
      )}
      {/* Will & LPA guidance — always visible until user has uploaded both */}
      {(() => {
        const hasWill = documents.some(d => /will|testament/i.test(d.name + ' ' + (d.notes || '')))
        const hasLPA  = documents.some(d => /lpa|lasting power|attorney/i.test(d.name + ' ' + (d.notes || '')))
        if (hasWill && hasLPA) return null
        return (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">{t('documents.priority.title')}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {!hasWill && (
                <div className="bg-white rounded-xl border border-amber-100 p-4">
                  <p className="font-semibold text-navy-900 text-sm mb-1">{t('documents.priority.willTitle')}</p>
                  <p className="text-xs text-stone-500 mb-3 leading-relaxed">{t('documents.priority.willBody')}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={openUpload} className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-1.5 rounded-full hover:bg-navy-100 transition-colors">{t('documents.priority.uploadYours')}</button>
                    <a href="https://www.gov.uk/make-will" target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-navy-600 transition-colors">{t('documents.priority.govGuidance')}</a>
                  </div>
                </div>
              )}
              {!hasLPA && (
                <div className="bg-white rounded-xl border border-amber-100 p-4">
                  <p className="font-semibold text-navy-900 text-sm mb-1">{t('documents.priority.lpaTitle')}</p>
                  <p className="text-xs text-stone-500 mb-3 leading-relaxed">{t('documents.priority.lpaBody')}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={openUpload} className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-1.5 rounded-full hover:bg-navy-100 transition-colors">{t('documents.priority.uploadYours')}</button>
                    <a href="https://www.gov.uk/power-of-attorney" target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-navy-600 transition-colors">{t('documents.priority.govGuidance')}</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Will & solicitor details */}
      <div className="mb-5 bg-white border border-stone-200 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <BookOpen size={13} className="text-navy-600" /> {t('documents.will.title')}
        </h3>
        <p className="text-xs text-stone-400 mb-4 leading-relaxed">
          {t('documents.will.subtitle')}
        </p>
        <form onSubmit={handleWillSave} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('documents.will.locationLabel')}</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.will_location}
              onChange={e => setWillForm(p => ({ ...p, will_location: e.target.value }))}
              placeholder={t('documents.will.locationPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('documents.will.solicitorName')}</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_name}
              onChange={e => setWillForm(p => ({ ...p, solicitor_name: e.target.value }))}
              placeholder={t('documents.will.solicitorNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('documents.will.firmName')}</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_firm}
              onChange={e => setWillForm(p => ({ ...p, solicitor_firm: e.target.value }))}
              placeholder={t('documents.will.firmPlaceholder')}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t('documents.will.contactLabel')}</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_contact}
              onChange={e => setWillForm(p => ({ ...p, solicitor_contact: e.target.value }))}
              placeholder={t('documents.will.contactPlaceholder')}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={willSaving || !updateProfile}
              className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {willSaving ? t('documents.saving') : willSaved ? t('documents.will.savedTick') : t('documents.will.saveDetails')}
            </button>
            {willSaved && <span className="text-xs text-emerald-600 font-medium">{t('documents.will.detailsSaved')}</span>}
          </div>
        </form>
      </div>

      {loading ? <LoadingSpinner /> : documents.length === 0 ? (
        <EmptyState icon={FileText} label={t('documents.empty')} action={t('documents.emptyAction')} onAction={atDocLimit ? undefined : openUpload} />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-stone-100">
                {[t('documents.table.document'), t('documents.table.type'), t('documents.table.status'), t('documents.table.lastUpdated'), t('documents.table.access'), ''].map(h => (
                  <th key={h} scope="col" className="text-left text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3">{h}</th>
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
                  <td className="px-5 py-3.5 text-stone-500">{t(`documents.type.${doc.doc_type}`, { defaultValue: doc.doc_type })}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.current}`}>
                      {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString(dateLocale, { day:'numeric', month:'short', year:'numeric' }) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">{t('documents.owner')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className={`p-1.5 transition-colors rounded hover:bg-navy-50 ${doc.file_url || doc.storage_path ? 'text-stone-400 hover:text-navy-600' : 'text-stone-200 cursor-default'}`}
                        aria-label={t('documents.previewAria', { name: doc.name })}
                        title={doc.file_url || doc.storage_path ? t('documents.previewTitle') : t('documents.noFileYet')}
                      >
                        <Eye size={14} />
                      </button>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          download={doc.name}
                          className="p-1.5 text-stone-400 hover:text-navy-600 transition-colors rounded hover:bg-navy-50"
                          aria-label={t('documents.downloadAria', { name: doc.name })}
                          title={t('documents.viewer.download')}
                        >
                          <Download size={14} />
                        </a>
                      )}
                      <button onClick={() => openEdit(doc)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded hover:bg-navy-50" aria-label={t('documents.editAria', { name: doc.name })}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(doc.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded hover:bg-red-50" aria-label={t('documents.deleteAria', { name: doc.name })}>
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

      {viewingDoc && <OwnerDocViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {showUpload && (
        <Modal title={t('documents.uploadDocument')} onClose={closeModal}>
          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
              onClick={() => document.getElementById('doc-file').click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-navy-400 bg-navy-50' : 'border-stone-200 hover:border-navy-300'}`}
            >
              <Upload size={22} className="text-stone-300 mx-auto mb-2" />
              {file ? (
                <p className="text-sm text-navy-700 font-medium">{t('documents.fileSelected', { name: file.name, size: (file.size / 1024).toFixed(0) })}</p>
              ) : (
                <p className="text-sm text-stone-400">{t('documents.dropHere')}<br /><span className="text-xs">{t('documents.dropFormats')}</span></p>
              )}
              <input id="doc-file" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={e => { const f = e.target.files[0]; if (f) handleFileSelect(f) }} />
            </div>

            {/* AI scan offer — shown when a scannable file is selected */}
            {file && ['application/pdf','image/jpeg','image/jpg','image/png','image/webp'].includes(file.type) && !aiScanDone && (
              <div className="flex items-center justify-between bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-sage-600" />
                  <p className="text-xs text-sage-800 font-medium">{t('documents.ai.offer')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAIScan}
                  disabled={aiScanning}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-white border border-sage-300 px-3 py-1.5 rounded-full hover:bg-sage-50 transition-colors disabled:opacity-50"
                >
                  {aiScanning ? <><Loader2 size={12} className="animate-spin" />{t('documents.ai.scanning')}</> : t('documents.ai.scan')}
                </button>
              </div>
            )}
            {aiScanDone && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <CheckCircle2 size={13} /> {t('documents.ai.done')}
              </p>
            )}
            <Field label={t('documents.fields.name')} required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('documents.fields.namePlaceholder')} required />
            </Field>
            <Field label={t('documents.fields.type')}>
              <select className={input} value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                {/* doc_type VALUES are DB CHECK-constraint values and stay English; only labels translate. */}
                {['Legal','Finance','Insurance','Property','Personal','Medical','Other'].map(dt => <option key={dt} value={dt}>{t(`documents.type.${dt}`, { defaultValue: dt })}</option>)}
              </select>
            </Field>
            <Field label={t('documents.fields.notes')}>
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('documents.fields.notesPlaceholder')} />
            </Field>
            <Field label={t('documents.fields.expiry')}>
              <input type="date" className={input} value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </Field>
            <DocumentAccessEditor people={people} form={form} setForm={setForm} />
            {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving || !file} className={`${primaryBtn} flex-1 disabled:opacity-50`}>
                {saving ? t('documents.uploading') : t('documents.upload')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('documents.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}

      {editingDocument && (
        <Modal title={t('documents.editDocument')} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label={t('documents.fields.name')} required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('documents.fields.type')}>
                <select className={input} value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                  {/* doc_type VALUES are DB CHECK-constraint values and stay English; only labels translate. */}
                  {['Legal','Finance','Insurance','Property','Personal','Medical','Other'].map(dt => <option key={dt} value={dt}>{t(`documents.type.${dt}`, { defaultValue: dt })}</option>)}
                </select>
              </Field>
              <Field label={t('documents.fields.status')}>
                <select className={input} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {/* Stored status VALUES stay English; only labels translate. */}
                  {['current', 'expiring', 'missing', 'expired'].map(option => <option key={option} value={option}>{t(`documents.status.${option}`, { defaultValue: option })}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t('documents.fields.notes')}>
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </Field>
            <Field label={t('documents.fields.expiry')}>
              <input type="date" className={input} value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </Field>
            <DocumentAccessEditor people={people} form={form} setForm={setForm} />
            {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('documents.saving') : t('documents.saveChanges')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('documents.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}
// ─────────────────────────────────────────────────────────────
// ABOUT ME SECTION
// ─────────────────────────────────────────────────────────────
// Roles that should NOT see a personal "About Me" — professional/legal contacts.
// (Old spellings kept for any rows saved before the UK-terminology rename.)
const ABOUT_ME_EXCLUDED_ROLES = ['Solicitor', 'Financial Adviser', 'Healthcare Proxy', 'Estate Attorney', 'Financial Advisor']

// Turn a Spotify share URL into an embeddable player URL. Returns null if not a Spotify URL.
function spotifyEmbedUrl(url) {
  if (!url) return null
  const m = String(url).trim().match(/^https?:\/\/open\.spotify\.com\/(playlist|album|track|artist)\/([A-Za-z0-9]+)/)
  if (!m) return null
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}`
}

const aboutInputBase = 'text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300'
const aboutInput = `w-full ${aboutInputBase}`

function AboutMeSection({ aboutMe, loading, save, uploadAvatar, profile, people, isDemo, onCelebrate }) {
  const { t } = useTranslation('dashboard')
  const [form, setForm] = useState({
    full_name:     '',
    date_of_birth: '',
    avatar_url:    '',
    life_events:   [],
    passions:      '',
    spotify_url:   '',
    reflections:   '',
    recipients:    [],
    share_timing:  'on_activation',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = React.useRef(null)

  // Hydrate the form once data has loaded (prefer saved row, fall back to profile name).
  useEffect(() => {
    if (loading || hydrated) return
    setForm({
      full_name:     aboutMe?.full_name     ?? profile?.full_name ?? '',
      date_of_birth: aboutMe?.date_of_birth ?? '',
      avatar_url:    aboutMe?.avatar_url    ?? '',
      life_events:   Array.isArray(aboutMe?.life_events) ? aboutMe.life_events : [],
      passions:      aboutMe?.passions      ?? '',
      spotify_url:   aboutMe?.spotify_url    ?? '',
      reflections:   aboutMe?.reflections    ?? '',
      recipients:    Array.isArray(aboutMe?.recipients) ? aboutMe.recipients : [],
      share_timing:  aboutMe?.share_timing   ?? 'on_activation',
    })
    setHydrated(true)
  }, [loading, hydrated, aboutMe, profile])

  // Trusted people eligible to receive the About Me (family/partners/friends/executors — not professionals).
  const eligiblePeople = (people || []).filter(p => !ABOUT_ME_EXCLUDED_ROLES.includes(p.role))

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  const addLifeEvent    = () => set('life_events', [...form.life_events, { year: '', description: '' }])
  const updateLifeEvent = (i, k, v) => set('life_events', form.life_events.map((e, idx) => idx === i ? { ...e, [k]: v } : e))
  const removeLifeEvent = (i) => set('life_events', form.life_events.filter((_, idx) => idx !== i))

  const toggleRecipient = (id) =>
    set('recipients', form.recipients.includes(id) ? form.recipients.filter(r => r !== id) : [...form.recipients, id])

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file || isDemo || !uploadAvatar) return
    if (!file.type.startsWith('image/')) { setError(t('aboutMe.avatarNotImage')); return }
    if (file.size > 5 * 1024 * 1024) { setError(t('aboutMe.avatarTooBig')); return }
    setUploadingAvatar(true); setError(null)
    try {
      const url = await uploadAvatar(file)
      set('avatar_url', url)
    } catch (err) {
      setError(err.message || t('aboutMe.avatarUploadError'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const spotifyValid   = !form.spotify_url || !!spotifyEmbedUrl(form.spotify_url)
  const embedUrl       = spotifyEmbedUrl(form.spotify_url)

  const handleSave = async () => {
    if (isDemo) return
    if (!spotifyValid) { setError(t('aboutMe.spotifyInvalidSave')); return }
    setSaving(true); setError(null)
    try {
      // Drop empty life events
      const cleanEvents = form.life_events.filter(e => (e.year || '').trim() || (e.description || '').trim())
      const wasEmpty = !aboutMe
      await save({ ...form, life_events: cleanEvents })
      setSaved(true)
      if (wasEmpty && onCelebrate) onCelebrate('about_me_done', '💚', t('aboutMe.celebrateTitle'), t('aboutMe.celebrateBody'))
    } catch (err) {
      setError(err.message || t('aboutMe.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SectionShell title={t('aboutMe.title')}><LoadingSpinner /></SectionShell>

  return (
    <SectionShell
      title={t('aboutMe.title')}
      subtitle={t('aboutMe.subtitle')}
    >
      {/* Intro */}
      <div className="rounded-2xl border border-sage-200 bg-sage-50 p-5 mb-6 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0">
          <Heart size={17} />
        </div>
        <p className="text-sm text-stone-700 leading-relaxed">
          {t('aboutMe.intro')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Basics */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Profile picture */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
                {form.avatar_url
                  ? <img src={form.avatar_url} alt={t('aboutMe.profileAlt')} className="w-full h-full object-cover" />
                  : <UserCircle size={40} className="text-stone-300" />}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 size={20} className="text-navy-600 animate-spin" />
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar || isDemo}
                className="text-xs font-semibold text-sage-700 hover:text-sage-800 disabled:text-stone-400 disabled:cursor-not-allowed"
              >
                {form.avatar_url ? t('aboutMe.changePhoto') : t('aboutMe.addPhoto')}
              </button>
            </div>

            {/* Name + DOB */}
            <div className="flex-1 grid sm:grid-cols-2 gap-4 w-full">
              <Field label={t('aboutMe.fields.fullName')}>
                <input className={aboutInput} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder={t('aboutMe.fields.fullNamePlaceholder')} />
              </Field>
              <Field label={t('aboutMe.fields.dob')}>
                <input type="date" className={aboutInput} value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Life events */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-lg font-light text-navy-950">{t('aboutMe.lifeEvents.title')}</h3>
            <button onClick={addLifeEvent} className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 hover:text-sage-800">
              <Plus size={14} /> {t('aboutMe.lifeEvents.add')}
            </button>
          </div>
          <p className="text-stone-500 text-xs mb-4">{t('aboutMe.lifeEvents.hint')}</p>
          {form.life_events.length === 0 ? (
            <button onClick={addLifeEvent} className="w-full border border-dashed border-stone-200 rounded-xl py-5 text-sm text-stone-400 hover:border-sage-300 hover:text-sage-700 transition-colors">
              {t('aboutMe.lifeEvents.addFirst')}
            </button>
          ) : (
            <div className="space-y-3">
              {form.life_events.map((ev, i) => (
                <div key={i} className="flex items-end gap-2.5">
                  <div className="w-24 shrink-0">
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">{t('aboutMe.lifeEvents.year')}</label>
                    <input
                      className={`${aboutInputBase} w-full`}
                      value={ev.year}
                      onChange={e => updateLifeEvent(i, 'year', e.target.value)}
                      placeholder="1985"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">{t('aboutMe.lifeEvents.description')}</label>
                    <input
                      className={`${aboutInputBase} w-full`}
                      value={ev.description}
                      onChange={e => updateLifeEvent(i, 'description', e.target.value)}
                      placeholder={t('aboutMe.lifeEvents.descriptionPlaceholder')}
                    />
                  </div>
                  <button onClick={() => removeLifeEvent(i)} aria-label={t('aboutMe.lifeEvents.removeAria')} className="shrink-0 mb-2.5 text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passions */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Field label={t('aboutMe.fields.passions')}>
            <textarea
              rows={3}
              className={`${aboutInput} resize-none`}
              value={form.passions}
              onChange={e => set('passions', e.target.value)}
              placeholder={t('aboutMe.fields.passionsPlaceholder')}
            />
          </Field>
        </div>

        {/* Spotify */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Field label={t('aboutMe.fields.spotify')}>
            <div className="relative">
              <Music size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                className={`${aboutInput} pl-9`}
                value={form.spotify_url}
                onChange={e => set('spotify_url', e.target.value)}
                placeholder="https://open.spotify.com/playlist/…"
              />
            </div>
          </Field>
          {!spotifyValid && (
            <p className="text-xs text-red-600 mt-2">{t('aboutMe.spotifyInvalid')}</p>
          )}
          {embedUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-stone-200">
              <iframe
                title={t('aboutMe.spotifyPreview')}
                src={embedUrl}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Reflections */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Field label={t('aboutMe.fields.reflections')}>
            <textarea
              rows={6}
              className={`${aboutInput} resize-none`}
              value={form.reflections}
              onChange={e => set('reflections', e.target.value)}
              placeholder={t('aboutMe.fields.reflectionsPlaceholder')}
            />
          </Field>
        </div>

        {/* Sharing */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-light text-navy-950 mb-1">{t('aboutMe.sharing.title')}</h3>
            <p className="text-stone-500 text-xs">{t('aboutMe.sharing.subtitle')}</p>
          </div>

          {eligiblePeople.length === 0 ? (
            <p className="text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
              {t('aboutMe.sharing.noPeopleBefore')} <strong>{t('aboutMe.sharing.noPeopleStrong')}</strong>{t('aboutMe.sharing.noPeopleAfter')}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {eligiblePeople.map(p => {
                const checked = form.recipients.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleRecipient(p.id)}
                    className={`flex items-center gap-3 text-left px-3.5 py-2.5 rounded-xl border transition-colors ${
                      checked ? 'border-sage-400 bg-sage-50' : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-sage-600' : 'border border-stone-300'}`}>
                      {checked && <Check size={11} className="text-white" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-navy-900 truncate">{p.name}</span>
                      {p.role && <span className="block text-xs text-stone-400 truncate">{p.role}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Timing */}
          <div>
            <h3 className="font-display text-lg font-light text-navy-950 mb-2">{t('aboutMe.sharing.timingTitle')}</h3>
            <div className="space-y-2.5">
              {[
                { id: 'on_activation', title: t('aboutMe.sharing.onActivationTitle'), desc: t('aboutMe.sharing.onActivationDesc') },
                { id: 'now',           title: t('aboutMe.sharing.nowTitle'),          desc: t('aboutMe.sharing.nowDesc') },
              ].map(opt => {
                const active = form.share_timing === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => set('share_timing', opt.id)}
                    className={`w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                      active ? 'border-navy-400 bg-navy-50' : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-navy-600' : 'border-stone-300'}`}>
                      {active && <span className="w-2 h-2 rounded-full bg-navy-600" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-navy-900">{opt.title}</span>
                      <span className="block text-xs text-stone-500 mt-0.5">{opt.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between gap-4 sticky bottom-4">
          <div className="text-sm">
            {error && <span className="text-red-600">{error}</span>}
            {saved && !error && <span className="text-sage-700 inline-flex items-center gap-1.5"><CheckCircle2 size={15} /> {t('aboutMe.saved')}</span>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || isDemo}
            className={`${primaryBtn} disabled:bg-stone-300 disabled:cursor-not-allowed shadow-sm`}
          >
            {saving ? t('aboutMe.saving') : isDemo ? t('aboutMe.signInToEdit') : <><Check size={15} /> {t('aboutMe.saveButton')}</>}
          </button>
        </div>
      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// SIGNED MEDIA — message photos/videos live in the PRIVATE `messages` bucket;
// the stored URL only encodes the path. Mint a short-lived signed URL to view.
function SignedMedia({ msg }) {
  const { t } = useTranslation('dashboard')
  const stored = msg.media_url || msg.video_url
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  React.useEffect(() => {
    let on = true
    setUrl(null); setFailed(false)
    if (!stored) return
    import('../lib/supabase').then(({ signedMessageMediaUrl }) =>
      signedMessageMediaUrl(stored).then(u => { if (on) { u ? setUrl(u) : setFailed(true) } })
    )
    return () => { on = false }
  }, [stored])
  if (!stored) return null
  if (failed) return <p className="text-xs text-stone-400 py-6 text-center">{t('media.loadFailed', { type: msg.type === 'video' ? t('media.type.video') : t('media.type.photo') })}</p>
  if (!url) return <div className="flex items-center justify-center py-10"><RefreshCw size={18} className="animate-spin text-stone-300" /></div>
  return msg.type === 'video'
    ? <video src={url} controls playsInline className="w-full max-h-80 bg-black" />
    : <img src={url} alt={msg.title} className="w-full max-h-80 object-contain bg-stone-50" />
}

// RECORD VIDEO — in-browser webcam + mic recording (MediaRecorder)
// ─────────────────────────────────────────────────────────────
function RecordVideo({ onCapture }) {
  const { t } = useTranslation('dashboard')
  const videoRef    = React.useRef(null)
  const recorderRef = React.useRef(null)
  const chunksRef   = React.useRef([])
  const streamRef   = React.useRef(null)
  const timerRef    = React.useRef(null)
  const [recording, setRecording] = useState(false)
  const [error, setError]         = useState(null)
  const [elapsed, setElapsed]     = useState(0)

  const cleanup = () => {
    clearInterval(timerRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }
  useEffect(() => cleanup, [])

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; videoRef.current.play().catch(() => {}) }
      const mime = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
        const ext  = (blob.type.split('/')[1] || 'webm').split(';')[0]
        onCapture(new File([blob], `recording.${ext}`, { type: blob.type }))
        cleanup()
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch (err) {
      setError(err?.name === 'NotAllowedError'
        ? t('media.record.blocked')
        : t('media.record.failed'))
      cleanup()
    }
  }
  const stop = () => { setRecording(false); clearInterval(timerRef.current); try { recorderRef.current?.stop() } catch {} }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden">
      <div className="relative bg-black aspect-video">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {!recording && !streamRef.current && (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs gap-1.5">
            <Camera size={14} /> {t('media.record.preview')}
          </div>
        )}
        {recording && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/55 text-white text-[11px] font-semibold px-2 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {mm}:{ss}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-600 px-3 py-2.5">{error}</p>
      ) : recording ? (
        <button type="button" onClick={stop} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 py-2.5 transition-colors">
          <Square size={12} className="fill-current" /> {t('media.record.stop')}
        </button>
      ) : (
        <button type="button" onClick={start} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-navy-700 hover:bg-stone-50 py-2.5 transition-colors">
          <Camera size={15} /> {t('media.record.start')}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PERSONAL MESSAGES SECTION
// ─────────────────────────────────────────────────────────────
function MessagesSection({ messages: initialMessages, loading, people, isDemo, planLimits, onUpgrade, addMessage, updateMessage, uploadVideo, uploadMedia, releaseExternal, aiEnabled }) {
  const { t, i18n } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  // Stored DB values (type, release_timing) paired with the id used to look up
  // their translated label. The value is never translated, only the label.
  const TYPE_OPTIONS = [
    { value: 'note',  icon: FileEdit },
    { value: 'video', icon: Video },
    { value: 'photo', icon: ImageIcon },
  ]
  const TIMING_OPTIONS = [
    { value: 'after_death', id: 'afterDeath' },
    { value: 'on_date',     id: 'onDate' },
  ]
  const [showCompose, setShowCompose]   = useState(false)
  const [expanded, setExpanded]         = useState(null)
  const [confirmRelease, setConfirmRelease] = useState(null)  // message id to confirm
  const [confirmReleaseAll, setConfirmReleaseAll] = useState(false)
  const [releasing, setReleasing]       = useState(null)  // id or 'all'
  const [releasedIds, setReleasedIds]   = useState(
    () => new Set(initialMessages.filter(m => m.released).map(m => m.id))
  )
  const [form, setForm] = useState({ recipient_kind: 'person', recipient_name: '', recipient_role: '', recipient_email: '', title: '', type: 'note', content: '', release_timing: 'after_death', release_at: '' })
  const [mediaFile, setMediaFile] = useState(null)       // recorded Blob or selected File
  const [mediaPreview, setMediaPreview] = useState(null) // object URL for preview
  const [saving, setSaving] = useState(false)

  const setMedia = (file) => {
    setMediaPreview(prev => { if (prev) URL.revokeObjectURL(prev); return file ? URL.createObjectURL(file) : null })
    setMediaFile(file)
  }
  const resetForm = () => {
    setMedia(null)
    setForm({ recipient_kind: 'person', recipient_name: '', recipient_role: '', recipient_email: '', title: '', type: 'note', content: '', release_timing: 'after_death', release_at: '' })
  }

  // AI message writer (Feature 5)
  const [showAIWriter, setShowAIWriter] = useState(false)
  const [aiWriterForm, setAiWriterForm] = useState({ relationship: '', wants: '', gratitude: '', hopes: '' })
  const [aiWriterLoading, setAiWriterLoading] = useState(false)

  const handleAIWrite = async (e) => {
    e.preventDefault()
    if (aiEnabled === false) return
    setAiWriterLoading(true)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/ai/write-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          recipientName: form.recipient_name,
          relationship: aiWriterForm.relationship,
          wants: aiWriterForm.wants,
          gratitude: aiWriterForm.gratitude,
          hopes: aiWriterForm.hopes,
        }),
      })
      const data = await res.json()
      if (data.message) {
        setForm(p => ({ ...p, content: data.message }))
        setShowAIWriter(false)
        setAiWriterForm({ relationship: '', wants: '', gratitude: '', hopes: '' })
      }
    } catch {}
    setAiWriterLoading(false)
  }

  // Merge server state with local optimistic released state. Server truth is
  // additive-only: releasedIds can mark EXTRA rows released this session, but
  // must never un-release a server-released row (the Set is initialised before
  // async data arrives on ?tab=messages deep links, so it starts empty).
  const messages = initialMessages.map(m => ({
    ...m,
    released: m.released || releasedIds.has(m.id),
    released_at: m.released_at ?? (releasedIds.has(m.id) ? new Date().toISOString() : null),
  }))

  const sealedCount   = messages.filter(m => !m.released).length
  const releasedCount = messages.filter(m => m.released).length

  const doRelease = async (id) => {
    setReleasing(id)
    try {
      if (!isDemo) {
        const m = messages.find(x => x.id === id)
        if (m?.recipient_email) {
          await releaseExternal(id)   // mint token + email the secure link
        } else {
          await updateMessage(id, { released: true, released_at: new Date().toISOString() })
        }
      }
      setReleasedIds(prev => new Set([...prev, id]))
    } finally {
      setReleasing(null)
      setConfirmRelease(null)
    }
  }

  const doReleaseAll = async () => {
    setReleasing('all')
    try {
      if (!isDemo) {
        await Promise.all(
          messages.filter(m => !m.released).map(m =>
            m.recipient_email
              ? releaseExternal(m.id)
              : updateMessage(m.id, { released: true, released_at: new Date().toISOString() })
          )
        )
      }
      setReleasedIds(new Set(messages.map(m => m.id)))
    } finally {
      setReleasing(null)
      setConfirmReleaseAll(false)
    }
  }

  const [saveError, setSaveError] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    const isEmail = form.recipient_kind === 'email'
    if ((form.type === 'video' || form.type === 'photo') && !mediaFile) {
      setSaveError(t('messages.errors.mediaRequired', { type: t(`media.type.${form.type}`) })); return
    }
    if (form.release_timing === 'on_date' && !form.release_at) {
      setSaveError(t('messages.errors.dateRequired')); return
    }
    setSaveError(null)
    setSaving(true)
    try {
      if (!isDemo) {
        const row = await addMessage({
          recipient_name:  isEmail ? (form.recipient_name.trim() || form.recipient_email.trim()) : form.recipient_name,
          recipient_role:  isEmail ? '' : form.recipient_role,
          recipient_email: isEmail ? form.recipient_email.trim() : null,
          title:   form.title,
          type:    form.type,
          content: form.type === 'note' ? form.content : '',
          release_timing: form.release_timing,
          // Noon UTC on the chosen day: the hourly cron delivers within the hour,
          // at a humane time in every nearby timezone (never 00:xx).
          release_at: form.release_timing === 'on_date' ? new Date(`${form.release_at}T12:00:00Z`).toISOString() : null,
        })
        if (row && mediaFile && form.type !== 'note') {
          await uploadMedia(row.id, mediaFile)
        }
      }
      setShowCompose(false)
      resetForm()
    } catch (err) {
      setSaveError(err?.message || t('messages.errors.saveFailed'))
    } finally { setSaving(false) }
  }

  // A scheduled release day is stored as noon UTC — format it in UTC so the
  // chip always echoes the day the user picked (UTC+13/14 would otherwise
  // show the next day). fmtDate stays local for real instants (released_at).
  const fmtDay = (iso) => {
    try { return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso)) } catch { return '—' }
  }
  // Tomorrow in the USER'S timezone (toISOString would use UTC and block
  // "tomorrow" for evening users west of Greenwich).
  const localTomorrow = () => {
    const d = new Date(Date.now() + 86400000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const fmtDate = (iso) => {
    try { return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(new Date(iso)) } catch { return '—' }
  }

  const unreleased = messages.filter(m => !m.released)

  const messagesLocked = planLimits && !planLimits.personalMessages

  return (
    <SectionShell
      title={t('messages.title')}
      subtitle={messagesLocked
        ? t('messages.plusFeature', { plan: PLAN_LABELS.family })
        : t('messages.subtitle', { released: releasedCount, sealed: sealedCount })}
      action={!messagesLocked ? (
        <div className="flex items-center gap-2">
          {unreleased.length > 1 && (
            <button
              onClick={() => setConfirmReleaseAll(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-3 py-2 rounded-full hover:bg-amber-200 transition-colors"
            >
              <Send size={13} /> {t('messages.releaseAll')}
            </button>
          )}
          <button onClick={() => setShowCompose(true)} className={primaryBtn}><Plus size={15} />{t('messages.newMessage')}</button>
        </div>
      ) : null}
    >
      {messagesLocked && (
        <div className="rounded-2xl border border-sage-200 bg-sage-50 p-8 text-center">
          <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💌</span>
          </div>
          <h3 className="font-display text-xl font-light text-navy-950 mb-2">{t('messages.locked.title')}</h3>
          <p className="text-stone-600 text-sm leading-relaxed max-w-sm mx-auto mb-6">
            {t('messages.locked.body', { plan: PLAN_LABELS.family })}
          </p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 btn-aurora text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-navy-700 transition-colors"
          >
            {t('messages.locked.cta', { plan: PLAN_LABELS.family })}
          </button>
        </div>
      )}
      {/* Info banner */}
      {!messagesLocked && (
      <div className="flex items-start gap-3 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3.5 mb-5">
        <Lock size={15} className="text-navy-600 mt-0.5 shrink-0" />
        <p className="text-xs text-navy-700 leading-relaxed">
          <Trans t={t} i18nKey="messages.sealedBanner" components={{ b: <strong /> }} />
        </p>
      </div>
      )}

      {!messagesLocked && (loading ? <LoadingSpinner /> : messages.length === 0 ? (
        <EmptyState icon={MessageSquare} label={t('messages.empty')} action={t('messages.emptyAction')} onAction={() => setShowCompose(true)} />
      ) : (
        <div className="space-y-3">
          {messages.map(msg => {
            const isOpen     = expanded === msg.id
            const isReleased = msg.released
            const isReleasingThis = releasing === msg.id
            const isPendingConfirm = confirmRelease === msg.id

            return (
              <div
                key={msg.id}
                className={`rounded-xl border overflow-hidden transition-colors ${isReleased ? 'border-emerald-200 bg-emerald-50/40' : 'border-stone-200 bg-white'}`}
              >
                {/* Row header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Type icon */}
                  <button
                    className="shrink-0"
                    onClick={() => setExpanded(isOpen ? null : msg.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${msg.type === 'video' ? 'bg-purple-50 text-purple-600' : msg.type === 'photo' ? 'bg-sage-50 text-sage-600' : 'bg-navy-50 text-navy-600'}`}>
                      {msg.type === 'video' ? <Video size={17} /> : msg.type === 'photo' ? <ImageIcon size={17} /> : <FileEdit size={17} />}
                    </div>
                  </button>

                  {/* Info — clickable to expand */}
                  <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded(isOpen ? null : msg.id)}>
                    <p className="font-semibold text-navy-900 text-sm truncate">{msg.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      <Trans t={t} i18nKey="messages.forRecipient" values={{ name: msg.recipient_name }} components={{ b: <span className="font-medium text-navy-700" /> }} />
                      {msg.recipient_role ? ` · ${roleLabel(t, msg.recipient_role)}` : ''}
                      {msg.recipient_email ? <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-navy-600 bg-navy-50 px-1.5 py-0.5 rounded-full align-middle"><Send size={9} /> {t('messages.viaEmail')}</span> : null}
                      {!isReleased && msg.release_timing === 'on_date' && msg.release_at ? <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full align-middle"><Clock size={9} /> {t('messages.releasesOn', { date: fmtDay(msg.release_at) })}</span> : null}
                    </p>
                  </button>

                  {/* Status + release button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isReleased ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 size={11} /> {msg.released_at ? t('messages.releasedOn', { date: fmtDate(msg.released_at) }) : t('messages.released')}
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmRelease(msg.id)}
                        disabled={isReleasingThis}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 transition-colors disabled:opacity-50"
                      >
                        {isReleasingThis ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                        {isReleasingThis ? t('messages.releasing') : t('messages.releaseNow')}
                      </button>
                    )}
                    <button onClick={() => setExpanded(isOpen ? null : msg.id)}>
                      <ChevronRight size={15} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Inline release confirmation */}
                {isPendingConfirm && (
                  <div className="border-t border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-900">{t('messages.confirm.title')}</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {msg.recipient_email
                          ? <Trans t={t} i18nKey="messages.confirm.bodyEmail" values={{ email: msg.recipient_email }} components={{ b: <strong /> }} />
                          : <Trans t={t} i18nKey="messages.confirm.bodyPerson" values={{ name: msg.recipient_name }} components={{ b: <strong /> }} />}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => doRelease(msg.id)}
                        disabled={isReleasingThis}
                        className="inline-flex items-center gap-1.5 btn-aurora text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
                      >
                        {isReleasingThis ? t('messages.releasing') : t('messages.confirm.yes')}
                      </button>
                      <button
                        onClick={() => setConfirmRelease(null)}
                        className="text-xs font-semibold text-stone-600 border border-stone-200 px-3 py-2 rounded-full hover:bg-stone-100 transition-colors"
                      >
                        {t('messages.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded body */}
                {isOpen && (
                  <div className="border-t border-stone-100 px-5 py-4 bg-stone-50 space-y-4">
                    {/* Release timing — editable while the message is still sealed. */}
                    {!isReleased && (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-stone-600 mr-1">{t('messages.timing.question')}</p>
                        <select
                          className="text-xs font-medium border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-navy-900"
                          value={msg.release_timing || 'after_death'}
                          onChange={async e => {
                            if (isDemo) return
                            const v = e.target.value
                            try { await updateMessage(msg.id, { release_timing: v, release_at: v === 'on_date' ? (msg.release_at || null) : null }) } catch {}
                          }}
                        >
                          {TIMING_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{t(`messages.timing.${opt.id}.label`)}</option>
                          ))}
                        </select>
                        {(msg.release_timing === 'on_date') && (
                          <input
                            type="date"
                            className="text-xs font-medium border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-navy-900"
                            min={localTomorrow()}
                            value={msg.release_at ? String(msg.release_at).slice(0, 10) : ''}
                            onChange={async e => {
                              if (isDemo || !e.target.value) return
                              try { await updateMessage(msg.id, { release_at: new Date(`${e.target.value}T12:00:00Z`).toISOString() }) } catch {}
                            }}
                          />
                        )}
                        {msg.release_timing === 'on_date' && !msg.release_at && (
                          <span className="text-[11px] text-amber-600">{t('messages.timing.pickDate')}</span>
                        )}
                      </div>
                    )}
                    {(msg.type === 'video' || msg.type === 'photo') ? (
                      (msg.media_url || msg.video_url) && !isDemo ? (
                        <div className="rounded-xl overflow-hidden border border-stone-200">
                          <SignedMedia msg={msg} />
                        </div>
                      ) : isDemo ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 aurora-field aurora-dim rounded-xl text-white">
                          {msg.type === 'video' ? <Play size={22} /> : <ImageIcon size={22} />}
                          <p className="text-sm text-stone-300">{t('messages.demoMedia', { type: t(`messages.type.${msg.type}.label`) })}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-8 bg-white border border-dashed border-stone-200 rounded-xl">
                          <p className="text-sm text-stone-500">{t('messages.noMediaYet', { type: t(`media.type.${msg.type}`) })}</p>
                          <label className="cursor-pointer inline-flex items-center gap-2 btn-aurora text-white text-xs font-semibold px-4 py-2 rounded-full transition-transform hover:-translate-y-0.5">
                            <Upload size={13} /> {t('messages.uploadType', { type: t(`media.type.${msg.type}`) })}
                            <input type="file" accept={msg.type === 'video' ? 'video/*' : 'image/*'} className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadMedia(msg.id, file) }} />
                          </label>
                        </div>
                      )
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">{t('messages.contentLabel')}</p>
                        <p className="text-sm text-navy-900 leading-relaxed whitespace-pre-wrap bg-white border border-stone-200 rounded-xl px-4 py-3.5">
                          {msg.content || <span className="text-stone-400 italic">{t('messages.noContent')}</span>}
                        </p>
                      </div>
                    )}
                    {!isReleased && (
                      <div className="flex gap-3">
                        <button onClick={() => {}} disabled={isDemo} className={`${secondaryBtn} disabled:opacity-40 disabled:cursor-not-allowed`} title={isDemo ? t('messages.notInDemo') : undefined}>
                          <Pencil size={13} /> {t('messages.edit')}
                        </button>
                        <button
                          onClick={() => {}}
                          disabled={isDemo}
                          title={isDemo ? t('messages.notInDemo') : undefined}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-full hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={13} /> {t('messages.delete')}
                        </button>
                      </div>
                    )}
                    {isReleased && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> {t('messages.releasedTo', { name: msg.recipient_name })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* AI message writer modal (Feature 5) */}
      {showAIWriter && (
        <Modal title={t('messages.ai.modalTitle')} onClose={() => setShowAIWriter(false)}>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            {t('messages.ai.intro', { name: form.recipient_name || t('messages.ai.defaultRecipient') })}
          </p>
          <form onSubmit={handleAIWrite} className="space-y-4">
            <Field label={t('messages.ai.relationship')}>
              <input
                className={input}
                placeholder={t('messages.ai.relationshipPlaceholder')}
                value={aiWriterForm.relationship}
                onChange={e => setAiWriterForm(p => ({ ...p, relationship: e.target.value }))}
              />
            </Field>
            <Field label={t('messages.ai.wants')}>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder={t('messages.ai.wantsPlaceholder')}
                value={aiWriterForm.wants}
                onChange={e => setAiWriterForm(p => ({ ...p, wants: e.target.value }))}
              />
            </Field>
            <Field label={t('messages.ai.gratitude')}>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder={t('messages.ai.gratitudePlaceholder')}
                value={aiWriterForm.gratitude}
                onChange={e => setAiWriterForm(p => ({ ...p, gratitude: e.target.value }))}
              />
            </Field>
            <Field label={t('messages.ai.hopes')}>
              <input
                className={input}
                placeholder={t('messages.ai.hopesPlaceholder')}
                value={aiWriterForm.hopes}
                onChange={e => setAiWriterForm(p => ({ ...p, hopes: e.target.value }))}
              />
            </Field>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={aiWriterLoading || !aiWriterForm.wants}
                className={`${primaryBtn} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {aiWriterLoading ? <><Loader2 size={14} className="animate-spin" />{t('messages.ai.writing')}</> : <><Sparkles size={14} />{t('messages.ai.submit')}</>}
              </button>
              <button type="button" onClick={() => setShowAIWriter(false)} className={secondaryBtn}>{t('messages.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Release all confirmation modal */}
      {confirmReleaseAll && (
        <Modal title={t('messages.releaseAllModal.title')} onClose={() => setConfirmReleaseAll(false)}>
          <div className="space-y-4">
            <p className="text-sm text-stone-700 leading-relaxed">
              <Trans t={t} i18nKey="messages.releaseAllModal.body" count={unreleased.length} values={{ count: unreleased.length }} components={{ b: <strong /> }} />
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              {t('messages.releaseAllModal.warning')}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={doReleaseAll}
                disabled={releasing === 'all'}
                className={`${primaryBtn} flex-1`}
              >
                {releasing === 'all' ? t('messages.releasing') : t('messages.releaseAllModal.confirm', { count: unreleased.length })}
              </button>
              <button onClick={() => setConfirmReleaseAll(false)} className={secondaryBtn}>{t('messages.cancel')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Compose modal */}
      {showCompose && (
        <Modal title={t('messages.compose.title')} onClose={() => setShowCompose(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">{t('messages.compose.typeLabel')}</label>
              <div className="grid grid-cols-3 gap-2.5">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setMedia(null); setSaveError(null); setForm(p => ({ ...p, type: opt.value })) }}
                    className={`flex flex-col gap-1 items-start p-3 rounded-xl border text-left transition-colors ${
                      form.type === opt.value ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-300' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <opt.icon size={16} className={form.type === opt.value ? 'text-navy-700' : 'text-stone-400'} />
                    <p className="text-xs font-semibold text-navy-900">{t(`messages.type.${opt.value}.label`)}</p>
                    <p className="text-[10px] text-stone-400 leading-snug">{t(`messages.type.${opt.value}.desc`)}</p>
                  </button>
                ))}
              </div>
            </div>

            <Field label={t('messages.compose.titleField')} required>
              <input
                className={input}
                placeholder={form.type === 'video' ? t('messages.compose.titlePlaceholderVideo') : t('messages.compose.titlePlaceholder')}
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Field>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">{t('messages.compose.recipient')} <span className="text-red-400">*</span></label>
              <div className="inline-flex p-0.5 bg-stone-100 rounded-full mb-2.5 text-xs font-semibold">
                <button type="button" onClick={() => setForm(p => ({ ...p, recipient_kind: 'person' }))} className={`px-3 py-1.5 rounded-full transition-colors ${form.recipient_kind === 'person' ? 'bg-white shadow-sm text-navy-900' : 'text-stone-500'}`}>{t('messages.compose.kindPerson')}</button>
                <button type="button" onClick={() => setForm(p => ({ ...p, recipient_kind: 'email' }))} className={`px-3 py-1.5 rounded-full transition-colors ${form.recipient_kind === 'email' ? 'bg-white shadow-sm text-navy-900' : 'text-stone-500'}`}>{t('messages.compose.kindEmail')}</button>
              </div>
              {form.recipient_kind === 'person' ? (
                <select
                  className={input}
                  value={form.recipient_name}
                  onChange={e => { const person = people.find(p => p.name === e.target.value); setForm(p => ({ ...p, recipient_name: e.target.value, recipient_role: person?.role || '' })) }}
                  required
                >
                  <option value="" disabled>{t('messages.compose.selectPerson')}</option>
                  {people.length > 0
                    ? people.map(p => <option key={p.id} value={p.name}>{p.name}, {roleLabel(t, p.role)}</option>)
                    : <option disabled>{t('messages.compose.noPeople')}</option>}
                </select>
              ) : (
                <div className="space-y-2">
                  <input className={input} type="text" placeholder={t('messages.compose.namePlaceholder')} value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))} />
                  <input className={input} type="email" placeholder={t('messages.compose.emailPlaceholder')} value={form.recipient_email} onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))} required />
                  <p className="text-[11px] text-stone-400 leading-snug">{t('messages.compose.emailHint')}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">{t('messages.timing.question')}</label>
              <div className="grid grid-cols-2 gap-2.5">
                {TIMING_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, release_timing: opt.value }))}
                    className={`flex flex-col gap-1 items-start p-3 rounded-xl border text-left transition-colors ${
                      form.release_timing === opt.value ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-300' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-navy-900">{t(`messages.timing.${opt.id}.label`)}</p>
                    <p className="text-[10px] text-stone-400 leading-snug">{t(`messages.timing.${opt.id}.desc`)}</p>
                  </button>
                ))}
              </div>
              {form.release_timing === 'on_date' && (
                <div className="mt-2.5">
                  <input
                    className={input}
                    type="date"
                    min={localTomorrow()}
                    value={form.release_at}
                    onChange={e => setForm(p => ({ ...p, release_at: e.target.value }))}
                    required
                  />
                  <p className="text-[11px] text-stone-400 leading-snug mt-1.5">{form.recipient_kind === 'email' ? t('messages.compose.dateHintEmail') : t('messages.compose.dateHint')}</p>
                </div>
              )}
            </div>

            {form.type === 'note' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-600">{t('messages.compose.messageLabel')} <span className="text-red-400">*</span></label>
                  {form.recipient_name && aiEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => setShowAIWriter(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2.5 py-1.5 rounded-full hover:bg-sage-100 transition-colors"
                    >
                      <Sparkles size={11} /> {t('messages.ai.helpBtn')}
                    </button>
                  )}
                </div>
                <textarea
                  className={`${input} min-h-[140px] resize-y`}
                  placeholder={t('messages.compose.contentPlaceholder')}
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  required
                />
              </div>
            )}

            {(form.type === 'video' || form.type === 'photo') && (
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">{form.type === 'video' ? t('messages.compose.yourVideo') : t('messages.compose.yourPhoto')} <span className="text-red-400">*</span></label>
                {mediaPreview ? (
                  <div className="rounded-xl border border-stone-200 overflow-hidden">
                    {form.type === 'video'
                      ? <video src={mediaPreview} controls playsInline className="w-full max-h-72 bg-black" />
                      : <img src={mediaPreview} alt={t('messages.compose.previewAlt')} className="w-full max-h-72 object-contain bg-stone-50" />}
                    <button type="button" onClick={() => setMedia(null)} className="w-full text-xs font-semibold text-stone-500 hover:text-navy-800 py-2.5 transition-colors border-t border-stone-100">{t('messages.compose.removeMedia')}</button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {form.type === 'video' && <RecordVideo onCapture={(f) => { setMedia(f); setSaveError(null) }} />}
                    <label className="flex items-center justify-center gap-2 cursor-pointer text-sm font-medium text-navy-700 border border-dashed border-stone-300 rounded-xl py-3 hover:bg-stone-50 transition-colors">
                      <Upload size={15} /> {form.type === 'video' ? t('messages.compose.uploadVideo') : t('messages.compose.uploadPhoto')}
                      <input type="file" accept={form.type === 'video' ? 'video/*' : 'image/*'} className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) { setMedia(f); setSaveError(null) } }} />
                    </label>
                    <p className="text-[11px] text-stone-400 leading-snug text-center">{form.type === 'video' ? t('messages.compose.videoHint') : t('messages.compose.photoHint')}</p>
                  </div>
                )}
              </div>
            )}

            {saveError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{saveError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('messages.saving') : t('messages.compose.submit')}
              </button>
              <button type="button" onClick={() => setShowCompose(false)} className={secondaryBtn}>{t('messages.cancel')}</button>
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

// Must mirror NAV_ITEMS exactly (minus 'overview', 'people', 'alerts', 'activity')
// `key` and every entry in `subOptions` are STORED access-grant values, never
// translated. Labels come from people.access.* keyed by those same values.
const ACCESS_AREAS = [
  {
    key: 'accounts', icon: Landmark,
    subKey: 'accountCategories',
    subOptions: ['Banking', 'Retirement', 'Investment', 'Insurance', 'Digital', 'Property', 'Other'],
  },
  {
    key: 'documents', icon: FileText,
    subKey: 'documentTypes',
    subOptions: ['Legal', 'Insurance', 'Property', 'Medical', 'Personal', 'Financial', 'Other'],
  },
  { key: 'messages',      icon: MessageSquare },
  { key: 'instructions',  icon: BookOpen },
  { key: 'subscriptions', icon: CreditCard },
]

const ALL_AREA_KEYS = ACCESS_AREAS.map(a => a.key)

// Stored person.role values paired with the id used to look up their label.
// The value is what goes to the database, the id only picks the translation.
const PERSON_ROLES = [
  { group: 'full',         value: 'Spouse / Partner',   id: 'spousePartner' },
  { group: 'estate',       value: 'Primary Executor',   id: 'primaryExecutor' },
  { group: 'estate',       value: 'Secondary Executor', id: 'secondaryExecutor' },
  { group: 'estate',       value: 'Solicitor',          id: 'solicitor' },
  { group: 'family',       value: 'Family Member',      id: 'familyMember' },
  { group: 'family',       value: 'Family Caretaker',   id: 'familyCaretaker' },
  { group: 'professional', value: 'Financial Adviser',  id: 'financialAdviser' },
  { group: 'professional', value: 'Healthcare Proxy',   id: 'healthcareProxy' },
]
const ROLE_GROUP_KEYS = ['full', 'estate', 'family', 'professional']
const FULL_ACCESS_ROLE = 'Spouse / Partner'

// Display label for a stored role value. Unknown/legacy values render as stored.
function roleLabel(t, value) {
  const match = PERSON_ROLES.find(r => r.value === value)
  return match ? t(`people.role.${match.id}`) : value
}

// Stored access_grants.accessTiming values paired with their label id.
const ACCESS_TIMINGS = [
  { value: 'always',      id: 'always' },
  { value: 'after_death', id: 'afterDeath' },
]

// Checkbox with tick mark
function Checkbox({ checked }) {
  return (
    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
      checked ? 'bg-navy-800 border-navy-800' : 'border-stone-300 bg-white'
    }`}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

// The invite / edit form — shared by both invite modal and edit modal
function PersonAccessForm({ initial, onSave, onCancel, saving, submitLabel }) {
  const { t } = useTranslation('dashboard')
  const emptyForm = {
    name: '', email: '', role: '',
    accessAreas: [],
    accountCategories: [],
    documentTypes: [],
    accessTiming: 'always', // 'always' | 'after_death'
  }
  const [form, setForm] = useState(initial ?? emptyForm)
  const [accessError, setAccessError] = useState(null)

  const isFullAccess = form.role === FULL_ACCESS_ROLE

  const toggleArea = (key) => {
    setForm(p => {
      const next = p.accessAreas.includes(key)
        ? p.accessAreas.filter(k => k !== key)
        : [...p.accessAreas, key]
      // Clear sub-selections when unchecking parent
      const area = ACCESS_AREAS.find(a => a.key === key)
      const patch = { accessAreas: next }
      if (area?.subKey && !next.includes(key)) patch[area.subKey] = []
      return { ...p, ...patch }
    })
  }

  const toggleSub = (subKey, val) => {
    setForm(p => ({
      ...p,
      [subKey]: p[subKey].includes(val)
        ? p[subKey].filter(v => v !== val)
        : [...p[subKey], val],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isFullAccess && form.accessAreas.length === 0) {
      setAccessError(t('people.form.errorNoArea'))
      return
    }
    setAccessError(null)
    const payload = {
      ...form,
      accessAreas: isFullAccess ? ALL_AREA_KEYS : form.accessAreas,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Email — only shown when inviting (no initial.id) */}
      {!initial?.id && (
        <>
          <Field label={t('people.form.name')} required>
            <input className={input} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('people.form.namePlaceholder')} required />
          </Field>
          <Field label={t('people.form.email')} required>
            <input type="email" className={input} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder={t('people.form.emailPlaceholder')} required />
          </Field>
        </>
      )}

      <Field label={t('people.form.role')} required>
        <select
          className={input}
          value={form.role}
          onChange={e => setForm(p => ({...p, role: e.target.value, accessAreas: [], accountCategories: [], documentTypes: []}))}
          required
        >
          <option value="" disabled>{t('people.form.selectRole')}</option>
          {ROLE_GROUP_KEYS.map(group => (
            <optgroup key={group} label={t(`people.roleGroup.${group}`)}>
              {PERSON_ROLES.filter(r => r.group === group).map(r => (
                <option key={r.value} value={r.value}>{t(`people.role.${r.id}`)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      {form.role && (
        <>
          {/* ── Access areas ── */}
          {isFullAccess ? (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3">
              <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                <Trans
                  t={t}
                  i18nKey="people.form.fullAccessNote"
                  values={{ role: roleLabel(t, FULL_ACCESS_ROLE) }}
                  components={{ b: <span className="font-semibold" /> }}
                />
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-stone-600 mb-1">{t('people.form.accessAreas')} <span className="text-red-500">*</span></p>
              <p className="text-xs text-stone-400 mb-3">{t('people.form.accessAreasHint')}</p>
              <div className="space-y-2">
                {ACCESS_AREAS.map(area => {
                  const checked = form.accessAreas.includes(area.key)
                  const Icon = area.icon
                  return (
                    <div key={area.key}>
                      <button
                        type="button"
                        onClick={() => toggleArea(area.key)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors ${
                          checked ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-200' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <Checkbox checked={checked} />
                        <Icon size={14} className={checked ? 'text-navy-600' : 'text-stone-400'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-900">{t(`people.access.area.${area.key}.label`)}</p>
                          <p className="text-xs text-stone-400">{t(`people.access.area.${area.key}.desc`)}</p>
                        </div>
                      </button>

                      {/* Sub-selector: shown when area is checked and has sub-options */}
                      {checked && area.subOptions && (
                        <div className="ml-7 mt-1.5 pl-3 border-l-2 border-navy-100 space-y-1.5 pb-1">
                          <p className="text-xs text-stone-500 font-medium mb-1">{t(`people.access.area.${area.key}.subLabel`)}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {area.subOptions.map(opt => {
                              const subChecked = form[area.subKey].includes(opt)
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleSub(area.subKey, opt)}
                                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                    subChecked
                                      ? 'bg-navy-800 text-white border-navy-800'
                                      : 'bg-white text-stone-600 border-stone-300 hover:border-navy-300 hover:text-navy-700'
                                  }`}
                                >
                                  {t(`people.access.${area.subKey}.${opt}`)}
                                </button>
                              )
                            })}
                          </div>
                          {form[area.subKey].length === 0 && (
                            <p className="text-xs text-stone-400 italic">{t('people.form.allTypes')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Access timing ── */}
          <div>
            <p className="text-xs font-semibold text-stone-600 mb-1">{t('people.form.timingQuestion')}</p>
            <p className="text-xs text-stone-400 mb-3">{t('people.form.timingHint')}</p>
            <div className="grid grid-cols-2 gap-2">
              {ACCESS_TIMINGS.map(opt => {
                const sel = form.accessTiming === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({...p, accessTiming: opt.value}))}
                    className={`flex flex-col items-start gap-1 px-3.5 py-3 rounded-xl border text-left transition-colors ${
                      sel ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-200' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox checked={sel} />
                      <span className="text-sm font-medium text-navy-900">{t(`people.timing.${opt.id}.label`)}</span>
                    </div>
                    <p className="text-xs text-stone-400 pl-6">{t(`people.timing.${opt.id}.desc`)}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {accessError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{accessError}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
          {saving ? t('people.form.saving') : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>{t('people.form.cancel')}</button>
      </div>
    </form>
  )
}

function PeopleSection({ people, loading, invite, resendInvite, updatePerson, removePerson, planLimits, profile, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  const [showInvite, setShowInvite] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sectionError, setSectionError] = useState(null)

  const handleInvite = async (payload) => {
    setSaving(true)
    try {
      await invite(payload)
      setShowInvite(false)
    } catch (err) { setSectionError(friendlyLimitError(err, t('people.errors.inviteFailed'))) }
    finally { setSaving(false) }
  }

  const handleEdit = async (payload) => {
    setSaving(true)
    try {
      await updatePerson(editingPerson.id, payload)
      setEditingPerson(null)
    } catch (err) { setSectionError(err.message ?? t('people.errors.saveFailed')) }
    finally { setSaving(false) }
  }

  const handleRemove = async (person) => {
    if (!window.confirm(t('people.confirmRemove', { name: person.name ?? t('people.thisPerson') }))) return
    try { await removePerson(person.id) }
    catch (err) { setSectionError(err.message ?? t('people.errors.removeFailed')) }
  }

  // Build a readable access summary for each person card
  const accessSummary = (person) => {
    const areas = person.access_grants?.accessAreas ?? []
    if (!areas.length) return t('people.access.none')
    if (areas.length === ALL_AREA_KEYS.length) return t('people.access.full')
    return areas
      .map(k => ACCESS_AREAS.some(a => a.key === k) ? t(`people.access.area.${k}.label`) : k)
      .join(', ')
  }

  const timingLabel = (person) => {
    const stored = person.access_grants?.accessTiming
    return stored === 'after_death' ? t('people.timing.afterDeath.label') : t('people.timing.aliveShort')
  }

  const contactLimit = getLimit(profile?.plan, 'trustedPeople')
  const atLimit = isAtLimit(profile?.plan, 'trustedPeople', people.length)

  return (
    <SectionShell
      title={t('people.title')}
      subtitle={contactLimit !== null
        ? t('people.subtitleLimited', { n: people.length, limit: contactLimit })
        : t('people.subtitle', { count: people.length })}
      action={
        atLimit
          ? (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-2 hover:bg-amber-100 transition-colors"
            >
              <Lock size={14} /> {t('people.limitReached')}
            </button>
          )
          : <button onClick={() => setShowInvite(true)} className={primaryBtn}><Plus size={15} />{t('people.invitePerson')}</button>
      }
    >
      {/* How access is released — reassurance at the moment of assigning access */}
      <div className="mb-4 flex items-start gap-3 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
        <ShieldCheck size={15} className="text-sage-700 mt-0.5 shrink-0" />
        <p className="text-sm text-stone-600 flex-1 leading-relaxed">
          {t('people.releaseNote')}{' '}
          <a href="/security" target="_blank" rel="noopener noreferrer" className="font-medium text-sage-800 underline underline-offset-2 hover:text-sage-900 whitespace-nowrap">{t('people.releaseLink')}</a>
        </p>
      </div>
      {sectionError && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{sectionError}</p>
          <button onClick={() => setSectionError(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}
      {atLimit && (
        <PlanLimitNotice
          plan={profile?.plan}
          limit={getLimit(profile?.plan, 'trustedPeople')}
          noun="trustedContact"
          benefit={t('people.limitBenefit')}
          onUpgrade={onUpgrade}
        />
      )}
      {loading ? <LoadingSpinner /> : people.length === 0 ? (
        <EmptyState icon={Users} label={t('people.empty')} action={t('people.emptyAction')} onAction={() => setShowInvite(true)} />
      ) : (
        <div className="space-y-3">
          {people.map(person => (
            <div key={person.id} className="bg-white border border-stone-200 rounded-xl px-5 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-bold text-navy-700 uppercase shrink-0 mt-0.5">
                {person.name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-navy-900 text-sm">{person.name}</p>
                  <span className="text-xs text-stone-400">{roleLabel(t, person.role)}</span>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    person.invite_status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    person.invite_status === 'declined' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {t(`people.inviteStatus.${person.invite_status}`, { defaultValue: person.invite_status })}
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{person.email}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="text-xs text-stone-500"><span className="font-medium text-stone-600">{t('people.accessLabel')}</span> {accessSummary(person)}</span>
                  <span className="text-xs text-stone-500"><span className="font-medium text-stone-600">{t('people.timingLabel')}</span> {timingLabel(person)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {person.invite_status === 'pending' && (
                  <button onClick={() => resendInvite(person.id)} className="text-xs text-navy-600 hover:text-navy-900 font-medium px-2 py-1 rounded-full hover:bg-navy-50 transition-colors">
                    {t('people.resend')}
                  </button>
                )}
                <button
                  onClick={() => setEditingPerson(person)}
                  className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50"
                  title={t('people.editAccess')}
                  aria-label={t('people.editAccessAria', { name: person.name })}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleRemove(person)}
                  className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  title={t('people.removePerson')}
                  aria-label={t('people.removeAria', { name: person.name })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <Modal title={t('people.inviteModalTitle')} onClose={() => setShowInvite(false)}>
          <PersonAccessForm
            onSave={handleInvite}
            onCancel={() => setShowInvite(false)}
            saving={saving}
            submitLabel={t('people.sendInvite')}
          />
        </Modal>
      )}

      {editingPerson && (
        <Modal title={t('people.editModalTitle', { name: editingPerson.name })} onClose={() => setEditingPerson(null)}>
          <PersonAccessForm
            initial={{
              id: editingPerson.id,
              role: editingPerson.role,
              accessAreas: editingPerson.access_grants?.accessAreas ?? [],
              accountCategories: editingPerson.access_grants?.accountCategories ?? [],
              documentTypes: editingPerson.access_grants?.documentTypes ?? [],
              accessTiming: editingPerson.access_grants?.accessTiming ?? 'always',
            }}
            onSave={handleEdit}
            onCancel={() => setEditingPerson(null)}
            saving={saving}
            submitLabel={t('people.saveChanges')}
          />
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// INSTRUCTIONS SECTION
// ─────────────────────────────────────────────────────────────
// Stored instructions.category values paired with the id used to look up their label.
// The value is what goes to the database (and must mirror the DB CHECK constraint),
// the id only picks the translation.
const INSTRUCTION_CATEGORIES = [
  { value: 'Immediate', id: 'immediate' },
  { value: 'Financial', id: 'financial' },
  { value: 'Legal',     id: 'legal' },
  { value: 'Household', id: 'household' },
  { value: 'Medical',   id: 'medical' },
  { value: 'Personal',  id: 'personal' },
  { value: 'Other',     id: 'other' },
]

// Stored instructions.audience values. 'Advisor' is a legacy spelling that can still
// be stored, so it maps to a label but is never offered in the picker.
const INSTRUCTION_AUDIENCES = [
  { value: 'Executor',         id: 'executor' },
  { value: 'Family',           id: 'family' },
  { value: 'Healthcare Proxy', id: 'healthcareProxy' },
  { value: 'Adviser',          id: 'adviser' },
  { value: 'Everyone',         id: 'everyone' },
]
const INSTRUCTION_AUDIENCE_ALIASES = [{ value: 'Advisor', id: 'adviser' }]

// Display labels for stored values. Unknown/legacy values render as stored.
function instructionCategoryLabel(t, value) {
  const match = INSTRUCTION_CATEGORIES.find(c => c.value === value)
  return match ? t(`instructions.category.${match.id}`) : value
}
function instructionAudienceLabel(t, value) {
  const match = [...INSTRUCTION_AUDIENCES, ...INSTRUCTION_AUDIENCE_ALIASES].find(a => a.value === value)
  return match ? t(`instructions.audience.${match.id}`) : value
}

function InstructionsSection({ instructions, loading, add, update, remove, profile, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  const emptyForm = { title: '', category: 'Immediate', audience: 'Executor', body: '', stepsText: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingInstruction, setEditingInstruction] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // ── AI writing assistant (conversational) ──
  const openingThread = () => [{ role: 'assistant', content: t('instructions.assistant.greeting') }]
  const [showAssistant, setShowAssistant] = useState(false)
  const [assistantMessages, setAssistantMessages] = useState(openingThread)
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [parsedSuggestion, setParsedSuggestion] = useState(null)

  // ── AI quick-write (5-question form, Feature 1) ──
  const [showQuickWrite, setShowQuickWrite] = useState(false)
  const [quickWriteForm, setQuickWriteForm] = useState({ purpose: '', recipient: '', firstSteps: '', resources: '', additional: '' })
  const [quickWriteLoading, setQuickWriteLoading] = useState(false)

  const handleQuickWrite = async (e) => {
    e.preventDefault()
    if (profile?.ai_features_enabled === false) return
    setQuickWriteLoading(true)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/ai/write-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          ...quickWriteForm,
          userName: profile?.full_name,
        }),
      })
      const data = await res.json()
      if (data.instructions) {
        // Pre-fill the main form with the AI output
        setForm(prev => ({
          ...prev,
          body: data.instructions,
          title: prev.title || quickWriteForm.purpose.slice(0, 60),
          category: 'Immediate',
          // Match the executor wording in either language (a French user types
          // "exécuteur"/"notaire"); accents stripped so "execut" catches both.
          audience: /execut|notaire/.test(
            (quickWriteForm.recipient || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          ) ? 'Executor' : 'Family',
        }))
        setShowQuickWrite(false)
        setShowAdd(true)
        setEditingInstruction(null)
        setQuickWriteForm({ purpose: '', recipient: '', firstSteps: '', resources: '', additional: '' })
      }
    } catch {}
    setQuickWriteLoading(false)
  }

  const sendAssistantMessage = async () => {
    const text = assistantInput.trim()
    if (!text || assistantLoading) return
    const newMessages = [...assistantMessages, { role: 'user', content: text }]
    setAssistantMessages(newMessages)
    setAssistantInput('')
    setAssistantLoading(true)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.access_token) {
        setAssistantMessages(prev => [...prev, { role: 'assistant', content: t('instructions.assistant.previewOnly') }])
        setAssistantLoading(false)
        return
      }
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ type: 'instructions-assistant', messages: newMessages }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const reply = data.reply
      setAssistantMessages(prev => [...prev, { role: 'assistant', content: reply }])
      // Try to parse structured output
      if (reply.includes('TITLE:') && reply.includes('STEPS:')) {
        const titleMatch = reply.match(/TITLE:\s*(.+)/i)
        const categoryMatch = reply.match(/CATEGORY:\s*(.+)/i)
        const forMatch = reply.match(/FOR:\s*(.+)/i)
        const overviewMatch = reply.match(/OVERVIEW:\s*([\s\S]+?)(?=STEPS:|$)/i)
        const stepsMatch = reply.match(/STEPS:\s*([\s\S]+)$/i)
        if (titleMatch && stepsMatch) {
          const stepsRaw = stepsMatch[1].trim()
          const steps = stepsRaw.split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
          // Must mirror the DB CHECK constraint instructions_category_check — 'Digital' is not allowed
          const validCategories = ['Immediate', 'Financial', 'Legal', 'Household', 'Medical', 'Personal', 'Other']
          const validAudiences = ['Executor', 'Family', 'Healthcare Proxy', 'Adviser', 'Advisor', 'Everyone']
          const category = validCategories.find(c => categoryMatch?.[1]?.includes(c)) ?? 'Immediate'
          const audience = validAudiences.find(a => forMatch?.[1]?.includes(a)) ?? 'Executor'
          setParsedSuggestion({
            title: titleMatch[1].trim(),
            category,
            audience,
            body: overviewMatch?.[1]?.trim() ?? '',
            stepsText: steps.join('\n'),
          })
        }
      }
    } catch {
      setAssistantMessages(prev => [...prev, { role: 'assistant', content: t('instructions.assistant.error') }])
    } finally {
      setAssistantLoading(false)
    }
  }

  const applyAssistantSuggestion = () => {
    if (!parsedSuggestion) return
    setForm(parsedSuggestion)
    setShowAssistant(false)
    setEditingInstruction(null)
    setShowAdd(true)
    setParsedSuggestion(null)
    setAssistantMessages(openingThread())
  }

  const closeAssistant = () => {
    setShowAssistant(false)
    setParsedSuggestion(null)
  }

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

  const atInstructionLimit = isAtLimit(profile?.plan, 'instructionSets', instructions.length)

  return (
    <SectionShell
      title={t('instructions.title')}
      subtitle={t('instructions.subtitle', { count: instructions.length })}
      action={
        <div className="flex items-center gap-2">
          {profile?.ai_features_enabled !== false && (
          <button
            onClick={() => setShowQuickWrite(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-sage-50 hover:bg-sage-100 border border-sage-200 px-3 py-2 rounded-full transition-colors"
          >
            <Sparkles size={12} /> {t('instructions.writeWithAi')}
          </button>
          )}
          <button
            onClick={() => setShowAssistant(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 border border-navy-200 px-3 py-2 rounded-full transition-colors"
          >
            <Zap size={12} /> {t('instructions.helpMeWrite')}
          </button>
          <button onClick={atInstructionLimit ? undefined : openAdd} disabled={atInstructionLimit} className={primaryBtn} style={atInstructionLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
            <Plus size={15} />{t('instructions.add')}
          </button>
        </div>
      }
    >
      {atInstructionLimit && (
        <PlanLimitNotice
          plan={profile?.plan}
          limit={getLimit(profile?.plan, 'instructionSets')}
          noun="instructionSet"
          benefit={t('instructions.limitBenefit')}
          onUpgrade={onUpgrade}
        />
      )}
      {loading ? <LoadingSpinner /> : instructions.length === 0 ? (
        <EmptyState icon={BookOpen} label={t('instructions.empty')} action={t('instructions.emptyAction')} onAction={atInstructionLimit ? undefined : openAdd} />
      ) : (
        <div className="space-y-3">
          {instructions.map(inst => (
            <div key={inst.id} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-navy-900 text-sm">{inst.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{t('instructions.meta', { category: instructionCategoryLabel(t, inst.category), audience: instructionAudienceLabel(t, inst.audience) })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-stone-400">
                    {inst.instruction_steps?.length
                      ? t('instructions.steps', { count: inst.instruction_steps.length })
                      : t('instructions.noSteps')}
                  </span>
                  <button onClick={() => openEdit(inst)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={t('instructions.editAria', { title: inst.title })}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(inst.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={t('instructions.deleteAria', { title: inst.title })}>
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

      {/* ── AI quick-write modal (Feature 1) ── */}
      {showQuickWrite && (
        <Modal title={t('instructions.quickWrite.title')} onClose={() => setShowQuickWrite(false)}>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            {t('instructions.quickWrite.intro')}
          </p>
          <form onSubmit={handleQuickWrite} className="space-y-4">
            <Field label={t('instructions.quickWrite.purpose')} required>
              <input
                className={input}
                placeholder={t('instructions.quickWrite.purposePlaceholder')}
                value={quickWriteForm.purpose}
                onChange={e => setQuickWriteForm(p => ({ ...p, purpose: e.target.value }))}
                required
                autoFocus
              />
            </Field>
            <Field label={t('instructions.quickWrite.recipient')}>
              <input
                className={input}
                placeholder={t('instructions.quickWrite.recipientPlaceholder')}
                value={quickWriteForm.recipient}
                onChange={e => setQuickWriteForm(p => ({ ...p, recipient: e.target.value }))}
              />
            </Field>
            <Field label={t('instructions.quickWrite.firstSteps')}>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder={t('instructions.quickWrite.firstStepsPlaceholder')}
                value={quickWriteForm.firstSteps}
                onChange={e => setQuickWriteForm(p => ({ ...p, firstSteps: e.target.value }))}
              />
            </Field>
            <Field label={t('instructions.quickWrite.resources')}>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder={t('instructions.quickWrite.resourcesPlaceholder')}
                value={quickWriteForm.resources}
                onChange={e => setQuickWriteForm(p => ({ ...p, resources: e.target.value }))}
              />
            </Field>
            <Field label={t('instructions.quickWrite.additional')}>
              <input
                className={input}
                placeholder={t('instructions.quickWrite.additionalPlaceholder')}
                value={quickWriteForm.additional}
                onChange={e => setQuickWriteForm(p => ({ ...p, additional: e.target.value }))}
              />
            </Field>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={quickWriteLoading || !quickWriteForm.purpose}
                className={`${primaryBtn} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {quickWriteLoading ? <><Loader2 size={14} className="animate-spin" />{t('instructions.quickWrite.writing')}</> : <><Sparkles size={14} />{t('instructions.quickWrite.submit')}</>}
              </button>
              <button type="button" onClick={() => setShowQuickWrite(false)} className={secondaryBtn}>{t('instructions.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── AI writing assistant modal ── */}
      {showAssistant && (
        <Modal title={t('instructions.assistant.title')} onClose={closeAssistant}>
          <div className="flex flex-col" style={{ height: '420px' }}>
            {/* Message thread */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
              {assistantMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-navy-800 text-white rounded-br-sm'
                      : 'bg-stone-100 text-navy-900 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {assistantLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                    <Loader2 size={14} className="animate-spin text-stone-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Parsed suggestion — apply to form */}
            {parsedSuggestion && (
              <div className="mb-3 bg-sage-50 border border-sage-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-sage-800">{t('instructions.assistant.readyToUse', { title: parsedSuggestion.title })}</p>
                  <p className="text-xs text-sage-700 mt-0.5">{t('instructions.assistant.suggestionMeta', {
                    steps: t('instructions.steps', { count: parsedSuggestion.stepsText.split('\n').length }),
                    category: instructionCategoryLabel(t, parsedSuggestion.category),
                    audience: instructionAudienceLabel(t, parsedSuggestion.audience),
                  })}</p>
                </div>
                <button
                  onClick={applyAssistantSuggestion}
                  className="shrink-0 text-xs font-semibold text-white bg-sage-600 hover:bg-sage-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {t('instructions.assistant.useThis')}
                </button>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                className={`${input} flex-1`}
                value={assistantInput}
                onChange={e => setAssistantInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAssistantMessage()}
                placeholder={t('instructions.assistant.placeholder')}
                disabled={assistantLoading}
              />
              <button
                onClick={sendAssistantMessage}
                disabled={!assistantInput.trim() || assistantLoading}
                className="shrink-0 btn-aurora text-white px-3 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('instructions.assistant.send')}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {(showAdd || editingInstruction) && (
        <Modal title={editingInstruction ? t('instructions.editTitle') : t('instructions.add')} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('instructions.fields.title')} required>
              <input className={input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={t('instructions.fields.titlePlaceholder')} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('instructions.fields.category')} required>
                <select className={input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {/* VALUES mirror the instructions_category_check constraint and stay English, only labels translate. */}
                  {INSTRUCTION_CATEGORIES.map(option => <option key={option.value} value={option.value}>{t(`instructions.category.${option.id}`)}</option>)}
                </select>
              </Field>
              <Field label={t('instructions.fields.audience')} required>
                <select className={input} value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}>
                  {/* VALUES are stored as-is, only labels translate. */}
                  {INSTRUCTION_AUDIENCES.map(option => <option key={option.value} value={option.value}>{t(`instructions.audience.${option.id}`)}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t('instructions.fields.body')}>
              <textarea className={input} rows={3} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder={t('instructions.fields.bodyPlaceholder')} />
            </Field>
            <Field label={t('instructions.fields.steps')}>
              <textarea className={input} rows={6} value={form.stepsText} onChange={e => setForm(p => ({ ...p, stepsText: e.target.value }))} placeholder={t('instructions.fields.stepsPlaceholder')} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('instructions.saving') : editingInstruction ? t('instructions.saveChanges') : t('instructions.add')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('instructions.cancel')}</button>
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
// Stored subscriptions.billing_cycle values paired with the id used to look up their
// label. Legacy lower-case spellings are still stored on older rows, so they map to a
// label too, but only the two canonical values are offered in the picker.
const BILLING_CYCLES = [
  { value: 'Monthly', id: 'monthly' },
  { value: 'Annual',  id: 'annual' },
]
const BILLING_CYCLE_ALIASES = [
  { value: 'monthly', id: 'monthly' },
  { value: 'yearly',  id: 'annual' },
  { value: 'annual',  id: 'annual' },
]

// Display label for a stored billing cycle. Unknown/legacy values render as stored.
function billingCycleLabel(t, value) {
  const match = [...BILLING_CYCLES, ...BILLING_CYCLE_ALIASES].find(c => c.value === value)
  return match ? t(`subscriptions.cycle.${match.id}`) : value
}

function SubscriptionsSection({ subscriptions: remoteSubs, loading, add, update, remove }) {
  const { t } = useTranslation('dashboard')
  const emptyForm = { name: '', billing_cycle: 'Monthly', amount: '', next_charge_date: '', notes: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  // local fallback list so the section works even if the remote table is unavailable
  const [localSubs, setLocalSubs] = useState([])
  const subscriptions = remoteSubs && remoteSubs.length > 0 ? remoteSubs : localSubs

  const total = subscriptions.reduce((sum, s) => {
    const amount = Number(s.amount || 0)
    const isAnnual = s.billing_cycle === 'yearly' || s.billing_cycle === 'annual' || s.billing_cycle === 'Annual'
    return sum + (isAnnual ? amount / 12 : amount)
  }, 0)

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
      notes: sub.cancel_instructions || '',
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
      // The DB column is cancel_instructions — `notes` does not exist on the
      // subscriptions table, and one unknown key rejects the WHOLE write.
      cancel_instructions: form.notes,
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
      // Never fake success: a phantom row that vanishes on reload is worse
      // than an honest error.
      setSaveError(err?.message || t('subscriptions.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionShell title={t('subscriptions.title')} subtitle={t('subscriptions.subtitle', { total: total.toFixed(2) })} action={<button onClick={openAdd} className={primaryBtn}><Plus size={15} />{t('subscriptions.add')}</button>}>
      {loading ? <LoadingSpinner /> : subscriptions.length === 0 ? (
        <EmptyState icon={CreditCard} label={t('subscriptions.empty')} action={t('subscriptions.emptyAction')} onAction={openAdd} />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-50">
          {subscriptions.map(sub => (
            <div key={sub.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 uppercase">
                {sub.name?.[0] || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy-800 text-sm">{sub.name}</p>
                <p className="text-xs text-stone-400">{t('subscriptions.meta', { cycle: billingCycleLabel(t, sub.billing_cycle), date: sub.next_charge_date ?? '—' })}</p>
                {sub.cancel_instructions && <p className="text-xs text-stone-400 mt-0.5 truncate">{sub.cancel_instructions}</p>}
              </div>
              <p className="font-semibold text-navy-900 text-sm">£{Number(sub.amount || 0).toFixed(2)}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(sub)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={t('subscriptions.editAria', { name: sub.name })}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(sub.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={t('subscriptions.deleteAria', { name: sub.name })}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editingSubscription) && (
        <Modal title={editingSubscription ? t('subscriptions.editTitle') : t('subscriptions.add')} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('subscriptions.fields.name')} required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('subscriptions.fields.namePlaceholder')} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('subscriptions.fields.cycle')}>
                <select className={input} value={form.billing_cycle} onChange={e => setForm(p => ({ ...p, billing_cycle: e.target.value }))}>
                  {/* VALUES are stored on the subscriptions row and stay English, only labels translate. */}
                  {BILLING_CYCLES.map(option => <option key={option.value} value={option.value}>{t(`subscriptions.cycle.${option.id}`)}</option>)}
                </select>
              </Field>
              <Field label={t('subscriptions.fields.amount')} required>
                <input type="number" min="0" step="0.01" className={input} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder={t('subscriptions.fields.amountPlaceholder')} required />
              </Field>
            </div>
            <Field label={t('subscriptions.fields.nextCharge')}>
              <input type="date" className={input} value={form.next_charge_date} onChange={e => setForm(p => ({ ...p, next_charge_date: e.target.value }))} />
            </Field>
            <Field label={t('subscriptions.fields.notes')}>
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('subscriptions.fields.notesPlaceholder')} />
            </Field>
            {saveError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('subscriptions.saving') : editingSubscription ? t('subscriptions.saveChanges') : t('subscriptions.add')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('subscriptions.cancel')}</button>
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
  const { t } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const [expanded, setExpanded] = useState(null)
  const unread = alerts.filter(a => !a.is_read).length

  return (
    <SectionShell
      title={t('alerts.title')}
      subtitle={unread > 0 ? t('alerts.unread', { count: unread }) : t('alerts.allCaughtUp')}
      action={
        unread > 0
          ? <button onClick={markAllRead} className={secondaryBtn}><CheckCheck size={15} />{t('alerts.markAllRead')}</button>
          : null
      }
    >
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <EmptyState icon={Bell} label={t('alerts.empty')} action={t('alerts.emptyAction')} />
        ) : alerts.map(a => {
          const { bar, badge, icon: Icon } = SEVERITY_STYLES[a.severity]
          const isExpanded = expanded === a.id
          return (
            <div
              key={a.id}
              className={`bg-white border rounded-xl overflow-hidden transition-all ${
                a.is_read ? 'border-stone-100 opacity-60' : 'border-stone-200'
              } ${isExpanded ? 'shadow-sm' : ''}`}
            >
              {/* Summary row — click to expand */}
              <button
                type="button"
                className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : a.id)}
              >
                <div className={`w-1 rounded-full self-stretch shrink-0 ${bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-medium text-sm ${a.is_read ? 'text-stone-500' : 'text-navy-900'}`}>{a.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* severity VALUES are stored, only the badge label translates. */}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge}`}>{t(`alerts.severity.${a.severity}`, { defaultValue: a.severity })}</span>
                      {!a.is_read && <span className="w-2 h-2 rounded-full bg-navy-600 shrink-0" />}
                      <ChevronRight size={14} className={`text-stone-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </p>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-stone-100 space-y-3">
                  {a.detail && (
                    <p className="text-sm text-stone-600 leading-relaxed">{a.detail}</p>
                  )}
                  {!a.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(a.id) }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-navy-200 bg-navy-50 hover:bg-navy-100 px-3 py-2 rounded-full transition-colors"
                    >
                      <CheckCircle2 size={13} /> {t('alerts.markRead')}
                    </button>
                  )}
                </div>
              )}
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
// Stored activity_log.action values paired with the id used to look up their label.
// Anything not listed (server-added actions) falls back to the raw stored value.
const ACTIVITY_ACTIONS = [
  { value: 'account.created',      id: 'accountCreated' },
  { value: 'account.updated',      id: 'accountUpdated' },
  { value: 'account.deleted',      id: 'accountDeleted' },
  { value: 'document.uploaded',    id: 'documentUploaded' },
  { value: 'document.updated',     id: 'documentUpdated' },
  { value: 'document.deleted',     id: 'documentDeleted' },
  { value: 'person.invited',       id: 'personInvited' },
  { value: 'person.updated',       id: 'personUpdated' },
  { value: 'person.removed',       id: 'personRemoved' },
  { value: 'instruction.created',  id: 'instructionCreated' },
  { value: 'instruction.updated',  id: 'instructionUpdated' },
  { value: 'instruction.deleted',  id: 'instructionDeleted' },
  { value: 'subscription.created', id: 'subscriptionCreated' },
  { value: 'subscription.updated', id: 'subscriptionUpdated' },
  { value: 'subscription.deleted', id: 'subscriptionDeleted' },
  { value: 'message.created',      id: 'messageCreated' },
  { value: 'message.updated',      id: 'messageUpdated' },
  { value: 'message.released',     id: 'messageReleased' },
  { value: 'message.deleted',      id: 'messageDeleted' },
  { value: 'profile.updated',      id: 'profileUpdated' },
]

// Display label for a stored action. Unknown values keep the previous rendering.
function activityActionLabel(t, action) {
  const match = ACTIVITY_ACTIONS.find(a => a.value === action)
  return match ? t(`activity.action.${match.id}`) : String(action ?? '').replace('.', ' ')
}

function ActivitySection({ activity, loading }) {
  const { t } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  return (
    <SectionShell title={t('activity.title')} subtitle={t('activity.subtitle')}>
      {loading ? <LoadingSpinner /> : activity.length === 0 ? (
        <EmptyState icon={Activity} label={t('activity.empty')} action={t('activity.emptyAction')} />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-50">
          {activity.map(event => (
            <div key={event.id} className="flex items-start gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={14} className="text-navy-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-navy-800">
                  <span className="font-medium">{activityActionLabel(t, event.action)}</span>
                  {event.resource_name && <span className="text-stone-500">{t('activity.resourceSuffix', { name: event.resource_name })}</span>}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {new Date(event.created_at).toLocaleString(dateLocale)}
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
// RESOURCES SECTION (owner)
// ─────────────────────────────────────────────────────────────
// Guide structure only. `id` picks the translated title and `items` are the
// translated label/detail pairs under resources.guides.<id>.items.<itemId>.
const OWNER_GUIDES = [
  {
    id: 'accounts',
    icon: Landmark,
    color: 'bg-blue-50 text-blue-700',
    items: ['bank', 'savings', 'pensions', 'investments', 'property', 'insurance', 'digital', 'subscriptions'],
  },
  {
    id: 'documents',
    icon: FileText,
    color: 'bg-emerald-50 text-emerald-700',
    items: ['will', 'lpa', 'identity', 'certificates', 'deeds', 'insurance', 'funeral', 'letterOfWishes'],
  },
  {
    id: 'people',
    icon: Users,
    color: 'bg-violet-50 text-violet-700',
    items: ['executor', 'lpaHolder', 'nextOfKin', 'solicitor', 'adviser', 'accountant', 'accessLevel'],
  },
  {
    id: 'instructions',
    icon: BookOpen,
    color: 'bg-amber-50 text-amber-700',
    items: ['first48', 'funeral', 'digital', 'property', 'business', 'messages'],
  },
  {
    id: 'messages',
    icon: MessageSquare,
    color: 'bg-rose-50 text-rose-700',
    items: ['what', 'when', 'write', 'plan'],
  },
]

function OwnerResourceCard({ guide, expanded, onToggle }) {
  const { t } = useTranslation('dashboard')
  const Icon = guide.icon
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-stone-50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${guide.color}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-900 text-sm">{t(`resources.guides.${guide.id}.title`)}</p>
          <p className="text-xs text-stone-400 mt-0.5">{t('resources.topics', { count: guide.items.length })}</p>
        </div>
        <ChevronRight size={16} className={`text-stone-400 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-stone-100 divide-y divide-stone-50">
          {guide.items.map(itemId => (
            <div key={itemId} className="px-6 py-4">
              <p className="text-sm font-semibold text-navy-800 mb-1">{t(`resources.guides.${guide.id}.items.${itemId}.label`)}</p>
              <p className="text-sm text-stone-500 leading-relaxed">{t(`resources.guides.${guide.id}.items.${itemId}.detail`)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResourcesSection() {
  const { t } = useTranslation('dashboard')
  const [expandedIndex, setExpandedIndex] = useState(null)
  const toggle = i => setExpandedIndex(v => v === i ? null : i)

  return (
    <SectionShell
      title={t('resources.title')}
      subtitle={t('resources.subtitle')}
    >
      <div className="space-y-3">
        {OWNER_GUIDES.map((guide, i) => (
          <OwnerResourceCard
            key={guide.id}
            guide={guide}
            expanded={expandedIndex === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>

      <div className="mt-6 bg-navy-50 border border-navy-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-navy-900 text-sm">{t('resources.needHelp')}</p>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{t('resources.needHelpBody')}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <a href="mailto:support@everstead.care" className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-300 rounded-full px-3 py-2 hover:bg-navy-100 transition-colors">
            <MessageSquare size={13} /> {t('resources.emailSupport')}
          </a>
          <a href="/resources" className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-300 rounded-full px-3 py-2 hover:bg-navy-100 transition-colors">
            <ExternalLink size={13} /> {t('resources.resourcesLink')}
          </a>
        </div>
      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// SETTINGS SECTION
// ─────────────────────────────────────────────────────────────
function ManageBillingButton() {
  const { t } = useTranslation('dashboard')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState(null)
  const handleClick = async () => {
    setLoading(true); setErr(null)
    try { await redirectToCustomerPortal() }
    catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }
  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-200 rounded-full px-3 py-2 hover:bg-navy-50 transition-colors disabled:opacity-50"
      >
        <ExternalLink size={13} /> {loading ? t('settings.billing.opening') : t('settings.billing.manage')}
      </button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// REFERRAL LINK BOX
// ─────────────────────────────────────────────────────────────
function ReferralLinkBox({ referralCode }) {
  const { t } = useTranslation('dashboard')
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/get-started?ref=${referralCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-600 font-mono truncate">
        {link}
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold btn-aurora text-white px-3.5 py-2.5 rounded-full hover:bg-navy-800 transition-colors"
      >
        {copied ? <><Check size={13} />{t('settings.referral.copied')}</> : <><Copy size={13} />{t('settings.referral.copy')}</>}
      </button>
    </div>
  )
}

// Native-only (iOS) biometric unlock. On the web build this is a no-op — the full
// implementation depends on the native modules (lib/platform, components/native)
// that belong to the mobile app work and are not part of this web branch.
function BiometricLockSetting() {
  return null
}

function SettingsSection({ profile, isDemo, updateProfile, refreshProfile, onUpgrade, onDeleteAccount, upgradeError }) {
  const { t } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  // Everstead+ is the self-serve upgrade for Free and grandfathered Essential users.
  // Essential is retired, so it only appears for someone already on it (never offered
  // to Free or new users).
  // `id` values are the stored plan keys, plan names come from PLAN_LABELS untranslated.
  const PLANS = [
    ...(profile.plan === 'essential'
      ? [{ id: 'essential', name: PLAN_LABELS.essential, tier: 1, monthly: PRICING.essential.monthly.perMonth, yearly: PRICING.essential.annual.perMonth, desc: t('settings.plans.essential') }]
      : []),
    { id: 'family', name: PLAN_LABELS.family, tier: 2, monthly: PRICING.family.monthly.perMonth, yearly: PRICING.family.annual.perMonth, desc: t('settings.plans.family') },
  ]
  const PLAN_TIERS = { free: 0, essential: 1, family: 2, advisor: 3 }
  const currentTier   = PLAN_TIERS[profile.plan] ?? 0
  // Free users have no Stripe subscription, so billing-portal and cancel actions must
  // not show for them (they'd hit Stripe with no customer/subscription and error).
  const isFreeTier    = profile.plan === 'free'
  // Local overrides — set immediately after API calls so the UI doesn't wait on refreshProfile
  const [localSubStatus, setLocalSubStatus] = useState(null)
  const [localCancelAt,  setLocalCancelAt]  = useState(null)

  // Effective values: local override wins, falls back to profile from Supabase
  const effectiveStatus = localSubStatus ?? profile.subscription_status
  const effectiveCancelAt = localCancelAt ?? profile.cancel_at

  const isTrialing    = effectiveStatus === 'trialing'
  const isCancelling  = effectiveStatus === 'cancelling'
  const isCancelled   = ['cancelled', 'canceled'].includes(effectiveStatus)

  // Format the access-end date
  const cancelAtDate = effectiveCancelAt
    ? new Date(effectiveCancelAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const [billingCycle, setBillingCycle] = useState('yearly')
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling]       = useState(false)
  const [cancelError, setCancelError]     = useState(null)

  // Data export
  const [exporting, setExporting]       = useState(false)
  const [exportDone, setExportDone]     = useState(false)
  const [exportError, setExportError]   = useState(null)
  const [reauthOpen, setReauthOpen]     = useState(false)
  const [reauthPassword, setReauthPassword] = useState('')
  const [reauthError, setReauthError]   = useState(null)
  const [reauthBusy, setReauthBusy]     = useState(false)

  // Exporting the whole vault is sensitive, so re-verify the password first —
  // a hijacked open session can't silently download everything.
  const requestExport = () => { setReauthError(null); setReauthPassword(''); setReauthOpen(true) }
  const confirmReauthAndExport = async () => {
    setReauthBusy(true); setReauthError(null)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { user } } = await sb.auth.getUser()
      if (!user?.email) { setReauthError(t('settings.data.reauthNoAccount')); setReauthBusy(false); return }
      const { error } = await sb.auth.signInWithPassword({ email: user.email, password: reauthPassword })
      if (error) { setReauthError(t('settings.data.reauthWrongPassword')); setReauthBusy(false); return }
      setReauthBusy(false); setReauthOpen(false); setReauthPassword('')
      await handleExport()
    } catch {
      setReauthError(t('settings.data.reauthFailed')); setReauthBusy(false)
    }
  }

  const handleExport = async () => {
    if (isDemo) return
    setExporting(true)
    setExportDone(false)
    setExportError(null)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/data/export', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || t('settings.data.exportFailedStatus', { status: res.status }))
      }
      const blob = await res.blob()
      const date = new Date().toISOString().split('T')[0]
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `everstead-export-${date}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportDone(true)
    } catch (err) {
      setExportError(err.message || t('settings.data.exportFailed'))
    } finally {
      setExporting(false)
    }
  }
  const [reactivating, setReactivating]   = useState(false)
  const [reactivateError, setReactivateError] = useState(null)

  // Account deletion
  const [deleteStep, setDeleteStep]       = useState(0) // 0=idle, 1=confirm
  const [deleteChecks, setDeleteChecks]   = useState({ data: false, confirm: false })
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState(null)

  const handleCancelSubscription = async () => {
    if (isDemo) {
      setLocalSubStatus('cancelling')
      setCancelConfirm(false)
      return
    }
    setCancelling(true)
    setCancelError(null)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/stripe/cancel-subscription', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscriptionId: profile.stripe_subscription_id,
          userId:         profile.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('settings.subscription.cancelFailed'))
      // Immediately update local state so UI reflects cancellation without waiting on refreshProfile
      setLocalSubStatus('cancelling')
      setLocalCancelAt(data.cancelAt ?? null)
      setCancelConfirm(false)
      // Also sync profile in context in the background
      refreshProfile?.()
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const handleReactivate = async () => {
    if (isDemo) {
      setLocalSubStatus('active')
      setLocalCancelAt(null)
      return
    }
    setReactivating(true)
    setReactivateError(null)
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/stripe/cancel-subscription', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscriptionId: profile.stripe_subscription_id,
          userId:         profile.id,
          action:         'reactivate',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('settings.subscription.reactivateFailed'))
      // Immediately update local state
      setLocalSubStatus('active')
      setLocalCancelAt(null)
      refreshProfile?.()
    } catch (err) {
      setReactivateError(err.message)
    } finally {
      setReactivating(false)
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDeleteAccount()
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  const [profileForm, setProfileForm] = useState({
    full_name:   profile.full_name   ?? '',
    phone:       profile.phone       ?? '',
    date_of_birth: profile.date_of_birth ?? '',
    address_line1: profile.address_line1 ?? '',
    address_line2: profile.address_line2 ?? '',
    city:        profile.city        ?? '',
    postcode:    profile.postcode    ?? '',
    country:     profile.country     ?? 'United Kingdom',
  })

  // Notification preferences
  const [notifForm, setNotifForm] = useState({
    notify_birthday:        profile.notify_birthday        ?? true,
    notify_annual_review:   profile.notify_annual_review   ?? true,
    notify_trial_reminders: profile.notify_trial_reminders ?? true,
    notify_reengagement:    profile.notify_reengagement    ?? true,
    notify_document_expiry: profile.notify_document_expiry ?? true,
    notify_vault_nudges:    profile.notify_vault_nudges    ?? true,
  })
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved,  setNotifSaved]  = useState(false)

  const handleNotifSave = async () => {
    if (isDemo) { setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000); return }
    setNotifSaving(true)
    try { await updateProfile(notifForm); setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2500) }
    catch {}
    finally { setNotifSaving(false) }
  }

  // AI features master switch (default on). Persists immediately on toggle.
  const [aiEnabled, setAiEnabled] = useState(profile.ai_features_enabled !== false)
  const [aiSaving, setAiSaving]   = useState(false)
  const toggleAi = async () => {
    const next = !aiEnabled
    setAiEnabled(next)
    if (isDemo) return
    setAiSaving(true)
    try { await updateProfile({ ai_features_enabled: next }) }
    catch { setAiEnabled(!next) } // revert on failure
    finally { setAiSaving(false) }
  }
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)

  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg,    setPwMsg]    = useState(null)
  const [profileError, setProfileError] = useState(null)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (isDemo) { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000); return }
    setProfileSaving(true)
    try { await updateProfile(profileForm); setProfileSaved(true); setProfileError(null); setTimeout(() => setProfileSaved(false), 2500) }
    catch (err) { setProfileError(err.message ?? t('settings.profile.saveFailed')) }
    finally { setProfileSaving(false) }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'error', text: t('settings.password.mismatch') }); return }
    if (isDemo) { setPwMsg({ type: 'ok', text: t('settings.password.demo') }); return }
    setPwSaving(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      setPwMsg({ type: 'ok', text: t('settings.password.updated') })
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <SectionShell title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <div className="space-y-6">

        {/* ── Profile details ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-5 flex items-center gap-2">
            <Users size={15} className="text-navy-600" /> {t('settings.profile.heading')}
          </h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('settings.profile.fullName')}>
                <input className={input} value={profileForm.full_name}
                  onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder={t('settings.profile.fullNamePlaceholder')} />
              </Field>
              <Field label={t('settings.profile.email')}>
                <input className={`${input} bg-stone-50 cursor-not-allowed`} value={profile.email} disabled
                  title={t('settings.profile.emailTitle')} />
              </Field>
              <Field label={t('settings.profile.phone')}>
                <input className={input} value={profileForm.phone} type="tel"
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder={t('settings.profile.phonePlaceholder')} />
              </Field>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('settings.profile.dob')}</label>
                <input
                  type="date"
                  className={input}
                  value={profileForm.date_of_birth}
                  onChange={e => setProfileForm(p => ({ ...p, date_of_birth: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-stone-400">{t('settings.profile.dobHint')}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">{t('settings.profile.addressHeading')}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t('settings.profile.address1')}>
                  <input className={input} value={profileForm.address_line1}
                    onChange={e => setProfileForm(p => ({ ...p, address_line1: e.target.value }))}
                    placeholder={t('settings.profile.address1Placeholder')} />
                </Field>
                <Field label={t('settings.profile.address2')}>
                  <input className={input} value={profileForm.address_line2}
                    onChange={e => setProfileForm(p => ({ ...p, address_line2: e.target.value }))}
                    placeholder={t('settings.profile.address2Placeholder')} />
                </Field>
                <Field label={t('settings.profile.city')}>
                  <input className={input} value={profileForm.city}
                    onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}
                    placeholder={t('settings.profile.cityPlaceholder')} />
                </Field>
                <Field label={t('settings.profile.postcode')}>
                  <input className={input} value={profileForm.postcode}
                    onChange={e => setProfileForm(p => ({ ...p, postcode: e.target.value }))}
                    placeholder={t('settings.profile.postcodePlaceholder')} />
                </Field>
                <Field label={t('settings.profile.country')}>
                  <input className={input} value={profileForm.country}
                    onChange={e => setProfileForm(p => ({ ...p, country: e.target.value }))}
                    placeholder={t('settings.profile.countryPlaceholder')} />
                </Field>
              </div>
            </div>

            {profileError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileError}</p>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={profileSaving} className={primaryBtn}>
                {profileSaving ? t('settings.saving') : profileSaved ? t('settings.saved') : t('settings.saveChanges')}
              </button>
              {profileSaved && <span className="text-xs text-emerald-600 font-medium">{t('settings.profile.updated')}</span>}
            </div>
          </form>
        </div>

        {/* ── Password ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-5 flex items-center gap-2">
            <Lock size={15} className="text-navy-600" /> {t('settings.password.heading')}
          </h2>
          <form onSubmit={handlePasswordSave} className="space-y-4 max-w-sm">
            <Field label={t('settings.password.new')}>
              <input type="password" className={input} value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                placeholder="••••••••" minLength={8} required />
            </Field>
            <Field label={t('settings.password.confirm')}>
              <input type="password" className={input} value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="••••••••" minLength={8} required />
            </Field>
            {pwMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {pwMsg.text}
              </p>
            )}
            <button type="submit" disabled={pwSaving} className={primaryBtn}>
              {pwSaving ? t('settings.password.updating') : t('settings.password.submit')}
            </button>
          </form>
        </div>

        {/* ── Two-factor authentication ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <ShieldCheck size={15} className="text-navy-600" /> {t('settings.mfa.heading')}
          </h2>
          <p className="text-xs text-stone-400 mb-4 leading-relaxed">
            {t('settings.mfa.body')}
          </p>
          <a
            href="/setup-mfa"
            className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-200 rounded-full px-3 py-2 hover:bg-navy-50 transition-colors"
          >
            <ShieldCheck size={13} /> {t('settings.mfa.cta')}
          </a>
        </div>

        {/* ── Biometric unlock (native iOS app only) ── */}
        <BiometricLockSetting />

        {/* ── Subscription ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <CreditCard size={15} className="text-navy-600" /> {t('settings.subscription.heading')}
          </h2>
          <p className="text-xs text-stone-400 mb-5">
            <Trans t={t} i18nKey="settings.subscription.currentlyOn" values={{ plan: planLabel(profile.plan) }} components={{ b: <span className="font-semibold text-navy-800" /> }} />
            {isTrialing    && <span className="ml-2 text-amber-600 font-medium">{t('settings.subscription.trialActive')}</span>}
            {isCancelling  && <span className="ml-2 text-amber-600 font-medium">{t('settings.subscription.cancellationScheduled')}</span>}
            {isCancelled   && <span className="ml-2 text-stone-400 font-medium">{t('settings.subscription.planEnded')}</span>}
            {!isTrialing && !isCancelling && !isCancelled && profile.current_period_end && (
              <span className="ml-2 text-stone-400">
                {t('settings.subscription.nextBilling', { date: new Date(profile.current_period_end).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) })}
              </span>
            )}
          </p>

          {/* ── State: CANCELLING — show access-end notice, hide plan cards ── */}
          {isCancelling && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 leading-relaxed">
                  <p className="font-semibold mb-1">{t('settings.subscription.cancelledTitle')}</p>
                  <p>
                    {cancelAtDate
                      ? <Trans t={t} i18nKey="settings.subscription.cancelledBodyWithDate" values={{ date: cancelAtDate }} components={{ b: <strong /> }} />
                      : t('settings.subscription.cancelledBody')}
                  </p>
                </div>
              </div>

              {/* Reactivate */}
              <div>
                <p className="text-xs text-stone-400 mb-2">{t('settings.subscription.changedMind')}</p>
                {reactivateError && (
                  <p className="text-xs text-red-600 mb-2">{reactivateError}</p>
                )}
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="inline-flex items-center gap-2 text-sm font-semibold btn-aurora text-white px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
                >
                  {reactivating ? <><Loader2 size={13} className="animate-spin" />{t('settings.subscription.reactivating')}</> : t('settings.subscription.reactivate')}
                </button>
              </div>
            </div>
          )}

          {/* ── State: CANCELLED / CHURNED ── */}
          {isCancelled && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-4">
                <AlertCircle size={16} className="text-stone-400 shrink-0 mt-0.5" />
                <div className="text-sm text-stone-600 leading-relaxed">
                  <p className="font-semibold mb-1">{t('settings.subscription.endedTitle')}</p>
                  <p>{t('settings.subscription.endedBody')}</p>
                </div>
              </div>
              <button
                onClick={() => onUpgrade(profile.plan === 'essential' ? 'essential' : 'family', 'yearly')}
                className="inline-flex items-center gap-2 text-sm font-semibold btn-aurora text-white px-4 py-2 rounded-full hover:bg-navy-700 transition-colors"
              >
                {t('settings.subscription.reactivateEverstead')}
              </button>
            </div>
          )}

          {/* ── State: TRIALING or ACTIVE — show plan cards ── */}
          {!isCancelling && !isCancelled && (
            <>
              {/* Billing cycle toggle */}
              <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 w-fit mb-4">
                {['monthly', 'yearly'].map(cycle => (
                  <button
                    key={cycle}
                    onClick={() => setBillingCycle(cycle)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${billingCycle === cycle ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    {/* cycle VALUES are stored on the subscription, only labels translate. */}
                    {cycle === 'monthly' ? t('settings.subscription.cycleMonthly') : t('settings.subscription.cycleYearly')}
                  </button>
                ))}
              </div>

              {upgradeError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{upgradeError}</div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {PLANS.map(plan => {
                  const isCurrent      = profile.plan === plan.id
                  const isHigher       = plan.tier > currentTier
                  const price          = billingCycle === 'yearly' ? plan.yearly : plan.monthly
                  const currentCycle   = profile.billing_cycle ?? 'monthly'
                  const wantsDiffCycle = isCurrent && !isTrialing && billingCycle !== currentCycle
                  return (
                    <div key={plan.id} className={`rounded-xl border p-4 flex flex-col ${isCurrent ? 'border-navy-400 bg-navy-50 ring-1 ring-navy-400' : 'border-stone-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-navy-950 text-sm">{plan.name}</p>
                        {isCurrent && <span className="text-xs bg-navy-800 text-white px-2 py-0.5 rounded-full">{t('settings.subscription.current')}</span>}
                      </div>
                      <p className="text-lg font-display font-light text-navy-950">
                        {t('settings.subscription.price', { price })}
                        {billingCycle === 'yearly' && <span className="text-xs text-stone-400 ml-1">{t('settings.subscription.billedAnnually')}</span>}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 leading-snug flex-1">{plan.desc}</p>
                      {isCurrent && isTrialing && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold btn-aurora text-white rounded-full py-1.5 hover:bg-navy-700 transition-colors"
                        >
                          {t('settings.subscription.activatePlan', { plan: plan.name })}
                        </button>
                      )}
                      {wantsDiffCycle && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold bg-sage-600 text-white rounded-full py-1.5 hover:bg-sage-700 transition-colors"
                        >
                          {billingCycle === 'yearly' ? t('settings.subscription.switchToYearly') : t('settings.subscription.switchToMonthly')}
                        </button>
                      )}
                      {!isCurrent && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold text-navy-700 border border-navy-200 rounded-lg py-1.5 hover:bg-navy-50 transition-colors"
                        >
                          {isHigher ? t('settings.subscription.upgradeTo', { plan: plan.name }) : t('settings.subscription.switchTo', { plan: plan.name })}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Manage billing — for paid subscribers only (free users have no billing) */}
              {!isTrialing && !isFreeTier && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-400 mb-2">{t('settings.subscription.portalHint')}</p>
                  <ManageBillingButton />
                </div>
              )}

              {/* Cancel subscription — hidden for free users (no subscription to cancel) */}
              {!isFreeTier && (
              <div className="mt-5 pt-4 border-t border-stone-100">
                {cancelConfirm ? (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-3">
                    <p className="text-sm font-semibold text-navy-900">{t('settings.subscription.cancelConfirmTitle')}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      {t('settings.subscription.cancelConfirmBody')}
                    </p>
                    {cancelError && (
                      <p className="text-xs text-red-600">{cancelError}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => { setCancelConfirm(false); setCancelError(null) }}
                        className="flex-1 btn-aurora text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-navy-700 transition-colors"
                      >
                        {t('settings.subscription.keepPlan')}
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="flex-1 text-stone-500 text-sm font-medium px-4 py-2.5 rounded-full border border-stone-200 hover:border-stone-300 hover:text-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {cancelling
                          ? <><Loader2 size={13} className="animate-spin" />{t('settings.subscription.cancelling')}</>
                          : t('settings.subscription.confirmCancel')
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCancelConfirm(true); setCancelError(null) }}
                    className="text-xs text-stone-500 hover:text-red-600 transition-colors underline underline-offset-2"
                  >
                    {isTrialing ? t('settings.subscription.cancelTrial') : t('settings.subscription.cancelSubscription')}
                  </button>
                )}
              </div>
              )}
            </>
          )}
        </div>

        {/* ── Refer a friend — the extended-trial referral only makes sense once you're
               on a paid plan, so it's hidden for free users (who see the upgrade cards
               above instead). ── */}
        {!isFreeTier && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
              <Gift size={15} className="text-sage-600" /> {t('settings.referral.heading')}
            </h2>
            <p className="text-xs text-stone-400 mb-4">
              <Trans t={t} i18nKey="settings.referral.body" components={{ b: <span className="font-semibold text-navy-700" /> }} />
            </p>
            <ReferralLinkBox referralCode={profile.referral_code || profile.id} />
          </div>
        )}

        {/* ── AI features ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Sparkles size={15} className="text-navy-600" /> {t('settings.ai.heading')}
          </h2>
          <div className="flex items-start justify-between gap-4 mt-4">
            <p className="text-xs text-stone-500 leading-relaxed max-w-md">
              {t('settings.ai.body')}
            </p>
            <label className="relative shrink-0 cursor-pointer mt-0.5">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={aiEnabled}
                disabled={aiSaving}
                onChange={toggleAi}
              />
              <div className="w-11 h-6 rounded-full bg-stone-200 peer-checked:bg-navy-700 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
          <p className="text-xs text-stone-400 mt-3">
            <Trans
              t={t}
              i18nKey="settings.ai.status"
              values={{ state: aiEnabled ? t('settings.ai.on') : t('settings.ai.off') }}
              components={{ b: <span className={`font-semibold ${aiEnabled ? 'text-sage-700' : 'text-stone-600'}`} /> }}
            />
          </p>
        </div>

        {/* ── Notification preferences ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Bell size={15} className="text-navy-600" /> {t('settings.notifications.heading')}
          </h2>
          <p className="text-xs text-stone-400 mb-5 leading-relaxed">
            {t('settings.notifications.intro')}
          </p>
          <div className="space-y-3">
            {/* Keys are the notify_* profile column names, only the labels translate. */}
            {[
              'notify_birthday',
              'notify_annual_review',
              'notify_document_expiry',
              'notify_vault_nudges',
              'notify_reengagement',
              'notify_trial_reminders',
            ].map(key => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group py-1">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifForm[key]}
                    onChange={e => setNotifForm(p => ({ ...p, [key]: e.target.checked }))}
                  />
                  <div className="w-9 h-5 rounded-full bg-stone-200 peer-checked:bg-navy-700 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-900 leading-snug">{t(`settings.notifications.items.${key}.label`)}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{t(`settings.notifications.items.${key}.desc`)}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={handleNotifSave}
              disabled={notifSaving}
              className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {notifSaving ? t('settings.saving') : notifSaved ? t('settings.saved') : t('settings.notifications.save')}
            </button>
            {notifSaved && <span className="text-xs text-emerald-600 font-medium">{t('settings.notifications.updated')}</span>}
          </div>
        </div>

        {/* ── My Data ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Download size={15} className="text-navy-600" /> {t('settings.data.heading')}
          </h2>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            {t('settings.data.intro')}{' '}
            <Link to="/data-promise" className="text-navy-600 hover:text-navy-800 underline underline-offset-2">{t('settings.data.promiseLink')}</Link>
          </p>
          {isDemo ? (
            <p className="text-xs text-stone-400 italic">{t('settings.data.demoDisabled')}</p>
          ) : (
            <div className="space-y-3">
              <button
                onClick={requestExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <><Loader2 size={14} className="animate-spin" /> {t('settings.data.preparing')}</>
                ) : (
                  <><Download size={14} /> {t('settings.data.export')}</>
                )}
              </button>
              {reauthOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/40 p-4" onClick={() => !reauthBusy && setReauthOpen(false)}>
                  <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-navy-900 mb-1">{t('settings.data.reauthTitle')}</h3>
                    <p className="text-xs text-stone-500 mb-4">{t('settings.data.reauthBody')}</p>
                    <input
                      type="password" autoFocus value={reauthPassword}
                      onChange={e => setReauthPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && reauthPassword && !reauthBusy) confirmReauthAndExport() }}
                      placeholder={t('settings.data.passwordPlaceholder')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-navy-200"
                    />
                    {reauthError && <p className="text-xs text-red-600 mb-3">{reauthError}</p>}
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setReauthOpen(false)} disabled={reauthBusy} className="text-sm px-4 py-2 rounded-full text-stone-600 hover:bg-stone-100 disabled:opacity-50">{t('settings.cancel')}</button>
                      <button onClick={confirmReauthAndExport} disabled={reauthBusy || !reauthPassword} className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50">
                        {reauthBusy ? <><Loader2 size={14} className="animate-spin" /> {t('settings.data.verifying')}</> : t('settings.data.confirmExport')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {exportDone && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {t('settings.data.exportDone')}
                </p>
              )}
              {exportError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{exportError}</p>
              )}
              <p className="text-xs text-stone-400">
                {t('settings.data.exportNote')}
              </p>
            </div>
          )}
        </div>

        {/* ── Danger zone ── */}
        <div className="bg-white border border-red-100 rounded-2xl p-6">
          <h2 className="font-semibold text-red-700 text-sm mb-2">{t('settings.danger.heading')}</h2>

          {isDemo ? (
            <p className="text-xs text-stone-400 italic">{t('settings.danger.demoDisabled')}</p>
          ) : deleteStep === 0 ? (
            <>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                {t('settings.danger.intro')}
              </p>
              <button
                onClick={() => setDeleteStep(1)}
                className="text-xs font-semibold text-red-600 border border-red-200 rounded-full px-4 py-2 hover:bg-red-50 transition-colors"
              >
                {t('settings.danger.start')}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-red-800">{t('settings.danger.confirmTitle')}</p>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={deleteChecks.data}
                  onChange={e => setDeleteChecks(p => ({ ...p, data: e.target.checked }))}
                  className="mt-0.5 accent-red-600"
                />
                <span className="text-xs text-stone-700 leading-relaxed">
                  {t('settings.danger.checkData')}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={deleteChecks.confirm}
                  onChange={e => setDeleteChecks(p => ({ ...p, confirm: e.target.checked }))}
                  className="mt-0.5 accent-red-600"
                />
                <span className="text-xs text-stone-700 leading-relaxed">
                  <Trans t={t} i18nKey="settings.danger.checkPermanent" components={{ b: <strong /> }} />
                </span>
              </label>

              {deleteError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleConfirmDelete}
                  disabled={!deleteChecks.data || !deleteChecks.confirm || deleting}
                  className="text-xs font-semibold bg-red-600 text-white rounded-full px-4 py-2 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? t('settings.danger.deleting') : t('settings.danger.confirmDelete')}
                </button>
                <button
                  onClick={() => { setDeleteStep(0); setDeleteChecks({ data: false, confirm: false }); setDeleteError(null) }}
                  className={secondaryBtn}
                >
                  {t('settings.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// LIFE EVENT PROMPT MODAL
// ─────────────────────────────────────────────────────────────

function LifeEventPromptModal({ prompt, onNavigate, onClose }) {
  const { t } = useTranslation('dashboard')
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <p className="font-semibold text-navy-900 text-sm pt-1.5">{t('modals.lifeEvent.title')}</p>
          <button onClick={onClose} className="ml-auto text-stone-300 hover:text-stone-500 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed mb-5">{prompt.message}</p>
        {prompt.cta && (
          <button
            onClick={() => onNavigate(prompt.cta.section)}
            className="w-full btn-aurora text-white text-sm font-semibold py-2.5 rounded-full hover:bg-navy-700 transition-colors"
          >
            {prompt.cta.label}
          </button>
        )}
        <button onClick={onClose} className="w-full mt-2 text-xs text-stone-400 hover:text-stone-600 py-1.5 transition-colors">
          {t('modals.lifeEvent.later')}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EXECUTOR PREVIEW MODAL
// ─────────────────────────────────────────────────────────────

function ExecutorPreviewModal({ profile, people, accounts, documents, instructions, onClose }) {
  const { t } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const executor = people.find(p => p.role?.toLowerCase().includes('executor')) || people[0]
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-navy-950 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-widest">{t('modals.executorPreview.eyebrow')}</p>
            <p className="text-white text-sm font-medium mt-0.5">
              {t('modals.executorPreview.whatTheySee', { name: executor?.name || t('modals.executorPreview.yourExecutor') })}
            </p>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Plan owner */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t('modals.executorPreview.planOwner')}</p>
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="font-semibold text-navy-900">{profile.full_name}</p>
              <p className="text-xs text-stone-500 mt-0.5">{profile.email}</p>
              {profile.date_of_birth && (
                <p className="text-xs text-stone-400 mt-0.5">
                  {t('modals.executorPreview.dob', { date: new Date(profile.date_of_birth).toLocaleDateString(dateLocale) })}
                </p>
              )}
            </div>
          </div>

          {/* Trusted contacts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {t('modals.executorPreview.trustedContacts', { n: people.length })}
            </p>
            {people.length === 0 ? (
              <p className="text-sm text-stone-400 italic">{t('modals.executorPreview.noContacts')}</p>
            ) : (
              <div className="space-y-2">
                {people.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-navy-700">{p.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{p.name}</p>
                      <p className="text-xs text-stone-400 truncate">{t('modals.executorPreview.personMeta', { role: roleLabel(t, p.role), email: p.email })}</p>
                    </div>
                    {/* invite_status VALUES are stored, only the badge label translates. */}
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${p.invite_status === 'accepted' ? 'bg-sage-50 text-sage-700 border-sage-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {p.invite_status === 'accepted' ? t('modals.executorPreview.statusActive') : t('modals.executorPreview.statusPending')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial accounts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {t('modals.executorPreview.accounts', { n: accounts.length })}
            </p>
            {accounts.length === 0 ? (
              <p className="text-sm text-stone-400 italic">{t('modals.executorPreview.noAccounts')}</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {accounts.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-2">
                    <Landmark size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-navy-800 flex-1">{a.institution}</span>
                    <span className="text-xs text-stone-400">{t(`accounts.category.${a.category}`, { defaultValue: a.category })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key documents */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {t('modals.executorPreview.documents', { n: documents.length })}
            </p>
            {documents.length === 0 ? (
              <p className="text-sm text-stone-400 italic">{t('modals.executorPreview.noDocuments')}</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {documents.map(d => (
                  <div key={d.id} className="flex items-center gap-3 py-2">
                    <FileText size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-navy-800 flex-1">{d.name}</span>
                    <span className="text-xs text-stone-400">{t(`documents.type.${d.doc_type}`, { defaultValue: d.doc_type })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          {instructions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                {t('modals.executorPreview.instructions', { n: instructions.length })}
              </p>
              <div className="divide-y divide-stone-100">
                {instructions.map(i => (
                  <div key={i.id} className="flex items-center gap-3 py-2">
                    <BookOpen size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-navy-800">{i.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-800 leading-relaxed">
              <Trans t={t} i18nKey="modals.executorPreview.footer" components={{ b: <strong /> }} />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────

function SectionShell({ title, subtitle, action, children }) {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
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

function EmptyState({ icon: Icon, label, action, onAction }) {
  return (
    <div className="bg-white border border-dashed border-stone-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mb-4">
        <Icon size={20} className="text-stone-300" />
      </div>
      <p className="font-medium text-navy-800 text-sm">{label}</p>
      {action && (onAction ? (
        <button onClick={onAction} className="text-navy-700 hover:text-navy-900 underline underline-offset-2 text-xs mt-1 max-w-xs transition-colors">
          {action}
        </button>
      ) : (
        <p className="text-stone-400 text-xs mt-1 max-w-xs">{action}</p>
      ))}
    </div>
  )
}

function LoadingSpinner() {
  const { t } = useTranslation('dashboard')
  return (
    <div className="space-y-3" aria-label={t('common.loading')} aria-busy="true">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-4 bg-white border border-stone-100 rounded-xl px-5 py-4 animate-pulse">
          <div className="h-9 w-9 rounded-full bg-stone-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-2/5 rounded-lg bg-stone-200" />
            <div className="h-2.5 w-1/3 rounded-lg bg-stone-200" />
          </div>
          <div className="h-5 w-16 rounded-full bg-stone-200" />
        </div>
      ))}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  const { t } = useTranslation('dashboard')
  // Escape closes the dialog — standard keyboard affordance.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"><X size={16} /></button>
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
const primaryBtn  = 'inline-flex items-center gap-2 btn-aurora text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-navy-700 transition-colors'
const secondaryBtn= 'inline-flex items-center gap-2 bg-white text-stone-700 text-sm font-medium px-4 py-2 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors'
const capitaliseFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// The documents.doc_type CHECK constraint only permits these seven values (keep this
// list in step with the DB constraint and the Type dropdown).
const DOC_TYPES = ['Legal', 'Finance', 'Insurance', 'Property', 'Personal', 'Medical', 'Other']

// Map a free-form document type — e.g. a value the AI document scan extracts
// ("pension_transfer", "questionnaire", "financial") — onto one of DOC_TYPES. Anything
// unrecognised falls back to 'Other'. Without this, an AI-set doc_type that isn't in the
// list silently fails to match the dropdown AND is rejected by the CHECK constraint on save.
const normaliseDocType = (raw) => {
  if (!raw) return 'Other'
  const s = String(raw).toLowerCase().trim()
  const exact = DOC_TYPES.find(t => t.toLowerCase() === s)
  if (exact) return exact
  if (/legal|will|testament|lpa|attorney|probate|deed of|contract|agreement|questionnaire|transfer/.test(s)) return 'Legal'
  if (/financ|bank|pension|invest|isa|savings|statement|tax|payslip/.test(s)) return 'Finance'
  if (/insur|policy|annuity/.test(s)) return 'Insurance'
  if (/propert|title|land regist|lease|mortgage/.test(s)) return 'Property'
  if (/medic|health|prescription|nhs|hospital|doctor/.test(s)) return 'Medical'
  if (/passport|licen|identity|birth|marriage|personal/.test(s)) return 'Personal'
  return 'Other'
}

// ── First-run tour: a short, warm walk through the real dashboard ─────────────
const TOUR_STEPS = [
  { id: 'overview', icon: Home,       title: 'Welcome home', body: 'Whenever you sign in, this is your calm overview, everything at a glance, no pressure to do it all at once.' },
  { id: 'accounts', icon: Landmark,   title: 'Your vault', body: 'Your accounts, documents and subscriptions live here, the practical things, gathered safely in one place.' },
  { id: 'people',   icon: Users,      title: 'The people you trust', body: 'Invite family or an executor and choose exactly what each person can see, and only when the time is right. Nothing is shared until you say so.' },
  { id: 'aboutme',  icon: UserCircle, title: 'The part that’s really you', body: 'About Me is the heart of it, your story, your wishes, and messages for the people you love. Come back and add to it whenever something comes to mind.' },
]
function DashboardTour({ setActiveSection, onClose }) {
  const { t } = useTranslation('dashboard')
  const [step, setStep] = useState(0)
  useEffect(() => {
    setActiveSection(TOUR_STEPS[step].id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step, setActiveSection])
  const s = TOUR_STEPS[step]
  const Icon = s.icon
  const last = step === TOUR_STEPS.length - 1
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-end justify-center sm:justify-end p-4 sm:p-6">
      <div className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 px-6 py-5 animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-navy-950 flex items-center justify-center shrink-0"><Icon size={15} className="text-sage-300" /></div>
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t('tour.progress', { step: step + 1, total: TOUR_STEPS.length })}</span>
        </div>
        <h3 className="font-display text-xl text-navy-950 mb-1.5">{t(`tour.steps.${s.id}.title`)}</h3>
        <p className="text-sm text-stone-600 leading-relaxed mb-5">{t(`tour.steps.${s.id}.body`)}</p>
        <div className="flex items-center gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-navy-700' : 'w-1.5 bg-stone-200'}`} />)}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">{t('tour.skip')}</button>
          <div className="flex items-center gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="text-sm text-stone-500 hover:text-navy-800 px-3 py-2">{t('tour.back')}</button>}
            <button onClick={() => last ? onClose() : setStep(step + 1)} className="btn-aurora inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-full">
              {last ? t('tour.done') : <>{t('tour.next')} <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
