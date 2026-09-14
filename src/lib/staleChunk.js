// Recovery from a stale deploy.
//
// Build output uses hashed filenames, so after a deploy a visitor who still has
// the previous page open asks for chunks that no longer exist the next time
// they navigate. Vite reports a failed dynamic import as `vite:preloadError`;
// React.lazy surfaces the same failure as a thrown error, which lands in the
// ErrorBoundary. Either way the cure is one reload, so the browser fetches the
// current index.html and the chunks it references. The reload is guarded so a
// chunk that is genuinely broken cannot put the tab in a reload loop: one
// reload per ten seconds, then the error is shown as usual.

const KEY = 'everstead:stale-chunk-reload'
const WINDOW_MS = 10_000

export function isChunkLoadError(err) {
  const m = String(err?.message || err || '')
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically imported|Unable to preload CSS|Loading (CSS )?chunk/i.test(m)
}

// Returns true when a reload was started (the caller should stop rendering).
export function reloadOnceForStaleChunk() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (last && Date.now() - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export function installStaleChunkRecovery() {
  if (typeof window === 'undefined') return
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForStaleChunk()) event.preventDefault()
  })
}
