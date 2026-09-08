// The client's side of the adviser link: who their firm is, and exactly what
// that firm may see. Two cards share one hook so Overview and Settings never
// disagree about the current consent.
//
// The firm can NEVER widen its own access. Every flag here is written by the
// member, under RLS that pins the row to the firm their profile is linked to.
//
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BookOpen, Briefcase, Check, Eye, EyeOff, FileText, Loader2, Mail, Users, Wallet } from 'lucide-react'
import { DEMO_ADVISER_CONSENTS, DEMO_ADVISER_FIRM } from '../../../lib/demoData'
import { primaryBtn } from '../../dashboard/ui'

export const ADVISER_SECTIONS = [
  { key: 'accounts',     icon: Wallet },
  { key: 'documents',    icon: FileText },
  { key: 'instructions', icon: BookOpen },
  { key: 'people',       icon: Users },
  { key: 'alerts',       icon: Bell },
]

const EMPTY = { accounts: false, documents: false, instructions: false, people: false, alerts: false, notify_on_activation: false, updated_at: null }

const fromRow = (c) => c ? {
  accounts:             !!c.share_accounts,
  documents:            !!c.share_documents,
  instructions:         !!c.share_instructions,
  people:               !!c.share_people,
  alerts:               !!c.share_alerts,
  notify_on_activation: !!c.notify_on_activation,
  updated_at:           c.updated_at ?? null,
} : EMPTY

const FIRM_LABEL_KEY = { solicitor: 'labelSolicitor', notaire: 'labelNotaire', ifa: 'labelIfa', accountant: 'labelAccountant', wealth: 'labelWealth' }
export const firmLabel = (t, firm) => t(`adviser.${FIRM_LABEL_KEY[firm?.firm_type] || 'labelOther'}`)

/**
 * Loads the member's firm and consent row. Nothing is fetched for members
 * without profiles.adviser_id, which is almost everyone.
 */
