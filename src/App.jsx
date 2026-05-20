import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdvisorProtectedRoute from './components/AdvisorProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import AdminGate from './components/AdminGate'
import ErrorBoundary from './components/ErrorBoundary'
import Nav from './components/Nav'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import CookieBanner from './components/CookieBanner'

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
const Resources             = lazy(() => import('./pages/Resources'))
const ExecutorChecklist     = lazy(() => import('./pages/ExecutorChecklist'))
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
const AdvisorDPA            = lazy(() => import('./pages/AdvisorDPA'))
const Changelog             = lazy(() => import('./pages/Changelog'))
const Compare               = lazy(() => import('./pages/Compare'))
const WhenSomeoneDies       = lazy(() => import('./pages/WhenSomeoneDies'))
const DataPromise           = lazy(() => import('./pages/DataPromise'))

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

function Layout({ children }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
      <ChatWidget />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/"           element={<Layout><Home /></Layout>} />
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
              <Route path="/login"           element={<Layout><Login /></Layout>} />
              <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
              <Route path="/reset-password"  element={<Layout><ResetPassword /></Layout>} />
              <Route path="/privacy"    element={<Layout><Privacy /></Layout>} />
              <Route path="/terms"      element={<Layout><Terms /></Layout>} />
              <Route path="/resources"  element={<Layout><Resources /></Layout>} />
              <Route path="/resources/:section" element={<Layout><Resources /></Layout>} />
              <Route path="/resources/:section/:post" element={<Layout><Resources /></Layout>} />
              <Route path="/executor-checklist"     element={<Layout><ExecutorChecklist /></Layout>} />
              <Route path="/estate-readiness-score" element={<Layout><EstateReadinessScore /></Layout>} />
              <Route path="/digital-estate-worth"   element={<Layout><DigitalEstateCalculator /></Layout>} />
              <Route path="/gift"         element={<Layout><Gift /></Layout>} />
              <Route path="/redeem-gift"  element={<Layout><RedeemGift /></Layout>} />
              <Route path="/cookies"      element={<Layout><Cookies /></Layout>} />
              <Route path="/accessibility" element={<Layout><Accessibility /></Layout>} />
              <Route path="/press"        element={<Layout><Press /></Layout>} />
              <Route path="/advisor-dpa"  element={<Layout><AdvisorDPA /></Layout>} />
              <Route path="/changelog"    element={<Layout><Changelog /></Layout>} />
              <Route path="/compare/:slug" element={<Layout><Compare /></Layout>} />
              <Route path="/what-to-do-when-someone-dies" element={<WhenSomeoneDies />} />
              <Route path="/data-promise"  element={<Layout><DataPromise /></Layout>} />
              <Route path="*"           element={<Layout><NotFound /></Layout>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <CookieBanner />
      </BrowserRouter>
    </AuthProvider>
  )
}
