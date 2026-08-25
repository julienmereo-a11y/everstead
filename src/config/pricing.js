// ─────────────────────────────────────────────────────────────────────────────
// PRICING — SINGLE SOURCE OF TRUTH
// ─────────────────────────────────────────────────────────────────────────────
// Change prices/copy here once; every page, the checkout flow, and emails read
// from this module.
//
// MONEY RULES:
//  • Stripe amounts are in PENNIES. Annual amount = (monthly × 12) × 0.80 (20% off).
//  • The "/mo billed annually" figures (£3.19, £7.99) are DISPLAY ONLY — they are
//    NEVER sent to Stripe. Stripe charges the whole annual total in one transaction
//    (3828 / 9588 pennies). Setting an annual price to 799 would charge £7.99 for a
//    whole year — never do that.
//  • Stripe price IDs live in env vars (VITE_STRIPE_*). Point those env var VALUES
//    at the price objects below in BOTH Vercel and .env. Existing subscribers are
//    tied to their old price objects on their subscription, so this only affects
//    NEW signups.
//
// LIVE price IDs (created 17 Jun 2026, "20% annual" structure):
//   Essential monthly  399  → price_1TjRTmAUOoLrvSaM3aIvPOSP
//   Essential annual   3828 → price_1TjRTwAUOoLrvSaMTkXNJrV1
//   Family    monthly  999  → price_1TjRU5AUOoLrvSaMETIrMXNk
//   Family    annual   9588 → price_1TjRUEAUOoLrvSaMQY5vSRWh
//
// OLD live price IDs (pre-change; existing subscribers remain on these — kept for
// reference in case anyone is ever migrated):
//   Essential monthly  500   → price_1TYCi5AUOoLrvSaMWlYeQaEA
//   Essential annual   3600  → price_1TYCi5AUOoLrvSaMwar6dq0Q
//   Family    monthly  1200  → price_1TYCW8AUOoLrvSaMeH121xoH
//   Family    annual   12000 → price_1TYCW8AUOoLrvSaMc42GvO1G
//
// `revenueCatIdentifier` is the App Store IAP product / RevenueCat package
// identifier for the iOS app (see api/revenuecat/webhook.js). It is NOT a
// price — Apple/App Store Connect governs the actual charged amount and
// localized display price for IAP, so the perMonth/display figures above are
// reference copy only on the native paywall.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// PLAN KEYS vs DISPLAY LABELS
// ─────────────────────────────────────────────────────────────────────────────
// The KEYS below are internal identifiers. They match profiles.plan (a CHECK
// constraint), Stripe subscription metadata, RLS policies, ProtectedRoute, the
// adviser portal, and every gift/webhook code path. NEVER rename a key — renaming
// 'advisor' → 'pro' would ripple through RLS and access control for zero benefit.
//
// Only the LABELS are customer-facing. This is the single place plan names are
// spelled: rename here and every page, email and badge follows.
//
//   free      → "Everstead"       £0, no card — the permanent free tier
//   essential → "Essential"       RETIRED for new signups. Existing subscribers are
//                                 grandfathered and keep their exact plan, price and
//                                 features. Do NOT remove this key or its Stripe prices.
//   family    → "Everstead+"      rename only — price/features unchanged
//   advisor   → "Everstead Pro"   rename only — sold via demo on /for-advisers,
//                                 not shown in the consumer pricing table
// ─────────────────────────────────────────────────────────────────────────────
export const PLAN_KEYS = {
  FREE:      'free',
  ESSENTIAL: 'essential',
  PLUS:      'family',
  PRO:       'advisor',
}

export const PLAN_LABELS = {
  free:      'Everstead',
  essential: 'Essential',
  family:    'Everstead+',
  advisor:   'Everstead Pro',
}

/** Display name for a plan key. Falls back to the key so nothing ever renders blank. */
export const planLabel = (key) => PLAN_LABELS[key] ?? key

/** Plans a NEW user can self-serve select. Essential is retired; Pro is sold via demo. */
export const SELECTABLE_PLANS = ['free', 'family']

/** Still fully supported for existing subscribers, but never offered again. */
export const RETIRED_PLANS = new Set(['essential'])

/** True for any plan that is billed. Free users have no Stripe subscription at all. */
export const isPaidPlan = (key) => key === 'essential' || key === 'family' || key === 'advisor'

