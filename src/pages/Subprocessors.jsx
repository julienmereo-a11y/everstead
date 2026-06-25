import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

const EFFECTIVE_DATE = '27 May 2026'
const COMPANY        = 'Everstead Digital Ltd'

// Keep this list in sync with the Adviser DPA, clause 6.
const subprocessors = [
  {
    name: 'Supabase Inc.',
    purpose: 'Managed PostgreSQL database, authentication, and encrypted file storage for vault content.',
    location: 'EU (Ireland) — data hosted in Frankfurt region',
    transferMechanism: 'UK IDTA / EU SCCs',
    website: 'https://supabase.com/privacy',
  },
  {
    name: 'Vercel Inc.',
    purpose: 'Web hosting and serverless functions (Everstead website and API endpoints).',
    location: 'USA / global edge network',
    transferMechanism: 'UK IDTA / EU SCCs',
    website: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Stripe Payments Europe Ltd.',
    purpose: 'Subscription billing and payment processing. Card details never touch Everstead servers.',
    location: 'Ireland (EU) — Stripe acts as independent controller for fraud prevention',
    transferMechanism: 'EU SCCs (where applicable)',
    website: 'https://stripe.com/privacy',
  },
  {
    name: 'Resend Inc.',
    purpose: 'Transactional email delivery (account verification, trial reminders, invoices, vault notifications).',
    location: 'USA',
    transferMechanism: 'UK IDTA / EU SCCs',
    website: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'Functional Software, Inc. (Sentry)',
    purpose: 'Error monitoring and crash reporting. Receives technical error context only — no vault content.',
    location: 'USA',
    transferMechanism: 'UK IDTA / EU SCCs',
    website: 'https://sentry.io/privacy/',
  },
  {
    name: 'Anthropic, PBC',
    purpose: 'AI-powered assistant, document scanning, and in-product guidance. Processes the messages and any documents or images a member chooses to submit to an AI feature — it is not given blanket access to a member’s vault, and runs only while AI features are switched on.',
    location: 'USA',
    transferMechanism: 'UK IDTA / EU SCCs · processed under Anthropic’s commercial API terms; Anthropic does not train on Everstead traffic',
    website: 'https://www.anthropic.com/legal/privacy',
  },
]

