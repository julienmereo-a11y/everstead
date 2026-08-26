// Subscriptions: recurring payments a member records, so an executor knows what
// to cancel.
//
import React, { useState } from 'react'
import { EmptyState, Field, LoadingSpinner, Modal, SectionShell, input, primaryBtn, secondaryBtn } from '../../dashboard/ui'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export const BILLING_CYCLES = [
  { value: 'Monthly', id: 'monthly' },
  { value: 'Annual',  id: 'annual' },
]

export const BILLING_CYCLE_ALIASES = [
  { value: 'monthly', id: 'monthly' },
  { value: 'yearly',  id: 'annual' },
  { value: 'annual',  id: 'annual' },
]

// Display label for a stored billing cycle. Unknown/legacy values render as stored.

export function billingCycleLabel(t, value) {
  const match = [...BILLING_CYCLES, ...BILLING_CYCLE_ALIASES].find(c => c.value === value)
  return match ? t(`subscriptions.cycle.${match.id}`) : value
}

export function SubscriptionsSection({ subscriptions: remoteSubs, loading, add, update, remove }) {
  const { t } = useTranslation('dashboard')
  const emptyForm = { name: '', billing_cycle: 'Monthly', amount: '', next_charge_date: '', notes: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  // local fallback list so the section works even if the remote table is unavailable
  const [localSubs, setLocalSubs] = useState([])
  const subscriptions = remoteSubs && remoteSubs.length > 0 ? remoteSubs : localSubs

  const total = subscriptions.reduce((sum, s) => {
    const amount = Number(s.amount || 0)
    const isAnnual = s.billing_cycle === 'yearly' || s.billing_cycle === 'annual' || s.billing_cycle === 'Annual'
    return sum + (isAnnual ? amount / 12 : amount)
  }, 0)

  const closeModal = () => {
    setShowAdd(false)
    setEditingSubscription(null)
    setForm(emptyForm)
    setSaveError(null)
  }

  const openAdd = () => {
    setEditingSubscription(null)
    setForm(emptyForm)
    setSaveError(null)
    setShowAdd(true)
  }

  const openEdit = (sub) => {
    setShowAdd(false)
    setEditingSubscription(sub)
    setSaveError(null)
    setForm({
      name: sub.name || '',
      billing_cycle: sub.billing_cycle || 'Monthly',
      amount: sub.amount ?? '',
      next_charge_date: sub.next_charge_date || '',
      notes: sub.cancel_instructions || '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const payload = {
      name: form.name,
      billing_cycle: form.billing_cycle,
      amount: Number(form.amount || 0),
      next_charge_date: form.next_charge_date || null,
      // The DB column is cancel_instructions — `notes` does not exist on the
      // subscriptions table, and one unknown key rejects the WHOLE write.
      cancel_instructions: form.notes,
    }
    try {
      if (editingSubscription) {
        await update(editingSubscription.id, payload)
        setLocalSubs(prev => prev.map(s => s.id === editingSubscription.id ? { ...s, ...payload } : s))
      } else {
        await add(payload)
        setLocalSubs(prev => [...prev, { ...payload, id: Date.now() }])
      }
      closeModal()
    } catch (err) {
      // Never fake success: a phantom row that vanishes on reload is worse
      // than an honest error.
      setSaveError(err?.message || t('subscriptions.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionShell title={t('subscriptions.title')} subtitle={t('subscriptions.subtitle', { total: total.toFixed(2) })} action={<button onClick={openAdd} className={primaryBtn}><Plus size={15} />{t('subscriptions.add')}</button>}>
      {loading ? <LoadingSpinner /> : subscriptions.length === 0 ? (
        <EmptyState icon={CreditCard} label={t('subscriptions.empty')} action={t('subscriptions.emptyAction')} onAction={openAdd} />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-50">
          {subscriptions.map(sub => (
            <div key={sub.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 uppercase">
                {sub.name?.[0] || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy-800 text-sm">{sub.name}</p>
                <p className="text-xs text-stone-400">{t('subscriptions.meta', { cycle: billingCycleLabel(t, sub.billing_cycle), date: sub.next_charge_date ?? '—' })}</p>
                {sub.cancel_instructions && <p className="text-xs text-stone-400 mt-0.5 truncate">{sub.cancel_instructions}</p>}
              </div>
              <p className="font-semibold text-navy-900 text-sm">£{Number(sub.amount || 0).toFixed(2)}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(sub)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={t('subscriptions.editAria', { name: sub.name })}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(sub.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={t('subscriptions.deleteAria', { name: sub.name })}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editingSubscription) && (
        <Modal title={editingSubscription ? t('subscriptions.editTitle') : t('subscriptions.add')} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('subscriptions.fields.name')} required>
              <input className={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('subscriptions.fields.namePlaceholder')} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('subscriptions.fields.cycle')}>
                <select className={input} value={form.billing_cycle} onChange={e => setForm(p => ({ ...p, billing_cycle: e.target.value }))}>
                  {/* VALUES are stored on the subscriptions row and stay English, only labels translate. */}
                  {BILLING_CYCLES.map(option => <option key={option.value} value={option.value}>{t(`subscriptions.cycle.${option.id}`)}</option>)}
                </select>
              </Field>
              <Field label={t('subscriptions.fields.amount')} required>
                <input type="number" min="0" step="0.01" className={input} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder={t('subscriptions.fields.amountPlaceholder')} required />
              </Field>
            </div>
            <Field label={t('subscriptions.fields.nextCharge')}>
              <input type="date" className={input} value={form.next_charge_date} onChange={e => setForm(p => ({ ...p, next_charge_date: e.target.value }))} />
            </Field>
            <Field label={t('subscriptions.fields.notes')}>
              <textarea className={input} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('subscriptions.fields.notesPlaceholder')} />
            </Field>
            {saveError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('subscriptions.saving') : editingSubscription ? t('subscriptions.saveChanges') : t('subscriptions.add')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('subscriptions.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}
// ─────────────────────────────────────────────────────────────
// ALERTS SECTION
// ─────────────────────────────────────────────────────────────
