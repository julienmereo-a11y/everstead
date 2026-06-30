import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Check, AlertTriangle, X, Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Markdown from './Markdown'

// ─────────────────────────────────────────────────────────────────────────────
// GUIDED ONBOARDING — first-run conversational setup
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the form pop-up for brand-new users. Warm and unhurried: a scripted
// welcome + one "About Me" question, then the `onboarding-assistant` Edge Function
// takes over. Anything to save is proposed as an editable card; NOTHING is written
// until the user confirms it. They can close at any time — doing very little is fine.
// ─────────────────────────────────────────────────────────────────────────────

// Field config per proposable type — maps 1:1 to the real Everstead schema.
const TYPE_META = {
  about_me: {
    label: 'About you',
    required: [],
    defaults: {},
    fields: [
      { key: 'passions',    label: 'Passions',      type: 'textarea' },
      { key: 'reflections', label: 'Reflections',   type: 'textarea' },
      { key: 'spotify_url', label: 'Playlist / song link', type: 'text' },
    ],
  },
  profile: {
    label: 'Your details',
    required: [],
    defaults: {},
    fields: [
      { key: 'city', label: 'City / Town', type: 'text', placeholder: 'e.g. London' },
    ],
  },
  account: {
    label: 'Account',
    required: ['institution'],
    defaults: { account_type: 'Account', category: 'Other', status: 'active' },
    fields: [
      { key: 'institution',         label: 'Institution',   type: 'text' },
      { key: 'category',            label: 'Category',       type: 'select', options: ['Banking', 'Retirement', 'Investment', 'Insurance', 'Digital', 'Property', 'Other'] },
      { key: 'account_type',        label: 'Type',           type: 'text', placeholder: 'e.g. Current account' },
      { key: 'account_number_hint', label: 'Last 4 digits',  type: 'text' },
      { key: 'balance_display',     label: 'Balance',        type: 'text', placeholder: 'optional' },
      { key: 'notes',               label: 'Notes',          type: 'textarea' },
    ],
  },
  trusted_person: {
    label: 'Trusted person',
    required: ['name', 'email'],
    defaults: { invite_status: 'pending' },
    fields: [
      { key: 'name',  label: 'Name',  type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'role',  label: 'Role',  type: 'select', options: ['Spouse / Partner', 'Primary Executor', 'Secondary Executor', 'Estate Attorney', 'Family Member', 'Family Caretaker', 'Financial Advisor', 'Healthcare Proxy'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
}

let cardSeq = 0

// Soft, personal entries save directly — onboarding stays conversational. Only
// higher-stakes entries (accounts, trusted people you'd invite) get a review card.
const AUTO_SAVE = new Set(['about_me', 'profile'])
function savedLabel(type) {
  if (type === 'about_me') return 'Added to your About Me — change it any time'
  if (type === 'profile') return 'Saved — you can edit it any time'
  return 'Saved'
}

// Pull a ```json { proposals: [...] } ``` block out of a reply. Defensive: never throws.
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
            return { id: `c${++cardSeq}`, type: p.type, fields, confidence, lifeEvents, approved: true, status: 'idle', error: null }
          })
      }
    } catch { /* ignore malformed JSON — just show the prose */ }
  }
  return { prose, proposals }
}

