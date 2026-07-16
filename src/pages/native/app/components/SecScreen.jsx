import React from 'react'
import { BackIcon } from '../icons'

// Shared loading indicator for screen bodies — matches the shell's spinner.
// Plain "Loading…" text is the cheapest-looking thing an app can show.
export function Busy() {
  return (
    <div className="fx jc" style={{ padding: '36px 0' }}>
      <div style={{ width: 26, height: 26, border: '2px solid var(--color-stone-200)', borderTopColor: 'var(--color-navy-800)', borderRadius: 999, animation: 'evstSpin 0.8s linear infinite' }} />
    </div>
  )
}

// Shared wrapper for the secondary ("More") screens: a header with a back
// button + title, then the screen body. Back returns to the More hub.
export default function SecScreen({ title, subtitle, onBack, action, children }) {
  return (
    <div className="scr">
      <div className="head">
        <div className="fx ac gap12" style={{ minWidth: 0 }}>
          <button
            onClick={onBack}
            aria-label="Back"
            // padding+negative margin: a ≥44px hit area with no visual change —
            // this is the most-tapped control for an audience that needs it.
            style={{ background: 'none', border: 0, padding: 12, margin: -12, color: 'var(--color-stone-500)', cursor: 'pointer', flex: 'none' }}
          >
            <BackIcon />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 className="h1" style={{ fontSize: 26 }}>{title}</h1>
            {subtitle && <p className="sub">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="pad">{children}</div>
    </div>
  )
}
