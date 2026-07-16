import React from 'react'
import { useAlerts } from '../../../../hooks/useData'
import { relativeTime } from '../helpers'
import SecScreen, { Busy } from '../components/SecScreen'

// Human labels — never show a raw enum to the user; critical gets a visually
// distinct (amber) chip so it doesn't read the same as a routine warning.
const SEV = {
  critical: { label: 'Urgent', style: { background: '#fef3c7', color: '#92400e' } },
  warning:  { label: 'Review', cls: 'chip-stone' },
  info:     { label: 'Note',   cls: 'chip-navy' },
}

export default function AlertsScreen({ app }) {
  const live = useAlerts()
  const data = app.demo ? app.demoData.alerts : live.data
  const loading = app.demo ? false : live.loading
  const markRead = app.demo ? (id) => app.demoUpdate('alerts', id, { is_read: true }) : live.markRead
  const markAllRead = app.demo ? () => data.forEach(a => app.demoUpdate('alerts', a.id, { is_read: true })) : live.markAllRead
  const unreadCount = app.demo ? data.filter(a => !a.is_read).length : live.unreadCount
  return (
    <SecScreen
      title="Alerts"
      subtitle={loading ? '' : `${unreadCount} unread`}
      onBack={() => app.go('more')}
      action={unreadCount > 0 ? <button className="btn btn-sm" onClick={() => { markAllRead(); app.say('All alerts marked as read') }}>Mark all read</button> : null}
    >
      {loading ? (
        <Busy />
      ) : data.length === 0 ? (
        <div className="card-light" style={{ padding: 18 }}><p className="rdet" style={{ margin: 0 }}>No alerts — you're all clear.</p></div>
      ) : (
        <div className="card-light ohide">
          {data.map((a, i) => (
            <div key={a.id} className={`row ${i === 0 ? '' : 'bt'}`} style={{ alignItems: 'flex-start', opacity: a.is_read ? 0.55 : 1 }} onClick={() => !a.is_read && markRead(a.id)}>
              <div className="f1">
                <div className="rname">{a.title}</div>
                {a.detail && <div className="rdet">{a.detail}</div>}
                <div className="awhen" style={{ marginTop: 4 }}>{relativeTime(a.created_at)}</div>
              </div>
              <span className={`chip ${(SEV[a.severity] || SEV.warning).cls || ''}`} style={(SEV[a.severity] || SEV.warning).style}>{(SEV[a.severity] || SEV.warning).label}</span>
            </div>
          ))}
        </div>
      )}
    </SecScreen>
  )
}
