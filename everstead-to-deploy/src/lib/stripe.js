import { loadStripe } from '@stripe/stripe-js'

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY

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
    monthly: 10,
    yearly:   8,
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
export async function redirectToCheckout({ plan, billingCycle, userEmail, customerId }) {
  const priceId = PLANS[plan]?.priceIds?.[billingCycle]
  if (!priceId) throw new Error(`No price ID for plan=${plan} cycle=${billingCycle}`)

  const stripe = await getStripe()
  if (!stripe) throw new Error('Stripe not initialised')

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/dashboard?checkout=success`,
    cancelUrl:  `${window.location.origin}/pricing`,
    customerEmail: customerId ? undefined : userEmail,
    customer: customerId || undefined,
    trialPeriodDays: 14,
  })

  if (error) throw error
}

// ─────────────────────────────────────────────────────────────
// PORTAL — redirect to Stripe Customer Portal
// ─────────────────────────────────────────────────────────────
export async function redirectToCustomerPortal(customerId) {
  // This needs a backend call — see api/stripe-portal.js
  const res = await fetch('/api/stripe-portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId }),
  })
  const { url } = await res.json()
  window.location.href = url
}
