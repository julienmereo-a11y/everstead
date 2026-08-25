import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import i18n, { languageFromPath } from './i18n'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { isNative } from './lib/platform'
import ProtectedRoute from './components/ProtectedRoute'
import AdvisorProtectedRoute from './components/AdvisorProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import AdminGate from './components/AdminGate'
import ErrorBoundary from './components/ErrorBoundary'
import BiometricGate from './components/native/BiometricGate'
import Nav from './components/Nav'
import AppBanner, { APP_BANNER_HEIGHT, isAppBannerDismissed } from './components/AppBanner'
import Footer, { rememberLanguage } from './components/Footer'
// Lazy: ChatWidget pulls in react-markdown — keeping it out of the eager bundle
// saves ~50 kB+ of the entry chunk. A null fallback is invisible (floating widget).
const ChatWidget = lazy(() => import('./components/ChatWidget'))
import CookieBanner from './components/CookieBanner'
import InstallPrompt from './components/InstallPrompt'
import OfflineBanner from './components/OfflineBanner'

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
// Each route is code-split into its own chunk, reducing the initial JS bundle
// that visitors to the homepage (or any single page) need to download.
const Home                  = lazy(() => import('./pages/Home'))
const Features              = lazy(() => import('./pages/Features'))
const HowItWorks            = lazy(() => import('./pages/HowItWorks'))
const Pricing               = lazy(() => import('./pages/Pricing'))
const Security              = lazy(() => import('./pages/Security'))
const UseCases              = lazy(() => import('./pages/UseCases'))
const GetStarted            = lazy(() => import('./pages/GetStarted'))
const About                 = lazy(() => import('./pages/About'))
const Contact               = lazy(() => import('./pages/Contact'))
const BookDemo              = lazy(() => import('./pages/BookDemo'))
const Login                 = lazy(() => import('./pages/Login'))
const Privacy               = lazy(() => import('./pages/Privacy'))
const Terms                 = lazy(() => import('./pages/Terms'))
const MentionsLegales       = lazy(() => import('./pages/MentionsLegales'))
const Resources             = lazy(() => import('./pages/Resources'))
const ExecutorChecklist     = lazy(() => import('./pages/ExecutorChecklist'))
const ApresUnDeces          = lazy(() => import('./pages/ApresUnDeces'))
const DigitalEstateCalculator = lazy(() => import('./pages/DigitalEstateCalculator'))
const EstateReadinessScore  = lazy(() => import('./pages/EstateReadinessScore'))
const NotFound              = lazy(() => import('./pages/NotFound'))
const ForgotPassword        = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword         = lazy(() => import('./pages/ResetPassword'))
const Dashboard             = lazy(() => import('./pages/Dashboard'))
const DelegateDashboard     = lazy(() => import('./pages/DelegateDashboard'))
const AcceptInvite          = lazy(() => import('./pages/AcceptInvite'))
const AdvisorPortal         = lazy(() => import('./pages/AdvisorPortal'))
const AdminPanel            = lazy(() => import('./pages/AdminPanel'))
const AdminLogin            = lazy(() => import('./pages/AdminLogin'))
const AcceptAdminInvite     = lazy(() => import('./pages/AcceptAdminInvite'))
const AcceptAdviserInvite   = lazy(() => import('./pages/AcceptAdviserInvite'))
const AcceptFamilyInvite    = lazy(() => import('./pages/AcceptFamilyInvite'))
const DelegateRegister      = lazy(() => import('./pages/DelegateRegister'))
const SetupMFA              = lazy(() => import('./pages/SetupMFA'))
const ChooseAccount         = lazy(() => import('./pages/ChooseAccount'))
const TrialEnded            = lazy(() => import('./pages/TrialEnded'))
const PrintView             = lazy(() => import('./pages/PrintView'))
const Settings              = lazy(() => import('./pages/Settings'))
const Gift                  = lazy(() => import('./pages/Gift'))
const RedeemGift            = lazy(() => import('./pages/RedeemGift'))
const Cookies               = lazy(() => import('./pages/Cookies'))
const Accessibility         = lazy(() => import('./pages/Accessibility'))
const Press                 = lazy(() => import('./pages/Press'))
const AdviserDPA            = lazy(() => import('./pages/AdviserDPA'))
const Subprocessors         = lazy(() => import('./pages/Subprocessors'))
const Changelog             = lazy(() => import('./pages/Changelog'))
const Compare               = lazy(() => import('./pages/Compare'))
const WhenSomeoneDies       = lazy(() => import('./pages/WhenSomeoneDies'))
const MessageView           = lazy(() => import('./pages/MessageView'))
const DataPromise           = lazy(() => import('./pages/DataPromise'))
const ForAdvisors           = lazy(() => import('./pages/ForAdvisors'))
const DualVault             = lazy(() => import('./pages/DualVault'))
// NOTE: IAPPaywall / NativeWelcome / NativeSignUp were the pre-redesign native
// entry screens. They are superseded by MobileApp (which owns auth, the free tier
// and the Everstead+ paywall in its own state) and still contained the RETIRED
// Essential pricing — a real App Review hazard if a reviewer ever reached them.
// Routes removed 2026-07-14; the files can be deleted.
const MobileApp             = lazy(() => import('./pages/native/app/MobileApp'))

