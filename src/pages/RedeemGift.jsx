import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, CheckCircle2, Gift as GiftIcon, Eye, EyeOff } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { supabase } from '../lib/supabase'
import i18n from '../i18n'
import enRedeemGift from '../i18n/locales/en/redeemGift.json'
import frRedeemGift from '../i18n/locales/fr/redeemGift.json'
import { planLabel } from '../config/pricing'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later: re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'redeemGift', enRedeemGift)
i18n.addResourceBundle('fr', 'redeemGift', frRedeemGift)

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition-colors'

// 'essential' retained so any gift codes bought before Essential was retired still
// display correctly on redemption.
const PLAN_DESC_KEYS = {
  essential: 'plans.essential',
  family:    'plans.family',
}

// Submitted country values stay in English in every locale (stored on the
// profile row) — only the visible option labels are translated.
const COUNTRY_OPTIONS = [
  { value: 'United Kingdom', key: 'unitedKingdom' },
  { value: 'United States',  key: 'unitedStates' },
  { value: 'France',         key: 'france' },
  { value: 'Germany',        key: 'germany' },
  { value: 'Spain',          key: 'spain' },
  { value: 'Italy',          key: 'italy' },
  { value: 'Portugal',       key: 'portugal' },
  { value: 'Netherlands',    key: 'netherlands' },
  { value: 'Belgium',        key: 'belgium' },
  { value: 'Switzerland',    key: 'switzerland' },
  { value: 'Sweden',         key: 'sweden' },
  { value: 'Norway',         key: 'norway' },
  { value: 'Denmark',        key: 'denmark' },
  { value: 'Ireland',        key: 'ireland' },
  { value: 'Australia',      key: 'australia' },
  { value: 'Canada',         key: 'canada' },
  { value: 'New Zealand',    key: 'newZealand' },
  { value: 'South Africa',   key: 'southAfrica' },
  { value: 'India',          key: 'india' },
  { value: 'Singapore',      key: 'singapore' },
  { value: 'UAE',            key: 'uae' },
  { value: 'Brazil',         key: 'brazil' },
]

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function RedeemGift() {
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const { t, i18n }       = useTranslation('redeemGift')
  const code              = searchParams.get('code') || ''

  const [validating, setValidating]   = useState(true)
  const [giftInfo, setGiftInfo]       = useState(null)   // { plan, years, gifterName, status }
  const [validateError, setValidateError] = useState(null)

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [showPw, setShowPw]     = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    email:    '',
    password: '',
    country:  'United Kingdom',
  })

  // Validate the code on load
  useEffect(() => {
    if (!code) {
      setValidateError(t('errors.noCode'))
      setValidating(false)
      return
    }

    fetch(`/api/gift/validate?code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setValidateError(data.error)
        } else {
          setGiftInfo(data)
          // Pre-fill email if provided in gift
          setForm(v => ({ ...v, email: '' }))
        }
      })
      .catch(() => setValidateError(t('errors.validateFailed')))
      .finally(() => setValidating(false))
  }, [code])

  const handleChange = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Register account
      const registerRes = await fetch('/api/auth/delegate-register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mode:       'register',
          wantsTrial: false,
          email:      form.email,
          password:   form.password,
          name:       form.fullName,
          // Someone redeeming on /fr is a French speaker: record it so their
          // dashboard and every later email arrive in French (GetStarted does
          // the same; without this the gift redeemer defaulted to English).
          language:   i18n.language === 'fr' ? 'fr' : 'en',
        }),
      })

      if (!registerRes.ok) {
        const { error: regErr } = await registerRes.json().catch(() => ({}))
        throw new Error(regErr || t('errors.accountFailed'))
      }

      const { access_token, refresh_token } = await registerRes.json()
      await supabase.auth.setSession({ access_token, refresh_token })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error(t('errors.sessionError'))

      // 2. Save country to profile
      if (form.country) {
        await supabase.from('profiles').update({ country: form.country }).eq('id', user.id)
      }

      // 3. Redeem gift — send the session JWT; the server derives the account from it
      // (never a client-supplied userId).
      const redeemRes = await fetch('/api/gift/redeem', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
        body:    JSON.stringify({
          code,
          email:  form.email,
          name:   form.fullName,
        }),
      })

      if (!redeemRes.ok) {
        const { error: redeemErr } = await redeemRes.json().catch(() => ({}))
        throw new Error(redeemErr || t('errors.redeemFailed'))
      }

      navigate('/dashboard?gift=redeemed')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid =
    form.fullName.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.password.length >= 8

  const planName   = giftInfo ? planLabel(giftInfo.plan) : ''
  const yearsLabel = giftInfo ? t('card.years', { count: giftInfo.years }) : ''

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="bg-stone-50 pt-24 min-h-screen">

        {/* ── HERO ── */}
        <section className="py-16 lg:py-20 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('hero.eyebrow')}</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance">
              {t('hero.title')}
            </h1>
            <p className="mt-4 text-stone-300 text-base leading-relaxed max-w-md mx-auto">
              {t('hero.subtitle')}
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="max-w-md mx-auto px-6 lg:px-8">

            {/* Loading state */}
            {validating && (
              <div className="text-center py-12">
                <Loader2 size={28} className="animate-spin text-navy-600 mx-auto mb-3" />
                <p className="text-sm text-stone-500">{t('validating')}</p>
              </div>
            )}

            {/* Validation error */}
            {!validating && validateError && (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('invalid.title')}</h2>
                <p className="text-stone-500 text-sm leading-relaxed mb-6">{validateError}</p>
                <p className="text-sm text-stone-400">
                  {t('invalid.needHelp')}{' '}
                  <a href="mailto:support@everstead.care" className="text-navy-700 font-medium hover:text-navy-900">
                    {t('invalid.contactSupport')}
                  </a>
                </p>
              </div>
            )}

            {/* Valid code — show registration form */}
            {!validating && giftInfo && (
              <>
                {/* Gift info card */}
                <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <GiftIcon size={18} className="text-sage-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 mb-0.5">{t('card.label')}</p>
                      <p className="font-semibold text-navy-900">
                        {t('card.planLine', { plan: planName, years: yearsLabel })}
                      </p>
                      {giftInfo.gifterName && (
                        <p className="text-xs text-stone-500 mt-1">
                          <Trans
                            t={t}
                            i18nKey="card.from"
                            values={{ name: giftInfo.gifterName }}
                            components={{ highlight: <span className="font-medium text-stone-700" /> }}
                          />
                        </p>
                      )}
                      <p className="text-xs text-stone-400 mt-1">{PLAN_DESC_KEYS[giftInfo.plan] && t(PLAN_DESC_KEYS[giftInfo.plan])}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-sage-700 bg-sage-50 rounded-lg px-3 py-2">
                    <CheckCircle2 size={13} className="text-sage-500 flex-shrink-0" />
                    {t('card.noCard')}
                  </div>
                </div>

                <h2 className="font-display text-2xl font-light text-navy-950 mb-2">{t('form.title')}</h2>
                <p className="text-stone-500 text-sm mb-8">{t('form.subtitle')}</p>

                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 mb-6">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label={t('form.fullName')} required>
                    <input
                      type="text" name="fullName" value={form.fullName} onChange={handleChange}
                      placeholder={t('form.fullNamePlaceholder')} required autoFocus
                      className={inputClass}
                    />
                  </Field>

                  <Field label={t('form.email')} required>
                    <input
                      type="email" name="email" value={form.email} onChange={handleChange}
                      placeholder={t('form.emailPlaceholder')} required
                      className={inputClass}
                    />
                  </Field>

                  <Field label={t('form.password')} required>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                        placeholder={t('form.passwordPlaceholder')} required minLength={8}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button" onClick={() => setShowPw(v => !v)}
                        aria-label={showPw ? t('form.hidePassword') : t('form.showPassword')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>

                  <Field label={t('form.country')} required={false}>
                    <select name="country" value={form.country} onChange={handleChange} className={inputClass}>
                      {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{t(`countries.${c.key}`)}</option>)}
                    </select>
                  </Field>

                  <p className="text-xs text-stone-400 leading-relaxed pt-1">
                    <Trans
                      t={t}
                      i18nKey="form.terms"
                      components={{
                        terms:   <Link to="/terms" className="text-navy-700 underline underline-offset-2" target="_blank" />,
                        privacy: <Link to="/privacy" className="text-navy-700 underline underline-offset-2" target="_blank" />,
                      }}
                    />
                  </p>

                  <button
                    type="submit"
                    disabled={loading || !isFormValid}
                    className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={15} className="animate-spin" />{t('form.activating')}</>
                    ) : (
                      <><GiftIcon size={15} />{t('form.submit')}</>
                    )}
                  </button>
                </form>

                <p className="text-center mt-5 text-xs text-stone-400">
                  {t('form.haveAccount')}{' '}
                  <Link to="/login" className="text-navy-700 font-medium hover:text-navy-900">{t('form.signIn')}</Link>
                </p>
              </>
            )}

          </div>
        </section>

      </div>
    </>
  )
}
