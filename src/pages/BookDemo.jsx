import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Briefcase, Calendar, CheckCircle2, ShieldCheck, Users } from 'lucide-react'

const benefits = [
  'See the advisor pilot rollout for a single firm from onboarding to first client families',
  'Walk through the trust center and data-protection model used in client conversations',
  'Review the delegate dashboard experience — the moment families care about most',
  'Explore annual review prompts, readiness scoring, and alert-driven engagement',
  'Discuss pricing and rollout tailored to your practice',
]

export default function BookDemo() {
  useReveal()
  const [form, setForm] = useState({ name: '', email: '', firm: '', role: '', clients: '', notes: '' })
  const [sent, setSent] = useState(false)

  const handleChange = (event) => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const handleSubmit = (event) => {
    event.preventDefault()
    setSent(true)
  }

  return (
    <div className="bg-stone-50 pt-24 min-h-screen">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">Advisor pilot demo</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            See how one partner firm can make Everstead feel trusted from day one.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-3xl mx-auto">
            A focused walkthrough for financial advisors, estate lawyers, and private client teams evaluating Everstead as a client-facing readiness service.
          </p>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-16">
          <div className="reveal">
            <h2 className="font-display text-3xl font-light text-navy-950 mb-6">What you’ll see</h2>
            <ul className="space-y-3 mb-10">
              {benefits.map(item => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-stone-700">
                  <CheckCircle2 size={16} className="text-sage-600 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="space-y-4">
              {[
                { icon: Calendar, title: '30-minute session', body: 'We confirm a time within one business day.' },
                { icon: Users, title: 'Bring your team', body: 'Include colleagues from legal, advice, operations, or client success.' },
                { icon: ShieldCheck, title: 'Trust-first conversation', body: 'Security, delegate access, and legal boundaries are part of the walkthrough, not an afterthought.' },
                { icon: Briefcase, title: 'Designed for one pilot firm first', body: 'The goal is a repeatable rollout motion, not a generic enterprise pitch.' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4">
                  <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-500">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal reveal-delay-1">
            {sent ? (
              <div className="rounded-[2rem] border border-stone-200 bg-white p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center mb-5">
                  <CheckCircle2 size={28} className="text-sage-700" />
                </div>
                <h3 className="font-display text-3xl font-light text-navy-950">Request received</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-500 max-w-sm">
                  We’ll reach out within one business day to line up your pilot conversation and tailor the walkthrough to your practice.
                </p>
                <Link to="/security" className="inline-flex items-center gap-2 mt-7 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                  Review trust details while you wait <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-[2rem] border border-stone-200 bg-white p-8 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name">
                    <input name="name" value={form.name} onChange={handleChange} required placeholder="Your name" className={inputClass} />
                  </Field>
                  <Field label="Work email">
                    <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@firm.com" className={inputClass} />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Firm name">
                    <input name="firm" value={form.firm} onChange={handleChange} required placeholder="Your firm" className={inputClass} />
                  </Field>
                  <Field label="Role">
                    <input name="role" value={form.role} onChange={handleChange} placeholder="Advisor, solicitor, partner…" className={inputClass} />
                  </Field>
                </div>
                <Field label="Approximate number of families you advise">
                  <input name="clients" value={form.clients} onChange={handleChange} placeholder="e.g. 75" className={inputClass} />
                </Field>
                <Field label="What matters most in the conversation?">
                  <textarea name="notes" rows={5} value={form.notes} onChange={handleChange} placeholder="Security questions, pilot rollout, delegate access, annual reviews…" className={inputClass} />
                </Field>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 px-5 py-3.5 text-sm font-semibold text-white hover:bg-navy-700 transition-colors">
                  Request advisor pilot demo <ArrowRight size={15} />
                </button>
                <p className="text-xs leading-relaxed text-stone-500">
                  Everstead is an organisation platform, not a legal service. This conversation is about product fit, rollout, and trust — not legal advice.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-stone-600 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-navy-900 placeholder-stone-400 transition focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-300'
