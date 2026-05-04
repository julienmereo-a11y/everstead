import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, ArrowRight, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PLANS } from '../lib/stripe'
import { supabase } from '../lib/supabase'

async function goToCheckout({ priceId, userEmail, customerId }) {
  const res = await fetch('/api/stripe/create-checkout', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ priceId, userEmail, customerId, trialPeriodDays: 0 }),
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || 'Failed to start checkout')
  }
  const { url } = await res.json()
  window.location.href = url
}

export default function TrialEnded() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  const [step, setStep]         = useState('choose') // choose | confirm-delete
  const [busy, setBusy]         = useState(null)     // 'continue' | 'downgrade' | 'delete'
  const [error, setError]       = useState(null)

  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={28} className="text-navy-400 animate-spin" />
      </div>
    )
  }

  const plan         = profile.plan || 'essential'
  const billingCycle = profile.billing_cycle || 'yearly'
  const planConfig   = PLANS[plan] ?? PLANS.essential
  const firstName    = profile.full_name?.split(' ')[0] ?? 'there'
  const canDowngrade = plan === 'family' || plan === 'advisor'
  const priceLabel   = `${planConfig.name} plan — £${planConfig.monthly}/mo or £${planConfig.yearly}/mo yearly`

  // Deletion imminence
  const scheduledDeletionAt = profile.scheduled_deletion_at
    ? new Date(profile.scheduled_deletion_at)
    : null
  const daysUntilDeletion = scheduledDeletionAt
    ? Math.ceil((scheduledDeletionAt.getTime() - Date.now()) / 86400000)
    : null
  const deletionImminent  = daysUntilDeletion !== null && daysUntilDeletion <= 7
  const deletionDateStr   = scheduledDeletionAt
    ? scheduledDeletionAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const handleContinue = async () => {
    setError(null)
    setBusy('continue')
    try {
      const priceId = planConfig.priceIds?.[billingCycle]
      if (!priceId) throw new Error('Price not found. Please contact support.')
      await goToCheckout({
        priceId,
        userEmail:  user.email,
        customerId: profile.stripe_customer_id || undefined,
      })
    } catch (err) {
      setError(err.message)
      setBusy(null)
    }
  }

  const handleDowngrade = async () => {
    setError(null)
    setBusy('downgrade')
    try {
      const priceId = PLANS.essential.priceIds.yearly
      if (!priceId) throw new Error('Price not found. Please contact support.')
      await goToCheckout({
        priceId,
        userEmail:  user.email,
        customerId: profile.stripe_customer_id || undefined,
      })
    } catch (err) {
      setError(err.message)
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    setError(null)
    setBusy('delete')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/auth/delete-account', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Could not schedule deletion. Please contact support.')
      }
      await signOut()
      navigate('/', { replace: true, state: { deletionScheduled: true } })
    } catch (err) {
      setError(err.message)
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">

        <div className="flex justify-center mb-10">
          <img src="/everstead-logo-dark.png" alt="Everstead" className="h-10 w-auto" />
        </div>

        {step === 'choose' && (
          <>
            {deletionImminent && (
              <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 text-center leading-relaxed">
                <strong>Your account will be permanently deleted on {deletionDateStr}.</strong>
                {' '}This is your last chance to save your plan.
              </div>
            )}

            <h1 className="font-display text-2xl font-light text-navy-950 text-center mb-2">
              Your free trial has ended, {firstName}.
            </h1>
            <p className="text-stone-500 text-sm text-center mb-8 leading-relaxed">
              {deletionImminent
                ? `Your account and all your data will be deleted on ${deletionDateStr}. Subscribe now to keep everything.`
                : "We've kept your plan safe. Choose how you'd like to continue."
              }
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-6">

              {/* Option 1 — Continue */}
              <div className="bg-navy-800 rounded-2xl p-6 text-white">
                <p className="font-semibold text-base mb-0.5">Continue with Everstead</p>
                <p className="text-navy-300 text-sm mb-5">{priceLabel}</p>
                <button
                  onClick={handleContinue}
                  disabled={!!busy}
                  className="flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50"
                >
                  {busy === 'continue'
                    ? <><Loader2 size={14} className="animate-spin" /> Setting up payment…</>
                    : <>Add payment details <ArrowRight size={14} /></>
                  }
                </button>
              </div>

              {/* Option 2 — Downgrade (family/advisor only) */}
              {canDowngrade && (
                <div className="bg-white border border-stone-200 rounded-2xl p-6">
                  <p className="font-semibold text-navy-900 text-base mb-0.5">Downgrade to Essential</p>
                  <p className="text-stone-500 text-sm mb-5">
                    Keep your plan at £{PLANS.essential.yearly}/mo billed yearly — fewer features, same security
                  </p>
                  <button
                    onClick={handleDowngrade}
                    disabled={!!busy}
                    className="flex items-center gap-2 border border-navy-200 text-navy-800 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-50"
                  >
                    {busy === 'downgrade'
                      ? <><Loader2 size={14} className="animate-spin" /> Setting up payment…</>
                      : <>Switch to Essential <ArrowRight size={14} /></>
                    }
                  </button>
                </div>
              )}

            </div>

            {/* Option 3 — Delete (low prominence) */}
            <div className="text-center">
              <button
                onClick={() => setStep('confirm-delete')}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-2"
              >
                Delete my account
              </button>
            </div>
          </>
        )}

        {step === 'confirm-delete' && (
          <>
            <h1 className="font-display text-2xl font-light text-navy-950 text-center mb-2">
              Are you sure?
            </h1>
            <p className="text-stone-500 text-sm text-center mb-8 leading-relaxed max-w-sm mx-auto">
              This will permanently delete your plan, documents, and trusted people. Your data will be removed within 30 days. This cannot be undone.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleDelete}
                disabled={!!busy}
                className="w-full py-3 rounded-xl border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy === 'delete'
                  ? <><Loader2 size={14} className="animate-spin" /> Scheduling deletion…</>
                  : 'Yes, delete my account'
                }
              </button>
              <button
                onClick={() => { setStep('choose'); setError(null) }}
                className="w-full py-3 rounded-xl bg-navy-800 text-white text-sm font-semibold hover:bg-navy-700 transition-colors"
              >
                Go back
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
