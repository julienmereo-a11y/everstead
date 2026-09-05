# Meta (Facebook / Instagram) ads — setup

Decision (2026-09-05): **web conversion campaigns, no Meta SDK in the apps.**
The apps stay Meta-free (privacy policy, Data Promise and the iOS "no tracking"
label all hold). Meta optimises on the website's real conversion, an account
created, and the stores attribute installs from tagged badge links.

## What the code does

- `src/lib/analytics.js` mirrors funnel events to the Meta Pixel (id
  `1866212894055288`, Cookiebot-gated in `index.html`, stripped from native
  builds by `vite.config`):

  | trackEvent               | Meta event           | Use in Ads Manager        |
  |--------------------------|----------------------|---------------------------|
  | `signup_completed`       | CompleteRegistration | **campaign conversion**   |
  | `checkout_started`       | InitiateCheckout     | mid-funnel                |
  | `subscription_created`   | Subscribe            | value reporting           |
  | plan_selected / upgrade_click / app_store_click | custom events | reporting, optional goals |

- `src/lib/campaign.js` remembers `utm_*` (or `fbclid`) from the landing URL for
  the session; `storeUrls()` tags the badges: Play gets a `referrer` UTM (shows
  in Play Console → Acquisition), the App Store gets `pt`/`ct` once
  `APPLE_PROVIDER_TOKEN` in `StoreBadges.jsx` is filled in.

## One-time portal steps (Julien)

1. **Meta for Developers** (developers.facebook.com/apps) → Create App → use
   case "Other" → type "Business" → name Everstead → attach the Business
   portfolio that owns the pixel. App settings → Basic: privacy + terms URLs,
   icon, then "+ Add Platform" twice:

   | Field | Value |
   |---|---|
   | iOS Bundle ID | `care.everstead.app` |
   | iPhone Store ID | `6791210842` |
   | Android package name | `care.everstead.app` |
   | Android class name | `care.everstead.app.MainActivity` |
   | Key hash (Play app-signing) | `8wkCheCjgo/B+0m5bXhga2DYakc=` |
   | Key hash (upload key) | `upAB8ARckgs5zJVXF2XNs6CUL1U=` |

   Switch the app to Live. (Registration only: no SDK, so the app will NOT be
   selectable for "App promotion" campaigns. That is intended.)

2. **Events Manager** → pixel → verify CompleteRegistration arrives (Test Events
   tab, accept marketing cookies on the site, create a test account).

3. **App Store Connect** → App Analytics → Acquisition → Campaigns → Generate
   Campaign Link → copy the `pt=` value into `APPLE_PROVIDER_TOKEN`.

## Campaign recipe

- Objective **Sales** (or Leads) → conversion location Website → pixel
  `Everstead` → event **CompleteRegistration**.
- Destination URL with tags, e.g.
  `https://www.everstead.care/?utm_source=facebook&utm_medium=paid_social&utm_campaign=uk_launch_sept`
  (`utm_campaign` becomes the store campaign name: letters, digits, `_`, `-`).
- French audience → `https://www.everstead.care/fr/…` (badges then point at the
  French storefronts).

## Later, if signal is thin

Conversions API (server-side CompleteRegistration from `delegate-register`)
recovers events lost to Safari ITP and declined cookies. Same pixel, no SDK.
