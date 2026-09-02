import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, ArrowRight, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { PLANS, redirectToCustomerPortal } from '../lib/stripe'
import { marketPricing } from '../config/pricing'
import { supabase } from '../lib/supabase'
import i18n from '../i18n'
import enTrialEnded from '../i18n/locales/en/trialEnded.json'
import frTrialEnded from '../i18n/locales/fr/trialEnded.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later, re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'trialEnded', enTrialEnded)
i18n.addResourceBundle('fr', 'trialEnded', frTrialEnded)

// Fallback: open Stripe Checkout with no trial if portal isn't available
async function goToCheckout({ priceId, userEmail, customerId }) {
  const res = await fetch('/api/stripe/create-checkout', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ priceId, userEmail, customerId, trialPeriodDays: 0 }),
  })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}))
    throw new Error(error || i18n.t('trialEnded:errors.checkoutFailed'))
  }
  const { url } = await res.json()
  window.location.href = url
}

export default function TrialEnded() {
  const navigate = useNavigate()
  const { t } = useTranslation('trialEnded')
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
  const firstName    = profile.full_name?.split(' ')[0] ?? t('fallbackName')
  // Everstead+ is priced per market; the retired Essential plan only ever existed in pounds.
  const market       = marketPricing(i18n.language)
  const priceLabel   = plan === 'family'
    ? t('priceLabel', { name: planConfig.name, monthly: market.money(market.family.monthly.perMonth), yearly: market.money(market.family.annual.perMonth) })
    : t('priceLabel', { name: planConfig.name, monthly: `£${planConfig.monthly}`, yearly: `£${planConfig.yearly}` })
  const dateLocale   = i18n.language === 'fr' ? 'fr-FR' : 'en-GB'

  // Deletion imminence
  const scheduledDeletionAt = profile.scheduled_deletion_at
    ? new Date(profile.scheduled_deletion_at)
    : null
  const daysUntilDeletion = scheduledDeletionAt
    ? Math.ceil((scheduledDeletionAt.getTime() - Date.now()) / 86400000)
    : null
  const deletionImminent  = daysUntilDeletion !== null && daysUntilDeletion <= 7
  const deletionDateStr   = scheduledDeletionAt
    ? scheduledDeletionAt.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const handleContinue = async () => {
    setError(null)
    setBusy('continue')
    try {
      // If user already has a Stripe customer (card on file), send to portal
      // to update payment method — no new checkout needed.
      if (profile.stripe_customer_id) {
        await redirectToCustomerPortal()
        return
      }
      // Fallback for legacy users without a card on file
      const priceId = planConfig.priceIds?.[billingCycle]
      if (!priceId) throw new Error(t('errors.priceNotFound'))
      await goToCheckout({
        priceId,
        userEmail:  user.email,
        customerId: undefined,
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
        throw new Error(d.error || t('errors.deleteFailed'))
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
                <strong>{t('deletionBanner.strong', { date: deletionDateStr })}</strong>
                {' '}{t('deletionBanner.rest')}
              </div>
            )}

            <h1 className="font-display text-2xl font-light text-navy-950 text-center mb-2">
              {t('heading', { name: firstName })}
            </h1>
            <p className="text-stone-500 text-sm text-center mb-8 leading-relaxed">
              {deletionImminent
                ? t('subtitleImminent', { date: deletionDateStr })
                : t('subtitle')
              }
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-6">

              {/* Option 1 — Update payment method */}
              <div className="aurora-field aurora-dim rounded-2xl p-6 text-white">
                <p className="font-semibold text-base mb-0.5">{t('updateCard.title')}</p>
                <p className="text-navy-300 text-sm mb-5">{priceLabel}</p>
                <button
                  onClick={handleContinue}
                  disabled={!!busy}
                  className="btn-aurora flex items-center gap-2 text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
                >
                  {busy === 'continue'
                    ? <><Loader2 size={14} className="animate-spin" /> {t('updateCard.opening')}</>
                    : <>{t('updateCard.cta')} <ArrowRight size={14} /></>
                  }
                </button>
              </div>

            </div>

            {/* Option 3 — Delete (low prominence) */}
            <div className="text-center">
              <button
                onClick={() => setStep('confirm-delete')}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-2"
              >
                {t('deleteLink')}
              </button>
            </div>
          </>
        )}

        {step === 'confirm-delete' && (
          <>
            <h1 className="font-display text-2xl font-light text-navy-950 text-center mb-2">
              {t('confirm.heading')}
            </h1>
            <p className="text-stone-500 text-sm text-center mb-8 leading-relaxed max-w-sm mx-auto">
              {t('confirm.body')}
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
                className="w-full py-3 rounded-full border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy === 'delete'
                  ? <><Loader2 size={14} className="animate-spin" /> {t('confirm.scheduling')}</>
                  : t('confirm.cta')
                }
              </button>
              <button
                onClick={() => { setStep('choose'); setError(null) }}
                className="w-full py-3 rounded-full bg-navy-800 text-white text-sm font-semibold hover:bg-navy-700 transition-colors"
              >
                {t('confirm.back')}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
