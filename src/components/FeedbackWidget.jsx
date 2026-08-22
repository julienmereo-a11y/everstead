import React, { useState, useEffect } from 'react'
import { MessageSquare, X, Star, CheckCircle2 } from 'lucide-react'

const CATEGORIES = [
  { id: 'idea',      label: '💡 Idea' },
  { id: 'bug',       label: '🐞 Bug' },
  { id: 'confusing', label: '😕 Confusing' },
  { id: 'praise',    label: '❤️ Praise' },
]

/**
 * Floating in-app feedback button + modal. Posts to /api/feedback, which emails
 * the founder and stores the row. Self-contained — drop <FeedbackWidget> into
 * any authenticated page and pass the current user/profile for attribution.
 */
export default function FeedbackWidget({ profile }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [category, setCategory] = useState(null)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [coachOpen, setCoachOpen] = useState(false)

  // Hide the launcher while the planning coach panel is open (same corner)
  useEffect(() => {
    const handler = (e) => setCoachOpen(!!e.detail?.open)
    window.addEventListener('everstead:coach-state', handler)
    return () => window.removeEventListener('everstead:coach-state', handler)
  }, [])

  const reset = () => {
    setRating(0); setHover(0); setCategory(null); setMessage(''); setStatus('idle'); setErrorMsg('')
  }
  const close = () => { setOpen(false); setTimeout(reset, 250) }

  const submit = async (e) => {
    e.preventDefault()
    if (!message.trim()) { setStatus('error'); setErrorMsg('Add a short message first.'); return }
    setStatus('submitting'); setErrorMsg('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:   profile?.id || null,
          email:    profile?.email || null,
          name:     profile?.full_name || null,
          plan:     profile?.plan || null,
          rating:   rating || null,
          category,
          message:  message.trim(),
          page:     typeof window !== 'undefined' ? window.location.pathname : null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setStatus('error'); setErrorMsg(d.error || 'Could not send. Please try again.')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error'); setErrorMsg('Could not send. Please try again.')
    }
  }

  return (
    <>
      {/* Floating launcher — hidden while the coach panel is open */}
      {!open && !coachOpen && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Send feedback"
          className="fixed bottom-24 right-6 z-40 inline-flex items-center gap-2 bg-navy-900 text-white text-sm font-medium pl-4 pr-5 py-3 rounded-full shadow-lg hover:bg-navy-800 transition-colors"
        >
          <MessageSquare size={16} />
          Feedback
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl border border-stone-200 p-6">
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X size={18} />
            </button>

            {status === 'success' ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-sage-50 text-sage-700 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="font-display text-xl text-navy-950 mb-2">Thank you.</h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-5">
                  Genuinely, every note from an early member shapes what we build next. I read all of these personally.
                </p>
                <button onClick={close} className="text-sm font-medium text-navy-800 hover:text-navy-950">Close</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3 className="font-display text-xl text-navy-950 mb-1">Share your feedback</h3>
                <p className="text-sm text-stone-500 mb-5">You're one of our first members, tell me what's working and what isn't. It goes straight to me.</p>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      className="p-0.5"
                    >
                      <Star
                        size={24}
                        className={(hover || rating) >= n ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}
                      />
                    </button>
                  ))}
                </div>

                {/* Category chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(category === c.id ? null : c.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        category === c.id
                          ? 'bg-navy-900 text-white border-navy-900'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); if (status === 'error') setStatus('idle') }}
                  placeholder="What's on your mind? The more specific, the more helpful."
                  rows={4}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-stone-300 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage-500/40 focus:border-sage-500 resize-none"
                  autoFocus
                />

                {status === 'error' && <p className="text-xs text-red-700 mt-2">{errorMsg}</p>}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="mt-4 w-full inline-flex items-center justify-center px-5 py-3 text-sm font-semibold rounded-xl bg-navy-900 text-white hover:bg-navy-800 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? 'Sending…' : 'Send feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
