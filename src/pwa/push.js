/* ─────────────────────────────────────────────────────────────────────────
 * Everstead — Web Push scaffold (client side)
 *
 * Helpers for requesting notification permission and creating a PushSubscription.
 * This is a SCAFFOLD: subscribe() is wired up to the browser APIs, but the
 * subscription is NOT yet sent anywhere, and there is no VAPID key configured.
 *
 * To go live later:
 *   1. Generate a VAPID key pair (`npx web-push generate-vapid-keys`).
 *   2. Expose the PUBLIC key to the client (e.g. import.meta.env.VITE_VAPID_PUBLIC_KEY).
 *   3. POST the returned subscription to a Vercel route that stores it in Supabase
 *      against the current user.
 *   4. Send pushes from the server with the `web-push` library + the private key.
 *
 * The service-worker side (push / notificationclick listeners) lives in
 * public/sw-push.js.
 * ───────────────────────────────────────────────────────────────────────── */

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

// Convert a base64url VAPID key to the Uint8Array the PushManager expects.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Ask for permission and create a PushSubscription.
 * Returns the subscription object (or null if unsupported / denied).
 *
 * NOTE: today this only subscribes locally. Sending the subscription to the
 * backend is left as a TODO so we don't ship a half-built push pipeline.
 */
export async function requestAndSubscribe() {
  if (!isPushSupported()) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    // No VAPID key configured yet — scaffold only.
    console.info('[push] No VITE_VAPID_PUBLIC_KEY set — push is scaffolded but not active.')
    return null
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  // TODO: POST `subscription` to a Vercel route (e.g. /api/push/subscribe)
  // that stores it in Supabase against the current user, then send pushes
  // from the server with `web-push`.
  return subscription
}
