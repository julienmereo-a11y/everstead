// ─────────────────────────────────────────────────────────────
// ANALYTICS — GA4 custom events
// ─────────────────────────────────────────────────────────────
// Thin, safe wrapper around gtag. gtag is defined inline in index.html and is
// consent-gated (lib/consent.js + Google Consent Mode): before the visitor
// accepts statistics cookies the GA tag never loads and Consent Mode stays
// denied — so it is always safe to call this, no consent checks at call sites.
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
//
// META PIXEL MIRROR. The same calls also reach the Meta Pixel so Ads Manager can
// optimise campaigns on real conversions (accounts created) instead of clicks.
// `fbq` exists ONLY after marketing consent (the pixel tag in index.html is
// type="text/plain" data-category="marketing", enabled by lib/consent.js) and
// never in the native build (vite strips the tag) — so the presence check IS the
// consent check, and the apps stay Meta-free. Standard events are what Meta can bid on;
// the rest go out as custom events for reporting.
const META_STANDARD = {
  signup_completed:     'CompleteRegistration',
  checkout_started:     'InitiateCheckout',
  subscription_created: 'Subscribe',
}
const META_CUSTOM = new Set(['plan_selected', 'upgrade_click', 'app_store_click'])

export function trackEvent(name, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params)
    }
  } catch {
    // Analytics must never break the app.
  }
  try {
    const fbq = typeof window !== 'undefined' ? window.fbq : undefined
    if (typeof fbq !== 'function') return
    const standard = META_STANDARD[name]
    if (standard) {
      // Meta's vocabulary: content_name = which plan, content_category = billing period.
      const meta = {}
      if (params.plan)    meta.content_name = params.plan
      if (params.billing) meta.content_category = params.billing
      fbq('track', standard, meta)
    } else if (META_CUSTOM.has(name)) {
      fbq('trackCustom', name, params)
    }
  } catch {
    // Same rule: measurement never breaks the product.
  }
}
