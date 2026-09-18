// Header for the Everstead for Business tree (/business, /fr/entreprises).
//
// Deliberately different from the family nav: always solid, the four verticals
// instead of the family links, a demo CTA instead of Start free, and a quiet
// way back to the family site. Same sage accent line and logo so it still
// reads as Everstead.
import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, ArrowRight } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import { trackEvent } from '../lib/analytics'
import { VERTICALS, hubPath, verticalPath } from '../pages/businessShared'

export default function BusinessNav({ topOffset = 0 }) {
  const { t, i18n: inst } = useTranslation('business')
  const lang = inst.language === 'fr' ? 'fr' : 'en'
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const hub = hubPath(lang)

  useEffect(() => { setOpen(false) }, [location.pathname])

  // Warm the sibling route chunks once the page is idle. Every page in this
  // tree is dark, so a Suspense fallback between two of them is the most
  // visible flash on the site; fetching three small chunks in the background
  // means the navigation simply never suspends.
  useEffect(() => {
    const warm = () => {
      import('../pages/BusinessVertical').catch(() => {})
      import('../pages/ForAdvisors').catch(() => {})
      import('../pages/Business').catch(() => {})
    }
    const idle = window.requestIdleCallback
    const id = idle ? idle(warm, { timeout: 2500 }) : setTimeout(warm, 1200)
    return () => { if (idle && window.cancelIdleCallback) window.cancelIdleCallback(id); else clearTimeout(id) }
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // The four verticals, then pricing. Pricing is last because a visitor picks
  // the page that describes them before the one that describes the invoice.
  const links = [
    ...VERTICALS.map(v => ({ ...v, href: verticalPath(v, lang), label: t(`nav.verticals.${v.key}`) })),
    { key: 'pricing', href: lang === 'fr' ? '/entreprises/tarifs' : '/business/pricing', label: t('nav.pricing') },
  ]
  const demo = () => trackEvent('cta_click', { location: 'business_nav', cta: 'book_demo' })

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed left-0 w-full h-[2px] z-[1000] pointer-events-none"
        style={{ top: topOffset, background: 'linear-gradient(90deg, transparent 0%, #4c7d47 30%, #4c7d47 70%, transparent 100%)' }}
      />
      <header ref={menuRef} style={{ top: topOffset }} className="fixed left-0 right-0 z-50 bg-stone-50/95 backdrop-blur-md border-b border-stone-200">
        <nav className="px-6 sm:px-8 lg:px-12" role="navigation" aria-label={t('nav.home')}>
          <div className="max-w-[1200px] mx-auto h-24 flex items-center justify-between">
          <Link to={hub} className="flex items-center gap-2.5" aria-label={t('nav.home')}>
            <img src="/everstead-logo-dark.png" alt="Everstead" className="h-10 w-auto" />
            <span className="inline-block lg:hidden xl:inline-block text-[12px] sm:text-[13px] font-medium text-stone-500 border-l border-stone-300 pl-2 sm:pl-2.5 leading-none whitespace-nowrap">
              {t('nav.brand')}
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {links.map(l => (
              <Link
                key={l.key}
                to={l.href}
                aria-current={location.pathname === l.href ? 'page' : undefined}
                className={`px-3 xl:px-3.5 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${
                  location.pathname === l.href ? 'text-navy-800 bg-navy-50' : 'text-stone-600 hover:text-navy-800 hover:bg-stone-100'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/" className="text-sm font-medium text-stone-500 hover:text-navy-800 px-2.5 xl:px-3 py-1.5 rounded-md whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400">
              {t('nav.forFamilies')}
            </Link>
            <Link
              to="/book-demo"
              onClick={demo}
              className="inline-flex items-center gap-2 rounded-full bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold px-5 py-2.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-400"
            >
              {t('nav.bookDemo')} <ArrowRight size={15} />
            </Link>
            <LanguageSwitcher dark />
          </div>

          <button
            className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-navy-800 hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
            onClick={() => setOpen(v => !v)}
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
            aria-controls="business-nav-mobile"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          </div>
        </nav>

        <div
          id="business-nav-mobile"
          role="dialog"
          aria-label={t('nav.home')}
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="bg-white border-t border-stone-200 px-5 pt-4 pb-6 shadow-xl space-y-1">
            <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-widest text-stone-400">{t('nav.sections')}</p>
            {links.map(l => (
              <Link
                key={l.key}
                to={l.href}
                aria-current={location.pathname === l.href ? 'page' : undefined}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  location.pathname === l.href ? 'text-navy-800 bg-navy-50' : 'text-stone-700 hover:text-navy-800 hover:bg-stone-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-stone-100 flex flex-col gap-2.5">
              <div className="flex justify-center pb-1"><LanguageSwitcher dark full /></div>
              <Link to="/" className="flex items-center justify-center px-4 py-3 text-sm font-semibold text-navy-800 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors">
                {t('nav.forFamilies')}
              </Link>
              <Link
                to="/book-demo"
                onClick={demo}
                className="flex items-center justify-center gap-2 bg-navy-800 text-white text-sm font-semibold px-4 py-3 rounded-full hover:bg-navy-700 transition-colors"
              >
                {t('nav.bookDemo')} <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" aria-hidden="true" onClick={() => setOpen(false)} />}
    </>
  )
}
