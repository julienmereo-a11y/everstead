// Personal Messages: letters, video and photo messages left for named people,
// delivered either now or after death. SignedMedia and RecordVideo are the two
// pieces of machinery it needs, and nothing else uses them.
//
import React, { useEffect, useState } from 'react'
import { PLAN_LABELS } from '../../../config/pricing'
import i18n from '../../../i18n'
import { roleLabel } from '../../dashboard/shared'
import { EmptyState, Field, LoadingSpinner, Modal, SectionShell, input, primaryBtn, secondaryBtn } from '../../dashboard/ui'
import { AlertCircle, Camera, CheckCircle2, ChevronRight, Clock, FileEdit, Image as ImageIcon, Info, Loader2, Lock, MessageSquare, Pencil, Play, Plus, RefreshCw, Send, Sparkles, Square, Trash2, Upload, Video } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
export function SignedMedia({ msg }) {
  const { t } = useTranslation('dashboard')
  const stored = msg.media_url || msg.video_url
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  React.useEffect(() => {
    let on = true
    setUrl(null); setFailed(false)
    if (!stored) return
    import('../../../lib/supabase').then(({ signedMessageMediaUrl }) =>
      signedMessageMediaUrl(stored).then(u => { if (on) { u ? setUrl(u) : setFailed(true) } })
    )
    return () => { on = false }
  }, [stored])
  if (!stored) return null
  if (failed) return <p className="text-xs text-stone-400 py-6 text-center">{t('media.loadFailed', { type: msg.type === 'video' ? t('media.type.video') : t('media.type.photo') })}</p>
  if (!url) return <div className="flex items-center justify-center py-10"><RefreshCw size={18} className="animate-spin text-stone-300" /></div>
  return msg.type === 'video'
    ? <video src={url} controls playsInline className="w-full max-h-80 bg-black" />
    : <img src={url} alt={msg.title} className="w-full max-h-80 object-contain bg-stone-50" />
}

// RECORD VIDEO — in-browser webcam + mic recording (MediaRecorder)
// ─────────────────────────────────────────────────────────────

