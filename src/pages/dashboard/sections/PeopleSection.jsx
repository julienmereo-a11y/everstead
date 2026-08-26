// People: the trusted contacts a member invites, what each one can reach, and
// when. PersonAccessForm is the invite and edit form behind it.
//
import React, { useState } from 'react'
import { getLimit, isAtLimit } from '../../../lib/planLimits'
import { ACCESS_AREAS, ACCESS_TIMINGS, ALL_AREA_KEYS, FULL_ACCESS_ROLE, PERSON_ROLES, PlanLimitNotice, ROLE_GROUP_KEYS, friendlyLimitError, roleLabel } from '../../dashboard/shared'
import { Checkbox, EmptyState, Field, LoadingSpinner, Modal, SectionShell, input, primaryBtn, secondaryBtn } from '../../dashboard/ui'
import { AlertCircle, CheckCircle2, Lock, Pencil, Plus, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
export function PersonAccessForm({ initial, onSave, onCancel, saving, submitLabel }) {
  const { t } = useTranslation('dashboard')
  const emptyForm = {
    name: '', email: '', role: '',
    accessAreas: [],
    accountCategories: [],
    documentTypes: [],
    accessTiming: 'always', // 'always' | 'after_death'
  }
  const [form, setForm] = useState(initial ?? emptyForm)
  const [accessError, setAccessError] = useState(null)

  const isFullAccess = form.role === FULL_ACCESS_ROLE

  const toggleArea = (key) => {
    setForm(p => {
      const next = p.accessAreas.includes(key)
        ? p.accessAreas.filter(k => k !== key)
        : [...p.accessAreas, key]
      // Clear sub-selections when unchecking parent
      const area = ACCESS_AREAS.find(a => a.key === key)
      const patch = { accessAreas: next }
      if (area?.subKey && !next.includes(key)) patch[area.subKey] = []
      return { ...p, ...patch }
    })
  }

  const toggleSub = (subKey, val) => {
    setForm(p => ({
      ...p,
      [subKey]: p[subKey].includes(val)
        ? p[subKey].filter(v => v !== val)
        : [...p[subKey], val],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isFullAccess && form.accessAreas.length === 0) {
      setAccessError(t('people.form.errorNoArea'))
      return
    }
    setAccessError(null)
    const payload = {
      ...form,
      accessAreas: isFullAccess ? ALL_AREA_KEYS : form.accessAreas,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Email — only shown when inviting (no initial.id) */}
      {!initial?.id && (
        <>
          <Field label={t('people.form.name')} required>
            <input className={input} value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('people.form.namePlaceholder')} required />
          </Field>
          <Field label={t('people.form.email')} required>
            <input type="email" className={input} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder={t('people.form.emailPlaceholder')} required />
          </Field>
        </>
      )}

      <Field label={t('people.form.role')} required>
        <select
          className={input}
          value={form.role}
          onChange={e => setForm(p => ({...p, role: e.target.value, accessAreas: [], accountCategories: [], documentTypes: []}))}
          required
        >
          <option value="" disabled>{t('people.form.selectRole')}</option>
          {ROLE_GROUP_KEYS.map(group => (
            <optgroup key={group} label={t(`people.roleGroup.${group}`)}>
              {PERSON_ROLES.filter(r => r.group === group).map(r => (
                <option key={r.value} value={r.value}>{t(`people.role.${r.id}`)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      {form.role && (
        <>
          {/* ── Access areas ── */}
          {isFullAccess ? (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3">
              <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                <Trans
                  t={t}
                  i18nKey="people.form.fullAccessNote"
                  values={{ role: roleLabel(t, FULL_ACCESS_ROLE) }}
                  components={{ b: <span className="font-semibold" /> }}
                />
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-stone-600 mb-1">{t('people.form.accessAreas')} <span className="text-red-500">*</span></p>
              <p className="text-xs text-stone-400 mb-3">{t('people.form.accessAreasHint')}</p>
              <div className="space-y-2">
                {ACCESS_AREAS.map(area => {
                  const checked = form.accessAreas.includes(area.key)
                  const Icon = area.icon
                  return (
                    <div key={area.key}>
                      <button
                        type="button"
                        onClick={() => toggleArea(area.key)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors ${
                          checked ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-200' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <Checkbox checked={checked} />
                        <Icon size={14} className={checked ? 'text-navy-600' : 'text-stone-400'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-900">{t(`people.access.area.${area.key}.label`)}</p>
                          <p className="text-xs text-stone-400">{t(`people.access.area.${area.key}.desc`)}</p>
                        </div>
                      </button>

                      {/* Sub-selector: shown when area is checked and has sub-options */}
                      {checked && area.subOptions && (
                        <div className="ml-7 mt-1.5 pl-3 border-l-2 border-navy-100 space-y-1.5 pb-1">
                          <p className="text-xs text-stone-500 font-medium mb-1">{t(`people.access.area.${area.key}.subLabel`)}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {area.subOptions.map(opt => {
                              const subChecked = form[area.subKey].includes(opt)
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleSub(area.subKey, opt)}
                                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                    subChecked
                                      ? 'bg-navy-800 text-white border-navy-800'
                                      : 'bg-white text-stone-600 border-stone-300 hover:border-navy-300 hover:text-navy-700'
                                  }`}
                                >
                                  {t(`people.access.${area.subKey}.${opt}`)}
                                </button>
                              )
                            })}
                          </div>
                          {form[area.subKey].length === 0 && (
                            <p className="text-xs text-stone-400 italic">{t('people.form.allTypes')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Access timing ── */}
          <div>
            <p className="text-xs font-semibold text-stone-600 mb-1">{t('people.form.timingQuestion')}</p>
            <p className="text-xs text-stone-400 mb-3">{t('people.form.timingHint')}</p>
            <div className="grid grid-cols-2 gap-2">
              {ACCESS_TIMINGS.map(opt => {
                const sel = form.accessTiming === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({...p, accessTiming: opt.value}))}
                    className={`flex flex-col items-start gap-1 px-3.5 py-3 rounded-xl border text-left transition-colors ${
                      sel ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-200' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox checked={sel} />
                      <span className="text-sm font-medium text-navy-900">{t(`people.timing.${opt.id}.label`)}</span>
                    </div>
                    <p className="text-xs text-stone-400 pl-6">{t(`people.timing.${opt.id}.desc`)}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {accessError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{accessError}</p>}
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
          {saving ? t('people.form.saving') : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryBtn}>{t('people.form.cancel')}</button>
      </div>
    </form>
  )
}

export function PeopleSection({ people, loading, invite, resendInvite, updatePerson, removePerson, planLimits, profile, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  const [showInvite, setShowInvite] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sectionError, setSectionError] = useState(null)

  const handleInvite = async (payload) => {
    setSaving(true)
    try {
      await invite(payload)
      setShowInvite(false)
    } catch (err) { setSectionError(friendlyLimitError(err, t('people.errors.inviteFailed'))) }
    finally { setSaving(false) }
  }

  const handleEdit = async (payload) => {
    setSaving(true)
    try {
      await updatePerson(editingPerson.id, payload)
      setEditingPerson(null)
    } catch (err) { setSectionError(err.message ?? t('people.errors.saveFailed')) }
    finally { setSaving(false) }
  }

  const handleRemove = async (person) => {
    if (!window.confirm(t('people.confirmRemove', { name: person.name ?? t('people.thisPerson') }))) return
    try { await removePerson(person.id) }
    catch (err) { setSectionError(err.message ?? t('people.errors.removeFailed')) }
  }

  // Build a readable access summary for each person card
  const accessSummary = (person) => {
    const areas = person.access_grants?.accessAreas ?? []
    if (!areas.length) return t('people.access.none')
    if (areas.length === ALL_AREA_KEYS.length) return t('people.access.full')
    return areas
      .map(k => ACCESS_AREAS.some(a => a.key === k) ? t(`people.access.area.${k}.label`) : k)
      .join(', ')
  }

  const timingLabel = (person) => {
    const stored = person.access_grants?.accessTiming
    return stored === 'after_death' ? t('people.timing.afterDeath.label') : t('people.timing.aliveShort')
  }

  const contactLimit = getLimit(profile?.plan, 'trustedPeople')
  const atLimit = isAtLimit(profile?.plan, 'trustedPeople', people.length)

  return (
    <SectionShell
      title={t('people.title')}
      subtitle={contactLimit !== null
        ? t('people.subtitleLimited', { n: people.length, limit: contactLimit })
        : t('people.subtitle', { count: people.length })}
      action={
        atLimit
          ? (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-2 hover:bg-amber-100 transition-colors"
            >
              <Lock size={14} /> {t('people.limitReached')}
            </button>
          )
          : <button onClick={() => setShowInvite(true)} className={primaryBtn}><Plus size={15} />{t('people.invitePerson')}</button>
      }
    >
      {/* How access is released — reassurance at the moment of assigning access */}
      <div className="mb-4 flex items-start gap-3 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
        <ShieldCheck size={15} className="text-sage-700 mt-0.5 shrink-0" />
        <p className="text-sm text-stone-600 flex-1 leading-relaxed">
          {t('people.releaseNote')}{' '}
          <a href="/security" target="_blank" rel="noopener noreferrer" className="font-medium text-sage-800 underline underline-offset-2 hover:text-sage-900 whitespace-nowrap">{t('people.releaseLink')}</a>
        </p>
      </div>
      {sectionError && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{sectionError}</p>
          <button onClick={() => setSectionError(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}
      {atLimit && (
        <PlanLimitNotice
          plan={profile?.plan}
          limit={getLimit(profile?.plan, 'trustedPeople')}
          noun="trustedContact"
          benefit={t('people.limitBenefit')}
          onUpgrade={onUpgrade}
        />
      )}
      {loading ? <LoadingSpinner /> : people.length === 0 ? (
        <EmptyState icon={Users} label={t('people.empty')} action={t('people.emptyAction')} onAction={() => setShowInvite(true)} />
      ) : (
        <div className="space-y-3">
          {people.map(person => (
            <div key={person.id} className="bg-white border border-stone-200 rounded-xl px-5 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-bold text-navy-700 uppercase shrink-0 mt-0.5">
                {person.name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-navy-900 text-sm">{person.name}</p>
                  <span className="text-xs text-stone-400">{roleLabel(t, person.role)}</span>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    person.invite_status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    person.invite_status === 'declined' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {t(`people.inviteStatus.${person.invite_status}`, { defaultValue: person.invite_status })}
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{person.email}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="text-xs text-stone-500"><span className="font-medium text-stone-600">{t('people.accessLabel')}</span> {accessSummary(person)}</span>
                  <span className="text-xs text-stone-500"><span className="font-medium text-stone-600">{t('people.timingLabel')}</span> {timingLabel(person)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {person.invite_status === 'pending' && (
                  <button onClick={() => resendInvite(person.id)} className="text-xs text-navy-600 hover:text-navy-900 font-medium px-2 py-1 rounded-full hover:bg-navy-50 transition-colors">
                    {t('people.resend')}
                  </button>
                )}
                <button
                  onClick={() => setEditingPerson(person)}
                  className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50"
                  title={t('people.editAccess')}
                  aria-label={t('people.editAccessAria', { name: person.name })}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleRemove(person)}
                  className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  title={t('people.removePerson')}
                  aria-label={t('people.removeAria', { name: person.name })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <Modal title={t('people.inviteModalTitle')} onClose={() => setShowInvite(false)}>
          <PersonAccessForm
            onSave={handleInvite}
            onCancel={() => setShowInvite(false)}
            saving={saving}
            submitLabel={t('people.sendInvite')}
          />
        </Modal>
      )}

      {editingPerson && (
        <Modal title={t('people.editModalTitle', { name: editingPerson.name })} onClose={() => setEditingPerson(null)}>
          <PersonAccessForm
            initial={{
              id: editingPerson.id,
              role: editingPerson.role,
              accessAreas: editingPerson.access_grants?.accessAreas ?? [],
              accountCategories: editingPerson.access_grants?.accountCategories ?? [],
              documentTypes: editingPerson.access_grants?.documentTypes ?? [],
              accessTiming: editingPerson.access_grants?.accessTiming ?? 'always',
            }}
            onSave={handleEdit}
            onCancel={() => setEditingPerson(null)}
            saving={saving}
            submitLabel={t('people.saveChanges')}
          />
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// INSTRUCTIONS SECTION
// ─────────────────────────────────────────────────────────────
// Stored instructions.category values paired with the id used to look up their label.
// The value is what goes to the database (and must mirror the DB CHECK constraint),
// the id only picks the translation.
