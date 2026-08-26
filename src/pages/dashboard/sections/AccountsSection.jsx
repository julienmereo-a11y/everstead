// Accounts: the financial and digital accounts a member records, so the people
// they leave behind know what exists and where.
//
import React, { useState } from 'react'
import { getLimit, isAtLimit } from '../../../lib/planLimits'
import { PlanLimitNotice, friendlyLimitError } from '../../dashboard/shared'
import { EmptyState, Field, LoadingSpinner, Modal, SectionShell, input, primaryBtn, secondaryBtn } from '../../dashboard/ui'
import { BarChart2, Folder, Home, Key, Landmark, Pencil, Plus, Shield, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export const CATEGORY_ICONS = {
  Banking: Landmark, Retirement: BarChart2, Investment: BarChart2,
  Insurance: Shield, Digital: Key, Property: Home, Other: Folder,
}

export function AccountsSection({ accounts, loading, add, update, remove, profile, onUpgrade, onLifeEvent }) {
  const { t } = useTranslation('dashboard')
  const emptyForm = { institution: '', account_type: '', category: 'Banking', account_number_hint: '', balance_display: '', notes: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const grouped = accounts.reduce((acc, a) => {
    const key = a.category || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const closeModal = () => {
    setShowAdd(false)
    setEditingAccount(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const openAdd = () => {
    setEditingAccount(null)
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEdit = (account) => {
    setShowAdd(false)
    setEditingAccount(account)
    setForm({
      institution: account.institution || '',
      account_type: account.account_type || '',
      category: account.category || 'Banking',
      account_number_hint: account.account_number_hint || '',
      balance_display: account.balance_display || '',
      notes: account.notes || '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        ...form,
        account_number_hint: form.account_number_hint.replace(/\D/g, '').slice(-4),
      }
      if (editingAccount) await update(editingAccount.id, payload)
      else {
        await add(payload)
        // Life event prompt — property additions are a key life milestone
        if (form.category === 'Property') {
          onLifeEvent?.({
            message: t('accounts.propertyLifeEvent'),
            cta: { label: t('accounts.reviewContacts'), section: 'people' },
          })
        }
      }
      closeModal()
    } catch (err) {
      setFormError(friendlyLimitError(err, t('accounts.saveError')))
    } finally {
      setSaving(false)
    }
  }

  const atAccountLimit = isAtLimit(profile?.plan, 'maxAccounts', accounts.length)

  return (
    <SectionShell
      title={t('accounts.title')}
      subtitle={t('accounts.subtitle', { count: accounts.length })}
      action={
        <button onClick={atAccountLimit ? undefined : openAdd} disabled={atAccountLimit} className={primaryBtn} style={atAccountLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
          <Plus size={15} />{t('accounts.addAccount')}
        </button>
      }
    >
      {atAccountLimit && (
        <PlanLimitNotice
          plan={profile?.plan}
          limit={getLimit(profile?.plan, 'maxAccounts')}
          noun="account"
          benefit={t('accounts.limitBenefit')}
          onUpgrade={onUpgrade}
        />
      )}
      {loading ? <LoadingSpinner /> : accounts.length === 0 ? (
        <EmptyState icon={Landmark} label={t('accounts.empty')} action={t('accounts.emptyAction')} onAction={atAccountLimit ? undefined : openAdd} />
      ) : (
        Object.entries(grouped).map(([category, items]) => {
          const CatIcon = CATEGORY_ICONS[category] ?? Folder
          return (
            <div key={category} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CatIcon size={15} className="text-navy-600" />
                <p className="text-sm font-semibold text-navy-800">{t(`accounts.category.${category}`, { defaultValue: category })}</p>
                <span className="text-xs text-stone-400">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map(acc => (
                  <div key={acc.id} className="bg-white border border-stone-200 rounded-xl px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
                      <Landmark size={16} className="text-navy-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-900 text-sm">{acc.institution}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {acc.account_type}
                        {acc.account_number_hint ? <span className="ml-1 font-mono tracking-wide">•••• {acc.account_number_hint}</span> : ''}
                      </p>
                      {acc.notes && <p className="text-xs text-stone-400 mt-0.5 truncate">{acc.notes}</p>}
                    </div>
                    {acc.balance_display && (
                      <span className="shrink-0 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                        {acc.balance_display}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(acc)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={t('accounts.editAria', { name: acc.institution })}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(acc.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={t('accounts.deleteAria', { name: acc.institution })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {(showAdd || editingAccount) && (
        <Modal title={editingAccount ? t('accounts.editAccount') : t('accounts.addAccount')} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('accounts.fields.institution')} required>
              <input className={input} value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} placeholder={t('accounts.fields.institutionPlaceholder')} required />
            </Field>
            <Field label={t('accounts.fields.type')} required>
              <input className={input} value={form.account_type} onChange={e => setForm(p => ({ ...p, account_type: e.target.value }))} placeholder={t('accounts.fields.typePlaceholder')} required />
            </Field>
            <Field label={t('accounts.fields.category')}>
              <select className={input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {/* Stored category VALUES stay English (grouping + icons rely on them); only labels translate. */}
                {['Banking', 'Retirement', 'Investment', 'Insurance', 'Digital', 'Property', 'Other'].map(c => <option key={c} value={c}>{t(`accounts.category.${c}`, { defaultValue: c })}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('accounts.fields.last4')}>
                <input
                  className={input}
                  value={form.account_number_hint}
                  onChange={e => setForm(p => ({ ...p, account_number_hint: e.target.value.replace(/\D/g, '').slice(-4) }))}
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="4821"
                />
              </Field>
              <Field label={t('accounts.fields.balance')}>
                <input className={input} value={form.balance_display} onChange={e => setForm(p => ({ ...p, balance_display: e.target.value }))} placeholder={t('accounts.fields.balancePlaceholder')} />
              </Field>
            </div>
            <Field label={t('accounts.fields.notes')}>
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('accounts.fields.notesPlaceholder')} />
            </Field>
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{formError}</div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('accounts.saving') : editingAccount ? t('accounts.saveChanges') : t('accounts.addAccount')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('accounts.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// DOCUMENT VIEWER MODAL (owner dashboard)
// ─────────────────────────────────────────────────────────────
