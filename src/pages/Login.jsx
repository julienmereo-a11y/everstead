import React, { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isNative } from '../lib/platform'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </g>
    </svg>
  )
}

export default function Login() {
  const { t, i18n } = useTranslation('login')
  const QUOTES = t('leftPanel.quotes', { returnObjects: true })
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from          = location.state?.from?.pathname ?? null
  const redirectParam = searchParams.get('redirect') ?? null

  const [quoteIndex, setQuoteIndex]   = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false)
      setTimeout(() => {
        setQuoteIndex(i => (i + 1) % QUOTES.length)
        setQuoteVisible(true)
      }, 400)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  const [step, setStep]         = useState(1)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [digits, setDigits]     = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const digitRefs               = useRef([])

  const code = digits.join('')

  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) digitRefs.current[i + 1]?.focus()
  }

  const handleDigitKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus()
    }
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

  const handleGoogleSignIn = async () => {
    const dest = redirectParam
      ? `${window.location.origin}${redirectParam}`
      : `${window.location.origin}/dashboard`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: dest },
    })
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/mfa-send-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('errors.generic'))
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/mfa-verify-code', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('errors.generic'))

      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
      })
      // Never surface a raw Supabase SDK error here — it can leak internal
      // infrastructure detail (e.g. a stale cached bundle hitting a rotated API
      // key shows "Legacy API keys are disabled", which means nothing to a user
      // and looks alarming). Log it for us, show a safe generic message instead.
      if (sessionErr) {
        console.error('setSession error:', sessionErr)
        throw new Error(t('errors.generic'))
      }

      if (redirectParam) { navigate(redirectParam, { replace: true }); return }
      if (from) { navigate(from, { replace: true }); return }

      const userId    = sessionData?.user?.id
      const userEmail = sessionData?.user?.email

      const [{ data: prof }, { data: delegateRows }] = await Promise.all([
        supabase.from('profiles').select('plan, role, subscription_status').eq('id', userId).single(),
        supabase.from('trusted_people').select('id, invite_token').eq('email', userEmail).eq('invite_status', 'accepted'),
      ])

      if (prof?.plan === 'advisor') { navigate('/advisor-portal', { replace: true }); return }

      const isOwner    = prof?.role !== 'delegate'
      const isDelegate = !!delegateRows?.length
      const isDualRole = isOwner && isDelegate

      if (isDualRole) {
        navigate('/choose-account', { replace: true })
      } else if (isDelegate && !isOwner) {
        navigate(`/delegate-dashboard?token=${delegateRows[0].invite_token}`, { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Left panel ───────────────────────────────────────────────
  const LeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 aurora-gradient relative overflow-hidden flex-col justify-between p-12">
      {/* Sage green glow */}
      <div className="absolute pointer-events-none" style={{
        bottom: '-80px', left: '-80px', width: '480px', height: '480px',
        background: 'radial-gradient(circle, rgba(76,125,71,0.12) 0%, transparent 70%)',
      }} />
      {/* Decorative rings */}
      <div className="absolute rounded-full border border-white/5" style={{ top: '-80px', right: '-80px', width: '480px', height: '480px' }} />
      <div className="absolute rounded-full border border-white/5" style={{ top: '-40px', right: '-40px', width: '320px', height: '320px' }} />
      <div className="absolute rounded-full border border-white/[0.03]" style={{ bottom: '120px', right: '-120px', width: '400px', height: '400px' }} />

      {/* Logo */}
      <Link to="/" className="relative z-10">
        <img src="/logo-v2-white.png" alt="Everstead" className="h-10 w-auto" />
      </Link>

      {/* Quote — rotates every 7s */}
      <div className="relative z-10" style={{ opacity: quoteVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '80px', lineHeight: 1, color: 'rgba(76,125,71,0.4)', marginBottom: '-16px', marginLeft: '-4px' }}>"</div>
        <blockquote style={{ fontFamily: 'Georgia, serif', fontSize: '21px', fontWeight: '300', color: '#ffffff', lineHeight: 1.6, marginBottom: '24px' }}>
          {QUOTES[quoteIndex].text}
        </blockquote>
        {QUOTES[quoteIndex].author ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: 'rgba(76,125,71,0.3)' }}>
              {QUOTES[quoteIndex].author[0]}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{QUOTES[quoteIndex].author}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{QUOTES[quoteIndex].role}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-px w-8" style={{ backgroundColor: 'rgba(76,125,71,0.5)' }} />
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>Everstead</p>
          </div>
        )}
      </div>

      {/* Quote dots indicator */}
      <div className="absolute left-12 bottom-[168px] flex items-center gap-1.5 z-10">
        {QUOTES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setQuoteVisible(false); setTimeout(() => { setQuoteIndex(i); setQuoteVisible(true) }, 400) }}
            style={{ width: i === quoteIndex ? '20px' : '6px', height: '6px', borderRadius: '3px', backgroundColor: i === quoteIndex ? '#4c7d47' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }}
            aria-label={t('leftPanel.quoteAriaLabel', { number: i + 1 })}
          />
        ))}
      </div>

      {/* Trust stats */}
      <div className="relative z-10 grid grid-cols-3 gap-3">
        {t('leftPanel.stats', { returnObjects: true }).map(({ value, label }) => (
          <div key={label} className="text-center rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 12px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: '300', color: '#ffffff', marginBottom: '4px' }}>{value}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8f7f5' }}>
      <LeftPanel />

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden mb-10">
            <img src="/everstead-logo-dark.png" alt="Everstead" className="h-9 w-auto" />
          </Link>

          {/* Form card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm" style={{ border: '1px solid #e5e2dc' }}>

            {/* ── STEP 1: Email + Password ── */}
            {step === 1 && (
              <>
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '400', color: '#0d1628', marginBottom: '6px', letterSpacing: '-0.01em' }}>{t('step1.title')}</h1>
                <p style={{ fontSize: '14px', color: '#78716c', marginBottom: '28px' }}>{t('step1.subtitle')}</p>

                {/* Web only: Google blocks OAuth inside embedded webviews
                    (disallowed_useragent), so in the native apps this button was
                    a dead end. Google-account users can set a password via
                    "Forgot password" until native Google sign-in ships (v1.1 —
                    system browser + deep link; iOS will then also need Sign in
                    with Apple per guideline 4.8). */}
                {!isNative() && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center gap-3 transition-colors hover:bg-stone-50"
                      style={{ border: '1px solid #e5e2dc', backgroundColor: '#ffffff', color: '#0d1628', fontWeight: '500', fontSize: '14px', padding: '12px', borderRadius: '9999px', marginBottom: '20px', cursor: 'pointer' }}
                    >
                      <GoogleIcon />
                      {t('step1.googleButton')}
                    </button>

                    <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
                      <div className="flex-1 h-px bg-stone-200" />
                      <span style={{ fontSize: '12px', color: '#a8a29e' }}>{t('step1.divider')}</span>
                      <div className="flex-1 h-px bg-stone-200" />
                    </div>
                  </>
                )}

                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#57534e', marginBottom: '6px' }}>{t('step1.emailLabel')}</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      <input
                        type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        placeholder={t('step1.emailPlaceholder')} autoComplete="email"
                        style={{ width: '100%', paddingLeft: '40px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', fontSize: '14px', border: '1px solid #e5e2dc', borderRadius: '10px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s', backgroundColor: '#fafaf9' }}
                        onFocus={e => { e.target.style.borderColor = '#0d1628'; e.target.style.boxShadow = '0 0 0 3px rgba(13,22,40,0.08)'; e.target.style.backgroundColor = '#ffffff' }}
                        onBlur={e => { e.target.style.borderColor = '#e5e2dc'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#fafaf9' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#57534e' }}>{t('step1.passwordLabel')}</label>
                      <Link to="/forgot-password" style={{ fontSize: '12px', color: '#4c7d47', textDecoration: 'none', fontWeight: '500' }}
                        onMouseEnter={e => e.target.style.color = '#3d6b3a'}
                        onMouseLeave={e => e.target.style.color = '#4c7d47'}>
                        {t('step1.forgotPassword')}
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      <input
                        type={showPw ? 'text' : 'password'} required value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" autoComplete="current-password"
                        style={{ width: '100%', paddingLeft: '40px', paddingRight: '44px', paddingTop: '12px', paddingBottom: '12px', fontSize: '14px', border: '1px solid #e5e2dc', borderRadius: '10px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s', backgroundColor: '#fafaf9' }}
                        onFocus={e => { e.target.style.borderColor = '#0d1628'; e.target.style.boxShadow = '0 0 0 3px rgba(13,22,40,0.08)'; e.target.style.backgroundColor = '#ffffff' }}
                        onBlur={e => { e.target.style.borderColor = '#e5e2dc'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#fafaf9' }}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        aria-label={showPw ? t('step1.hidePassword') : t('step1.showPassword')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#b91c1c' }}>{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-aurora w-full flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', padding: '13px', borderRadius: '9999px', border: 'none', cursor: 'pointer', marginTop: '8px' }}
                  >
                    {loading ? t('step1.submitLoading') : t('step1.submit')}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '13px', color: '#a8a29e', marginTop: '20px' }}>
                  {t('step1.noAccount')}{' '}
                  <Link to="/get-started" style={{ color: '#4c7d47', fontWeight: '500', textDecoration: 'none' }}>
                    {t('step1.getStarted')}
                  </Link>
                </p>
              </>
            )}

            {/* ── STEP 2: 6-digit code ── */}
            {step === 2 && (
              <>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(76,125,71,0.1)' }}>
                  <ShieldCheck size={22} style={{ color: '#4c7d47' }} />
                </div>
                <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: '400', color: '#0d1628', marginBottom: '6px', letterSpacing: '-0.01em' }}>{t('step2.title')}</h1>
                <p style={{ fontSize: '14px', color: '#78716c', marginBottom: '4px' }}>{t('step2.sentCode')}</p>
                <p style={{ fontSize: '14px', color: '#0d1628', fontWeight: '600', marginBottom: '28px' }}>{email}</p>

                <form onSubmit={handleVerifyCode} className="space-y-5">
                  <div>
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
                          style={{ width: '44px', height: '56px', textAlign: 'center', fontSize: '22px', fontWeight: '600', color: '#0d1628', border: `1px solid ${d ? '#4c7d47' : '#e5e2dc'}`, borderRadius: '10px', outline: 'none', backgroundColor: d ? 'rgba(76,125,71,0.05)' : '#fafaf9', transition: 'all 0.15s ease' }}
                          onFocus={e => { e.target.style.borderColor = '#0d1628'; e.target.style.boxShadow = '0 0 0 3px rgba(13,22,40,0.08)'; e.target.style.backgroundColor = '#ffffff' }}
                          onBlur={e => { e.target.style.borderColor = d ? '#4c7d47' : '#e5e2dc'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = d ? 'rgba(76,125,71,0.05)' : '#fafaf9' }}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#b91c1c' }}>{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.length < 6}
                    className="btn-aurora w-full flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', padding: '13px', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
                  >
                    {loading ? t('step2.submitLoading') : t('step2.submit')}
                    {!loading && <ArrowRight size={16} />}
                  </button>

                  <p style={{ textAlign: 'center', fontSize: '13px', color: '#a8a29e' }}>
                    {t('step2.wrongEmail')}{' '}
                    <button type="button" onClick={() => { setStep(1); setDigits(['','','','','','']); setError(null) }}
                      style={{ color: '#4c7d47', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                      {t('step2.goBack')}
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>

          {/* Trust badge */}
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#a8a29e', marginTop: '20px', letterSpacing: '0.01em' }}>
            {t('trustBadge')}
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
