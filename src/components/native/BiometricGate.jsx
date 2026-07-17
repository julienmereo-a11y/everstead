import React, { useEffect, useRef, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { isNative } from '../../lib/platform'
import { getLockState, verifyPasscode, verifyBiometric, clearPasscode } from './appLock'
import { haptic } from '../../lib/haptics'

// Local device-lock layer for the iOS app, sitting above the route tree. The lock
// is ACTIVE whenever the user has set a passcode (see appLock / SecuritySetup): the
// app locks on cold start and after being backgrounded for a while. Face ID / Touch
// ID is an optional shortcut on top of the passcode.
//
// This is NOT an auth replacement — failing/cancelling never signs the user out of
// Supabase, it just keeps the lock screen up. Fail-open everywhere so a hanging or
// failing native call can never leave the app blank.
const BACKGROUND_LOCK_THRESHOLD_MS = 60_000

export default function BiometricGate({ children }) {
  const [checking, setChecking] = useState(false)
  const [locked, setLocked] = useState(false)
  const [biometric, setBiometric] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const backgroundedAt = useRef(null)

  // Any native platform: the passcode is pure JS, and the biometric plugin covers
  // both Face ID / Touch ID (iOS) and fingerprint/BiometricPrompt (Android).
  const runNative = isNative()

  const promptBiometric = async () => {
    const ok = await verifyBiometric()
    if (ok) { haptic.light(); setLocked(false); setPin(''); setError(null) }
  }

  const submitPin = async (value = pin) => {
    if (value.length < 4) return
    if (await verifyPasscode(value)) { haptic.light(); setLocked(false); setPin(''); setError(null) }
    else { haptic.error(); setError('Incorrect passcode.'); setPin('') }
  }

  // Re-lock (on cold start or after backgrounding) only if a passcode is set.
  const maybeLock = async () => {
    const s = await getLockState()
    setBiometric(s.biometric)
    if (s.hasPin) {
      setLocked(true); setPin('')
      if (s.biometric) promptBiometric()
    }
  }

  useEffect(() => {
    if (!runNative) return
    setChecking(true)
    let done = false
    const finish = () => { if (!done) { done = true; setChecking(false) } }
    const safety = setTimeout(finish, 2500) // hard fail-open

    ;(async () => {
      try { await maybeLock() } catch { /* fail open */ } finally { clearTimeout(safety); finish() }
    })()

    let appStateHandle
    ;(async () => {
      try {
        const { App } = await import('@capacitor/app')
        appStateHandle = await App.addListener('appStateChange', async ({ isActive }) => {
          if (!isActive) { backgroundedAt.current = Date.now(); return }
          const elapsed = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0
          if (elapsed >= BACKGROUND_LOCK_THRESHOLD_MS) maybeLock()
        })
      } catch { /* app-state listener unavailable — non-fatal */ }
    })()

    return () => { done = true; clearTimeout(safety); appStateHandle?.remove?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runNative])

  if (!runNative) return children

  if (locked) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center gap-5 px-8">
        <img src="/logo-v2-white.png" alt="Everstead" className="h-11 w-auto opacity-95 mb-2" />
        <div className="flex items-center gap-2">
          <LockKeyhole size={16} className="text-sage-300" />
          <p className="text-white text-base font-medium">Everstead is locked</p>
        </div>
        <input
          type="password" inputMode="numeric" maxLength={6} autoFocus
          value={pin}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '')
            setPin(v); setError(null)
            if (v.length === 6) submitPin(v) // max length — verify without needing the button
          }}
          onKeyDown={e => { if (e.key === 'Enter') submitPin() }}
          placeholder="••••••"
          className="w-48 text-center text-2xl tracking-[0.5em] pl-3 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 outline-none"
        />
        {error && <p className="text-red-300 text-xs -mt-2">{error}</p>}
        <button
          onClick={submitPin} disabled={pin.length < 4}
          className="rounded-full px-8 py-3 text-sm font-semibold bg-white text-navy-900 disabled:opacity-40"
        >
          Unlock
        </button>
        {biometric && (
          <button onClick={promptBiometric} className="text-sage-300 text-sm font-medium">Use Face ID</button>
        )}
        {/* Escape hatch — without it a forgotten passcode is a PERMANENT
            lockout (the lock screen was the only surface, with no way out
            short of deleting the app). Signing out clears the device PIN;
            their vault data is safe behind their account password. */}
        <button
          onClick={async () => {
            if (!confirmExit) { setConfirmExit(true); setTimeout(() => setConfirmExit(false), 4000); return }
            try {
              await clearPasscode()
              const { supabase } = await import('../../lib/supabase')
              await supabase.auth.signOut()
            } catch { /* even on failure, fall through to unlock the gate — no session = auth screen */ }
            setLocked(false)
          }}
          className="text-white/50 text-xs font-medium mt-4"
        >
          {confirmExit ? 'Tap again to sign out — your passcode will be reset' : 'Forgotten your passcode? Sign out'}
        </button>
      </div>
    )
  }

  // Brief hold while we read the lock state (avoids a flash of content before the
  // lock screen). Bounded by the 2.5s safety timeout, so it can never persist.
  if (checking) return <div className="min-h-screen bg-navy-950" />

  return children
}