export default function Subprocessors() {
  useReveal()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/subprocessors/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Could not subscribe. Please try again.')
        return
      }
      setStatus('success')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setErrorMsg('Could not subscribe. Please try again.')
    }
  }

  return (
    <>
      <Helmet>
        <title>Subprocessors — Everstead</title>
        <meta name="description" content="The third-party service providers Everstead uses to deliver the platform — what they do, where data is processed, and the transfer safeguards in place under UK GDPR." />
        <link rel="canonical" href="https://www.everstead.care/subprocessors" />
      </Helmet>

      <div className="bg-stone-50 min-h-screen">

        {/* Hero — extends under the fixed nav (no top padding on wrapper);
            internal pt-40 lifts the content below the 96px nav strip */}
        <section className="pt-40 pb-16 lg:pt-44 lg:pb-20 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">Legal · Data protection</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance">
              Subprocessors
            </h1>
            <p className="mt-4 text-stone-300 text-sm">Last updated {EFFECTIVE_DATE}</p>
          </div>
        </section>

        <section className="py-20 lg:py-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 space-y-10">

            {/* Intro */}
            <div className="reveal rounded-2xl bg-white border border-stone-200 px-7 py-6 space-y-3">
              <p className="text-sm text-stone-700 leading-relaxed">
                To operate the Everstead platform we rely on a small number of trusted third-party providers ("subprocessors"). Each one has signed a Data Processing Agreement with {COMPANY} and provides appropriate safeguards under UK GDPR.
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">
                This page is the authoritative, up-to-date list. It is incorporated by reference into the <Link to="/adviser-dpa" className="text-sage-700 underline hover:text-sage-800">Adviser DPA</Link> (clause 6) and the <Link to="/privacy" className="text-sage-700 underline hover:text-sage-800">Privacy Policy</Link>.
              </p>
            </div>

            {/* Subprocessor cards */}
            <div className="reveal space-y-4">
              {subprocessors.map((sp) => (
                <div key={sp.name} className="rounded-2xl bg-white border border-stone-200 px-7 py-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="font-display text-lg font-medium text-navy-900">{sp.name}</h2>
                    <a
                      href={sp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sage-700 underline hover:text-sage-800 shrink-0 mt-1"
                    >
                      Privacy policy ↗
                    </a>
                  </div>
                  <dl className="space-y-2.5 text-sm">
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <dt className="text-stone-500 font-medium">Purpose</dt>
                      <dd className="text-stone-700">{sp.purpose}</dd>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <dt className="text-stone-500 font-medium">Data location</dt>
                      <dd className="text-stone-700">{sp.location}</dd>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-3">
                      <dt className="text-stone-500 font-medium">Transfer safeguard</dt>
                      <dd className="text-stone-700">{sp.transferMechanism}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {/* Notification clause */}
            <div className="reveal rounded-2xl bg-sage-50 border border-sage-200 px-7 py-6 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-sage-700 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-navy-900 text-sm">Changes to this list</h3>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    We will notify customers — by email and a notice on this page — at least <strong>30 days before</strong> adding or replacing a subprocessor. Adviser-plan customers may object to a change within that window; if we cannot resolve the objection, the customer may terminate their subscription for that reason without penalty.
                  </p>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    Subscribe below to receive change notifications by email. We only use your address for subprocessor-change notices — never marketing.
                  </p>

                  {status === 'success' ? (
                    <div className="flex items-start gap-2.5 mt-3 rounded-xl bg-white border border-sage-200 px-4 py-3">
                      <CheckCircle2 size={18} className="text-sage-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-navy-900">You're subscribed.</p>
                        <p className="text-xs text-stone-500 mt-0.5">A confirmation email is on its way. You can unsubscribe at any time from any notification email.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="mt-3 flex flex-col sm:flex-row gap-2.5" noValidate>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                        placeholder="you@example.com"
                        aria-label="Email address for subprocessor notifications"
                        className="flex-1 min-w-0 px-4 py-2.5 text-sm rounded-xl border border-stone-300 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500"
                        disabled={status === 'submitting'}
                      />
                      <button
                        type="submit"
                        disabled={status === 'submitting' || !email}
                        className="px-5 py-2.5 text-sm font-medium rounded-full bg-sage-700 text-white hover:bg-sage-800 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed shrink-0"
                      >
                        {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
                      </button>
                    </form>
                  )}
                  {status === 'error' && (
                    <p className="text-xs text-red-700 mt-2">{errorMsg}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer note + cross-links */}
            <div className="reveal space-y-4">
              <p className="text-xs text-stone-500 leading-relaxed">
                {COMPANY} is the controller of Everstead member account data and the processor of vault content uploaded by members or by Advisers on behalf of their clients. For full details see the <Link to="/privacy" className="text-sage-700 underline hover:text-sage-800">Privacy Policy</Link> and the <Link to="/adviser-dpa" className="text-sage-700 underline hover:text-sage-800">Adviser DPA</Link>.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <Link to="/privacy" className="inline-flex items-center gap-1.5 text-navy-800 hover:text-navy-900 font-medium">
                  Privacy Policy <ArrowRight size={13} />
                </Link>
                <Link to="/adviser-dpa" className="inline-flex items-center gap-1.5 text-navy-800 hover:text-navy-900 font-medium">
                  Adviser DPA <ArrowRight size={13} />
                </Link>
                <Link to="/security" className="inline-flex items-center gap-1.5 text-navy-800 hover:text-navy-900 font-medium">
                  Security <ArrowRight size={13} />
                </Link>
              </div>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
