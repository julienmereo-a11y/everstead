import { isNative } from '../../lib/platform'

// App-lock state for the native iOS app: an optional numeric passcode plus an
// optional Face ID / Touch ID shortcut. This is a convenience lock in FRONT of the
// app — it is NOT the auth boundary (the Supabase session is). Failing it never
// signs the user out; it just keeps the lock screen up.
//
// The passcode is stored only as a salted SHA-256 hash in Capacitor Preferences —
// the raw PIN is never persisted.
const K_PIN   = 'evst_lock_pin_hash'
const K_SALT  = 'evst_lock_pin_salt'
const K_BIO   = 'evst_lock_biometric'   // 'true' | 'false'
const K_SETUP = 'evst_lock_setup_done'  // 'true' once the first-run prompt is handled

// Storage abstraction: Capacitor Preferences on device, localStorage on the web
// (Preferences has no reliable web bridge — its promises can hang off-device, and
// this keeps the /mobile preview working too).
async function storeGet(key) {
  if (!isNative()) { try { return localStorage.getItem(key) } catch { return null } }
  try {
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key })
    return value
  } catch { return null }
}

async function storeSet(key, value) {
  if (!isNative()) { try { localStorage.setItem(key, value) } catch { /* ignore */ } return }
  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key, value })
  } catch { /* storage must never break a flow */ }
}

async function storeRemove(key) {
  if (!isNative()) { try { localStorage.removeItem(key) } catch { /* ignore */ } return }
  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.remove({ key })
  } catch { /* storage must never break a flow */ }
}

function hex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return hex(new Uint8Array(buf))
}

// { hasPin, biometric, setupDone } — hasPin drives whether the app locks at all.
export async function getLockState() {
  try {
    const [pin, bio, setup] = await Promise.all([storeGet(K_PIN), storeGet(K_BIO), storeGet(K_SETUP)])
    return { hasPin: !!pin, biometric: bio === 'true', setupDone: setup === 'true' }
  } catch {
    // Never block the app on a storage error — treat as no lock, setup handled.
    return { hasPin: false, biometric: false, setupDone: true }
  }
}

export async function setPasscode(pin) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const hash = await sha256Hex(salt + pin)
  await storeSet(K_SALT, salt)
  await storeSet(K_PIN, hash)
}

export async function verifyPasscode(pin) {
  try {
    const [salt, hash] = await Promise.all([storeGet(K_SALT), storeGet(K_PIN)])
    if (!salt || !hash) return false
    return (await sha256Hex(salt + pin)) === hash
  } catch { return false }
}

export async function setBiometricEnabled(enabled) {
  await storeSet(K_BIO, enabled ? 'true' : 'false')
}

export async function markSetupDone() {
  await storeSet(K_SETUP, 'true')
}

// Remove the passcode entirely (turns the lock off). Keeps setupDone so the user
// isn't re-prompted on next launch.
export async function clearPasscode() {
  await Promise.all([storeRemove(K_PIN), storeRemove(K_SALT), storeSet(K_BIO, 'false')])
}

export async function biometricAvailable() {
  if (!isNative()) return false
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
    const { isAvailable } = await NativeBiometric.isAvailable({ useFallback: false })
    return !!isAvailable
  } catch { return false }
}

// Prompt Face ID / Touch ID. Resolves true on success, false on failure/cancel.
export async function verifyBiometric() {
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
    const { isAvailable } = await NativeBiometric.isAvailable({ useFallback: false })
    if (!isAvailable) return false
    await NativeBiometric.verifyIdentity({ reason: 'Unlock Everstead', title: 'Unlock Everstead', subtitle: '', useFallback: false })
    return true
  } catch { return false }
}
