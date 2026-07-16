# Android launch checklist

The Android platform was scaffolded on 14 Jul 2026 (`android/`, Capacitor 8). The app
code is already cross-platform: same bundle, same Supabase backend, same screens —
one codebase, both stores. This file lists what remains to ship the Play Store build.

## Already done (works on Android today)
- `android/` project generated (`npx cap add android`), appId `care.everstead.app`.
- All 6 plugins are cross-platform and registered: app, browser, haptics,
  preferences, native-biometric (fingerprint/BiometricPrompt), purchases-capacitor.
- App icons + splash generated from `assets/icon-only.png`
  (`npx capacitor-assets generate --android`, 86 assets).
- App lock (passcode + biometrics) runs on any native platform — `BiometricGate`
  gates on `isNative()`, not iOS.
- Networking: `/api` calls go through CapacitorHttp (`src/lib/platform.js` apiPost),
  which bypasses webview CORS on Android exactly as on iOS. Supabase is CORS-open.
- First-run flow (intro tour → passcode setup), free tier, upgrade paywall UI,
  6-tab nav — all shared code, no iOS-only branches.

## Remaining to ship

### 1. Build & run locally
```bash
npm run build:capacitor && npx cap sync android && npx cap open android
```
Requires Android Studio. Run on an emulator/device and sanity-check:
- **Safe areas**: iOS needed a 50px floored top inset (see mobile-app.css). On
  Android the webview normally does NOT extend under the status bar, so the floor
  may look slightly roomy. If so, tune per-platform by adding a platform class
  (e.g. `plat-android` on `.evst-app` via `Capacitor.getPlatform()`) and overriding
  the header paddings — do NOT change the iOS values.
- Keyboard behaviour on the auth/PIN inputs (androidx adjustResize is the default).
- Back button: Android hardware back — @capacitor/app fires `backButton`; decide
  whether to wire it to the app's `go()` navigation (nice-to-have, not blocking).

### 2. RevenueCat / Google Play Billing (required before selling Everstead+)
Purchases are currently configured for iOS only (`AuthContext.jsx` gates on
`isIOS() && VITE_REVENUECAT_IOS_API_KEY`). For Android:
- Create the products in Google Play Console (same identifiers:
  `everstead_plus_monthly`, `everstead_plus_yearly` — Everstead+ only; Pro stays web/B2B).
- Add the app in RevenueCat → get the **Google API key** → env
  `VITE_REVENUECAT_ANDROID_API_KEY`.
- Update `syncRevenueCatUser` in `src/contexts/AuthContext.jsx` to pick the key by
  platform instead of the iOS gate. The webhook
  (`api/revenuecat/webhook.js`) is platform-agnostic — no server change needed.
- Until then the app still works on Android as a free-tier app; the paywall's
  purchase button will show its "not available right now" error.

### 3. Signing & store listing
- Generate an upload keystore; configure `android/app/build.gradle` signing.
- Play Console: listing (reuse App Store copy), data-safety form (same answers as
  Apple privacy labels), content rating.
- Internal testing track first (Play's TestFlight equivalent).

### 4. Housekeeping
- Bump the Settings build marker (`APP_BUILD` in
  `src/pages/native/app/screens/SettingsScreen.jsx`) per build — it renders at the
  bottom of Settings on Android too; use it to catch stale builds.
- Commit `android/` when the mobile work is committed (same caveat as `ios/` — see
  the repo's mobile/web coupling notes before pushing to main, since Vercel builds
  from this repo).
