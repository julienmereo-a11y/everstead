import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Briefcase, Calendar, CheckCircle2, ShieldCheck, Users, Loader2 } from 'lucide-react'
import { sendEnquiry } from '../lib/supabase'

const benefits = [
  'See the co-branded client vault and how clients experience it between meetings',
  'Walk through the adviser dashboard — readiness scores, document access, and client progress at a glance',
  'Review the trust and data-protection model used in client conversations',
  'Understand how Everstead fits alongside your existing tools without creating liability',
  'Tell us what matters to your practice — we\'ll shape the session around you',
]

export default function BookDemo() {
  useReveal()
  const [form, setForm] = useState({ name: '', email: '', firm: '', role: '', clients: '', notes: '' })
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    await sendEnquiry('book-demo', {
      'Full name':       form.name,
      'Work email':      form.email,
      'Firm':            form.firm,
      'Role':            form.role,
      'Client families': form.clients,
      'Notes':           form.notes,
    })
    setSubmitting(false)
    setSent(true)
  }

  return (
    <>
    <Helmet>
      <title>Book a 20-Minute Call — Everstead for Advisers</title>
      <meta name="description" content="We're onboarding our first adviser partners now. Book a 20-minute call with the founding team — no pitch, no contract, just a conversation about whether Everstead fits your practice." />
      <link rel="canonical" href="https://www.everstead.care/book-demo" />
      <meta property="og:title" content="Book a Call — Everstead for Advisers" />
      <meta property="og:description" content="We're working directly with our first cohort of IFAs, solicitors, and estate planners. Book a 20-minute call to see if Everstead fits your practice." />
      <meta property="og:url" content="https://www.everstead.care/book-demo" />
    </Helmet>
    <div className="bg-stone-50 pt-24 min-h-screen">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">Early access</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            We're onboarding our first adviser partners now.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-3xl mx-auto">
            Book a 20-minute call with the founding team. No pitch, no contract — just a conversation about whether Everstead fits your practice and your clients.
          </p>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-16">
          <div className="reveal">
            <h2 className="font-display text-3xl font-light text-navy-950 mb-6">What we'll cover</h2>
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
                { icon: Calendar,   title: '20-minute session', body: 'We confirm a time within one business day. Longer if you need it.' },
                { icon: Users,      title: 'Bring your team', body: 'Include colleagues from legal, advice, operations, or client success.' },
                { icon: ShieldCheck,title: 'No liability created', body: 'Everstead is an organisation tool, not a regulated service. We\'ll explain exactly where the boundaries are.' },
                { icon: Briefcase,  title: 'IFAs, solicitors, and estate planners', body: 'We\'re working with a small cohort across all three disciplines to shape how the adviser portal develops.' },
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
                <h3 className="font-display text-3xl font-light text-navy-950">We'll be in touch.</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-500 max-w-sm">
                  We'll reach out within one business day to find a time that works. In the meantime, feel free to explore the security and data promise pages.
                </p>
                <Link to="/security" className="inline-flex items-center gap-2 mt-7 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                  Review how we handle data <ArrowRight size={15} />
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
                    <input name="role" value={form.role} onChange={handleChange} required placeholder="IFA, solicitor, financial planner…" className={inputClass} />
                  </Field>
                </div>
                <Field label="Approximate number of clients you advise">
                  <input name="clients" value={form.clients} onChange={handleChange} placeholder="e.g. 75" className={inputClass} />
                </Field>
                <Field label="What matters most to you in this conversation?">
                  <textarea name="notes" rows={4} value={form.notes} onChange={handleChange} placeholder="Data handling, probate workflows, client experience, liability…" className={inputClass} />
                </Field>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: '#4c7d47' }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}
                >
                  {submitting ? <><Loader2 size={15} className="animate-spin" />Sending…</> : <>Book a 20-minute call <ArrowRight size={15} /></>}
                </button>
                <p className="text-xs leading-relaxed text-stone-500">
                  Everstead is an organisation and access tool — not a legal or financial service. No regulated advice is given on this call.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
    </>
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
