import React, { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => {
      if (window.Cookiebot && !window.Cookiebot.hasResponse) {
        setVisible(true)
      }
    }
    window.addEventListener('CookiebotOnLoad', check)
    // In case Cookiebot already loaded before this component mounted
    if (window.Cookiebot) check()
    return () => window.removeEventListener('CookiebotOnLoad', check)
  }, [])

  const accept = () => {
    window.Cookiebot?.submitCustomConsent(true, true, true)
    setVisible(false)
  }

  const decline = () => {
    window.Cookiebot?.submitCustomConsent(false, false, false)
    setVisible(false)
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
          We use cookies to keep the platform secure and, with your consent, to understand how people use Everstead.{' '}
          <a href="/privacy#cookies" style={{ color: '#4c7d47', textDecoration: 'underline' }}>Learn more</a>
        </p>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={decline}
            style={{
              background:   'transparent',
              border:       '1px solid #d1cec8',
              borderRadius: '6px',
              padding:      '7px 14px',
              fontSize:     '12px',
              color:        '#5a6475',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
            }}
          >
            Essential only
          </button>
          <button
            onClick={accept}
            style={{
              background:   '#4c7d47',
              border:       'none',
              borderRadius: '6px',
              padding:      '7px 16px',
              fontSize:     '12px',
              color:        '#ffffff',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