export function RecordVideo({ onCapture }) {
  const { t } = useTranslation('dashboard')
  const videoRef    = React.useRef(null)
  const recorderRef = React.useRef(null)
  const chunksRef   = React.useRef([])
  const streamRef   = React.useRef(null)
  const timerRef    = React.useRef(null)
  const [recording, setRecording] = useState(false)
  const [error, setError]         = useState(null)
  const [elapsed, setElapsed]     = useState(0)

  const cleanup = () => {
    clearInterval(timerRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }
  useEffect(() => cleanup, [])

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; videoRef.current.play().catch(() => {}) }
      const mime = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
        const ext  = (blob.type.split('/')[1] || 'webm').split(';')[0]
        onCapture(new File([blob], `recording.${ext}`, { type: blob.type }))
        cleanup()
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch (err) {
      setError(err?.name === 'NotAllowedError'
        ? t('media.record.blocked')
        : t('media.record.failed'))
      cleanup()
    }
  }
  const stop = () => { setRecording(false); clearInterval(timerRef.current); try { recorderRef.current?.stop() } catch {} }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden">
      <div className="relative bg-black aspect-video">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {!recording && !streamRef.current && (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs gap-1.5">
            <Camera size={14} /> {t('media.record.preview')}
          </div>
        )}
        {recording && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/55 text-white text-[11px] font-semibold px-2 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {mm}:{ss}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-600 px-3 py-2.5">{error}</p>
      ) : recording ? (
        <button type="button" onClick={stop} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 py-2.5 transition-colors">
          <Square size={12} className="fill-current" /> {t('media.record.stop')}
        </button>
      ) : (
        <button type="button" onClick={start} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-navy-700 hover:bg-stone-50 py-2.5 transition-colors">
          <Camera size={15} /> {t('media.record.start')}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PERSONAL MESSAGES SECTION
// ─────────────────────────────────────────────────────────────

export function MessagesSection({ messages: initialMessages, loading, people, isDemo, planLimits, onUpgrade, addMessage, updateMessage, uploadVideo, uploadMedia, releaseExternal, aiEnabled }) {
  const { t, i18n } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  // Stored DB values (type, release_timing) paired with the id used to look up
  // their translated label. The value is never translated, only the label.
  const TYPE_OPTIONS = [
    { value: 'note',  icon: FileEdit },
    { value: 'video', icon: Video },
    { value: 'photo', icon: ImageIcon },
  ]
  const TIMING_OPTIONS = [
    { value: 'after_death', id: 'afterDeath' },
    { value: 'on_date',     id: 'onDate' },
  ]
  const [showCompose, setShowCompose]   = useState(false)
  const [expanded, setExpanded]         = useState(null)
  const [confirmRelease, setConfirmRelease] = useState(null)  // message id to confirm
  const [confirmReleaseAll, setConfirmReleaseAll] = useState(false)
  const [releasing, setReleasing]       = useState(null)  // id or 'all'
  const [releasedIds, setReleasedIds]   = useState(
    () => new Set(initialMessages.filter(m => m.released).map(m => m.id))
  )
  const [form, setForm] = useState({ recipient_kind: 'person', recipient_name: '', recipient_role: '', recipient_email: '', title: '', type: 'note', content: '', release_timing: 'after_death', release_at: '' })
  const [mediaFile, setMediaFile] = useState(null)       // recorded Blob or selected File
  const [mediaPreview, setMediaPreview] = useState(null) // object URL for preview
  const [saving, setSaving] = useState(false)

  const setMedia = (file) => {
    setMediaPreview(prev => { if (prev) URL.revokeObjectURL(prev); return file ? URL.createObjectURL(file) : null })
    setMediaFile(file)
  }
  const resetForm = () => {
    setMedia(null)
    setForm({ recipient_kind: 'person', recipient_name: '', recipient_role: '', recipient_email: '', title: '', type: 'note', content: '', release_timing: 'after_death', release_at: '' })
  }

  // AI message writer (Feature 5)
  const [showAIWriter, setShowAIWriter] = useState(false)
  const [aiWriterForm, setAiWriterForm] = useState({ relationship: '', wants: '', gratitude: '', hopes: '' })
  const [aiWriterLoading, setAiWriterLoading] = useState(false)

  const handleAIWrite = async (e) => {
    e.preventDefault()
    if (aiEnabled === false) return
    setAiWriterLoading(true)
    try {
      const { supabase: sb } = await import('../../../lib/supabase')
      const { data: { session } } = await sb.auth.getSession()
      const res = await fetch('/api/ai/write-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          recipientName: form.recipient_name,
          relationship: aiWriterForm.relationship,
          wants: aiWriterForm.wants,
          gratitude: aiWriterForm.gratitude,
          hopes: aiWriterForm.hopes,
        }),
      })
      const data = await res.json()
      if (data.message) {
        setForm(p => ({ ...p, content: data.message }))
        setShowAIWriter(false)
        setAiWriterForm({ relationship: '', wants: '', gratitude: '', hopes: '' })
      }
    } catch {}
    setAiWriterLoading(false)
  }

  // Merge server state with local optimistic released state. Server truth is
  // additive-only: releasedIds can mark EXTRA rows released this session, but
  // must never un-release a server-released row (the Set is initialised before
  // async data arrives on ?tab=messages deep links, so it starts empty).
  const messages = initialMessages.map(m => ({
    ...m,
    released: m.released || releasedIds.has(m.id),
    released_at: m.released_at ?? (releasedIds.has(m.id) ? new Date().toISOString() : null),
  }))

  const sealedCount   = messages.filter(m => !m.released).length
  const releasedCount = messages.filter(m => m.released).length

  const doRelease = async (id) => {
    setReleasing(id)
    try {
      if (!isDemo) {
        const m = messages.find(x => x.id === id)
        if (m?.recipient_email) {
          await releaseExternal(id)   // mint token + email the secure link
        } else {
          await updateMessage(id, { released: true, released_at: new Date().toISOString() })
        }
      }
      setReleasedIds(prev => new Set([...prev, id]))
    } finally {
      setReleasing(null)
      setConfirmRelease(null)
    }
  }

  const doReleaseAll = async () => {
    setReleasing('all')
    try {
      if (!isDemo) {
        await Promise.all(
          messages.filter(m => !m.released).map(m =>
            m.recipient_email
              ? releaseExternal(m.id)
              : updateMessage(m.id, { released: true, released_at: new Date().toISOString() })
          )
        )
      }
      setReleasedIds(new Set(messages.map(m => m.id)))
    } finally {
      setReleasing(null)
      setConfirmReleaseAll(false)
    }
  }

  const [saveError, setSaveError] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    const isEmail = form.recipient_kind === 'email'
    if ((form.type === 'video' || form.type === 'photo') && !mediaFile) {
      setSaveError(t('messages.errors.mediaRequired', { type: t(`media.type.${form.type}`) })); return
    }
    if (form.release_timing === 'on_date' && !form.release_at) {
      setSaveError(t('messages.errors.dateRequired')); return
    }
    setSaveError(null)
    setSaving(true)
    try {
      if (!isDemo) {
        const row = await addMessage({
          recipient_name:  isEmail ? (form.recipient_name.trim() || form.recipient_email.trim()) : form.recipient_name,
          recipient_role:  isEmail ? '' : form.recipient_role,
          recipient_email: isEmail ? form.recipient_email.trim() : null,
          title:   form.title,
          type:    form.type,
          content: form.type === 'note' ? form.content : '',
          release_timing: form.release_timing,
          // Noon UTC on the chosen day: the hourly cron delivers within the hour,
          // at a humane time in every nearby timezone (never 00:xx).
          release_at: form.release_timing === 'on_date' ? new Date(`${form.release_at}T12:00:00Z`).toISOString() : null,
        })
        if (row && mediaFile && form.type !== 'note') {
          await uploadMedia(row.id, mediaFile)
        }
      }
      setShowCompose(false)
      resetForm()
    } catch (err) {
      setSaveError(err?.message || t('messages.errors.saveFailed'))
    } finally { setSaving(false) }
  }

  // A scheduled release day is stored as noon UTC — format it in UTC so the
  // chip always echoes the day the user picked (UTC+13/14 would otherwise
  // show the next day). fmtDate stays local for real instants (released_at).
  const fmtDay = (iso) => {
    try { return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso)) } catch { return '—' }
  }
  // Tomorrow in the USER'S timezone (toISOString would use UTC and block
  // "tomorrow" for evening users west of Greenwich).
  const localTomorrow = () => {
    const d = new Date(Date.now() + 86400000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const fmtDate = (iso) => {
    try { return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(new Date(iso)) } catch { return '—' }
  }

  const unreleased = messages.filter(m => !m.released)

  const messagesLocked = planLimits && !planLimits.personalMessages

  return (
    <SectionShell
      title={t('messages.title')}
      subtitle={messagesLocked
        ? t('messages.plusFeature', { plan: PLAN_LABELS.family })
        : t('messages.subtitle', { released: releasedCount, sealed: sealedCount })}
      action={!messagesLocked ? (
        <div className="flex items-center gap-2">
          {unreleased.length > 1 && (
            <button
              onClick={() => setConfirmReleaseAll(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-3 py-2 rounded-full hover:bg-amber-200 transition-colors"
            >
              <Send size={13} /> {t('messages.releaseAll')}
            </button>
          )}
          <button onClick={() => setShowCompose(true)} className={primaryBtn}><Plus size={15} />{t('messages.newMessage')}</button>
        </div>
      ) : null}
    >
      {messagesLocked && (
        <div className="rounded-2xl border border-sage-200 bg-sage-50 p-8 text-center">
          <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💌</span>
          </div>
          <h3 className="font-display text-xl font-light text-navy-950 mb-2">{t('messages.locked.title')}</h3>
          <p className="text-stone-600 text-sm leading-relaxed max-w-sm mx-auto mb-6">
            {t('messages.locked.body', { plan: PLAN_LABELS.family })}
          </p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 btn-aurora text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-navy-700 transition-colors"
          >
            {t('messages.locked.cta', { plan: PLAN_LABELS.family })}
          </button>
        </div>
      )}
      {/* Info banner */}
      {!messagesLocked && (
      <div className="flex items-start gap-3 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3.5 mb-5">
        <Lock size={15} className="text-navy-600 mt-0.5 shrink-0" />
        <p className="text-xs text-navy-700 leading-relaxed">
          <Trans t={t} i18nKey="messages.sealedBanner" components={{ b: <strong /> }} />
        </p>
      </div>
      )}

      {!messagesLocked && (loading ? <LoadingSpinner /> : messages.length === 0 ? (
        <EmptyState icon={MessageSquare} label={t('messages.empty')} action={t('messages.emptyAction')} onAction={() => setShowCompose(true)} />
      ) : (
        <div className="space-y-3">
          {messages.map(msg => {
            const isOpen     = expanded === msg.id
            const isReleased = msg.released
            const isReleasingThis = releasing === msg.id
            const isPendingConfirm = confirmRelease === msg.id

            return (
              <div
                key={msg.id}
                className={`rounded-xl border overflow-hidden transition-colors ${isReleased ? 'border-emerald-200 bg-emerald-50/40' : 'border-stone-200 bg-white'}`}
              >
                {/* Row header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Type icon */}
                  <button
                    className="shrink-0"
                    onClick={() => setExpanded(isOpen ? null : msg.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${msg.type === 'video' ? 'bg-purple-50 text-purple-600' : msg.type === 'photo' ? 'bg-sage-50 text-sage-600' : 'bg-navy-50 text-navy-600'}`}>
                      {msg.type === 'video' ? <Video size={17} /> : msg.type === 'photo' ? <ImageIcon size={17} /> : <FileEdit size={17} />}
                    </div>
                  </button>

                  {/* Info — clickable to expand */}
                  <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded(isOpen ? null : msg.id)}>
                    <p className="font-semibold text-navy-900 text-sm truncate">{msg.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      <Trans t={t} i18nKey="messages.forRecipient" values={{ name: msg.recipient_name }} components={{ b: <span className="font-medium text-navy-700" /> }} />
                      {msg.recipient_role ? ` · ${roleLabel(t, msg.recipient_role)}` : ''}
                      {msg.recipient_email ? <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-navy-600 bg-navy-50 px-1.5 py-0.5 rounded-full align-middle"><Send size={9} /> {t('messages.viaEmail')}</span> : null}
                      {!isReleased && msg.release_timing === 'on_date' && msg.release_at ? <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full align-middle"><Clock size={9} /> {t('messages.releasesOn', { date: fmtDay(msg.release_at) })}</span> : null}
                    </p>
                  </button>

                  {/* Status + release button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isReleased ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 size={11} /> {msg.released_at ? t('messages.releasedOn', { date: fmtDate(msg.released_at) }) : t('messages.released')}
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmRelease(msg.id)}
                        disabled={isReleasingThis}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 transition-colors disabled:opacity-50"
                      >
                        {isReleasingThis ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                        {isReleasingThis ? t('messages.releasing') : t('messages.releaseNow')}
                      </button>
                    )}
                    <button onClick={() => setExpanded(isOpen ? null : msg.id)}>
                      <ChevronRight size={15} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Inline release confirmation */}
                {isPendingConfirm && (
                  <div className="border-t border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-900">{t('messages.confirm.title')}</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {msg.recipient_email
                          ? <Trans t={t} i18nKey="messages.confirm.bodyEmail" values={{ email: msg.recipient_email }} components={{ b: <strong /> }} />
                          : <Trans t={t} i18nKey="messages.confirm.bodyPerson" values={{ name: msg.recipient_name }} components={{ b: <strong /> }} />}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => doRelease(msg.id)}
                        disabled={isReleasingThis}
                        className="inline-flex items-center gap-1.5 btn-aurora text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-navy-700 transition-colors disabled:opacity-50"
                      >
                        {isReleasingThis ? t('messages.releasing') : t('messages.confirm.yes')}
                      </button>
                      <button
                        onClick={() => setConfirmRelease(null)}
                        className="text-xs font-semibold text-stone-600 border border-stone-200 px-3 py-2 rounded-full hover:bg-stone-100 transition-colors"
                      >
                        {t('messages.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded body */}
                {isOpen && (
                  <div className="border-t border-stone-100 px-5 py-4 bg-stone-50 space-y-4">
                    {/* Release timing — editable while the message is still sealed. */}
                    {!isReleased && (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-stone-600 mr-1">{t('messages.timing.question')}</p>
                        <select
                          className="text-xs font-medium border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-navy-900"
                          value={msg.release_timing || 'after_death'}
                          onChange={async e => {
                            if (isDemo) return
                            const v = e.target.value
                            try { await updateMessage(msg.id, { release_timing: v, release_at: v === 'on_date' ? (msg.release_at || null) : null }) } catch {}
                          }}
                        >
                          {TIMING_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{t(`messages.timing.${opt.id}.label`)}</option>
                          ))}
                        </select>
                        {(msg.release_timing === 'on_date') && (
                          <input
                            type="date"
                            className="text-xs font-medium border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-navy-900"
                            min={localTomorrow()}
                            value={msg.release_at ? String(msg.release_at).slice(0, 10) : ''}
                            onChange={async e => {
                              if (isDemo || !e.target.value) return
                              try { await updateMessage(msg.id, { release_at: new Date(`${e.target.value}T12:00:00Z`).toISOString() }) } catch {}
                            }}
                          />
                        )}
                        {msg.release_timing === 'on_date' && !msg.release_at && (
                          <span className="text-[11px] text-amber-600">{t('messages.timing.pickDate')}</span>
                        )}
                      </div>
                    )}
                    {(msg.type === 'video' || msg.type === 'photo') ? (
                      (msg.media_url || msg.video_url) && !isDemo ? (
                        <div className="rounded-xl overflow-hidden border border-stone-200">
                          <SignedMedia msg={msg} />
                        </div>
                      ) : isDemo ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 aurora-field aurora-dim rounded-xl text-white">
                          {msg.type === 'video' ? <Play size={22} /> : <ImageIcon size={22} />}
                          <p className="text-sm text-stone-300">{t('messages.demoMedia', { type: t(`messages.type.${msg.type}.label`) })}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-8 bg-white border border-dashed border-stone-200 rounded-xl">
                          <p className="text-sm text-stone-500">{t('messages.noMediaYet', { type: t(`media.type.${msg.type}`) })}</p>
                          <label className="cursor-pointer inline-flex items-center gap-2 btn-aurora text-white text-xs font-semibold px-4 py-2 rounded-full transition-transform hover:-translate-y-0.5">
                            <Upload size={13} /> {t('messages.uploadType', { type: t(`media.type.${msg.type}`) })}
                            <input type="file" accept={msg.type === 'video' ? 'video/*' : 'image/*'} className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadMedia(msg.id, file) }} />
                          </label>
                        </div>
                      )
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">{t('messages.contentLabel')}</p>
                        <p className="text-sm text-navy-900 leading-relaxed whitespace-pre-wrap bg-white border border-stone-200 rounded-xl px-4 py-3.5">
                          {msg.content || <span className="text-stone-400 italic">{t('messages.noContent')}</span>}
                        </p>
                      </div>
                    )}
                    {!isReleased && (
                      <div className="flex gap-3">
                        <button onClick={() => {}} disabled={isDemo} className={`${secondaryBtn} disabled:opacity-40 disabled:cursor-not-allowed`} title={isDemo ? t('messages.notInDemo') : undefined}>
                          <Pencil size={13} /> {t('messages.edit')}
                        </button>
                        <button
                          onClick={() => {}}
                          disabled={isDemo}
                          title={isDemo ? t('messages.notInDemo') : undefined}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-full hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={13} /> {t('messages.delete')}
                        </button>
                      </div>
                    )}
                    {isReleased && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> {t('messages.releasedTo', { name: msg.recipient_name })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* AI message writer modal (Feature 5) */}
      {showAIWriter && (
        <Modal title={t('messages.ai.modalTitle')} onClose={() => setShowAIWriter(false)}>
          <p className="text-xs text-stone-500 mb-5 leading-relaxed">
            {t('messages.ai.intro', { name: form.recipient_name || t('messages.ai.defaultRecipient') })}
          </p>
          <form onSubmit={handleAIWrite} className="space-y-4">
            <Field label={t('messages.ai.relationship')}>
              <input
                className={input}
                placeholder={t('messages.ai.relationshipPlaceholder')}
                value={aiWriterForm.relationship}
                onChange={e => setAiWriterForm(p => ({ ...p, relationship: e.target.value }))}
              />
            </Field>
            <Field label={t('messages.ai.wants')}>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder={t('messages.ai.wantsPlaceholder')}
                value={aiWriterForm.wants}
                onChange={e => setAiWriterForm(p => ({ ...p, wants: e.target.value }))}
              />
            </Field>
            <Field label={t('messages.ai.gratitude')}>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                placeholder={t('messages.ai.gratitudePlaceholder')}
                value={aiWriterForm.gratitude}
                onChange={e => setAiWriterForm(p => ({ ...p, gratitude: e.target.value }))}
              />
            </Field>
            <Field label={t('messages.ai.hopes')}>
              <input
                className={input}
                placeholder={t('messages.ai.hopesPlaceholder')}
                value={aiWriterForm.hopes}
                onChange={e => setAiWriterForm(p => ({ ...p, hopes: e.target.value }))}
              />
            </Field>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={aiWriterLoading || !aiWriterForm.wants}
                className={`${primaryBtn} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {aiWriterLoading ? <><Loader2 size={14} className="animate-spin" />{t('messages.ai.writing')}</> : <><Sparkles size={14} />{t('messages.ai.submit')}</>}
              </button>
              <button type="button" onClick={() => setShowAIWriter(false)} className={secondaryBtn}>{t('messages.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Release all confirmation modal */}
      {confirmReleaseAll && (
        <Modal title={t('messages.releaseAllModal.title')} onClose={() => setConfirmReleaseAll(false)}>
          <div className="space-y-4">
            <p className="text-sm text-stone-700 leading-relaxed">
              <Trans t={t} i18nKey="messages.releaseAllModal.body" count={unreleased.length} values={{ count: unreleased.length }} components={{ b: <strong /> }} />
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              {t('messages.releaseAllModal.warning')}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={doReleaseAll}
                disabled={releasing === 'all'}
                className={`${primaryBtn} flex-1`}
              >
                {releasing === 'all' ? t('messages.releasing') : t('messages.releaseAllModal.confirm', { count: unreleased.length })}
              </button>
              <button onClick={() => setConfirmReleaseAll(false)} className={secondaryBtn}>{t('messages.cancel')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Compose modal */}
      {showCompose && (
        <Modal title={t('messages.compose.title')} onClose={() => setShowCompose(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">{t('messages.compose.typeLabel')}</label>
              <div className="grid grid-cols-3 gap-2.5">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setMedia(null); setSaveError(null); setForm(p => ({ ...p, type: opt.value })) }}
                    className={`flex flex-col gap-1 items-start p-3 rounded-xl border text-left transition-colors ${
                      form.type === opt.value ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-300' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <opt.icon size={16} className={form.type === opt.value ? 'text-navy-700' : 'text-stone-400'} />
                    <p className="text-xs font-semibold text-navy-900">{t(`messages.type.${opt.value}.label`)}</p>
                    <p className="text-[10px] text-stone-400 leading-snug">{t(`messages.type.${opt.value}.desc`)}</p>
                  </button>
                ))}
              </div>
            </div>

            <Field label={t('messages.compose.titleField')} required>
              <input
                className={input}
                placeholder={form.type === 'video' ? t('messages.compose.titlePlaceholderVideo') : t('messages.compose.titlePlaceholder')}
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Field>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">{t('messages.compose.recipient')} <span className="text-red-400">*</span></label>
              <div className="inline-flex p-0.5 bg-stone-100 rounded-full mb-2.5 text-xs font-semibold">
                <button type="button" onClick={() => setForm(p => ({ ...p, recipient_kind: 'person' }))} className={`px-3 py-1.5 rounded-full transition-colors ${form.recipient_kind === 'person' ? 'bg-white shadow-sm text-navy-900' : 'text-stone-500'}`}>{t('messages.compose.kindPerson')}</button>
                <button type="button" onClick={() => setForm(p => ({ ...p, recipient_kind: 'email' }))} className={`px-3 py-1.5 rounded-full transition-colors ${form.recipient_kind === 'email' ? 'bg-white shadow-sm text-navy-900' : 'text-stone-500'}`}>{t('messages.compose.kindEmail')}</button>
              </div>
              {form.recipient_kind === 'person' ? (
                <select
                  className={input}
                  value={form.recipient_name}
                  onChange={e => { const person = people.find(p => p.name === e.target.value); setForm(p => ({ ...p, recipient_name: e.target.value, recipient_role: person?.role || '' })) }}
                  required
                >
                  <option value="" disabled>{t('messages.compose.selectPerson')}</option>
                  {people.length > 0
                    ? people.map(p => <option key={p.id} value={p.name}>{p.name}, {roleLabel(t, p.role)}</option>)
                    : <option disabled>{t('messages.compose.noPeople')}</option>}
                </select>
              ) : (
                <div className="space-y-2">
                  <input className={input} type="text" placeholder={t('messages.compose.namePlaceholder')} value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))} />
                  <input className={input} type="email" placeholder={t('messages.compose.emailPlaceholder')} value={form.recipient_email} onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))} required />
                  <p className="text-[11px] text-stone-400 leading-snug">{t('messages.compose.emailHint')}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">{t('messages.timing.question')}</label>
              <div className="grid grid-cols-2 gap-2.5">
                {TIMING_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, release_timing: opt.value }))}
                    className={`flex flex-col gap-1 items-start p-3 rounded-xl border text-left transition-colors ${
                      form.release_timing === opt.value ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-300' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-navy-900">{t(`messages.timing.${opt.id}.label`)}</p>
                    <p className="text-[10px] text-stone-400 leading-snug">{t(`messages.timing.${opt.id}.desc`)}</p>
                  </button>
                ))}
              </div>
              {form.release_timing === 'on_date' && (
                <div className="mt-2.5">
                  <input
                    className={input}
                    type="date"
                    min={localTomorrow()}
                    value={form.release_at}
                    onChange={e => setForm(p => ({ ...p, release_at: e.target.value }))}
                    required
                  />
                  <p className="text-[11px] text-stone-400 leading-snug mt-1.5">{form.recipient_kind === 'email' ? t('messages.compose.dateHintEmail') : t('messages.compose.dateHint')}</p>
                </div>
              )}
            </div>

            {form.type === 'note' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-600">{t('messages.compose.messageLabel')} <span className="text-red-400">*</span></label>
                  {form.recipient_name && aiEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => setShowAIWriter(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2.5 py-1.5 rounded-full hover:bg-sage-100 transition-colors"
                    >
                      <Sparkles size={11} /> {t('messages.ai.helpBtn')}
                    </button>
                  )}
                </div>
                <textarea
                  className={`${input} min-h-[140px] resize-y`}
                  placeholder={t('messages.compose.contentPlaceholder')}
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  required
                />
              </div>
            )}

            {(form.type === 'video' || form.type === 'photo') && (
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">{form.type === 'video' ? t('messages.compose.yourVideo') : t('messages.compose.yourPhoto')} <span className="text-red-400">*</span></label>
                {mediaPreview ? (
                  <div className="rounded-xl border border-stone-200 overflow-hidden">
                    {form.type === 'video'
                      ? <video src={mediaPreview} controls playsInline className="w-full max-h-72 bg-black" />
                      : <img src={mediaPreview} alt={t('messages.compose.previewAlt')} className="w-full max-h-72 object-contain bg-stone-50" />}
                    <button type="button" onClick={() => setMedia(null)} className="w-full text-xs font-semibold text-stone-500 hover:text-navy-800 py-2.5 transition-colors border-t border-stone-100">{t('messages.compose.removeMedia')}</button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {form.type === 'video' && <RecordVideo onCapture={(f) => { setMedia(f); setSaveError(null) }} />}
                    <label className="flex items-center justify-center gap-2 cursor-pointer text-sm font-medium text-navy-700 border border-dashed border-stone-300 rounded-xl py-3 hover:bg-stone-50 transition-colors">
                      <Upload size={15} /> {form.type === 'video' ? t('messages.compose.uploadVideo') : t('messages.compose.uploadPhoto')}
                      <input type="file" accept={form.type === 'video' ? 'video/*' : 'image/*'} className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) { setMedia(f); setSaveError(null) } }} />
                    </label>
                    <p className="text-[11px] text-stone-400 leading-snug text-center">{form.type === 'video' ? t('messages.compose.videoHint') : t('messages.compose.photoHint')}</p>
                  </div>
                )}
              </div>
            )}

            {saveError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{saveError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`${primaryBtn} flex-1`}>
                {saving ? t('messages.saving') : t('messages.compose.submit')}
              </button>
              <button type="button" onClick={() => setShowCompose(false)} className={secondaryBtn}>{t('messages.cancel')}</button>
            </div>
          </form>
        </Modal>
      )}
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// PEOPLE SECTION
// ─────────────────────────────────────────────────────────────

// Must mirror NAV_ITEMS exactly (minus 'overview', 'people', 'alerts', 'activity')
// `key` and every entry in `subOptions` are STORED access-grant values, never
// translated. Labels come from people.access.* keyed by those same values.
