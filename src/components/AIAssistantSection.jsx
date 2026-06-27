import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Send, Loader2, Paperclip, X, Check, AlertTriangle,
  CheckCircle2, Lock, Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Markdown from './Markdown'

// ─────────────────────────────────────────────────────────────────────────────
// YOUR AI ASSISTANT
// ─────────────────────────────────────────────────────────────────────────────
// A logged-in helper: the user chats or drops in a document, the assistant
// proposes structured entries, the user reviews and confirms, and ONLY confirmed
// entries are written to their account (client-side, under their own RLS).
//
// The assistant NEVER writes to the database directly. The Anthropic API key
// lives only in the `ai-assistant` Supabase Edge Function — never in this bundle.
// ─────────────────────────────────────────────────────────────────────────────

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/png,image/jpeg,image/gif,image/webp'
const MAX_FILE_MB = 8

// Field config per proposable type — maps 1:1 to the real Everstead schema.
const TYPE_META = {
  account: {
    label: 'Account',
    required: ['institution'],
    defaults: { account_type: 'Account', category: 'Other', status: 'active' },
    fields: [
      { key: 'institution',        label: 'Institution',     type: 'text' },
      { key: 'category',           label: 'Category',        type: 'select', options: ['Banking', 'Retirement', 'Investment', 'Insurance', 'Digital', 'Property', 'Other'] },
      { key: 'account_type',       label: 'Type',            type: 'text', placeholder: 'e.g. Current account, Cash ISA' },
      { key: 'account_number_hint',label: 'Last 4 digits',   type: 'text' },
      { key: 'balance_display',    label: 'Balance',         type: 'text', placeholder: 'optional' },
      { key: 'notes',              label: 'Notes',           type: 'textarea' },
    ],
  },
  trusted_person: {
    label: 'Trusted person',
    required: ['name', 'email'],
    defaults: { role: 'Contact', invite_status: 'pending' },
    fields: [
      { key: 'name',  label: 'Name',  type: 'text' },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'role',  label: 'Role',  type: 'text', placeholder: 'e.g. Executor, Next of kin' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  document: {
    label: 'Document',
    required: ['name'],
    defaults: { doc_type: 'Other', status: 'current' },
    fields: [
      { key: 'name',       label: 'Name',        type: 'text' },
      { key: 'doc_type',   label: 'Type',        type: 'select', options: ['Legal', 'Finance', 'Insurance', 'Property', 'Personal', 'Medical', 'Other'] },
      { key: 'expires_at', label: 'Expiry date', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'notes',      label: 'Notes',       type: 'textarea' },
    ],
  },
  wish: {
    label: 'Wish',
    required: ['title'],
    defaults: { category: 'Other' },
    fields: [
      { key: 'category', label: 'Category', type: 'select', options: ['Funeral', 'Personal Letters', 'Sentimental Items', 'Digital Legacy', 'Other'] },
      { key: 'title',    label: 'Title',    type: 'text' },
      { key: 'body',     label: 'Details',  type: 'textarea' },
    ],
  },
  about_me: {
    label: 'About Me',
    required: [],
    defaults: {},
    fields: [
      { key: 'passions',    label: 'Passions',      type: 'textarea' },
      { key: 'reflections', label: 'Reflections',   type: 'textarea' },
      { key: 'spotify_url', label: 'Playlist link', type: 'text' },
    ],
  },
}

let cardSeq = 0

// Pull a ```json { proposals: [...] } ``` block out of a reply, returning the
// cleaned prose and the validated proposals. Defensive: never throws.
function parseReply(text) {
  if (!text) return { prose: '', proposals: [] }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  let proposals = []
  let prose = text
  if (fence) {
    prose = text.replace(fence[0], '').trim()
    try {
      const parsed = JSON.parse(fence[1].trim())
      const raw = Array.isArray(parsed) ? parsed : parsed?.proposals
      if (Array.isArray(raw)) {
        proposals = raw
          .filter(p => p && TYPE_META[p.type])
          .map(p => {
            const meta = TYPE_META[p.type]
            const allowed = new Set(meta.fields.map(f => f.key))
            const fields = {}
            for (const f of meta.fields) fields[f.key] = p.fields?.[f.key] ?? ''
            const confidence = {}
            for (const k of Object.keys(p.confidence || {})) {
              if (allowed.has(k)) confidence[k] = p.confidence[k] === 'low' ? 'low' : 'high'
            }
            const lifeEvents = p.type === 'about_me' && Array.isArray(p.fields?.life_events)
              ? p.fields.life_events.filter(e => e && (e.year || e.description))
              : null
            return { id: `c${++cardSeq}`, type: p.type, fields, confidence, lifeEvents, approved: false, status: 'idle', error: null }
          })
      }
    } catch { /* ignore malformed JSON — just show the prose */ }
  }
  return { prose, proposals }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AIAssistantSection({
  profile, isDemo,
  addAccount, addPerson, addDocument, addWish, uploadFile, saveAboutMe, aboutMe,
}) {
  const aiEnabled = profile?.ai_features_enabled !== false

  // Persist the conversation so it survives closing/reopening (per user).
  const chatKey = profile?.id && !isDemo ? `everstead_ai_chat_${profile.id}` : null
  const [messages, setMessages] = useState(() => {
    if (!chatKey) return []
    try { return JSON.parse(localStorage.getItem(chatKey) || '[]') } catch { return [] }
  }) // API history: {role,content}
  useEffect(() => {
    if (!chatKey) return
    try {
      if (messages.length) localStorage.setItem(chatKey, JSON.stringify(messages.slice(-40)))
      else localStorage.removeItem(chatKey)
    } catch { /* storage unavailable — non-fatal */ }
  }, [messages, chatKey])
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState(null) // { file, name, media_type, base64 }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cards, setCards] = useState([])
  const [keepFile, setKeepFile] = useState(null) // File the user can keep/discard after processing
  const [keepStatus, setKeepStatus] = useState('idle')
  const fileInput = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    // depend on cards.length (not cards) so editing a field doesn't yank the scroll
  }, [messages, loading, cards.length, keepFile])

  // Defensive: if AI is off, this section shouldn't be reachable (nav + route
  // are gated), but render a clear state just in case.
  if (!aiEnabled) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
          <Lock size={22} className="text-stone-400" />
        </div>
        <h2 className="font-display text-2xl font-light text-navy-950 mb-2">AI features are turned off</h2>
        <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
          You can turn them back on any time in <span className="font-medium text-navy-700">Settings → AI features</span>. Nothing is sent to an AI provider while they're off.
        </p>
      </div>
    )
  }

  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is too large. Please use one under ${MAX_FILE_MB}MB.`)
      return
    }
    const okType = /^(application\/pdf|image\/(png|jpeg|gif|webp))$/.test(file.type)
    if (!okType) {
      setError('Please upload a PDF or an image (PNG, JPG, GIF, or WebP).')
      return
    }
    setError(null)
    const base64 = await fileToBase64(file)
    setPendingFile({ file, name: file.name, media_type: file.type, base64 })
  }

  const send = async () => {
    if (isDemo) return
    const text = input.trim()
    if ((!text && !pendingFile) || loading) return

    const userMsg = { role: 'user', content: text || `(uploaded ${pendingFile?.name})` }
    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setInput('')
    setError(null)
    setLoading(true)

    const sentFile = pendingFile
    setPendingFile(null)

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: nextHistory,
          file: sentFile ? { data: sentFile.base64, media_type: sentFile.media_type } : null,
        },
      })
      if (invokeErr) {
        // Surface the function's JSON error message when present
        let msg = 'The assistant is unavailable right now. Please try again.'
        try { msg = (await invokeErr.context?.json())?.error || msg } catch { /* keep default */ }
        throw new Error(msg)
      }
      const reply = data?.reply || ''
      const { prose, proposals } = parseReply(reply)
      setMessages(h => [...h, { role: 'assistant', content: prose || reply }])
      if (proposals.length) setCards(c => [...c, ...proposals])
      // After a file is processed, ask whether to keep it in the vault.
      if (sentFile && /^(application\/pdf|image\/)/.test(sentFile.media_type)) {
        setKeepFile(sentFile)
        setKeepStatus('idle')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages(h => h.slice(0, -1)) // roll back the optimistic user turn isn't needed; keep it
    } finally {
      setLoading(false)
    }
  }

  // ── Proposal card editing ──────────────────────────────────────────────────
  const editField = (id, key, value) =>
    setCards(cs => cs.map(c => c.id === id ? { ...c, fields: { ...c.fields, [key]: value }, status: 'idle', error: null } : c))
  const toggleApprove = (id) =>
    setCards(cs => cs.map(c => c.id === id ? { ...c, approved: !c.approved } : c))
  const dismissCard = (id) =>
    setCards(cs => cs.filter(c => c.id !== id))
  const dropLifeEvent = (id, idx) =>
    setCards(cs => cs.map(c => c.id === id ? { ...c, lifeEvents: c.lifeEvents.filter((_, i) => i !== idx) } : c))

  const validate = (card) => {
    const meta = TYPE_META[card.type]
    for (const key of meta.required) {
      if (!String(card.fields[key] ?? '').trim()) {
        const label = meta.fields.find(f => f.key === key)?.label || key
        return `${label} is needed before this can be saved.`
      }
    }
    return null
  }

  const writeCard = async (card) => {
    const meta = TYPE_META[card.type]
    const clean = {}
    for (const f of meta.fields) {
      const v = String(card.fields[f.key] ?? '').trim()
      if (v) clean[f.key] = v
    }
    const payload = { ...meta.defaults, ...clean }

    if (card.type === 'account') {
      await addAccount(payload)
    } else if (card.type === 'trusted_person') {
      await addPerson(payload)
    } else if (card.type === 'document') {
      await addDocument(payload)
    } else if (card.type === 'wish') {
      await addWish(payload)
    } else if (card.type === 'about_me') {
      const existing = Array.isArray(aboutMe?.life_events) ? aboutMe.life_events : []
      const merged = card.lifeEvents?.length ? [...existing, ...card.lifeEvents] : existing
      await saveAboutMe({ ...clean, life_events: merged })
    }
  }

  const addConfirmed = async () => {
    const approved = cards.filter(c => c.approved && c.status !== 'saved')
    if (!approved.length) return
    for (const card of approved) {
      const err = validate(card)
      if (err) {
        setCards(cs => cs.map(c => c.id === card.id ? { ...c, status: 'error', error: err } : c))
        continue
      }
      setCards(cs => cs.map(c => c.id === card.id ? { ...c, status: 'saving', error: null } : c))
      try {
        await writeCard(card)
        setCards(cs => cs.map(c => c.id === card.id ? { ...c, status: 'saved' } : c))
      } catch (e) {
        setCards(cs => cs.map(c => c.id === card.id ? { ...c, status: 'error', error: e.message || 'Could not save this.' } : c))
      }
    }
    // Clear saved cards shortly after, so the list reflects what's left to do.
    setTimeout(() => setCards(cs => cs.filter(c => c.status !== 'saved')), 1500)
  }

  const keepDocument = async () => {
    if (!keepFile || !uploadFile) return
    setKeepStatus('saving')
    try {
      await uploadFile(
        { name: keepFile.name, doc_type: 'Other', notes: 'Added via your AI Assistant' },
        keepFile.file,
      )
      setKeepStatus('saved')
      setTimeout(() => setKeepFile(null), 1500)
    } catch {
      setKeepStatus('error')
    }
  }

  const approvedCount = cards.filter(c => c.approved && c.status !== 'saved').length
  const grouped = Object.keys(TYPE_META)
    .map(type => ({ type, items: cards.filter(c => c.type === type) }))
    .filter(g => g.items.length)

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-navy-950 flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-sage-300" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-light text-navy-950 leading-tight">Your AI Assistant</h1>
          <p className="text-sm text-stone-500 mt-0.5 leading-relaxed">
            Chat, or drop in a document — I'll suggest entries for you to review. Nothing is saved until you confirm it.
          </p>
        </div>
      </div>

      {/* Conversation */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <div ref={scrollRef} className="px-5 py-5 space-y-4 max-h-[min(60vh,560px)] overflow-y-auto">
          {/* Greeting */}
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-navy-950 flex items-center justify-center shrink-0">
              <Sparkles size={13} className="text-sage-300" />
            </div>
            <div className="bg-stone-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-navy-900 leading-relaxed max-w-[85%]">
              Hello{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}. I'm here to help you set things up, one small step at a time — no rush. You can tell me about an account, a person you trust, or a wish, or drop in a document and I'll read it. What feels like a good first step?
            </div>
          </div>

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-navy-950 flex items-center justify-center shrink-0">
                  <Sparkles size={13} className="text-sage-300" />
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] ${
                m.role === 'user'
                  ? 'bg-navy-800 text-white rounded-tr-sm whitespace-pre-wrap'
                  : 'bg-stone-50 text-navy-900 rounded-tl-sm'
              }`}>
                {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-navy-950 flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-sage-300" />
              </div>
              <div className="bg-stone-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-stone-400 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </div>
            </div>
          )}

          {/* Keep / discard an uploaded document — inline in the conversation */}
          {keepFile && (
            <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Paperclip size={16} className="text-sage-700 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">Keep “{keepFile.name}” in your vault?</p>
                  <p className="text-xs text-stone-500">It isn't stored unless you choose to keep it.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {keepStatus === 'saved' ? (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={14} /> Kept</span>
                ) : (
                  <>
                    <button onClick={() => setKeepFile(null)} className="text-xs font-medium text-stone-500 hover:text-stone-800 px-3 py-2">Discard</button>
                    <button
                      onClick={keepDocument}
                      disabled={keepStatus === 'saving'}
                      className="text-xs font-semibold bg-navy-800 text-white px-4 py-2 rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-50"
                    >
                      {keepStatus === 'saving' ? 'Keeping…' : keepStatus === 'error' ? 'Try again' : 'Keep in vault'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Suggested entries — inline in the conversation, right under the message */}
          {grouped.length > 0 && (
            <div className="border-t border-stone-100 pt-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-sage-700 bg-sage-50 px-2 py-0.5 rounded-full">Suggested entries</span>
                <span className="text-xs text-stone-400">Tick what you'd like, edit anything, then add.</span>
              </div>
              <div className="space-y-5">
                {grouped.map(group => (
                  <div key={group.type}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">{TYPE_META[group.type].label}</p>
                    <div className="space-y-3">
                      {group.items.map(card => (
                        <ProposalCard
                          key={card.id}
                          card={card}
                          onEdit={editField}
                          onToggle={toggleApprove}
                          onDismiss={dismissCard}
                          onDropLifeEvent={dropLifeEvent}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={addConfirmed}
                  disabled={approvedCount === 0}
                  className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                  style={{ backgroundColor: '#4c7d47' }}
                >
                  <Check size={16} /> Add {approvedCount > 0 ? `${approvedCount} ` : ''}confirmed item{approvedCount === 1 ? '' : 's'}
                </button>
                <span className="text-xs text-stone-400">Only ticked items are saved.</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-stone-100 p-3">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-2 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
          {pendingFile && (
            <div className="flex items-center justify-between gap-2 bg-sage-50 border border-sage-200 rounded-xl px-3 py-2 mb-2">
              <span className="text-xs text-sage-800 truncate flex items-center gap-2">
                <Paperclip size={13} /> {pendingFile.name}
              </span>
              <button onClick={() => setPendingFile(null)} className="text-sage-600 hover:text-sage-900 shrink-0"><X size={14} /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInput.current?.click()}
              disabled={isDemo || loading}
              title="Attach a document or image"
              className="shrink-0 w-9 h-9 rounded-xl border border-stone-200 text-stone-500 hover:text-navy-700 hover:border-navy-300 transition-colors flex items-center justify-center disabled:opacity-40"
            >
              <Paperclip size={16} />
            </button>
            <input ref={fileInput} type="file" accept={ACCEPTED} className="hidden" onChange={pickFile} />
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
              disabled={isDemo || loading}
              placeholder={isDemo ? 'Sign in to your account to chat with the assistant' : 'Tell me about an account, a person, a wish…'}
              className="flex-1 resize-none border border-stone-200 rounded-xl px-3 py-2 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 max-h-32 disabled:bg-stone-50"
            />
            <button
              onClick={send}
              disabled={isDemo || loading || (!input.trim() && !pendingFile)}
              className="shrink-0 w-9 h-9 rounded-xl bg-navy-800 text-white hover:bg-navy-700 transition-colors flex items-center justify-center disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Reassurance copy (exact, required) */}
      <p className="text-xs text-stone-400 leading-relaxed mt-3 px-1">
        Your AI Assistant works only inside your Everstead account and never shares your information elsewhere. Nothing is saved until you review and confirm it — it suggests, you decide. Your documents are protected with the same AES-256 encryption as the rest of Everstead, and are never used to train AI or for advertising. You can switch AI features off any time in Settings.
      </p>

      {isDemo && (
        <p className="text-xs text-amber-600 mt-2 px-1">Demo mode — the assistant is read-only here. Start your own plan to use it for real.</p>
      )}
    </div>
  )
}

// ── A single editable proposal card ───────────────────────────────────────────
function ProposalCard({ card, onEdit, onToggle, onDismiss, onDropLifeEvent }) {
  const meta = TYPE_META[card.type]
  const saved = card.status === 'saved'
  return (
    <div className={`rounded-2xl border-2 p-4 transition-colors ${
      saved ? 'border-emerald-200 bg-emerald-50'
        : card.approved ? 'border-navy-300 bg-navy-50/40'
        : 'border-stone-200 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative shrink-0">
            <input type="checkbox" className="sr-only peer" checked={card.approved} disabled={saved} onChange={() => onToggle(card.id)} />
            <div className="w-9 h-5 rounded-full bg-stone-200 peer-checked:bg-navy-700 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm font-medium text-navy-900">{saved ? 'Saved' : card.approved ? 'Will be added' : 'Approve'}</span>
        </label>
        {!saved && (
          <button onClick={() => onDismiss(card.id)} title="Dismiss" className="text-stone-300 hover:text-red-500 transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {meta.fields.map(f => {
          const low = card.confidence[f.key] === 'low'
          const full = f.type === 'textarea'
          return (
            <div key={f.key} className={full ? 'sm:col-span-2' : ''}>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-medium text-stone-500">{f.label}</label>
                {low && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle size={9} /> Please check this
                  </span>
                )}
              </div>
              {f.type === 'select' ? (
                <select
                  value={card.fields[f.key] || ''}
                  disabled={saved}
                  onChange={e => onEdit(card.id, f.key, e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-navy-300 ${low ? 'border-amber-300 ring-1 ring-amber-200' : 'border-stone-200'}`}
                >
                  <option value="">Select…</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  value={card.fields[f.key] || ''}
                  disabled={saved}
                  rows={2}
                  placeholder={f.placeholder}
                  onChange={e => onEdit(card.id, f.key, e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-sm text-navy-900 resize-none focus:outline-none focus:ring-2 focus:ring-navy-300 ${low ? 'border-amber-300 ring-1 ring-amber-200' : 'border-stone-200'}`}
                />
              ) : (
                <input
                  type="text"
                  value={card.fields[f.key] || ''}
                  disabled={saved}
                  placeholder={f.placeholder}
                  onChange={e => onEdit(card.id, f.key, e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 ${low ? 'border-amber-300 ring-1 ring-amber-200' : 'border-stone-200'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* About Me life events (preview, removable) */}
      {card.type === 'about_me' && card.lifeEvents?.length > 0 && (
        <div className="mt-3">
          <label className="text-xs font-medium text-stone-500">Life events</label>
          <div className="mt-1 space-y-1.5">
            {card.lifeEvents.map((ev, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-stone-50 rounded-lg px-3 py-1.5">
                <span className="text-sm text-navy-900"><span className="font-medium">{ev.year || '—'}</span> · {ev.description}</span>
                {!saved && <button onClick={() => onDropLifeEvent(card.id, i)} className="text-stone-300 hover:text-red-500"><X size={13} /></button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {card.status === 'error' && card.error && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertTriangle size={12} /> {card.error}</p>
      )}
    </div>
  )
}
