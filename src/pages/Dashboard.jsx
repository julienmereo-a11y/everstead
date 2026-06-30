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
import { PRICING } from '../config/pricing'
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
  { id: 'family',         label: 'Family Plan',      icon: Heart,        group: 'People & wishes', familyOnly: true },
  { id: 'messages',       label: 'Personal Messages',icon: MessageSquare,group: 'People & wishes' },
  { id: 'instructions',   label: 'Instructions',     icon: BookOpen,     group: 'People & wishes' },

  { id: 'alerts',         label: 'Alerts',           icon: Bell,         group: 'More' },
  { id: 'activity',       label: 'Activity',         icon: Activity,     group: 'More' },
  { id: 'resources',      label: 'Help & Resources', icon: BookOpen,     group: 'More' },
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
    ? "Your free trial ends tomorrow — your card on file will be charged unless you cancel."
    : daysLeft <= 7
    ? `Your free trial ends in ${daysLeft} days — your card on file will be charged automatically.`
    : `You're on a free trial — ${daysLeft} days remaining.`
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
          Manage plan →
        </button>
      )}
    </div>
  )
}

function TrialExpiredModal({ profile, onUpgrade }) {
  return (
    <div className="fixed inset-0 z-50 bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <Lock size={28} className="text-red-500" />
        </div>
        <h2 className="font-display text-3xl font-light text-navy-950 mb-3">Your trial has ended</h2>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          Your 14-day free trial has expired. Choose a plan to keep your vault, trusted contacts, and everything you've set up — all your data is safely saved.
        </p>
        <div className="space-y-3 mb-8">
          {[
            { name: 'Essential', price: '£3.99/mo', note: 'or £3.19/mo billed annually (£38.28/yr · save 20%)', id: 'essential' },
            { name: 'Family', price: '£9.99/mo', note: 'or £7.99/mo billed annually (£95.88/yr · save 20%) — two private vaults', id: 'family', highlight: profile.plan !== 'advisor' },
            ...(profile.plan === 'advisor' ? [{ name: 'Advisor', price: '£60/mo', note: 'or £48/mo yearly · For estate advisors', id: 'advisor', highlight: true }] : []),
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
          Questions? Email us at{' '}
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
  const urgent = daysLeft <= 7
  return (
    <div className={`flex items-start justify-between gap-4 px-6 py-4 text-sm ${urgent ? 'bg-red-50 border-b border-red-200' : 'bg-orange-50 border-b border-orange-200'}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${urgent ? 'text-red-500' : 'text-orange-500'}`} />
        <div>
          <p className={`font-semibold ${urgent ? 'text-red-800' : 'text-orange-800'}`}>
            {advisorName ? `${advisorName} has cancelled their advisor plan.` : 'Your advisor has cancelled their plan.'}
          </p>
          <p className={`text-xs mt-0.5 leading-relaxed ${urgent ? 'text-red-700' : 'text-orange-700'}`}>
            {daysLeft === 1
              ? 'Your account will be locked tomorrow unless you add a payment method.'
              : `You have ${daysLeft} days to add a payment method and continue with your own paid plan. Your data is safe.`}
          </p>
        </div>
      </div>
      <button
        onClick={onAddPayment}
        className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap ${urgent ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
      >
        Add payment method
      </button>
    </div>
  )
}

function AdvisorCancelledModal({ advisorName, onAddPayment }) {
  return (
    <div className="fixed inset-0 z-50 bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-6">
          <CreditCard size={28} className="text-orange-500" />
        </div>
        <h2 className="font-display text-3xl font-light text-navy-950 mb-3">Payment required</h2>
        <p className="text-stone-500 text-sm leading-relaxed mb-2">
          {advisorName
            ? <><strong>{advisorName}</strong> has cancelled their Everstead advisor plan.</>
            : <>Your advisor has cancelled their Everstead plan.</>}
        </p>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          The 30-day grace period has ended. Add a payment method to continue — all your accounts, documents, and instructions are saved and waiting for you.
        </p>
        <div className="space-y-3 mb-8">
          {[
            { name: 'Essential', price: '£3.99/mo', note: 'or £3.19/mo billed annually (£38.28/yr · save 20%)', id: 'essential' },
            { name: 'Family', price: '£9.99/mo', note: 'or £7.99/mo billed annually (£95.88/yr · save 20%) — all household members', id: 'family', highlight: true },
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
          Questions? Email us at{' '}
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
  const [session, setSession] = React.useState(null)
  React.useEffect(() => {
    import('../lib/supabase').then(({ supabase: s }) => {
      s.auth.getSession().then(({ data: { session: sess } }) => setSession(sess))
    })
  }, [])
  if (!session) return null
  return (
    <SectionShell
      title="Family Plan"
      subtitle={profile.family_role === 'secondary'
        ? 'You have your own private vault under a Family plan subscription.'
        : 'Invite your partner or spouse to their own private vault under your plan.'}
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
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDemo          = searchParams.get('demo') === 'true'
  const checkoutSuccess = searchParams.get('checkout') === 'success'

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
  // will have no stripe_customer_id — redirect them to checkout to get a subscription
  const hasNoSubscription = !isDemo
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
    try {
      await redirectToCheckout({
        plan:            targetPlan,
        billingCycle,
        userEmail:       user.email,
        customerId:      activeProfile.stripe_customer_id || undefined,
        trialPeriodDays: 0, // user is converting from trial — charge immediately
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
        throw new Error(d.error || 'Deletion failed. Please contact support.')
      }
      await signOut()
      navigate('/')
    } catch (err) {
      throw err
    }
  }

  // ── Milestone effects ──────────────────────────────────────
  React.useEffect(() => {
    if (!isDemo && accounts.length === 1) celebrate('first_account', '🏦', 'First account added!', 'Your vault is taking shape. Keep going.')
  }, [accounts.length, isDemo])

  React.useEffect(() => {
    if (!isDemo && documents.length === 1) celebrate('first_document', '📄', 'First document uploaded!', 'One less thing for your family to hunt for.')
  }, [documents.length, isDemo])

  // Redirect Google OAuth users who signed in via /login without a subscription
  if (hasNoSubscription) {
    navigate('/get-started?resume=true', { replace: true })
    return null
  }

  return (
    <>
    <Helmet>
      <title>My Plan — Everstead</title>
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
          <span>Demo mode — data is fictional and no changes are saved.</span>
          <Link to="/get-started" className="underline hover:no-underline">Start your real plan →</Link>
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
                ? 'This account has been suspended following a verified death report.'
                : 'This account has been suspended following a verified incapacity report.'}
            </p>
            <p className={`text-xs mt-1 ${isDeceased ? 'text-stone-400' : 'text-amber-200'}`}>
              This plan is now read-only. Trusted people with after-death access permissions have been notified and their access has been unlocked. No changes can be made to this account. Contact{' '}
              <a href="mailto:support@everstead.care" className="underline font-medium">support@everstead.care</a> if you believe this is an error.
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
        aria-label="Sidebar"
      >

        {/* Logo */}
        <div className="flex items-center justify-between" style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '8px', paddingTop: '24px' }}>
          <Link to="/">
            <img src="/logo-v2-white.png" alt="Everstead" className="h-10 w-auto" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto" style={{ padding: '8px 0' }} aria-label="Dashboard navigation">
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
                  {group}
                </p>
              )}
              <button
                onClick={() => { setActiveSection(id); setSidebarOpen(false) }}
                title={locked ? 'Personal Messages — upgrade to access. Click to see options.' : undefined}
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
                <span className="flex-1 text-left">{label}</span>
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
              <p className="text-sm font-medium text-white truncate">{activeProfile.full_name ?? 'Your Account'}</p>
              <p className="text-xs text-stone-500 truncate capitalize">{activeProfile.plan} plan</p>
            </div>
          </div>
          <button
            onClick={() => { setActiveSection('settings'); setSidebarOpen(false) }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-full text-stone-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
          >
            <Settings size={15} /> Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-full text-stone-400 hover:text-red-400 hover:bg-white/5 text-sm transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main ref={mainRef} className="flex-1 overflow-auto flex flex-col min-w-0" style={{ backgroundColor: '#f8f7f5' }} aria-label="Main content">

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-navy-950 border-b border-navy-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open menu"
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
              aria-label={`${unreadCount} unread alerts`}
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
        {activeSection === 'overview'      && <OverviewSection  profile={activeProfile} accounts={accounts} documents={documents} people={people} instructions={instructions} messages={messages} alerts={alerts} markRead={markRead} onNavigate={setActiveSection} planLimits={planLimits} loading={loadingAccounts || loadingDocs} daysSinceLogin={daysSinceLogin} onCelebrate={celebrate} onExecutorPreview={() => setShowExecutorPreview(true)} aboutMe={aboutMe} />}
        {activeSection === 'accounts'      && <AccountsSection  accounts={accounts} loading={loadingAccounts} add={addAccount} update={updateAccount} remove={removeAccount} profile={activeProfile} onUpgrade={() => handleUpgrade('family', 'yearly')} onLifeEvent={isDemo ? undefined : setLifeEventPrompt} />}
        {activeSection === 'documents'     && <DocumentsSection documents={documents} loading={loadingDocs} uploadFile={uploadFile} update={updateDocument} remove={removeDocument} planLimits={planLimits} profile={activeProfile} onUpgrade={() => handleUpgrade('family', 'yearly')} updateProfile={isDemo ? undefined : updateProfile} addAlert={isDemo ? undefined : realAlerts.add} onLifeEvent={isDemo ? undefined : setLifeEventPrompt} />}
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
// AI ONBOARDING OVERLAY — shown once on first login
// ─────────────────────────────────────────────────────────────
function AIOnboardingOverlay({ userName, onClose, onComplete }) {
  const firstName = userName?.split(' ')[0] || 'there'
  const QUESTIONS = [
    { key: 'property',       q: `Do you own property — a home, flat, or land? If so, whereabouts and with whom?` },
    { key: 'pension',        q: `Do you have a pension? If so, who's the provider — e.g. the NHS, Aviva, or a workplace scheme?` },
    { key: 'lifeInsurance',  q: `Do you have life insurance or any protection policies?` },
    { key: 'bankAccounts',   q: `Which banks or building societies do you have accounts with?` },
    { key: 'executor',       q: `Who would you want to handle your estate — an executor or trusted person? Give their name if you know it.` },
  ]

  const [step, setStep] = useState(-1) // -1 = intro
  const [answers, setAnswers] = useState({})
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [summary, setSummary] = useState('')
  const inputRef = React.useRef(null)

  React.useEffect(() => {
    if (step >= 0) inputRef.current?.focus()
  }, [step])

  const handleNext = () => {
    if (step >= 0) {
      const key = QUESTIONS[step].key
      setAnswers(prev => ({ ...prev, [key]: input.trim() || 'Not provided' }))
      setInput('')
    }
    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1)
    } else {
      // All questions answered — process
      handleProcess()
    }
  }

  const handleProcess = async () => {
    setProcessing(true)
    const finalAnswers = { ...answers }
    if (step >= 0) finalAnswers[QUESTIONS[step].key] = input.trim() || 'Not provided'
    try {
      const { supabase: sb } = await import('../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/ai/process-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ answers: finalAnswers, firstName }),
      })
      // res.ok === false includes the AI-off case (403) — fall back gracefully.
      const data = res.ok ? await res.json() : {}
      setSummary(data.onboardingSummary || "I've set up some draft entries based on what you shared. You can review and edit everything in your vault.")
      setDone(true)
      await onComplete(data)
    } catch {
      setSummary("Something went wrong, but don't worry — you can add everything manually in your vault.")
      setDone(true)
    } finally {
      setProcessing(false)
    }
  }

  const progress = step < 0 ? 0 : Math.round(((step) / QUESTIONS.length) * 100)

  return (
    <div className="fixed inset-0 z-[60] bg-navy-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-navy-950 px-7 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-sage-400" />
            <p className="text-white font-semibold text-sm">Quick vault setup</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        {step >= 0 && !done && (
          <div className="h-1 bg-stone-100">
            <div className="h-full bg-sage-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="px-7 py-8">
          {/* Intro */}
          {step === -1 && (
            <div className="text-center">
              <div className="w-14 h-14 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Sparkles size={22} className="text-sage-600" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">
                Welcome, {firstName}. Let's get your vault started.
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8">
                I'll ask you 5 quick questions to set up your vault automatically. It takes under 2 minutes and you can edit everything afterwards.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="w-full btn-aurora text-white font-semibold text-sm py-3.5 rounded-full hover:bg-navy-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles size={15} /> Let's go
                </button>
                <button onClick={onClose} className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
                  Skip for now — I'll do it manually
                </button>
              </div>
            </div>
          )}

          {/* Questions */}
          {step >= 0 && !done && !processing && (
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-6">
                Question {step + 1} of {QUESTIONS.length}
              </p>
              <p className="text-navy-950 font-medium text-base leading-relaxed mb-6">
                {QUESTIONS[step].q}
              </p>
              <textarea
                ref={inputRef}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-navy-900 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-stone-50 resize-none transition-colors"
                rows={3}
                placeholder="Type your answer here…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNext() } }}
              />
              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={() => { setInput(''); handleNext() }}
                  className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Skip this question
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 btn-aurora text-white font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-navy-700 transition-colors"
                >
                  {step < QUESTIONS.length - 1 ? 'Next' : 'Set up my vault'}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Processing */}
          {processing && (
            <div className="text-center py-4">
              <Loader2 size={28} className="animate-spin text-navy-600 mx-auto mb-4" />
              <p className="text-navy-900 font-medium text-sm">Setting up your vault…</p>
              <p className="text-stone-400 text-xs mt-1">This takes just a moment.</p>
            </div>
          )}

          {/* Done */}
          {done && (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">Your vault is ready</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8">{summary}</p>
              <button
                onClick={onClose}
                className="w-full btn-aurora text-white font-semibold text-sm py-3.5 rounded-full hover:bg-navy-700 transition-colors"
              >
                View my vault
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OWNER AI GUIDE — floating chat widget
// ─────────────────────────────────────────────────────────────
function OwnerAIGuide({ userName, plan, accountCount, documentCount, contactCount, instructionCount }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = React.useRef(null)

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hi${userName ? ` ${userName.split(' ')[0]}` : ''}! I'm your Everstead planning coach. I can help you think through your estate plan, explain concepts like wills and LPAs, or guide you on what to add to your vault next.\n\nWhat would you like to know?`,
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
        setMessages(prev => [...prev, { role: 'assistant', content: 'This is just a preview — sign in to your account to chat with the assistant.' }])
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t connect right now. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    'What should I focus on?',
    'What should I add next?',
    'How do I choose an executor?',
    'What is an LPA?',
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
        aria-label="Open planning coach"
      >
        <Sparkles size={16} />
        Ask your coach
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
                <p className="text-sm font-semibold text-white leading-none">Planning coach</p>
                <p className="text-xs text-white/50 mt-0.5">Ask anything about your estate plan</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close"
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
                  <span className="text-xs text-stone-400">Thinking…</span>
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
              placeholder="Ask anything about your plan…"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="shrink-0 btn-aurora text-white p-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
// READINESS COACH CARD (Feature 3)
// ─────────────────────────────────────────────────────────────
function ReadinessCoachCard({ profile, stats, onNavigate }) {
  const [coachData, setCoachData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)

  const fetchCoach = React.useCallback(() => {
    const cacheKey = `everstead_coach_${profile?.id}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setCoachData(JSON.parse(cached)); return } catch {}
    }

    // Respect the AI master switch — skip entirely when AI is off.
    if (profile?.ai_features_enabled === false) { setLoading(false); return }
    setLoading(true)
    setError(false)
    ;(async () => {
      try {
        const { supabase: sb } = await import('../lib/supabase')
        const { data: { session } } = await sb.auth.getSession()
        const r = await fetch('/api/ai/readiness-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            firstName: profile?.full_name?.split(' ')[0],
            plan: profile?.plan,
            stats,
          }),
        })
        const data = await r.json()
        if (data.coaching) {
          setCoachData(data.coaching)
          sessionStorage.setItem(cacheKey, JSON.stringify(data.coaching))
        } else {
          setError(true)
        }
      } catch { setError(true) }
      finally { setLoading(false) }
    })()
  }, [profile?.id]) // eslint-disable-line

  React.useEffect(() => { fetchCoach() }, [fetchCoach])

  if (dismissed) return null

  return (
    <div className="mb-6 rounded-2xl" style={{ background: '#ffffff', border: '1px solid #e5e2dc', borderLeft: '4px solid #4c7d47', padding: '20px 24px', position: 'relative' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={13} style={{ color: '#4c7d47' }} />
          <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: '#4c7d47', textTransform: 'uppercase' }}>Your Readiness Coach</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-stone-300 hover:text-stone-500 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={14} className="animate-spin text-navy-400" />
          <p className="text-sm text-stone-400">Getting your personalised advice…</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-stone-500">Your coach is taking a moment — your plan is safe and all your data is right here.</p>
          <button
            onClick={fetchCoach}
            className="text-xs font-semibold text-navy-600 hover:text-navy-800 underline underline-offset-2 shrink-0"
          >
            Refresh
          </button>
        </div>
      )}

      {coachData && !loading && (
        <>
          <p style={{ fontSize: '15px', color: '#44403c', lineHeight: '1.65', fontFamily: 'Georgia, serif', fontStyle: 'italic', margin: '12px 0 16px' }}>{coachData.message}</p>
          {coachData.nextAction && (
            <button
              onClick={() => {
                if (!coachData.nextActionRoute) return
                // Map legacy/AI route names to actual section keys
                const ROUTE_MAP = { contacts: 'people', wishes: 'messages' }
                onNavigate(ROUTE_MAP[coachData.nextActionRoute] ?? coachData.nextActionRoute)
              }}
              className="inline-flex items-center gap-2 hover:bg-navy-700 transition-colors"
              style={{ backgroundColor: '#0d1628', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
            >
              <ArrowRight size={13} />
              {coachData.nextActionLabel || 'Next step'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW SECTION
// ─────────────────────────────────────────────────────────────
const PLAN_BADGE = {
  essential: { label: 'Essential', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  family:    { label: 'Family',    cls: 'bg-navy-50  text-navy-700  border-navy-200'  },
  advisor:   { label: 'Adviser',   cls: 'bg-sage-50  text-sage-700  border-sage-200'  },
}

function OverviewSection({ profile, accounts, documents, people, instructions, messages, alerts, markRead, onNavigate, planLimits, loading, daysSinceLogin, onCelebrate, onExecutorPreview, aboutMe }) {
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
    { label: 'Accounts documented', value: accounts.length, icon: Landmark, target: 5, navSection: 'accounts' },
    { label: 'Documents uploaded', value: documents.filter(d => d.status !== 'missing').length, icon: FileText, target: 5, navSection: 'documents' },
    { label: `Trusted ${isFamilyPlus ? 'people' : 'contacts'}`, value: people.length, icon: Users, target: isFamilyPlus ? 5 : 2, navSection: 'people' },
    { label: 'Instructions written', value: instructions.length, icon: BookOpen, target: 3, navSection: 'instructions' },
  ]

  const scoreBase = vaultStats.reduce((total, stat) => total + Math.min(stat.value / stat.target, 1), 0) / vaultStats.length
  const alertPenalty = Math.min(criticalAlerts.length * 5, 15)
  const score = Math.max(0, Math.round(scoreBase * 100) - alertPenalty)

  React.useEffect(() => {
    if (score === 100) onCelebrate?.('readiness_100', '⭐', '100% readiness!', 'Your vault is complete. Your family is protected.')
  }, [score])

  const planBadge = PLAN_BADGE[profile.plan] ?? PLAN_BADGE.essential
  const scoreLabel = isFamilyPlus ? 'Family readiness' : 'Plan readiness'

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
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()}, {profile.full_name?.split(' ')[0] ?? 'there'}.
          </h1>
          <p style={{ fontSize: '15px', color: '#78716c', fontWeight: '400' }}>Here's where everything stands.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onExecutorPreview}
            className="inline-flex items-center gap-1.5 transition-colors hover:bg-stone-50 hover:text-navy-700"
            style={{ border: '1px solid #e5e2dc', backgroundColor: 'transparent', color: '#44403c', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}
          >
            <Eye size={12} /> Executor view
          </button>
          <Link
            to="/print"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:bg-stone-50 hover:text-navy-700"
            style={{ border: '1px solid #e5e2dc', backgroundColor: 'transparent', color: '#44403c', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}
          >
            <FileText size={12} /> Export plan
          </Link>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${planBadge.cls}`}>
            {planBadge.label} plan
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
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-700 mb-0.5">Start here</p>
            <h3 className="font-display text-lg font-light text-navy-950 leading-snug">Tell your story — start with “About Me”.</h3>
            <p className="text-sm text-stone-500 mt-0.5">The easiest, most personal part of your plan. Takes a few minutes, and it's yours to share with the people you love.</p>
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

      {/* Stale plan banner — shown when user hasn't logged in for 180+ days */}
      {showStaleBanner && (
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <RefreshCw size={16} className="text-stone-400 mt-0.5 shrink-0" />
            <p className="text-sm text-stone-600">
              Your vault hasn't been updated in {daysSinceLogin} days — accounts, documents, or contacts may have changed since you last checked in.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('accounts')}
              className="text-xs font-semibold text-navy-700 hover:text-navy-900 transition-colors whitespace-nowrap"
            >
              Review now →
            </button>
            <button
              onClick={() => setStaleBannerDismissed(true)}
              className="text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Dismiss"
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
                  <div style={{ fontSize: '12px', color: '#78716c', fontStyle: 'italic', lineHeight: 1.5 }}>Your plan is<br/>waiting to begin</div>
                </div>
              ) : (
                <span className="font-display" style={{ fontSize: '36px', fontWeight: '300', color: '#0d1628', lineHeight: 1 }}>{score}%</span>
              )}
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#78716c', marginTop: '16px', marginBottom: '20px', lineHeight: 1.5 }}>
            {score >= 80 ? 'Excellent — your family is well prepared.' :
             score >= 50 ? 'Good progress — a few items remaining.' :
             'Every item you add protects the people you love.'}
          </p>

          {/* Open planning coach */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('everstead:coach', { detail: 'What should I focus on?' }))}
            className="inline-flex items-center gap-1.5 transition-all"
            style={{ background: 'linear-gradient(100deg, #2d5082 0%, #6f6bc6 50%, #6e9b6a 100%)', border: 'none', color: '#ffffff', borderRadius: '9999px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 6px 18px -6px rgba(111,107,198,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <Sparkles size={13} /> What should I focus on?
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
                    {value === 0 ? 'Start here' : `${value} added · ${target}+ recommended`}
                  </span>
                </div>
                {value === 0 ? (
                  <div className="mb-1">
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px dashed #b9d3b5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4c7d47', fontSize: '18px', marginBottom: '8px' }}>+</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600', color: '#ffffff', background: '#4c7d47', borderRadius: '9999px', padding: '5px 12px' }}>Add your first →</span>
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
                <p className="font-semibold text-navy-900 text-sm">Leave something personal</p>
                <p className="text-xs text-stone-500 mt-0.5">Write a letter to someone you love — sealed until you choose to release it.</p>
              </div>
              <button
                onClick={() => onNavigate('messages')}
                className="shrink-0 text-xs font-semibold text-navy-700 bg-white border border-navy-200 px-3 py-2 rounded-full hover:bg-navy-50 transition-colors whitespace-nowrap"
              >
                Write a message →
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-navy-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm">{messages.length} personal {messages.length === 1 ? 'message' : 'messages'} saved</p>
                <p className="text-xs text-stone-500 mt-0.5">Your words are sealed — ready to be delivered when the time comes.</p>
              </div>
              <button
                onClick={() => onNavigate('messages')}
                className="shrink-0 text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-2 rounded-full hover:bg-navy-100 transition-colors whitespace-nowrap"
              >
                Add another →
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
                  {isSecondaryUser ? 'Your Family Plan vault is active' : 'Family vault active'}
                </p>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  {isSecondaryUser
                    ? `Covered by the plan holder — your vault is fully private.`
                    : `${familyMembership.secondary_email} has their own private vault under your plan.`}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2.5 py-1 rounded-full">Active</span>
            </div>
          ) : familyMembership?.invite_status === 'pending' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">Invitation pending</p>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  Waiting for {familyMembership.secondary_email} to accept.
                </p>
              </div>
              <button
                onClick={() => onNavigate('family')}
                className="shrink-0 text-xs font-semibold text-amber-700 bg-white border border-amber-300 px-3 py-1.5 rounded-full hover:bg-amber-50 transition-colors"
              >
                Manage →
              </button>
            </div>
          ) : (
            <div className="bg-navy-50 border border-navy-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-navy-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">Add your partner or spouse</p>
                <p className="text-xs text-stone-500 mt-0.5">Your plan includes a second private vault — invite them to set up theirs.</p>
              </div>
              <button
                onClick={() => onNavigate('family')}
                className="shrink-0 text-xs font-semibold text-white btn-aurora px-3 py-1.5 rounded-full hover:bg-navy-700 transition-colors"
              >
                Invite →
              </button>
            </div>
          )}
        </div>
      )}

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

      {/* ── Referral nudge ── */}
      <div className="mt-6">
        <ReferralCard userId={profile?.id} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ACCOUNTS SECTION
// ─────────────────────────────────────────────────────────────
function AccountsSection({ accounts, loading, add, update, remove, profile, onUpgrade, onLifeEvent }) {
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
      else {
        await add(payload)
        // Life event prompt — property additions are a key life milestone
        if (form.category === 'Property') {
          onLifeEvent?.({
            message: "You've added a property — a significant asset. It's worth making sure your will and trusted contacts reflect this change.",
            cta: { label: 'Review trusted contacts →', section: 'people' },
          })
        }
      }
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const atAccountLimit = isAtLimit(profile?.plan, 'maxAccounts', accounts.length)

  return (
    <SectionShell
      title="Accounts & Assets"
      subtitle={`${accounts.length} account${accounts.length !== 1 ? 's' : ''} documented`}
      action={
        <button onClick={atAccountLimit ? undefined : openAdd} disabled={atAccountLimit} className={primaryBtn} style={atAccountLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
          <Plus size={15} />Add account
        </button>
      }
    >
      {atAccountLimit && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3 mb-4">
          You've reached your 10-account limit on the Essential plan.{' '}
          <button onClick={onUpgrade} className="font-semibold underline underline-offset-2 hover:text-amber-900">
            Upgrade to Family →
          </button>{' '}
          for unlimited accounts.
        </p>
      )}
      {loading ? <LoadingSpinner /> : accounts.length === 0 ? (
        <EmptyState icon={Landmark} label="No accounts yet" action="Add your first account to start building your vault." />
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
// DOCUMENT VIEWER MODAL (owner dashboard)
// ─────────────────────────────────────────────────────────────
function OwnerDocViewerModal({ doc, onClose }) {
  if (!doc) return null
  const url = doc.file_url || null
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
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
              <p className="text-xs text-stone-400">{doc.doc_type} · {doc.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 px-3 py-2 rounded-full transition-colors">
                  <ExternalLink size={13} /> Open in tab
                </a>
                <a href={url} download={doc.name}
                  className="flex items-center gap-1.5 text-xs font-medium text-white btn-aurora hover:bg-navy-900 px-3 py-2 rounded-full transition-colors">
                  <Download size={13} /> Download
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
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-3">
              <FileText size={40} />
              <p className="text-sm">No file available for this document.</p>
              <p className="text-xs text-stone-300">Upload a file to enable previewing.</p>
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
function DocumentsSection({ documents, loading, uploadFile, update, remove, planLimits, profile, onUpgrade, updateProfile, addAlert, onLifeEvent }) {
  const emptyForm = { name: '', doc_type: 'Legal', status: 'current', expires_at: '', notes: '' }
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
              ex.provider      && `Provider: ${ex.provider}`,
              ex.accountNumber && `Reference/account no: ${ex.accountNumber}`,
              ex.value         && `Value: ${ex.value}`,
              ex.notes,
            ].filter(Boolean).join('\n')
            setForm(p => ({
              ...p,
              name: ex.documentName || p.name,
              doc_type: ex.documentType ? capitaliseFirst(ex.documentType.replace(/_/g, ' ')) : p.doc_type,
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
    })
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setSaving(true)
    setFormError(null)
    try {
      await uploadFile(form, file)
      // Life event prompt — will and LPA uploads are key estate planning moments
      const lowerType = form.doc_type?.toLowerCase() ?? ''
      if (lowerType.includes('will')) {
        onLifeEvent?.({
          message: "Great — your will is uploaded. It's worth checking your trusted contacts and instructions still align with your wishes.",
          cta: { label: 'Review instructions →', section: 'instructions' },
        })
      } else if (lowerType.includes('lpa')) {
        onLifeEvent?.({
          message: "You've uploaded an LPA — an important document. Make sure your trusted contacts know who holds it, and that your access settings are up to date.",
          cta: { label: 'Review trusted contacts →', section: 'people' },
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
          const fmtDate = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          await addAlert({
            title: `${form.name || 'Document'} expiry approaching`,
            message: `Your ${form.name || 'document'} expires on ${fmtDate}. Update it before it lapses.`,
            severity,
            category: 'document',
          }).catch(() => {})
        }
      }
      closeModal()
    } catch (err) {
      setFormError(err.message ?? 'Upload failed. Please try again.')
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
        doc_type: form.doc_type,
        status: form.status,
        expires_at: form.expires_at || null,
        notes: form.notes,
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
          const fmtDate = expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          await addAlert({
            title: `${form.name || 'Document'} expiry approaching`,
            message: `Your ${form.name || 'document'} expires on ${fmtDate}. Update it before it lapses.`,
            severity,
            category: 'document',
          }).catch(() => {})
        }
      }
      closeModal()
    } catch (err) {
      setFormError(err.message ?? 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const atDocLimit = isAtLimit(profile?.plan, 'maxDocuments', documents.length)

  return (
    <SectionShell
      title="Document Vault"
      subtitle={`${documents.filter(d => d.status !== 'missing').length} documents uploaded`}
      action={
        <button onClick={atDocLimit ? undefined : openUpload} disabled={atDocLimit} className={primaryBtn} style={atDocLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
          <Upload size={15} />Upload document
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
              <p className="text-xs font-semibold text-stone-600">Storage</p>
              <p className={`text-xs font-medium ${warn ? 'text-amber-600' : 'text-stone-400'}`}>
                {usedMB < 1 ? `${(usedMB * 1024).toFixed(0)} KB` : `${usedMB.toFixed(1)} MB`} of {limitGB} GB used
              </p>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${warn ? 'bg-amber-400' : 'bg-navy-600'}`}
                style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
              />
            </div>
            {warn && (
              <p className="text-xs text-amber-600 mt-1.5">Storage almost full — consider upgrading your plan.</p>
            )}
          </div>
        )
      })()}
      {atDocLimit && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3 mb-4">
          You've reached your 10-document limit on the Essential plan.{' '}
          <button onClick={onUpgrade} className="font-semibold underline underline-offset-2 hover:text-amber-900">
            Upgrade to Family →
          </button>{' '}
          for unlimited storage.
        </p>
      )}
      {/* Will & LPA guidance — always visible until user has uploaded both */}
      {(() => {
        const hasWill = documents.some(d => /will|testament/i.test(d.name + ' ' + (d.notes || '')))
        const hasLPA  = documents.some(d => /lpa|lasting power|attorney/i.test(d.name + ' ' + (d.notes || '')))
        if (hasWill && hasLPA) return null
        return (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">Priority legal documents</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {!hasWill && (
                <div className="bg-white rounded-xl border border-amber-100 p-4">
                  <p className="font-semibold text-navy-900 text-sm mb-1">Last Will &amp; Testament</p>
                  <p className="text-xs text-stone-500 mb-3 leading-relaxed">The most important document in any estate plan. Without one, UK intestacy rules decide who gets what.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={openUpload} className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-1.5 rounded-full hover:bg-navy-100 transition-colors">Upload yours</button>
                    <a href="https://www.gov.uk/make-will" target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-navy-600 transition-colors">gov.uk guidance →</a>
                  </div>
                </div>
              )}
              {!hasLPA && (
                <div className="bg-white rounded-xl border border-amber-100 p-4">
                  <p className="font-semibold text-navy-900 text-sm mb-1">Lasting Power of Attorney</p>
                  <p className="text-xs text-stone-500 mb-3 leading-relaxed">Grants someone you trust the legal authority to act for you if you lose mental capacity. Must be registered before it's needed.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={openUpload} className="text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-1.5 rounded-full hover:bg-navy-100 transition-colors">Upload yours</button>
                    <a href="https://www.gov.uk/power-of-attorney" target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-navy-600 transition-colors">gov.uk guidance →</a>
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
          <BookOpen size={13} className="text-navy-600" /> Will & Solicitor Details
        </h3>
        <p className="text-xs text-stone-400 mb-4 leading-relaxed">
          Record where your will is stored and how to reach your solicitor. Your executor will need this immediately.
        </p>
        <form onSubmit={handleWillSave} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Where is your will stored?</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.will_location}
              onChange={e => setWillForm(p => ({ ...p, will_location: e.target.value }))}
              placeholder="e.g. In the filing cabinet in the study, or with my solicitor at Smith & Jones"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Solicitor name</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_name}
              onChange={e => setWillForm(p => ({ ...p, solicitor_name: e.target.value }))}
              placeholder="e.g. Sarah Thompson"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Firm name</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_firm}
              onChange={e => setWillForm(p => ({ ...p, solicitor_firm: e.target.value }))}
              placeholder="e.g. Thompson & Associates LLP"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Phone or email</label>
            <input
              className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={willForm.solicitor_contact}
              onChange={e => setWillForm(p => ({ ...p, solicitor_contact: e.target.value }))}
              placeholder="e.g. 020 7123 4567 or sarah@thompsonlaw.co.uk"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={willSaving || !updateProfile}
              className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {willSaving ? 'Saving…' : willSaved ? '✓ Saved' : 'Save details'}
            </button>
            {willSaved && <span className="text-xs text-emerald-600 font-medium">Details saved.</span>}
          </div>
        </form>
      </div>

      {loading ? <LoadingSpinner /> : documents.length === 0 ? (
        <EmptyState icon={FileText} label="No documents yet" action="Upload your first document — will, insurance policies, property deeds, and more." />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-stone-100">
                {['Document','Type','Status','Last updated','Access',''].map(h => (
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
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className={`p-1.5 transition-colors rounded hover:bg-navy-50 ${doc.file_url || doc.storage_path ? 'text-stone-400 hover:text-navy-600' : 'text-stone-200 cursor-default'}`}
                        aria-label={`Preview ${doc.name}`}
                        title={doc.file_url || doc.storage_path ? 'Preview / download' : 'No file uploaded yet'}
                      >
                        <Eye size={14} />
                      </button>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          download={doc.name}
                          className="p-1.5 text-stone-400 hover:text-navy-600 transition-colors rounded hover:bg-navy-50"
                          aria-label={`Download ${doc.name}`}
                          title="Download"
                        >
                          <Download size={14} />
                        </a>
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

      {viewingDoc && <OwnerDocViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {showUpload && (
        <Modal title="Upload document" onClose={closeModal}>
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
                <p className="text-sm text-navy-700 font-medium">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
              ) : (
                <p className="text-sm text-stone-400">Drop file here or click to browse<br /><span className="text-xs">PDF, Word, JPG, PNG up to 50MB</span></p>
              )}
              <input id="doc-file" type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={e => { const f = e.target.files[0]; if (f) handleFileSelect(f) }} />
            </div>

            {/* AI scan offer — shown when a scannable file is selected */}
            {file && ['application/pdf','image/jpeg','image/jpg','image/png','image/webp'].includes(file.type) && !aiScanDone && (
              <div className="flex items-center justify-between bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-sage-600" />
                  <p className="text-xs text-sage-800 font-medium">Extract details automatically with AI?</p>
                </div>
                <button
                  type="button"
                  onClick={handleAIScan}
                  disabled={aiScanning}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-white border border-sage-300 px-3 py-1.5 rounded-full hover:bg-sage-50 transition-colors disabled:opacity-50"
                >
                  {aiScanning ? <><Loader2 size={12} className="animate-spin" />Scanning…</> : 'Scan document'}
                </button>
              </div>
            )}
            {aiScanDone && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <CheckCircle2 size={13} /> Details extracted — review and edit below before saving.
              </p>
            )}
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
            {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
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
            {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
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
// ABOUT ME SECTION
// ─────────────────────────────────────────────────────────────
// Roles that should NOT see a personal "About Me" — professional/legal contacts.
const ABOUT_ME_EXCLUDED_ROLES = ['Estate Attorney', 'Financial Advisor', 'Healthcare Proxy']

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
    if (!file.type.startsWith('image/')) { setError('Please choose an image file (JPG or PNG).'); return }
    if (file.size > 5 * 1024 * 1024) { setError('That image is over 5 MB — please choose a smaller one.'); return }
    setUploadingAvatar(true); setError(null)
    try {
      const url = await uploadAvatar(file)
      set('avatar_url', url)
    } catch (err) {
      setError(err.message || 'Could not upload the photo. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const spotifyValid   = !form.spotify_url || !!spotifyEmbedUrl(form.spotify_url)
  const embedUrl       = spotifyEmbedUrl(form.spotify_url)

  const handleSave = async () => {
    if (isDemo) return
    if (!spotifyValid) { setError('That doesn\'t look like a Spotify link. It should start with open.spotify.com/…'); return }
    setSaving(true); setError(null)
    try {
      // Drop empty life events
      const cleanEvents = form.life_events.filter(e => (e.year || '').trim() || (e.description || '').trim())
      const wasEmpty = !aboutMe
      await save({ ...form, life_events: cleanEvents })
      setSaved(true)
      if (wasEmpty && onCelebrate) onCelebrate('about_me_done', '💚', 'Your story is saved.', 'Thank you for sharing a little of who you are.')
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SectionShell title="About Me"><LoadingSpinner /></SectionShell>

  return (
    <SectionShell
      title="About Me"
      subtitle="A personal page about who you are — shared only with the people you choose."
    >
      {/* Intro */}
      <div className="rounded-2xl border border-sage-200 bg-sage-50 p-5 mb-6 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0">
          <Heart size={17} />
        </div>
        <p className="text-sm text-stone-700 leading-relaxed">
          This is the easiest, most personal part of your plan — your story, your passions, the moments that shaped you.
          You choose who sees it, and whether it's shared now or kept for when your plan is activated. It's never shown to solicitors or professional advisers.
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
                  ? <img src={form.avatar_url} alt="Your profile" className="w-full h-full object-cover" />
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
                {form.avatar_url ? 'Change photo' : 'Add photo'}
              </button>
            </div>

            {/* Name + DOB */}
            <div className="flex-1 grid sm:grid-cols-2 gap-4 w-full">
              <Field label="Full name">
                <input className={aboutInput} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
              </Field>
              <Field label="Date of birth">
                <input type="date" className={aboutInput} value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Life events */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-lg font-light text-navy-950">Life events</h3>
            <button onClick={addLifeEvent} className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 hover:text-sage-800">
              <Plus size={14} /> Add event
            </button>
          </div>
          <p className="text-stone-500 text-xs mb-4">The moments that mattered. e.g. "1985 — Married in Edinburgh"</p>
          {form.life_events.length === 0 ? (
            <button onClick={addLifeEvent} className="w-full border border-dashed border-stone-200 rounded-xl py-5 text-sm text-stone-400 hover:border-sage-300 hover:text-sage-700 transition-colors">
              + Add your first life event
            </button>
          ) : (
            <div className="space-y-3">
              {form.life_events.map((ev, i) => (
                <div key={i} className="flex items-end gap-2.5">
                  <div className="w-24 shrink-0">
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">Year</label>
                    <input
                      className={`${aboutInputBase} w-full`}
                      value={ev.year}
                      onChange={e => updateLifeEvent(i, 'year', e.target.value)}
                      placeholder="1985"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">Description</label>
                    <input
                      className={`${aboutInputBase} w-full`}
                      value={ev.description}
                      onChange={e => updateLifeEvent(i, 'description', e.target.value)}
                      placeholder="Married in Edinburgh"
                    />
                  </div>
                  <button onClick={() => removeLifeEvent(i)} aria-label="Remove event" className="shrink-0 mb-2.5 text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passions */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Field label="Passions & interests">
            <textarea
              rows={3}
              className={`${aboutInput} resize-none`}
              value={form.passions}
              onChange={e => set('passions', e.target.value)}
              placeholder="The things you love — hobbies, places, people, causes…"
            />
          </Field>
        </div>

        {/* Spotify */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Field label="A playlist that's you (Spotify)">
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
            <p className="text-xs text-red-600 mt-2">That doesn't look like a Spotify link — it should start with open.spotify.com/…</p>
          )}
          {embedUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-stone-200">
              <iframe
                title="Spotify preview"
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
          <Field label="Thoughts & reflections">
            <textarea
              rows={6}
              className={`${aboutInput} resize-none`}
              value={form.reflections}
              onChange={e => set('reflections', e.target.value)}
              placeholder="Anything you'd want the people you love to know. There's no wrong way to write this."
            />
          </Field>
        </div>

        {/* Sharing */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-light text-navy-950 mb-1">Who can see this?</h3>
            <p className="text-stone-500 text-xs">Only the people you tick below. Solicitors and professional advisers are never included.</p>
          </div>

          {eligiblePeople.length === 0 ? (
            <p className="text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
              You haven't added any family, partners, or friends yet. Add trusted people under <strong>People</strong> first, then choose who sees your story.
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
            <h3 className="font-display text-lg font-light text-navy-950 mb-2">When is it shared?</h3>
            <div className="space-y-2.5">
              {[
                { id: 'on_activation', title: 'Share when my plan is activated', desc: 'Kept private until your trusted people are given access (recommended).' },
                { id: 'now',           title: 'Share now',                        desc: 'Available to the people above as soon as you save.' },
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
            {saved && !error && <span className="text-sage-700 inline-flex items-center gap-1.5"><CheckCircle2 size={15} /> Saved</span>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || isDemo}
            className={`${primaryBtn} disabled:bg-stone-300 disabled:cursor-not-allowed shadow-sm`}
          >
            {saving ? 'Saving…' : isDemo ? 'Sign in to edit' : <><Check size={15} /> Save About Me</>}
          </button>
        </div>
      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// RECORD VIDEO — in-browser webcam + mic recording (MediaRecorder)
// ─────────────────────────────────────────────────────────────
function RecordVideo({ onCapture }) {
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
        ? 'Camera & microphone access was blocked. Allow it in your browser to record.'
        : 'Could not start recording on this device. You can upload a file instead.')
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
            <Camera size={14} /> Camera preview
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
          <Square size={12} className="fill-current" /> Stop recording
        </button>
      ) : (
        <button type="button" onClick={start} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-navy-700 hover:bg-stone-50 py-2.5 transition-colors">
          <Camera size={15} /> Record a video
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PERSONAL MESSAGES SECTION
// ─────────────────────────────────────────────────────────────
function MessagesSection({ messages: initialMessages, loading, people, isDemo, planLimits, onUpgrade, addMessage, updateMessage, uploadVideo, uploadMedia, releaseExternal, aiEnabled }) {
  const [showCompose, setShowCompose]   = useState(false)
  const [expanded, setExpanded]         = useState(null)
  const [confirmRelease, setConfirmRelease] = useState(null)  // message id to confirm
  const [confirmReleaseAll, setConfirmReleaseAll] = useState(false)
  const [releasing, setReleasing]       = useState(null)  // id or 'all'
  const [releasedIds, setReleasedIds]   = useState(
    () => new Set(initialMessages.filter(m => m.released).map(m => m.id))
  )
  const [form, setForm] = useState({ recipient_kind: 'person', recipient_name: '', recipient_role: '', recipient_email: '', title: '', type: 'note', content: '' })
  const [mediaFile, setMediaFile] = useState(null)       // recorded Blob or selected File
  const [mediaPreview, setMediaPreview] = useState(null) // object URL for preview
  const [saving, setSaving] = useState(false)

  const setMedia = (file) => {
    setMediaPreview(prev => { if (prev) URL.revokeObjectURL(prev); return file ? URL.createObjectURL(file) : null })
    setMediaFile(file)
  }
  const resetForm = () => {
    setMedia(null)
    setForm({ recipient_kind: 'person', recipient_name: '', recipient_role: '', recipient_email: '', title: '', type: 'note', content: '' })
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

  // Merge server state with local optimistic released state
  const messages = initialMessages.map(m => ({
    ...m,
    released: releasedIds.has(m.id),
    released_at: releasedIds.has(m.id) ? (m.released_at ?? new Date().toISOString()) : null,
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
      setSaveError(`Please record or upload a ${form.type} first.`); return
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
        })
        if (row && mediaFile && form.type !== 'note') {
          await uploadMedia(row.id, mediaFile)
        }
      }
      setShowCompose(false)
      resetForm()
    } catch (err) {
      setSaveError(err?.message || 'Could not save the message. Please try again.')
    } finally { setSaving(false) }
  }

  const fmtDate = (iso) => {
    try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(iso)) } catch { return '—' }
  }

  const unreleased = messages.filter(m => !m.released)

  const messagesLocked = planLimits && !planLimits.personalMessages

  return (
    <SectionShell
      title="Personal Messages"
      subtitle={messagesLocked ? 'Family plan feature' : `${releasedCount} released · ${sealedCount} sealed`}
      action={!messagesLocked ? (
        <div className="flex items-center gap-2">
          {unreleased.length > 1 && (
            <button
              onClick={() => setConfirmReleaseAll(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-3 py-2 rounded-full hover:bg-amber-200 transition-colors"
            >
              <Send size={13} /> Release all
            </button>
          )}
          <button onClick={() => setShowCompose(true)} className={primaryBtn}><Plus size={15} />New message</button>
        </div>
      ) : null}
    >
      {messagesLocked && (
        <div className="rounded-2xl border border-sage-200 bg-sage-50 p-8 text-center">
          <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💌</span>
          </div>
          <h3 className="font-display text-xl font-light text-navy-950 mb-2">Leave something behind that matters.</h3>
          <p className="text-stone-600 text-sm leading-relaxed max-w-sm mx-auto mb-6">
            Write letters, record final wishes, and set release triggers for the people you love — delivered when it matters most. Personal messages are included in the Family plan.
          </p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 btn-aurora text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-navy-700 transition-colors"
          >
            Upgrade to Family →
          </button>
        </div>
      )}
      {/* Info banner */}
      {!messagesLocked && (
      <div className="flex items-start gap-3 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3.5 mb-5">
        <Lock size={15} className="text-navy-600 mt-0.5 shrink-0" />
        <p className="text-xs text-navy-700 leading-relaxed">
          Messages are <strong>sealed</strong> by default — recipients cannot see them until you release them manually, or they are released automatically when Everstead verifies your passing. You can release a message at any time using the button on each card.
        </p>
      </div>
      )}

      {!messagesLocked && (loading ? <LoadingSpinner /> : messages.length === 0 ? (
        <EmptyState icon={MessageSquare} label="No messages yet" action="Leave a personal note or video message for someone important — your spouse, children, attorney, or anyone you choose." />
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
                      For <span className="font-medium text-navy-700">{msg.recipient_name}</span>
                      {msg.recipient_role ? ` · ${msg.recipient_role}` : ''}
                      {msg.recipient_email ? <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-navy-600 bg-navy-50 px-1.5 py-0.5 rounded-full align-middle"><Send size={9} /> via email</span> : null}
                    </p>
                  </button>

                  {/* Status + release button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isReleased ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 size={11} /> Released {msg.released_at ? fmtDate(msg.released_at) : ''}
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmRelease(msg.id)}
                        disabled={isReleasingThis}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 transition-colors disabled:opacity-50"
                      >
                        {isReleasingThis ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                        {isReleasingThis ? 'Releasing…' : 'Release now'}
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
                      <p className="text-sm font-semibold text-amber-900">Release this message now?</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {msg.recipient_email
                          ? <>Once released, we'll email <strong>{msg.recipient_email}</strong> a private, secure link to view this message — no account needed. This cannot be undone.</>
                          : <>Once released, <strong>{msg.recipient_name}</strong> will be able to see this message immediately on their delegate dashboard. This cannot be undone.</>}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => doRelease(msg.id)}
                        disabled={isReleasingThis}
                        className="inline-flex items-center gap-1.5 btn-aurora text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
                      >
                        {isReleasingThis ? 'Releasing…' : 'Yes, release'}
                      </button>
                      <button
                        onClick={() => setConfirmRelease(null)}
                        className="text-xs font-semibold text-stone-600 border border-stone-200 px-3 py-2 rounded-full hover:bg-stone-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded body */}
                {isOpen && (
                  <div className="border-t border-stone-100 px-5 py-4 bg-stone-50 space-y-4">
                    {(msg.type === 'video' || msg.type === 'photo') ? (
                      (msg.media_url || msg.video_url) ? (
                        <div className="rounded-xl overflow-hidden border border-stone-200">
                          {msg.type === 'video'
                            ? <video src={msg.media_url || msg.video_url} controls playsInline className="w-full max-h-80 bg-black" />
                            : <img src={msg.media_url || msg.video_url} alt={msg.title} className="w-full max-h-80 object-contain bg-stone-50" />}
                        </div>
                      ) : isDemo ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 aurora-field aurora-dim rounded-xl text-white">
                          {msg.type === 'video' ? <Play size={22} /> : <ImageIcon size={22} />}
                          <p className="text-sm text-stone-300">{msg.type === 'video' ? 'Video' : 'Photo'} stored securely — preview available in your real plan.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-8 bg-white border border-dashed border-stone-200 rounded-xl">
                          <p className="text-sm text-stone-500">No {msg.type} added yet.</p>
                          <label className="cursor-pointer inline-flex items-center gap-2 btn-aurora text-white text-xs font-semibold px-4 py-2 rounded-full transition-transform hover:-translate-y-0.5">
                            <Upload size={13} /> Upload {msg.type}
                            <input type="file" accept={msg.type === 'video' ? 'video/*' : 'image/*'} className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadMedia(msg.id, file) }} />
                          </label>
                        </div>
                      )
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">Message content</p>
                        <p className="text-sm text-navy-900 leading-relaxed whitespace-pre-wrap bg-white border border-stone-200 rounded-xl px-4 py-3.5">
                          {msg.content || <span className="text-stone-400 italic">No content written yet.</span>}
                        </p>
                      </div>
                    )}
                    {!isReleased && (
                      <div className="flex gap-3">
                        <button onClick={() => {}} disabled={isDemo} className={`${secondaryBtn} disabled:opacity-40 disabled:cursor-not-allowed`} title={isDemo ? 'Not available in demo' : undefined}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => {}}
                          disabled={isDemo}
                          title={isDemo ? 'Not available in demo' : undefined}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-full hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                    {isReleased && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> This message has been released and is visible to {msg.recipient_name}.
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
        <Modal title="✨ Help me write this" onClose={() => setShowAIWriter(false)}>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            Answer a few questions and I'll write a warm, heartfelt message for {form.recipient_name || 'your recipient'}.
          </p>
          <form onSubmit={handleAIWrite} className="space-y-4">
            <Field label="Your relationship">
              <input
                className={input}
                placeholder="e.g. My daughter, My oldest friend, My partner"
                value={aiWriterForm.relationship}
                onChange={e => setAiWriterForm(p => ({ ...p, relationship: e.target.value }))}
              />
            </Field>
            <Field label="What do you most want them to know?">
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder="e.g. How proud I am of them, how much they mean to me…"
                value={aiWriterForm.wants}
                onChange={e => setAiWriterForm(p => ({ ...p, wants: e.target.value }))}
              />
            </Field>
            <Field label="Anything you're grateful for, or want to say sorry for?">
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder="e.g. Thank you for always being there. I'm sorry we didn't talk more."
                value={aiWriterForm.gratitude}
                onChange={e => setAiWriterForm(p => ({ ...p, gratitude: e.target.value }))}
              />
            </Field>
            <Field label="What are your hopes for their future?">
              <input
                className={input}
                placeholder="e.g. That they find joy, that they follow their dreams…"
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
                {aiWriterLoading ? <><Loader2 size={14} className="animate-spin" />Writing…</> : <><Sparkles size={14} />Write my message</>}
              </button>
              <button type="button" onClick={() => setShowAIWriter(false)} className={secondaryBtn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Release all confirmation modal */}
      {confirmReleaseAll && (
        <Modal title="Release all messages?" onClose={() => setConfirmReleaseAll(false)}>
          <div className="space-y-4">
            <p className="text-sm text-stone-700 leading-relaxed">
              This will immediately release <strong>{unreleased.length} sealed message{unreleased.length !== 1 ? 's' : ''}</strong> to their named recipients. Each person will be able to see their message on their delegate dashboard straight away.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              This cannot be undone. Released messages are permanently visible to their recipients.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={doReleaseAll}
                disabled={releasing === 'all'}
                className={`${primaryBtn} flex-1`}
              >
                {releasing === 'all' ? 'Releasing…' : `Release ${unreleased.length} message${unreleased.length !== 1 ? 's' : ''}`}
              </button>
              <button onClick={() => setConfirmReleaseAll(false)} className={secondaryBtn}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Compose modal */}
      {showCompose && (
        <Modal title="New personal message" onClose={() => setShowCompose(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">Message type</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: 'note',  label: 'Written note', icon: FileEdit,  desc: 'A letter' },
                  { value: 'video', label: 'Video',        icon: Video,     desc: 'Record or upload' },
                  { value: 'photo', label: 'Photo',        icon: ImageIcon, desc: 'Upload an image' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setMedia(null); setSaveError(null); setForm(p => ({ ...p, type: opt.value })) }}
                    className={`flex flex-col gap-1 items-start p-3 rounded-xl border text-left transition-colors ${
                      form.type === opt.value ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-300' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <opt.icon size={16} className={form.type === opt.value ? 'text-navy-700' : 'text-stone-400'} />
                    <p className="text-xs font-semibold text-navy-900">{opt.label}</p>
                    <p className="text-[10px] text-stone-400 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Message title" required>
              <input
                className={input}
                placeholder={form.type === 'video' ? 'e.g. A video for Emily' : 'e.g. To my son Thomas'}
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Field>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Recipient <span className="text-red-400">*</span></label>
              <div className="inline-flex p-0.5 bg-stone-100 rounded-full mb-2.5 text-xs font-semibold">
                <button type="button" onClick={() => setForm(p => ({ ...p, recipient_kind: 'person' }))} className={`px-3 py-1.5 rounded-full transition-colors ${form.recipient_kind === 'person' ? 'bg-white shadow-sm text-navy-900' : 'text-stone-500'}`}>A trusted person</button>
                <button type="button" onClick={() => setForm(p => ({ ...p, recipient_kind: 'email' }))} className={`px-3 py-1.5 rounded-full transition-colors ${form.recipient_kind === 'email' ? 'bg-white shadow-sm text-navy-900' : 'text-stone-500'}`}>Someone by email</button>
              </div>
              {form.recipient_kind === 'person' ? (
                <select
                  className={input}
                  value={form.recipient_name}
                  onChange={e => { const person = people.find(p => p.name === e.target.value); setForm(p => ({ ...p, recipient_name: e.target.value, recipient_role: person?.role || '' })) }}
                  required
                >
                  <option value="" disabled>Select a person…</option>
                  {people.length > 0
                    ? people.map(p => <option key={p.id} value={p.name}>{p.name} — {p.role}</option>)
                    : <option disabled>No trusted people yet — add someone in People first</option>}
                </select>
              ) : (
                <div className="space-y-2">
                  <input className={input} type="text" placeholder="Their name (optional)" value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))} />
                  <input className={input} type="email" placeholder="their@email.com" value={form.recipient_email} onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))} required />
                  <p className="text-[11px] text-stone-400 leading-snug">They don't need an account. When you release the message, we'll email them a private, secure link to view it.</p>
                </div>
              )}
            </div>

            {form.type === 'note' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-600">Message <span className="text-red-400">*</span></label>
                  {form.recipient_name && aiEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => setShowAIWriter(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2.5 py-1.5 rounded-full hover:bg-sage-100 transition-colors"
                    >
                      <Sparkles size={11} /> Help me write this
                    </button>
                  )}
                </div>
                <textarea
                  className={`${input} min-h-[140px] resize-y`}
                  placeholder="Write your personal message here. It will be encrypted and only released to the recipient when needed."
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  required
                />
              </div>
            )}

            {(form.type === 'video' || form.type === 'photo') && (
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">{form.type === 'video' ? 'Your video' : 'Your photo'} <span className="text-red-400">*</span></label>
                {mediaPreview ? (
                  <div className="rounded-xl border border-stone-200 overflow-hidden">
                    {form.type === 'video'
                      ? <video src={mediaPreview} controls playsInline className="w-full max-h-72 bg-black" />
                      : <img src={mediaPreview} alt="Preview" className="w-full max-h-72 object-contain bg-stone-50" />}
                    <button type="button" onClick={() => setMedia(null)} className="w-full text-xs font-semibold text-stone-500 hover:text-navy-800 py-2.5 transition-colors border-t border-stone-100">Remove and choose again</button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {form.type === 'video' && <RecordVideo onCapture={(f) => { setMedia(f); setSaveError(null) }} />}
                    <label className="flex items-center justify-center gap-2 cursor-pointer text-sm font-medium text-navy-700 border border-dashed border-stone-300 rounded-xl py-3 hover:bg-stone-50 transition-colors">
                      <Upload size={15} /> Upload {form.type === 'video' ? 'a video' : 'a photo'}
                      <input type="file" accept={form.type === 'video' ? 'video/*' : 'image/*'} className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) { setMedia(f); setSaveError(null) } }} />
                    </label>
                    <p className="text-[11px] text-stone-400 leading-snug text-center">{form.type === 'video' ? 'Record yourself, or upload mp4 / mov / webm.' : 'Upload a jpg or png — a scanned letter or a meaningful photo.'}</p>
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
                {saving ? 'Saving…' : 'Save message'}
              </button>
              <button type="button" onClick={() => setShowCompose(false)} className={secondaryBtn}>Cancel</button>
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
const ACCESS_AREAS = [
  {
    key: 'accounts', label: 'Accounts & Assets', icon: Landmark,
    desc: 'Bank accounts, investments, pensions',
    subKey: 'accountCategories',
    subLabel: 'Which account categories?',
    subOptions: ['Banking', 'Retirement', 'Investment', 'Insurance', 'Digital', 'Property', 'Other'],
  },
  {
    key: 'documents', label: 'Documents', icon: FileText,
    desc: 'Wills, insurance policies, deeds',
    subKey: 'documentTypes',
    subLabel: 'Which document types?',
    subOptions: ['Legal', 'Insurance', 'Property', 'Medical', 'Personal', 'Financial', 'Other'],
  },
  {
    key: 'messages', label: 'Personal Messages', icon: MessageSquare,
    desc: 'Private letters and video messages',
  },
  {
    key: 'instructions', label: 'Instructions', icon: BookOpen,
    desc: 'Step-by-step guidance and wishes',
  },
  {
    key: 'subscriptions', label: 'Subscriptions', icon: CreditCard,
    desc: 'Recurring services and memberships',
  },
]

const ALL_AREA_KEYS = ACCESS_AREAS.map(a => a.key)

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
  const emptyForm = {
    name: '', email: '', role: '',
    accessAreas: [],
    accountCategories: [],
    documentTypes: [],
    accessTiming: 'always', // 'always' | 'after_death'
  }
  const [form, setForm] = useState(initial ?? emptyForm)
  const [accessError, setAccessError] = useState(null)

  const isFullAccess = form.role === 'Spouse / Partner'

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
      setAccessError('Please select at least one access area.')
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
          <Field label="Full name" required>
            <input className={input} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Jane Smith" required />
          </Field>
          <Field label="Email address" required>
            <input type="email" className={input} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="jane@example.com" required />
          </Field>
        </>
      )}

      <Field label="Role" required>
        <select
          className={input}
          value={form.role}
          onChange={e => setForm(p => ({...p, role: e.target.value, accessAreas: [], accountCategories: [], documentTypes: []}))}
          required
        >
          <option value="" disabled>Select a role…</option>
          <optgroup label="Full access">
            <option>Spouse / Partner</option>
          </optgroup>
          <optgroup label="Estate &amp; legal">
            <option>Primary Executor</option>
            <option>Secondary Executor</option>
            <option>Estate Attorney</option>
          </optgroup>
          <optgroup label="Family">
            <option>Family Member</option>
            <option>Family Caretaker</option>
          </optgroup>
          <optgroup label="Professional">
            <option>Financial Advisor</option>
            <option>Healthcare Proxy</option>
          </optgroup>
        </select>
      </Field>

      {form.role && (
        <>
          {/* ── Access areas ── */}
          {isFullAccess ? (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3">
              <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                <span className="font-semibold">Full access role</span> — Spouse / Partner can view all sections of your plan.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-stone-600 mb-1">Access areas <span className="text-red-500">*</span></p>
              <p className="text-xs text-stone-400 mb-3">Choose which sections of your plan this person can view.</p>
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
                          <p className="text-sm font-medium text-navy-900">{area.label}</p>
                          <p className="text-xs text-stone-400">{area.desc}</p>
                        </div>
                      </button>

                      {/* Sub-selector: shown when area is checked and has sub-options */}
                      {checked && area.subOptions && (
                        <div className="ml-7 mt-1.5 pl-3 border-l-2 border-navy-100 space-y-1.5 pb-1">
                          <p className="text-xs text-stone-500 font-medium mb-1">{area.subLabel}</p>
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
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                          {form[area.subKey].length === 0 && (
                            <p className="text-xs text-stone-400 italic">All types (no filter)</p>
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
            <p className="text-xs font-semibold text-stone-600 mb-1">When can they access this?</p>
            <p className="text-xs text-stone-400 mb-3">Control whether access is immediate or only unlocked after you pass away or are reported incapacitated.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'always', label: 'While I\'m alive', desc: 'Access granted now, upon acceptance' },
                { value: 'after_death', label: 'After death / incapacity', desc: 'Locked until you are reported by a trusted contact' },
              ].map(opt => {
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
                      <span className="text-sm font-medium text-navy-900">{opt.label}</span>
                    </div>
                    <p className="text-xs text-stone-400 pl-6">{opt.desc}</p>
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
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>Cancel</button>
      </div>
    </form>
  )
}

function PeopleSection({ people, loading, invite, resendInvite, updatePerson, removePerson, planLimits, profile, onUpgrade }) {
  const [showInvite, setShowInvite] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sectionError, setSectionError] = useState(null)

  const handleInvite = async (payload) => {
    setSaving(true)
    try {
      await invite(payload)
      setShowInvite(false)
    } catch (err) { setSectionError(err.message ?? 'Could not send invite. Please try again.') }
    finally { setSaving(false) }
  }

  const handleEdit = async (payload) => {
    setSaving(true)
    try {
      await updatePerson(editingPerson.id, payload)
      setEditingPerson(null)
    } catch (err) { setSectionError(err.message ?? 'Could not save changes.') }
    finally { setSaving(false) }
  }

  const handleRemove = async (person) => {
    if (!window.confirm(`Remove ${person.name ?? 'this person'} from your trusted people? They will lose all access.`)) return
    try { await removePerson(person.id) }
    catch (err) { setSectionError(err.message ?? 'Could not remove person.') }
  }

  // Build a readable access summary for each person card
  const accessSummary = (person) => {
    const areas = person.access_grants?.accessAreas ?? []
    if (!areas.length) return 'No areas selected'
    if (areas.length === ALL_AREA_KEYS.length) return 'Full access'
    return areas.map(k => ACCESS_AREAS.find(a => a.key === k)?.label ?? k).join(', ')
  }

  const timingLabel = (person) => {
    const t = person.access_grants?.accessTiming
    return t === 'after_death' ? 'After death / incapacity' : 'While alive'
  }

  const contactLimit = getLimit(profile?.plan, 'trustedPeople')
  const atLimit = isAtLimit(profile?.plan, 'trustedPeople', people.length)

  return (
    <SectionShell
      title="Trusted People"
      subtitle={contactLimit !== null ? `${people.length} / ${contactLimit} trusted contacts` : `${people.length} trusted contacts`}
      action={
        atLimit
          ? (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-2 hover:bg-amber-100 transition-colors"
            >
              <Lock size={14} /> Limit reached — upgrade
            </button>
          )
          : <button onClick={() => setShowInvite(true)} className={primaryBtn}><Plus size={15} />Invite person</button>
      }
    >
      {/* How access is released — reassurance at the moment of assigning access */}
      <div className="mb-4 flex items-start gap-3 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
        <ShieldCheck size={15} className="text-sage-700 mt-0.5 shrink-0" />
        <p className="text-sm text-stone-600 flex-1 leading-relaxed">
          Nothing here is released while you're alive — you decide exactly what each person sees. After a death, a trusted person reports it and our team verifies before any after-death access opens.{' '}
          <a href="/security" target="_blank" rel="noopener noreferrer" className="font-medium text-sage-800 underline underline-offset-2 hover:text-sage-900 whitespace-nowrap">How access is released →</a>
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
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3 mb-4">
          The Essential plan includes 1 trusted contact.{' '}
          <button onClick={onUpgrade} className="font-semibold underline underline-offset-2 hover:text-amber-900">
            Upgrade to Family →
          </button>{' '}
          to invite up to 10 people.
        </p>
      )}
      {loading ? <LoadingSpinner /> : people.length === 0 ? (
        <EmptyState icon={Users} label="No trusted people yet" action="Invite an executor, healthcare proxy, or family member to your plan." />
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
                  <span className="text-xs text-stone-400">{person.role}</span>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    person.invite_status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    person.invite_status === 'declined' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {person.invite_status}
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{person.email}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="text-xs text-stone-500"><span className="font-medium text-stone-600">Access:</span> {accessSummary(person)}</span>
                  <span className="text-xs text-stone-500"><span className="font-medium text-stone-600">Timing:</span> {timingLabel(person)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {person.invite_status === 'pending' && (
                  <button onClick={() => resendInvite(person.id)} className="text-xs text-navy-600 hover:text-navy-900 font-medium px-2 py-1 rounded-full hover:bg-navy-50 transition-colors">
                    Resend
                  </button>
                )}
                <button
                  onClick={() => setEditingPerson(person)}
                  className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50"
                  title="Edit access"
                  aria-label={`Edit access for ${person.name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleRemove(person)}
                  className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  title="Remove person"
                  aria-label={`Remove ${person.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <Modal title="Invite trusted person" onClose={() => setShowInvite(false)}>
          <PersonAccessForm
            onSave={handleInvite}
            onCancel={() => setShowInvite(false)}
            saving={saving}
            submitLabel="Send invite"
          />
        </Modal>
      )}

      {editingPerson && (
        <Modal title={`Edit access — ${editingPerson.name}`} onClose={() => setEditingPerson(null)}>
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
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// INSTRUCTIONS SECTION
// ─────────────────────────────────────────────────────────────
function InstructionsSection({ instructions, loading, add, update, remove, profile, onUpgrade }) {
  const emptyForm = { title: '', category: 'Immediate', audience: 'Executor', body: '', stepsText: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingInstruction, setEditingInstruction] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // ── AI writing assistant (conversational) ──
  const [showAssistant, setShowAssistant] = useState(false)
  const [assistantMessages, setAssistantMessages] = useState([
    { role: 'assistant', content: 'I\'m here to help you write clear instructions for your family or executor. What do you want to help them with? For example: "What to do in the first 48 hours", "How to access our bank accounts", or "My medical wishes."' }
  ])
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
          audience: quickWriteForm.recipient?.toLowerCase().includes('executor') ? 'Executor' : 'Family',
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
        setAssistantMessages(prev => [...prev, { role: 'assistant', content: 'This is just a preview — sign in to your account to use the assistant.' }])
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
          const validCategories = ['Immediate', 'Financial', 'Household', 'Medical', 'Digital', 'Personal', 'Other']
          const validAudiences = ['Executor', 'Family', 'Healthcare Proxy', 'Advisor', 'Everyone']
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
      setAssistantMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t connect right now. Please try again.' }])
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
    setAssistantMessages([
      { role: 'assistant', content: 'I\'m here to help you write clear instructions for your family or executor. What do you want to help them with? For example: "What to do in the first 48 hours", "How to access our bank accounts", or "My medical wishes."' }
    ])
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
      title="Instructions"
      subtitle={`${instructions.length} instruction sets`}
      action={
        <div className="flex items-center gap-2">
          {profile?.ai_features_enabled !== false && (
          <button
            onClick={() => setShowQuickWrite(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-sage-50 hover:bg-sage-100 border border-sage-200 px-3 py-2 rounded-full transition-colors"
          >
            <Sparkles size={12} /> Write with AI
          </button>
          )}
          <button
            onClick={() => setShowAssistant(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 border border-navy-200 px-3 py-2 rounded-full transition-colors"
          >
            <Zap size={12} /> Help me write this
          </button>
          <button onClick={atInstructionLimit ? undefined : openAdd} disabled={atInstructionLimit} className={primaryBtn} style={atInstructionLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
            <Plus size={15} />Add instructions
          </button>
        </div>
      }
    >
      {atInstructionLimit && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3 mb-4">
          The Essential plan includes 1 instruction set.{' '}
          <button onClick={onUpgrade} className="font-semibold underline underline-offset-2 hover:text-amber-900">
            Upgrade to Family →
          </button>{' '}
          for unlimited instructions.
        </p>
      )}
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
                  <span className="text-xs text-stone-400">
                    {inst.instruction_steps?.length
                      ? `${inst.instruction_steps.length} step${inst.instruction_steps.length === 1 ? '' : 's'}`
                      : 'No steps yet'}
                  </span>
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

      {/* ── AI quick-write modal (Feature 1) ── */}
      {showQuickWrite && (
        <Modal title="✨ Write with AI" onClose={() => setShowQuickWrite(false)}>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            Tell me about the instruction set you'd like to create and I'll draft it for you to review.
          </p>
          <form onSubmit={handleQuickWrite} className="space-y-4">
            <Field label="What is this instruction set about?" required>
              <input
                className={input}
                placeholder="e.g. What to do in the first 48 hours, How to access our finances, My medical wishes"
                value={quickWriteForm.purpose}
                onChange={e => setQuickWriteForm(p => ({ ...p, purpose: e.target.value }))}
                required
                autoFocus
              />
            </Field>
            <Field label="Who is this for?">
              <input
                className={input}
                placeholder="e.g. My executor, My children, My healthcare proxy"
                value={quickWriteForm.recipient}
                onChange={e => setQuickWriteForm(p => ({ ...p, recipient: e.target.value }))}
              />
            </Field>
            <Field label="What should they do first?">
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder="e.g. Call my solicitor at Smith & Jones (01234 567890), notify the bank…"
                value={quickWriteForm.firstSteps}
                onChange={e => setQuickWriteForm(p => ({ ...p, firstSteps: e.target.value }))}
              />
            </Field>
            <Field label="Useful contacts, accounts, or resources to mention">
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder="e.g. Barclays current account sort code 20-44-15, account 12345678"
                value={quickWriteForm.resources}
                onChange={e => setQuickWriteForm(p => ({ ...p, resources: e.target.value }))}
              />
            </Field>
            <Field label="Anything else to include?">
              <input
                className={input}
                placeholder="Any additional wishes or important notes"
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
                {quickWriteLoading ? <><Loader2 size={14} className="animate-spin" />Writing your instructions…</> : <><Sparkles size={14} />Write my instructions</>}
              </button>
              <button type="button" onClick={() => setShowQuickWrite(false)} className={secondaryBtn}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── AI writing assistant modal ── */}
      {showAssistant && (
        <Modal title="Writing assistant" onClose={closeAssistant}>
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
                  <p className="text-xs font-semibold text-sage-800">Ready to use: "{parsedSuggestion.title}"</p>
                  <p className="text-xs text-sage-700 mt-0.5">{parsedSuggestion.stepsText.split('\n').length} steps · {parsedSuggestion.category} · For: {parsedSuggestion.audience}</p>
                </div>
                <button
                  onClick={applyAssistantSuggestion}
                  className="shrink-0 text-xs font-semibold text-white bg-sage-600 hover:bg-sage-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  Use this →
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
                placeholder="Describe what you want to communicate…"
                disabled={assistantLoading}
              />
              <button
                onClick={sendAssistantMessage}
                disabled={!assistantInput.trim() || assistantLoading}
                className="shrink-0 btn-aurora text-white px-3 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </Modal>
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
  const [expanded, setExpanded] = useState(null)
  const unread = alerts.filter(a => !a.is_read).length

  return (
    <SectionShell
      title="Alerts"
      subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
      action={
        unread > 0
          ? <button onClick={markAllRead} className={secondaryBtn}><CheckCheck size={15} />Mark all read</button>
          : null
      }
    >
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <EmptyState icon={Bell} label="No alerts" action="You're all caught up." />
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
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge}`}>{a.severity}</span>
                      {!a.is_read && <span className="w-2 h-2 rounded-full bg-navy-600 shrink-0" />}
                      <ChevronRight size={14} className={`text-stone-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
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
                      <CheckCircle2 size={13} /> Mark as read
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
// RESOURCES SECTION (owner)
// ─────────────────────────────────────────────────────────────
const OWNER_GUIDES = [
  {
    icon: Landmark,
    title: 'Accounts — what to add',
    color: 'bg-blue-50 text-blue-700',
    items: [
      { label: 'Bank & current accounts', detail: 'Add the bank name, account number (last 4 digits is fine), and a branch contact or online login hint. Include all accounts the family would need to notify or close.' },
      { label: 'Savings & ISAs', detail: 'Include the provider, account type, and rough value if comfortable. Even a ballpark figure helps your executor prioritise.' },
      { label: 'Pensions & retirement funds', detail: 'List every pension — workplace, personal, and state. Include the scheme name and a reference number. Many pensions are missed during estate admin.' },
      { label: 'Investments & shares', detail: 'Stocks, funds, and ISAs. Note the platform (e.g. Vanguard, Hargreaves Lansdown) and any dealing accounts. Include share certificates if held in paper form.' },
      { label: 'Property', detail: 'Your main home, any buy-to-let, land, or overseas property. Include the title number if known (find it on the Land Registry) and the name of your solicitor.' },
      { label: 'Insurance policies', detail: 'Life insurance, income protection, critical illness, and home insurance. Record the policy number and the insurer\'s claims contact — not just the broker.' },
      { label: 'Digital assets & crypto', detail: 'Cryptocurrency wallets, NFTs, or digital investment accounts. Note the platform and, separately in a secure place, the access recovery method.' },
      { label: 'Subscriptions to cancel', detail: 'Streaming services, software, memberships, and direct debits. Your executor cannot cancel what they can\'t find — even small ones add up.' },
    ],
  },
  {
    icon: FileText,
    title: 'Documents — what to upload',
    color: 'bg-emerald-50 text-emerald-700',
    items: [
      { label: 'Will', detail: 'The single most important document. Upload the signed, witnessed copy. If you have a solicitor-held original, note their contact details in the description.' },
      { label: 'Lasting Power of Attorney (LPA)', detail: 'Both property & financial affairs and health & welfare LPAs if you have them. If you don\'t, consider making one — it is far harder to arrange once capacity is lost.' },
      { label: 'Passport & driving licence', detail: 'Useful for identity verification during probate. A scan is fine. Note the expiry date.' },
      { label: 'Birth & marriage certificates', detail: 'Required for probate and benefit claims. Include any deed poll or change of name documents.' },
      { label: 'Property deeds & mortgage documents', detail: 'Title deeds, mortgage statements, and lease agreements for any property you own or part-own.' },
      { label: 'Insurance schedules', detail: 'The summary page of each policy — not just the renewal letter. Include the policy number and what is covered.' },
      { label: 'Funeral wishes or pre-paid plan', detail: 'A letter of wishes or pre-paid funeral plan. This does not need to be legally binding — a clear document is enough to guide your family.' },
      { label: 'Letter of wishes', detail: 'Not part of your will, but a personal note to your executor and family. Cover personal possessions, digital accounts, donations, and anything your will doesn\'t address.' },
    ],
  },
  {
    icon: Users,
    title: 'People — choosing your trusted contacts',
    color: 'bg-violet-50 text-violet-700',
    items: [
      { label: 'Executor', detail: 'The person responsible for administering your estate. They don\'t need legal expertise — but they need to be organised, trustworthy, and willing. Many people appoint two co-executors as a backup.' },
      { label: 'Lasting Power of Attorney holder', detail: 'This person can make financial and legal decisions on your behalf if you lose mental capacity. Choose someone you trust completely — this is a significant responsibility.' },
      { label: 'Next of kin', detail: 'Your closest relative, for emergency notification purposes. Different from your executor — they may be the same person or different.' },
      { label: 'Solicitor', detail: 'If you use a solicitor to hold your will or LPA, add them as a professional contact with their firm name and direct number. They should be reachable within days, not weeks.' },
      { label: 'Financial adviser', detail: 'Your adviser will know which accounts and policies exist — add them as a contact. They can assist your executor in identifying assets and claims.' },
      { label: 'Accountant', detail: 'Useful for estates with business interests, rental income, or complex tax affairs. Your executor may need to file a final self-assessment return.' },
      { label: 'How much access to grant', detail: 'Only share what each person needs. Your executor needs the full picture. A family member you\'ve added for emergency contact may only need to see your GP details and next of kin. Use the role-based access controls on each person\'s profile.' },
    ],
  },
  {
    icon: BookOpen,
    title: 'Instructions — what to write',
    color: 'bg-amber-50 text-amber-700',
    items: [
      { label: 'First 48 hours', detail: 'What should happen immediately: who to call, which accounts to freeze, where the will is held. Write this for someone who has just received the news and doesn\'t know where to begin.' },
      { label: 'Funeral arrangements', detail: 'Your preferences for burial or cremation, any religious or personal wishes, favourite music, and whether flowers or donations are preferred. Even rough notes help.' },
      { label: 'Digital account access', detail: 'Email, social media, photo libraries, and cloud storage. State whether accounts should be memorialised, deleted, or passed to someone. Include who holds access to recovery codes.' },
      { label: 'Property & home', detail: 'Where keys are held, utility providers and account numbers, any ongoing maintenance contracts, the alarm code (securely noted), and whether there is a lodger or tenant.' },
      { label: 'Business or self-employment', detail: 'If you run a business or are self-employed, write instructions for any partners, employees, or clients who need to be notified. Include company number and accountant details.' },
      { label: 'Personal messages', detail: 'Consider using the Personal Messages feature to leave private notes for specific people — these are only released when your executor confirms a life event. It\'s separate from instructions.' },
    ],
  },
  {
    icon: MessageSquare,
    title: 'Personal Messages — a note on timing',
    color: 'bg-rose-50 text-rose-700',
    items: [
      { label: 'What they are', detail: 'Personal Messages are private letters or notes addressed to specific trusted people. They are stored encrypted and not visible to anyone until you or your executor releases them.' },
      { label: 'When they are released', detail: 'You can release a message yourself at any time (e.g. for a birthday or milestone). Or your executor can release them once a life event has been reported and verified by Everstead.' },
      { label: 'What to write', detail: 'Letters to your children or grandchildren, final words to a partner, guidance to a trusted friend. These are not legal documents — write them as you would speak.' },
      { label: 'Available on Family plan', detail: 'Personal Messages are included in the Family plan. If you\'re on Essential, upgrade to unlock this feature.' },
    ],
  },
]

function OwnerResourceCard({ guide, expanded, onToggle }) {
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
          <p className="font-semibold text-navy-900 text-sm">{guide.title}</p>
          <p className="text-xs text-stone-400 mt-0.5">{guide.items.length} topics</p>
        </div>
        <ChevronRight size={16} className={`text-stone-400 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-stone-100 divide-y divide-stone-50">
          {guide.items.map((item, i) => (
            <div key={i} className="px-6 py-4">
              <p className="text-sm font-semibold text-navy-800 mb-1">{item.label}</p>
              <p className="text-sm text-stone-500 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResourcesSection() {
  const [expandedIndex, setExpandedIndex] = useState(null)
  const toggle = i => setExpandedIndex(v => v === i ? null : i)

  return (
    <SectionShell
      title="Help & Resources"
      subtitle="Guides to help you get the most out of your Everstead plan"
    >
      <div className="space-y-3">
        {OWNER_GUIDES.map((guide, i) => (
          <OwnerResourceCard
            key={i}
            guide={guide}
            expanded={expandedIndex === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>

      <div className="mt-6 bg-navy-50 border border-navy-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-navy-900 text-sm">Need more help?</p>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">Our support team is available Monday–Friday, 9am–5pm GMT. We also have guides and FAQs on the resources page.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <a href="mailto:support@everstead.care" className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-300 rounded-full px-3 py-2 hover:bg-navy-100 transition-colors">
            <MessageSquare size={13} /> Email support
          </a>
          <a href="/resources" className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-300 rounded-full px-3 py-2 hover:bg-navy-100 transition-colors">
            <ExternalLink size={13} /> Resources
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
        <ExternalLink size={13} /> {loading ? 'Opening billing portal…' : 'Manage billing & billing cycle'}
      </button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// REFERRAL LINK BOX
// ─────────────────────────────────────────────────────────────
function ReferralLinkBox({ referralCode }) {
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
        {copied ? <><Check size={13} />Copied!</> : <><Copy size={13} />Copy link</>}
      </button>
    </div>
  )
}

function SettingsSection({ profile, isDemo, updateProfile, refreshProfile, onUpgrade, onDeleteAccount, upgradeError }) {
  const PLANS = [
    { id: 'essential', name: 'Essential', tier: 1, monthly: PRICING.essential.monthly.perMonth, yearly: PRICING.essential.annual.perMonth, desc: 'For individuals. 2 trusted contacts, 5 GB storage.' },
    { id: 'family',    name: 'Family',    tier: 2, monthly: PRICING.family.monthly.perMonth,    yearly: PRICING.family.annual.perMonth,    desc: 'Household members, up to 10 trusted contacts, 25 GB storage.' },
  ]
  const PLAN_TIERS = { essential: 1, family: 2, advisor: 3 }
  const currentTier   = PLAN_TIERS[profile.plan] ?? 1
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
    ? new Date(effectiveCancelAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
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
      if (!user?.email) { setReauthError('Could not verify your account. Please sign in again.'); setReauthBusy(false); return }
      const { error } = await sb.auth.signInWithPassword({ email: user.email, password: reauthPassword })
      if (error) { setReauthError('That password doesn’t match. Please try again.'); setReauthBusy(false); return }
      setReauthBusy(false); setReauthOpen(false); setReauthPassword('')
      await handleExport()
    } catch {
      setReauthError('Could not verify right now. Please try again.'); setReauthBusy(false)
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
        throw new Error(err.error || `Export failed (${res.status})`)
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
      setExportError(err.message || 'Export failed. Please try again.')
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
      if (!res.ok) throw new Error(data.error || 'Could not cancel subscription.')
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
      if (!res.ok) throw new Error(data.error || 'Could not reactivate subscription.')
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
    catch (err) { setProfileError(err.message ?? 'Could not save profile.') }
    finally { setProfileSaving(false) }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return }
    if (isDemo) { setPwMsg({ type: 'ok', text: 'Demo mode — password changes are not saved.' }); return }
    setPwSaving(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      setPwMsg({ type: 'ok', text: 'Password updated.' })
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <SectionShell title="Settings" subtitle="Manage your account, contact details, and plan">
      <div className="space-y-6">

        {/* ── Profile details ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-5 flex items-center gap-2">
            <Users size={15} className="text-navy-600" /> Personal details
          </h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name">
                <input className={input} value={profileForm.full_name}
                  onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="James Thornton" />
              </Field>
              <Field label="Email address">
                <input className={`${input} bg-stone-50 cursor-not-allowed`} value={profile.email} disabled
                  title="To change your email address, contact support." />
              </Field>
              <Field label="Phone number">
                <input className={input} value={profileForm.phone} type="tel"
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+44 7700 900000" />
              </Field>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">Date of birth</label>
                <input
                  type="date"
                  className={input}
                  value={profileForm.date_of_birth}
                  onChange={e => setProfileForm(p => ({ ...p, date_of_birth: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-stone-400">Used to send you a birthday message each year.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Address</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Address line 1">
                  <input className={input} value={profileForm.address_line1}
                    onChange={e => setProfileForm(p => ({ ...p, address_line1: e.target.value }))}
                    placeholder="14 Kensington Road" />
                </Field>
                <Field label="Address line 2">
                  <input className={input} value={profileForm.address_line2}
                    onChange={e => setProfileForm(p => ({ ...p, address_line2: e.target.value }))}
                    placeholder="Flat 2 (optional)" />
                </Field>
                <Field label="City / Town">
                  <input className={input} value={profileForm.city}
                    onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="London" />
                </Field>
                <Field label="Postcode">
                  <input className={input} value={profileForm.postcode}
                    onChange={e => setProfileForm(p => ({ ...p, postcode: e.target.value }))}
                    placeholder="SW7 2BT" />
                </Field>
                <Field label="Country">
                  <input className={input} value={profileForm.country}
                    onChange={e => setProfileForm(p => ({ ...p, country: e.target.value }))}
                    placeholder="United Kingdom" />
                </Field>
              </div>
            </div>

            {profileError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileError}</p>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={profileSaving} className={primaryBtn}>
                {profileSaving ? 'Saving…' : profileSaved ? '✓ Saved' : 'Save changes'}
              </button>
              {profileSaved && <span className="text-xs text-emerald-600 font-medium">Details updated.</span>}
            </div>
          </form>
        </div>

        {/* ── Password ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-5 flex items-center gap-2">
            <Lock size={15} className="text-navy-600" /> Change password
          </h2>
          <form onSubmit={handlePasswordSave} className="space-y-4 max-w-sm">
            <Field label="New password">
              <input type="password" className={input} value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                placeholder="••••••••" minLength={8} required />
            </Field>
            <Field label="Confirm new password">
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
              {pwSaving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>

        {/* ── Two-factor authentication ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <ShieldCheck size={15} className="text-navy-600" /> Two-factor authentication
          </h2>
          <p className="text-xs text-stone-400 mb-4 leading-relaxed">
            Add an extra layer of security with an authenticator app (Google Authenticator, Authy, 1Password).
            You'll still sign in with your email verification code — this is an additional optional step.
          </p>
          <a
            href="/setup-mfa"
            className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-200 rounded-full px-3 py-2 hover:bg-navy-50 transition-colors"
          >
            <ShieldCheck size={13} /> Set up authenticator app
          </a>
        </div>

        {/* ── Subscription ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <CreditCard size={15} className="text-navy-600" /> Subscription
          </h2>
          <p className="text-xs text-stone-400 mb-5">
            Currently on the <span className="font-semibold text-navy-800 capitalize">{profile.plan}</span> plan
            {isTrialing    && <span className="ml-2 text-amber-600 font-medium">· Free trial active</span>}
            {isCancelling  && <span className="ml-2 text-amber-600 font-medium">· Cancellation scheduled</span>}
            {isCancelled   && <span className="ml-2 text-stone-400 font-medium">· Plan ended</span>}
            {!isTrialing && !isCancelling && !isCancelled && profile.current_period_end && (
              <span className="ml-2 text-stone-400">
                · Next billing {new Date(profile.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </p>

          {/* ── State: CANCELLING — show access-end notice, hide plan cards ── */}
          {isCancelling && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 leading-relaxed">
                  <p className="font-semibold mb-1">Your plan has been cancelled.</p>
                  <p>
                    {cancelAtDate
                      ? <>You'll keep full access until <strong>{cancelAtDate}</strong>. After this date, your account will be downgraded and your data kept safe for 30 days.</>
                      : "You'll keep full access until the end of your current billing period. After this date, your account will be downgraded."}
                  </p>
                </div>
              </div>

              {/* Reactivate */}
              <div>
                <p className="text-xs text-stone-400 mb-2">Changed your mind? You can reactivate at any time before your access ends.</p>
                {reactivateError && (
                  <p className="text-xs text-red-600 mb-2">{reactivateError}</p>
                )}
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="inline-flex items-center gap-2 text-sm font-semibold btn-aurora text-white px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
                >
                  {reactivating ? <><Loader2 size={13} className="animate-spin" />Reactivating…</> : 'Reactivate my plan'}
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
                  <p className="font-semibold mb-1">Your plan has ended.</p>
                  <p>Your data is kept safe for 30 days. Reactivate anytime to regain full access.</p>
                </div>
              </div>
              <button
                onClick={() => onUpgrade(profile.plan || 'essential', 'yearly')}
                className="inline-flex items-center gap-2 text-sm font-semibold btn-aurora text-white px-4 py-2 rounded-full hover:bg-navy-700 transition-colors"
              >
                Reactivate Everstead
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
                    {cycle === 'monthly' ? 'Monthly' : 'Yearly — save 20%'}
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
                        {isCurrent && <span className="text-xs bg-navy-800 text-white px-2 py-0.5 rounded-full">Current</span>}
                      </div>
                      <p className="text-lg font-display font-light text-navy-950">
                        £{price}/mo
                        {billingCycle === 'yearly' && <span className="text-xs text-stone-400 ml-1">billed annually · save 20%</span>}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 leading-snug flex-1">{plan.desc}</p>
                      {isCurrent && isTrialing && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold btn-aurora text-white rounded-full py-1.5 hover:bg-navy-700 transition-colors"
                        >
                          Activate {plan.name} plan
                        </button>
                      )}
                      {wantsDiffCycle && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold bg-sage-600 text-white rounded-full py-1.5 hover:bg-sage-700 transition-colors"
                        >
                          Switch to {billingCycle === 'yearly' ? 'yearly billing' : 'monthly billing'}
                        </button>
                      )}
                      {!isCurrent && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold text-navy-700 border border-navy-200 rounded-lg py-1.5 hover:bg-navy-50 transition-colors"
                        >
                          {isHigher ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Manage billing — for paid subscribers */}
              {!isTrialing && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-400 mb-2">Update your payment method or view invoices in the billing portal.</p>
                  <ManageBillingButton />
                </div>
              )}

              {/* Cancel subscription */}
              <div className="mt-5 pt-4 border-t border-stone-100">
                {cancelConfirm ? (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-3">
                    <p className="text-sm font-semibold text-navy-900">Are you sure you want to cancel?</p>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      You'll keep full access until the end of your current billing period. After that, your plan will be downgraded and your data kept safe for 30 days.
                    </p>
                    {cancelError && (
                      <p className="text-xs text-red-600">{cancelError}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => { setCancelConfirm(false); setCancelError(null) }}
                        className="flex-1 btn-aurora text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-navy-700 transition-colors"
                      >
                        Keep my plan
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="flex-1 text-stone-500 text-sm font-medium px-4 py-2.5 rounded-full border border-stone-200 hover:border-stone-300 hover:text-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {cancelling
                          ? <><Loader2 size={13} className="animate-spin" />Cancelling…</>
                          : 'Yes, cancel my plan'
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCancelConfirm(true); setCancelError(null) }}
                    className="text-xs text-stone-500 hover:text-red-600 transition-colors underline underline-offset-2"
                  >
                    {isTrialing ? 'Cancel trial' : 'Cancel subscription'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Refer a friend ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Gift size={15} className="text-sage-600" /> Refer a friend
          </h2>
          <p className="text-xs text-stone-400 mb-4">
            Share your unique link — your friend gets a <span className="font-semibold text-navy-700">21-day free trial</span> instead of 14 days. Estate planning is a team effort.
          </p>
          <ReferralLinkBox referralCode={profile.referral_code || profile.id} />
        </div>

        {/* ── AI features ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Sparkles size={15} className="text-navy-600" /> AI features
          </h2>
          <div className="flex items-start justify-between gap-4 mt-4">
            <p className="text-xs text-stone-500 leading-relaxed max-w-md">
              Everstead's AI Assistant can help you set up your account and answer questions, using a secure AI provider. Turn this off and no AI is used anywhere in your account — your data is never sent to an AI provider. You can turn it back on any time.
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
            AI-powered features are currently <span className={`font-semibold ${aiEnabled ? 'text-sage-700' : 'text-stone-600'}`}>{aiEnabled ? 'on' : 'off'}</span>.
          </p>
        </div>

        {/* ── Notification preferences ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Bell size={15} className="text-navy-600" /> Email notifications
          </h2>
          <p className="text-xs text-stone-400 mb-5 leading-relaxed">
            Choose which emails you'd like to receive from Everstead. You can update these at any time.
          </p>
          <div className="space-y-3">
            {[
              { key: 'notify_birthday',        label: 'Birthday reminder',         desc: 'A message on your birthday each year.' },
              { key: 'notify_annual_review',   label: 'Annual vault review',       desc: 'A prompt to review and update your plan once a year.' },
              { key: 'notify_document_expiry', label: 'Document expiry alerts',    desc: 'Alerts when documents in your vault are approaching expiry.' },
              { key: 'notify_vault_nudges',    label: 'Vault completeness nudges', desc: 'Tips when key items are missing from your vault.' },
              { key: 'notify_reengagement',    label: 'Re-engagement reminders',   desc: "Gentle nudges if your vault hasn't been updated in a while." },
              { key: 'notify_trial_reminders', label: 'Trial & billing reminders', desc: 'Important emails about your trial status and upcoming payments.' },
            ].map(({ key, label, desc }) => (
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
                  <p className="text-sm font-medium text-navy-900 leading-snug">{label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
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
              {notifSaving ? 'Saving…' : notifSaved ? '✓ Saved' : 'Save preferences'}
            </button>
            {notifSaved && <span className="text-xs text-emerald-600 font-medium">Preferences updated.</span>}
          </div>
        </div>

        {/* ── My Data ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Download size={15} className="text-navy-600" /> My data
          </h2>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            Download a complete copy of everything in your Everstead plan — accounts, documents, instructions, wishes, and more.
            Your data belongs to you, always.{' '}
            <Link to="/data-promise" className="text-navy-600 hover:text-navy-800 underline underline-offset-2">Our data promise →</Link>
          </p>
          {isDemo ? (
            <p className="text-xs text-stone-400 italic">Data export is disabled in demo mode.</p>
          ) : (
            <div className="space-y-3">
              <button
                onClick={requestExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <><Loader2 size={14} className="animate-spin" /> Preparing your export…</>
                ) : (
                  <><Download size={14} /> Export my data</>
                )}
              </button>
              {reauthOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4" onClick={() => !reauthBusy && setReauthOpen(false)}>
                  <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-navy-900 mb-1">Confirm it’s you</h3>
                    <p className="text-xs text-stone-500 mb-4">For your security, please re-enter your password before downloading a full copy of your vault.</p>
                    <input
                      type="password" autoFocus value={reauthPassword}
                      onChange={e => setReauthPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && reauthPassword && !reauthBusy) confirmReauthAndExport() }}
                      placeholder="Your password"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-navy-200"
                    />
                    {reauthError && <p className="text-xs text-red-600 mb-3">{reauthError}</p>}
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setReauthOpen(false)} disabled={reauthBusy} className="text-sm px-4 py-2 rounded-full text-stone-600 hover:bg-stone-100 disabled:opacity-50">Cancel</button>
                      <button onClick={confirmReauthAndExport} disabled={reauthBusy || !reauthPassword} className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50">
                        {reauthBusy ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : 'Confirm & export'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {exportDone && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Your data has been exported. Keep this file somewhere safe.
                </p>
              )}
              {exportError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{exportError}</p>
              )}
              <p className="text-xs text-stone-400">
                Includes all accounts, uploaded documents, instructions, wishes, trusted contacts, and your activity log. May take a few seconds for larger vaults.
              </p>
            </div>
          )}
        </div>

        {/* ── Danger zone ── */}
        <div className="bg-white border border-red-100 rounded-2xl p-6">
          <h2 className="font-semibold text-red-700 text-sm mb-2">Danger zone</h2>

          {isDemo ? (
            <p className="text-xs text-stone-400 italic">Account deletion disabled in demo mode.</p>
          ) : deleteStep === 0 ? (
            <>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                Permanently delete your account and all associated data — documents, contacts, instructions, and settings. This cannot be undone.
              </p>
              <button
                onClick={() => setDeleteStep(1)}
                className="text-xs font-semibold text-red-600 border border-red-200 rounded-full px-4 py-2 hover:bg-red-50 transition-colors"
              >
                Delete my account
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-red-800">Before you go — please confirm:</p>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={deleteChecks.data}
                  onChange={e => setDeleteChecks(p => ({ ...p, data: e.target.checked }))}
                  className="mt-0.5 accent-red-600"
                />
                <span className="text-xs text-stone-700 leading-relaxed">
                  I have downloaded or noted all documents and information I need. I understand that once deleted, my files cannot be recovered.
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
                  I understand this is <strong>permanent and irreversible</strong>. My account, all data, and any active subscription will be deleted immediately.
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
                  {deleting ? 'Deleting…' : 'Permanently delete my account'}
                </button>
                <button
                  onClick={() => { setDeleteStep(0); setDeleteChecks({ data: false, confirm: false }); setDeleteError(null) }}
                  className={secondaryBtn}
                >
                  Cancel
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <p className="font-semibold text-navy-900 text-sm pt-1.5">A thought while you're here</p>
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
          Thanks, I'll do it later
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EXECUTOR PREVIEW MODAL
// ─────────────────────────────────────────────────────────────

function ExecutorPreviewModal({ profile, people, accounts, documents, instructions, onClose }) {
  const executor = people.find(p => p.role?.toLowerCase().includes('executor')) || people[0]
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-navy-950 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-widest">Executor view preview</p>
            <p className="text-white text-sm font-medium mt-0.5">
              What {executor?.name || 'your executor'} would see
            </p>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Plan owner */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Plan owner</p>
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="font-semibold text-navy-900">{profile.full_name}</p>
              <p className="text-xs text-stone-500 mt-0.5">{profile.email}</p>
              {profile.date_of_birth && (
                <p className="text-xs text-stone-400 mt-0.5">
                  DOB: {new Date(profile.date_of_birth).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
          </div>

          {/* Trusted contacts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Trusted contacts ({people.length})
            </p>
            {people.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No trusted contacts added yet</p>
            ) : (
              <div className="space-y-2">
                {people.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-navy-700">{p.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{p.name}</p>
                      <p className="text-xs text-stone-400 truncate">{p.role} · {p.email}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${p.invite_status === 'accepted' ? 'bg-sage-50 text-sage-700 border-sage-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {p.invite_status === 'accepted' ? 'Active' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial accounts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Financial accounts ({accounts.length})
            </p>
            {accounts.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No accounts documented yet</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {accounts.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-2">
                    <Landmark size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-navy-800 flex-1">{a.institution}</span>
                    <span className="text-xs text-stone-400">{a.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key documents */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Key documents ({documents.length})
            </p>
            {documents.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No documents uploaded yet</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {documents.map(d => (
                  <div key={d.id} className="flex items-center gap-3 py-2">
                    <FileText size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-navy-800 flex-1">{d.name}</span>
                    <span className="text-xs text-stone-400">{d.doc_type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          {instructions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                Instructions ({instructions.length})
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
              <strong>Preview only.</strong> Your executor sees this view after verifying your incapacity or death, according to the access timing you've set for each contact.
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
    <div className="space-y-3" aria-label="Loading…" aria-busy="true">
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"><X size={16} /></button>
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

// ── First-run tour: a short, warm walk through the real dashboard ─────────────
const TOUR_STEPS = [
  { id: 'overview', icon: Home,       title: 'Welcome home', body: 'Whenever you sign in, this is your calm overview — everything at a glance, no pressure to do it all at once.' },
  { id: 'accounts', icon: Landmark,   title: 'Your vault', body: 'Your accounts, documents and subscriptions live here — the practical things, gathered safely in one place.' },
  { id: 'people',   icon: Users,      title: 'The people you trust', body: 'Invite family or an executor and choose exactly what each person can see — and only when the time is right. Nothing is shared until you say so.' },
  { id: 'aboutme',  icon: UserCircle, title: 'The part that’s really you', body: 'About Me is the heart of it — your story, your wishes, and messages for the people you love. Come back and add to it whenever something comes to mind.' },
]
function DashboardTour({ setActiveSection, onClose }) {
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
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">A quick look around · {step + 1}/{TOUR_STEPS.length}</span>
        </div>
        <h3 className="font-display text-xl text-navy-950 mb-1.5">{s.title}</h3>
        <p className="text-sm text-stone-600 leading-relaxed mb-5">{s.body}</p>
        <div className="flex items-center gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-navy-700' : 'w-1.5 bg-stone-200'}`} />)}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">Skip</button>
          <div className="flex items-center gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="text-sm text-stone-500 hover:text-navy-800 px-3 py-2">Back</button>}
            <button onClick={() => last ? onClose() : setStep(step + 1)} className="btn-aurora inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-full">
              {last ? 'All set 🎉' : <>Next <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
