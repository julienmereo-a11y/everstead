import React from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n'
import { useAuth } from '../../../../contexts/AuthContext'
import {
  BackIcon, UserIcon, MessageIcon, ListIcon, HeartIcon, CardIcon,
  BellIcon, ClockIcon, SparkIcon, BookIcon, GearIcon, ChevronIcon,
} from '../icons'
import { initialsOf } from '../helpers'
import { canUseFeature } from '../../../../lib/planLimits'
import { planLabel } from '../../../../config/pricing'

// The "More" hub — reached from the Home header avatar. Links to every
// web-parity section not on the 5-tab bar.
const ITEMS = [
  { key: 'aboutme',       Icon: UserIcon },
  { key: 'messages',      Icon: MessageIcon },
  { key: 'instructions',  Icon: ListIcon },
  { key: 'wishes',        Icon: HeartIcon },
  { key: 'subscriptions', Icon: CardIcon },
  { key: 'alerts',        Icon: BellIcon },
  { key: 'activity',      Icon: ClockIcon },
  { key: 'assistant',     Icon: SparkIcon },
  { key: 'resources',     Icon: BookIcon },
  { key: 'settings',      Icon: GearIcon },
]

export default function MoreScreen({ app }) {
  const { t } = useTranslation('mobile')
  const auth = useAuth()
  const profile = app.profile || auth.profile
  return (
    <div className="scr">
      <div className="head">
        <div className="fx ac gap12">
          <button onClick={() => app.go('home')} aria-label="Back" style={{ background: 'none', border: 0, padding: 0, color: 'var(--color-stone-500)', cursor: 'pointer' }}>
            <BackIcon />
          </button>
          <h1 className="h1" style={{ fontSize: 26 }}>{t('more.title')}</h1>
        </div>
      </div>
      <div className="pad">
        <div className="card-light fx ac gap12" style={{ padding: 16, marginBottom: 18 }}>
          <span className="avatar avatar-round" style={{ width: 44, height: 44 }}>{initialsOf(profile?.full_name || t('shell.youRow'))}</span>
          <div className="f1">
            <div className="rname">{profile?.full_name || t('more.yourAccount')}</div>
            <div className="rdet">{profile?.email}</div>
          </div>
        </div>

        <div className="card-light ohide">
          {ITEMS.filter(it => it.key !== 'assistant' || profile?.ai_features_enabled !== false).map((it, i) => {
            const locked = it.key === 'messages' && !canUseFeature(profile?.plan, 'personalMessages')
            return (
              <div key={it.key} className={`row ${i === 0 ? '' : 'bt'}`} onClick={() => app.go(it.key)}>
                <span className="dicon" style={{ background: 'var(--color-navy-50)', color: 'var(--color-navy-700)' }}><it.Icon /></span>
                <div className="f1"><div className="rname">{t('more.' + it.key)}</div><div className="rdet">{t('more.' + it.key + 'Sub')}</div></div>
                {locked && <span className="chip chip-sage" style={{ marginRight: 4 }}>{planLabel('family')}</span>}
                <ChevronIcon />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
