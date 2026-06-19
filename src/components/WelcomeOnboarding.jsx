import React, { useState } from 'react'
import {
  Sparkles, Shield, Heart, ArrowRight, Check, X, UserCircle, Loader2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME ONBOARDING — first-run guided modal for brand-new users
// ─────────────────────────────────────────────────────────────────────────────
// Shown once (gated on profiles.onboarding_completed). Three gentle steps:
//   1. A warm, supportive welcome with the benefits + "Get started".
//   2. Confirm your details (the profile fields, pre-filled from Settings).
//   3. A nudge to set up "About Me".
// Dismissing at any point marks onboarding complete so it never nags.
// ─────────────────────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 bg-white transition-colors'

const BENEFITS = [
  { icon: Sparkles, title: 'Everything in one place', body: 'Accounts, documents, instructions and final wishes — organised and easy to find.' },
  { icon: Shield,   title: 'Only the people you choose', body: 'Share with trusted people on your terms. You stay in control of who sees what.' },
  { icon: Heart,    title: 'Peace of mind now, clarity later', body: 'A quiet, caring thing to do for the people you love — so no one is left guessing.' },
]

export default function WelcomeOnboarding({ profile, updateProfile, onClose, onGoToAboutMe }) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name:     profile?.full_name     ?? '',
    phone:         profile?.phone         ?? '',
    date_of_birth: profile?.date_of_birth ?? '',
    address_line1: profile?.address_line1 ?? '',
    address_line2: profile?.address_line2 ?? '',
    city:          profile?.city          ?? '',
    postcode:      profile?.postcode      ?? '',
    country:       profile?.country       ?? 'United Kingdom',
  })
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  // Mark onboarding done so the welcome never reappears (best-effort).
  const markDone = async () => {
    try { await updateProfile({ onboarding_completed: true }) } catch { /* non-blocking */ }
  }
  const finish = async () => { await markDone(); onClose() }
  const finishToAboutMe = async () => { await markDone(); onGoToAboutMe() }

  const saveDetails = async () => {
    setSaving(true)
    try { await updateProfile(form) } catch { /* non-blocking — they can edit in Settings */ }
    setSaving(false)
    setStep(3)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto relative">
        {/* Close (counts as "done" so it won't nag again) */}
        <button
          onClick={finish}
          aria-label="Close"
          className="absolute top-4 right-4 text-stone-300 hover:text-stone-600 transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1.5 rounded-full transition-all ${n === step ? 'w-6 bg-navy-800' : n < step ? 'w-1.5 bg-navy-400' : 'w-1.5 bg-stone-200'}`} />
          ))}
        </div>

        {/* ── Step 1 — Welcome ─────────────────────────────────── */}
        {step === 1 && (
          <div className="px-8 pb-8 pt-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-navy-950 flex items-center justify-center mx-auto mb-6">
              <Sparkles size={28} className="text-sage-300" />
            </div>
            <h2 className="font-display text-3xl font-light text-navy-950 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              Welcome to Everstead, {firstName}.
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto mb-7">
              Taking a moment to get this in order is one of the most caring things you can do for the people you love. There's no rush, and nothing is ever shared without your say-so. We'll take it one gentle step at a time — starting now.
            </p>

            <div className="space-y-3 text-left mb-8">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3 bg-stone-50 rounded-2xl p-4">
                  <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-sage-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900 leading-snug">{title}</p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full inline-flex items-center justify-center gap-2 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
              style={{ backgroundColor: '#4c7d47' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3d6b3a')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4c7d47')}
            >
              Get started <ArrowRight size={16} />
            </button>
            <button onClick={finish} className="mt-3 text-xs text-stone-400 hover:text-stone-600 transition-colors">
              I'll explore on my own
            </button>
          </div>
        )}

        {/* ── Step 2 — Confirm details ─────────────────────────── */}
        {step === 2 && (
          <div className="px-8 pb-8 pt-5">
            <h2 className="font-display text-2xl font-light text-navy-950 mb-1.5" style={{ fontFamily: 'Georgia, serif' }}>
              First, let's confirm your details
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed mb-6">
              So everything's accurate for the people who may one day need it. You can change any of this later in Settings.
            </p>

            <div className="space-y-3.5">
              <Field label="Full name">
                <input className={inputCls} value={form.full_name} onChange={set('full_name')} placeholder="Jane Smith" />
              </Field>
              <Field label="Email">
                <input className={`${inputCls} bg-stone-50 text-stone-500`} value={profile?.email ?? ''} disabled />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="+44 7700 900000" />
                </Field>
                <Field label="Date of birth">
                  <input type="date" className={inputCls} value={form.date_of_birth || ''} onChange={set('date_of_birth')} />
                </Field>
              </div>
              <Field label="Address line 1">
                <input className={inputCls} value={form.address_line1} onChange={set('address_line1')} placeholder="14 Kensington Road" />
              </Field>
              <Field label="Address line 2">
                <input className={inputCls} value={form.address_line2} onChange={set('address_line2')} placeholder="Optional" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City / Town">
                  <input className={inputCls} value={form.city} onChange={set('city')} placeholder="London" />
                </Field>
                <Field label="Postcode">
                  <input className={inputCls} value={form.postcode} onChange={set('postcode')} placeholder="SW7 2BT" />
                </Field>
              </div>
              <Field label="Country">
                <input className={inputCls} value={form.country} onChange={set('country')} placeholder="United Kingdom" />
              </Field>
            </div>

            <div className="flex items-center gap-3 mt-7">
              <button
                onClick={saveDetails}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#4c7d47' }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4c7d47')}
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <>Looks right — continue <ArrowRight size={16} /></>}
              </button>
              <button onClick={() => setStep(3)} className="text-sm font-medium text-stone-500 hover:text-stone-800 px-3 py-2">
                Skip
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 — About Me nudge ──────────────────────────── */}
        {step === 3 && (
          <div className="px-8 pb-8 pt-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center mx-auto mb-6">
              <UserCircle size={28} className="text-sage-600" />
            </div>
            <h2 className="font-display text-2xl font-light text-navy-950 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              One lovely first step: your story
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto mb-7">
              <span className="font-medium text-navy-800">About Me</span> is the warm, human heart of your plan — the life events that shaped you, a letter to the people you love, a photo, even a playlist that's unmistakably yours. It's shared only with the people you choose. It's a gentle, meaningful place to begin.
            </p>

            <button
              onClick={finishToAboutMe}
              className="w-full inline-flex items-center justify-center gap-2 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
              style={{ backgroundColor: '#4c7d47' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3d6b3a')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4c7d47')}
            >
              Set up About Me <ArrowRight size={16} />
            </button>
            <button onClick={finish} className="mt-3 inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors">
              <Check size={13} /> I'll do this later — take me to my dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
