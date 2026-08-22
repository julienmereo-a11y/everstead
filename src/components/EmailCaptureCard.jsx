import React, { useState } from 'react'
import { Mail, CheckCircle2 } from 'lucide-react'

/**
 * Top-of-funnel email capture card used at the bottom of free tools.
 *
 * Props:
 *   source     — tool slug, must match one of the API's SOURCES keys:
 *                'executor-checklist' | 'digital-estate-calculator' | 'when-someone-dies'
 *   title      — h2 inside the card
 *   subtitle   — short blurb under the title
 *   buttonLabel — submit button text
 *   metadata   — optional object passed back to the email template
 *                (e.g. { total, breakdown } for the calculator)
 */
export default function EmailCaptureCard({
  source,
  title       = 'Want the full version by email?',
  subtitle    = "We'll send it to your inbox. One email, no spam.",
  buttonLabel = 'Send it to me',
  metadata    = null,
}) {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [consent,  setConsent]  = useState(true)
  const [status,   setStatus]   = useState('idle')    // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return
    if (!email.trim()) { setStatus('error'); setErrorMsg('Please enter your email.'); return }
    if (!consent)      { setStatus('error'); setErrorMsg('Please tick the consent box to continue.'); return }

    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/leads/capture', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), name: name.trim() || null, source, metadata }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || "Something went wrong. Please try again.")
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg("Something went wrong. Please try again.")
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-sage-50 border border-sage-200 p-7 lg:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="text-sage-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-xl text-navy-950 mb-2">Check your inbox.</h3>
            <p className="text-sm text-stone-700 leading-relaxed">
              We've just emailed you the full version. If you don't see it in a minute or two, check your spam folder, and please mark it as <em>not spam</em> so future emails reach you.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-7 lg:p-8 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <Mail size={22} className="text-sage-700 shrink-0 mt-1" />
        <div>
          <h3 className="font-display text-xl text-navy-950 mb-1">{title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (status === 'error') setStatus('idle') }}
            placeholder="Your first name (optional)"
            aria-label="First name"
            autoComplete="given-name"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-300 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500"
            disabled={status === 'submitting'}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
            placeholder="you@example.com"
            aria-label="Email address"
            autoComplete="email"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-300 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500"
            disabled={status === 'submitting'}
          />
        </div>

        <label className="flex items-start gap-2.5 text-xs text-stone-500 leading-relaxed cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => { setConsent(e.target.checked); if (status === 'error') setStatus('idle') }}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-sage-700 focus:ring-sage-500/40"
          />
          <span>
            Send me the result, plus the occasional Everstead guide. I can unsubscribe at any time. See our <a href="/privacy" target="_blank" rel="noopener" className="underline hover:text-stone-700">privacy policy</a>.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl bg-navy-900 text-white hover:bg-navy-800 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Sending…' : buttonLabel}
          </button>
          {status === 'error' && (
            <p className="text-xs text-red-700" role="alert">{errorMsg}</p>
          )}
        </div>
      </form>
    </div>
  )
}
