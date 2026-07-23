import { isNative, isIOS } from './platform'

// Android gallery pick, fully native-side (MediaPickKeepAlivePlugin).
//
// Why not an <input type=file>: on a Galaxy Fold 7 the WebView's file-chooser
// chain silently dropped the picked photo — the picker returned, but no change
// event ever reached the page even with process/activity/webview all alive.
// The plugin opens the system photo picker directly, holds a short foreground
// service for the duration (One UI's low-memory killer reaps backgrounded
// webview apps mid-pick), and returns a content:// URI that we read back
// through Capacitor's /_capacitor_content_ proxy.
//
// pickMedia(kind) → File, or null if the user cancelled.

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
export const isPickInProgress = () => pickInProgress

export async function pickMedia(kind /* 'photo' | 'video' */) {
  if (!ANDROID) return null
  await ensurePlugin()
  if (!plugin) throw new Error('picker unavailable')
  pickInProgress = true
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
    // Photos come back as a cache-file path (native transcode to real JPEG —
    // Samsung's HEIC can't be decoded by any web engine); videos as their
    // content:// URI. Both stream through Capacitor's local-server proxy.
    const src = Capacitor.convertFileSrc(res.path || res.uri)
    const r = await fetch(src)
    if (!r.ok) { console.log('[upload] content fetch failed:', r.status); throw new Error(`fetch ${r.status}`) }
    const blob = await r.blob()
    const type = res.mime || blob.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg')
    const name = res.name || `${kind}-${Date.now()}.${(type.split('/')[1] || 'bin').split('+')[0]}`
    console.log('[upload] picked:', `${name} ${blob.size}B ${type}`)
    return new File([blob], name, { type })
  } finally {
    // Linger a few seconds: the resume events that follow the pick must also
    // see "pick in progress", or the lock check races the promise resolution.
    setTimeout(() => { pickInProgress = false }, 5000)
  }
}

// Legacy exports (keep-alive around a WebView-driven pick). The gallery flows
// now use pickMedia() end-to-end; these remain for any future external-activity
// flow that needs reap protection.
let safetyTimer = null

export function startPickKeepAlive() {
  if (!ANDROID) return
  ensurePlugin().then(() => { if (plugin) plugin.start().catch(() => {}) })
  clearTimeout(safetyTimer)
  safetyTimer = setTimeout(stopPickKeepAlive, 120000)
}

export function stopPickKeepAlive() {
  if (!ANDROID) return
  clearTimeout(safetyTimer); safetyTimer = null
  ensurePlugin().then(() => { if (plugin) plugin.stop().catch(() => {}) })
}
