import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import './mobile-app.css'
import { useAuth } from '../../../contexts/AuthContext'
import { isNative } from '../../../lib/platform'
import { getLockState } from '../../../components/native/appLock'
import MobileAuthFlow from './MobileAuthFlow'
import MobileAppAuthed from './MobileAppAuthed'
import MobileAppDemo from './MobileAppDemo'
import MobilePlanSelect from './MobilePlanSelect'
import SecuritySetup from './SecuritySetup'
import AppIntro, { hasSeenIntro } from './AppIntro'

// Entry point for the Everstead native mobile app. Resolved in order:
//  • while the session resolves → spinner
//  • logged out → onboarding + sign in/up (real Supabase auth)
//  • logged in → the connected, tabbed app, on the free Everstead tier
//
// There is NO paywall gate on entry: Everstead has a permanent free tier, so every
// signed-in user lands in the app. Upgrading to Everstead+ (the paid plan) happens
// inside the app — from Settings, or a nudge when a free user hits a limit — via
// MobilePlanSelect (an in-app upgrade screen, not a gate). Free-tier limits are
// enforced server-side by Postgres RLS, not by withholding the app.
//
// All screens share the website's Supabase data via the existing hooks, so the
// mobile app and web stay in sync automatically (same client, same RLS).
const Spinner = () => (
  <div className="evst-app" style={{ background: '#0d1628' }}>
    <div className="f1 fx ac jc">
      <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#9dbc9a', borderRadius: '999px', animation: 'evstSpin 0.8s linear infinite' }} />
    </div>
  </div>
)

// Shown when the session is valid but the profile hasn't arrived (usually an
// offline cold start). A 6s grace keeps the normal path a plain spinner.
function ProfileWait({ retry }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 6000); return () => clearTimeout(t) }, [])
  if (!slow) return <Spinner />
  return (
    <div className="evst-app" style={{ background: '#0d1628', height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, textAlign: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14.5, lineHeight: 1.5, margin: 0 }}>
        We couldn't reach Everstead. Check your connection and try again.
      </p>
      <button className="btn btn-light" onClick={retry}>Try again</button>
    </div>
  )
}

export default function MobileApp() {
  const { user, profile, loading } = useAuth()
  const [params] = useSearchParams()
  const demo = params.get('demo')

  // First-run gates (native only), in order: 4-step intro tour → passcode / Face ID
  // setup. Both flags are device-local, checked once the user is signed in.
  // `null` = still checking; on web / non-native both are immediately "handled".
  const [needsIntro, setNeedsIntro] = useState(isNative() ? null : false)
  const [needsSetup, setNeedsSetup] = useState(isNative() ? null : false)
  useEffect(() => {
    let cancelled = false
    if (!user?.id || !isNative()) { setNeedsIntro(false); setNeedsSetup(false); return }
    // Back to "checking" while the pref reads resolve — otherwise the stale `false`
    // from the logged-out state lets a just-signed-in user flash the full app for a
    // beat before the intro/passcode gates kick in.
    setNeedsIntro(null); setNeedsSetup(null)
    hasSeenIntro()
      .then(seen => { if (!cancelled) setNeedsIntro(!seen) })
      .catch(() => { if (!cancelled) setNeedsIntro(false) })
    getLockState()
      .then(s => { if (!cancelled) setNeedsSetup(!s.setupDone) })
      .catch(() => { if (!cancelled) setNeedsSetup(false) })
    return () => { cancelled = true }
    // user?.id, NOT user: supabase emits a NEW user object on TOKEN_REFRESHED /
    // USER_UPDATED; keying on the object unmounted the whole app every ~50 min.
  }, [user?.id])

  // Preview modes (no backend, no login).
  if (demo === 'plan') {
    return (
      <div className="evst-app" style={{ background: '#0d1628' }}>
        <div className="sbcover sbcover-dark" />
        <MobilePlanSelect demo onSubscribed={() => { window.location.href = '/mobile?demo=1' }} onBack={() => { window.location.href = '/mobile?demo=1' }} />
      </div>
    )
  }
  if (demo === 'lock') {
    return (
      <div className="evst-app" style={{ background: '#0d1628' }}>
        <SecuritySetup onDone={() => { window.location.href = '/mobile?demo=1' }} />
      </div>
    )
  }
  if (demo === 'intro') {
    return (
      <div className="evst-app" style={{ background: '#0d1628' }}>
        <AppIntro onDone={() => { window.location.href = '/mobile?demo=1' }} />
      </div>
    )
  }
  if (demo === '1') return <MobileAppDemo />

  if (loading) return <Spinner />

  // Logged out → onboarding / sign in.
  if (!user) return <div className="evst-app" style={{ background: '#0d1628' }}><MobileAuthFlow /></div>

  // Logged in, profile still loading → wait (avoids a flash before the app
  // renders with the user's data). If it never arrives (offline cold start,
  // Supabase blip), offer a retry instead of an infinite spinner.
  if (!profile) return <ProfileWait retry={() => refreshProfile?.()} />

  // Still resolving the first-run flags → wait.
  if (needsIntro === null || needsSetup === null) return <Spinner />

  // First launch on this device → the 4-step tour (how to use the app + benefits),
  // then the passcode / Face ID setup.
  if (needsIntro) {
    return (
      <div className="evst-app" style={{ background: '#0d1628' }}>
        <AppIntro onDone={() => setNeedsIntro(false)} />
      </div>
    )
  }
  if (needsSetup) {
    return (
      <div className="evst-app" style={{ background: '#0d1628' }}>
        <SecuritySetup onDone={() => setNeedsSetup(false)} />
      </div>
    )
  }

  // Logged in → straight into the app. No paywall gate: free users belong here
  // too, and upgrading to Everstead+ happens inside the app (see MobilePlanSelect,
  // reached from Settings / limit nudges).
  return <div className="evst-app"><MobileAppAuthed /></div>
}
