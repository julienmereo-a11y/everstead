import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { supabase } from '../../../../lib/supabase'
import { isNative, apiPost } from '../../../../lib/platform'
import { planLabel, isPaidPlan } from '../../../../config/pricing'
import { getLockState, setBiometricEnabled, clearPasscode, biometricAvailable } from '../../../../components/native/appLock'
import { clearReminders, notificationsGranted, requestNotificationPermission, registerForPush, notificationStatus } from '../../../../lib/notifications'
import { haptic } from '../../../../lib/haptics'
import { useTranslation } from 'react-i18next'
import SecScreen, { Busy } from '../components/SecScreen'
import i18n from '../../../../i18n'
import { COUNTRIES, countryDisplayName } from '../../../../config/countries'

// Stamped by vite at build time (date + git sha, see vite.config.js), so what
// you read on the device is always the bundle actually running. Never edit by
// hand: a marker somebody has to remember to bump is a marker that lies.
const APP_BUILD = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : 'dev'

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      onClick={onChange} disabled={disabled} role="switch" aria-checked={on}
      style={{
        position: 'relative', width: 44, height: 26, borderRadius: 999, border: 0, flex: 'none',
        background: on ? 'var(--color-navy-700)' : 'var(--color-stone-300)', transition: 'background .2s', cursor: 'pointer',
      }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'left .2s' }} />
    </button>
  )
}