// ── Page loading fallback ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-stone-200 border-t-navy-800 animate-spin" />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// NOTE: hreflang alternates are NOT emitted here. A blanket Layout-level tag
// claimed a French version for EVERY page, including the many that are English
// only (/fr/press, /fr/dual-vault ...), which is a false signal to search
// engines and conflicted with the per-page tags. They now come from
// src/components/HreflangLinks.jsx, mounted only on pages listed in
// TRANSLATED_PATHS.

function Layout({ children }) {
  // "App coming soon" bar. Shown on the marketing site only — never inside the native
  // app (you're already in it) — and hidden once dismissed. When it's visible the
  // fixed Nav is pushed down and <main> padded by the same height, so pt-24 pages and
  // full-bleed heroes stay correctly aligned without any per-page changes.
  const [bannerVisible, setBannerVisible] = React.useState(false)
  useEffect(() => {
    if (!isNative() && !isAppBannerDismissed()) setBannerVisible(true)
  }, [])
  const topOffset = bannerVisible ? APP_BANNER_HEIGHT : 0

  return (
    <>
      {bannerVisible && <AppBanner onDismiss={() => setBannerVisible(false)} />}
      <Nav topOffset={topOffset} />
      <main style={topOffset ? { paddingTop: topOffset } : undefined}>{children}</main>
      <Footer />
      <Suspense fallback={null}><ChatWidget /></Suspense>
    </>
  )
}

// Native apps open into the native mobile app (MobileApp), which handles its
// own onboarding / sign-in and the connected, tabbed experience — never the
// marketing Home page (Apple guideline 4.2). Web is unaffected: isNative() is
// always false in a browser, so it always renders the marketing Home.
function RootRoute() {
  if (isNative()) return <div style={{ height: '100dvh' }}><MobileApp /></div>
  return <Layout><Home /></Layout>
}

// The signed-in APP follows the user's saved preference (profiles.language) —
// there is no URL language signal inside /dashboard etc. The marketing trees
// stay strictly URL-driven so / and /fr remain two stable, indexable language
// trees. Native shells always follow the profile preference.
const APP_LANGUAGE_PREFIXES = ['/dashboard', '/settings', '/advisor-portal', '/delegate-dashboard', '/setup-mfa']

function ProfileLanguage() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  useEffect(() => {
    const inApp = isNative() || APP_LANGUAGE_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
    const target = inApp && ['en', 'fr'].includes(profile?.language)
      ? profile.language
      : languageFromPath(window.location.pathname)
    if (i18n.language !== target) i18n.changeLanguage(target)
  }, [pathname, profile?.language])

  // Mirror the account preference into the middleware cookie, so a signed-in
  // member typing the bare domain lands on their own language wherever they
  // happen to be (a French member in London still gets /fr).
  useEffect(() => {
    if (['en', 'fr'].includes(profile?.language)) rememberLanguage(profile.language)
  }, [profile?.language])
  return null
}

