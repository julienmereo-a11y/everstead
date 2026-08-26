// Alerts: things needing the member attention, ordered by severity.
//
import React, { useState } from 'react'
import i18n from '../../../i18n'
import { SEVERITY_STYLES } from '../../dashboard/shared'
import { EmptyState, SectionShell, secondaryBtn } from '../../dashboard/ui'
import { Bell, CheckCheck, CheckCircle2, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export function AlertsSection({ alerts, markRead, markAllRead }) {
  const { t } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const [expanded, setExpanded] = useState(null)
  const unread = alerts.filter(a => !a.is_read).length

  return (
    <SectionShell
      title={t('alerts.title')}
      subtitle={unread > 0 ? t('alerts.unread', { count: unread }) : t('alerts.allCaughtUp')}
      action={
        unread > 0
          ? <button onClick={markAllRead} className={secondaryBtn}><CheckCheck size={15} />{t('alerts.markAllRead')}</button>
          : null
      }
    >
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <EmptyState icon={Bell} label={t('alerts.empty')} action={t('alerts.emptyAction')} />
        ) : alerts.map(a => {
          const { bar, badge, icon: Icon } = SEVERITY_STYLES[a.severity]
          const isExpanded = expanded === a.id
          return (
            <div
              key={a.id}
              className={`bg-white border rounded-xl overflow-hidden transition-all ${
                a.is_read ? 'border-stone-100 opacity-60' : 'border-stone-200'
              } ${isExpanded ? 'shadow-sm' : ''}`}
            >
              {/* Summary row — click to expand */}
              <button
                type="button"
                className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : a.id)}
              >
                <div className={`w-1 rounded-full self-stretch shrink-0 ${bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`font-medium text-sm ${a.is_read ? 'text-stone-500' : 'text-navy-900'}`}>{a.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* severity VALUES are stored, only the badge label translates. */}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge}`}>{t(`alerts.severity.${a.severity}`, { defaultValue: a.severity })}</span>
                      {!a.is_read && <span className="w-2 h-2 rounded-full bg-navy-600 shrink-0" />}
                      <ChevronRight size={14} className={`text-stone-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </p>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-stone-100 space-y-3">
                  {a.detail && (
                    <p className="text-sm text-stone-600 leading-relaxed">{a.detail}</p>
                  )}
                  {!a.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(a.id) }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-navy-200 bg-navy-50 hover:bg-navy-100 px-3 py-2 rounded-full transition-colors"
                    >
                      <CheckCircle2 size={13} /> {t('alerts.markRead')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY SECTION
// ─────────────────────────────────────────────────────────────
// Stored activity_log.action values paired with the id used to look up their label.
// Anything not listed (server-added actions) falls back to the raw stored value.
