import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { ChevronDown, Check } from 'lucide-react'
import { rememberLanguage, pathInLanguage } from '../i18n'

// Language picker for the top nav, next to the Get Started button.
//
// A flag is a country, not a language, so each option pairs the flag with the
// language's own name (a French speaker looks for "Français", not "French").
// Choosing an option stores the preference in the middleware cookie, so the
// geo redirect stops overriding it, then hard-navigates: the router basename
// differs per tree, so a client-side <Link> cannot cross from / to /fr.
const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'English',  aria: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français', aria: 'Français' },
]

export default function LanguageSwitcher({ dark = true, full = false, className = '' }) {
  const { i18n, t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const current = i18n.language === 'fr' ? LANGUAGES[1] : LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (code) => {
    rememberLanguage(code)
    if (code === i18n.language) { setOpen(false); return }
    window.location.assign(pathInLanguage(pathname, code))
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.languageAria', { language: current.aria })}
        className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 ${
          dark ? 'text-stone-600 hover:text-navy-800 hover:bg-stone-100' : 'text-white/90 hover:text-white hover:bg-white/10'
        }`}
      >
        <span aria-hidden="true" className="text-base leading-none">{current.flag}</span>
        {/* Full name where there is room (the stacked mobile menu), the short
            code in the desktop bar so it stays compact beside the CTA. */}
        <span>{full ? current.label : current.code.toUpperCase()}</span>
        <ChevronDown size={13} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('nav.languageLabel')}
          className="absolute right-0 mt-2 w-44 rounded-xl border border-stone-200 bg-white shadow-lg overflow-hidden z-50 py-1"
        >
          {LANGUAGES.map(l => {
            const active = l.code === current.code
            return (
              <li key={l.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  lang={l.code}
                  onClick={() => choose(l.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                    active ? 'text-navy-900 font-semibold bg-stone-50' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span aria-hidden="true" className="text-base leading-none">{l.flag}</span>
                  <span className="flex-1">{l.label}</span>
                  {active && <Check size={14} aria-hidden="true" className="text-sage-600" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
