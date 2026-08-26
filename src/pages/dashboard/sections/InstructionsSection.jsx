// Instructions: the written wishes a member leaves, each addressed to a
// category of person and released either immediately or after death.
//
import React, { useState } from 'react'
import { getLimit, isAtLimit } from '../../../lib/planLimits'
import { PlanLimitNotice } from '../../dashboard/shared'
import { EmptyState, Field, LoadingSpinner, Modal, SectionShell, input, primaryBtn, secondaryBtn } from '../../dashboard/ui'
import { BookOpen, Loader2, Pencil, Plus, Send, Sparkles, Trash2, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export const INSTRUCTION_CATEGORIES = [
  { value: 'Immediate', id: 'immediate' },
  { value: 'Financial', id: 'financial' },
  { value: 'Legal',     id: 'legal' },
  { value: 'Household', id: 'household' },
  { value: 'Medical',   id: 'medical' },
  { value: 'Personal',  id: 'personal' },
  { value: 'Other',     id: 'other' },
]

// Stored instructions.audience values. 'Advisor' is a legacy spelling that can still
// be stored, so it maps to a label but is never offered in the picker.

export const INSTRUCTION_AUDIENCES = [
  { value: 'Executor',         id: 'executor' },
  { value: 'Family',           id: 'family' },
  { value: 'Healthcare Proxy', id: 'healthcareProxy' },
  { value: 'Adviser',          id: 'adviser' },
  { value: 'Everyone',         id: 'everyone' },
]

export const INSTRUCTION_AUDIENCE_ALIASES = [{ value: 'Advisor', id: 'adviser' }]

// Display labels for stored values. Unknown/legacy values render as stored.

export function instructionCategoryLabel(t, value) {
  const match = INSTRUCTION_CATEGORIES.find(c => c.value === value)
  return match ? t(`instructions.category.${match.id}`) : value
}

export function instructionAudienceLabel(t, value) {
  const match = [...INSTRUCTION_AUDIENCES, ...INSTRUCTION_AUDIENCE_ALIASES].find(a => a.value === value)
  return match ? t(`instructions.audience.${match.id}`) : value
}

export function InstructionsSection({ instructions, loading, add, update, remove, profile, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  const emptyForm = { title: '', category: 'Immediate', audience: 'Executor', body: '', stepsText: '' }
  const [showAdd, setShowAdd] = useState(false)
  const [editingInstruction, setEditingInstruction] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // ── AI writing assistant (conversational) ──
  const openingThread = () => [{ role: 'assistant', content: t('instructions.assistant.greeting') }]
  const [showAssistant, setShowAssistant] = useState(false)
  const [assistantMessages, setAssistantMessages] = useState(openingThread)
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [parsedSuggestion, setParsedSuggestion] = useState(null)

  // ── AI quick-write (5-question form, Feature 1) ──
  const [showQuickWrite, setShowQuickWrite] = useState(false)
  const [quickWriteForm, setQuickWriteForm] = useState({ purpose: '', recipient: '', firstSteps: '', resources: '', additional: '' })
  const [quickWriteLoading, setQuickWriteLoading] = useState(false)

  const handleQuickWrite = async (e) => {
    e.preventDefault()
    if (profile?.ai_features_enabled === false) return
    setQuickWriteLoading(true)
    try {
      const { supabase: sb } = await import('../../../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/ai/write-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          ...quickWriteForm,
          userName: profile?.full_name,
        }),
      })
      const data = await res.json()
      if (data.instructions) {
        // Pre-fill the main form with the AI output
        setForm(prev => ({
          ...prev,
          body: data.instructions,
          title: prev.title || quickWriteForm.purpose.slice(0, 60),
          category: 'Immediate',
          // Match the executor wording in either language (a French user types
          // "exécuteur"/"notaire"); accents stripped so "execut" catches both.
          audience: /execut|notaire/.test(
            (quickWriteForm.recipient || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          ) ? 'Executor' : 'Family',
        }))
        setShowQuickWrite(false)
        setShowAdd(true)
        setEditingInstruction(null)
        setQuickWriteForm({ purpose: '', recipient: '', firstSteps: '', resources: '', additional: '' })
      }
    } catch {}
    setQuickWriteLoading(false)
  }

  const sendAssistantMessage = async () => {
    const text = assistantInput.trim()
    if (!text || assistantLoading) return
    const newMessages = [...assistantMessages, { role: 'user', content: text }]
    setAssistantMessages(newMessages)
    setAssistantInput('')
    setAssistantLoading(true)
    try {
      const { supabase: sb } = await import('../../../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.access_token) {
        setAssistantMessages(prev => [...prev, { role: 'assistant', content: t('instructions.assistant.previewOnly') }])
        setAssistantLoading(false)
        return
      }
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ type: 'instructions-assistant', messages: newMessages }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const reply = data.reply
      setAssistantMessages(prev => [...prev, { role: 'assistant', content: reply }])
      // Try to parse structured output
      if (reply.includes('TITLE:') && reply.includes('STEPS:')) {
        const titleMatch = reply.match(/TITLE:\s*(.+)/i)
        const categoryMatch = reply.match(/CATEGORY:\s*(.+)/i)
        const forMatch = reply.match(/FOR:\s*(.+)/i)
        const overviewMatch = reply.match(/OVERVIEW:\s*([\s\S]+?)(?=STEPS:|$)/i)
        const stepsMatch = reply.match(/STEPS:\s*([\s\S]+)$/i)
        if (titleMatch && stepsMatch) {
          const stepsRaw = stepsMatch[1].trim()
          const steps = stepsRaw.split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
          // Must mirror the DB CHECK constraint instructions_category_check — 'Digital' is not allowed
          const validCategories = ['Immediate', 'Financial', 'Legal', 'Household', 'Medical', 'Personal', 'Other']
          const validAudiences = ['Executor', 'Family', 'Healthcare Proxy', 'Adviser', 'Advisor', 'Everyone']
          const category = validCategories.find(c => categoryMatch?.[1]?.includes(c)) ?? 'Immediate'
          const audience = validAudiences.find(a => forMatch?.[1]?.includes(a)) ?? 'Executor'
          setParsedSuggestion({
            title: titleMatch[1].trim(),
            category,
            audience,
            body: overviewMatch?.[1]?.trim() ?? '',
            stepsText: steps.join('\n'),
          })
        }
      }
    } catch {
      setAssistantMessages(prev => [...prev, { role: 'assistant', content: t('instructions.assistant.error') }])
    } finally {
      setAssistantLoading(false)
    }
  }

  const applyAssistantSuggestion = () => {
    if (!parsedSuggestion) return
    setForm(parsedSuggestion)
    setShowAssistant(false)
    setEditingInstruction(null)
    setShowAdd(true)
    setParsedSuggestion(null)
    setAssistantMessages(openingThread())
  }

  const closeAssistant = () => {
    setShowAssistant(false)
    setParsedSuggestion(null)
  }

  const closeModal = () => {
    setShowAdd(false)
    setEditingInstruction(null)
    setForm(emptyForm)
  }

  const openAdd = () => {
    setEditingInstruction(null)
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEdit = (instruction) => {
    setShowAdd(false)
    setEditingInstruction(instruction)
    setForm({
      title: instruction.title || '',
      category: instruction.category || 'Immediate',
      audience: instruction.audience || 'Executor',
      body: instruction.body || '',
      stepsText: (instruction.instruction_steps || []).map(step => step.body).join('\n'),
    })
  }

  const toSteps = (stepsText) => stepsText
    .split('\n')
    .map(step => step.trim())
    .filter(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        category: form.category,
        audience: form.audience,
        body: form.body,
        steps: toSteps(form.stepsText),
      }
      if (editingInstruction) await update(editingInstruction.id, payload)
      else await add(payload)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const atInstructionLimit = isAtLimit(profile?.plan, 'instructionSets', instructions.length)

  return (
    <SectionShell
      title={t('instructions.title')}
      subtitle={t('instructions.subtitle', { count: instructions.length })}
      action={
        <div className="flex items-center gap-2">
          {profile?.ai_features_enabled !== false && (
          <button
            onClick={() => setShowQuickWrite(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 bg-sage-50 hover:bg-sage-100 border border-sage-200 px-3 py-2 rounded-full transition-colors"
          >
            <Sparkles size={12} /> {t('instructions.writeWithAi')}
          </button>
          )}
          <button
            onClick={() => setShowAssistant(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 border border-navy-200 px-3 py-2 rounded-full transition-colors"
          >
            <Zap size={12} /> {t('instructions.helpMeWrite')}
          </button>
          <button onClick={atInstructionLimit ? undefined : openAdd} disabled={atInstructionLimit} className={primaryBtn} style={atInstructionLimit ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
            <Plus size={15} />{t('instructions.add')}
          </button>
        </div>
      }
    >
      {atInstructionLimit && (
        <PlanLimitNotice
          plan={profile?.plan}
          limit={getLimit(profile?.plan, 'instructionSets')}
          noun="instructionSet"
          benefit={t('instructions.limitBenefit')}
          onUpgrade={onUpgrade}
        />
      )}
      {loading ? <LoadingSpinner /> : instructions.length === 0 ? (
        <EmptyState icon={BookOpen} label={t('instructions.empty')} action={t('instructions.emptyAction')} onAction={atInstructionLimit ? undefined : openAdd} />
      ) : (
        <div className="space-y-3">
          {instructions.map(inst => (
            <div key={inst.id} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-navy-900 text-sm">{inst.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{t('instructions.meta', { category: instructionCategoryLabel(t, inst.category), audience: instructionAudienceLabel(t, inst.audience) })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-stone-400">
                    {inst.instruction_steps?.length
                      ? t('instructions.steps', { count: inst.instruction_steps.length })
                      : t('instructions.noSteps')}
                  </span>
                  <button onClick={() => openEdit(inst)} className="p-1.5 text-stone-300 hover:text-navy-600 transition-colors rounded-lg hover:bg-navy-50" aria-label={t('instructions.editAria', { title: inst.title })}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(inst.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" aria-label={t('instructions.deleteAria', { title: inst.title })}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {inst.body && <p className="mt-3 text-sm text-stone-600 leading-relaxed">{inst.body}</p>}
              {inst.instruction_steps?.length > 0 && (
                <ol className="mt-3 space-y-1.5">
                  {inst.instruction_steps.map((step, i) => (
                    <li key={step.id} className="flex items-start gap-2.5 text-sm text-stone-600">
                      <span className="text-xs font-bold text-stone-300 mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{step.body}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── AI quick-write modal (Feature 1) ── */}
      {showQuickWrite && (
        <Modal title={t('instructions.quickWrite.title')} onClose={() => setShowQuickWrite(false)}>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            {t('instructions.quickWrite.intro')}
          </p>
          <form onSubmit={handleQuickWrite} className="space-y-4">
            <Field label={t('instructions.quickWrite.purpose')} required>
              <input
                className={input}
                placeholder={t('instructions.quickWrite.purposePlaceholder')}
                value={quickWriteForm.purpose}
                onChange={e => setQuickWriteForm(p => ({ ...p, purpose: e.target.value }))}
                required
                autoFocus
              />
            </Field>
            <Field label={t('instructions.quickWrite.recipient')}>
              <input
                className={input}
                placeholder={t('instructions.quickWrite.recipientPlaceholder')}
                value={quickWriteForm.recipient}
                onChange={e => setQuickWriteForm(p => ({ ...p, recipient: e.target.value }))}
              />
            </Field>
            <Field label={t('instructions.quickWrite.firstSteps')}>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder={t('instructions.quickWrite.firstStepsPlaceholder')}
                value={quickWriteForm.firstSteps}
                onChange={e => setQuickWriteForm(p => ({ ...p, firstSteps: e.target.value }))}
              />
            </Field>
            <Field label={t('instructions.quickWrite.resources')}>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder={t('instructions.quickWrite.resourcesPlaceholder')}
                value={quickWriteForm.resources}
                onChange={e => setQuickWriteForm(p => ({ ...p, resources: e.target.value }))}
              />
            </Field>
            <Field label={t('instructions.quickWrite.additional')}>
              <input
                className={input}
                placeholder={t('instructions.quickWrite.additionalPlaceholder')}
                value={quickWriteForm.additional}
                onChange={e => setQuickWriteForm(p => ({ ...p, additional: e.target.value }))}
              />
            </Field>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={quickWriteLoading || !quickWriteForm.purpose}
                className={`${primaryBtn} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {quickWriteLoading ? <><Loader2 size={14} className="animate-spin" />{t('instructions.quickWrite.writing')}</> : <><Sparkles size={14} />{t('instructions.quickWrite.submit')}</>}
              </button>
              <button type="button" onClick={() => setShowQuickWrite(false)} className={secondaryBtn}>{t('instructions.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── AI writing assistant modal ── */}
      {showAssistant && (
        <Modal title={t('instructions.assistant.title')} onClose={closeAssistant}>
          <div className="flex flex-col" style={{ height: '420px' }}>
            {/* Message thread */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
              {assistantMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-navy-800 text-white rounded-br-sm'
                      : 'bg-stone-100 text-navy-900 rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {assistantLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                    <Loader2 size={14} className="animate-spin text-stone-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Parsed suggestion — apply to form */}
            {parsedSuggestion && (
              <div className="mb-3 bg-sage-50 border border-sage-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-sage-800">{t('instructions.assistant.readyToUse', { title: parsedSuggestion.title })}</p>
                  <p className="text-xs text-sage-700 mt-0.5">{t('instructions.assistant.suggestionMeta', {
                    steps: t('instructions.steps', { count: parsedSuggestion.stepsText.split('\n').length }),
                    category: instructionCategoryLabel(t, parsedSuggestion.category),
                    audience: instructionAudienceLabel(t, parsedSuggestion.audience),
                  })}</p>
                </div>
                <button
                  onClick={applyAssistantSuggestion}
                  className="shrink-0 text-xs font-semibold text-white bg-sage-600 hover:bg-sage-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {t('instructions.assistant.useThis')}
                </button>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                className={`${input} flex-1`}
                value={assistantInput}
                onChange={e => setAssistantInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAssistantMessage()}
                placeholder={t('instructions.assistant.placeholder')}
                disabled={assistantLoading}
              />
              <button
                onClick={sendAssistantMessage}
                disabled={!assistantInput.trim() || assistantLoading}
                className="shrink-0 btn-aurora text-white px-3 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('instructions.assistant.send')}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {(showAdd || editingInstruction) && (
        <Modal title={editingInstruction ? t('instructions.editTitle') : t('instructions.add')} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('instructions.fields.title')} required>
              <input className={input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={t('instructions.fields.titlePlaceholder')} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('instructions.fields.category')} required>
                <select className={input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {/* VALUES mirror the instructions_category_check constraint and stay English, only labels translate. */}
                  {INSTRUCTION_CATEGORIES.map(option => <option key={option.value} value={option.value}>{t(`instructions.category.${option.id}`)}</option>)}
                </select>
              </Field>
              <Field label={t('instructions.fields.audience')} required>
                <select className={input} value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}>
                  {/* VALUES are stored as-is, only labels translate. */}
                  {INSTRUCTION_AUDIENCES.map(option => <option key={option.value} value={option.value}>{t(`instructions.audience.${option.id}`)}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t('instructions.fields.body')}>
              <textarea className={input} rows={3} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder={t('instructions.fields.bodyPlaceholder')} />
            </Field>
            <Field label={t('instructions.fields.steps')}>
              <textarea className={input} rows={6} value={form.stepsText} onChange={e => setForm(p => ({ ...p, stepsText: e.target.value }))} placeholder={t('instructions.fields.stepsPlaceholder')} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('instructions.saving') : editingInstruction ? t('instructions.saveChanges') : t('instructions.add')}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>{t('instructions.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTIONS SECTION
// ─────────────────────────────────────────────────────────────
// Stored subscriptions.billing_cycle values paired with the id used to look up their
// label. Legacy lower-case spellings are still stored on older rows, so they map to a
// label too, but only the two canonical values are offered in the picker.
