import React from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isNative } from '../lib/platform'

const Spinner = () => (
  <div className="min-h-screen bg-stone-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
      <p className="text-sm text-stone-500">Loading your plan…</p>
    </div>
  </div>
)

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isDemo     = searchParams.get('demo') === 'true'
  const isCheckout = !!searchParams.get('checkout')

  if (isDemo) return children
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!profile) return <Spinner />

  const isDelegateOnly   = profile.role === 'delegate'
  const isAdviser        = profile.plan === 'advisor'   // advisers use the adviser portal, not B2C checkout
  const isFreeTier       = profile.plan === 'free'      // permanent free tier — always admitted, features capped in the DB
  const onTrialEndedPage = location.pathname === '/trial-ended'

  // Advisers belong in the adviser portal. Email/password login already routes them
  // there; this catches Google sign-in, which redirects to /dashboard before the plan
  // is known. Scoped to the dashboard landing so other protected routes aren't affected.
  if (isAdviser && location.pathname === '/dashboard') {
    return <Navigate to="/advisor-portal" replace />
  }

  // Redirect expired-trial users to the /trial-ended choice screen FIRST — before
  // the no-subscription bounce below. Otherwise a trial_expired user without their
  // own stripe_subscription_id (e.g. a removed/departed secondary family member)
  // would be wrongly sent to /get-started's card step instead of /trial-ended.
  if (!isDelegateOnly && !isAdviser && !isFreeTier && !onTrialEndedPage && !isCheckout) {
    const trialExpiredByStatus = profile.subscription_status === 'trial_expired'
    const trialExpiredByDate   =
      profile.subscription_status === 'trialing' &&
      profile.trial_ends_at &&
      new Date(profile.trial_ends_at) < new Date()
    if (trialExpiredByStatus || trialExpiredByDate) {
      return <Navigate to="/trial-ended" replace />
    }
  }

  // Gate: user created an account but never completed checkout (no subscription).
  // Delegates are excluded — they don't go through checkout.
  // Skip if already mid-checkout (?checkout=success) to avoid redirect loop.
  //
  // Require a real, card-confirmed checkout to access. What counts as proof:
  //   - stripe_subscription_id — written synchronously by create-subscription.js
  //     (Stripe trial or paid) AND by gift redemption, so paying/gifted/founding
  //     users are never bounced. This is the primary signal.
  //   - an active-ish subscription_status (active/cancelling/past_due) — post-payment
  //     states, also set by family invite-accept.
  //   - a grandfathered legacy trial.
  //   - Apple IAP (entitlement_source='apple_iap') never touches Stripe, so it gets
  //     its own check — including 'trialing', which RevenueCat's INITIAL_PURCHASE
  //     writes directly (no separate "trial started" step to race with).
  //
  // NOT accepted:
  //   - Bare stripe_customer_id. setup-intent.js creates the Stripe customer and
  //     writes stripe_customer_id the moment a user REACHES the card step — before
  //     they enter any card. The founding-offer resume flow reaches that step
  //     automatically. Treating a customer id as access let anyone who opened (or was
  //     auto-advanced to) the payment step walk straight into /dashboard without paying.
  //   - Bare 'trialing' status. The profile trigger stamps every new account
  //     'trialing', so a Google sign-in with no card would otherwise slip in.
  //     A genuine trial always carries a stripe_subscription_id (caught above).
  const hasSubscription =
    !!profile.stripe_subscription_id ||
    profile.legacy_trial_access === true ||
    ['active', 'cancelling', 'past_due'].includes(profile.subscription_status) ||
    (profile.entitlement_source === 'apple_iap' &&
      ['trialing', 'active', 'cancelling', 'past_due'].includes(profile.subscription_status))
  // Free-tier users are admitted with no subscription at all — their limits are
  // enforced in the database (free_tier_allows + restrictive INSERT policies), not by
  // the paywall. This intentionally does NOT re-open the bypass fixed earlier: access
  // here is keyed off plan='free' (a server-set, client-frozen column), never off a
  // bare stripe_customer_id or a self-settable status.
  if (!isDelegateOnly && !isAdviser && !isFreeTier && !isCheckout && !hasSubscription) {
    return isNative()
      ? <Navigate to="/native/paywall" replace />
      : <Navigate to="/get-started?resume=true" replace />
  }

  return children
}
