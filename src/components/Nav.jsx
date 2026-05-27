import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navLinks = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Security', href: '/security' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Use Cases', href: '/use-cases' },
  { label: 'Resources', href: '/resources' },
  { label: 'About', href: '/about' },
]

// Pages that have a light background at the top — nav should always use dark style on these
const lightBgPages = ['/pricing', '/security', '/features', '/how-it-works', '/use-cases', '/login', '/get-started', '/resources', '/about', '/contact', '/book-demo', '/privacy', '/terms', '/forgot-password', '/reset-password']

// Pages with a dark hero — keep white logo/nav until scrolled past the hero (~400px)
const darkHeroPages = ['/for-advisors', '/family-vault', '/what-to-do-when-someone-dies']

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate  = useNavigate()
  const menuRef = useRef(null)
  const { user, signOut, delegateInvites } = useAuth()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)
  const isDualRole = user && delegateInvites.length > 0
  const currentToken = new URLSearchParams(location.search).get('token')
  const isOnOwnerDashboard = location.pathname === '/dashboard'
  const isOnDelegateDashboard = location.pathname === '/delegate-dashboard'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isLightPage = lightBgPages.some(p => location.pathname.startsWith(p))
  const isDarkHeroPage = darkHeroPages.some(p => location.pathname.startsWith(p))
  const scrollThreshold = isDarkHeroPage ? 400 : 24
  const useDarkStyle = scrolled || isLightPage

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > scrollThreshold)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrollThreshold])

  // Close on route change + re-check scroll position so nav style is correct immediately
  useEffect(() => {
    setOpen(false)
    setSwitcherOpen(false)
    setScrolled(window.scrollY > scrollThreshold)
  }, [location.pathname, scrollThreshold])

  // Close switcher on outside click
  useEffect(() => {
    if (!switcherOpen) return
    const handler = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [switcherOpen])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Sage green accent line — top of page */}
      <div style={{
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, transparent 0%, #4c7d47 30%, #4c7d47 70%, transparent 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
        pointerEvents: 'none',
      }} />
      <header
        ref={menuRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          useDarkStyle
            ? 'bg-stone-50/95 backdrop-blur-md shadow-sm border-b border-stone-200'
            : 'bg-gradient-to-b from-black/40 to-transparent backdrop-blur-none'
        }`}
      >
        <nav
          className="max-w-7xl mx-auto px-6 lg:px-8 h-24 flex items-center justify-between"
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center group" aria-label="Everstead home">
            {useDarkStyle
              ? <img src="/everstead-logo-dark.png" alt="Everstead" className="h-10 w-auto" />
              : <img src="/logo-v2-white.png" alt="Everstead" className="h-10 w-auto drop-shadow" />
            }
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={location.pathname === link.href ? 'page' : undefined}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${
                  useDarkStyle
                    ? location.pathname === link.href
                      ? 'text-navy-800 bg-navy-50'
                      : 'text-stone-600 hover:text-navy-800 hover:bg-stone-100'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                {isDualRole ? (
                  /* Role switcher dropdown */
                  <div className="relative" ref={switcherRef}>
                    <button
                      onClick={() => setSwitcherOpen(v => !v)}
                      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${useDarkStyle ? 'text-stone-600 hover:text-navy-800' : 'text-white/90 hover:text-white'}`}
                    >
                      <Users size={14} />
                      My plans
                      <ChevronDown size={13} className={`transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {switcherOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-50">
                        <p className="px-3 py-1 text-xs text-stone-400 font-medium uppercase tracking-wide">Switch plan</p>
                        <Link
                          to="/dashboard"
                          className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isOnOwnerDashboard ? 'text-navy-900 font-semibold bg-stone-50' : 'text-navy-800 hover:bg-stone-50'}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${isOnOwnerDashboard ? 'bg-sage-500' : 'bg-stone-300'}`} />
                          My plan
                        </Link>
                        {delegateInvites.map(inv => {
                          const isActive = isOnDelegateDashboard && currentToken === inv.invite_token
                          return (
                            <Link
                              key={inv.id}
                              to={`/delegate-dashboard?token=${inv.invite_token}`}
                              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isActive ? 'text-navy-900 font-semibold bg-stone-50' : 'text-navy-800 hover:bg-stone-50'}`}
                            >
                              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-navy-500' : 'bg-stone-300'}`} />
                              {inv.ownerName ?? 'Shared plan'}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/dashboard"
                    className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${useDarkStyle ? 'text-stone-600 hover:text-navy-800' : 'text-white/90 hover:text-white'}`}
                  >
                    My Account
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400 ${useDarkStyle ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}`}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${useDarkStyle ? 'text-stone-600 hover:text-navy-800' : 'text-white/90 hover:text-white'}`}
                >
                  Login
                </Link>
                <Link
                  to="/get-started"
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400 ${useDarkStyle ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}`}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className={`lg:hidden p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${useDarkStyle ? 'text-stone-600 hover:text-navy-800 hover:bg-stone-100' : 'text-white hover:bg-white/10'}`}
            onClick={() => setOpen(v => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {/* Mobile drawer — slides down */}
        <div
          id="mobile-nav"
          role="dialog"
          aria-label="Mobile navigation"
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-white border-t border-stone-200 px-5 pt-4 pb-6 shadow-xl space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={location.pathname === link.href ? 'page' : undefined}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${
                  location.pathname === link.href
                    ? 'text-navy-800 bg-navy-50'
                    : 'text-stone-700 hover:text-navy-800 hover:bg-stone-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-stone-100 flex flex-col gap-2.5">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-navy-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
                  >
                    My plan
                  </Link>
                  {delegateInvites.map(inv => (
                    <Link
                      key={inv.id}
                      to={`/delegate-dashboard?token=${inv.invite_token}`}
                      className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-navy-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      {inv.ownerName ?? 'Shared plan'}
                    </Link>
                  ))}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center bg-navy-800 text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-navy-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-navy-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
                  >
                    Login
                  </Link>
                  <Link
                    to="/get-started"
                    className="flex items-center justify-center bg-navy-800 text-white text-sm font-semibold px-4 py-3 rounded-xl hover:bg-navy-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
