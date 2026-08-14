import React, { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { apiPost, isNative, isIOS } from '../../../lib/platform'
import { AccountsIcon, DocIcon, HeartIcon } from './icons'

// Google ships on BOTH platforms now that iOS pairs it with Sign in with Apple
// (guideline 4.8 — offering third-party login on iOS requires Apple's too).
// Apple's button renders FIRST per its prominence guidance, and only on iOS.
const GOOGLE_SIGNIN = isNative()
const APPLE_SIGNIN = isNative() && isIOS()

const AppleMark = () => (
  <svg width="16" height="16" viewBox="0 0 384 512" aria-hidden="true" style={{ marginTop: -2 }}>
    <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
)

const GoogleG = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
  </svg>
)

// Native onboarding + auth. Auth goes through the SAME server-side endpoints the
// website uses (service role), NOT the Supabase client SDK — the project has
// CAPTCHA/bot protection on auth, which rejects direct client signUp/signIn with
// "no captcha_token found". Registering/signing in server-side bypasses it.
//
//  • Sign up → POST /api/auth/delegate-register → setSession
//  • Sign in → POST /api/auth/mfa-send-code → emailed 6-digit code
//               → POST /api/auth/mfa-verify-code → setSession
//
// On success the Supabase session is set, AuthContext picks up the user, and
// MobileApp drops the user straight into the app on the free Everstead tier.
// Upgrading to Everstead+ happens later, inside the app (Settings / limit nudges).

const VALUE_PROPS = [
  { Icon: AccountsIcon, title: 'Accounts & money', sub: 'Banks, pensions and bills — one clear picture.' },
  { Icon: DocIcon,      title: 'Documents',        sub: 'Wills, deeds and policies, safe in one vault.' },
  { Icon: HeartIcon,    title: 'Wishes',           sub: 'Your wishes, recorded for the people you love.' },
]

async function postJson(path, body) {
  const { ok, data } = await apiPost(path, body)
  if (!ok) throw new Error(data?.error || 'Something went wrong. Please try again.')
  return data
}

