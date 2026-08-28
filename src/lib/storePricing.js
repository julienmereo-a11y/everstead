import { useEffect, useState } from 'react'
import { isNative } from './platform'
import { PRICING } from '../config/pricing'

// The prices Apple and Google will ACTUALLY charge.
//
// On mobile the billing currency comes from the store account's country, not
// from the app language: a French speaker with a UK Google account is billed in
// GBP, a Briton living in France with a French account is billed in EUR. The
// app used to show its own catalogue (£ from PRICING, € from PRICING_FR keyed
// on language), which could differ from what the store charges. Both stores
// require the displayed price to be the billed price (App Store 3.1.2(c), Play
// Payments policy), so the store's own localised priceString wins wherever we
// can get it, and the catalogue is only a pre-load fallback.
//
// Cached at module scope: getOfferings() is a network call, and Home and the
// paywall both need the answer.
const PLAN_KEY = 'family'
let cache = null
let inflight = null

async function fetchStorePrices() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor')
  const { current } = await Purchases.getOfferings()
  // Google product identifiers arrive as "subscription_id:base_plan_id";
  // strip the suffix so one identifier matches both stores.
  const find = (id) => current?.availablePackages?.find(x =>
    x.identifier === id || String(x.product?.identifier || '').split(':')[0] === id)
  const p = PRICING[PLAN_KEY]
  const monthly = find(p.monthly.revenueCatIdentifier)?.product
  const yearly  = find(p.annual.revenueCatIdentifier)?.product
  if (!monthly?.priceString && !yearly?.priceString) return null
  return {
    monthly:      monthly?.priceString ?? null,
    yearly:       yearly?.priceString ?? null,
    currencyCode: monthly?.currencyCode ?? yearly?.currencyCode ?? null,
    // Per-month equivalent of the yearly plan, formatted in the STORE's own
    // currency rather than ours. Falls back to null when the store gives us a
    // price but no machine-readable amount to divide.
    yearlyPerMonth: (() => {
      const amount = yearly?.price
      const code = yearly?.currencyCode
      if (typeof amount !== 'number' || !code) return null
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: code })
          .format(amount / 12)
      } catch { return null }
    })(),
  }
}

/**
 * Store prices, or null while loading / on the web / if the store is silent.
 * Never throws: a paywall that cannot render a price is worse than one showing
 * the catalogue.
 */
export function useStorePrices() {
  const [prices, setPrices] = useState(cache)

  useEffect(() => {
    if (cache || !isNative()) return
    let on = true
    inflight ??= fetchStorePrices().catch(() => null)
    inflight.then(result => {
      if (result) cache = result
      if (on && result) setPrices(result)
    })
    return () => { on = false }
  }, [])

  return prices
}