export default function GuidedOnboarding({
  profile, updateProfile, addAccount, addPerson, saveAboutMe, aboutMe, onClose, onStartTour,
}) {
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  // Scripted opener — instant, always on-spec. Shown but NOT sent to the model;
  // the system prompt knows the welcome + first question already happened.
  const opener = [
    { role: 'assistant', scripted: true, content: `Welcome, **${firstName}** 👋 I'm really glad you're here. There's no rush today, and nothing you add is ever shared unless you choose to.` },
    { role: 'assistant', scripted: true, content: "Before any of the practical bits, I'd love to start with **you** — the part that's actually worth keeping. Tell me one thing you'd want remembered: **a song you love** 🎵, something you believe in 💭, or a moment that shaped you ✨. Whatever comes to mind first." },
  ]

  const [messages, setMessages] = useState([]) // opener is revealed below with a typing effect
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true) // start "typing" while the opener appears
  const [error, setError] = useState(null)
  const [cards, setCards] = useState([])
  const [closing, setClosing] = useState(false)
  const scrollRef = useRef(null)

  // Stages: chat → details (full profile) → celebrate → tour
  const [stage, setStage] = useState('chat')
  const [savingDetails, setSavingDetails] = useState(false)
  const [details, setDetails] = useState({
    full_name:     profile?.full_name     ?? '',
    date_of_birth: profile?.date_of_birth ?? '',
    phone:         profile?.phone         ?? '',
    address_line1: profile?.address_line1 ?? '',
    address_line2: profile?.address_line2 ?? '',
    city:          profile?.city          ?? '',
    postcode:      profile?.postcode      ?? '',
    country:       profile?.country       ?? 'United Kingdom',
  })
  const saveDetails = async () => {
    setSavingDetails(true)
    try {
      // Only write fields the user actually filled, so a stale-empty value (e.g. a
      // city they already gave in chat) can never overwrite what's already saved.
      const payload = {}
      for (const [k, v] of Object.entries(details)) {
        if (k === 'date_of_birth') { if (v) payload[k] = v }
        else if (v != null && String(v).trim() !== '') payload[k] = v
      }
      if (profile?.id && Object.keys(payload).length) {
        await supabase.from('profiles').update(payload).eq('id', profile.id)
      }
    } catch { /* non-blocking — they can edit in Settings */ }
    setSavingDetails(false)
    setStage('celebrate')
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, cards.length])

  // Reveal the scripted opener with a short typing animation so the chat feels alive.
  useEffect(() => {
    const t1 = setTimeout(() => setMessages([opener[0]]), 650)
    const t2 = setTimeout(() => { setMessages([opener[0], opener[1]]); setLoading(false) }, 1900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => {
    setClosing(true)
    try { if (profile?.id) localStorage.setItem(`everstead_welcome_done_${profile.id}`, '1') } catch { /* ignore */ }
    // Fire-and-forget so the modal closes instantly (e.g. when handing off to the tour).
    if (profile?.id) supabase.from('profiles').update({ onboarding_completed: true }).eq('id', profile.id).then(() => {}, () => {})
    onClose?.()
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg = { role: 'user', content: text }
    const nextDisplay = [...messages, userMsg]
    setMessages(nextDisplay)
    setInput('')
    setError(null)
    setLoading(true)

    // API history = real user/assistant turns only (skip the scripted opener and
    // the inline "saved" confirmations).
    const apiHistory = nextDisplay
      .filter(m => !m.scripted && (m.role === 'user' || m.role === 'assistant'))
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('onboarding-assistant', {
        body: { messages: apiHistory },
      })
      if (invokeErr) {
        let msg = 'The assistant is taking a moment. Please try again.'
        try { msg = (await invokeErr.context?.json())?.error || msg } catch { /* keep default */ }
        throw new Error(msg)
      }
      const reply = data?.reply || ''
      const { prose, proposals } = parseReply(reply)
      setMessages(h => [...h, { role: 'assistant', content: prose || reply }])
      // Soft entries save straight away (with a gentle inline note); higher-stakes
      // ones surface a review card. If a direct save fails, fall back to a card.
      for (const p of proposals) {
        if (AUTO_SAVE.has(p.type)) {
          try {
            await writeCard(p)
            setMessages(h => [...h, { role: 'saved', content: savedLabel(p.type) }])
          } catch { setCards(c => [...c, p]) }
        } else {
          setCards(c => [...c, p])
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // After a higher-stakes item is saved, nudge the assistant to suggest a next
  // small step — keeps onboarding feeling like a conversation, not a dead end.
  const continueAfterSave = async () => {
    if (loading) return
    setError(null)
    setLoading(true)
    const trigger = { role: 'user', hidden: true, content: "(That's been added to my Everstead now — please do NOT propose it again or create another card for it. If it feels natural, warmly suggest ONE different small thing I might add next (like an account or a document) by simply asking me — don't create a save card yet, wait for my answer. Or, if I've added a few things now, let me know I'm all set and that it all keeps.)" }
    const nextDisplay = [...messages, trigger]
    setMessages(nextDisplay)
    const apiHistory = nextDisplay
      .filter(m => !m.scripted && (m.role === 'user' || m.role === 'assistant'))
      .map(m => ({ role: m.role, content: m.content }))
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('onboarding-assistant', { body: { messages: apiHistory } })
      if (invokeErr) {
        let msg = 'The assistant is taking a moment. Please try again.'
        try { msg = (await invokeErr.context?.json())?.error || msg } catch { /* keep default */ }
        throw new Error(msg)
      }
      const reply = data?.reply || ''
      const { prose, proposals } = parseReply(reply)
      setMessages(h => [...h, { role: 'assistant', content: prose || reply }])
      for (const p of proposals) {
        if (AUTO_SAVE.has(p.type)) {
          try { await writeCard(p); setMessages(h => [...h, { role: 'saved', content: savedLabel(p.type) }]) }
          catch { setCards(c => [...c, p]) }
        } else { setCards(c => [...c, p]) }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Proposal cards ──────────────────────────────────────────────────────────
  const editField = (id, key, value) =>
    setCards(cs => cs.map(c => c.id === id ? { ...c, fields: { ...c.fields, [key]: value }, status: 'idle', error: null } : c))
  const toggleApprove = (id) =>
    setCards(cs => cs.map(c => c.id === id ? { ...c, approved: !c.approved } : c))
  const dismissCard = (id) =>
    setCards(cs => cs.filter(c => c.id !== id))

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
    } else if (card.type === 'profile') {
      // Direct UPDATE on the existing row (updateProfile upserts, which can hit the
      // insert path and trip the NOT NULL email constraint on a partial update).
      const { error } = await supabase.from('profiles').update(clean).eq('id', profile.id)
      if (error) throw error
      if (clean.city) setDetails(d => ({ ...d, city: clean.city })) // keep the details form in sync
    } else if (card.type === 'about_me') {
      const existing = Array.isArray(aboutMe?.life_events) ? aboutMe.life_events : []
      const merged = card.lifeEvents?.length ? [...existing, ...card.lifeEvents] : existing
      await saveAboutMe({ ...clean, life_events: merged })
    }
  }

  const addConfirmed = async () => {
    const approved = cards.filter(c => c.approved && c.status !== 'saved')
    if (!approved.length) return
    let savedAny = false
    for (const card of approved) {
      const err = validate(card)
      if (err) { setCards(cs => cs.map(c => c.id === card.id ? { ...c, status: 'error', error: err } : c)); continue }
      setCards(cs => cs.map(c => c.id === card.id ? { ...c, status: 'saving', error: null } : c))
      try {
        await writeCard(card)
        setCards(cs => cs.map(c => c.id === card.id ? { ...c, status: 'saved' } : c))
        savedAny = true
      } catch (e) {
        setCards(cs => cs.map(c => c.id === card.id ? { ...c, status: 'error', error: e.message || 'Could not save this.' } : c))
      }
    }
    setTimeout(() => setCards(cs => cs.filter(c => c.status !== 'saved')), 1600)
    if (savedAny) continueAfterSave()
  }

  const approvedCount = cards.filter(c => c.approved && c.status !== 'saved').length

  if (stage === 'details') return (
    <DetailsStage details={details} setDetails={setDetails} saving={savingDetails} onSave={saveDetails} onSkip={() => setStage('celebrate')} onClose={finish} />
  )
  if (stage === 'celebrate') return (
    <CelebrateStage firstName={firstName} onTour={() => { onStartTour?.(); finish() }} onDashboard={finish} />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={finish}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-navy-950 flex items-center justify-center shrink-0">
              <Sparkles size={17} className="text-sage-300" />
            </div>
            <div>
              <p className="font-display text-lg text-navy-950 leading-tight">Let's set up your Everstead</p>
              <p className="text-xs text-stone-500">No rush — you can stop any time.</p>
            </div>
          </div>
          <button onClick={finish} disabled={closing} title="Finish for now" className="text-stone-300 hover:text-stone-600 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
          {messages.filter(m => !m.hidden).map((m, i) => (
            m.role === 'saved' ? (
              <div key={i} className="flex justify-center">
                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 inline-flex items-center gap-1.5">
                  <Check size={12} /> {m.content}
                </span>
              </div>
            ) : (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-navy-950 flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="text-sage-300" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] ${
                  m.role === 'user' ? 'bg-navy-800 text-white rounded-tr-sm whitespace-pre-wrap' : 'bg-stone-50 text-navy-900 rounded-tl-sm'
                }`}>
                  {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : m.content}
                </div>
              </div>
            )
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-navy-950 flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-sage-300" />
              </div>
              <div className="bg-stone-50 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '160ms', animationDuration: '1s' }} />
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '320ms', animationDuration: '1s' }} />
              </div>
            </div>
          )}

          {/* Proposal cards — inline, right under the message */}
          {cards.length > 0 && (
            <div className="border-t border-stone-100 pt-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-sage-700 bg-sage-50 px-2 py-0.5 rounded-full">To save</span>
                <span className="text-xs text-stone-400">Edit anything, untick to skip — nothing is saved until you add it.</span>
              </div>
              {cards.map(card => (
                <ProposalCard key={card.id} card={card} onEdit={editField} onToggle={toggleApprove} onDismiss={dismissCard} />
              ))}
              <button
                onClick={addConfirmed}
                disabled={approvedCount === 0}
                className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                style={{ backgroundColor: '#4c7d47' }}
              >
                <Check size={16} /> Save {approvedCount > 0 ? `${approvedCount} ` : ''}item{approvedCount === 1 ? '' : 's'}
              </button>
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
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
              disabled={loading}
              placeholder="Type your answer…"
              className="flex-1 resize-none border border-stone-200 rounded-xl px-3 py-2 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 max-h-32 disabled:bg-stone-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-navy-800 text-white hover:bg-navy-700 transition-colors flex items-center justify-center disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between pt-2.5">
            <button onClick={finish} disabled={closing} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
              Skip for now
            </button>
            <button onClick={() => setStage('details')} className="text-xs font-semibold text-navy-700 hover:text-navy-900 inline-flex items-center gap-1 transition-colors">
              Finish &amp; review my details <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── A single editable proposal card ───────────────────────────────────────────
function ProposalCard({ card, onEdit, onToggle, onDismiss }) {
  const meta = TYPE_META[card.type]
  const saved = card.status === 'saved'
  return (
    <div className={`rounded-2xl border-2 p-4 transition-colors ${
      saved ? 'border-emerald-200 bg-emerald-50' : card.approved ? 'border-navy-300 bg-navy-50/40' : 'border-stone-200 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative shrink-0">
            <input type="checkbox" className="sr-only peer" checked={card.approved} disabled={saved} onChange={() => onToggle(card.id)} />
            <div className="w-9 h-5 rounded-full bg-stone-200 peer-checked:bg-navy-700 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm font-medium text-navy-900">{saved ? 'Saved' : card.approved ? `Save this ${meta.label.toLowerCase()}` : 'Skip'}</span>
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
          const full = f.type === 'textarea' || meta.fields.length === 1
          return (
            <div key={f.key} className={full ? 'sm:col-span-2' : ''}>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-medium text-stone-500">{f.label}</label>
                {low && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle size={9} /> Please check
                  </span>
                )}
              </div>
              {f.type === 'select' ? (
                <select value={card.fields[f.key] || ''} disabled={saved} onChange={e => onEdit(card.id, f.key, e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-sm text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-navy-300 ${low ? 'border-amber-300' : 'border-stone-200'}`}>
                  <option value="">Select…</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={card.fields[f.key] || ''} disabled={saved} rows={2} placeholder={f.placeholder} onChange={e => onEdit(card.id, f.key, e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-sm text-navy-900 resize-none focus:outline-none focus:ring-2 focus:ring-navy-300 ${low ? 'border-amber-300' : 'border-stone-200'}`} />
              ) : (
                <input type="text" value={card.fields[f.key] || ''} disabled={saved} placeholder={f.placeholder} onChange={e => onEdit(card.id, f.key, e.target.value)}
                  className={`w-full border rounded-lg px-2.5 py-1.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 ${low ? 'border-amber-300' : 'border-stone-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {card.type === 'about_me' && card.lifeEvents?.length > 0 && (
        <div className="mt-3">
          <label className="text-xs font-medium text-stone-500">Life events</label>
          <div className="mt-1 space-y-1.5">
            {card.lifeEvents.map((ev, i) => (
              <div key={i} className="bg-stone-50 rounded-lg px-3 py-1.5 text-sm text-navy-900"><span className="font-medium">{ev.year || '—'}</span> · {ev.description}</div>
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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ── Stage 2: confirm the full profile details ─────────────────────────────────
function DetailsStage({ details, setDetails, saving, onSave, onSkip, onClose }) {
  const set = k => e => setDetails(p => ({ ...p, [k]: e.target.value }))
  const inputCls = 'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-stone-100">
          <p className="font-display text-xl text-navy-950">A few details to round things off</p>
          <p className="text-sm text-stone-500 mt-1 leading-relaxed">So everything's accurate for the people who may one day need it. You can change any of this later in Settings.</p>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <Field label="Full name"><input className={inputCls} value={details.full_name} onChange={set('full_name')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth"><input type="date" className={inputCls} value={details.date_of_birth || ''} onChange={set('date_of_birth')} /></Field>
            <Field label="Phone"><input className={inputCls} value={details.phone} onChange={set('phone')} placeholder="+44 7700 900000" /></Field>
          </div>
          <Field label="Address line 1"><input className={inputCls} value={details.address_line1} onChange={set('address_line1')} placeholder="14 Kensington Road" /></Field>
          <Field label="Address line 2"><input className={inputCls} value={details.address_line2} onChange={set('address_line2')} placeholder="Optional" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City / Town"><input className={inputCls} value={details.city} onChange={set('city')} placeholder="London" /></Field>
            <Field label="Postcode"><input className={inputCls} value={details.postcode} onChange={set('postcode')} placeholder="SW7 2BT" /></Field>
          </div>
          <Field label="Country"><input className={inputCls} value={details.country} onChange={set('country')} /></Field>
        </div>
        <div className="border-t border-stone-100 p-4 flex items-center justify-between gap-3">
          <button onClick={onSkip} className="text-xs text-stone-400 hover:text-stone-700">Skip for now</button>
          <button onClick={onSave} disabled={saving} className="btn-aurora inline-flex items-center gap-2 text-white text-sm font-semibold px-6 py-2.5 rounded-full disabled:opacity-60">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <>Save &amp; continue <ArrowRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stage 3: celebrate ────────────────────────────────────────────────────────
function CelebrateStage({ firstName, onTour, onDashboard }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-center px-8 py-10">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-display text-2xl text-navy-950 mb-2">Brilliant start, {firstName}.</h2>
        <p className="text-sm text-stone-500 leading-relaxed mb-7 max-w-xs mx-auto">
          You've taken one of the most caring steps there is — and everything you added will keep, safe and private, for whenever it's needed.
        </p>
        <div className="flex flex-col gap-2.5">
          <button onClick={onTour} className="btn-aurora inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-6 py-3 rounded-full">
            Take a quick tour <ArrowRight size={15} />
          </button>
          <button onClick={onDashboard} className="text-sm text-stone-500 hover:text-navy-800 transition-colors py-1">
            Go straight to my dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// (The tour now runs on the real dashboard — see DashboardTour in Dashboard.jsx.)
