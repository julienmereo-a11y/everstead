import { loadStripe } from '@stripe/stripe-js'
import { createClient } from '@supabase/supabase-js'
import { PRICING, FREE_LIMITS } from '../config/pricing'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

export const getStripe = (() => {
  let stripePromise = null
  return () => {
    if (!stripePublicKey) return null
    if (!stripePromise) stripePromise = loadStripe(stripePublicKey)
    return stripePromise
  }
})()

// ─────────────────────────────────────────────────────────────
// PLAN CONFIG — single source of truth
// ─────────────────────────────────────────────────────────────
// Display amounts come from the pricing SSOT (src/config/pricing.js).
// `yearly` is the per-month-when-billed-annually figure (display only).
export const PLANS = {
  // Permanent free tier — no Stripe product, no price. Its caps mirror the
  // server-side authority (public.free_tier_allows + restrictive INSERT policies
  // on accounts / documents / trusted_people). Keep these in step with
  // FREE_LIMITS in config/pricing.js and the migration; the database is the
  // authority, this is only so the UI can gate before the insert is rejected.
  free: {
    name: 'Everstead',
    // The caps come from FREE_LIMITS so there is ONE client-side number per
    // resource. These are what isAtLimit() reads, and therefore what the web
    // dashboard AND the native apps gate on; they previously drifted from
    // FREE_LIMITS, which left the database allowing more than any client would.
    // The database (free_tier_allows) remains the real authority.
    limits: {
      trustedPeople: FREE_LIMITS.trustedPeople,
      storageGb: 1,
      householdMembers: 1,
      maxAccounts: FREE_LIMITS.accounts,
      maxDocuments: FREE_LIMITS.documents,
      instructionSets: null, // uncapped — onboarding/About Me/AI stay fully open on Free
      personalMessages: false,
    },
  },
  essential: {
    name: 'Essential',
    monthly: PRICING.essential.monthly.perMonth, // 3.99
    yearly:  PRICING.essential.annual.perMonth,  // 3.19 (/mo billed annually)
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_ESSENTIAL_MONTHLY,
      yearly:  import.meta.env.VITE_STRIPE_ESSENTIAL_YEARLY,
    },
    limits: {
      trustedPeople: 1,
      storageGb: 1,
      householdMembers: 1,
      maxAccounts: 10,
      maxDocuments: 10,
      instructionSets: 1,
      personalMessages: false,
    },
  },
  family: {
    name: 'Everstead+',
    monthly: PRICING.family.monthly.perMonth, // 9.99
    yearly:  PRICING.family.annual.perMonth,  // 7.99 (/mo billed annually)
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_FAMILY_MONTHLY,
      yearly:  import.meta.env.VITE_STRIPE_FAMILY_YEARLY,
    },
    limits: {
      trustedPeople: 10,
      storageGb: 25,
      householdMembers: 5,
      maxAccounts: null,
      maxDocuments: null,
      instructionSets: null,
      personalMessages: true,
    },
  },
  advisor: {
    name: 'Everstead Pro',
    monthly: 60,
    yearly:  48,
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_ADVISOR_MONTHLY,
      yearly:  import.meta.env.VITE_STRIPE_ADVISOR_YEARLY,
    },
    limits: {
      trustedPeople: 999,
      storageGb: 100,
      householdMembers: 999,
      maxAccounts: null,
      maxDocuments: null,
      instructionSets: null,
      personalMessages: true,
    },
  },
}

// ─────────────────────────────────────────────────────────────
// CHECKOUT — redirect to Stripe Checkout
// ─────────────────────────────────────────────────────────────
export async function redirectToCheckout({ plan, billingCycle, userEmail, customerId, trialEnd, trialPeriodDays, referredBy }) {
  const priceId = PLANS[plan]?.priceIds?.[billingCycle]
  if (!priceId) throw new Error(`No price ID found for plan "${plan}" (${billingCycle}). Check Vercel env vars.`)

  const res = await fetch('/api/stripe/create-checkout', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ priceId, userEmail, customerId, trialEnd, trialPeriodDays, plan, billingCycle, referredBy }),
  })

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || 'Failed to create checkout session')
  }

  const { url } = await res.json()
  window.location.href = url
}

// ─────────────────────────────────────────────────────────────
// PORTAL — redirect to Stripe Customer Portal
// ─────────────────────────────────────────────────────────────
export async function redirectToCustomerPortal() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const res = await fetch('/api/stripe-portal', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  })
  const { url } = await res.json()
  if (!url || !url.startsWith('https://billing.stripe.com/')) {
    throw new Error('Unexpected redirect URL from billing portal')
  }
  window.location.href = url
}
