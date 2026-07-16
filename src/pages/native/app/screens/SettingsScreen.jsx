import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { supabase } from '../../../../lib/supabase'
import { isNative } from '../../../../lib/platform'
import { planLabel, isPaidPlan } from '../../../../config/pricing'
import { getLockState, setBiometricEnabled, clearPasscode, biometricAvailable } from '../../../../components/native/appLock'
import { clearReminders, notificationsGranted, requestNotificationPermission, registerForPush, notificationStatus } from '../../../../lib/notifications'
import { haptic } from '../../../../lib/haptics'
import SecScreen from '../components/SecScreen'

// Bump on each build so you can confirm on-device which bundle is running.
const APP_BUILD = '2026-07-16 · build 33'

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

const NOTIFS = [
  { key: 'notify_document_expiry', label: 'Document expiry reminders' },
  { key: 'notify_vault_nudges',    label: 'Vault nudges' },
  { key: 'notify_annual_review',   label: 'Annual review' },
  { key: 'notify_birthday',        label: 'Birthday note' },
]

export default function SettingsScreen({ app }) {
  const auth = useAuth()
  const profile = app.profile || auth.profile
  const updateProfile = app.demo ? (async () => {}) : auth.updateProfile
  const signOut = app.demo ? app.onSignOut : auth.signOut
  const [details, setDetails] = useState({ full_name: '', phone: '' })
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [notifs, setNotifs] = useState({})
  const [aiOn, setAiOn] = useState(true)
  const [lock, setLock] = useState({ hasPin: false, biometric: false })
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

  useEffect(() => {
    if (!profile) return
    setDetails({ full_name: profile.full_name || '', phone: profile.phone || '' })
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
    if (granted) { app.refreshReminders?.(); registerForPush(); app.say('Notifications enabled on this device') }
    // Not granted and no iOS dialog appeared = either previously declined (fix in
    // iOS Settings) or the notification plugin isn't in this binary (needs a full
    // Xcode package resolve + clean build). Either way, tell the user something.
    else app.say('Not enabled — check iOS Settings → Everstead → Notifications', 'error')
  }

  const saveDetails = async () => {
    if (savingDetails) return
    setSavingDetails(true)
    try { await updateProfile(details); app.say('Details saved') } catch { app.say('Could not save details.', 'error') }
    finally { setSavingDetails(false) }
  }
  const savePassword = async () => {
    setPwMsg(null)
    if (pw.next.length < 8) { setPwMsg({ ok: false, text: 'Use at least 8 characters.' }); return }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return }
    if (app.demo) { setPwMsg({ ok: true, text: 'Password updated.' }); setPw({ next: '', confirm: '' }); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setSavingPw(false)
    if (error) setPwMsg({ ok: false, text: error.message })
    else { setPwMsg({ ok: true, text: 'Password updated.' }); setPw({ next: '', confirm: '' }) }
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
  const turnOffLock = async () => { await clearPasscode(); setLock({ hasPin: false, biometric: false }); app.say('App lock turned off') }

  const referralLink = `https://www.everstead.care/get-started?ref=${profile?.referral_code || profile?.id || ''}`
  const copyReferral = () => {
    if (!navigator.clipboard) { app.say('Could not copy — long-press the link instead.', 'error'); return }
    navigator.clipboard.writeText(referralLink)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) })
      .catch(() => app.say('Could not copy — long-press the link instead.', 'error'))
  }

  const Card = ({ title, children }) => (
    <div className="card-light" style={{ padding: 16, marginBottom: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <SecScreen title="Settings" subtitle={profile?.email} onBack={() => app.go('more')}>
      <Card title="Personal details">
        <label className="flabel" style={{ marginTop: 0 }}>Full name</label>
        <input className="inp" value={details.full_name} onChange={e => setDetails(d => ({ ...d, full_name: e.target.value }))} />
        <label className="flabel">Phone</label>
        <input className="inp" value={details.phone} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} placeholder="Optional" />
        <button className={`btn w100 ${savingDetails ? 'dis' : ''}`} style={{ marginTop: 16 }} onClick={saveDetails} disabled={savingDetails}>{savingDetails ? 'Saving…' : 'Save details'}</button>
      </Card>

      <Card title="Change password">
        <input className="inp" type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder="New password" />
        <div style={{ height: 10 }} />
        <input className="inp" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" />
        {pwMsg && <p style={{ fontSize: 12.5, marginTop: 10, color: pwMsg.ok ? 'var(--color-sage-700)' : '#b91c1c' }}>{pwMsg.text}</p>}
        <button className={`btn w100 ${savingPw ? 'dis' : ''}`} style={{ marginTop: 16 }} onClick={savePassword} disabled={savingPw}>{savingPw ? 'Updating…' : 'Update password'}</button>
      </Card>

      {isNative() && (
        <Card title="App lock">
          {lock.hasPin ? (
            <>
              <div className="fx jb ac">
                <div className="f1"><div className="rname">Passcode</div><div className="rdet">Required each time you open Everstead</div></div>
                <span className="chip chip-sage">On</span>
              </div>
              {bioAvail && (
                <div className="fx jb ac bt" style={{ paddingTop: 12, marginTop: 12 }}>
                  <div className="f1"><div className="rname">Face ID / Touch ID</div><div className="rdet">Unlock without typing your passcode</div></div>
                  <Toggle on={lock.biometric} onChange={toggleBio} />
                </div>
              )}
              <button className="btn w100" style={{ marginTop: 14, background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }} onClick={() => app.go('security')}>Change passcode</button>
              <button
                className="btn w100"
                style={{ marginTop: 8, background: confirmAction === 'lock' ? '#b91c1c' : '#fff', color: confirmAction === 'lock' ? '#fff' : '#b91c1c', border: '1px solid var(--color-stone-200)' }}
                onClick={() => { if (confirmAction === 'lock') { setConfirmAction(null); turnOffLock() } else armConfirm('lock') }}
              >
                {confirmAction === 'lock' ? 'Tap again to turn off' : 'Turn off app lock'}
              </button>
            </>
          ) : (
            <>
              <p className="rdet" style={{ margin: '0 0 12px' }}>Add a passcode (and optional Face ID) so only you can open Everstead on this device.</p>
              <button className="btn w100" onClick={() => app.go('security')}>Set up app lock</button>
            </>
          )}
        </Card>
      )}

      <Card title="Subscription">
        <div className="fx jb ac">
          <div className="f1">
            <div className="rname">{planLabel(profile?.plan || 'free')}</div>
            <div className="rdet" style={{ textTransform: 'capitalize' }}>
              {isPaidPlan(profile?.plan) ? (profile?.subscription_status || '—') : 'Free plan'}
            </div>
          </div>
        </div>
        {!isPaidPlan(profile?.plan) && (
          <button className="btn w100" style={{ marginTop: 14 }} onClick={() => app.go('upgrade')}>
            Upgrade to {planLabel('family')}
          </button>
        )}
      </Card>

      <Card title="AI features">
        <div className="fx jb ac">
          <div className="f1"><div className="rname">AI Assistant</div><div className="rdet">Let Everstead's assistant help organise your affairs</div></div>
          <Toggle on={aiOn} onChange={toggleAi} />
        </div>
      </Card>

      <Card title="Notifications">
        {/* Always rendered on device — deliberately NOT gated on the async status
            check, which can stall if the native plugin is unavailable. Treats
            "unknown" as not-enabled so the Enable button is always reachable. */}
        {isNative() && (
          <div className="fx jb ac" style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--color-stone-100)' }}>
            <div className="f1">
              <div className="rname">This device</div>
              <div className="rdet">
                {notifGranted === true
                  ? 'Notifications are enabled'
                  : notifStatus === 'denied'
                    ? 'Previously declined — iOS won’t re-ask. Turn them on in iOS Settings → Apps → Everstead → Notifications, then reopen the app.'
                    : 'Not enabled — reminders and alerts won’t reach this phone.'}
                {notifStatus && notifGranted !== true && <span style={{ opacity: 0.6 }}> [{notifStatus}]</span>}
              </div>
            </div>
            {notifGranted === true
              ? <span className="chip chip-sage">On</span>
              : <button className="btn btn-sm" style={{ flex: 'none' }} onClick={enableNotifications}>Enable</button>}
          </div>
        )}
        {NOTIFS.map((n, i) => (
          <div key={n.key} className={`fx jb ac ${i ? 'bt' : ''}`} style={{ padding: i ? '12px 0 0' : 0, marginTop: i ? 12 : 0 }}>
            <div className="f1 rname" style={{ fontWeight: 400 }}>{n.label}</div>
            <Toggle on={!!notifs[n.key]} onChange={() => toggleNotif(n.key)} />
          </div>
        ))}
      </Card>

      <Card title="Refer a friend">
        <p className="rdet" style={{ margin: '0 0 10px' }}>Your friend gets a 21-day free trial instead of 14.</p>
        <div className="fx gap12 ac">
          <input className="inp" readOnly value={referralLink} style={{ fontSize: 12 }} />
          <button className="btn btn-sm" style={{ flex: 'none' }} onClick={copyReferral}>{copied ? 'Copied' : 'Copy'}</button>
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
        {confirmAction === 'signout' ? 'Tap again to sign out' : 'Sign out'}
      </button>

      {isNative() && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-stone-400)', margin: '16px 0 0' }}>
          Everstead · {APP_BUILD}
        </p>
      )}
    </SecScreen>
  )
}
