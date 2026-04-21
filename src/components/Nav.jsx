import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Security', href: '/security' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Use Cases', href: '/use-cases' },
]

// Pages that have a light background at the top — nav should always use dark style on these
const lightBgPages = ['/pricing', '/security', '/features', '/how-it-works', '/use-cases', '/login', '/get-started', '/blog']

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const isLightPage = lightBgPages.some(p => location.pathname.startsWith(p))
  // Force dark-text style on light-bg pages even before scroll
  const useDarkStyle = scrolled || isLightPage

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        useDarkStyle
          ? 'bg-stone-50/95 backdrop-blur-md shadow-sm border-b border-stone-200'
          : 'bg-gradient-to-b from-black/40 to-transparent backdrop-blur-none'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${useDarkStyle ? 'bg-navy-100 border border-navy-200' : 'bg-white/20 border border-white/30'}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill={useDarkStyle ? '#1a2e4a' : 'white'} fillOpacity="0.95"/>
              <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" fill={useDarkStyle ? '#1a2e4a' : 'white'} fillOpacity="0.35"/>
            </svg>
          </div>
          <span className={`font-display text-xl font-semibold tracking-tight transition-colors ${useDarkStyle ? 'text-navy-900' : 'text-white drop-shadow'}`}>Everstead</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
          <Link
            to="/login"
            className={`text-sm font-medium transition-colors px-3 py-1.5 ${useDarkStyle ? 'text-stone-600 hover:text-navy-800' : 'text-white/90 hover:text-white'}`}
          >
            Login
          </Link>
          <Link
            to="/get-started"
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${useDarkStyle ? 'bg-navy-800 text-white hover:bg-navy-700' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}`}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className={`lg:hidden p-2 transition-colors ${useDarkStyle ? 'text-stone-600 hover:text-navy-800' : 'text-white hover:text-white/80'}`}
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-stone-50 border-t border-stone-200 px-6 py-4 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className="block px-3 py-2.5 text-sm font-medium text-stone-700 hover:text-navy-800 hover:bg-stone-100 rounded-md transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link to="/login" className="block px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-navy-800">Login</Link>
            <Link to="/get-started" className="block text-center bg-navy-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-navy-700 transition-colors">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  )
}