export function useAdviserLink(profile, isDemo) {
  const linked = isDemo || !!profile?.adviser_id
  const [firm, setFirm]         = useState(isDemo ? DEMO_ADVISER_FIRM : null)
  const [consents, setConsents] = useState(isDemo ? DEMO_ADVISER_CONSENTS : EMPTY)
  const [loading, setLoading]   = useState(linked && !isDemo)

  useEffect(() => {
    if (isDemo) return
    if (!profile?.adviser_id) { setFirm(null); setConsents(EMPTY); setLoading(false); return }
    let active = true
    setLoading(true)
    import('../../../lib/supabase').then(async ({ supabase: sb }) => {
      const [firmRes, consentRes] = await Promise.all([
        sb.rpc('get_my_adviser_firm'),
        sb.from('adviser_client_consents').select('*').eq('client_id', profile.id).maybeSingle(),
      ])
      if (!active) return
      const row = Array.isArray(firmRes.data) ? firmRes.data[0] : firmRes.data
      setFirm(row || null)
      setConsents(fromRow(consentRes.data))
      setLoading(false)
    }).catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [profile?.id, profile?.adviser_id, isDemo])

  const save = async (next) => {
    if (isDemo) { setConsents({ ...next, updated_at: new Date().toISOString() }); return }
    const { supabase: sb } = await import('../../../lib/supabase')
    const { data, error } = await sb.from('adviser_client_consents').upsert({
      client_id:            profile.id,
      adviser_id:           profile.adviser_id,
      share_accounts:       !!next.accounts,
      share_documents:      !!next.documents,
      share_instructions:   !!next.instructions,
      share_people:         !!next.people,
      share_alerts:         !!next.alerts,
      notify_on_activation: !!next.notify_on_activation,
    }, { onConflict: 'client_id' }).select().single()
    if (error) throw error
    setConsents(fromRow(data))
  }

  return { firm, consents, loading, save, linked }
}

// ── Overview: who the firm is, what they see, one button to change it ────────
export function AdviserOverviewCard({ adviser, onNavigate }) {
  const { t } = useTranslation('dashboard')
  const firm = adviser?.firm
  if (!firm) return null
  const shared = ADVISER_SECTIONS.filter(s => adviser.consents[s.key]).map(s => t(`adviser.settings.sections.${s.key}.label`))
  const goToSettings = () => {
    onNavigate?.('settings')
    setTimeout(() => document.getElementById('adviser-sharing')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
  }
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
      {firm.logo_url ? (
        <img src={firm.logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-stone-50 border border-stone-200 shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
          <Briefcase size={20} className="text-navy-700" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">{firmLabel(t, firm)}</p>
        <p className="font-semibold text-navy-950 text-base leading-tight mt-0.5">{firm.firm_name}</p>
        <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
          {shared.length ? t('adviser.overview.sharing', { sections: shared.join(', ') }) : t('adviser.overview.sharingNone')}
          {adviser.consents.notify_on_activation && <> {t('adviser.overview.notify')}</>}
        </p>
        {(firm.contact_name || firm.contact_email) && (
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 min-w-0">
            <Mail size={12} className="shrink-0 text-stone-400" />
            <span className="truncate">
              {firm.contact_name}{firm.contact_name && firm.contact_email ? ' · ' : ''}
              {firm.contact_email && <a href={`mailto:${firm.contact_email}`} className="underline hover:text-navy-700">{firm.contact_email}</a>}
            </span>
          </p>
        )}
      </div>
      <button
        onClick={goToSettings}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-navy-200 rounded-full px-3.5 py-2 hover:bg-navy-50 transition-colors"
      >
        <Eye size={13} /> {t('adviser.overview.manage')}
      </button>
    </div>
  )
}

// ── Settings: the switches themselves ────────────────────────────────────────
export function AdviserSharingCard({ adviser, isDemo }) {
  const { t, i18n } = useTranslation('dashboard')
  const firm = adviser?.firm
  const [draft, setDraft]   = useState(adviser?.consents ?? EMPTY)
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  useEffect(() => { setDraft(adviser?.consents ?? EMPTY) }, [adviser?.consents])
  if (!firm) return null

  const dirty = ADVISER_SECTIONS.some(s => !!draft[s.key] !== !!adviser.consents[s.key])
    || !!draft.notify_on_activation !== !!adviser.consents.notify_on_activation
  const toggle = (key) => { setDraft(d => ({ ...d, [key]: !d[key] })); if (status !== 'idle') setStatus('idle') }
  const submit = async (e) => {
    e.preventDefault()
    setStatus('saving')
    try { await adviser.save(draft); setStatus('saved') }
    catch { setStatus('error') }
  }
  const lastChanged = adviser.consents.updated_at
    ? new Intl.DateTimeFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'long' }).format(new Date(adviser.consents.updated_at))
    : null

  return (
    <div id="adviser-sharing" className="bg-white border border-stone-200 rounded-2xl p-6">
      <h2 className="font-semibold text-navy-950 text-sm mb-1 flex items-center gap-2">
        <Briefcase size={15} className="text-navy-600" /> {t('adviser.settings.heading')}
        <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">{firmLabel(t, firm)}</span>
      </h2>
      <p className="text-xs text-stone-500 mb-5 leading-relaxed">{t('adviser.settings.body', { firm: firm.firm_name })}</p>

      <form onSubmit={submit} className="space-y-3">
        {ADVISER_SECTIONS.map(({ key, icon: Icon }) => {
          const on = !!draft[key]
          return (
            <button
              type="button"
              key={key}
              role="switch"
              aria-checked={on}
              onClick={() => toggle(key)}
              className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-colors ${on ? 'border-sage-200 bg-sage-50' : 'border-stone-200 bg-stone-50 hover:bg-stone-100'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-sage-100' : 'bg-stone-200'}`}>
                <Icon size={17} className={on ? 'text-sage-700' : 'text-stone-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${on ? 'text-navy-900' : 'text-stone-600'}`}>{t(`adviser.settings.sections.${key}.label`)}</p>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{t(`adviser.settings.sections.${key}.desc`)}</p>
              </div>
              <span className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg ${on ? 'bg-sage-100 text-sage-800' : 'bg-stone-200 text-stone-500'}`}>
                {on ? <Eye size={12} /> : <EyeOff size={12} />}
                {on ? t('adviser.settings.shared') : t('adviser.settings.notShared')}
              </span>
            </button>
          )
        })}

        <label className="flex items-start gap-3 p-4 rounded-2xl border border-stone-200 bg-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!draft.notify_on_activation}
            onChange={() => toggle('notify_on_activation')}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-sage-700 focus:ring-sage-500/40"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-navy-900">{t('adviser.settings.notifyTitle')}</span>
            <span className="block text-xs text-stone-500 mt-0.5 leading-relaxed">{t('adviser.settings.notifyBody')}</span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" disabled={status === 'saving' || (!dirty && status !== 'error')} className={primaryBtn}>
            {status === 'saving' ? <><Loader2 size={14} className="animate-spin" /> {t('adviser.settings.saving')}</>
              : status === 'saved' && !dirty ? <><Check size={14} /> {t('adviser.settings.saved')}</>
              : t('adviser.settings.save')}
          </button>
          {status === 'error' && <span className="text-xs text-red-600">{t('adviser.settings.failed')}</span>}
          {isDemo && <span className="text-xs text-stone-400">{t('adviser.settings.demoNote')}</span>}
          {!isDemo && lastChanged && <span className="text-xs text-stone-400">{t('adviser.settings.lastUpdated', { date: lastChanged })}</span>}
        </div>
      </form>
    </div>
  )
}
