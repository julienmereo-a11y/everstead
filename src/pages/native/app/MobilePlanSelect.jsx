import React, { useState } from 'react'
import { PRICING, planLabel } from '../../../config/pricing'
import { isNative, isIOS } from '../../../lib/platform'
import { haptic } from '../../../lib/haptics'
import { CheckIcon } from './icons'

// Upgrade to Everstead+ — reached from inside the app (Settings, or a nudge when a
// free user hits a limit), NOT a gate on entry. Everyone lands in the app on the
// free "Everstead" tier; this screen is the single paid consumer upgrade.
// On iOS the purchase goes through Apple IAP via RevenueCat (App Store rules); in
// web preview / demo it simulates success so the flow can be reviewed. Styled to
// match the dark auth/onboarding screens.
//
// Everstead+ is the internal `family` plan (label only — see config/pricing.js).
// Adviser / "Everstead Pro" is sold B2B on the web and never appears here.
const PLAN_KEY = 'family'

// What Everstead+ adds over the free tier (free is capped at 1 account / 1
// document / 1 trusted contact — see FREE_LIMITS).
const FEATURES = [
  'Unlimited accounts & documents',
  'Up to 10 trusted contacts',
  'Personal messages & sealed letters',
  '25GB secure storage',
]

export default function MobilePlanSelect({ onSubscribed, onBack, demo }) {
  const [annual, setAnnual] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const p = PRICING[PLAN_KEY]
  const name = planLabel(PLAN_KEY)
  // Always lead with the monthly figure; on yearly, show the annual total small.
  const price = annual
    ? { big: p.annual.perMonthDisplay, unit: '/month', note: `${p.annual.perYearDisplay} billed annually` }
    : { big: p.monthly.display, unit: '/month', note: 'billed monthly' }

  const subscribe = async () => {
    setError(null)
    // Web preview / demo: no App Store — simulate a successful subscription.
    if (demo || !isNative()) { onSubscribed?.(PLAN_KEY); return }
    // RevenueCat is configured for iOS only so far (see docs/android-launch-checklist.md) —
    // calling an unconfigured SDK on Android would just throw a generic error.
    if (!isIOS()) { setError('Purchases are not available on Android yet — you can upgrade at everstead.care.'); return }
    setBusy(true)
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      const { current } = await Purchases.getOfferings()
      const identifier = p[annual ? 'annual' : 'monthly'].revenueCatIdentifier
      const pkg = current?.availablePackages?.find(x => x.identifier === identifier || x.product?.identifier === identifier)
      if (!pkg) { setError('That plan is not available right now. Please try again shortly.'); return }
      await Purchases.purchasePackage({ aPackage: pkg })
      haptic.success() // subscription started — the biggest moment in the app
      onSubscribed?.(PLAN_KEY)
    } catch (err) {
      // The Capacitor bridge rejects with (message, code) — userCancelled never
      // arrives on iOS. Code '1' is PURCHASE_CANCELLED: the user tapped Cancel
      // on the Apple sheet, which must not read as a failure.
      const cancelled = err?.userCancelled || err?.code === '1' || /cancel/i.test(err?.message || '')
      if (!cancelled) { setError('Purchase could not be completed. Please try again.'); console.error('purchase error:', err) }
    } finally { setBusy(false) }
  }

  const restore = async () => {
    setError(null)
    if (demo || !isNative()) { onSubscribed?.('restore'); return }
    if (!isIOS()) { setError('Purchases are not available on Android yet — you can upgrade at everstead.care.'); return }
    setBusy(true)
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      const { customerInfo } = await Purchases.restorePurchases()
      if (Object.keys(customerInfo?.entitlements?.active || {}).length > 0) { haptic.success(); onSubscribed?.('restore') }
      else setError('No previous purchase was found for this Apple ID.')
    } catch { setError('Restore failed. Please try again.') } finally { setBusy(false) }
  }

  return (
    <div className="ob grain" style={{ overflowY: 'auto' }}>
      <div className="hero-glow" />
      {onBack && <button className="skip" onClick={onBack} disabled={busy}>Back</button>}

      <div className="f1 fx col posrel">
        <div className="eyebrow eyebrow-sage">{name}</div>
        <h1 className="obh" style={{ fontSize: 30 }}>Unlock everything.</h1>
        <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', lineHeight: 1.5 }}>
          You're on Everstead, free. Upgrade to {name} to lift the limits and open every part of your plan — with a 14-day free trial.
        </p>

        <div className="fx" style={{ margin: '22px 0 4px', justifyContent: 'center' }}>
          <div className="fx" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: 4, gap: 2 }}>
            {[['Monthly', false], ['Yearly · save 20%', true]].map(([label, val]) => (
              <button key={label} onClick={() => setAnnual(val)}
                style={{ border: 0, cursor: 'pointer', borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  background: annual === val ? '#fafaf9' : 'transparent', color: annual === val ? 'var(--color-navy-900)' : 'rgba(255,255,255,0.6)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-dark" style={{ padding: 18, marginTop: 18, border: '1px solid var(--color-sage-400)' }}>
          <div className="fx jb ac">
            <div className="ftit" style={{ fontSize: 16 }}>{name}</div>
            <span className="chip" style={{ background: 'var(--color-sage-500)', color: '#fff' }}>Everything unlocked</span>
          </div>
          <div className="fx" style={{ alignItems: 'flex-end', gap: 6, marginTop: 8 }}>
            <span className="serif" style={{ fontSize: 30, fontWeight: 600, color: '#fafaf9' }}>{price.big}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', paddingBottom: 5 }}>{price.unit}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{price.note}</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>
            {FEATURES.map(f => (
              <li key={f} className="fx" style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span className="ck on" style={{ width: 18, height: 18 }}><CheckIcon on /></span>
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)' }}>{f}</span>
              </li>
            ))}
          </ul>
          <button className={`btn w100 ${busy ? 'dis' : ''}`} style={{ marginTop: 16 }} onClick={subscribe}>
            {busy ? 'Starting…' : `Start free trial · ${name}`}
          </button>
        </div>

        {error && <p style={{ color: '#fca5a5', fontSize: 12.5, marginTop: 14, textAlign: 'center' }}>{error}</p>}

        <button className="linkbtn" style={{ marginTop: 16 }} onClick={restore} disabled={busy}>
          Restore a previous purchase
        </button>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center', margin: '6px 0 0', lineHeight: 1.5 }}>
          Billed through the App Store after your trial. Manage or cancel anytime in Settings.
        </p>
      </div>
    </div>
  )
}
