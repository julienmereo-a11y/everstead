import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import { hasAiConsent, grantAiConsent } from '../../../../lib/aiConsent'
import { isNative } from '../../../../lib/platform'
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

  // App Store guideline 5.1.2(i): explicit, informed consent BEFORE any message
  // is sent to the third-party AI service (Anthropic). null = still checking.
  const [consent, setConsent] = useState(null)
  const userId = auth.user?.id || (app.demo ? 'demo' : 'anon')
  useEffect(() => {
    let on = true
    hasAiConsent(userId).then(v => { if (on) setConsent(v) })
    return () => { on = false }
  }, [userId])
  const agree = async () => { await grantAiConsent(userId); setConsent(true) }
  const openPrivacy = async (e) => {
    e.preventDefault()
    const url = 'https://www.everstead.care/privacy'
    if (isNative()) { try { const { Browser } = await import('@capacitor/browser'); await Browser.open({ url }); return } catch { /* fall through */ } }
    window.open(url, '_blank', 'noopener')
  }

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

  // Consent screen — rendered INSTEAD of the chat until the user agrees, so
  // nothing can reach the AI service first. Shown in demo mode too (it's part
  // of the real product flow).
  if (consent !== true) {
    return (
      <SecScreen title="AI Assistant" onBack={() => app.go('more')}>
        {consent === false && (
          <div className="card-light" style={{ padding: 20 }}>
            <h3 className="serif" style={{ fontSize: 20, fontWeight: 600, margin: '0 0 10px' }}>Before you start</h3>
            <p className="rdet" style={{ margin: 0, lineHeight: 1.6 }}>
              The Assistant is powered by Claude, an AI service from <strong>Anthropic</strong>.
              When you send a message, <strong>the text you type</strong> is sent securely to
              Anthropic to generate a reply, processed on Everstead's behalf and{' '}
              <strong>never used to train AI models</strong>.
            </p>
            <p className="rdet" style={{ margin: '10px 0 0', lineHeight: 1.6 }}>
              The Assistant only sees what you write here — it cannot open your vault,
              documents or messages on its own. Please avoid typing passwords or full
              account numbers.
            </p>
            <p className="rdet" style={{ margin: '10px 0 0', lineHeight: 1.6 }}>
              Details are in our{' '}
              <a href="https://www.everstead.care/privacy" onClick={openPrivacy} style={{ color: 'var(--color-navy-600)', textDecoration: 'underline' }}>Privacy Policy</a>.
              You can turn AI features off anytime in Settings.
            </p>
            <button className="btn w100" style={{ marginTop: 16 }} onClick={agree}>Agree and continue</button>
            <button className="linkbtn w100" style={{ marginTop: 8, color: 'var(--color-stone-500)' }} onClick={() => app.go('more')}>Not now</button>
          </div>
        )}
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
