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
// ─────────────────────────────────────────────────────────────────────────────

export const PRICING = {
  essential: {
    name: 'Essential',
    monthly: {
      perMonth: 3.99,
      display: '£3.99',
      amountPence: 399,
      priceId: import.meta.env.VITE_STRIPE_ESSENTIAL_MONTHLY,
    },
    annual: {
      perMonth: 3.19,                 // display-only "/mo billed annually"
      perMonthDisplay: '£3.19',
      perYear: 38.28,
      perYearDisplay: '£38.28',
      amountPence: 3828,              // what Stripe actually charges per year
      priceId: import.meta.env.VITE_STRIPE_ESSENTIAL_YEARLY,
    },
    saveLabel: 'Save 20%',
    saveAmountYear: '~£9.50/year',
  },
  family: {
    name: 'Family',
    monthly: {
      perMonth: 9.99,
      display: '£9.99',
      amountPence: 999,
      priceId: import.meta.env.VITE_STRIPE_FAMILY_MONTHLY,
    },
    annual: {
      perMonth: 7.99,
      perMonthDisplay: '£7.99',
      perYear: 95.88,
      perYearDisplay: '£95.88',
      amountPence: 9588,
      priceId: import.meta.env.VITE_STRIPE_FAMILY_YEARLY,
    },
    saveLabel: 'Save 20%',
    saveAmountYear: '£24/year',
  },
}

// Site-wide entry teaser = cheapest plan's monthly price.
export const PRICE_TEASER = 'from £3.99/month'

// Full one-line descriptions (Step 4 copy), reused wherever a plan price is shown.
export const PRICE_LINE = {
  essential: '£3.99/month — or £3.19/month billed annually (£38.28/year). Save 20%.',
  family:    '£9.99/month — or £7.99/month billed annually (£95.88/year). Save 20%.',
}
