/* ─────────────────────────────────────────────────────────────────────────
 * Everstead — Web Push scaffold (service-worker side)
 *
 * This file is imported into the generated Workbox service worker via
 * vite.config.js → VitePWA → workbox.importScripts: ['/sw-push.js'].
 *
 * It only sets up the LISTENERS. Nothing sends push yet — see the TODOs below
 * and src/pwa/push.js for the client-side subscribe stub.
 *
 * To go live later you'll need:
 *   1. A VAPID key pair (public key shipped to the client, private key on the server).
 *   2. A Supabase table to store each browser's PushSubscription JSON per user.
 *   3. A Vercel route (e.g. /api/push/send) that signs payloads with `web-push`
 *      and POSTs them to the stored subscription endpoints.
 * ───────────────────────────────────────────────────────────────────────── */

// Fired when the push service delivers a message to this browser.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Everstead', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Everstead'
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    // TODO: pass through a deep-link path from the backend payload so a tap
    // opens the right place (e.g. data.url = '/dashboard?section=alerts').
    data: { url: data.url || '/' },
    // tag lets repeat notifications of the same kind replace each other.
    tag: data.tag || undefined,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Fired when the user taps a notification — focus an existing tab or open one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Focus an existing Everstead tab if one is open.
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client && targetUrl !== '/') client.navigate(targetUrl)
          return
        }
      }
      // Otherwise open a new window.
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})

// TODO: handle 'pushsubscriptionchange' to re-subscribe and re-sync the new
// subscription to the backend when the browser rotates the subscription.
