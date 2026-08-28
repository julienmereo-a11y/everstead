import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n'
import { PRICING, planLabel, marketPricing } from '../../../config/pricing'
import { useStorePrices } from '../../../lib/storePricing'
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

// What Everstead+ adds over the free tier (free is capped at 5 accounts / 5
// documents / 3 trusted contacts — see FREE_LIMITS, the single client-side source).
const FEATURE_KEYS = ['paywall.f1', 'paywall.f2', 'paywall.f3', 'paywall.f4']

export default function MobilePlanSelect({ onSubscribed, onBack, demo }) {
  const { t, i18n } = useTranslation('mobile')
  const [annual, setAnnual] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // The store's OWN localised prices (shared with Home via lib/storePricing):
  // Apple and Google bill the buyer's storefront price, which is not
  // necessarily our GBP or EUR catalogue price.
  const storePrices = useStorePrices()

  // Guideline 3.1.2(c): the BILLED amount must be the most clear and conspicuous
  // price on the screen. Yearly bills the full-year figure, so that leads at
  // full size; the per-month equivalent is strictly subordinate.
  const fam = market.family
  const yearlyList  = fam.annual.perYearDisplay || fam.annual.display
  const monthlyList = fam.monthly.display
  const price = annual
    ? { big: storePrices?.yearly || yearlyList, unit: t('paywall.perYear'),
        note: storePrices?.yearlyPerMonth ? t('paywall.noteAnnual', { perMonth: storePrices.yearlyPerMonth })
          : storePrices?.yearly ? t('paywall.noteAnnualStore')
          : t('paywall.noteAnnual', { perMonth: fam.annual.perMonthDisplay }) }
    : { big: storePrices?.monthly || monthlyList, unit: t('paywall.perMonth'), note: t('paywall.noteMonthly') }

  const subscribe = async () => {
    setError(null)
    // Web preview / demo: no App Store — simulate a successful subscription.
    if (demo || !isNative()) { onSubscribed?.(PLAN_KEY); return }
    setBusy(true)
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      const { current } = await Purchases.getOfferings()
      const identifier = p[annual ? 'annual' : 'monthly'].revenueCatIdentifier
      // Google product identifiers arrive as "subscription_id:base_plan_id";
      // strip the suffix so one revenueCatIdentifier matches both stores.
      const pkg = current?.availablePackages?.find(x =>
        x.identifier === identifier ||
        String(x.product?.identifier || '').split(':')[0] === identifier)
      if (!pkg) { setError(t('paywall.planUnavailable')); return }
      await Purchases.purchasePackage({ aPackage: pkg })
      haptic.success() // subscription started, the biggest moment in the app
      onSubscribed?.(PLAN_KEY)
    } catch (err) {
      // The Capacitor bridge rejects with (message, code) — userCancelled never
      // arrives on iOS. Code '1' is PURCHASE_CANCELLED: the user tapped Cancel
      // on the Apple sheet, which must not read as a failure.
      const cancelled = err?.userCancelled || err?.code === '1' || /cancel/i.test(err?.message || '')
      if (!cancelled) { setError(t('paywall.purchaseFailed')); console.error('purchase error:', err) }
    } finally { setBusy(false) }
  }

  const restore = async () => {
    setError(null)
    if (demo || !isNative()) { onSubscribed?.('restore'); return }
    setBusy(true)
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      const { customerInfo } = await Purchases.restorePurchases()
      if (Object.keys(customerInfo?.entitlements?.active || {}).length > 0) { haptic.success(); onSubscribed?.('restore') }
      else setError(isIOS() ? t('paywall.noPurchaseApple') : t('paywall.noPurchaseGoogle'))
    } catch { setError(t('paywall.restoreFailed')) } finally { setBusy(false) }
  }

  return (
    <div className="ob grain" style={{ overflowY: 'auto' }}>
      <div className="hero-glow" />
      {onBack && <button className="skip" onClick={onBack} disabled={busy}>{t('common.back')}</button>}

      <div className="f1 fx col posrel">
        <div className="eyebrow eyebrow-sage">{name}</div>
        <h1 className="obh" style={{ fontSize: 30 }}>{t('paywall.title')}</h1>
        <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', lineHeight: 1.5 }}>
          {t('paywall.intro', { name })}
        </p>

        <div className="fx" style={{ margin: '22px 0 4px', justifyContent: 'center' }}>
          <div className="fx" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: 4, gap: 2 }}>
            {[[t('paywall.monthly'), false], [t('paywall.yearlySave'), true]].map(([label, val]) => (
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
            <span className="chip" style={{ background: 'var(--color-sage-500)', color: '#fff' }}>{t('paywall.everythingUnlocked')}</span>
          </div>
          <div className="fx" style={{ alignItems: 'flex-end', gap: 6, marginTop: 8 }}>
            <span className="serif" style={{ fontSize: 30, fontWeight: 600, color: '#fafaf9' }}>{price.big}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', paddingBottom: 5 }}>{price.unit}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{price.note}</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>
            {FEATURE_KEYS.map(k => (
              <li key={k} className="fx" style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span className="ck on" style={{ width: 18, height: 18 }}><CheckIcon on /></span>
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)' }}>{t(k)}</span>
              </li>
            ))}
          </ul>
          <button className={`btn w100 ${busy ? 'dis' : ''}`} style={{ marginTop: 16 }} onClick={subscribe}>
            {busy ? t('paywall.starting') : t('paywall.startTrial', { name })}
          </button>
        </div>

        {error && <p style={{ color: '#fca5a5', fontSize: 12.5, marginTop: 14, textAlign: 'center' }}>{error}</p>}

        <button className="linkbtn" style={{ marginTop: 16 }} onClick={restore} disabled={busy}>
          {t('paywall.restore')}
        </button>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', textAlign: 'center', margin: '6px 0 0', lineHeight: 1.5 }}>
          {isIOS() || !isNative() ? t('paywall.billedApple') : t('paywall.billedGoogle')}
        </p>
        {/* Guideline 3.1.2: auto-renewable subscription screens must link the
            Terms of Use and Privacy Policy. Opens in the system browser sheet. */}
        <p style={{ fontSize: 11, textAlign: 'center', margin: '8px 0 0', lineHeight: 1.5 }}>
          {[[t('paywall.terms'), i18n.language === 'fr' ? 'https://www.everstead.care/fr/terms' : 'https://www.everstead.care/terms'], [t('paywall.privacy'), i18n.language === 'fr' ? 'https://www.everstead.care/fr/privacy' : 'https://www.everstead.care/privacy']].map(([label, url], i) => (
            <React.Fragment key={label}>
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.35)' }}> · </span>}
              <a
                href={url}
                style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}
                onClick={async (e) => {
                  if (!isNative()) return // web preview: normal link
                  e.preventDefault()
                  try { const { Browser } = await import('@capacitor/browser'); await Browser.open({ url }) } catch {}
                }}
              >{label}</a>
            </React.Fragment>
          ))}
        </p>
      </div>
    </div>
  )
}
