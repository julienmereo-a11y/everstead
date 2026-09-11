import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

// Full-screen player for the brand film, opened from the Home film card. Same
// Mux assets as the website (one per language); the player is only mounted
// while open, so nothing from Mux loads until the member taps play.
const FILM = {
  en: 'S021WSE5yv396jSCaDQ01BufXsb2IdzD00eHs549Tkmk8g',
  fr: '8IiYAV012gsQ6x3ggl00TbZJu2aFwUA5m7i7Q1ss3RSDw',
}

export default function FilmPlayer({ onClose }) {
  const { t, i18n } = useTranslation('mobile')
  const id = FILM[i18n.language === 'fr' ? 'fr' : 'en']

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portal to the app root: .scr keeps a transform after its entrance animation,
  // which would turn position:fixed into "fixed inside the scrolling content".
  // The root still carries the .evst-app tokens the player's styles rely on.
  const host = typeof document !== 'undefined' ? (document.querySelector('.evst-app') || document.body) : null
  if (!host) return null
  return createPortal(
    <div className="film-player" role="dialog" aria-modal="true" aria-label={t('home.filmTitle')}>
      <button className="film-close" onClick={onClose} aria-label={t('common.close')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <div className="film-frame">
        <iframe
          src={`https://player.mux.com/${id}?autoplay=true&accent-color=%232d5082&primary-color=%23fafaf9`}
          title={t('home.filmTitle')}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      </div>
      <div className="film-copy">
        <div className="eyebrow eyebrow-sage">{t('home.filmEyebrow')}</div>
        <h2 className="serif film-h">{t('home.filmTitle')}</h2>
        <p className="film-p">{t('home.filmBody')}</p>
      </div>
    </div>,
    host,
  )
}
