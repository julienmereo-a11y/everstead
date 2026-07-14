// OneSignal REST helpers — Phase B of app notifications (event-driven push).
// We deliberately use OneSignal's REST API rather than their Cordova client SDK:
// the iOS project uses Capacitor's SPM packaging, which Cordova plugins don't
// support. The device token comes from @capacitor/push-notifications on the
// client and is registered here; sends target users by external_id (= Supabase
// user id), so the rest of the backend never thinks about device tokens.
//
// Inert until ONESIGNAL_APP_ID + ONESIGNAL_REST_API_KEY exist in the environment —
// every helper quietly no-ops so this can ship ahead of the console setup.
const APP_ID  = process.env.ONESIGNAL_APP_ID
const API_KEY = process.env.ONESIGNAL_REST_API_KEY
const API     = 'https://api.onesignal.com'

export const pushConfigured = () => Boolean(APP_ID && API_KEY)

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Key ${API_KEY}`,
})

// Attach a device push token to the user (external_id = Supabase user id).
// OneSignal dedupes subscriptions by token, so repeat registrations are safe.
export async function registerPushToken({ userId, token, platform }) {
  if (!pushConfigured()) return { skipped: true }
  const res = await fetch(`${API}/apps/${APP_ID}/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      identity: { external_id: userId },
      subscriptions: [{
        type: platform === 'android' ? 'AndroidPush' : 'iOSPush',
        token,
        enabled: true,
      }],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) console.error('[push] register failed:', res.status, data)
  return { ok: res.ok, data }
}

// Send a push to one or more users by Supabase user id. Fire-and-forget safe:
// never throws, logs failures.
export async function sendPushToUsers({ userIds, title, body, data = {} }) {
  if (!pushConfigured()) return { skipped: true }
  if (!userIds?.length) return { skipped: true }
  try {
    const res = await fetch(`${API}/notifications`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        app_id: APP_ID,
        include_aliases: { external_id: userIds.map(String) },
        target_channel: 'push',
        headings: { en: title },
        contents: { en: body },
        data,
      }),
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok) console.error('[push] send failed:', res.status, out)
    return { ok: res.ok, out }
  } catch (err) {
    console.error('[push] send error:', err)
    return { ok: false }
  }
}