// ─────────────────────────────────────────────────────────────────────────────
// FREE TIER LIMITS
// ─────────────────────────────────────────────────────────────────────────────
// Enforced SERVER-SIDE in Postgres — public.free_tier_allows() plus INSERT policies
// on accounts / documents / trusted_people. These numbers are mirrored here only so
// the UI can render an accurate at-the-limit upgrade prompt. If you change one,
// change the migration too: the database is the authority, not this file.
//
// Deliberately NOT capped: the chat-led onboarding, the About Me section, and Your
// AI Assistant. Those are the activation engine and stay fully open on Free.
// ─────────────────────────────────────────────────────────────────────────────
// FRANCE: its own list price, not a conversion
// ─────────────────────────────────────────────────────────────────────────────
// Everstead+ is sold in France at 9,99 EUR TTC a month or 99,99 EUR TTC a year
// (tax-inclusive: French consumer prices must be shown TTC). That annual figure
// is two months free against the monthly rate, NOT the 20% the GBP catalogue
// uses, so never derive the French saving from the pounds numbers.
// The Stripe price IDs live in VITE_STRIPE_FAMILY_*_EUR.
export const PRICING_FR = {
  family: {
    monthly: { perMonth: 9.99, display: '9,99 €' },
    annual:  { perMonth: 8.33, perYear: 99.99, display: '99,99 €' },
    monthsFree: 2,
  },
}

/**
 * Display prices for the visitor's market, plus a formatter that puts the
 * currency where that language expects it ("£9.99" vs "9,99 €").
 */
export function marketPricing(language) {
  const fr = language === 'fr'
  return {
    isFrance: fr,
    currency: fr ? 'EUR' : 'GBP',
    family:   fr ? PRICING_FR.family : PRICING.family,
    money:    (n) => (fr ? `${Number(n).toFixed(2).replace('.', ',')} €` : `£${Number(n).toFixed(2)}`),
  }
}

export const FREE_LIMITS = {
  accounts:      1,
  documents:     1,
  // 3, not 1: inviting a trusted person emails someone about Everstead from a
  // person they trust, which is the only built-in word-of-mouth loop the
  // product has. Mirrored in free_tier_allows() in the database, which is the
  // authority. Change both together.
  trustedPeople: 3,
}

export const PRICING = {
  // Permanent free tier. No Stripe product, no price, no card — a free user simply
  // has plan='free' and no subscription. Not a trial and not time-limited.
  free: {
    name: 'Everstead',
    isFree: true,
    monthly: { perMonth: 0, display: 'Free', amountPence: 0, priceId: null },
  },
  essential: {
    name: 'Essential',
    monthly: {
      perMonth: 3.99,
      display: '£3.99',
      amountPence: 399,
      priceId: import.meta.env.VITE_STRIPE_ESSENTIAL_MONTHLY,
      revenueCatIdentifier: 'essential_monthly',
    },
    annual: {
      perMonth: 3.19,                 // display-only "/mo billed annually"
      perMonthDisplay: '£3.19',
      perYear: 38.28,
      perYearDisplay: '£38.28',
      amountPence: 3828,              // what Stripe actually charges per year
      priceId: import.meta.env.VITE_STRIPE_ESSENTIAL_YEARLY,
      revenueCatIdentifier: 'essential_yearly',
    },
    saveLabel: 'Save 20%',
    saveAmountYear: '~£9.50/year',
  },
  family: {
    name: 'Everstead+',
    monthly: {
      perMonth: 9.99,
      display: '£9.99',
      amountPence: 999,
      priceId: import.meta.env.VITE_STRIPE_FAMILY_MONTHLY,
      revenueCatIdentifier: 'everstead_plus_monthly',
    },
    annual: {
      perMonth: 7.99,
      perMonthDisplay: '£7.99',
      perYear: 95.88,
      perYearDisplay: '£95.88',
      amountPence: 9588,
      priceId: import.meta.env.VITE_STRIPE_FAMILY_YEARLY,
      revenueCatIdentifier: 'everstead_plus_yearly',
    },
    saveLabel: 'Save 20%',
    saveAmountYear: '£24/year',
  },
}

// Site-wide entry teaser. The entry point is now the permanent free tier, not a price.
// Deliberately avoids "trial" / "limited time" — Free is not time-limited.
export const PRICE_TEASER = 'Free to start'

// Full one-line descriptions, reused wherever a plan price is shown. Keyed by plan key.
export const PRICE_LINE = {
  free:      'Free. Get started and organise the essentials, at no cost.',
  // Retained for grandfathered subscribers' billing/settings screens only.
  essential: '£3.99/month — or £3.19/month billed annually (£38.28/year). Save 20%.',
  family:    '£9.99/month — or £7.99/month billed annually (£95.88/year). Save 20%.',
}
