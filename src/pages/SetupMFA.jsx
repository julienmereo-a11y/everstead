import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ShieldCheck, Smartphone, ArrowRight, Loader2, Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import i18n from '../i18n'
import enSetupMfa from '../i18n/locales/en/setupMfa.json'
import frSetupMfa from '../i18n/locales/fr/setupMfa.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later: re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'setupMfa', enSetupMfa)
i18n.addResourceBundle('fr', 'setupMfa', frSetupMfa)

export default function SetupMFA() {
  const navigate = useNavigate()
  const { t } = useTranslation('setupMfa')

  const [step, setStep]         = useState('loading') // loading | enroll | verify
  const [qrCode, setQrCode]     = useState('')
  const [secret, setSecret]     = useState('')
  const [factorId, setFactorId] = useState('')
  const [digits, setDigits]     = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [copied, setCopied]     = useState(false)
  const digitRefs               = useRef([])

  const code = digits.join('')

  useEffect(() => { startEnrollment() }, [])

  const startEnrollment = async () => {
    setStep('loading')
    setError(null)

    try {
      // Clean up any stale unverified TOTP factors.
      // Supabase rejects re-enrollment if one already exists in pending state.
      try {
        const { data: existing } = await supabase.auth.mfa.listFactors()
        const allFactors = [
          ...(existing?.totp ?? []),
          ...(existing?.all  ?? []),
        ]
        const pending = allFactors.filter(f => f.status === 'unverified')
        for (const f of pending) {
          await supabase.auth.mfa.unenroll({ factorId: f.id })
        }
      } catch {
        // non-fatal — proceed
      }

      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType:   'totp',
        issuer:       'Everstead',
        friendlyName: 'Authenticator App',
      })

      if (err) {
        const msg = err.message || err.error_description || JSON.stringify(err)
        setError(msg)
        setStep('enroll')
        return
      }

      // Defensive: check the QR code actually came back
      const qr = data?.totp?.qr_code
      const sec = data?.totp?.secret
      if (!qr) {
        setError(t('errors.noQr'))
        setStep('enroll')
        return
      }

      setQrCode(qr)
      setSecret(sec ?? '')
      setFactorId(data.id)
      setStep('enroll')

    } catch (thrown) {
      // Catches JS exceptions (e.g. supabase.auth.mfa not available)
      const msg = thrown?.message || String(thrown)
      setError(t('errors.unexpected', { message: msg }))
      setStep('enroll')
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) digitRefs.current[i + 1]?.focus()
  }

  const handleDigitKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) digitRefs.current[i - 1]?.focus()
  }

  const handleDigitPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...digits]
    text.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    digitRefs.current[Math.min(text.length, 5)]?.focus()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (vErr) throw vErr
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message ?? t('errors.incorrectCode'))
      setDigits(['', '', '', '', '', ''])
      digitRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          <div className="flex justify-center mb-8">
            <img src="/everstead-logo-dark.png" alt="Everstead" className="h-9 w-auto" />
          </div>

          {step === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-sm text-stone-500">{t('loading')}</p>
            </div>
          )}

          {step === 'enroll' && (
            <>
              <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center mb-5">
                <ShieldCheck size={22} className="text-sage-700" />
              </div>

              <h1 className="font-display text-2xl font-light text-navy-950 mb-2">
                {t('enroll.title')}
              </h1>
              <p className="text-stone-500 text-sm mb-6 leading-relaxed">
                {t('enroll.subtitle')}
              </p>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-700">
                  {error}
                  <button
                    onClick={startEnrollment}
                    className="block mt-2 text-xs font-semibold text-red-700 underline hover:text-red-900"
                  >
                    {t('enroll.tryAgain')}
                  </button>
                </div>
              )}

              {/* QR code — Supabase returns raw SVG XML, not a data URL */}
              {qrCode && (
                <div className="flex justify-center mb-5">
                  <div className="bg-white border border-stone-200 rounded-xl p-4 inline-block w-[200px] h-[200px] flex items-center justify-center">
                    {qrCode.startsWith('<') ? (
                      // Raw SVG string
                      <div
                        style={{ width: 168, height: 168 }}
                        dangerouslySetInnerHTML={{ __html: qrCode }}
                      />
                    ) : (
                      // data: URL
                      <img src={qrCode} alt={t('enroll.qrAlt')} width={168} height={168} />
                    )}
                  </div>
                </div>
              )}

              {/* Manual entry */}
              {secret && (
                <div className="mb-6">
                  <p className="text-xs text-stone-500 mb-1.5">{t('enroll.manualLabel')}</p>
                  <div className="flex items-center gap-2 bg-stone-100 rounded-lg px-3 py-2">
                    <code className="flex-1 text-xs text-navy-800 font-mono tracking-widest break-all">{secret}</code>
                    <button onClick={copySecret} className="flex-shrink-0 text-stone-400 hover:text-navy-700 transition-colors">
                      {copied ? <Check size={14} className="text-sage-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setStep('verify'); setTimeout(() => digitRefs.current[0]?.focus(), 50) }}
                className="btn-aurora w-full text-white font-semibold text-sm py-3 rounded-full transition-colors flex items-center justify-center gap-2"
              >
                {t('enroll.continue')} <ArrowRight size={16} />
              </button>

              <div className="mt-4 flex items-start gap-2 text-xs text-stone-400 leading-relaxed">
                <Smartphone size={14} className="flex-shrink-0 mt-0.5" />
                <span>{t('enroll.recommendedApps')}</span>
              </div>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center mb-5">
                <ShieldCheck size={22} className="text-sage-700" />
              </div>

              <h1 className="font-display text-2xl font-light text-navy-950 mb-2">
                {t('verify.title')}
              </h1>
              <p className="text-stone-500 text-sm mb-6 leading-relaxed">
                {t('verify.subtitle')}
              </p>

              <form onSubmit={handleVerify} className="space-y-5">
                <div className="flex gap-2 justify-between" onPaste={handleDigitPaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => digitRefs.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1}
                      value={d}
                      onChange={e => handleDigit(i, e.target.value)}
                      onKeyDown={e => handleDigitKey(i, e)}
                      autoFocus={i === 0}
                      className="w-12 h-14 text-center text-2xl font-semibold text-navy-900 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors bg-white"
                    />
                  ))}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-700">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="btn-aurora w-full text-white font-semibold text-sm py-3 rounded-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> {t('verify.verifying')}</> : <>{t('verify.confirm')} <ArrowRight size={16} /></>}
                </button>

                <p className="text-center text-xs text-stone-400">
                  <button type="button" onClick={() => setStep('enroll')} className="text-navy-700 font-medium hover:text-navy-900">
                    {t('verify.back')}
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}
