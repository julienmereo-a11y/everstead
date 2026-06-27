import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Markdown from './Markdown'

export default function ChatWidget() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the Everstead assistant. I can help you understand how Everstead works, answer questions about pricing or features, or help you get more out of your plan. What would you like to know?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages])

  const userContext = user && profile
    ? `The user is logged in as ${profile.full_name || user.email} on the ${profile.plan || 'Essential'} plan.`
    : null

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next, userContext }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Sorry, something went wrong.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open chat"
        style={{
          position:        'fixed',
          bottom:          '24px',
          right:           '24px',
          zIndex:          9999,
          width:           '52px',
          height:          '52px',
          borderRadius:    '50%',
          background:      '#4c7d47',
          border:          'none',
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       '0 4px 16px rgba(0,0,0,0.18)',
          transition:      'transform 0.15s, background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#3d6439'}
        onMouseLeave={e => e.currentTarget.style.background = '#4c7d47'}
      >
        {open
          ? <X size={22} color="#fff" />
          : <MessageCircle size={22} color="#fff" />
        }
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position:      'fixed',
          bottom:        '88px',
          right:         '24px',
          zIndex:        9998,
          width:         '360px',
          maxWidth:      'calc(100vw - 32px)',
          height:        '480px',
          background:    '#ffffff',
          borderRadius:  '16px',
          boxShadow:     '0 8px 40px rgba(0,0,0,0.16)',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
          fontFamily:    'Georgia, serif',
        }}>
          {/* Header */}
          <div style={{ background: '#0d1628', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/favicon.png" alt="" width="24" height="24" style={{ borderRadius: '4px' }} />
            <div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>Everstead</div>
              <div style={{ color: '#4c7d47', fontSize: '11px', letterSpacing: '0.05em' }}>AI Assistant</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth:     '82%',
                  padding:      '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background:   m.role === 'user' ? '#0d1628' : '#f5f4f0',
                  color:        m.role === 'user' ? '#ffffff' : '#2d3748',
                  fontSize:     '13px',
                  lineHeight:   '1.6',
                  whiteSpace:   'pre-wrap',
                }}>
                  {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#f5f4f0' }}>
                  <Loader2 size={16} color="#9ca3af" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e5e0', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask a question…"
              rows={1}
              style={{
                flex:        1,
                border:      '1px solid #d1cec8',
                borderRadius:'8px',
                padding:     '8px 12px',
                fontSize:    '13px',
                fontFamily:  'Georgia, serif',
                resize:      'none',
                outline:     'none',
                lineHeight:  '1.5',
                color:       '#0d1628',
                background:  '#fafafa',
                maxHeight:   '80px',
                overflowY:   'auto',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                background:   input.trim() && !loading ? '#4c7d47' : '#d1cec8',
                border:       'none',
                borderRadius: '8px',
                padding:      '8px 10px',
                cursor:       input.trim() && !loading ? 'pointer' : 'default',
                display:      'flex',
                alignItems:   'center',
                transition:   'background 0.15s',
                flexShrink:   0,
              }}
            >
              <Send size={16} color="#fff" />
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
