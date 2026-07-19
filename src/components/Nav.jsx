import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

// Labels are i18n keys under nav.* — resolved with t() at render time.
const navLinks = [
  { key: 'howItWorks', href: '/how-it-works' },
  { key: 'features', href: '/features' },
  { key: 'security', href: '/security' },
  { key: 'pricing', href: '/pricing' },
  { key: 'about', href: '/about' },
]

// NOTE: no language switcher in the UI by design — the URL path is the ONLY
// language signal (/fr/* → French, root → English). The /fr footer carries a
// single discreet "English" link back to the root tree.

// Pages that have a light background at the top — nav should always use dark style on these
const lightBgPages = ['/pricing', '/security', '/features', '/how-it-works', '/use-cases', '/login', '/get-started', '/resources', '/about', '/contact', '/book-demo', '/privacy', '/terms', '/forgot-password', '/reset-password']

// Pages with a dark hero — keep white logo/nav until scrolled past the hero (~400px)
const darkHeroPages = ['/for-advisers', '/family-vault', '/what-to-do-when-someone-dies', '/compare']

// Compute the correct dark-style value for a given pathname + scrollY
// Extracted so we can use it both in the initialiser and in the render
function computeDarkStyle(pathname, scrollY) {
  const isDark = darkHeroPages.some(p => pathname.startsWith(p))
  const isLight = lightBgPages.some(p => pathname.startsWith(p))
  if (isDark) return scrollY > 150   // transparent until scrolled on dark-hero pages
  if (isLight) return true           // always solid on light pages
  return scrollY > 24                // standard threshold elsewhere
}

// `topOffset` (px) shifts the fixed nav down when a banner occupies the very top of
// the page (see AppBanner). Defaults to 0 — the nav sits flush against the top.
export default function Nav({ topOffset = 0 }) {
  // Initialise directly from window.location so the very first render is correct
  // even before React Router has had a chance to set location state.
  const [useDarkStyle, setUseDarkStyle] = useState(
    () => computeDarkStyle(window.location.pathname, 0)
  )
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
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

  // On route change: reset nav style synchronously BEFORE browser paints
  // so there is never a single-frame flash of the wrong style
  useLayoutEffect(() => {
    setOpen(false)
    setSwitcherOpen(false)
    setUseDarkStyle(computeDarkStyle(location.pathname, 0))
  }, [location.pathname])

  // Scroll listener — re-wires whenever the route changes so the threshold
  // is always correct for the current page type
  useEffect(() => {
    const onScroll = () => setUseDarkStyle(computeDarkStyle(location.pathname, window.scrollY))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

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
        top: topOffset,
        left: 0,
        zIndex: 1000,
        pointerEvents: 'none',
      }} />
      <header
        ref={menuRef}
        style={{ top: topOffset }}
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
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
                {t(`nav.${link.key}`)}
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
                  className={`text-sm font-medium px-4 py-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400 ${useDarkStyle ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}`}
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
                  {t('nav.login')}
                </Link>
                <Link
                  to="/get-started"
                  className="btn-aurora text-sm font-semibold px-4 py-2 rounded-full transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400"
                >
                  {t('nav.getStarted')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className={`lg:hidden p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${useDarkStyle ? 'text-stone-600 hover:text-navy-800 hover:bg-stone-100' : 'text-white hover:bg-white/10'}`}
            onClick={() => setOpen(v => !v)}
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
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
                {t(`nav.${link.key}`)}
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-stone-100 flex flex-col gap-2.5">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-navy-800 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
                  >
                    My plan
                  </Link>
                  {delegateInvites.map(inv => (
                    <Link
                      key={inv.id}
                      to={`/delegate-dashboard?token=${inv.invite_token}`}
                      className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-navy-800 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
                    >
                      {inv.ownerName ?? 'Shared plan'}
                    </Link>
                  ))}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center bg-navy-800 text-white text-sm font-semibold px-4 py-3 rounded-full hover:bg-navy-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-navy-800 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/get-started"
                    className="flex items-center justify-center btn-aurora text-sm font-semibold px-4 py-3 rounded-full transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400"
                  >
                    {t('nav.getStarted')}
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
