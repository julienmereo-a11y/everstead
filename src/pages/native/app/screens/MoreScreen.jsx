import React from 'react'
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
  { key: 'aboutme',      label: 'About Me',        sub: 'Your story, for the people you love', Icon: UserIcon },
  { key: 'messages',     label: 'Personal Messages', sub: 'Sealed letters and notes',          Icon: MessageIcon },
  { key: 'instructions', label: 'Instructions',    sub: 'Step-by-step guidance for your family', Icon: ListIcon },
  { key: 'wishes',       label: 'Wishes',          sub: 'Funeral and personal wishes',          Icon: HeartIcon },
  { key: 'subscriptions',label: 'Subscriptions',   sub: 'Recurring payments to manage',         Icon: CardIcon },
  { key: 'alerts',       label: 'Alerts',          sub: 'Things that need your attention',       Icon: BellIcon },
  { key: 'activity',     label: 'Activity',        sub: 'Everything that has changed',           Icon: ClockIcon },
  { key: 'assistant',    label: 'AI Assistant',    sub: 'Get help organising your affairs',      Icon: SparkIcon },
  { key: 'resources',    label: 'Help & Resources', sub: 'Guides for every part of your plan',   Icon: BookIcon },
  { key: 'settings',     label: 'Settings',        sub: 'Account, security and preferences',     Icon: GearIcon },
]

export default function MoreScreen({ app }) {
  const auth = useAuth()
  const profile = app.profile || auth.profile
  return (
    <div className="scr">
      <div className="head">
        <div className="fx ac gap12">
          <button onClick={() => app.go('home')} aria-label="Back" style={{ background: 'none', border: 0, padding: 0, color: 'var(--color-stone-500)', cursor: 'pointer' }}>
            <BackIcon />
          </button>
          <h1 className="h1" style={{ fontSize: 26 }}>More</h1>
        </div>
      </div>
      <div className="pad">
        <div className="card-light fx ac gap12" style={{ padding: 16, marginBottom: 18 }}>
          <span className="avatar avatar-round" style={{ width: 44, height: 44 }}>{initialsOf(profile?.full_name || 'You')}</span>
          <div className="f1">
            <div className="rname">{profile?.full_name || 'Your account'}</div>
            <div className="rdet">{profile?.email}</div>
          </div>
        </div>

        <div className="card-light ohide">
          {ITEMS.filter(it => it.key !== 'assistant' || profile?.ai_features_enabled !== false).map((it, i) => {
            const locked = it.key === 'messages' && !canUseFeature(profile?.plan, 'personalMessages')
            return (
              <div key={it.key} className={`row ${i === 0 ? '' : 'bt'}`} onClick={() => app.go(it.key)}>
                <span className="dicon" style={{ background: 'var(--color-navy-50)', color: 'var(--color-navy-700)' }}><it.Icon /></span>
                <div className="f1"><div className="rname">{it.label}</div><div className="rdet">{it.sub}</div></div>
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
