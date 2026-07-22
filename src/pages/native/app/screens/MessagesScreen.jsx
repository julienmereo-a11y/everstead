import React, { useState, useRef, useMemo, useEffect } from 'react'
import { useMessages, usePeople } from '../../../../hooks/useData'
import { useAuth } from '../../../../contexts/AuthContext'
import { canUseFeature } from '../../../../lib/planLimits'
import { isNative, isIOS } from '../../../../lib/platform'
import RecorderSheet from '../components/RecorderSheet'
import { planLabel } from '../../../../config/pricing'
import { PlusIcon, MessageIcon } from '../icons'
import { haptic } from '../../../../lib/haptics'
import SecScreen, { Busy } from '../components/SecScreen'

// Small inline media icons — the native icon set has no video/photo/camera glyphs.
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const VideoIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}><rect x="2" y="6" width="13" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3" /></svg>
const ImageIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-4 4 3 3-2 4 3" /></svg>
const NoteIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}><path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></svg>
const CameraIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.2" /></svg>
const UploadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}><path d="M12 15V4M8 8l4-4 4 4M5 19h14" /></svg>

const TYPES = [
  { key: 'note',  label: 'Letter', Icon: NoteIcon },
  { key: 'video', label: 'Video',  Icon: VideoIcon },
  { key: 'photo', label: 'Photo',  Icon: ImageIcon },
]

// Message media lives in the PRIVATE `messages` bucket — mint a short-lived
// signed URL to display it (the owner's storage policy scopes it to their own
// folder). Demo rows have no real media, so this renders nothing in demo.
function SignedMedia({ m }) {
  const stored = m.media_url || m.video_url
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let on = true
    setUrl(null)
    if (!stored) return
    import('../../../../lib/supabase').then(({ signedMessageMediaUrl }) =>
      signedMessageMediaUrl(stored).then(u => { if (on && u) setUrl(u) })
    )
    return () => { on = false }
  }, [stored])
  if (!stored || !url) return null
  return m.type === 'photo'
    ? <img src={url} alt={m.title} style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 12, marginTop: 10 }} />
    : <video src={url} controls playsInline preload="metadata" style={{ width: '100%', maxHeight: 300, borderRadius: 12, marginTop: 10, background: '#000' }} />
}

