import { isNative, isIOS, apiPost } from './platform'
import { supabase } from './supabase'
import { getPref, setPref } from './prefs'

// Phase A of app notifications: LOCAL notifications, scheduled on-device from data
// the app already loads. No push infrastructure — these mirror the reminder logic
// of the server email crons (api/cron/document-expiry, annual-review, birthday) and
// respect the SAME profiles.notify_* toggles Settings writes, so email and app
// reminders always agree. Phase B (event-driven push via OneSignal/FCM) comes later;
// see the conversation notes in docs/android-launch-checklist.md's sibling docs.
//
// Everything here is isNative-guarded and fail-silent: reminders must never break
// a flow, and on web these are all no-ops (the web keeps its email crons).

const ASKED_KEY = 'evst_notif_asked'

// ⚠️ NEVER `return LocalNotifications` from an async function. Capacitor plugins are
// Proxies that answer ANY property lookup with a native method — so awaiting one makes
// JS probe `.then`, get a bogus native method back, treat the plugin as a thenable and
// call it: `"LocalNotifications.then()" is not implemented on ios`. Every notification
// call then dies before reaching iOS. Wrapping it in a plain object (or importing at
// the call site) keeps the proxy out of the promise-resolution path.
async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return { LN: LocalNotifications }
}

// Postgres DATE columns (documents.expires_at, about_me.date_of_birth) serialise as
// "YYYY-MM-DD", which `new Date()` parses as UTC MIDNIGHT. Reading it back with local
// getters then lands on the PREVIOUS day for anyone west of UTC — e.g. a US user's
// birthday notification would fire a day early, every year. Parse date-only strings
// as local dates; pass timestamps (with a time component) straight through.
const toLocalDate = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

const at = (date, hour) => { const d = new Date(date); d.setHours(hour, 0, 0, 0); return d }

export async function notificationsGranted() {
  if (!isNative()) return false
  try { return (await (await plugin()).LN.checkPermissions()).display === 'granted' } catch { return false }
}

// Raw iOS/Android permission state for diagnostics + smarter Settings copy:
// 'prompt' (never asked), 'denied', 'granted' — or 'err: …' when the plugin
// call itself fails (e.g. plugin missing from the binary).
export async function notificationStatus() {
  if (!isNative()) return 'web'
  try { return (await (await plugin()).LN.checkPermissions()).display } catch (e) { return 'err: ' + (e?.message || e) }
}

// Direct permission request — used by Settings' "Enable" button. Also marks the
// one-time auto-prompt as handled so action-triggered asks don't re-fire later.
// (If iOS has already asked once and been declined, the system prompt won't
// reappear — that's iOS policy; the user flips it in iOS Settings instead.)
export async function requestNotificationPermission() {
  if (!isNative()) return false
  try {
    await setPref(ASKED_KEY, 'true')
    const { display } = await (await plugin()).LN.requestPermissions()
    return display === 'granted'
  } catch { return false }
}

// One-time permission prompt, fired at a moment where the value is obvious (after
// the first meaningful write — "want a reminder before this expires?"), NOT at app
// launch. The asked-flag means declining never nags again.
export async function maybeAskNotificationPermission() {
  if (!isNative()) return false
  try {
    if ((await getPref(ASKED_KEY)) === 'true') return notificationsGranted()
    return requestNotificationPermission()
  } catch { return false }
}

// Phase B: register this device for PUSH (event notifications — invite accepted,
// new alerts). Grabs the APNs/FCM token via the official plugin and hands it to
// /api/push/register, which files it under the user in OneSignal. Safe to call
// repeatedly (server dedupes by token); silently no-ops without permission, off
// device, or before the Xcode push capability / server keys exist.
export async function registerForPush() {
  if (!isNative()) return
  try {
    if (!(await notificationsGranted())) return
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
    // Both addListener calls are awaited: on a binary that predates the plugin,
    // Capacitor returns a REJECTED promise ("not implemented") — unawaited, that
    // becomes an unhandled rejection and trips the fatal-error overlay.
    await PushNotifications.addListener('registration', async ({ value }) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        await apiPost('/api/push/register',
          { token: value, platform: isIOS() ? 'ios' : 'android' },
          { Authorization: `Bearer ${session.access_token}` })
      } catch { /* push must never break a flow */ }
    })
    await PushNotifications.addListener('registrationError', () => { /* no capability yet — fine */ })
    await PushNotifications.register()
  } catch { /* plugin/capability missing — fine, Phase B is optional */ }
}

