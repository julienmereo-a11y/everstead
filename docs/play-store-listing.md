# Everstead — Google Play listing (v1.0)

Play counterpart of docs/app-store-listing.md — same voice, adapted to Play's
fields. Play has no keyword field: search terms must appear naturally in the
description (they do — "estate planning", "will", "executor", "vault", etc.).

---

## App name  (max 30)
**Everstead: Life, Organised** *(26)*
> Plain "Everstead" (9) also fine, but Play weighs title words heavily for search.

## Short description  (max 80 — shown under the name, above the fold)
**One calm, secure place for your accounts, documents, wishes and loved ones.** *(77)*

## Full description  (max 4000)
Everstead is one calm, secure place for everything that matters — so the people
you love are never left searching.

Life is scattered across dozens of accounts, documents, logins and good
intentions. Everstead gently brings it together: what you own, where it's kept,
who to contact, and how you'd like things done. Estate planning without the
overwhelm — organised for life, and ready for your family, if the time ever
comes.

WHAT YOU CAN KEEP IN EVERSTEAD
• Accounts & assets — banks, pensions, investments and insurance, with the
  details your family would actually need
• Document vault — wills, insurance policies, property deeds and important
  paperwork, safely stored
• Trusted people — invite the people who matter (family, executor, adviser),
  and choose exactly what they can see, and when
• Instructions & wishes — step-by-step guidance and personal wishes, in your
  own words
• Personal messages — sealed letters, videos and photos for the people you
  love, released when the time is right
• About Me — your story, your passions, the things worth remembering

BUILT AROUND PEACE OF MIND
• Your information stays private, behind your account and an optional passcode
  or fingerprint unlock on this device
• You decide who sees what — nothing is shared until you choose to share it
• A simple readiness score shows what's done and what's next

EVERSTEAD+
Everstead is free to start. Upgrade to Everstead+ for unlimited accounts,
documents and trusted people, sealed personal messages, and helpful reminders —
£9.99/month, or £7.99/month billed annually, with a 14-day free trial.

Everstead is an organisation platform, not a legal service — use it alongside
professional advice on wills, probate and lasting power of attorney.

Because the most loving thing you can leave behind is a life that's easy to
find.

---

## Graphics checklist
| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, ≤1MB | Generate from assets/icon-only.png (`sips -z 512 512`) |
| Feature graphic | 1024×500 PNG/JPG, REQUIRED | To create — navy gradient + logo + tagline |
| Phone screenshots | ≥4, each side 320–3840px, **aspect ≤ 2:1** | ⚠️ iPhone 6.5" captures are 1:2.16 — too tall for Play. Re-capture from the Pixel emulator and pad/crop to 1080×1920 (9:16), or letterbox existing ones onto 9:16 canvas |
| 7" / 10" tablet screenshots | Optional (app is phone-first) | Skip |

## Store settings
- **Category:** Lifestyle (secondary tags: Productivity)
- **Email:** support@everstead.care · **Website:** https://www.everstead.care
- **Privacy policy URL (required):** https://www.everstead.care/privacy

## Content declarations (Politique de contenu → Contenu de l'application)
- **Privacy policy:** URL above
- **Ads:** No
- **App access:** Restricted — provide the review account (same as Apple):
  appreview@everstead.care + password + note that the emailed 2FA code is fixed
  (value in Vercel env APP_REVIEW_CODE; never commit it — repo is public)
- **Content rating questionnaire:** Utility/productivity category → no violence,
  no user-generated public content (messages are private 1-to-1), no gambling →
  expect PEGI 3 / Everyone
- **Target audience:** 18+ (estate planning; do NOT tick any child age bands —
  avoids Families policy entirely)
- **News app:** No · **COVID app:** No · **Government app:** No
- **Financial features:** None — Everstead stores user-entered RECORDS about
  accounts; it performs no banking, payments, lending or investing. Declare
  "My app doesn't provide any financial features."
- **Login credentials / account deletion URL (required):** the app has in-app
  deletion (Settings → Delete my account); web deletion URL:
  https://www.everstead.care/dashboard (Settings section) — Play asks for a URL;
  point it at the web settings page.

## Data safety form (mirror of Apple privacy labels — docs/app-store-review-notes.md §5)
All collected, none shared with third parties, all encrypted in transit,
deletion available (in-app + web). Purposes: App functionality only. Not used
for advertising. No data "shared" (RevenueCat/Supabase are service providers —
Play's definition of sharing excludes processors acting on your instructions).

| Play category | Collected? | Notes |
|---|---|---|
| Personal info → Name, Email | Yes | account |
| Personal info → Phone | Yes (optional) | profile field |
| Personal info → Address | Yes (optional) | About Me |
| Financial info → Other | Yes | user-entered account records — no card numbers |
| Personal info → Other (DOB) | Yes (optional) | About Me |
| Photos & videos | Yes | documents, profile photo, messages |
| Files & docs | Yes | vault uploads |
| App activity / App info | No | no analytics SDK in the app |
| Device IDs | Yes | push token |
| Location, Contacts, Browsing | No | never collected |

## Release notes (v1.0)
Welcome to Everstead. This is our very first release — one calm, secure place
to gather your accounts, documents, trusted people and wishes, organised for
life and ready for your family. We'd love to hear what you think.
