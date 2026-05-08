import { loadStripe } from '@stripe/stripe-js'
import { createClient } from '@supabase/supabase-js'

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
export const PLANS = {
  essential: {
    name: 'Essential',
    monthly: 7,
    yearly:  5,
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_ESSENTIAL_MONTHLY,
      yearly:  import.meta.env.VITE_STRIPE_ESSENTIAL_YEARLY,
    },
    limits: {
      trustedPeople: 2,
      storageGb:     5,
      householdMembers: 1,
    },
  },
  family: {
    name: 'Family',
    monthly: 15,
    yearly:  12,
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_FAMILY_MONTHLY,
      yearly:  import.meta.env.VITE_STRIPE_FAMILY_YEARLY,
    },
    limits: {
      trustedPeople: 10,
      storageGb:     25,
      householdMembers: 5,
    },
  },
  advisor: {
    name: 'Advisor',
    monthly: 60,
    yearly:  48,
    priceIds: {
      monthly: import.meta.env.VITE_STRIPE_ADVISOR_MONTHLY,
      yearly:  import.meta.env.VITE_STRIPE_ADVISOR_YEARLY,
    },
    limits: {
      trustedPeople: 999,
      storageGb:     100,
      householdMembers: 999,
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