// Module scope, NOT inside the component: an inline component gets a fresh
// identity per render, so React remounted every card on each keystroke —
// inputs lost focus and the iOS keyboard dismissed after every character.
const Card = ({ title, children }) => (
  <div className="card-light" style={{ padding: 16, marginBottom: 14 }}>
    <div className="eyebrow" style={{ marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

const NOTIFS = [
  { key: 'notify_document_expiry', labelKey: 'settings.notifDocExpiry' },
  { key: 'notify_vault_nudges',    labelKey: 'settings.notifVault' },
  { key: 'notify_annual_review',   labelKey: 'settings.notifAnnual' },
  { key: 'notify_birthday',        labelKey: 'settings.notifBirthday' },
]

export default function SettingsScreen({ app }) {
  const { t, i18n: i18nLive } = useTranslation('mobile')
  const auth = useAuth()
  const profile = app.profile || auth.profile
  const updateProfile = app.demo ? (async () => {}) : auth.updateProfile
  const signOut = app.demo ? app.onSignOut : auth.signOut
  const [details, setDetails] = useState({ full_name: '', phone: '', country: '' })
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [notifs, setNotifs] = useState({})
  // The addresses that are you. An organisation writes to whatever address it
  // holds, and for an employer that is almost never the one you signed up
  // with, so an account can carry more than one once each has been proved.
  // Adding is never just a typed field: a claim to an address is not evidence
  // of holding it, and whatever arrives there afterwards would be yours.
  const [addrs, setAddrs] = useState([])
  const [addrLoading, setAddrLoading] = useState(!app.demo)
  const [addrStage, setAddrStage] = useState('idle')   // idle | typing | code
  const [addrEmail, setAddrEmail] = useState('')
  const [addrCode, setAddrCode] = useState('')
  const [addrBusy, setAddrBusy] = useState(false)
  const [addrError, setAddrError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [aiOn, setAiOn] = useState(true)
  const [lock, setLock] = useState({ hasPin: false, biometric: false })
  // Friends who joined through the referral link. Demo shows a canned number;
  // real accounts ask the my_referral_count RPC (await + try/catch, never a
  // .catch chained on the builder, which PostgREST builders do not have).
  const [joined, setJoined] = useState(null)
  const [bioAvail, setBioAvail] = useState(false)
  const [notifGranted, setNotifGranted] = useState(null) // null = unknown/web
  const [notifStatus, setNotifStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  // Two-step confirm for the two destructive actions (lock off / sign out) —
  // one stray tap shouldn't remove a security layer or log the user out.
  const [confirmAction, setConfirmAction] = useState(null) // 'lock' | 'signout'
  const confirmTimer = useRef(null)
  const armConfirm = (which) => {
    haptic.warning()
    setConfirmAction(which)
    clearTimeout(confirmTimer.current)
    confirmTimer.current = setTimeout(() => setConfirmAction(null), 3500)
  }
  useEffect(() => () => clearTimeout(confirmTimer.current), [])

  // Account deletion (App Store Guideline 5.1.1(v): apps with account creation
  // must offer in-app deletion). Reuses the web endpoint, which cancels any
  // Stripe subscription, marks the profile pending_deletion (data removed
  // within 30 days) and emails a confirmation. Apple IAP subscriptions can
  // only be cancelled by the user in their Apple ID settings — the copy below
  // tells them so.
  const [delOpen, setDelOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [delErr, setDelErr] = useState(null)
  const deleteAccount = async () => {
    if (app.demo || deleting) return
    setDelErr(null); setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = auth.user?.id
      if (!session?.access_token || !userId) throw new Error(t('settings.signInRetry'))
      const res = await apiPost('/api/auth/delete-account', { userId }, {
        Authorization: `Bearer ${session.access_token}`,
      })
      if (!res.ok) throw new Error(res.data?.error || t('settings.deleteFailed'))
      // Account is scheduled for deletion — clear local state and leave.
      await clearReminders()
      signOut()
    } catch (err) {
      setDelErr(err.message || t('settings.deleteFailed'))
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (app.demo) { setJoined(2); return }
    let on = true
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('my_referral_count')
        if (on && !error && typeof data === 'number') setJoined(data)
      } catch { /* a missing count is not an error state */ }
    })()
    return () => { on = false }
  }, [app.demo])

  useEffect(() => {
    if (!profile) return
    setDetails({ full_name: profile.full_name || '', phone: profile.phone || '', country: profile.country || '' })
    setNotifs(Object.fromEntries(NOTIFS.map(n => [n.key, profile[n.key] !== false])))
    setAiOn(profile.ai_features_enabled !== false)
  }, [profile])

  useEffect(() => {
    if (!isNative()) return
    getLockState().then(setLock)
    biometricAvailable().then(setBioAvail)
    notificationsGranted().then(setNotifGranted)
    notificationStatus().then(setNotifStatus)
  }, [])

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission()
    setNotifGranted(granted)
    // Schedule immediately — without this the toggle would claim success while
    // scheduling nothing until the next cold start.
    if (granted) { app.refreshReminders?.(); registerForPush(); app.say(t('settings.notifsEnabled')) }
    // Not granted and no iOS dialog appeared = either previously declined (fix in
    // iOS Settings) or the notification plugin isn't in this binary (needs a full
    // Xcode package resolve + clean build). Either way, tell the user something.
    else app.say(t('settings.notifsEnableFailed'), 'error')
  }

  const saveDetails = async () => {
    if (savingDetails) return
    setSavingDetails(true)
    try { await updateProfile(details); app.say(t('settings.detailsSaved')) } catch { app.say(t('settings.detailsFailed'), 'error') }
    finally { setSavingDetails(false) }
  }
  const savePassword = async () => {
    setPwMsg(null)
    if (pw.next.length < 8) { setPwMsg({ ok: false, text: t('settings.pwTooShort') }); return }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: t('settings.pwNoMatch') }); return }
    if (app.demo) { setPwMsg({ ok: true, text: t('settings.pwUpdated') }); setPw({ next: '', confirm: '' }); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setSavingPw(false)
    if (error) setPwMsg({ ok: false, text: error.message })
    else { setPwMsg({ ok: true, text: t('settings.pwUpdated') }); setPw({ next: '', confirm: '' }) }
  }
  const toggleNotif = async (key) => {
    const next = { ...notifs, [key]: !notifs[key] }
    setNotifs(next)
    try {
      await updateProfile({ [key]: next[key] })
      app.refreshReminders?.() // re-arm/cancel on-device reminders to match the toggle
    } catch { /* revert on failure */ setNotifs(notifs) }
  }
  const toggleAi = async () => { const v = !aiOn; setAiOn(v); try { await updateProfile({ ai_features_enabled: v }) } catch { setAiOn(!v) } }
  const toggleBio = async () => { const v = !lock.biometric; setLock(l => ({ ...l, biometric: v })); await setBiometricEnabled(v) }
  const turnOffLock = async () => { await clearPasscode(); setLock({ hasPin: false, biometric: false }); app.say(t('settings.lockOff')) }

  const referralLink = `https://www.everstead.care/get-started?ref=${profile?.referral_code || profile?.id || ''}`
  const copyReferral = () => {
    if (!navigator.clipboard) { app.say('Could not copy, long-press the link instead.', 'error'); return }
    navigator.clipboard.writeText(referralLink)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) })
      .catch(() => app.say('Could not copy, long-press the link instead.', 'error'))
  }

  const DEMO_ADDRS = [
    { email: profile?.email || 'you@example.com', is_primary: true },
    { email: 'you@work.example', is_primary: false },
  ]

  const loadAddrs = useCallback(async () => {
    if (app.demo) { setAddrs(DEMO_ADDRS); setAddrLoading(false); return }
    try {
      const { data } = await supabase.rpc('get_my_emails')
      setAddrs(data || [])
    } catch { /* leave the list as it was; the card just shows what it has */ }
    setAddrLoading(false)
  }, [app.demo, profile?.email])
  useEffect(() => { loadAddrs() }, [loadAddrs])

  const callAddr = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    return apiPost('/api/account/link-address', { action, email: addrEmail.trim(), ...extra },
      { Authorization: `Bearer ${session?.access_token || ''}` })
  }

  const sendAddrCode = async () => {
    setAddrBusy(true); setAddrError(null)
    try {
      const res = await callAddr('send-code')
      if (res.data?.alreadyYours) { setAddrStage('idle'); setAddrEmail(''); app.say(t('settings.addrAlreadyYours')); return }
      if (!res.ok) throw new Error(res.data?.error || t('settings.addrSendFailed'))
      setAddrStage('code')
    } catch (e) { setAddrError(e.message || t('settings.addrSendFailed')) } finally { setAddrBusy(false) }
  }

  const verifyAddr = async () => {
    setAddrBusy(true); setAddrError(null)
    try {
      const res = await callAddr('verify', { code: addrCode })
      if (!res.ok) throw new Error(res.data?.error || t('settings.addrVerifyFailed'))
      setAddrStage('idle'); setAddrEmail(''); setAddrCode('')
      await loadAddrs()
      app.say(t('settings.addrAdded'))
    } catch (e) { setAddrError(e.message || t('settings.addrVerifyFailed')) } finally { setAddrBusy(false) }
  }

  // The apps have no download: a Capacitor webview cannot save a file without
  // plugins this build does not carry, and putting a token in a URL to open it
  // in a browser is not a trade worth making. So the archive is emailed to the
  // address on the account, which is also the safer shape — it is "send my
  // data to me", not "show my data to whoever is holding this phone".
  const exportData = async () => {
    if (app.demo) { app.say(t('settings.notInDemo'), 'error'); return }
    setExporting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await apiPost('/api/data/export', { deliver: 'email' },
        { Authorization: `Bearer ${session?.access_token || ''}` })
      if (!res.ok) throw new Error(res.data?.error || t('settings.exportFailed'))
      app.say(t('settings.exportSent', { email: res.data?.emailedTo || profile?.email }))
    } catch (e) { app.say(e.message || t('settings.exportFailed'), 'error') }
    finally { setExporting(false) }
  }

  const removeAddr = async (email) => {
    if (app.demo) { app.say(t('settings.notInDemo'), 'error'); return }
    try {
      await supabase.rpc('remove_my_email', { p_email: email })
      await loadAddrs()
      app.say(t('settings.addrRemoved'))
    } catch { app.say(t('settings.addrRemoveFailed'), 'error') }
  }

  return (
    <SecScreen title={t('settings.title')} subtitle={profile?.email} onBack={() => app.go('more')}>
      <Card title={t('settings.personalDetails')}>
        <label className="flabel" style={{ marginTop: 0 }}>{t('settings.fullName')}</label>
        <input className="inp" value={details.full_name} onChange={e => setDetails(d => ({ ...d, full_name: e.target.value }))} />
        <label className="flabel">{t('settings.phone')}</label>
        <input className="inp" value={details.phone} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} placeholder={t('common.optional')} />
        {/* The app never asks for this at sign-up, so it is a guess from the
            phone until someone corrects it here. It decides which currency
            Everstead+ is billed in. */}
        <label className="flabel">{t('settings.country')}</label>
        <select className="inp" value={details.country} onChange={e => setDetails(d => ({ ...d, country: e.target.value }))}>
          <option value="">{t('settings.notSet')}</option>
          {COUNTRIES.map(c => <option key={c.code} value={c.name}>{countryDisplayName(c.name, i18nLive.language)}</option>)}
        </select>
        <button className={`btn w100 ${savingDetails ? 'dis' : ''}`} style={{ marginTop: 16 }} onClick={saveDetails} disabled={savingDetails}>{savingDetails ? t('common.saving') : t('settings.saveDetails')}</button>
      </Card>

      <Card title={t('settings.addresses')}>
        <p className="rdet" style={{ margin: '0 0 12px' }}>{t('settings.addressesIntro')}</p>
        {addrLoading ? (
          <Busy />
        ) : (
          addrs.map((r, i) => (
            <div key={r.email} className={`fx jb ac ${i ? 'bt' : ''}`} style={i ? { paddingTop: 12, marginTop: 12 } : undefined}>
              <div className="f1" style={{ minWidth: 0 }}>
                <div className="rname" style={{ overflowWrap: 'anywhere' }}>{r.email}</div>
                <div className="rdet">{r.is_primary ? t('settings.addrSignIn') : t('settings.addrConfirmed')}</div>
              </div>
              {!r.is_primary && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', flex: 'none' }}
                  onClick={() => removeAddr(r.email)}
                >
                  {t('settings.addrRemove')}
                </button>
              )}
            </div>
          ))
        )}

        {addrStage === 'idle' && (
          <button className="btn w100" style={{ marginTop: 14, background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }} onClick={() => { setAddrError(null); setAddrStage('typing') }}>
            {t('settings.addrAdd')}
          </button>
        )}

        {addrStage !== 'idle' && (
          <div style={{ marginTop: 14, padding: 12, background: 'var(--color-stone-50)', borderRadius: 12 }}>
            {addrStage === 'typing' ? (
              <>
                <input
                  className="inp" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
                  value={addrEmail} onChange={e => setAddrEmail(e.target.value)}
                  placeholder={t('settings.addrPlaceholder')}
                />
                <p className="rdet" style={{ margin: '8px 0 0' }}>{t('settings.addrWhy')}</p>
              </>
            ) : (
              <>
                <input
                  className="inp" inputMode="numeric" autoComplete="one-time-code"
                  value={addrCode} onChange={e => setAddrCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />
                <p className="rdet" style={{ margin: '8px 0 0' }}>{t('settings.addrCodeSent', { email: addrEmail })}</p>
              </>
            )}
            {addrError && <p style={{ fontSize: 12.5, marginTop: 10, color: '#b91c1c' }}>{addrError}</p>}
            <div className="fx" style={{ gap: 8, marginTop: 12 }}>
              <button
                className={`btn btn-sm f1 ${addrBusy || (addrStage === 'typing' ? !addrEmail.trim() : addrCode.length < 6) ? 'dis' : ''}`}
                disabled={addrBusy || (addrStage === 'typing' ? !addrEmail.trim() : addrCode.length < 6)}
                onClick={addrStage === 'typing' ? sendAddrCode : verifyAddr}
              >
                {addrBusy ? t('common.saving') : addrStage === 'typing' ? t('settings.addrSendCode') : t('settings.addrConfirmCode')}
              </button>
              <button className="btn btn-sm f1" style={{ background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }} onClick={() => { setAddrStage('idle'); setAddrCode(''); setAddrError(null) }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* The app picks a language from the phone on first launch (see
          src/lib/deviceLanguage.js). This is how someone overrides that, and
          the choice follows them into their emails. */}
      <Card title={t('settings.language')}>
        <select
          className="inp"
          value={profile?.language === 'fr' ? 'fr' : 'en'}
          onChange={async (e) => {
            const lang = e.target.value
            i18n.changeLanguage(lang)
            haptic.tick()
            try { await updateProfile({ language: lang }); app.say(t('settings.languageSaved')) }
            catch { app.say(t('settings.languageFailed'), 'error') }
          }}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </Card>

      <Card title={t('settings.changePassword')}>
        <input className="inp" type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder={t('settings.newPw')} />
        <div style={{ height: 10 }} />
        <input className="inp" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder={t('settings.confirmPw')} />
        {pwMsg && <p style={{ fontSize: 12.5, marginTop: 10, color: pwMsg.ok ? 'var(--color-sage-700)' : '#b91c1c' }}>{pwMsg.text}</p>}
        <button className={`btn w100 ${savingPw ? 'dis' : ''}`} style={{ marginTop: 16 }} onClick={savePassword} disabled={savingPw}>{savingPw ? t('settings.updating') : t('settings.updatePassword')}</button>
      </Card>

      {isNative() && (
        <Card title={t('settings.appLock')}>
          {lock.hasPin ? (
            <>
              <div className="fx jb ac">
                <div className="f1"><div className="rname">{t('settings.passcode')}</div><div className="rdet">{t('settings.passcodeDesc')}</div></div>
                <span className="chip chip-sage">{t('settings.on')}</span>
              </div>
              {bioAvail && (
                <div className="fx jb ac bt" style={{ paddingTop: 12, marginTop: 12 }}>
                  <div className="f1"><div className="rname">{t('settings.faceId')}</div><div className="rdet">{t('settings.faceIdDesc')}</div></div>
                  <Toggle on={lock.biometric} onChange={toggleBio} />
                </div>
              )}
              <button className="btn w100" style={{ marginTop: 14, background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }} onClick={() => app.go('security')}>{t('settings.changePasscode')}</button>
              <button
                className="btn w100"
                style={{ marginTop: 8, background: confirmAction === 'lock' ? '#b91c1c' : '#fff', color: confirmAction === 'lock' ? '#fff' : '#b91c1c', border: '1px solid var(--color-stone-200)' }}
                onClick={() => { if (confirmAction === 'lock') { setConfirmAction(null); turnOffLock() } else armConfirm('lock') }}
              >
                {confirmAction === 'lock' ? t('settings.confirmLockOff') : t('settings.turnOffLock')}
              </button>
            </>
          ) : (
            <>
              <p className="rdet" style={{ margin: '0 0 12px' }}>{t('settings.noLockYet')}</p>
              <button className="btn w100" onClick={() => app.go('security')}>{t('settings.setUpLock')}</button>
            </>
          )}
        </Card>
      )}

      <Card title={t('settings.subscription')}>
        <div className="fx jb ac">
          <div className="f1">
            <div className="rname">{planLabel(profile?.plan || 'free')}</div>
            <div className="rdet" style={{ textTransform: 'capitalize' }}>
              {isPaidPlan(profile?.plan) ? (profile?.subscription_status || '—') : t('settings.freePlan')}
            </div>
          </div>
        </div>
        {!isPaidPlan(profile?.plan) && (
          <button className="btn w100" style={{ marginTop: 14 }} onClick={() => app.go('upgrade')}>
            {t('settings.upgradeTo', { plan: planLabel('family') })}
          </button>
        )}
      </Card>

      <Card title={t('settings.aiFeatures')}>
        <div className="fx jb ac">
          <div className="f1"><div className="rname">{t('settings.aiAssistant')}</div><div className="rdet">{t('settings.aiDesc')}</div></div>
          <Toggle on={aiOn} onChange={toggleAi} />
        </div>
      </Card>

      <Card title={t('settings.notifications')}>
        {/* Always rendered on device — deliberately NOT gated on the async status
            check, which can stall if the native plugin is unavailable. Treats
            "unknown" as not-enabled so the Enable button is always reachable. */}
        {isNative() && (
          <div className="fx jb ac" style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--color-stone-100)' }}>
            <div className="f1">
              <div className="rname">{t('settings.thisDevice')}</div>
              <div className="rdet">
                {notifGranted === true
                  ? t('settings.notifsOn')
                  : notifStatus === 'denied'
                    ? t('settings.notifsDenied')
                    : t('settings.notifsOff')}
                {notifStatus && notifGranted !== true && <span style={{ opacity: 0.6 }}> [{notifStatus}]</span>}
              </div>
            </div>
            {notifGranted === true
              ? <span className="chip chip-sage">{t('settings.on')}</span>
              : <button className="btn btn-sm" style={{ flex: 'none' }} onClick={enableNotifications}>{t('settings.enable')}</button>}
          </div>
        )}
        {NOTIFS.map((n, i) => (
          <div key={n.key} className={`fx jb ac ${i ? 'bt' : ''}`} style={{ padding: i ? '12px 0 0' : 0, marginTop: i ? 12 : 0 }}>
            <div className="f1 rname" style={{ fontWeight: 400 }}>{t(n.labelKey)}</div>
            <Toggle on={!!notifs[n.key]} onChange={() => toggleNotif(n.key)} />
          </div>
        ))}
      </Card>

      {/* Everstead is freemium now, so the old "21-day trial instead of 14"
          pitch described a path most invitees never take. The trial bonus still
          exists but only if the friend picks Everstead+ at signup; free is the
          default and needs no card. */}
      <Card title={t('settings.inviteCard')}>
        <p className="rdet" style={{ margin: '0 0 10px' }}>
          {t('settings.inviteBody')}
        </p>
        {joined > 0 && (
          <p className="rdet" style={{ margin: '0 0 10px', color: 'var(--color-sage-700)', fontWeight: 600 }}>
            {t('settings.inviteJoined', { count: joined })}
          </p>
        )}
        <div className="fx gap12 ac">
          <input className="inp" readOnly value={referralLink} style={{ fontSize: 12 }} />
          {/* WKWebView exposes navigator.share on recent iOS; when it is there,
              the native share sheet beats copy-paste. Feature-detected so older
              webviews quietly keep the Copy button alone. */}
          {typeof navigator !== 'undefined' && navigator.share ? (
            <button className="btn btn-sm" style={{ flex: 'none' }} onClick={async () => {
              haptic.tick()
              try { await navigator.share({ url: referralLink, text: t('settings.shareText') }) }
              catch { /* user closed the sheet */ }
            }}>{t('common.share')}</button>
          ) : null}
          <button className="btn btn-sm" style={{ flex: 'none' }} onClick={copyReferral}>{copied ? t('common.copied') : t('common.copy')}</button>
        </div>
      </Card>

      <button
        className="btn w100"
        style={{ background: confirmAction === 'signout' ? '#b91c1c' : '#fff', color: confirmAction === 'signout' ? '#fff' : '#b91c1c', border: '1px solid var(--color-stone-200)', marginTop: 6 }}
        onClick={async () => {
          if (confirmAction !== 'signout') { armConfirm('signout'); return }
          setConfirmAction(null)
          await clearReminders(); signOut()
        }}
      >
        {confirmAction === 'signout' ? t('settings.confirmSignOut') : t('settings.signOut')}
      </button>

      {/* Sits directly above deleting the account on purpose: the two belong to
          the same conversation, and nobody should reach "delete everything"
          without having passed "take a copy first". */}
      <Card title={t('settings.yourData')}>
        <p className="rdet" style={{ margin: '0 0 12px' }}>{t('settings.exportBody')}</p>
        <button
          className={`btn w100 ${exporting ? 'dis' : ''}`}
          style={{ background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }}
          onClick={exportData}
          disabled={exporting}
        >
          {exporting ? t('settings.exportPreparing') : t('settings.exportSend')}
        </button>
      </Card>

      {!delOpen ? (
        <button
          className="linkbtn"
          style={{ marginTop: 14, color: 'var(--color-stone-400)', fontSize: 12.5 }}
          onClick={() => { haptic.warning(); setDelOpen(true); setDelErr(null) }}
        >
          {t('settings.deleteMy')}
        </button>
      ) : (
        <div className="card-light" style={{ padding: 16, marginTop: 14, border: '1px solid #fecaca' }}>
          <div className="eyebrow" style={{ marginBottom: 10, color: '#b91c1c' }}>{t('settings.deleteTitle')}</div>
          <p className="rdet" style={{ margin: '0 0 8px', lineHeight: 1.55 }}>
            {t('settings.deleteBody')}
          </p>
          {['apple_iap', 'google_play'].includes(profile?.entitlement_source) && isPaidPlan(profile?.plan) && (
            <p className="rdet" style={{ margin: '0 0 8px', lineHeight: 1.55, fontWeight: 600 }}>
              {profile.entitlement_source === 'google_play' ? t('settings.deleteGoogle') : t('settings.deleteApple')}
            </p>
          )}
          {app.demo && <p className="rdet" style={{ margin: '0 0 8px', color: 'var(--color-stone-400)' }}>{t('settings.notInDemo')}</p>}
          {delErr && <p style={{ color: '#b91c1c', fontSize: 12.5, margin: '0 0 8px' }}>{delErr}</p>}
          <button
            className={`btn w100 ${deleting || app.demo ? 'dis' : ''}`}
            style={{ background: '#b91c1c', color: '#fff', marginTop: 4 }}
            onClick={deleteAccount}
          >
            {deleting ? t('settings.deleting') : t('settings.deleteForever')}
          </button>
          <button className="linkbtn" style={{ marginTop: 8 }} onClick={() => { setDelOpen(false); setDelErr(null) }} disabled={deleting}>
            {t('common.cancel')}
          </button>
        </div>
      )}

      {isNative() && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-stone-400)', margin: '16px 0 0' }}>
          Everstead · {APP_BUILD}
        </p>
      )}
    </SecScreen>
  )
}
