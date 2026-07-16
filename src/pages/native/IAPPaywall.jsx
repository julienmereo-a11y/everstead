import React, { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { PRICING } from '../../config/pricing'
import { isNative } from '../../lib/platform'

// Native-only paywall for the iOS app. Apple requires subscriptions bought
// from inside the app to go through IAP — Stripe checkout (used on web) can't
// run here. See src/config/pricing.js for the revenueCatIdentifier per plan,
// and api/revenuecat/webhook.js for how a purchase syncs back to `profiles`.
// Advisor is intentionally absent — it's B2B/custom-priced and stays web-only.

const PLAN_FEATURES = {
  essential: ['1 secure vault', '1 trusted contact', '1GB document storage'],
  family:    ['2 secure vaults', 'Up to 10 trusted contacts', '25GB document storage', 'Personal messages'],
}

export default function IAPPaywall() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const [offerings, setOfferings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState(null)
  const [annual, setAnnual] = useState(true)

  useEffect(() => {
    if (!isNative()) return // web renders this component briefly before redirecting to /pricing
    (async () => {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')
        const { current } = await Purchases.getOfferings()
        setOfferings(current)
      } catch (err) {
        setError('Unable to load plans. Please check your connection and try again.')
        console.error('getOfferings error:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const findPackage = (planId) => {
    const cycle = annual ? 'annual' : 'monthly'
    const identifier = PRICING[planId]?.[cycle]?.revenueCatIdentifier
    return offerings?.availablePackages?.find(pkg => pkg.identifier === identifier || pkg.product?.identifier === identifier)
  }

  const handlePurchase = async (planId) => {
    const pkg = findPackage(planId)
    if (!pkg) {
      setError('That plan is not available right now. Please try again shortly.')
      return
    }
    setError(null)
    setPurchasing(planId)
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      await Purchases.purchasePackage({ aPackage: pkg })
      // The RevenueCat webhook updates `profiles` asynchronously — refresh now
      // and let ProtectedRoute re-check once it lands, same tolerance the
      // existing Stripe checkout success flow already has.
      await refreshProfile()
      navigate('/dashboard')
    } catch (err) {
      if (!err?.userCancelled) {
        setError('Purchase could not be completed. Please try again.')
        console.error('purchasePackage error:', err)
      }
    } finally {
      setPurchasing(null)
    }
  }

  const handleRestore = async () => {
    setError(null)
    setRestoring(true)
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      const { customerInfo } = await Purchases.restorePurchases()
      const hasEntitlement = Object.keys(customerInfo?.entitlements?.active || {}).length > 0
      if (hasEntitlement) {
        await refreshProfile()
        navigate('/dashboard')
      } else {
        setError('No previous purchase was found for this Apple ID. If you subscribed on the web, sign in with the same account instead.')
      }
    } catch (err) {
      setError('Restore failed. Please try again.')
      console.error('restorePurchases error:', err)
    } finally {
      setRestoring(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-navy-800 rounded-full animate-spin" />
      </div>
    )
  }
  // This paywall only makes sense inside the native iOS app (Apple IAP). Anyone
  // reaching it on the web (direct link, bookmark) belongs on the Stripe pricing page.
  if (!isNative()) return <Navigate to="/pricing" replace />
  if (!user) return <Navigate to="/login" replace />
  // Already entitled (Stripe or a previous Apple purchase) — nothing to sell.
  const alreadySubscribed =
    !!profile?.stripe_subscription_id ||
    !!profile?.stripe_customer_id ||
    profile?.legacy_trial_access === true ||
    ['trialing', 'active', 'cancelling', 'past_due'].includes(profile?.subscription_status)
  if (alreadySubscribed) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-stone-50 pt-16 pb-12 px-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy-600 mb-3">Choose your plan</p>
          <h1 className="font-display text-3xl font-light text-navy-950">Everstead</h1>
        </div>

        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-full bg-navy-950 p-1.5 gap-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 text-sm font-semibold rounded-full transition-colors ${!annual ? 'bg-white text-navy-900' : 'text-stone-400'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 text-sm font-semibold rounded-full transition-colors ${annual ? 'bg-white text-navy-900' : 'text-stone-400'}`}
            >
              Yearly
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-stone-200 border-t-navy-800 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {['essential', 'family'].map((planId) => {
              const pkg = findPackage(planId)
              const isHighlight = planId === 'family'
              return (
                <div
                  key={planId}
                  className={`rounded-[2rem] border p-6 ${isHighlight ? 'border-navy-300 bg-navy-950 text-white' : 'border-stone-200 bg-white text-navy-950'}`}
                >
                  <p className={`text-sm font-semibold ${isHighlight ? 'text-sage-300' : 'text-navy-700'}`}>
                    {PRICING[planId].name}
                  </p>
                  <p className="mt-3 font-display text-3xl font-light">
                    {pkg?.product?.priceString || (annual
                      ? PRICING[planId].annual.perYearDisplay
                      : PRICING[planId].monthly.display)}
                    <span className={`ml-1 text-sm font-normal ${isHighlight ? 'text-stone-400' : 'text-stone-500'}`}>
                      {annual ? '/year' : '/month'}
                    </span>
                  </p>
                  <ul className="mt-5 space-y-2">
                    {PLAN_FEATURES[planId].map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${isHighlight ? 'text-sage-300' : 'text-sage-700'}`} />
                        <span className={isHighlight ? 'text-stone-200' : 'text-stone-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePurchase(planId)}
                    disabled={purchasing !== null || !pkg}
                    className="btn-aurora w-full mt-6 rounded-full px-5 py-3.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {purchasing === planId ? 'Processing…' : `Subscribe to ${PRICING[planId].name}`}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

        <button
          onClick={handleRestore}
          disabled={restoring}
          className="mt-6 w-full text-center text-sm font-medium text-navy-700 disabled:opacity-50"
        >
          {restoring ? 'Restoring…' : 'Restore Purchases'}
        </button>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-stone-400">
          <ShieldCheck size={14} /> Payment handled securely by the App Store
        </p>
      </div>
    </div>
  )
}
