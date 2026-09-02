import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// Local fallback flag. Cookiebot stores consent in a cookie, but iOS Safari
// (ITP / private browsing) can refuse to persist it — which previously left the
// bar reappearing or never dismissing. We mirror "they've answered" in
// localStorage so the bar's visibility never depends on that cookie surviving.
const CONSENT_KEY = 'everstead_cookie_consent'

const hasStoredConsent = () => {
  try { return localStorage.getItem(CONSENT_KEY) === '1' } catch { return false }
}
const storeConsent = () => {
  try { localStorage.setItem(CONSENT_KEY, '1') } catch { /* private mode: ignore */ }
}

export default function CookieBanner() {
  const { t, i18n } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (hasStoredConsent()) return // already answered on this device, never show again

    const check = () => {
      if (hasStoredConsent() || window.Cookiebot?.hasResponse) { setVisible(false); return }
      if (window.Cookiebot) setVisible(true)
    }
    window.addEventListener('CookiebotOnLoad', check)
    window.addEventListener('CookiebotOnAccept', check)
    window.addEventListener('CookiebotOnDecline', check)
    // In case Cookiebot already loaded before this component mounted
    if (window.Cookiebot) check()
    return () => {
      window.removeEventListener('CookiebotOnLoad', check)
      window.removeEventListener('CookiebotOnAccept', check)
      window.removeEventListener('CookiebotOnDecline', check)
    }
  }, [])

  // Dismiss the bar FIRST and persist the local flag, then tell Cookiebot.
  // If submitCustomConsent throws or reloads the page (iOS), the bar is already
  // gone and the flag keeps it gone — the user's tap is never "lost".
  const respond = (consent) => {
    setVisible(false)
    storeConsent()
    try {
      window.Cookiebot?.submitCustomConsent(consent, consent, consent)
    } catch { /* UI already dismissed; nothing else to do */ }
  }

  if (!visible) return null

  return (
    <div style={{
      position:   'fixed',
      bottom:     0,
      left:       0,
      right:      0,
      zIndex:     99999,
      background: '#ffffff',
      borderTop:  '1px solid #e8e5e0',
      boxShadow:  '0 -4px 20px rgba(0,0,0,0.08)',
      padding:    '14px 20px',
      fontFamily: 'DM Sans, system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <p style={{ flex: 1, margin: 0, fontSize: '13px', color: '#5a6475', lineHeight: '1.5', minWidth: '200px' }}>
          {t('cookie.message')}{' '}
          {/* Plain <a>, so it must carry the /fr prefix itself: a bare /privacy would drop a French visitor onto the English policy. */}
          <a href={`${i18n.language === 'fr' ? '/fr' : ''}/privacy#cookies`} style={{ color: '#4c7d47', textDecoration: 'underline' }}>{t('cookie.learnMore')}</a>
        </p>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => respond(false)}
            style={{
              background:   'transparent',
              border:       '1px solid #d1cec8',
              borderRadius: '9999px',
              padding:      '7px 14px',
              fontSize:     '12px',
              color:        '#5a6475',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
            }}
          >
            {t('cookie.essentialOnly')}
          </button>
          <button
            onClick={() => respond(true)}
            style={{
              background:   'linear-gradient(100deg, #2d5082 0%, #6f6bc6 50%, #6e9b6a 100%)',
              border:       'none',
              borderRadius: '9999px',
              padding:      '7px 16px',
              fontSize:     '12px',
              color:        '#ffffff',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
            }}
          >
            {t('cookie.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  )
}
