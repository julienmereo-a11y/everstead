import React, { useRef, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import SecScreen from '../components/SecScreen'

// AI Assistant — the same `ai-assistant` Supabase Edge Function the web uses.
// Text chat parity; the web's file-upload + auto-write proposal cards are a
// follow-up (the prose reply still guides the user to the right section).
function stripProposals(reply) {
  return reply.replace(/```json[\s\S]*?```/g, '').trim()
}

export default function AssistantScreen({ app }) {
  const auth = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello — I'm here to help you organise your accounts, documents, people and wishes. What would you like to sort out first?" },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scroller = useRef(null)

  // Respect the profile's AI toggle (Settings → AI features), like the website —
  // when off, the assistant is hidden from More AND unreachable here.
  const profile = app.profile || auth.profile
  if (profile?.ai_features_enabled === false) {
    return (
      <SecScreen title="AI Assistant" onBack={() => app.go('more')}>
        <div className="card-light" style={{ padding: 18 }}>
          <p className="rdet" style={{ margin: 0, lineHeight: 1.55 }}>
            AI features are turned off for your account. You can switch them back on in Settings → AI features.
          </p>
        </div>
      </SecScreen>
    )
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setError(null)
    setLoading(true)
    // Demo mode: no backend — reply with a canned, on-brand response.
    if (app.demo) {
      setTimeout(() => {
        setMessages(h => [...h, { role: 'assistant', content: "In the live app I'd help you capture that — for example, adding an account or drafting a note to a loved one. This is a preview, so I'm not connected right now." }])
        setLoading(false)
      }, 500)
      return
    }
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('ai-assistant', { body: { messages: next, file: null } })
      if (invokeErr) throw invokeErr
      const reply = stripProposals(data?.reply || '') || "I've noted that."
      setMessages(h => [...h, { role: 'assistant', content: reply }])
      setTimeout(() => { const s = scroller.current; if (s) s.scrollTop = s.scrollHeight }, 50)
    } catch {
      setError('The assistant is unavailable right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scr fx col" style={{ height: '100%' }}>
      <div className="head" style={{ paddingBottom: 10 }}>
        <div className="fx ac gap12">
          <button onClick={() => app.go('more')} aria-label="Back" style={{ background: 'none', border: 0, padding: 0, color: 'var(--color-stone-500)', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 5l-6 6 6 6" /></svg>
          </button>
          <h1 className="h1" style={{ fontSize: 26 }}>AI Assistant</h1>
        </div>
      </div>

      <div ref={scroller} className="f1" style={{ overflowY: 'auto', padding: '4px 20px 12px' }}>
        <div className="fx col gap12">
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
              <div style={{
                padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                background: m.role === 'user' ? 'var(--color-navy-600)' : '#fff',
                color: m.role === 'user' ? '#fff' : 'var(--color-stone-800)',
                border: m.role === 'user' ? 0 : '1px solid var(--color-stone-200)',
                whiteSpace: 'pre-wrap',
              }}>{m.content}</div>
            </div>
          ))}
          {loading && <div className="rdet">Thinking…</div>}
          {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
        </div>
      </div>

      <div className="fx gap12 ac" style={{ padding: '10px 20px 24px', borderTop: '1px solid var(--color-stone-200)' }}>
        <input
          className="inp" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
          placeholder="Ask anything…"
        />
        <button className={`btn ${input.trim() && !loading ? '' : 'dis'}`} style={{ flex: 'none' }} onClick={send}>Send</button>
      </div>
    </div>
  )
}
