# App Store review notes — Everstead

Canonical, version-controlled source for the App Store Connect review submission.
Copy **section 1** into *App Review Information → Notes* for each release.

> ⚠️ **This repo is PUBLIC.** The review account password and the fixed 2-step code
> are secrets and MUST NOT be committed here. They live only in the Vercel
> environment variables `APP_REVIEW_EMAIL` / `APP_REVIEW_CODE` (consumed by
> `api/auth/mfa-send-code.js`) and are pasted into App Store Connect at submission
> time. The `<PLACEHOLDER>`s below are intentional — do not fill them in in git.

---

## 1. Reviewer notes (paste into App Review Information → Notes)

```
Thank you for reviewing Everstead — a private, secure place to organise your
accounts, documents, trusted people and final wishes for the people you love.

SIGNING IN (please read first — the app uses 2-step verification)
Everstead emails a one-time code at sign-in. The review account is configured
with a FIXED code, so you do NOT need email access.

   Username:           appreview@everstead.care
   Password:           <APP_REVIEW_PASSWORD>
   Verification code:  <APP_REVIEW_CODE>

   1. Launch the app and tap "Sign In".
   2. Enter the username and password above.
   3. When prompted for the emailed code, enter the verification code.

REVIEW ACCOUNT
This account is already subscribed to Everstead+ (the paid tier), so every
gated feature is unlocked for review: Personal Messages, plus unlimited
accounts, documents and trusted people.

SUBSCRIPTION — Everstead+ (Apple In-App Purchase)
Everstead is free to use. Everstead+ is an auto-renewable subscription sold
through Apple IAP:
   • £9.99/month, or £7.99/month billed annually (£95.88/year)
   • 14-day free trial
The purchase screen is reached at: More tab -> Settings -> "Upgrade to
Everstead+". (The review account is already subscribed, so this shows
subscription management; a new free account sees the full purchase screen,
and the same option appears on the Home screen.)

THE "ADVISOR / PRO" PLAN (not sold in-app, by design)
Everstead also offers a separate business (B2B) plan called Advisor/Pro. It is
NOT available in the app — it is sold only on our website (via Stripe) and is
unreachable from the iOS app. The app contains no purchase mechanism other
than Apple In-App Purchase.

PERMISSIONS (all optional and user-initiated)
   • Camera & Microphone — only to record optional video messages
   • Photos — only to attach optional photos/videos to messages, and to set a
     profile picture
None are required to use the app.

Any questions, please contact julienmereo@gmail.com — happy to help.
```

**Before pasting:** replace `<APP_REVIEW_PASSWORD>` and `<APP_REVIEW_CODE>` with the
real values from the Vercel env vars. The username/password also go in the dedicated
App Review Information fields; the fixed code has no dedicated field, which is why it
must live in the Notes.

---

## 2. How the fixed review code works (MFA bypass)

`api/auth/mfa-send-code.js` is env-gated: when the sign-in email matches
`APP_REVIEW_EMAIL` (and `APP_REVIEW_CODE` is set), it skips the per-IP rate limit,
uses the fixed `APP_REVIEW_CODE` instead of a random one, and sends no email. Every
other account behaves normally (random code, emailed). The password is still verified
against Supabase first, so the review flow mirrors production exactly. If either env
var is unset, the bypass is completely inert.

---

## 3. Plan model (current — freemium)

- Every user lands on the **Free** tier — there is **no entry paywall**.
- **Everstead+** is the single consumer paid tier, sold via Apple IAP
  (`everstead_plus_monthly` / `everstead_plus_yearly` → internal plan key `family`,
  displayed as "Everstead+" via `planLabel()`). Product → plan mapping lives in
  `api/revenuecat/webhook.js`.
- **Advisor / Pro** (internal key `advisor`) is a B2B plan sold only on the web via
  Stripe. It is never presented in the iOS app.

Internal plan keys `free | essential | family | advisor` never change; only labels
do. `essential` is a legacy key that is **not** offered in the native app.

---

## 4. Why Advisor/Pro is excluded from IAP (Guideline 3.1.3(f))

Advisor/Pro is a B2B plan sold to professional advisers (solicitors, financial
planners) who manage multiple clients through a dedicated `/advisor-portal`
workspace. Pricing is negotiated per firm ("pricing on application" — see
`src/pages/Pricing.jsx`), not a fixed consumer SKU, so it does not fit Apple's
fixed-price IAP model. Advisor accounts are provisioned and billed outside the app
via a sales conversation and Stripe invoicing — consistent with the accepted
precedent for B2B/enterprise services sold outside the app. The app never presents
Advisor as something a consumer can tap to buy.

### What reviewers will see

- Every new user lands in the app on the **Free** tier — no entry paywall.
- The single purchasable option is **Everstead+**, fulfilled through Apple IAP, with
  a "Restore Purchases" option always visible on the upgrade screen
  (`src/pages/native/app/MobilePlanSelect.jsx`).
- A user who already has an active subscription (from the web or a prior Apple
  purchase) is not shown the upgrade screen — the app reads entitlement from the
  same account state as the web product.
- Advisor/Pro is never reachable from the iOS app.

---

## 5. Privacy manifest & App Store Connect privacy questionnaire

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
| Physical address | Optional field in About Me |
| User ID | Supabase user id; push subscription key |
| Device ID | APNs push token (reminders / alerts) |
| Other financial info | The user's record of accounts, pensions, policies, subscriptions. **No card numbers, no credentials, no bank logins are ever collected.** |
| Other user content | Documents, wishes, instructions, sealed personal messages, About Me |
| Photos or videos | Profile photo; photographed/scanned documents; photo/video messages |
| Purchase history | Everstead+ subscription state (Apple IAP via RevenueCat) |
| Other data | Date of birth (About Me) |

Do **not** tick: Contacts, Location, Browsing/Search History, Advertising Data,
Health/Fitness, Sensitive Info, Crash/Performance/Diagnostics (the app ships no
client-side crash or analytics SDK — Sentry is server-side only).

**Required-reason API:** `NSPrivacyAccessedAPICategoryUserDefaults` with reason
**CA92.1** (reads/writes only this app's own data) — `@capacitor/preferences` stores
the app-lock passcode hash and the intro-seen flag. Third-party SDKs (Capacitor,
RevenueCat, OneSignal) ship their own manifests; we do not restate their API use.

If you later add an analytics/attribution SDK, or start collecting anything above
that isn't listed, update BOTH this manifest and the ASC questionnaire together.
