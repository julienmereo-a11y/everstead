import { isNative } from './platform'

// Tiny device-local key/value store: Capacitor Preferences on device, localStorage
// on the web. (Preferences has no reliable web bridge — its promises can hang in a
// browser, which is why appLock.js uses this same split.) For device-scoped flags
// like "has seen the intro" — NOT for user data, which lives in Supabase.
export async function getPref(key) {
  if (!isNative()) { try { return localStorage.getItem(key) } catch { return null } }
  try {
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key })
    return value
  } catch { return null }
}

export async function setPref(key, value) {
  if (!isNative()) { try { localStorage.setItem(key, value) } catch { /* ignore */ } return }
  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key, value })
  } catch { /* never block a flow on storage */ }
}
