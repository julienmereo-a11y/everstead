import { isNative, isIOS } from './platform'

// Android gallery pick, fully native-side (MediaPickKeepAlivePlugin).
//
// Why not an <input type=file>: on a Galaxy Fold 7 the WebView's file-chooser
// chain silently dropped the picked photo — the picker returned, but no change
// event ever reached the page even with process/activity/webview all alive.
// The plugin opens the system photo picker directly, holds a short foreground
// service for the duration (One UI's low-memory killer reaps backgrounded
// webview apps mid-pick), transcodes photos to real JPEG natively (Samsung
// shoots HEIC, which no web engine decodes), and returns a path/URI that we
// read back through Capacitor's local-server proxy.
//
// pickMedia(kind) → File, or null if the user cancelled (or a pick is already
// in flight — double-tapping Upload must not stack two picker activities).

const ANDROID = isNative() && !isIOS()

// A Capacitor plugin proxy is a FAKE THENABLE: if it is ever returned *through*
// a promise chain, the runtime calls `.then()` on it and every method dies with
// `"MediaPickKeepAlive.then() is not implemented"`. So we assign it to a module
// variable and NEVER return the proxy from a .then()/async callback.
let plugin = null
let Capacitor = null
let initPromise = null
function ensurePlugin() {
  if (!ANDROID) return Promise.resolve()
  if (!initPromise) {
    initPromise = import('@capacitor/core')
      .then((core) => {
        Capacitor = core.Capacitor
        plugin = core.registerPlugin('MediaPickKeepAlive') // assign, don't return
      })
      .catch(() => { plugin = null })
  }
  return initPromise
}
if (ANDROID) ensurePlugin()

// True while one of OUR picks is in flight — BiometricGate uses this to skip
// the 60s background re-lock: attaching a photo/video isn't "leaving the app",
// and getting bounced to the passcode screen mid-attach loses the flow.
let pickInProgress = false
let pickPending = false
let lingerTimer = null
export const isPickInProgress = () => pickInProgress

export async function pickMedia(kind /* 'photo' | 'video' */) {
  if (!ANDROID) return null
  if (pickPending) return null // a picker is already open — ignore the extra tap
  // Claim the slot BEFORE any await — two taps in the same frame would both
  // pass the guard otherwise and stack two picker activities.
  pickPending = true
  pickInProgress = true
  try {
    await ensurePlugin()
    if (!plugin) throw new Error('picker unavailable')
  } catch (e) {
    // No picker ever opened — release both flags or the lock-skip sticks forever.
    pickPending = false
    pickInProgress = false
    throw e
  }
  // A stale linger timer from the PREVIOUS pick must not clear the flag while
  // this pick is open (e.g. "Choose a different photo" within 5s).
  clearTimeout(lingerTimer); lingerTimer = null
  try {
    let res
    try {
      res = await plugin.pick({ kind })
    } catch (e) {
      const msg = String(e?.message || e)
      if (msg.includes('cancelled')) return null // user backed out — not an error
      console.log('[upload] pick failed:', msg)
      throw e
    }
    if (!res?.path && !res?.uri) return null
    // Photos come back as a cache-file path (native JPEG transcode); videos as
    // their content:// URI. Both stream through the local-server proxy.
    const src = Capacitor.convertFileSrc(res.path || res.uri)
    const r = await fetch(src)
    if (!r.ok) { console.log('[upload] content fetch failed:', r.status); throw new Error(`fetch ${r.status}`) }
    const blob = await r.blob()
    const type = res.mime || blob.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg')
    const name = res.name || `${kind}-${Date.now()}.${(type.split('/')[1] || 'bin').split('+')[0]}`
    console.log('[upload] picked:', `${name} ${blob.size}B ${type}`)
    return new File([blob], name, { type })
  } finally {
    pickPending = false
    // Linger a few seconds: the resume events that follow the pick must also
    // see "pick in progress", or the lock check races the promise resolution.
    clearTimeout(lingerTimer)
    lingerTimer = setTimeout(() => { pickInProgress = false; lingerTimer = null }, 5000)
  }
}
