import React from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { PlusIcon } from '../icons'
import { useAuth } from '../../../../contexts/AuthContext'
import { artwork } from '../components/Brand'

// Family — the owner plus real trusted people (trusted_people via usePeople),
// with access chips derived from access_grants / invite_status.
export default function FamilyScreen({ app }) {
  const { t } = useTranslation('mobile')
  const { membersV, famSub, openInvite } = app
  const auth = useAuth()
  const profile = app.profile || auth.profile
  // "The Whitmores" from the member's own surname: purely presentational, needs
  // at least two words in the name, otherwise the neutral fallback.
  const words = (profile?.full_name || '').trim().split(/\s+/).filter(Boolean)
  const surname = words.length >= 2 ? words[words.length - 1] : ''
  const familyName = !surname ? t('family.bannerFallback')
    : /s$/i.test(surname) ? t('family.bannerNameS', { surname }) : t('family.bannerName', { surname })
  return (
    <div className="scr">
      <div className="fam-banner">
        <img {...artwork('family-wide')} alt="" aria-hidden="true" />
        <div className="fam-shade" />
        <div className="fam-copy">
          <div className="eyebrow eyebrow-sage" style={{ margin: 0 }}>{t('family.title')}</div>
          <h1 className="serif fam-name">{familyName}</h1>
          <p className="fam-line">{t('family.bannerLine')}</p>
        </div>
      </div>
      <div className="fx jb ac" style={{ padding: '14px 20px 0', gap: 12 }}>
        <p className="sub" style={{ margin: 0 }}>{famSub}</p>
        <button className="btn btn-sm" onClick={openInvite}><PlusIcon />{t('family.invite')}</button>
      </div>
      <div className="pad" style={{ paddingTop: 14 }}>
        <div className="card-light ohide">
          {membersV.map((m, i) => (
            <div key={m.id} className={`row ${i === 0 ? '' : 'bt'}`} style={{ cursor: 'default' }}>
              <span className="avatar avatar-round">{m.initials}</span>
              <div className="f1"><div className="rname">{m.name}</div><div className="rdet">{m.rel}</div></div>
              <span className={`chip ${m.chipCls}`}>{m.access}</span>
            </div>
          ))}
        </div>
        <div className="note">
          {t('family.note')}
        </div>
      </div>
    </div>
  )
}
