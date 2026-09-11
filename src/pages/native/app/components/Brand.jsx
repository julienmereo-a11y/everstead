import React from 'react'
import { useTranslation } from 'react-i18next'

// Brand refresh (Sept 2026): the felted-illustration artwork, the mark + wordmark
// lockup and the trust line, shared by the Welcome, Sign in and tour screens.
// Artwork ships in public/app at 1x/2x/3x (see docs in mobile-app.css, "Brand
// refresh"). Every image here is decorative: alt="" and aria-hidden.

/** src + srcSet for a piece of artwork in public/app (webp, three densities). */
export const artwork = (name) => ({
  src: `/app/${name}.webp`,
  srcSet: `/app/${name}.webp 1x, /app/${name}@2x.webp 2x, /app/${name}@3x.webp 3x`,
})

const MARK = { src: '/app/logo-mark@2x.png', srcSet: '/app/logo-mark@2x.png 2x, /app/logo-mark@3x.png 3x' }

/** Leaf mark + "Everstead" wordmark (Cormorant Garamond 600), mark 34px tall. */
export function Lockup({ style }) {
  return (
    <div className="lockup" role="img" aria-label="Everstead" style={style}>
      <img {...MARK} alt="" aria-hidden="true" />
      <span aria-hidden="true">Everstead</span>
    </div>
  )
}

const LockGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

/** Lock · AES-256 · UK-based · GDPR · Rated Excellent on Trustpilot (11px, 55% white). */
export function TrustLine() {
  const { t } = useTranslation('mobile')
  const items = [t('auth.trustAes'), t('auth.trustUk'), t('auth.trustGdpr')]
  return (
    <p className="trust">
      <LockGlyph />
      {items.map((s) => <React.Fragment key={s}><span>{s}</span><span aria-hidden="true">·</span></React.Fragment>)}
      <span>{t('auth.trustRatedPre')}<b>{t('auth.trustRatedWord')}</b>{t('auth.trustRatedPost')}</span>
    </p>
  )
}
