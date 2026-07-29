import { isNative } from './platform'

// Per-user AI consent flag (App Store guideline 5.1.2(i)): the user must
// explicitly agree BEFORE anything is sent to a third-party AI service
// (Anthropic). Stored per user id — localStorage on web, Capacitor Preferences
// on device (survives webview storage clears) — mirroring appLock's pattern.
//
// This complements (not replaces) the account-wide Settings → AI features
// toggle: the toggle turns the feature off; this records informed consent the
// first time it's used.

const key = (userId) => `evst_ai_consent_${userId || 'anon'}`

export async function hasAiConsent(userId) {
  try {
    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences')
      const { value } = await Preferences.get({ key: key(userId) })
      if (value === '1') return true
    }
  } catch { /* fall through to localStorage */ }
  try { return localStorage.getItem(key(userId)) === '1' } catch { return false }
}

export async function grantAiConsent(userId) {
  try { localStorage.setItem(key(userId), '1') } catch { /* private mode */ }
  try {
    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences')
      await Preferences.set({ key: key(userId), value: '1' })
    }
  } catch { /* localStorage copy is enough */ }
}
