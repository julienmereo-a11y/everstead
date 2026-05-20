import React, { useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Send, Loader2, ArrowLeft, Heart } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// WHEN SOMEONE DIES — Free public AI guide
// No login required. Full-screen chat interface.
// ─────────────────────────────────────────────────────────────────────────────

const OPENING_MESSAGE = `I'm so sorry for your loss. This is one of the hardest things to navigate, and I'm here to help with the practical steps — one at a time, at your own pace.

I can guide you through registering the death, arranging the funeral, notifying banks and the government, dealing with the estate, and much more.

Where are you right now?`

const QUICK_PROMPTS = [
  { label: 'It just happened — what do I do first?', icon: '🕯️' },
  { label: 'The funeral is arranged — what comes next?', icon: '📋' },
  { label: 'I need to notify banks and institutions', icon: '🏦' },
  { label: "I'm dealing with the estate and probate", icon: '⚖️' },
]

export default function WhenSomeoneDies() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: OPENING_MESSAGE },
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef        = useRef(null)
  const inputRef              = useRef(null)

  // Only scroll to bottom after the user has sent at least one message
  useEffect(() => {
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const send = async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading) return

    const next = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res  = await fetch('/api/ai/assist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'grief-guide', messages: next }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry — something went wrong on my end. Please try again in a moment.",
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const hasStarted = messages.some(m => m.role === 'user')

  return (
    <>
      <Helmet>
        <title>What to do when someone dies — Free UK guide | Everstead</title>
        <meta
          name="description"
          content="A free, compassionate AI guide to help you navigate the practical steps after a death in the UK — from registering the death to sorting the estate."
        />
      </Helmet>

      <div className="h-screen flex flex-col bg-stone-50">

        {/* ── Header ── */}
        <header className="shrink-0 bg-white border-b border-stone-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Back to Everstead">
              <img src="/logo-v2-dark.png" alt="Everstead" className="h-8 w-auto" />
            </Link>
            <div className="hidden sm:block w-px h-5 bg-stone-200" />
            <p className="hidden sm:block text-sm text-stone-500 font-medium">
              What to do when someone dies
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-navy-700 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Everstead
          </Link>
        </header>

        {/* ── Intro — visible before user starts chatting ── */}
        {!hasStarted && (
          <div className="shrink-0 bg-white border-b border-stone-100 px-4 sm:px-6 py-6 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-stone-100 mb-3">
              <Heart size={20} className="text-stone-400" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-light text-navy-950 mb-1.5">
              What to do when someone dies
            </h1>
            <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
              A free, compassionate guide through the practical steps after a death in the UK.
              No sign-up needed — just ask.
            </p>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <img src="/favicon.png" alt="" className="w-7 h-7 rounded-xl object-cover shrink-0 mr-2.5 mt-0.5" />
                )}
                <div
                  className={`max-w-[86%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-navy-800 text-white rounded-br-sm'
                      : 'bg-white border border-stone-200 text-navy-900 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-start justify-start">
                <img src="/favicon.png" alt="" className="w-7 h-7 rounded-xl object-cover shrink-0 mr-2.5 mt-0.5" />
                <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                  <Loader2 size={14} className="animate-spin text-stone-400" />
                  <span className="text-xs text-stone-400">Thinking…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Quick prompts — only before first user message ── */}
        {!hasStarted && (
          <div className="shrink-0 bg-stone-50 border-t border-stone-100 px-4 sm:px-6 py-3">
            <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {QUICK_PROMPTS.map(({ label, icon }) => (
                <button
                  key={label}
                  onClick={() => send(label)}
                  disabled={loading}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 bg-white border border-stone-200 hover:border-navy-300 hover:bg-navy-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  <span>{icon}</span>
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input ── */}
        <div className="shrink-0 bg-white border-t border-stone-100 px-4 sm:px-6 py-3">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything — I'm here to help…"
              disabled={loading}
              aria-label="Your message"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="shrink-0 bg-navy-800 text-white px-4 py-3 rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 bg-white border-t border-stone-100 px-4 sm:px-6 py-2.5 text-center">
          <p className="text-xs text-stone-400">
            This is a guide, not legal advice. For complex estates, always seek a solicitor.
            {' '}·{' '}
            <Link
              to="/get-started"
              className="text-navy-600 hover:text-navy-800 underline underline-offset-2 transition-colors"
            >
              Organise your own estate with Everstead →
            </Link>
          </p>
        </div>

      </div>
    </>
  )
}
