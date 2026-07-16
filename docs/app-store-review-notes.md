# App Store review notes — Advisor plan and In-App Purchase

Everstead sells three plans: **Essential**, **Family**, and **Advisor**. The iOS app
offers Essential and Family as in-app purchases (via RevenueCat/StoreKit,
see `api/revenuecat/webhook.js`). **Advisor is not offered as an in-app
purchase and never will be inside this app.**

## Why Advisor is excluded from IAP

Advisor is a B2B plan sold to professional advisers (solicitors, financial
planners) who manage multiple clients through a dedicated `/advisor-portal`
workspace. Its pricing is negotiated per firm ("pricing on application" —
see `src/pages/Pricing.jsx` and `src/i18n/locales/en/pricing.json`) and is
not a fixed consumer price point, so it does not fit Apple's fixed-SKU IAP
model. Advisor accounts are provisioned and billed entirely outside the app,
via a sales conversation and Stripe invoicing on the web.

This is consistent with App Store Review Guideline 3.1.3(f) ("Multiplatform
Services") / the accepted precedent for B2B apps whose enterprise contracts
are negotiated and sold outside the app — the app itself never presents
Advisor as something a consumer can tap to buy.

## What reviewers will see

- A user who signs in to the iOS app as an Advisor-plan user is routed
  straight to `/advisor-portal` (see `src/components/ProtectedRoute.jsx`,
  the `isAdviser` branch) — they never see the IAP paywall at
  `src/pages/native/IAPPaywall.jsx`, which only ever presents Essential and
  Family.
- A user with no active subscription sees exactly two purchasable options
  (Essential, Family), both fulfilled through Apple's in-app purchase flow,
  with a "Restore Purchases" option always visible on that screen.
- Users who already have an active subscription (from either the website or
  a prior Apple purchase) are never shown the paywall at all — the app reads
  entitlement from the same account state as the web product.

---

## Privacy manifest & App Store Connect privacy questionnaire (added 2026-07-14)

`ios/App/App/PrivacyInfo.xcprivacy` is bundled with the app target (verified present
inside the built `.app`). **The App Store Connect privacy answers MUST match it** —
Apple cross-checks, and a mismatch is a rejection.

**Tracking: NO.** No advertising SDK, no third-party analytics, no data broker, no
cross-app linkage. Vercel Analytics and the marketing pixels (GTM / GA / Meta) are
explicitly stripped from the Capacitor bundle (`src/main.jsx` renders `<Analytics/>`
only when `!isNative()`; `vite.config.js` strips the tags). So in App Store Connect:
answer **"No, we do not use data for tracking"** and leave tracking domains empty.

**Data collected — every item is "App Functionality", linked to the user, NOT tracking:**

| App Store Connect category | Why Everstead collects it |
|---|---|
| Name | Account + About Me |
| Email address | Account identifier; inviting trusted contacts |
| Phone number | Optional field in Settings |
| User ID | Supabase user id; push subscription key |
| Device ID | APNs push token (reminders / alerts) |
| Other financial info | The user's record of accounts, pensions, policies, subscriptions. **No card numbers, no credentials, no bank logins are ever collected.** |
| Other user content | Documents, wishes, instructions, sealed personal messages, About Me |
| Photos or videos | Profile photo; photographed/scanned documents |
| Purchase history | Everstead+ subscription state (Apple IAP via RevenueCat) |

Do **not** tick: Contacts, Location, Browsing/Search History, Advertising Data,
Health/Fitness, Sensitive Info, Crash/Performance/Diagnostics (the app ships no
client-side crash or analytics SDK — Sentry is server-side only).

**Required-reason API:** `NSPrivacyAccessedAPICategoryUserDefaults` with reason
**CA92.1** (reads/writes only this app's own data) — `@capacitor/preferences` stores
the app-lock passcode hash and the intro-seen flag. Third-party SDKs (Capacitor,
RevenueCat, OneSignal) ship their own manifests; we do not restate their API use.

If you later add an analytics/attribution SDK, or start collecting anything above
that isn't listed, update BOTH this manifest and the ASC questionnaire together.