// Bumped by clearReminders() and by each syncReminders() run. An in-flight sync that
// finds the epoch has moved on (e.g. the user signed out mid-sync, which clears) must
// NOT schedule — otherwise it re-arms reminders on a signed-out device and leaks
// document names onto the lock screen for weeks.
let epoch = 0

export async function clearReminders() {
  if (!isNative()) return
  epoch++
  try {
    const { LN } = await plugin()
    const pending = await LN.getPending()
    if (pending?.notifications?.length) {
      await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })
    }
  } catch { /* never break a flow */ }
}

// Recompute the full reminder schedule from current data. Called whenever the app
// loads/changes documents or the profile: cancel-all-then-reschedule keeps deleted
// or re-dated documents from leaving stale reminders behind. Cheap — it's all local.
let syncing = false
let pendingSync = null
export async function syncReminders(args) {
  const { userId, profile, documents = [] } = args || {}
  if (!isNative() || !profile) return
  // COALESCE rather than drop: a concurrent call (e.g. the permission prompt's sync
  // racing the effect's fresh-data sync after an upload) must not be silently lost,
  // or the just-uploaded document's expiry reminder never gets scheduled.
  if (syncing) { pendingSync = args; return }
  syncing = true
  const mine = ++epoch
  try {
    if (!(await notificationsGranted())) return
    const { LN } = await plugin()
    await clearReminders()

    const now = Date.now()
    const notifications = []
    let id = 1

    // Document expiry — 30 days and 7 days before, at 9am (matches the email cron).
    if (profile.notify_document_expiry !== false) {
      for (const doc of documents) {
        if (!doc.expires_at) continue
        const exp = toLocalDate(doc.expires_at).getTime()
        for (const [days, phrase] of [[30, 'in a month'], [7, 'in a week']]) {
          const when = at(exp - days * 86400000, 9)
          // 60s cushion: iOS REJECTS THE WHOLE schedule() batch for a past-dated entry
          // (Android just skips it), and there's a network round-trip below before we
          // schedule — a reminder due within the next minute could slip into the past
          // and take every other reminder down with it.
          if (when.getTime() > now + 60_000) {
            notifications.push({
              id: id++,
              title: `${doc.name} expires ${phrase}`,
              body: 'Review or replace it in Everstead so your vault stays up to date.',
              schedule: { at: when },
            })
          }
        }
      }
    }

    // Annual review — yearly on the signup anniversary at 10am.
    if (profile.notify_annual_review !== false && profile.created_at) {
      const c = new Date(profile.created_at)
      notifications.push({
        id: id++,
        title: 'Time for your annual review',
        body: 'A year moves fast — ten minutes keeps your plan true to life.',
        schedule: { on: { month: c.getMonth() + 1, day: c.getDate(), hour: 10, minute: 0 } },
      })
    }

    // Birthday note — yearly at 9am, from about_me.date_of_birth (if recorded).
    if (profile.notify_birthday !== false && userId) {
      try {
        const { data } = await supabase.from('about_me').select('date_of_birth').eq('user_id', userId).maybeSingle()
        if (data?.date_of_birth) {
          const b = toLocalDate(data.date_of_birth)
          notifications.push({
            id: id++,
            title: 'Happy birthday from Everstead 🌱',
            body: 'Another year of a life well lived. Your plan is keeping it all safe.',
            schedule: { on: { month: b.getMonth() + 1, day: b.getDate(), hour: 9, minute: 0 } },
          })
        }
      } catch { /* birthday is optional */ }
    }

    // Vault nudge — one-shot 14 days out, RESCHEDULED on every app open. It only
    // ever fires after two genuinely quiet weeks; opening the app pushes it back.
    if (profile.notify_vault_nudges !== false) {
      notifications.push({
        id: id++,
        title: 'Your plan misses you',
        body: 'Two minutes today keeps everything ready for the people you love.',
        schedule: { at: at(now + 14 * 86400000, 18) },
      })
    }

    // Superseded (signed out, or a newer sync started) → do not re-arm.
    if (epoch !== mine) return
    if (notifications.length) await LN.schedule({ notifications })
  } catch { /* never break a flow */ } finally {
    syncing = false
    if (pendingSync) { const next = pendingSync; pendingSync = null; syncReminders(next) }
  }
}