export default function MessagesScreen({ app }) {
  const auth = useAuth()
  const profile = app.profile || auth.profile
  // Everstead+ only (family/advisor) — mirrors the web's PLANS[plan].limits
  // .personalMessages gate. NB: intentionally NOT isPaidPlan(), because the
  // grandfathered `essential` plan does not include Personal Messages either.
  const entitled = canUseFeature(profile?.plan, 'personalMessages')

  const live = useMessages()
  const data = app.demo ? app.demoData.messages : live.data
  const loading = app.demo ? false : live.loading
  const add = app.demo ? (row => app.demoAppend('messages', row)) : live.add
  const update = app.demo ? ((id, changes) => app.demoUpdate('messages', id, changes)) : live.update
  // Media upload only works against real storage — skipped in the demo sandbox.
  const uploadMedia = app.demo ? null : live.uploadMedia

  // Trusted people for the recipient dropdown — mirrors the web composer.
  const livePeople = usePeople()
  const people = app.demo ? (app.demoData.people || []) : livePeople.data

  const EMPTY_FORM = { recipient_kind: 'person', recipient_name: '', recipient_role: '', recipient_email: '', title: '', content: '', release_timing: 'after_death', release_at: '' }
  const [sheet, setSheet] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [msgType, setMsgType] = useState('note')
  const [mediaFile, setMediaFile] = useState(null)
  const [busy, setBusy] = useState(false)
  // Inline release-timing editor on a sealed card (message id being edited).
  const [editTiming, setEditTiming] = useState(null)
  const [editDate, setEditDate] = useState('')
  // Two-step confirm for "Release now" — the highest-stakes, least reversible
  // tap in the app (for email recipients it immediately sends the link).
  const [confirmId, setConfirmId] = useState(null)

  const captureRef = useRef(null)  // camera (record video / take photo)
  const libraryRef = useRef(null)  // photo/video library

  // Local preview for the selected media, cleaned up to avoid object-URL leaks.
  const previewUrl = useMemo(() => (mediaFile ? URL.createObjectURL(mediaFile) : null), [mediaFile])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  // Free (and legacy Essential) users see an upgrade prompt instead of the
  // compose UI — matching the website, which swaps the composer for an upsell.
  // (Placed after all hooks so hook order stays stable across renders.)
  if (!entitled) {
    return (
      <SecScreen title="Personal Messages" onBack={() => app.go('more')}>
        <div className="card-light" style={{ padding: 22, textAlign: 'center' }}>
          <span className="dicon" style={{ margin: '2px auto 14px', width: 44, height: 44, background: 'var(--color-navy-50)', color: 'var(--color-navy-700)' }}><MessageIcon /></span>
          <h3 className="serif" style={{ fontSize: 21, fontWeight: 600, margin: '0 0 6px' }}>An {planLabel('family')} feature</h3>
          <p className="rdet" style={{ margin: '0 auto 18px', lineHeight: 1.55, maxWidth: 280 }}>
            Write sealed letters, record a video, or leave a photo for the people you love — kept private and released when the time is right.
          </p>
          <button className="btn w100" onClick={() => app.go('upgrade')}>Upgrade to {planLabel('family')}</button>
        </div>
      </SecScreen>
    )
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const isMedia = msgType === 'video' || msgType === 'photo'
  const isEmail = form.recipient_kind === 'email'
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipient_email.trim())
  const recipientOk = isEmail ? emailOk : !!form.recipient_name.trim()
  const timingOk = form.release_timing !== 'on_date' || !!form.release_at
  const canSubmit = recipientOk && form.title.trim() && (!isMedia || mediaFile) && timingOk && !busy

  const resetSheet = () => {
    setSheet(false); setMsgType('note'); setMediaFile(null); setForm(EMPTY_FORM)
  }

  const pickFrom = (ref) => () => { if (ref.current) { ref.current.value = ''; ref.current.click() } }
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) setMediaFile(f) }

  // Android captures media IN the webview (RecorderSheet) — external
  // camera/pickers get the app process reaped by One UI's LMK before the result
  // returns. 'video' | 'photo' | false.
  const [recorder, setRecorder] = useState(false)

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      // Demo can't store media — fail BEFORE creating the row, or every retry
      // appends a phantom media-less message to the demo list.
      if (isMedia && !uploadMedia) throw new Error('demo')
      // Payload mirrors the web composer (Dashboard.jsx MessagesSection).
      const row = await add({
        recipient_name:  isEmail ? (form.recipient_name.trim() || form.recipient_email.trim()) : form.recipient_name,
        recipient_role:  isEmail ? '' : form.recipient_role,
        recipient_email: isEmail ? form.recipient_email.trim() : null,
        title:   form.title,
        type:    msgType,
        content: form.content,
        release_timing: form.release_timing,
        // Noon UTC on the chosen day — humane delivery hour in nearby timezones.
        release_at: form.release_timing === 'on_date' ? new Date(`${form.release_at}T12:00:00Z`).toISOString() : null,
        released: false,
      })
      if (isMedia && mediaFile && row?.id) {
        try { await uploadMedia(row.id, mediaFile) }
        catch {
          // The message row exists but its media didn't upload — say so
          // honestly rather than a generic failure (the row IS saved).
          resetSheet()
          app.say(`Message saved, but the ${msgType} didn’t upload — try again from everstead.care.`, 'error')
          return
        }
      }
      resetSheet()
      app.say(msgType === 'note' ? 'Message sealed' : `${msgType === 'video' ? 'Video' : 'Photo'} message sealed`)
    } catch (e) {
      app.say(e?.message === 'demo' ? 'Media messages need a real account.' : 'Could not save that message.', 'error')
    } finally { setBusy(false) }
  }

  const release = async (m) => {
    try {
      if (m.recipient_email && !app.demo) {
        // External recipient: mint the secure view link and email it (server-side).
        await live.releaseExternal(m.id)
        await live.refresh()
        app.say(`Released — link emailed to ${m.recipient_email}`)
      } else {
        await update(m.id, { released: true, released_at: new Date().toISOString() })
        app.say('Message released')
      }
    } catch { app.say('Could not release that message.', 'error') }
  }

  // UTC so the chip echoes the day the user picked (release days are stored as
  // noon UTC; UTC+13/14 would otherwise show the next day).
  const fmtDay = (iso) => { try { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso)) } catch { return '' } }
  // Tomorrow in the user's LOCAL timezone (toISOString would block "tomorrow"
  // for evening users west of Greenwich).
  const localTomorrow = () => { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

  const accept = msgType === 'video' ? 'video/*' : 'image/*'

  return (
    <SecScreen
      title="Personal Messages"
      subtitle={loading ? '' : `${data.length} message${data.length === 1 ? '' : 's'}`}
      onBack={() => app.go('more')}
      action={<button className="btn btn-sm" onClick={() => setSheet(true)}><PlusIcon />New</button>}
    >
      {loading ? (
        <Busy />
      ) : data.length === 0 ? (
        <div className="card-light" style={{ padding: 18 }}><p className="rdet" style={{ margin: 0 }}>No messages yet. Write a sealed note, record a video, or leave a photo for someone you love.</p></div>
      ) : (
        <div className="fx col gap12">
          {data.map(m => {
            return (
              <div key={m.id} className="card-light" style={{ padding: 16 }}>
                <div className="fx jb ac">
                  <div className="fx ac" style={{ gap: 8 }}>
                    <span style={{ color: 'var(--color-navy-500)', display: 'inline-flex' }}>
                      {m.type === 'video' ? <VideoIcon /> : m.type === 'photo' ? <ImageIcon /> : <NoteIcon />}
                    </span>
                    <div className="rname">{m.title}</div>
                  </div>
                  <span className={`chip ${m.released ? 'chip-sage' : 'chip-stone'}`}>{m.released ? 'Released' : 'Sealed'}</span>
                </div>
                <div className="rdet" style={{ marginTop: 2 }}>
                  For {m.recipient_name}{m.recipient_role ? ` · ${m.recipient_role}` : ''}{m.recipient_email ? ' · via email' : ''}
                  {!m.released && m.release_timing === 'on_date' && m.release_at && (
                    <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 11, fontWeight: 600, color: '#92400e', background: '#fef3c7', padding: '1px 8px', borderRadius: 999 }}>
                      Releases {fmtDay(m.release_at)}
                    </span>
                  )}
                </div>

                {(m.type === 'photo' || m.type === 'video') && <SignedMedia m={m} />}

                {m.content && <p className="rdet" style={{ marginTop: 8, lineHeight: 1.5, color: 'var(--color-stone-600)' }}>{m.content}</p>}
                {!m.released && confirmId !== m.id && (
                  <div className="fx" style={{ gap: 8, marginTop: 12 }}>
                    <button className="btn btn-sm" onClick={() => { haptic.warning(); setConfirmId(m.id); setEditTiming(null) }}>Release now</button>
                    <button
                      className="btn btn-sm"
                      style={{ background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }}
                      onClick={() => {
                        if (editTiming === m.id) { setEditTiming(null); return }
                        setEditTiming(m.id); setConfirmId(null)
                        setEditDate(m.release_at ? String(m.release_at).slice(0, 10) : '')
                      }}
                    >
                      {m.release_timing === 'on_date' && m.release_at ? 'Change date' : 'Schedule'}
                    </button>
                  </div>
                )}
                {!m.released && confirmId === m.id && (
                  <div style={{ marginTop: 12 }}>
                    <p className="rdet" style={{ margin: '0 0 8px', color: 'var(--color-stone-600)' }}>
                      {m.recipient_name} will be able to {m.type === 'video' ? 'watch' : m.type === 'photo' ? 'see' : 'read'} this straight away{m.recipient_email ? ' — we’ll email them the private link now' : ''}. It can’t be sealed again.
                    </p>
                    <div className="fx" style={{ gap: 8 }}>
                      <button className="btn btn-sm f1" onClick={() => { setConfirmId(null); release(m) }}>Yes, release it now</button>
                      <button className="btn btn-sm f1" style={{ background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }} onClick={() => setConfirmId(null)}>Keep it sealed</button>
                    </div>
                  </div>
                )}
                {!m.released && editTiming === m.id && (
                  <div style={{ marginTop: 10, padding: 12, background: 'var(--color-stone-50)', borderRadius: 12 }}>
                    <div className="rdet" style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-stone-600)' }}>When is it released?</div>
                    <div className="fx" style={{ gap: 8 }}>
                      <button
                        className="btn btn-sm f1"
                        style={m.release_timing !== 'on_date'
                          ? {}
                          : { background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }}
                        onClick={async () => {
                          try {
                            await update(m.id, { release_timing: 'after_death', release_at: null })
                            setEditTiming(null); app.say('Released when the time comes')
                          } catch { app.say('Could not update that.', 'error') }
                        }}
                      >When the time comes</button>
                    </div>
                    <input
                      className="inp" type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                      min={localTomorrow()}
                      style={{ marginTop: 8 }}
                    />
                    <button
                      className={`btn btn-sm w100 ${editDate ? '' : 'dis'}`} disabled={!editDate} style={{ marginTop: 8 }}
                      onClick={async () => {
                        if (!editDate) return
                        try {
                          await update(m.id, { release_timing: 'on_date', release_at: new Date(`${editDate}T12:00:00Z`).toISOString() })
                          setEditTiming(null); app.say(`Will release on ${fmtDay(editDate)}`)
                        } catch { app.say('Could not update that.', 'error') }
                      }}
                    >Release on this date</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {sheet && (
        <div className="sheet-wrap">
          <div className="scrim" onClick={resetSheet} />
          <div className="sheet" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <button className="grab" aria-label="Close" onClick={resetSheet} style={{ display: 'block', border: 0, cursor: 'pointer', padding: 10, margin: '-10px auto 4px', background: 'none' }}><span style={{ display: 'block', width: 36, height: 4, borderRadius: 99, background: 'var(--color-stone-300)' }} /></button>
            <h3 className="sh-title">Write a message</h3>

            {/* Type selector */}
            <div className="fx" style={{ gap: 8, marginBottom: 4 }}>
              {TYPES.map(({ key, label, Icon }) => {
                const on = msgType === key
                return (
                  <button
                    key={key}
                    onClick={() => { setMsgType(key); setMediaFile(null) }}
                    className="fx col ac"
                    style={{
                      flex: 1, gap: 5, padding: '12px 6px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${on ? 'var(--color-navy-700)' : 'var(--color-stone-200)'}`,
                      background: on ? 'var(--color-navy-50)' : '#fff',
                      color: on ? 'var(--color-navy-800)' : 'var(--color-stone-500)',
                    }}
                  >
                    <Icon />
                    <span style={{ fontSize: 12.5, fontWeight: on ? 600 : 500 }}>{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Recipient — a trusted person, or anyone by email (mirrors the web). */}
            <label className="flabel">Recipient</label>
            <div className="fx" style={{ gap: 0, padding: 3, background: 'var(--color-stone-100)', borderRadius: 999, marginBottom: 8 }}>
              {[{ k: 'person', l: 'A trusted person' }, { k: 'email', l: 'Someone by email' }].map(({ k, l }) => (
                <button
                  key={k}
                  onClick={() => setForm(f => ({ ...f, recipient_kind: k, recipient_name: '', recipient_role: '', recipient_email: '' }))}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 999, border: 0, fontSize: 12.5, cursor: 'pointer',
                    fontWeight: form.recipient_kind === k ? 600 : 500,
                    background: form.recipient_kind === k ? '#fff' : 'transparent',
                    color: form.recipient_kind === k ? 'var(--color-navy-900)' : 'var(--color-stone-500)',
                    boxShadow: form.recipient_kind === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >{l}</button>
              ))}
            </div>
            {!isEmail ? (
              <>
                <select
                  className="inp"
                  value={form.recipient_name}
                  onChange={(e) => {
                    const person = people.find(p => p.name === e.target.value)
                    setForm(f => ({ ...f, recipient_name: e.target.value, recipient_role: person?.role || '' }))
                  }}
                >
                  <option value="" disabled>Select a person…</option>
                  {people.length > 0
                    ? people.map(p => <option key={p.id} value={p.name}>{p.name}{p.role ? ` — ${p.role}` : ''}</option>)
                    : <option disabled>No trusted people yet — add someone in Family first</option>}
                </select>
              </>
            ) : (
              <>
                <input className="inp" value={form.recipient_name} onChange={set('recipient_name')} placeholder="Their name (optional)" />
                <div style={{ height: 8 }} />
                <input className="inp" type="email" value={form.recipient_email} onChange={set('recipient_email')} placeholder="their@email.com" autoCapitalize="none" autoCorrect="off" />
                <p className="rdet" style={{ margin: '6px 0 0', fontSize: 11.5 }}>They don't need an account — when it's released, we'll email them a private, secure link.</p>
              </>
            )}

            <label className="flabel">Title</label>
            <input className="inp" value={form.title} onChange={set('title')} placeholder={msgType === 'video' ? 'e.g. A video for your wedding day' : msgType === 'photo' ? 'e.g. Us at the lake, 2019' : 'e.g. For your wedding day'} />

            {/* Media capture */}
            {isMedia && (
              <>
                <label className="flabel">{msgType === 'video' ? 'Your video' : 'Your photo'}</label>
                {mediaFile ? (
                  <div style={{ marginTop: 2 }}>
                    {msgType === 'photo' && previewUrl && (
                      <img src={previewUrl} alt="Selected" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12 }} />
                    )}
                    {msgType === 'video' && previewUrl && (
                      <video src={previewUrl} controls playsInline style={{ width: '100%', maxHeight: 240, borderRadius: 12, background: '#000' }} />
                    )}
                    <button
                      className="btn btn-sm w100"
                      style={{ marginTop: 8, background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }}
                      onClick={() => setMediaFile(null)}
                    >Choose a different {msgType === 'video' ? 'video' : 'photo'}</button>
                  </div>
                ) : isNative() && !isIOS() ? (
                  // Android: in-webview capture only. The gallery/Files pickers
                  // background the app and One UI's low-memory killer reaps it
                  // before the pick returns (verified on a Galaxy Fold 7), so a
                  // gallery upload can't complete. Capture never backgrounds.
                  <button className="btn btn-sm w100 fx ac jc" style={{ gap: 6 }} onClick={() => setRecorder(msgType === 'video' ? 'video' : 'photo')}>
                    <CameraIcon />{msgType === 'video' ? 'Record a video' : 'Take a photo'}
                  </button>
                ) : (
                  <div className="fx" style={{ gap: 8, marginTop: 2 }}>
                    <button className="btn btn-sm f1 fx ac jc" style={{ gap: 6 }} onClick={pickFrom(captureRef)}>
                      <CameraIcon />{msgType === 'video' ? 'Record' : 'Take photo'}
                    </button>
                    <button className="btn btn-sm f1 fx ac jc" style={{ gap: 6, background: '#fff', color: 'var(--color-navy-800)', border: '1px solid var(--color-stone-200)' }} onClick={pickFrom(libraryRef)}>
                      <UploadIcon />Upload
                    </button>
                  </div>
                )}
                <p className="rdet" style={{ margin: '8px 0 0', fontSize: 11.5 }}>
                  {isNative() && !isIOS()
                    ? (msgType === 'video' ? 'Record a video message for the people you love.' : 'Take a photo to keep with this message.')
                    : (msgType === 'video' ? 'Record yourself now, or upload an existing video.' : 'Take a photo now, or upload a meaningful one from your library.')}
                </p>
                {/* Hidden inputs (iOS + web only): capture opens the camera; the
                    other the library. Android uses the in-webview RecorderSheet —
                    an HTML input's result dies with the reaped process there. */}
                {(!isNative() || isIOS()) && <input ref={captureRef} type="file" accept={accept} capture="user" style={{ display: 'none' }} onChange={onFile} />}
                {(!isNative() || isIOS()) && <input ref={libraryRef} type="file" accept={accept} style={{ display: 'none' }} onChange={onFile} />}
              </>
            )}

            {/* When is it released? — mirrors the web composer. Manual "Release
                now" stays available on every message regardless of this choice. */}
            <label className="flabel">When is it released?</label>
            <div className="fx" style={{ gap: 8 }}>
              {[
                { v: 'after_death', l: 'When the time comes', d: 'On verified passing — or whenever you choose' },
                { v: 'on_date',     l: 'On a specific date',  d: 'A wedding day, an 18th birthday…' },
              ].map(({ v, l, d }) => {
                const on = form.release_timing === v
                return (
                  <button
                    key={v}
                    onClick={() => setForm(f => ({ ...f, release_timing: v }))}
                    className="fx col"
                    style={{
                      flex: 1, gap: 3, padding: '10px 12px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                      border: `1.5px solid ${on ? 'var(--color-navy-700)' : 'var(--color-stone-200)'}`,
                      background: on ? 'var(--color-navy-50)' : '#fff',
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? 'var(--color-navy-900)' : 'var(--color-stone-600)' }}>{l}</span>
                    <span style={{ fontSize: 11.5, lineHeight: 1.35, color: 'var(--color-stone-500)' }}>{d}</span>
                  </button>
                )
              })}
            </div>
            {form.release_timing === 'on_date' && (
              <>
                <input
                  className="inp" type="date" value={form.release_at} onChange={set('release_at')}
                  min={localTomorrow()}
                  style={{ marginTop: 8 }}
                />
                <p className="rdet" style={{ margin: '6px 0 0', fontSize: 11.5 }}>
                  Sealed until this day, then released automatically{isEmail ? ' and emailed to them' : ''}. You can still release it sooner.
                </p>
              </>
            )}

            <label className="flabel">{msgType === 'note' ? 'Message' : 'Caption (optional)'}</label>
            <textarea
              className="inp" rows={msgType === 'note' ? 5 : 3} value={form.content} onChange={set('content')}
              placeholder={msgType === 'note' ? 'Write from the heart…' : 'Add a few words to go with it…'}
              style={{ resize: 'none' }}
            />

            <button className={`btn w100 ${canSubmit ? '' : 'dis'}`} style={{ marginTop: 18 }} onClick={submit} disabled={!canSubmit}>
              {busy ? 'Saving…' : 'Seal message'}
            </button>
          </div>
        </div>
      )}

      {/* Android in-webview capture (video or photo) — never leaves the process. */}
      {recorder && (
        <RecorderSheet
          mode={recorder}
          onUse={(file) => { setMediaFile(file); setRecorder(false) }}
          onClose={() => setRecorder(false)}
        />
      )}
    </SecScreen>
  )
}
