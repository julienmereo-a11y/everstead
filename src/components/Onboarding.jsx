import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, X, ArrowRight, Sparkles } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// CHECKOUT SUCCESS BANNER
// Appears at top of Dashboard after redirect from Stripe
// ─────────────────────────────────────────────────────────────
export function CheckoutSuccessBanner({ userName }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [visible, setVisible]           = useState(false)

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setVisible(true)
      // Clean URL without reload
      const next = new URLSearchParams(searchParams)
      next.delete('checkout')
      next.delete('trial')
      setSearchParams(next, { replace: true })
    }
  }, [])

  if (!visible) return null

  return (
    <div className="bg-gradient-to-r from-sage-600 to-sage-700 text-white px-6 py-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <Sparkles size={18} className="text-white" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm">
          Welcome to Everstead{userName ? `, ${userName.split(' ')[0]}` : ''}! Your 14-day free trial has started.
        </p>
        <p className="text-sage-100 text-xs mt-0.5">
          Add your first account or document to begin building your plan.
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ONBOARDING CHECKLIST
// Shown in Overview section until all steps are complete
// ─────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    id: 'account',
    label: 'Add your first financial account',
    desc: 'Bank, investment, or insurance — any account counts.',
    section: 'accounts',
  },
  {
    id: 'document',
    label: 'Upload a key document',
    desc: 'A will, insurance policy, or ID document.',
    section: 'documents',
  },
  {
    id: 'person',
    label: 'Invite a trusted person',
    desc: 'Add an executor, spouse, or family member.',
    section: 'people',
  },
  {
    id: 'instruction',
    label: 'Write your first instruction',
    desc: 'A simple "first 48 hours" checklist for your executor.',
    section: 'instructions',
  },
]

export function OnboardingChecklist({ accounts, documents, people, instructions, onNavigate }) {
  const completed = {
    account:     accounts.length     > 0,
    document:    documents.filter(d => d.status !== 'missing').length > 0,
    person:      people.length       > 0,
    instruction: instructions.length > 0,
  }

  const doneCount = Object.values(completed).filter(Boolean).length
  const allDone   = doneCount === ONBOARDING_STEPS.length

  // Hide once all complete + dismissed
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('everstead_onboarding_dismissed') === 'true'
  )

  if (allDone && dismissed) return null
  if (dismissed && doneCount < ONBOARDING_STEPS.length) return null // keep showing if not done

  const handleDismiss = () => {
    localStorage.setItem('everstead_onboarding_dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="font-semibold text-navy-900 text-sm">Set up your plan</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {doneCount} of {ONBOARDING_STEPS.length} steps complete
          </p>
        </div>
        {allDone ? (
          <button onClick={handleDismiss} className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1">
            Dismiss <X size={12} />
          </button>
        ) : (
          <div className="text-right">
            <p className="text-2xl font-display font-light text-navy-950">{Math.round((doneCount / ONBOARDING_STEPS.length) * 100)}%</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-sage-500 rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / ONBOARDING_STEPS.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {ONBOARDING_STEPS.map(step => {
          const done = completed[step.id]
          return (
            <div
              key={step.id}
              onClick={() => !done && onNavigate(step.section)}
              className={`flex items-center gap-4 p-3.5 rounded-xl transition-colors ${
                done
                  ? 'bg-stone-50 cursor-default'
                  : 'bg-white border border-stone-100 hover:border-navy-200 hover:bg-navy-50 cursor-pointer group'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                done ? 'bg-sage-500' : 'bg-stone-100 group-hover:bg-navy-100'
              }`}>
                {done
                  ? <CheckCircle2 size={14} className="text-white" />
                  : <span className="text-xs font-bold text-stone-400">{ONBOARDING_STEPS.indexOf(step) + 1}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${done ? 'text-stone-400 line-through' : 'text-navy-800'}`}>
                  {step.label}
                </p>
                {!done && <p className="text-xs text-stone-400 mt-0.5">{step.desc}</p>}
              </div>
              {!done && (
                <ArrowRight size={14} className="text-stone-300 group-hover:text-navy-500 transition-colors shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {allDone && (
        <div className="mt-4 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Sparkles size={16} className="text-sage-600 shrink-0" />
          <p className="text-sm text-sage-800 font-medium">
            Great work — your plan is off to a strong start. Keep adding to improve your readiness score.
          </p>
        </div>
      )}
    </div>
  )
}
