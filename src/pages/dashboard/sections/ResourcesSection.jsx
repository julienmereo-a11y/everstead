// Help and Resources: the in-dashboard guides.
//
import React, { useState } from 'react'
import { SectionShell } from '../../dashboard/ui'
import { BookOpen, ChevronRight, ExternalLink, FileText, Landmark, MessageSquare, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export const OWNER_GUIDES = [
  {
    id: 'accounts',
    icon: Landmark,
    color: 'bg-blue-50 text-blue-700',
    items: ['bank', 'savings', 'pensions', 'investments', 'property', 'insurance', 'digital', 'subscriptions'],
  },
  {
    id: 'documents',
    icon: FileText,
    color: 'bg-emerald-50 text-emerald-700',
    items: ['will', 'lpa', 'identity', 'certificates', 'deeds', 'insurance', 'funeral', 'letterOfWishes'],
  },
  {
    id: 'people',
    icon: Users,
    color: 'bg-violet-50 text-violet-700',
    items: ['executor', 'lpaHolder', 'nextOfKin', 'solicitor', 'adviser', 'accountant', 'accessLevel'],
  },
  {
    id: 'instructions',
    icon: BookOpen,
    color: 'bg-amber-50 text-amber-700',
    items: ['first48', 'funeral', 'digital', 'property', 'business', 'messages'],
  },
  {
    id: 'messages',
    icon: MessageSquare,
    color: 'bg-rose-50 text-rose-700',
    items: ['what', 'when', 'write', 'plan'],
  },
]

export function OwnerResourceCard({ guide, expanded, onToggle }) {
  const { t } = useTranslation('dashboard')
  const Icon = guide.icon
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-stone-50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${guide.color}`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-900 text-sm">{t(`resources.guides.${guide.id}.title`)}</p>
          <p className="text-xs text-stone-400 mt-0.5">{t('resources.topics', { count: guide.items.length })}</p>
        </div>
        <ChevronRight size={16} className={`text-stone-400 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-stone-100 divide-y divide-stone-50">
          {guide.items.map(itemId => (
            <div key={itemId} className="px-6 py-4">
              <p className="text-sm font-semibold text-navy-800 mb-1">{t(`resources.guides.${guide.id}.items.${itemId}.label`)}</p>
              <p className="text-sm text-stone-500 leading-relaxed">{t(`resources.guides.${guide.id}.items.${itemId}.detail`)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ResourcesSection() {
  const { t } = useTranslation('dashboard')
  const [expandedIndex, setExpandedIndex] = useState(null)
  const toggle = i => setExpandedIndex(v => v === i ? null : i)

  return (
    <SectionShell
      title={t('resources.title')}
      subtitle={t('resources.subtitle')}
    >
      <div className="space-y-3">
        {OWNER_GUIDES.map((guide, i) => (
          <OwnerResourceCard
            key={guide.id}
            guide={guide}
            expanded={expandedIndex === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>

      <div className="mt-6 bg-navy-50 border border-navy-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-navy-900 text-sm">{t('resources.needHelp')}</p>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{t('resources.needHelpBody')}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <a href="mailto:support@everstead.care" className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-300 rounded-full px-3 py-2 hover:bg-navy-100 transition-colors">
            <MessageSquare size={13} /> {t('resources.emailSupport')}
          </a>
          <a href="/resources" className="inline-flex items-center gap-2 text-xs font-semibold text-navy-700 border border-navy-300 rounded-full px-3 py-2 hover:bg-navy-100 transition-colors">
            <ExternalLink size={13} /> {t('resources.resourcesLink')}
          </a>
        </div>
      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// SETTINGS SECTION
// ─────────────────────────────────────────────────────────────
