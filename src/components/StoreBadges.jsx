import React from 'react'
import { useTranslation } from 'react-i18next'
import { trackEvent } from '../lib/analytics'

// Official store badges linking to the app listings. Assets in /public/badges
// are the untouched official artwork (Google's badge generator + Apple's badge
// API), localized EN/FR to match the site tree.
//
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=care.everstead.app'
// v1.0 approved 30 July 2026 — both stores live.
export const APP_STORE_URL = 'https://apps.apple.com/gb/app/id6791210842'

export default function StoreBadges({ className = '', location = 'footer' }) {
  const { i18n } = useTranslation()
  const fr = i18n.language === 'fr'
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('app_store_click', { store: 'google_play', location })}
        className="hover:opacity-80 transition-opacity"
      >
        {/* Google's generic badge PNG carries built-in padding — slightly taller
            so the visible badge optically matches Apple's 40px one. */}
        <img
          src={fr ? '/badges/google-play-fr.png' : '/badges/google-play-en.png'}
          alt={fr ? 'Disponible sur Google Play' : 'Get it on Google Play'}
          className="h-[59px] w-auto -m-[9px]"
          loading="lazy"
        />
      </a>
      {APP_STORE_URL && (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('app_store_click', { store: 'app_store', location })}
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src={fr ? '/badges/app-store-fr.svg' : '/badges/app-store-en.svg'}
            alt={fr ? 'Télécharger dans l’App Store' : 'Download on the App Store'}
            className="h-10 w-auto"
            loading="lazy"
          />
        </a>
      )}
    </div>
  )
}
