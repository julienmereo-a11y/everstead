import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
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

// Pages
import Home from './pages/Home'
import Features from './pages/Features'
import HowItWorks from './pages/HowItWorks'
import Pricing from './pages/Pricing'
import Security from './pages/Security'
import UseCases from './pages/UseCases'
import GetStarted from './pages/GetStarted'
import About from './pages/About'
import Contact from './pages/Contact'
import BookDemo from './pages/BookDemo'
import Login from './pages/Login'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Resources from './pages/Resources'
import NotFound from './pages/NotFound'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import DelegateDashboard from './pages/DelegateDashboard'
import AcceptInvite from './pages/AcceptInvite'
import AdvisorPortal from './pages/AdvisorPortal'
import AdminPanel from './pages/AdminPanel'
import AdminLogin from './pages/AdminLogin'
import AcceptAdminInvite from './pages/AcceptAdminInvite'
import DelegateRegister from './pages/DelegateRegister'
import SetupMFA from './pages/SetupMFA'
import ChooseAccount from './pages/ChooseAccount'
import TrialEnded from './pages/TrialEnded'
import PrintView from './pages/PrintView'

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
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
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
          <Route path="/accept-admin-invite" element={<AcceptAdminInvite />} />
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
          <Route path="*"           element={<Layout><NotFound /></Layout>} />
        </Routes>
        </ErrorBoundary>
        <ChatWidget />
        <CookieBanner />
      </BrowserRouter>
    </AuthProvider>
  )
}
