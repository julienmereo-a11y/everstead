import React from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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

  // Redirect expired trial owners to the /trial-ended choice screen.
  // Skip: delegates (not on a trial), already on /trial-ended, mid-checkout.
  const isDelegateOnly = profile.role === 'delegate'
  const onTrialEndedPage = location.pathname === '/trial-ended'
  if (!isDelegateOnly && !onTrialEndedPage && !isCheckout) {
    const trialExpiredByStatus = profile.subscription_status === 'trial_expired'
    const trialExpiredByDate   =
      profile.subscription_status === 'trialing' &&
      profile.trial_ends_at &&
      new Date(profile.trial_ends_at) < new Date()
    if (trialExpiredByStatus || trialExpiredByDate) {
      return <Navigate to="/trial-ended" replace />
    }
  }

  return children
}
