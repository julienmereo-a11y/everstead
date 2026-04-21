import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Nav from './components/Nav'
import Footer from './components/Footer'

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
import Dashboard from './pages/Dashboard'
import DelegateDashboard from './pages/DelegateDashboard'
import AcceptInvite from './pages/AcceptInvite'

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
          <Route path="/accept-invite" element={<AcceptInvite />} />

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
          <Route path="/login"      element={<Layout><Login /></Layout>} />
          <Route path="/privacy"    element={<Layout><Privacy /></Layout>} />
          <Route path="/terms"      element={<Layout><Terms /></Layout>} />
          <Route path="/resources"  element={<Layout><Resources /></Layout>} />
          <Route path="/resources/:section" element={<Layout><Resources /></Layout>} />
          <Route path="*"           element={<Layout><NotFound /></Layout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
