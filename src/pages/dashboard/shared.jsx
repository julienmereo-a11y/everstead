// Vocabulary and styling that more than one dashboard section needs.
//
// Two clusters: the document/alert status colours, and the access-control model
// (who a trusted person is, what they can reach, and when). Both are referenced
// from several sections, so they live here rather than in whichever section
// happened to define them first.
//
import React from 'react'
import { PLAN_LABELS, planLabel } from '../../config/pricing'
import i18n from '../../i18n'
import { Checkbox } from '../dashboard/ui'
import { AlertCircle, AlertTriangle, BookOpen, CreditCard, FileText, Info, Landmark, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export const STATUS_STYLES = {
  current:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  expiring: 'bg-amber-50  text-amber-700  border-amber-200',
  missing:  'bg-red-50    text-red-700    border-red-200',
  expired:  'bg-stone-100 text-stone-500  border-stone-200',
}

export const SEVERITY_STYLES = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',    icon: AlertCircle },
  warning:  { bar: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  info:     { bar: 'bg-sky-400',    badge: 'bg-sky-50  text-sky-700  border-sky-200',   icon: Info },
}

// ─────────────────────────────────────────────────────────────
// TRIAL HELPERS
// ─────────────────────────────────────────────────────────────

export function friendlyLimitError(err, fallback) {
  const raw = err?.message || ''
  if (err?.code === '42501' || /row-level security/i.test(raw)) {
    return i18n.t('dashboard:shell.limitError', { freePlan: PLAN_LABELS.free, plusPlan: PLAN_LABELS.family })
  }
  return raw || fallback
}

export function PlanLimitNotice({ plan, limit, noun, benefit, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  const isFree = plan === 'free'
  // `noun` is a stable id ('account' | 'document') used only to pick the translated noun.
  const nounSingular = t(`overview.planLimit.noun.${noun}`, { count: 1 })
  const nounPlural   = t(`overview.planLimit.noun.${noun}`, { count: limit })
  return (
    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3 mb-4">
      {isFree
        ? t('overview.planLimit.freeIntro', { plan: PLAN_LABELS.free, limit, nounSingular, nounPlural })
        : t('overview.planLimit.reachedIntro', { plan: planLabel(plan), limit, nounSingular, nounPlural })}{' '}
      <button onClick={onUpgrade} className="font-semibold underline underline-offset-2 hover:text-amber-900">
        {t('overview.planLimit.upgradeCta', { plan: PLAN_LABELS.family })}
      </button>{' '}
      {benefit}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────
// ACCOUNTS SECTION
// ─────────────────────────────────────────────────────────────

export const ACCESS_AREAS = [
  {
    key: 'accounts', icon: Landmark,
    subKey: 'accountCategories',
    subOptions: ['Banking', 'Retirement', 'Investment', 'Insurance', 'Digital', 'Property', 'Other'],
  },
  {
    key: 'documents', icon: FileText,
    subKey: 'documentTypes',
    subOptions: ['Legal', 'Insurance', 'Property', 'Medical', 'Personal', 'Financial', 'Other'],
  },
  { key: 'messages',      icon: MessageSquare },
  { key: 'instructions',  icon: BookOpen },
  { key: 'subscriptions', icon: CreditCard },
]

export const ALL_AREA_KEYS = ACCESS_AREAS.map(a => a.key)

// Stored person.role values paired with the id used to look up their label.
// The value is what goes to the database, the id only picks the translation.

export const PERSON_ROLES = [
  { group: 'full',         value: 'Spouse / Partner',   id: 'spousePartner' },
  { group: 'estate',       value: 'Primary Executor',   id: 'primaryExecutor' },
  { group: 'estate',       value: 'Secondary Executor', id: 'secondaryExecutor' },
  { group: 'estate',       value: 'Solicitor',          id: 'solicitor' },
  { group: 'family',       value: 'Family Member',      id: 'familyMember' },
  { group: 'family',       value: 'Family Caretaker',   id: 'familyCaretaker' },
  { group: 'professional', value: 'Financial Adviser',  id: 'financialAdviser' },
  { group: 'professional', value: 'Healthcare Proxy',   id: 'healthcareProxy' },
]

export const ROLE_GROUP_KEYS = ['full', 'estate', 'family', 'professional']

export const FULL_ACCESS_ROLE = 'Spouse / Partner'

// Display label for a stored role value. Unknown/legacy values render as stored.

export function roleLabel(t, value) {
  const match = PERSON_ROLES.find(r => r.value === value)
  return match ? t(`people.role.${match.id}`) : value
}

// Stored access_grants.accessTiming values paired with their label id.

export const ACCESS_TIMINGS = [
  { value: 'always',      id: 'always' },
  { value: 'after_death', id: 'afterDeath' },
]

// Checkbox with tick mark
