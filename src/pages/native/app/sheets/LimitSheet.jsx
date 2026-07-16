import React from 'react'
import { planLabel } from '../../../../config/pricing'

// Shown when a free-tier user hits a cap (1 account / 1 document / 1 trusted
// contact — the DB enforces these) and tries to add another. Rather than letting
// the add fail against RLS, we intercept and nudge to Everstead+. `nudge.noun` is
// the singular resource name, e.g. 'document'.
export default function LimitSheet({ nudge, onUpgrade, onClose }) {
  const noun = nudge?.noun || 'item'
  // Accurate per-resource claims — Everstead+ is unlimited for accounts and
  // documents but capped at 10 trusted people; never promise more than the
  // paywall delivers.
  const unlock = noun === 'trusted contact'
    ? 'up to 10 trusted people'
    : `unlimited ${noun}s`
  return (
    <>
      <h3 className="sh-title">You've reached your free limit</h3>
      <p className="rdet" style={{ margin: '0 0 18px', lineHeight: 1.55 }}>
        Your Everstead (free) plan includes 1 {noun}. Upgrade to {planLabel('family')} for {unlock}, Personal Messages and more.
      </p>
      <button className="btn w100" onClick={onUpgrade}>Upgrade to {planLabel('family')}</button>
      <button
        onClick={onClose}
        style={{ display: 'block', width: '100%', marginTop: 10, background: 'none', border: 0, color: 'var(--color-stone-500)', font: '500 13.5px var(--font-sans)', cursor: 'pointer', padding: 8 }}
      >
        Not now
      </button>
    </>
  )
}
