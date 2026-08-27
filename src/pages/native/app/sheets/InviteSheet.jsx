import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { CheckIcon } from '../icons'

// Invite a trusted person — mirrors the website's PersonAccessForm (Dashboard.jsx):
// grouped roles, per-area access selection (skipped for Spouse / Partner, who get
// full access), and access timing. Writes the same access_grants JSONB shape the
// web uses: { accessAreas, accountCategories, documentTypes, accessTiming }.
// Role VALUES are stored in the database in English (same as the website);
// only the label a person reads is translated, via the roles.* map.
const ROLE_GROUPS = [
  { labelKey: 'invite.groupFull',   roles: ['Spouse / Partner'] },
  { labelKey: 'invite.groupEstate', roles: ['Primary Executor', 'Secondary Executor', 'Solicitor'] },
  { labelKey: 'invite.groupFamily', roles: ['Family Member', 'Family Caretaker'] },
  { labelKey: 'invite.groupPro',    roles: ['Financial Adviser', 'Healthcare Proxy'] },
]

const ACCESS_AREAS = [
  { key: 'accounts',      labelKey: 'invite.areaAccounts',      descKey: 'invite.areaAccountsDesc' },
  { key: 'documents',     labelKey: 'invite.areaDocuments',     descKey: 'invite.areaDocumentsDesc' },
  { key: 'messages',      labelKey: 'invite.areaMessages',      descKey: 'invite.areaMessagesDesc' },
  { key: 'instructions',  labelKey: 'invite.areaInstructions',  descKey: 'invite.areaInstructionsDesc' },
  { key: 'subscriptions', labelKey: 'invite.areaSubscriptions', descKey: 'invite.areaSubscriptionsDesc' },
]
const ALL_AREA_KEYS = ACCESS_AREAS.map(a => a.key)

const TIMING = [
  { value: 'always',      labelKey: 'invite.timingAlwaysLabel', descKey: 'invite.timingAlwaysDesc' },
  { value: 'after_death', labelKey: 'invite.timingAfterLabel',  descKey: 'invite.timingAfterDesc' },
]

export default function InviteSheet({ app }) {
  const { t } = useTranslation('mobile')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [areas, setAreas] = useState([])
  const [timing, setTiming] = useState('always')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const isFullAccess = role === 'Spouse / Partner'
  const toggleArea = (key) => setAreas(a => a.includes(key) ? a.filter(k => k !== key) : [...a, key])

  const canSubmit = name.trim() && email.trim() && role && (isFullAccess || areas.length > 0) && !busy

  const submit = async () => {
    if (!name.trim() || !email.trim() || !role) return
    if (!isFullAccess && areas.length === 0) { setError(t('invite.pickOneArea')); return }
    setError(null); setBusy(true)
    try {
      await app.invitePerson({
        name: name.trim(), email: email.trim(), role,
        accessAreas: isFullAccess ? ALL_AREA_KEYS : areas,
        accessTiming: timing,
      })
    } finally { setBusy(false) }
  }

  return (
    <>
      <h3 className="sh-title">{t('invite.title')}</h3>
      <label className="flabel">{t('invite.fullName')}</label>
      <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder={t('invite.namePh')} />
      <label className="flabel">{t('invite.email')}</label>
      <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@example.com" />

      <label className="flabel">{t('invite.role')}</label>
      <select className="inp" value={role} onChange={e => { setRole(e.target.value); setAreas([]); setError(null) }}>
        <option value="" disabled>{t('invite.selectRole')}</option>
        {ROLE_GROUPS.map(g => (
          <optgroup key={g.labelKey} label={t(g.labelKey)}>
            {g.roles.map(r => <option key={r} value={r}>{t('roles.' + r, { defaultValue: r })}</option>)}
          </optgroup>
        ))}
      </select>

      {role && (isFullAccess ? (
        <div className="fx" style={{ alignItems: 'flex-start', gap: 8, background: 'var(--color-sage-50)', border: '1px solid var(--color-sage-200)', borderRadius: 12, padding: '11px 13px', marginTop: 14 }}>
          <span className="ck on" style={{ width: 18, height: 18, marginTop: 1 }}><CheckIcon on /></span>
          <p style={{ fontSize: 12.5, color: 'var(--color-sage-800)', lineHeight: 1.5, margin: 0 }}>
            <strong>{t('invite.fullAccessNoteTitle')}</strong>{t('invite.fullAccessNote')}
          </p>
        </div>
      ) : (
        <>
          <label className="flabel">{t('invite.accessAreas')}</label>
          <p style={{ fontSize: 12, color: 'var(--color-stone-400)', margin: '0 0 8px' }}>{t('invite.accessAreasHint')}</p>
          <div className="fx col" style={{ gap: 8 }}>
            {ACCESS_AREAS.map(area => {
              const on = areas.includes(area.key)
              return (
                <button key={area.key} type="button" onClick={() => toggleArea(area.key)}
                  className="fx ac gap12" style={{ textAlign: 'left', width: '100%', padding: '11px 13px', borderRadius: 12, cursor: 'pointer',
                    border: on ? '1px solid var(--color-navy-300)' : '1px solid var(--color-stone-200)',
                    background: on ? 'var(--color-navy-50)' : '#fff' }}>
                  <span className={`ck ${on ? 'on' : ''}`} style={{ width: 20, height: 20 }}><CheckIcon on={on} /></span>
                  <span className="f1" style={{ minWidth: 0 }}>
                    <span className="rname" style={{ display: 'block' }}>{t(area.labelKey)}</span>
                    <span className="rdet">{t(area.descKey)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      ))}

      {role && (
        <>
          <label className="flabel">{t('invite.whenAccess')}</label>
          <div className="fx" style={{ gap: 8 }}>
            {TIMING.map(opt => {
              const sel = timing === opt.value
              return (
                <button key={opt.value} type="button" onClick={() => setTiming(opt.value)}
                  className="f1" style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    border: sel ? '1px solid var(--color-navy-300)' : '1px solid var(--color-stone-200)',
                    background: sel ? 'var(--color-navy-50)' : '#fff' }}>
                  <span className="fx ac" style={{ gap: 7, marginBottom: 3 }}>
                    <span className={`ck ${sel ? 'on' : ''}`} style={{ width: 16, height: 16 }}><CheckIcon on={sel} /></span>
                    <span className="rname" style={{ fontSize: 12.5 }}>{t(opt.labelKey)}</span>
                  </span>
                  <span className="rdet" style={{ fontSize: 11, display: 'block' }}>{t(opt.descKey)}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {error && <p style={{ color: '#b91c1c', fontSize: 12.5, marginTop: 12 }}>{error}</p>}

      <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 16 }} onClick={submit}>
        {busy ? t('invite.sending') : t('invite.sendInvite')}
      </button>
    </>
  )
}
