import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Nav from './components/Nav'
import Footer from './components/Footer'
import ComingSoon from './pages/ComingSoon'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DelegateDashboard from './pages/DelegateDashboard'
import AcceptInvite from './pages/AcceptInvite'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function Layout({ children }) {
  return (<><Nav /><main>{children}</main><Footer /></>)
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/dashboard"          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/delegate-dashboard" element={<DelegateDashboard />} />
          <Route path="/accept-invite"      element={<AcceptInvite />} />
          <Route path="/login"              element={<Layout><Login /></Layout>} />
          <Route path="/privacy"            element={<Layout><Privacy /></Layout>} />
          <Route path="/terms"              element={<Layout><Terms /></Layout>} />
          <Route path="*"                   element={<ComingSoon />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
