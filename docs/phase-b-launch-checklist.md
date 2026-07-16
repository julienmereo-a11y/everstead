# Everstead iOS — Phase B launch checklist (Xcode → App Store Connect → RevenueCat → TestFlight)

Everything in the codebase is ready. The steps below are the GUI/account work only you
can do. **The values in bold must match the code exactly** — that's where things usually break.

## Fixed values (already in the code — don't change without updating both sides)
- **Bundle ID:** `care.everstead.app`
- **App name:** Everstead
- **IAP product identifiers (2):** `everstead_plus_monthly`, `everstead_plus_yearly` — Everstead+ only. (Essential is retired/grandfathered web-only; Everstead Pro is B2B web/Stripe only. The "+" is illegal in Apple product ids, hence `_plus_`.)
  - The app matches a RevenueCat package by **either** its package identifier **or** its store product id, so naming either one of these works.
- **Prices to mirror (Everstead+):** £9.99/mo · £95.88/yr (source: `src/config/pricing.js`)
- **Advisor plan:** NOT sold via IAP (web/Stripe only) — see `docs/app-store-review-notes.md`
- **RevenueCat webhook URL:** `https://www.everstead.care/api/revenuecat/webhook`
- **Native API base:** the app calls `https://www.everstead.care` for auth/API (`src/lib/platform.js` → `apiUrl`)

## 1. Xcode (`npx cap open ios`)
- [ ] Target **App → Signing & Capabilities**: select your Team (now enrolled). Bundle id is `care.everstead.app`.
- [ ] **In-App Purchase capability: nothing to add.** Modern Xcode enables IAP by default for every app — it is NOT in the "+ Capability" list. Skip it.
- [ ] Set **Version** 1.0.0 and **Build** 1.
- [ ] Run on a simulator to smoke-test (opens onboarding). Note: real IAP needs a physical device + sandbox tester.
- [ ] Signing warning "no devices / no profiles" is normal until you connect a physical device — irrelevant for simulator runs.

## 2. App Store Connect
- [ ] Create the app: iOS, bundle id `care.everstead.app`, name "Everstead".
- [ ] Create an **auto-renewable subscription group** (e.g. "Everstead Membership").
- [ ] Create **2 subscriptions** with these exact Product IDs + prices:
  - `everstead_plus_monthly` — £9.99 / month
  - `everstead_plus_yearly` — £95.88 / year
- [ ] Add a **14-day free trial** (introductory offer) on each — the paywall copy promises this.
- [ ] Generate an **App-Specific Shared Secret** (for RevenueCat) and an **App Store Connect API key**.
- [ ] Create a **Sandbox Tester** (Users and Access → Sandbox).

## 3. RevenueCat
- [ ] New project → add an **App Store app** (bundle id `care.everstead.app`); paste the Shared Secret + API key.
- [ ] Add the 2 products above.
- [ ] Create the **current Offering** with 2 packages identified `everstead_plus_monthly` / `everstead_plus_yearly`.
- [ ] Copy the **iOS public SDK key** → env var `VITE_REVENUECAT_IOS_API_KEY`.
- [ ] Integrations → **Webhook**: URL `https://www.everstead.care/api/revenuecat/webhook`; set an **Authorization header** value to a secret you generate.

## 4. Environment variables (Vercel)
- [ ] `VITE_REVENUECAT_IOS_API_KEY` = RevenueCat public SDK key  ← **must be set before building the native app** (it's compiled into the bundle)
- [ ] `REVENUECAT_WEBHOOK_AUTH_TOKEN` = the same secret you put in RevenueCat's webhook Authorization header
- [ ] Redeploy the web/API. Then rebuild native so the key is baked in:
      `npm run build:capacitor && npx cap sync ios`

## 5. Test on a real device (sandbox)
- [ ] Sign the device into the Sandbox Tester Apple ID.
- [ ] Run the app → create account → **plan select → subscribe** → purchase completes.
- [ ] Confirm the RevenueCat webhook fires and `profiles` shows `entitlement_source = 'apple_iap'` and an active/trialing `subscription_status` → the app unlocks.
- [ ] Test **Restore Purchases**, and cross-platform: a Stripe web subscriber logging into the app should see **no** paywall.
- [ ] Test **Face ID** unlock (Settings → Biometric unlock) and the document/photo upload pickers.

## 6. TestFlight → submission
- [ ] Xcode → Archive → upload to App Store Connect → TestFlight (internal testers first).
- [ ] App Review notes: paste the Advisor-exclusion rationale from `docs/app-store-review-notes.md`.
- [ ] Submit for review.

## Notes / gotchas
- Until `VITE_REVENUECAT_IOS_API_KEY` is set and the native app rebuilt, the paywall can't load offerings (RevenueCat won't init).
- Simulator can't do real sandbox purchases — use a physical device (or an Xcode local `.storekit` config for pure-UI testing).
- The paywall shows Apple's real localized price (RevenueCat `priceString`), falling back to the `pricing.js` figures — keep ASC prices aligned with those figures.
