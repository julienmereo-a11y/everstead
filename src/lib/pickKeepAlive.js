import { isNative, isIOS } from './platform'

// Android only: hold the app at foreground priority while a system photo/file
// picker is open, so One UI's low-memory killer can't reap the process mid-pick.
// The device log proved a full-system memory-pressure reap takes a backgrounded
// web-view app down; a short foreground service keeps it out of the killable
// bucket for the few seconds the picker is up. No-op on iOS/web (they don't reap
// this way), so callers can use it unconditionally.

const ANDROID = isNative() && !isIOS()

// A Capacitor plugin proxy is a FAKE THENABLE: if it is ever returned *through* a
// promise chain, the runtime calls `.then()` on it and every method then dies
// with `"MediaPickKeepAlive.then() is not implemented"`. So we register it into a
// module-level variable and NEVER return the proxy from a .then()/async callback.
let plugin = null
let initPromise = null
function ensurePlugin() {
  if (!ANDROID) return Promise.resolve()
  if (!initPromise) {
    initPromise = import('@capacitor/core')
      .then((core) => { plugin = core.registerPlugin('MediaPickKeepAlive') }) // assign, don't return
      .catch(() => { plugin = null })
  }
  return initPromise
}
// Warm the import up front so `start()` can fire the instant Upload is tapped.
if (ANDROID) ensurePlugin()

let safetyTimer = null

// Fire-and-forget: must NOT be awaited by the caller, because the file input's
// .click() has to run in the same user-gesture tick or the browser blocks it.
export function startPickKeepAlive() {
  if (!ANDROID) return
  ensurePlugin().then(() => { if (plugin) plugin.start().catch(() => {}) })
  clearTimeout(safetyTimer)
  // Backstop: shortService may run ~3 min max; never hold it that long.
  safetyTimer = setTimeout(stopPickKeepAlive, 120000)
}

export function stopPickKeepAlive() {
  if (!ANDROID) return
  clearTimeout(safetyTimer); safetyTimer = null
  ensurePlugin().then(() => { if (plugin) plugin.stop().catch(() => {}) })
}
