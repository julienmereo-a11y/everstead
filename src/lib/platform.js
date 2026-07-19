import { Capacitor } from '@capacitor/core'

export const isNative = () => Capacitor.isNativePlatform()
export const isIOS = () => Capacitor.getPlatform() === 'ios'

// Tag <body> with the native platform (plat-ios / plat-android) so the mobile
// CSS can tune per-platform chrome. iOS needs a 50px top-inset floor because its
// webview draws under the status bar; Android's webview sits BELOW the status
// bar, so the same floor reads as a dead band and plat-android collapses it.
export const applyPlatformClass = () => {
  if (!isNative()) return
  document.body.classList.add(`plat-${Capacitor.getPlatform()}`)
  // Android: brand-navy status bar with white icons. Must be done at runtime —
  // Capacitor 8's edge-to-edge handling sets LIGHT_STATUS_BARS after window
  // creation, overriding the theme attrs in styles.xml. Style.Dark = dark
  // BACKGROUND (i.e. white icons). iOS is untouched (its status bar is correct).
  if (Capacitor.getPlatform() === 'android') {
    import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
        StatusBar.setBackgroundColor({ color: '#0d1628' }).catch(() => {})
      })
      .catch(() => {})
  }
}

// Base URL for the backend API routes. On the web they're same-origin (relative).
// In the native app the web bundle is served from capacitor://localhost — which
// has no server — so API calls must target the deployed backend absolutely.
const NATIVE_API_BASE = 'https://www.everstead.care'
export const apiUrl = (path) => (isNative() ? `${NATIVE_API_BASE}${path}` : path)

// POST JSON to a backend API route. In the native app, cross-origin calls to the
// deployed backend are blocked by browser CORS (the endpoints don't send CORS
// headers), so we go through Capacitor's native HTTP, which isn't subject to CORS.
// On the web we use a normal same-origin fetch. Supabase calls are unaffected —
// they send `Access-Control-Allow-Origin: *`, so they keep using fetch directly.
// Returns { ok, status, data } with `data` already parsed.
export async function apiPost(path, body, extraHeaders = {}) {
  const url = apiUrl(path)
  const headers = { 'Content-Type': 'application/json', ...extraHeaders }
  if (isNative()) {
    const { CapacitorHttp } = await import('@capacitor/core')
    const res = await CapacitorHttp.post({ url, headers, data: body })
    const data = typeof res.data === 'string' ? safeJson(res.data) : res.data
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data }
  }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }
}

function safeJson(s) { try { return JSON.parse(s) } catch { return {} } }
