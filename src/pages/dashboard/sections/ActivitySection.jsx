// Activity: the audit trail of what happened on the account and who did it.
//
import React from 'react'
import i18n from '../../../i18n'
import { EmptyState, LoadingSpinner, SectionShell } from '../../dashboard/ui'
import { Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export const ACTIVITY_ACTIONS = [
  { value: 'account.created',      id: 'accountCreated' },
  { value: 'account.updated',      id: 'accountUpdated' },
  { value: 'account.deleted',      id: 'accountDeleted' },
  { value: 'document.uploaded',    id: 'documentUploaded' },
  { value: 'document.updated',     id: 'documentUpdated' },
  { value: 'document.deleted',     id: 'documentDeleted' },
  { value: 'person.invited',       id: 'personInvited' },
  { value: 'person.updated',       id: 'personUpdated' },
  { value: 'person.removed',       id: 'personRemoved' },
  { value: 'instruction.created',  id: 'instructionCreated' },
  { value: 'instruction.updated',  id: 'instructionUpdated' },
  { value: 'instruction.deleted',  id: 'instructionDeleted' },
  { value: 'subscription.created', id: 'subscriptionCreated' },
  { value: 'subscription.updated', id: 'subscriptionUpdated' },
  { value: 'subscription.deleted', id: 'subscriptionDeleted' },
  { value: 'message.created',      id: 'messageCreated' },
  { value: 'message.updated',      id: 'messageUpdated' },
  { value: 'message.released',     id: 'messageReleased' },
  { value: 'message.deleted',      id: 'messageDeleted' },
  { value: 'profile.updated',      id: 'profileUpdated' },
]

// Display label for a stored action. Unknown values keep the previous rendering.

export function activityActionLabel(t, action) {
  const match = ACTIVITY_ACTIONS.find(a => a.value === action)
  return match ? t(`activity.action.${match.id}`) : String(action ?? '').replace('.', ' ')
}

export function ActivitySection({ activity, loading }) {
  const { t } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  return (
    <SectionShell title={t('activity.title')} subtitle={t('activity.subtitle')}>
      {loading ? <LoadingSpinner /> : activity.length === 0 ? (
        <EmptyState icon={Activity} label={t('activity.empty')} action={t('activity.emptyAction')} />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-50">
          {activity.map(event => (
            <div key={event.id} className="flex items-start gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={14} className="text-navy-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-navy-800">
                  <span className="font-medium">{activityActionLabel(t, event.action)}</span>
                  {event.resource_name && <span className="text-stone-500">{t('activity.resourceSuffix', { name: event.resource_name })}</span>}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {new Date(event.created_at).toLocaleString(dateLocale)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// RESOURCES SECTION (owner)
// ─────────────────────────────────────────────────────────────
// Guide structure only. `id` picks the translated title and `items` are the
// translated label/detail pairs under resources.guides.<id>.items.<itemId>.
