// Shared presentation primitives for the member dashboard.
//
// These are the small building blocks every section reuses: the card shell, the
// empty and loading states, the modal, the labelled field, and the two button
// and one input class strings that keep every form looking the same.
//
import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export function Checkbox({ checked }) {
  return (
    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
      checked ? 'bg-navy-800 border-navy-800' : 'border-stone-300 bg-white'
    }`}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

// The invite / edit form — shared by both invite modal and edit modal

export function SectionShell({ title, subtitle, action, children }) {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-light text-navy-950">{title}</h1>
          {subtitle && <p className="text-stone-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({ icon: Icon, label, action, onAction }) {
  return (
    <div className="bg-white border border-dashed border-stone-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mb-4">
        <Icon size={20} className="text-stone-300" />
      </div>
      <p className="font-medium text-navy-800 text-sm">{label}</p>
      {action && (onAction ? (
        <button onClick={onAction} className="text-navy-700 hover:text-navy-900 underline underline-offset-2 text-xs mt-1 max-w-xs transition-colors">
          {action}
        </button>
      ) : (
        <p className="text-stone-400 text-xs mt-1 max-w-xs">{action}</p>
      ))}
    </div>
  )
}

export function LoadingSpinner() {
  const { t } = useTranslation('dashboard')
  return (
    <div className="space-y-3" aria-label={t('common.loading')} aria-busy="true">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-4 bg-white border border-stone-100 rounded-xl px-5 py-4 animate-pulse">
          <div className="h-9 w-9 rounded-full bg-stone-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-2/5 rounded-lg bg-stone-200" />
            <div className="h-2.5 w-1/3 rounded-lg bg-stone-200" />
          </div>
          <div className="h-5 w-16 rounded-full bg-stone-200" />
        </div>
      ))}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  const { t } = useTranslation('dashboard')
  // Escape closes the dialog — standard keyboard affordance.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} aria-label={t('common.close')} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// Style constants

export const input       = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors'

export const primaryBtn  = 'inline-flex items-center gap-2 btn-aurora text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-navy-700 transition-colors'

export const secondaryBtn= 'inline-flex items-center gap-2 bg-white text-stone-700 text-sm font-medium px-4 py-2 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors'

export const capitaliseFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// The documents.doc_type CHECK constraint only permits these seven values (keep this
// list in step with the DB constraint and the Type dropdown).
