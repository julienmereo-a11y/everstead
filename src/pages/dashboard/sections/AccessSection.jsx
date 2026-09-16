// "Who has access" — the one screen that answers the question the whole
// business side depends on: which organisations are connected to me, what can
// they see, and how do I stop it.
//
// Two blocks. The inbox is anything an organisation has sent that has not been
// answered: nothing is in the vault until Accept is pressed. Below it, every
// connected organisation with a plain sentence about what it can actually
// read, and a way out.
//
// A professional firm reads whatever the member consented to in Settings, so
// that card points there. An employer reads nothing at all, ever, unless the
// member shares a specific item, so its card says exactly that.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Briefcase, Building2, Check, Clock, Download, FileText, HelpCircle, Inbox, Loader2, Settings as SettingsIcon, ShieldCheck, X } from 'lucide-react'
import { SectionShell, EmptyState, LoadingSpinner, primaryBtn, secondaryBtn } from '../ui'
import { firmLabel } from './AdviserSection'

const fmtDate = (iso, lang) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return '' }
}
const fmtSize = (bytes) => {
  if (!bytes) return null
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const daysLeft = (iso) => {
  if (!iso) return null
  const d = Math.ceil((new Date(iso) - Date.now()) / 86400000)
  return d > 0 ? d : 0
}

export function AccessSection({ access, onNavigate, isDemo }) {
  const { t, i18n } = useTranslation('dashboard')
  const lang = i18n.language === 'fr' ? 'fr' : 'en'
  const { connections = [], deliveries = [], shares = [], requests = [], loading, busyId, respond, disconnect, revokeShare, setAutoFile } = access || {}
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const act = async (fn) => {
    setError(null)
    try { await fn() } catch (err) { setError(err.message) }
  }

  if (loading) return <SectionShell title={t('access.title')} subtitle={t('access.subtitle')}><LoadingSpinner /></SectionShell>

  const nothing = !deliveries.length && !connections.length && !requests.length

  return (
    <SectionShell title={t('access.title')} subtitle={t('access.subtitle')}>
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 m-0">{error}</p>
        </div>
      )}

      {/* ── Inbox ── */}
      {deliveries.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Inbox size={16} className="text-navy-700" />
            <h2 className="text-sm font-semibold text-navy-950 m-0">{t('access.inbox.title')}</h2>
            <span className="text-[11px] font-semibold text-white bg-navy-700 rounded-full px-2 py-0.5">{deliveries.length}</span>
          </div>
          <p className="text-sm text-stone-500 mb-4 max-w-2xl">{t('access.inbox.lead')}</p>
          <div className="space-y-3">
            {deliveries.map(d => {
              const busy = busyId === d.id
              const size = fmtSize(d.file_size)
              return (
                <div key={d.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0"><FileText size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 m-0">
                        {t('access.inbox.from', { name: d.sender_name || t('access.inbox.anOrganisation') })}
                      </p>
                      <p className="text-[15px] font-semibold text-navy-950 m-0 mt-0.5 break-words">{d.title}</p>
                      <p className="text-xs text-stone-500 m-0 mt-1">
                        {d.doc_type}{size ? ` · ${size}` : ''} · {t('access.inbox.sent', { date: fmtDate(d.sent_at, lang) })}
                      </p>
                      {d.note && (
                        <p className="mt-2.5 text-sm text-stone-600 italic border-l-2 border-stone-200 pl-3 m-0">{d.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button disabled={busy || isDemo} onClick={() => act(() => respond(d.id, 'accept'))} className={`${primaryBtn} disabled:opacity-60`}>
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {t('access.inbox.accept')}
                    </button>
                    <button disabled={busy || isDemo} onClick={() => act(() => respond(d.id, 'decline'))} className={`${secondaryBtn} disabled:opacity-60`}>
                      <X size={14} />{t('access.inbox.decline')}
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-stone-400 m-0">{t('access.inbox.safety')}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* An organisation has asked for something. The answer control lives in
          Documents, where the member's own documents are, so this points there
          rather than repeating it. */}
      {requests.length > 0 && (
        <button
          onClick={() => onNavigate?.('documents')}
          className="w-full text-left mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3.5 hover:border-amber-300 transition-colors"
        >
          <span className="w-10 h-10 rounded-xl bg-white border border-amber-200 text-amber-700 flex items-center justify-center shrink-0"><HelpCircle size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-navy-950">{t('access.requests.title', { count: requests.length })}</span>
            <span className="block mt-1 text-sm leading-relaxed text-stone-600">
              {requests.length === 1
                ? t('access.requests.body_one', { name: requests[0].sender_name, what: requests[0].doc_type })
                : t('access.requests.body_other', { count: requests.length })}
            </span>
            <span className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700">
              {t('access.requests.cta')} <ArrowRight size={14} />
            </span>
          </span>
        </button>
      )}

      {/* ── Connected organisations ── */}
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={16} className="text-navy-700" />
        <h2 className="text-sm font-semibold text-navy-950 m-0">{t('access.orgs.title')}</h2>
      </div>

      {connections.length === 0 ? (
        nothing
          ? <EmptyState icon={ShieldCheck} label={t('access.empty')} />
          : <p className="text-sm text-stone-500">{t('access.orgs.none')}</p>
      ) : (
        <div className="space-y-3">
          {connections.map(c => {
            const employer = c.org_kind === 'employer'
            const Icon = employer ? Building2 : Briefcase
            const busy = busyId === c.connection_id
            const orgShares = shares.filter(sh => sh.org_id === c.org_id)
            return (
              <div key={c.connection_id} className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-stone-100 text-navy-700 flex items-center justify-center shrink-0"><Icon size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-navy-950 m-0 break-words">{c.firm_name}</p>
                    <p className="text-xs text-stone-500 m-0 mt-0.5">
                      {employer ? t('access.orgs.employerLabel') : firmLabel(t, c)} · {t('access.orgs.since', { date: fmtDate(c.started_at, lang) })}
                    </p>
                    <p className="mt-2.5 text-sm text-stone-600 m-0">
                      {employer
                        ? (orgShares.length ? t('access.orgs.employerReadsShared', { count: orgShares.length }) : t('access.orgs.employerReads'))
                        : t('access.orgs.professionalReads')}
                    </p>
                  </div>
                </div>
                {/* One accept per organisation: after the first, their documents
                    file themselves. This is how the member takes that back
                    without ending the connection. */}
                <label className="mt-4 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.auto_file !== false}
                    disabled={busy || isDemo}
                    onChange={(e) => act(() => setAutoFile(c.connection_id, e.target.checked))}
                    className="mt-0.5 w-4 h-4 accent-navy-700 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-navy-950">{t('access.orgs.autoFile')}</span>
                    <span className="block text-xs text-stone-500 mt-0.5">
                      {c.auto_file !== false ? t('access.orgs.autoFileOn') : t('access.orgs.autoFileOff')}
                    </span>
                  </span>
                </label>

                {orgShares.length > 0 && (
                  <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 m-0 mb-2.5">
                      {t('access.shares.title', { count: orgShares.length })}
                    </p>
                    <ul className="list-none m-0 p-0 space-y-2">
                      {orgShares.map(sh => {
                        const left = daysLeft(sh.expires_at)
                        const shBusy = busyId === sh.id
                        return (
                          <li key={sh.id} className="flex items-center gap-2.5 flex-wrap">
                            <FileText size={14} className="text-stone-400 shrink-0" />
                            <span className="text-sm text-navy-950 font-medium min-w-0 break-words">{sh.resource_name || t('access.shares.aDocument')}</span>
                            <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                              <Clock size={12} />
                              {left === null
                                ? t('access.shares.untilRevoked')
                                : left === 0 ? t('access.shares.endsToday') : t('access.shares.daysLeft', { count: left })}
                            </span>
                            <button
                              disabled={shBusy || isDemo}
                              onClick={() => act(() => revokeShare(sh.id))}
                              className="ml-auto text-xs font-semibold text-stone-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            >
                              {shBusy ? <Loader2 size={12} className="animate-spin" /> : t('access.shares.stop')}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {!employer && (
                    <button onClick={() => onNavigate?.('settings')} className={secondaryBtn}>
                      <SettingsIcon size={14} />{t('access.orgs.manageSharing')}
                    </button>
                  )}
                  {confirming === c.connection_id ? (
                    <>
                      <button disabled={busy || isDemo} onClick={() => act(async () => { await disconnect(c.connection_id); setConfirming(null) })} className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60">
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {t('access.orgs.confirmEnd')}
                      </button>
                      <button onClick={() => setConfirming(null)} className={secondaryBtn}>{t('access.orgs.keep')}</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirming(c.connection_id)} className={secondaryBtn}>
                      <X size={14} />{t('access.orgs.end')}
                    </button>
                  )}
                </div>
                {confirming === c.connection_id && (
                  <p className="mt-3 text-xs text-stone-500 m-0">
                    {employer ? t('access.orgs.endWarnEmployer') : t('access.orgs.endWarnProfessional')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-stone-400 max-w-2xl">{t('access.footnote')}</p>
    </SectionShell>
  )
}
