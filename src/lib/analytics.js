// ─────────────────────────────────────────────────────────────
// ANALYTICS — GA4 custom events
// ─────────────────────────────────────────────────────────────
// Thin, safe wrapper around gtag. gtag is defined inline in index.html and is
// consent-gated by Google Consent Mode (Cookiebot): before the visitor accepts
// analytics cookies, events are dropped/limited by Consent Mode itself — so it
// is always safe to call this, and no consent checks are needed at call sites.
//
// Event vocabulary (keep names stable — renaming breaks GA4 reports):
//   cta_click            { location, cta }           any marketing CTA
//   plan_selected        { plan, billing }           signup step 1 continue
//   signup_started       { plan }                    account form submitted
//   signup_completed     { plan }                    account created (pre-payment)
//   checkout_started     { plan, billing }           card step reached
//   subscription_created { plan, billing }           payment confirmed
//   upgrade_click        { plan, billing, from_plan } in-app upgrade intent
//   app_store_click      { store, location }         Google Play / App Store link
export function trackEvent(name, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params)
    }
  } catch {
    // Analytics must never break the app.
  }
}