export default function MobileAuthFlow() {
  const [mode, setMode] = useState('onboarding') // 'onboarding' | 'auth'
  const [obStep, setObStep] = useState(0)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'signup'
  const [authStep, setAuthStep] = useState('form') // 'form' | 'code' (sign-in only)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const goAuth = (m) => { setAuthMode(m); setAuthStep('form'); setError(null); setInfo(null); setMode('auth') }

  const canFinishOnboarding = name.trim().length > 0
  const canForm = email.trim().length > 0 && pw.length > 0 && (authMode === 'signin' || name.trim().length > 0)

  const applySession = async ({ access_token, refresh_token }) => {
    const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token })
    if (sErr) throw new Error('Could not sign you in. Please try again.')
    // AuthContext's onAuthStateChange picks up the session → MobileApp advances.
  }

  const submitSignup = async () => {
    if (!canForm || busy) return
    setBusy(true); setError(null)
    try {
      const data = await postJson('/api/auth/delegate-register', {
        // plan:'free' → the server stamps profiles.plan='free' via the handle_new_user
        // trigger (the only path by which a client can land on the free tier) and clears
        // the trial fields. wantsTrial:true here does NOT grant a trial (plan==='free'
        // clears it) — it only sets role='owner' (they own their own vault) and pings
        // the founder about the new signup.
        mode: 'register', plan: 'free', wantsTrial: true,
        email: email.trim(), password: pw, name: name.trim(),
      })
      await applySession(data)
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  // Native Sign in with Apple (iOS): fully in-process ASAuthorization sheet →
  // Supabase signInWithIdToken. On success onAuthStateChange fires and the
  // shell drops the user into the app — same as the password flow.
  const appleSignIn = async () => {
    setError(null); setInfo(null)
    try {
      const { signInWithAppleNative } = await import('../../../lib/nativeAppleAuth')
      await signInWithAppleNative() // 'cancelled' resolves quietly — no error UI
    } catch (e) {
      // Surfaces in the Xcode console (and logcat) — the ASAuthorization and
      // Supabase failure modes are indistinguishable without it.
      console.log('[auth] apple sign-in error:', e?.message || e, e?.code || '')
      setError('Apple sign-in could not complete. Please try again.')
    }
  }

  // Native Google sign-in: system browser + deep link (see lib/nativeGoogleAuth).
  // On success the app reloads signed-in via AuthContext's appUrlOpen handler,
  // so there's no success path to handle here — only the failure to launch.
  const googleSignIn = async () => {
    setError(null); setInfo(null)
    try {
      const { signInWithGoogleNative } = await import('../../../lib/nativeGoogleAuth')
      await signInWithGoogleNative()
    } catch {
      setError('Google sign-in could not start. Please try again.')
    }
  }

  const submitSendCode = async () => {
    if (!canForm || busy) return
    setBusy(true); setError(null); setInfo(null)
    try {
      await postJson('/api/auth/mfa-send-code', { email: email.trim(), password: pw })
      setAuthStep('code')
      setInfo(`We've emailed a 6-digit code to ${email.trim()}.`)
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  const submitVerifyCode = async () => {
    if (code.trim().length < 6 || busy) return
    setBusy(true); setError(null)
    try {
      const data = await postJson('/api/auth/mfa-verify-code', { email: email.trim(), code: code.trim() })
      await applySession(data)
    } catch (err) {
      setError(err.message)
    } finally { setBusy(false) }
  }

  const forgotPw = async () => {
    if (!email.trim()) { setError('Enter your email first.'); return }
    setError(null)
    try { await postJson('/api/auth/forgot-password', { email: email.trim() }) } catch { /* don't reveal existence */ }
    setInfo(`If an account exists for ${email.trim()}, we've sent a reset link.`)
  }

  // ── Onboarding ──────────────────────────────────────────────
  if (mode === 'onboarding') {
    return (
      <div className="ob grain">
        <div className="hero-glow" />
        {obStep < 2 && <button className="skip" onClick={() => goAuth('signup')}>Skip</button>}

        {obStep === 0 && (
          <div className="f1 fx col posrel">
            <img className="oblogo" src="/logo-v2-white.png" alt="Everstead" />
            <div className="f1 fx col jc ac tc">
              <h1 className="obh" style={{ fontSize: 38 }}>
                Everything that matters, <span className="aurora">gathered</span> in one secure place.
              </h1>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.65)', margin: '18px 0 0' }}>
                Accounts, documents and wishes — organised for today, ready for whatever comes.
              </p>
            </div>
          </div>
        )}

        {obStep === 1 && (
          <div className="f1 fx col jc posrel">
            <h1 className="obh">Everything that matters, in one place.</h1>
            <div className="fx col gap12" style={{ marginTop: 26 }}>
              {VALUE_PROPS.map(({ Icon, title, sub }) => (
                <div key={title} className="card-dark fx gap12" style={{ padding: 15, alignItems: 'flex-start' }}>
                  <span className="ficon"><Icon s={20} /></span>
                  <div>
                    <div className="ftit">{title}</div>
                    <div className="fsub">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {obStep === 2 && (
          <div className="f1 fx col jc posrel">
            <h1 className="obh">First, a little about you.</h1>
            <label className="flabel flabel-dark" style={{ marginTop: 24 }}>Your name</label>
            <input className="inp inp-dark" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Eleanor Whitmore" autoComplete="name" autoCapitalize="words" enterKeyHint="done" />
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', margin: '12px 0 0', lineHeight: 1.5 }}>
              Just your name for now — you can invite family once you're in.
            </p>
          </div>
        )}

        <div className="posrel">
          <div className="dots">
            <span className={`dot ${obStep === 0 ? 'on' : ''}`} />
            <span className={`dot ${obStep === 1 ? 'on' : ''}`} />
            <span className={`dot ${obStep === 2 ? 'on' : ''}`} />
          </div>
          {obStep < 2 && (
            <button className="btn btn-light w100" onClick={() => setObStep(s => s + 1)}>
              {obStep === 0 ? 'Get started' : 'Continue'}
            </button>
          )}
          {obStep === 2 && (
            <button className={`btn btn-light w100 ${canFinishOnboarding ? '' : 'dis'}`} onClick={() => canFinishOnboarding && goAuth('signup')}>
              Create my home
            </button>
          )}
          {obStep === 0 && (
            <button className="linkbtn" onClick={() => goAuth('signin')}>I already have an account</button>
          )}
        </div>
      </div>
    )
  }

  // ── Auth ────────────────────────────────────────────────────
  const messages = (
    <>
      {error && <p style={{ color: '#fca5a5', fontSize: 12.5, marginTop: 12 }}>{error}</p>}
      {info && !error && <p style={{ color: 'var(--color-sage-300)', fontSize: 12.5, marginTop: 12 }}>{info}</p>}
    </>
  )

  return (
    <div className="ob grain">
      <div className="hero-glow" />
      <button className="skip" onClick={() => { if (authStep === 'code') { setAuthStep('form'); setError(null) } else setMode('onboarding') }}>Back</button>

      <div className="f1 fx col jc posrel">
        <div className="eyebrow eyebrow-sage">Everstead</div>

        {/* Sign-in code step */}
        {authMode === 'signin' && authStep === 'code' ? (
          <>
            <h1 className="obh" style={{ fontSize: 33 }}>Check your email.</h1>
            <label className="flabel flabel-dark" style={{ marginTop: 22 }}>6-digit code</label>
            <input
              className="inp inp-dark" inputMode="numeric" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000"
              autoComplete="one-time-code" enterKeyHint="done"
              onKeyDown={e => { if (e.key === 'Enter' && code.trim().length === 6 && !busy) submitVerifyCode() }}
              style={{ letterSpacing: '0.3em', fontSize: 18 }}
            />
            <button className="fpw" onClick={submitSendCode}>Resend code</button>
            {messages}
          </>
        ) : (
          <>
            {authMode === 'signin'
              ? <>
                  <h1 className="obh" style={{ fontSize: 33 }}>Welcome back.</h1>
                  {APPLE_SIGNIN && (
                    <button
                      onClick={appleSignIn}
                      disabled={busy}
                      className="w100 fx ac jc"
                      style={{
                        gap: 8, marginTop: 22, padding: '13px 16px', borderRadius: 999, cursor: 'pointer',
                        background: '#fff', border: 0, color: '#000', fontSize: 14.5, fontWeight: 600,
                      }}
                    >
                      <AppleMark />Continue with Apple
                    </button>
                  )}
                  {GOOGLE_SIGNIN && (
                    <>
                      <button
                        onClick={googleSignIn}
                        disabled={busy}
                        className="w100 fx ac jc"
                        style={{
                          gap: 9, marginTop: APPLE_SIGNIN ? 10 : 22, padding: '13px 16px', borderRadius: 999, cursor: 'pointer',
                          background: '#fafaf9', border: 0, color: 'var(--color-navy-900)', fontSize: 14.5, fontWeight: 600,
                        }}
                      >
                        <GoogleG />Continue with Google
                      </button>
                      <div className="fx ac" style={{ gap: 12, margin: '16px 0 0' }}>
                        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>or sign in with email</span>
                        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                      </div>
                    </>
                  )}
                </>
              : <>
                  <h1 className="obh" style={{ fontSize: 33 }}>Create your account.</h1>
                  <label className="flabel flabel-dark" style={{ marginTop: 22 }}>Your name</label>
                  <input className="inp inp-dark" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Eleanor Whitmore" autoComplete="name" autoCapitalize="words" enterKeyHint="next" />
                </>}
            <label className="flabel flabel-dark" style={{ marginTop: 18 }}>Email</label>
            <input className="inp inp-dark" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoCapitalize="none" autoCorrect="off" inputMode="email" enterKeyHint="next" />
            <label className="flabel flabel-dark">Password</label>
            <input
              className="inp inp-dark" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••"
              autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} enterKeyHint="go"
              onKeyDown={e => { if (e.key === 'Enter' && canForm && !busy) (authMode === 'signin' ? submitSendCode : submitSignup)() }}
            />
            {authMode === 'signin' && <button className="fpw" onClick={forgotPw}>Forgot password?</button>}
            {messages}
          </>
        )}
      </div>

      <div className="posrel">
        {authMode === 'signin' ? (
          authStep === 'code' ? (
            <>
              <button className={`btn btn-light w100 ${code.trim().length === 6 && !busy ? '' : 'dis'}`} onClick={submitVerifyCode}>
                {busy ? 'Verifying…' : 'Verify & sign in'}
              </button>
            </>
          ) : (
            <>
              <button className={`btn btn-light w100 ${canForm && !busy ? '' : 'dis'}`} onClick={submitSendCode}>
                {busy ? 'Sending…' : 'Continue'}
              </button>
              <button className="linkbtn" onClick={() => { setAuthMode('signup'); setError(null); setInfo(null) }}>
                New to Everstead? Create an account
              </button>
            </>
          )
        ) : (
          <>
            <button className={`btn btn-light w100 ${canForm && !busy ? '' : 'dis'}`} onClick={submitSignup}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
            <button className="linkbtn" onClick={() => { setAuthMode('signin'); setAuthStep('form'); setError(null); setInfo(null) }}>
              Already have an account? Sign in
            </button>
          </>
        )}
      </div>
    </div>
  )
}
