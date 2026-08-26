// Settings: profile, plan and billing, referrals, security, data export and
// account deletion. The three small controls it owns (billing portal, referral
// link, biometric lock) live here because nothing else uses them.
//
import React, { useState } from 'react'
import { PLAN_LABELS, PRICING, planLabel } from '../../../config/pricing'
import i18n from '../../../i18n'
import { PLANS, redirectToCustomerPortal } from '../../../lib/stripe'
import { Field, SectionShell, input, primaryBtn, secondaryBtn } from '../../dashboard/ui'
import { AlertCircle, Bell, Check, Copy, CreditCard, Download, ExternalLink, Gift, Loader2, Lock, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
export function ManageBillingButton() {
  const { t } = useTranslation('dashboard')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState(null)
  const handleClick = async () => {
    setLoading(true); setErr(null)
    try { await redirectToCustomerPortal() }
    catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }
  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-200 rounded-full px-3 py-2 hover:bg-navy-50 transition-colors disabled:opacity-50"
      >
        <ExternalLink size={13} /> {loading ? t('settings.billing.opening') : t('settings.billing.manage')}
      </button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// REFERRAL LINK BOX
// ─────────────────────────────────────────────────────────────

export function ReferralLinkBox({ referralCode }) {
  const { t } = useTranslation('dashboard')
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/get-started?ref=${referralCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-600 font-mono truncate">
        {link}
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold btn-aurora text-white px-3.5 py-2.5 rounded-full hover:bg-navy-800 transition-colors"
      >
        {copied ? <><Check size={13} />{t('settings.referral.copied')}</> : <><Copy size={13} />{t('settings.referral.copy')}</>}
      </button>
    </div>
  )
}

// Native-only (iOS) biometric unlock. On the web build this is a no-op — the full
// implementation depends on the native modules (lib/platform, components/native)
// that belong to the mobile app work and are not part of this web branch.

export function BiometricLockSetting() {
  return null
}

export function SettingsSection({ profile, isDemo, updateProfile, refreshProfile, onUpgrade, onDeleteAccount, upgradeError }) {
  const { t } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  // Everstead+ is the self-serve upgrade for Free and grandfathered Essential users.
  // Essential is retired, so it only appears for someone already on it (never offered
  // to Free or new users).
  // `id` values are the stored plan keys, plan names come from PLAN_LABELS untranslated.
  const PLANS = [
    ...(profile.plan === 'essential'
      ? [{ id: 'essential', name: PLAN_LABELS.essential, tier: 1, monthly: PRICING.essential.monthly.perMonth, yearly: PRICING.essential.annual.perMonth, desc: t('settings.plans.essential') }]
      : []),
    { id: 'family', name: PLAN_LABELS.family, tier: 2, monthly: PRICING.family.monthly.perMonth, yearly: PRICING.family.annual.perMonth, desc: t('settings.plans.family') },
  ]
  const PLAN_TIERS = { free: 0, essential: 1, family: 2, advisor: 3 }
  const currentTier   = PLAN_TIERS[profile.plan] ?? 0
  // Free users have no Stripe subscription, so billing-portal and cancel actions must
  // not show for them (they'd hit Stripe with no customer/subscription and error).
  const isFreeTier    = profile.plan === 'free'
  // Local overrides — set immediately after API calls so the UI doesn't wait on refreshProfile
  const [localSubStatus, setLocalSubStatus] = useState(null)
  const [localCancelAt,  setLocalCancelAt]  = useState(null)

  // Effective values: local override wins, falls back to profile from Supabase
  const effectiveStatus = localSubStatus ?? profile.subscription_status
  const effectiveCancelAt = localCancelAt ?? profile.cancel_at

  const isTrialing    = effectiveStatus === 'trialing'
  const isCancelling  = effectiveStatus === 'cancelling'
  const isCancelled   = ['cancelled', 'canceled'].includes(effectiveStatus)

  // Format the access-end date
  const cancelAtDate = effectiveCancelAt
    ? new Date(effectiveCancelAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const [billingCycle, setBillingCycle] = useState('yearly')
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling]       = useState(false)
  const [cancelError, setCancelError]     = useState(null)

  // Data export
  const [exporting, setExporting]       = useState(false)
  const [exportDone, setExportDone]     = useState(false)
  const [exportError, setExportError]   = useState(null)
  const [reauthOpen, setReauthOpen]     = useState(false)
  const [reauthPassword, setReauthPassword] = useState('')
  const [reauthError, setReauthError]   = useState(null)
  const [reauthBusy, setReauthBusy]     = useState(false)

  // Exporting the whole vault is sensitive, so re-verify the password first —
  // a hijacked open session can't silently download everything.
  const requestExport = () => { setReauthError(null); setReauthPassword(''); setReauthOpen(true) }
  const confirmReauthAndExport = async () => {
    setReauthBusy(true); setReauthError(null)
    try {
      const { supabase: sb } = await import('../../../lib/supabase')
      const { data: { user } } = await sb.auth.getUser()
      if (!user?.email) { setReauthError(t('settings.data.reauthNoAccount')); setReauthBusy(false); return }
      const { error } = await sb.auth.signInWithPassword({ email: user.email, password: reauthPassword })
      if (error) { setReauthError(t('settings.data.reauthWrongPassword')); setReauthBusy(false); return }
      setReauthBusy(false); setReauthOpen(false); setReauthPassword('')
      await handleExport()
    } catch {
      setReauthError(t('settings.data.reauthFailed')); setReauthBusy(false)
    }
  }

  const handleExport = async () => {
    if (isDemo) return
    setExporting(true)
    setExportDone(false)
    setExportError(null)
    try {
      const { supabase: sb } = await import('../../../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/data/export', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || t('settings.data.exportFailedStatus', { status: res.status }))
      }
      const blob = await res.blob()
      const date = new Date().toISOString().split('T')[0]
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `everstead-export-${date}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportDone(true)
    } catch (err) {
      setExportError(err.message || t('settings.data.exportFailed'))
    } finally {
      setExporting(false)
    }
  }
  const [reactivating, setReactivating]   = useState(false)
  const [reactivateError, setReactivateError] = useState(null)

  // Account deletion
  const [deleteStep, setDeleteStep]       = useState(0) // 0=idle, 1=confirm
  const [deleteChecks, setDeleteChecks]   = useState({ data: false, confirm: false })
  const [deleting, setDeleting]           = useState(false)
  const [deleteError, setDeleteError]     = useState(null)

  const handleCancelSubscription = async () => {
    if (isDemo) {
      setLocalSubStatus('cancelling')
      setCancelConfirm(false)
      return
    }
    setCancelling(true)
    setCancelError(null)
    try {
      const { supabase: sb } = await import('../../../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/stripe/cancel-subscription', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscriptionId: profile.stripe_subscription_id,
          userId:         profile.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('settings.subscription.cancelFailed'))
      // Immediately update local state so UI reflects cancellation without waiting on refreshProfile
      setLocalSubStatus('cancelling')
      setLocalCancelAt(data.cancelAt ?? null)
      setCancelConfirm(false)
      // Also sync profile in context in the background
      refreshProfile?.()
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const handleReactivate = async () => {
    if (isDemo) {
      setLocalSubStatus('active')
      setLocalCancelAt(null)
      return
    }
    setReactivating(true)
    setReactivateError(null)
    try {
      const { supabase: sb } = await import('../../../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/stripe/cancel-subscription', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscriptionId: profile.stripe_subscription_id,
          userId:         profile.id,
          action:         'reactivate',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('settings.subscription.reactivateFailed'))
      // Immediately update local state
      setLocalSubStatus('active')
      setLocalCancelAt(null)
      refreshProfile?.()
    } catch (err) {
      setReactivateError(err.message)
    } finally {
      setReactivating(false)
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDeleteAccount()
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  const [profileForm, setProfileForm] = useState({
    full_name:   profile.full_name   ?? '',
    phone:       profile.phone       ?? '',
    date_of_birth: profile.date_of_birth ?? '',
    address_line1: profile.address_line1 ?? '',
    address_line2: profile.address_line2 ?? '',
    city:        profile.city        ?? '',
    postcode:    profile.postcode    ?? '',
    country:     profile.country     ?? 'United Kingdom',
  })

  // Notification preferences
  const [notifForm, setNotifForm] = useState({
    notify_birthday:        profile.notify_birthday        ?? true,
    notify_annual_review:   profile.notify_annual_review   ?? true,
    notify_trial_reminders: profile.notify_trial_reminders ?? true,
    notify_reengagement:    profile.notify_reengagement    ?? true,
    notify_document_expiry: profile.notify_document_expiry ?? true,
    notify_vault_nudges:    profile.notify_vault_nudges    ?? true,
  })
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved,  setNotifSaved]  = useState(false)

  const handleNotifSave = async () => {
    if (isDemo) { setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000); return }
    setNotifSaving(true)
    try { await updateProfile(notifForm); setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2500) }
    catch {}
    finally { setNotifSaving(false) }
  }

  // AI features master switch (default on). Persists immediately on toggle.
  const [aiEnabled, setAiEnabled] = useState(profile.ai_features_enabled !== false)
  const [aiSaving, setAiSaving]   = useState(false)
  const toggleAi = async () => {
    const next = !aiEnabled
    setAiEnabled(next)
    if (isDemo) return
    setAiSaving(true)
    try { await updateProfile({ ai_features_enabled: next }) }
    catch { setAiEnabled(!next) } // revert on failure
    finally { setAiSaving(false) }
  }
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)

  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg,    setPwMsg]    = useState(null)
  const [profileError, setProfileError] = useState(null)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (isDemo) { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000); return }
    setProfileSaving(true)
    try { await updateProfile(profileForm); setProfileSaved(true); setProfileError(null); setTimeout(() => setProfileSaved(false), 2500) }
    catch (err) { setProfileError(err.message ?? t('settings.profile.saveFailed')) }
    finally { setProfileSaving(false) }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'error', text: t('settings.password.mismatch') }); return }
    if (isDemo) { setPwMsg({ type: 'ok', text: t('settings.password.demo') }); return }
    setPwSaving(true)
    try {
      const { supabase } = await import('../../../lib/supabase')
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      setPwMsg({ type: 'ok', text: t('settings.password.updated') })
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <SectionShell title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <div className="space-y-6">

        {/* ── Profile details ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-5 flex items-center gap-2">
            <Users size={15} className="text-navy-600" /> {t('settings.profile.heading')}
          </h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('settings.profile.fullName')}>
                <input className={input} value={profileForm.full_name}
                  onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder={t('settings.profile.fullNamePlaceholder')} />
              </Field>
              <Field label={t('settings.profile.email')}>
                <input className={`${input} bg-stone-50 cursor-not-allowed`} value={profile.email} disabled
                  title={t('settings.profile.emailTitle')} />
              </Field>
              <Field label={t('settings.profile.phone')}>
                <input className={input} value={profileForm.phone} type="tel"
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder={t('settings.profile.phonePlaceholder')} />
              </Field>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('settings.profile.dob')}</label>
                <input
                  type="date"
                  className={input}
                  value={profileForm.date_of_birth}
                  onChange={e => setProfileForm(p => ({ ...p, date_of_birth: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-stone-400">{t('settings.profile.dobHint')}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">{t('settings.profile.addressHeading')}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t('settings.profile.address1')}>
                  <input className={input} value={profileForm.address_line1}
                    onChange={e => setProfileForm(p => ({ ...p, address_line1: e.target.value }))}
                    placeholder={t('settings.profile.address1Placeholder')} />
                </Field>
                <Field label={t('settings.profile.address2')}>
                  <input className={input} value={profileForm.address_line2}
                    onChange={e => setProfileForm(p => ({ ...p, address_line2: e.target.value }))}
                    placeholder={t('settings.profile.address2Placeholder')} />
                </Field>
                <Field label={t('settings.profile.city')}>
                  <input className={input} value={profileForm.city}
                    onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}
                    placeholder={t('settings.profile.cityPlaceholder')} />
                </Field>
                <Field label={t('settings.profile.postcode')}>
                  <input className={input} value={profileForm.postcode}
                    onChange={e => setProfileForm(p => ({ ...p, postcode: e.target.value }))}
                    placeholder={t('settings.profile.postcodePlaceholder')} />
                </Field>
                <Field label={t('settings.profile.country')}>
                  <input className={input} value={profileForm.country}
                    onChange={e => setProfileForm(p => ({ ...p, country: e.target.value }))}
                    placeholder={t('settings.profile.countryPlaceholder')} />
                </Field>
              </div>
            </div>

            {profileError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileError}</p>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={profileSaving} className={primaryBtn}>
                {profileSaving ? t('settings.saving') : profileSaved ? t('settings.saved') : t('settings.saveChanges')}
              </button>
              {profileSaved && <span className="text-xs text-emerald-600 font-medium">{t('settings.profile.updated')}</span>}
            </div>
          </form>
        </div>

        {/* ── Password ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-5 flex items-center gap-2">
            <Lock size={15} className="text-navy-600" /> {t('settings.password.heading')}
          </h2>
          <form onSubmit={handlePasswordSave} className="space-y-4 max-w-sm">
            <Field label={t('settings.password.new')}>
              <input type="password" className={input} value={pwForm.next}
                onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                placeholder="••••••••" minLength={8} required />
            </Field>
            <Field label={t('settings.password.confirm')}>
              <input type="password" className={input} value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="••••••••" minLength={8} required />
            </Field>
            {pwMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {pwMsg.text}
              </p>
            )}
            <button type="submit" disabled={pwSaving} className={primaryBtn}>
              {pwSaving ? t('settings.password.updating') : t('settings.password.submit')}
            </button>
          </form>
        </div>

        {/* ── Two-factor authentication ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <ShieldCheck size={15} className="text-navy-600" /> {t('settings.mfa.heading')}
          </h2>
          <p className="text-xs text-stone-400 mb-4 leading-relaxed">
            {t('settings.mfa.body')}
          </p>
          <a
            href="/setup-mfa"
            className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-200 rounded-full px-3 py-2 hover:bg-navy-50 transition-colors"
          >
            <ShieldCheck size={13} /> {t('settings.mfa.cta')}
          </a>
        </div>

        {/* ── Biometric unlock (native iOS app only) ── */}
        <BiometricLockSetting />

        {/* ── Subscription ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <CreditCard size={15} className="text-navy-600" /> {t('settings.subscription.heading')}
          </h2>
          <p className="text-xs text-stone-400 mb-5">
            <Trans t={t} i18nKey="settings.subscription.currentlyOn" values={{ plan: planLabel(profile.plan) }} components={{ b: <span className="font-semibold text-navy-800" /> }} />
            {isTrialing    && <span className="ml-2 text-amber-600 font-medium">{t('settings.subscription.trialActive')}</span>}
            {isCancelling  && <span className="ml-2 text-amber-600 font-medium">{t('settings.subscription.cancellationScheduled')}</span>}
            {isCancelled   && <span className="ml-2 text-stone-400 font-medium">{t('settings.subscription.planEnded')}</span>}
            {!isTrialing && !isCancelling && !isCancelled && profile.current_period_end && (
              <span className="ml-2 text-stone-400">
                {t('settings.subscription.nextBilling', { date: new Date(profile.current_period_end).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) })}
              </span>
            )}
          </p>

          {/* ── State: CANCELLING — show access-end notice, hide plan cards ── */}
          {isCancelling && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 leading-relaxed">
                  <p className="font-semibold mb-1">{t('settings.subscription.cancelledTitle')}</p>
                  <p>
                    {cancelAtDate
                      ? <Trans t={t} i18nKey="settings.subscription.cancelledBodyWithDate" values={{ date: cancelAtDate }} components={{ b: <strong /> }} />
                      : t('settings.subscription.cancelledBody')}
                  </p>
                </div>
              </div>

              {/* Reactivate */}
              <div>
                <p className="text-xs text-stone-400 mb-2">{t('settings.subscription.changedMind')}</p>
                {reactivateError && (
                  <p className="text-xs text-red-600 mb-2">{reactivateError}</p>
                )}
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="inline-flex items-center gap-2 text-sm font-semibold btn-aurora text-white px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
                >
                  {reactivating ? <><Loader2 size={13} className="animate-spin" />{t('settings.subscription.reactivating')}</> : t('settings.subscription.reactivate')}
                </button>
              </div>
            </div>
          )}

          {/* ── State: CANCELLED / CHURNED ── */}
          {isCancelled && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-4">
                <AlertCircle size={16} className="text-stone-400 shrink-0 mt-0.5" />
                <div className="text-sm text-stone-600 leading-relaxed">
                  <p className="font-semibold mb-1">{t('settings.subscription.endedTitle')}</p>
                  <p>{t('settings.subscription.endedBody')}</p>
                </div>
              </div>
              <button
                onClick={() => onUpgrade(profile.plan === 'essential' ? 'essential' : 'family', 'yearly')}
                className="inline-flex items-center gap-2 text-sm font-semibold btn-aurora text-white px-4 py-2 rounded-full hover:bg-navy-700 transition-colors"
              >
                {t('settings.subscription.reactivateEverstead')}
              </button>
            </div>
          )}

          {/* ── State: TRIALING or ACTIVE — show plan cards ── */}
          {!isCancelling && !isCancelled && (
            <>
              {/* Billing cycle toggle */}
              <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 w-fit mb-4">
                {['monthly', 'yearly'].map(cycle => (
                  <button
                    key={cycle}
                    onClick={() => setBillingCycle(cycle)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${billingCycle === cycle ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    {/* cycle VALUES are stored on the subscription, only labels translate. */}
                    {cycle === 'monthly' ? t('settings.subscription.cycleMonthly') : t('settings.subscription.cycleYearly')}
                  </button>
                ))}
              </div>

              {upgradeError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{upgradeError}</div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {PLANS.map(plan => {
                  const isCurrent      = profile.plan === plan.id
                  const isHigher       = plan.tier > currentTier
                  const price          = billingCycle === 'yearly' ? plan.yearly : plan.monthly
                  const currentCycle   = profile.billing_cycle ?? 'monthly'
                  const wantsDiffCycle = isCurrent && !isTrialing && billingCycle !== currentCycle
                  return (
                    <div key={plan.id} className={`rounded-xl border p-4 flex flex-col ${isCurrent ? 'border-navy-400 bg-navy-50 ring-1 ring-navy-400' : 'border-stone-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-navy-950 text-sm">{plan.name}</p>
                        {isCurrent && <span className="text-xs bg-navy-800 text-white px-2 py-0.5 rounded-full">{t('settings.subscription.current')}</span>}
                      </div>
                      <p className="text-lg font-display font-light text-navy-950">
                        {t('settings.subscription.price', { price })}
                        {billingCycle === 'yearly' && <span className="text-xs text-stone-400 ml-1">{t('settings.subscription.billedAnnually')}</span>}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 leading-snug flex-1">{plan.desc}</p>
                      {isCurrent && isTrialing && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold btn-aurora text-white rounded-full py-1.5 hover:bg-navy-700 transition-colors"
                        >
                          {t('settings.subscription.activatePlan', { plan: plan.name })}
                        </button>
                      )}
                      {wantsDiffCycle && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold bg-sage-600 text-white rounded-full py-1.5 hover:bg-sage-700 transition-colors"
                        >
                          {billingCycle === 'yearly' ? t('settings.subscription.switchToYearly') : t('settings.subscription.switchToMonthly')}
                        </button>
                      )}
                      {!isCurrent && (
                        <button
                          onClick={() => onUpgrade(plan.id, billingCycle)}
                          className="mt-3 w-full text-xs font-semibold text-navy-700 border border-navy-200 rounded-lg py-1.5 hover:bg-navy-50 transition-colors"
                        >
                          {isHigher ? t('settings.subscription.upgradeTo', { plan: plan.name }) : t('settings.subscription.switchTo', { plan: plan.name })}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Manage billing — for paid subscribers only (free users have no billing) */}
              {!isTrialing && !isFreeTier && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-400 mb-2">{t('settings.subscription.portalHint')}</p>
                  <ManageBillingButton />
                </div>
              )}

              {/* Cancel subscription — hidden for free users (no subscription to cancel) */}
              {!isFreeTier && (
              <div className="mt-5 pt-4 border-t border-stone-100">
                {cancelConfirm ? (
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-3">
                    <p className="text-sm font-semibold text-navy-900">{t('settings.subscription.cancelConfirmTitle')}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      {t('settings.subscription.cancelConfirmBody')}
                    </p>
                    {cancelError && (
                      <p className="text-xs text-red-600">{cancelError}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => { setCancelConfirm(false); setCancelError(null) }}
                        className="flex-1 btn-aurora text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-navy-700 transition-colors"
                      >
                        {t('settings.subscription.keepPlan')}
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="flex-1 text-stone-500 text-sm font-medium px-4 py-2.5 rounded-full border border-stone-200 hover:border-stone-300 hover:text-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {cancelling
                          ? <><Loader2 size={13} className="animate-spin" />{t('settings.subscription.cancelling')}</>
                          : t('settings.subscription.confirmCancel')
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCancelConfirm(true); setCancelError(null) }}
                    className="text-xs text-stone-500 hover:text-red-600 transition-colors underline underline-offset-2"
                  >
                    {isTrialing ? t('settings.subscription.cancelTrial') : t('settings.subscription.cancelSubscription')}
                  </button>
                )}
              </div>
              )}
            </>
          )}
        </div>

        {/* ── Refer a friend — the extended-trial referral only makes sense once you're
               on a paid plan, so it's hidden for free users (who see the upgrade cards
               above instead). ── */}
        {!isFreeTier && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
              <Gift size={15} className="text-sage-600" /> {t('settings.referral.heading')}
            </h2>
            <p className="text-xs text-stone-400 mb-4">
              <Trans t={t} i18nKey="settings.referral.body" components={{ b: <span className="font-semibold text-navy-700" /> }} />
            </p>
            <ReferralLinkBox referralCode={profile.referral_code || profile.id} />
          </div>
        )}

        {/* ── AI features ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Sparkles size={15} className="text-navy-600" /> {t('settings.ai.heading')}
          </h2>
          <div className="flex items-start justify-between gap-4 mt-4">
            <p className="text-xs text-stone-500 leading-relaxed max-w-md">
              {t('settings.ai.body')}
            </p>
            <label className="relative shrink-0 cursor-pointer mt-0.5">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={aiEnabled}
                disabled={aiSaving}
                onChange={toggleAi}
              />
              <div className="w-11 h-6 rounded-full bg-stone-200 peer-checked:bg-navy-700 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
          <p className="text-xs text-stone-400 mt-3">
            <Trans
              t={t}
              i18nKey="settings.ai.status"
              values={{ state: aiEnabled ? t('settings.ai.on') : t('settings.ai.off') }}
              components={{ b: <span className={`font-semibold ${aiEnabled ? 'text-sage-700' : 'text-stone-600'}`} /> }}
            />
          </p>
        </div>

        {/* ── Notification preferences ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Bell size={15} className="text-navy-600" /> {t('settings.notifications.heading')}
          </h2>
          <p className="text-xs text-stone-400 mb-5 leading-relaxed">
            {t('settings.notifications.intro')}
          </p>
          <div className="space-y-3">
            {/* Keys are the notify_* profile column names, only the labels translate. */}
            {[
              'notify_birthday',
              'notify_annual_review',
              'notify_document_expiry',
              'notify_vault_nudges',
              'notify_reengagement',
              'notify_trial_reminders',
            ].map(key => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group py-1">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifForm[key]}
                    onChange={e => setNotifForm(p => ({ ...p, [key]: e.target.checked }))}
                  />
                  <div className="w-9 h-5 rounded-full bg-stone-200 peer-checked:bg-navy-700 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-900 leading-snug">{t(`settings.notifications.items.${key}.label`)}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{t(`settings.notifications.items.${key}.desc`)}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={handleNotifSave}
              disabled={notifSaving}
              className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {notifSaving ? t('settings.saving') : notifSaved ? t('settings.saved') : t('settings.notifications.save')}
            </button>
            {notifSaved && <span className="text-xs text-emerald-600 font-medium">{t('settings.notifications.updated')}</span>}
          </div>
        </div>

        {/* ── My Data ── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
            <Download size={15} className="text-navy-600" /> {t('settings.data.heading')}
          </h2>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            {t('settings.data.intro')}{' '}
            <Link to="/data-promise" className="text-navy-600 hover:text-navy-800 underline underline-offset-2">{t('settings.data.promiseLink')}</Link>
          </p>
          {isDemo ? (
            <p className="text-xs text-stone-400 italic">{t('settings.data.demoDisabled')}</p>
          ) : (
            <div className="space-y-3">
              <button
                onClick={requestExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <><Loader2 size={14} className="animate-spin" /> {t('settings.data.preparing')}</>
                ) : (
                  <><Download size={14} /> {t('settings.data.export')}</>
                )}
              </button>
              {reauthOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/40 p-4" onClick={() => !reauthBusy && setReauthOpen(false)}>
                  <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-navy-900 mb-1">{t('settings.data.reauthTitle')}</h3>
                    <p className="text-xs text-stone-500 mb-4">{t('settings.data.reauthBody')}</p>
                    <input
                      type="password" autoFocus value={reauthPassword}
                      onChange={e => setReauthPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && reauthPassword && !reauthBusy) confirmReauthAndExport() }}
                      placeholder={t('settings.data.passwordPlaceholder')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-navy-200"
                    />
                    {reauthError && <p className="text-xs text-red-600 mb-3">{reauthError}</p>}
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setReauthOpen(false)} disabled={reauthBusy} className="text-sm px-4 py-2 rounded-full text-stone-600 hover:bg-stone-100 disabled:opacity-50">{t('settings.cancel')}</button>
                      <button onClick={confirmReauthAndExport} disabled={reauthBusy || !reauthPassword} className="inline-flex items-center gap-2 btn-aurora text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50">
                        {reauthBusy ? <><Loader2 size={14} className="animate-spin" /> {t('settings.data.verifying')}</> : t('settings.data.confirmExport')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {exportDone && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {t('settings.data.exportDone')}
                </p>
              )}
              {exportError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{exportError}</p>
              )}
              <p className="text-xs text-stone-400">
                {t('settings.data.exportNote')}
              </p>
            </div>
          )}
        </div>

        {/* ── Danger zone ── */}
        <div className="bg-white border border-red-100 rounded-2xl p-6">
          <h2 className="font-semibold text-red-700 text-sm mb-2">{t('settings.danger.heading')}</h2>

          {isDemo ? (
            <p className="text-xs text-stone-400 italic">{t('settings.danger.demoDisabled')}</p>
          ) : deleteStep === 0 ? (
            <>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                {t('settings.danger.intro')}
              </p>
              <button
                onClick={() => setDeleteStep(1)}
                className="text-xs font-semibold text-red-600 border border-red-200 rounded-full px-4 py-2 hover:bg-red-50 transition-colors"
              >
                {t('settings.danger.start')}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-red-800">{t('settings.danger.confirmTitle')}</p>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={deleteChecks.data}
                  onChange={e => setDeleteChecks(p => ({ ...p, data: e.target.checked }))}
                  className="mt-0.5 accent-red-600"
                />
                <span className="text-xs text-stone-700 leading-relaxed">
                  {t('settings.danger.checkData')}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={deleteChecks.confirm}
                  onChange={e => setDeleteChecks(p => ({ ...p, confirm: e.target.checked }))}
                  className="mt-0.5 accent-red-600"
                />
                <span className="text-xs text-stone-700 leading-relaxed">
                  <Trans t={t} i18nKey="settings.danger.checkPermanent" components={{ b: <strong /> }} />
                </span>
              </label>

              {deleteError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleConfirmDelete}
                  disabled={!deleteChecks.data || !deleteChecks.confirm || deleting}
                  className="text-xs font-semibold bg-red-600 text-white rounded-full px-4 py-2 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? t('settings.danger.deleting') : t('settings.danger.confirmDelete')}
                </button>
                <button
                  onClick={() => { setDeleteStep(0); setDeleteChecks({ data: false, confirm: false }); setDeleteError(null) }}
                  className={secondaryBtn}
                >
                  {t('settings.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// LIFE EVENT PROMPT MODAL
// ─────────────────────────────────────────────────────────────
