import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n'
import { setPasscode, setBiometricEnabled, markSetupDone, biometricAvailable, getLockState, verifyPasscode } from '../../../components/native/appLock'
import { haptic } from '../../../lib/haptics'
import { FaceIdIcon } from './icons'

// First-run security setup, shown once after a user first signs in / creates an
// account on the native app (see MobileApp). They choose a numeric passcode and,
// if the device supports it, whether to enable Face ID / Touch ID as a shortcut.
// Skippable — they can turn it on later in Settings. Rendered inside `.evst-app`,
// so it reuses the dark onboarding styles.
export default function SecuritySetup({ onDone }) {
  const { t } = useTranslation('mobile')
  const [step, setStep] = useState('pin')      // 'current' | 'pin' | 'confirm' | 'bio'
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [current, setCurrent] = useState('')
  const [changed, setChanged] = useState(false) // did we actually set a new passcode?
  const [error, setError] = useState(null)
  const [bioAvail, setBioAvail] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    biometricAvailable().then(setBioAvail)
    // CHANGING an existing passcode requires the current one first — holding an
    // unlocked phone must not be enough to silently replace the lock.
    getLockState().then(st => { if (st.hasPin) setStep('current') }).catch(() => {})
  }, [])

  const skip = async () => { setBusy(true); await markSetupDone(); onDone(changed) }

  const submitCurrent = async () => {
    if (current.length < 4) return
    if (await verifyPasscode(current)) { setError(null); setStep('pin') }
    else { haptic.error(); setError(t('security.wrongCurrent')); setCurrent('') }
  }

  const submitPin = () => {
    if (pin.length < 4) { setError(t('security.tooShort')); return }
    setError(null); setStep('confirm')
  }

  const submitConfirm = async () => {
    if (confirm !== pin) { haptic.error(); setError(t('security.noMatch')); setConfirm(''); return }
    setError(null); setBusy(true)
    try {
      await setPasscode(pin)
      await markSetupDone()
      setChanged(true)
      haptic.success() // passcode is set, a meaningful completion
      if (bioAvail) { setStep('bio'); setBusy(false) }
      else { onDone(true) }
    } catch { setError(t('security.saveFailed')); setBusy(false) }
  }

  const finishBio = async (enable) => {
    setBusy(true)
    try { await setBiometricEnabled(enable) } catch { /* non-fatal */ }
    onDone(true)
  }

  const pinInput = (value, onChange, autoFocus, onEnter) => (
    <input
      className="inp inp-dark" type="password" inputMode="numeric" maxLength={6}
      value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      onKeyDown={e => { if (e.key === 'Enter') onEnter?.() }}
      placeholder="••••••" autoFocus={autoFocus}
      style={{ letterSpacing: '0.5em', fontSize: 24, textAlign: 'center', paddingLeft: 24 }}
    />
  )

  return (
    <div className="ob grain">
      <div className="hero-glow" />
      <img className="oblogo" src="/logo-v2-white.png" alt="Everstead" />

      <div className="f1 fx col jc posrel">
        <div className="eyebrow eyebrow-sage">{t('security.eyebrow')}</div>

        {step === 'current' && (
          <>
            <h1 className="obh" style={{ fontSize: 32 }}>{t('security.currentTitle')}</h1>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', lineHeight: 1.5 }}>
              {t('security.currentSub')}
            </p>
            <label className="flabel flabel-dark" style={{ marginTop: 24 }}>{t('security.currentLabel')}</label>
            {pinInput(current, setCurrent, true, submitCurrent)}
            {error && <p style={{ color: '#fca5a5', fontSize: 12.5, marginTop: 12 }}>{error}</p>}
          </>
        )}

        {step === 'pin' && (
          <>
            <h1 className="obh" style={{ fontSize: 32 }}>{t('security.setTitle')}</h1>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', lineHeight: 1.5 }}>
              {t('security.setSub')}
            </p>
            <label className="flabel flabel-dark" style={{ marginTop: 24 }}>{t('security.setLabel')}</label>
            {pinInput(pin, setPin, true, submitPin)}
            {error && <p style={{ color: '#fca5a5', fontSize: 12.5, marginTop: 12 }}>{error}</p>}
          </>
        )}

        {step === 'confirm' && (
          <>
            <h1 className="obh" style={{ fontSize: 32 }}>{t('security.confirmTitle')}</h1>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', lineHeight: 1.5 }}>
              {t('security.confirmSub')}
            </p>
            <label className="flabel flabel-dark" style={{ marginTop: 24 }}>{t('security.confirmLabel')}</label>
            {pinInput(confirm, setConfirm, true, submitConfirm)}
            {error && <p style={{ color: '#fca5a5', fontSize: 12.5, marginTop: 12 }}>{error}</p>}
          </>
        )}

        {step === 'bio' && (
          <>
            <span className="ficon" style={{ marginBottom: 18 }}><FaceIdIcon s={26} /></span>
            <h1 className="obh" style={{ fontSize: 32 }}>{t('security.bioTitle')}</h1>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', lineHeight: 1.5 }}>
              {t('security.bioSub')}
            </p>
          </>
        )}
      </div>

      <div className="posrel">
        {step === 'current' && (
          <>
            <button className={`btn btn-light w100 ${current.length >= 4 ? '' : 'dis'}`} onClick={submitCurrent}>{t('common.continue')}</button>
            <button className="linkbtn" onClick={skip} disabled={busy}>{t('common.cancel')}</button>
          </>
        )}
        {step === 'pin' && (
          <>
            <button className={`btn btn-light w100 ${pin.length >= 4 ? '' : 'dis'}`} onClick={submitPin}>{t('common.continue')}</button>
            <button className="linkbtn" onClick={skip} disabled={busy}>{t('security.skipForNow')}</button>
          </>
        )}
        {step === 'confirm' && (
          <>
            <button className={`btn btn-light w100 ${confirm.length >= 4 && !busy ? '' : 'dis'}`} onClick={submitConfirm}>
              {busy ? t('common.saving') : t('security.setPasscode')}
            </button>
            <button className="linkbtn" onClick={() => { setStep('pin'); setConfirm(''); setError(null) }}>{t('common.back')}</button>
          </>
        )}
        {step === 'bio' && (
          <>
            <button className={`btn btn-light w100 ${busy ? 'dis' : ''}`} onClick={() => finishBio(true)}>{t('security.enableFaceId')}</button>
            <button className="linkbtn" onClick={() => finishBio(false)} disabled={busy}>{t('security.notNowPasscode')}</button>
          </>
        )}
      </div>
    </div>
  )
}