export default function App() {
  // Locale comes from the URL prefix ONLY: /fr/* → French, else English.
  // The SAME route tree renders under both — basename '/fr' makes every internal
  // <Link to="/pricing"> resolve to /fr/pricing automatically, no duplication.
  // Switching locale is a full navigation (see LanguageSwitcher in Nav), so the
  // basename is fixed for the lifetime of a page load.
  const lang = languageFromPath(window.location.pathname)

  useEffect(() => {
    // Keep the region-specific tag for English (UK product); plain fr for French.
    document.documentElement.lang = lang === 'fr' ? 'fr' : 'en-GB'
    if (i18n.language !== lang) i18n.changeLanguage(lang)
  }, [lang])

  return (
    <AuthProvider>
      <BrowserRouter basename={lang === 'fr' ? '/fr' : '/'}>
        <ScrollToTop />
        <ProfileLanguage />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
          <BiometricGate>
            <Routes>
              {/* ── Protected app pages — no Nav/Footer ── */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/delegate-dashboard" element={<DelegateDashboard />} />
              {/* Native mobile app. On a phone (or native shell) it fills the screen;
                  on a desktop browser it's centered in a phone-sized frame so the
                  preview reads correctly instead of stretching edge-to-edge. */}
              <Route
                path="/mobile"
                element={
                  <div style={{ minHeight: '100dvh', background: '#0d1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 'min(100vw, 402px)', height: 'min(100dvh, 874px)', overflow: 'hidden', position: 'relative', boxShadow: '0 24px 70px rgba(0,0,0,0.45)' }}>
                      <MobileApp />
                    </div>
                  </div>
                }
              />
              <Route
                path="/advisor-portal"
                element={
                  <AdvisorProtectedRoute>
                    <AdvisorPortal />
                  </AdvisorProtectedRoute>
                }
              />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/delegate-register" element={<DelegateRegister />} />
              <Route path="/choose-account" element={<ChooseAccount />} />
              <Route
                path="/trial-ended"
                element={
                  <ProtectedRoute>
                    <TrialEnded />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/setup-mfa"
                element={
                  <ProtectedRoute>
                    <SetupMFA />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/print"
                element={
                  <ProtectedRoute>
                    <PrintView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={<Navigate to="/dashboard?tab=settings" replace />}
              />
              <Route path="/accept-admin-invite" element={<AcceptAdminInvite />} />
              <Route path="/accept-adviser-invite" element={<AcceptAdviserInvite />} />
              <Route path="/accept-family-invite" element={<AcceptFamilyInvite />} />
              <Route
                path="/admin-login"
                element={
                  <AdminGate>
                    <AdminLogin />
                  </AdminGate>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminGate>
                    <AdminProtectedRoute>
                      <AdminPanel />
                    </AdminProtectedRoute>
                  </AdminGate>
                }
              />

              {/* ── Public pages ── */}
              <Route path="/"           element={<RootRoute />} />
              <Route path="/features"   element={<Layout><Features /></Layout>} />
              <Route path="/how-it-works" element={<Layout><HowItWorks /></Layout>} />
              <Route path="/pricing"    element={<Layout><Pricing /></Layout>} />
              <Route path="/security"   element={<Layout><Security /></Layout>} />
              <Route path="/use-cases"  element={<Layout><UseCases /></Layout>} />
              <Route path="/use-cases/:slug" element={<Layout><UseCases /></Layout>} />
              <Route path="/get-started" element={<Layout><GetStarted /></Layout>} />
              <Route path="/about"      element={<Layout><About /></Layout>} />
              <Route path="/contact"    element={<Layout><Contact /></Layout>} />
              <Route path="/book-demo"  element={<Layout><BookDemo /></Layout>} />
              <Route path="/login"           element={isNative() ? <Login /> : <Layout><Login /></Layout>} />
              <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
              <Route path="/reset-password"  element={<Layout><ResetPassword /></Layout>} />
              <Route path="/privacy"    element={<Layout><Privacy /></Layout>} />
              <Route path="/terms"      element={<Layout><Terms /></Layout>} />
              {/* LCEN legal notice for the French market — one route serves both
                  trees (the /fr basename makes /fr/mentions-legales work). */}
              <Route path="/mentions-legales" element={<Layout><MentionsLegales /></Layout>} />
              <Route path="/resources"  element={<Layout><Resources /></Layout>} />
              <Route path="/resources/:section" element={<Layout><Resources /></Layout>} />
              <Route path="/resources/:section/:post" element={<Layout><Resources /></Layout>} />
              <Route path="/executor-checklist"     element={<Layout><ExecutorChecklist /></Layout>} />
              <Route path="/apres-un-deces"        element={<Layout><ApresUnDeces /></Layout>} />
              <Route path="/estate-readiness-score" element={<Layout><EstateReadinessScore /></Layout>} />
              <Route path="/digital-estate-worth"   element={<Layout><DigitalEstateCalculator /></Layout>} />
              <Route path="/gift"         element={<Layout><Gift /></Layout>} />
              <Route path="/redeem-gift"  element={<Layout><RedeemGift /></Layout>} />
              <Route path="/cookies"      element={<Layout><Cookies /></Layout>} />
              <Route path="/accessibility" element={<Layout><Accessibility /></Layout>} />
              <Route path="/press"        element={<Layout><Press /></Layout>} />
              <Route path="/adviser-dpa"  element={<Layout><AdviserDPA /></Layout>} />
              <Route path="/subprocessors" element={<Layout><Subprocessors /></Layout>} />
              <Route path="/changelog"    element={<Layout><Changelog /></Layout>} />
              <Route path="/compare"       element={<Layout><Compare /></Layout>} />
              <Route path="/compare/:slug" element={<Layout><Compare /></Layout>} />
              <Route path="/what-to-do-when-someone-dies" element={<WhenSomeoneDies />} />
              <Route path="/m/:token" element={<MessageView />} />
              <Route path="/data-promise"  element={<Layout><DataPromise /></Layout>} />
              <Route path="/for-advisers" element={<Layout><ForAdvisors /></Layout>} />
              <Route path="/family-vault" element={<Layout><DualVault /></Layout>} />
              <Route path="*"           element={<Layout><NotFound /></Layout>} />
            </Routes>
          </BiometricGate>
          </Suspense>
        </ErrorBoundary>
        {/* Web-only overlays. None of these belong in the native shell: cookie consent
            is a web concern, InstallPrompt advertises the PWA (nonsensical inside the
            real app), and OfflineBanner trusts navigator.onLine — which is unreliable
            in the Capacitor webview and can report offline forever, permanently
            covering the UI. */}
        {!isNative() && (
          <>
            <CookieBanner />
            <OfflineBanner />
            <InstallPrompt />
          </>
        )}
      </BrowserRouter>
    </AuthProvider>
  )
}
