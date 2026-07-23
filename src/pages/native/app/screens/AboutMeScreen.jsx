import React, { useEffect, useRef, useState } from 'react'
import { useAboutMe } from '../../../../hooks/useData'
import { useAuth } from '../../../../contexts/AuthContext'
import { initialsOf } from '../helpers'
import { isNative, isIOS } from '../../../../lib/platform'
import { pickMedia } from '../../../../lib/pickKeepAlive'
import RecorderSheet from '../components/RecorderSheet'
import SecScreen, { Busy } from '../components/SecScreen'

// Android gives two ways to set the avatar: "Upload photo" (system Photo Picker
// — the gallery grid; it backgrounds the app, but the pick keep-alive foreground
// service stops One UI from reaping the process mid-pick) and "Take photo"
// (RecorderSheet, in-webview capture, which never backgrounds the app).
// iOS + web keep the normal <input type=file>.
const ANDROID_CAPTURE = isNative() && !isIOS()

// Picked-avatar rescue (module scope — survives a screen remount). Verified
// failure modes on the Fold: (1) the pick backgrounds the app and hooks refetch
// on resume, so the data-sync effect clobbered the just-picked preview with the
// stale server avatar_url; (2) a shell reset mid-pick unmounts the screen, so
// the awaited pick resolves into a DEAD instance. Crucially the reset lands
// ~0.5s after the pick resolves but the upload takes ~1.5s — so the picked FILE
// must be stashed immediately at pick-resolution (like MessagesScreen does) and
// the UPLOAD run by whichever instance is alive; a URL-only stash written after
// the upload always missed the fresh mount (verified: bytes in the bucket,
// avatar_url never set, screen showing nothing).
let pickedAvatar = null // { url, at } — uploaded URL, wins over server row until Save
const freshPickedAvatar = () => (pickedAvatar && Date.now() - pickedAvatar.at < 10 * 60 * 1000 ? pickedAvatar.url : null)
let avatarFileStash = null    // { file, at } — picked but not yet uploaded
let deliverAvatarToLive = null // (file) => void, bound to the mounted screen

export default function AboutMeScreen({ app }) {
  const auth = useAuth()
  const profile = app.profile || auth.profile
  const live = useAboutMe()
  const data = app.demo ? app.demoData.aboutMe : live.data
  const loading = app.demo ? false : live.loading
  const save = app.demo ? (async (v) => app.demoSetAboutMe(v)) : live.save
  const uploadAvatar = app.demo ? (async (file) => URL.createObjectURL(file)) : live.uploadAvatar
  const [form, setForm] = useState({ full_name: '', date_of_birth: '', passions: '', reflections: '' })
  const [events, setEvents] = useState([])
  const [avatar, setAvatar] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)

  useEffect(() => {
    // A photo picked this session always wins over the server row: hooks
    // refetch on app resume (which the pick itself triggers), and the server's
    // avatar_url is stale until the user taps Save.
    const picked = freshPickedAvatar()
    if (picked) setAvatar(picked)
    // Never ask for what we already know: the name was given at onboarding
    // (profiles.full_name), so start from it — mirrors the web's AboutMeSection.
    if (!data) {
      setForm(f => ({ ...f, full_name: f.full_name || profile?.full_name || '' }))
      return
    }
    setForm({
      full_name: data.full_name || profile?.full_name || '',
      date_of_birth: data.date_of_birth || '',
      passions: data.passions || '',
      reflections: data.reflections || '',
    })
    setEvents(Array.isArray(data.life_events) ? data.life_events : [])
    if (!picked) setAvatar(data.avatar_url || '')
  }, [data, profile?.full_name])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setEvent = (i, k, v) => setEvents(es => es.map((e, idx) => idx === i ? { ...e, [k]: v } : e))
  const addEvent = () => setEvents(es => [...es, { year: '', description: '' }])
  const removeEvent = (i) => setEvents(es => es.filter((_, idx) => idx !== i))

  const [capture, setCapture] = useState(false)
  const applyPickedPhoto = async (file) => {
    try {
      const url = await uploadAvatar(file)
      // Stash BEFORE setAvatar: if this instance was unmounted mid-pick, the
      // setState is a no-op, but the freshly mounted screen restores from here.
      pickedAvatar = { url, at: Date.now() }
      setAvatar(url)
      app.say('Photo added — tap Save to keep it')
    } catch { app.say('Could not upload that photo.', 'error') }
  }
  const pickAvatar = async (e) => {
    // Take the pick as-is — no type gating (pickers can report octet-stream for
    // valid images, and gating silently dropped them).
    const file = e.target.files?.[0]
    if (file) applyPickedPhoto(file)
  }
  // Android uploads via the native picker plugin — the WebView file-chooser
  // chain silently dropped results on the Fold. Delivery goes through
  // deliverAvatarToLive/avatarFileStash so the shell reset that follows the
  // pick can't swallow the file (see the module-scope notes above).
  const changePhoto = async () => {
    if (!ANDROID_CAPTURE) { fileInput.current?.click(); return }
    try {
      const file = await pickMedia('photo')
      if (!file) return // cancelled
      avatarFileStash = { file, at: Date.now() }
      if (deliverAvatarToLive) deliverAvatarToLive(file)
    } catch {
      app.say('Could not read that photo. Please try again.', 'error')
    }
  }

  // Register as the live delivery target and consume any picked file waiting
  // from a previous instance of this screen.
  useEffect(() => {
    deliverAvatarToLive = (file) => { avatarFileStash = null; applyPickedPhoto(file) }
    if (avatarFileStash && Date.now() - avatarFileStash.at < 3 * 60 * 1000) {
      const f = avatarFileStash.file
      avatarFileStash = null
      console.log('[upload] restored avatar file after remount')
      applyPickedPhoto(f)
    }
    return () => { deliverAvatarToLive = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSave = async () => {
    setBusy(true)
    try {
      // avatar_url must ride along with the save — the picked photo lives in
      // separate state, and the website persists it the same way (with the form).
      await save({ ...form, avatar_url: avatar || null, life_events: events.filter(e => e.year || e.description) })
      pickedAvatar = null // persisted — the server row is the truth again
      app.say('About Me saved')
    } catch { app.say('Could not save. Please try again.', 'error') } finally { setBusy(false) }
  }

  if (loading) return <SecScreen title="About Me" onBack={() => app.go('more')}><Busy /></SecScreen>

  return (
    <SecScreen title="About Me" subtitle="Your story, for the people you love" onBack={() => app.go('more')}>
      <div className="fx col ac" style={{ marginBottom: 18 }}>
        <button onClick={changePhoto} style={{ border: 0, background: 'none', cursor: 'pointer' }}>
          {avatar
            ? <img src={avatar} alt="" style={{ width: 76, height: 76, borderRadius: '999px', objectFit: 'cover' }} />
            : <span className="avatar avatar-round" style={{ width: 76, height: 76, fontSize: 28 }}>{initialsOf(form.full_name || 'You')}</span>}
        </button>
        {!ANDROID_CAPTURE && <input ref={fileInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickAvatar} />}
        {ANDROID_CAPTURE ? (
          <div className="fx ac" style={{ gap: 18, marginTop: 2 }}>
            <button className="linkbtn" style={{ width: 'auto', margin: 0, color: 'var(--color-navy-600)' }} onClick={() => setCapture(true)}>Take photo</button>
            <button className="linkbtn" style={{ width: 'auto', margin: 0, color: 'var(--color-navy-600)' }} onClick={changePhoto}>Upload photo</button>
          </div>
        ) : (
          <button className="linkbtn" style={{ color: 'var(--color-navy-600)' }} onClick={changePhoto}>Change photo</button>
        )}
      </div>

      <div className="card-light" style={{ padding: 16 }}>
        <label className="flabel" style={{ marginTop: 0 }}>Full name</label>
        <input className="inp" value={form.full_name} onChange={set('full_name')} placeholder="Your name" />
        <label className="flabel">Date of birth</label>
        <input className="inp" type="date" value={form.date_of_birth || ''} onChange={set('date_of_birth')} />
        <label className="flabel">Passions</label>
        <textarea className="inp" rows={3} value={form.passions} onChange={set('passions')} placeholder="What lights you up?" style={{ resize: 'none' }} />
        <label className="flabel">Reflections</label>
        <textarea className="inp" rows={3} value={form.reflections} onChange={set('reflections')} placeholder="Anything you'd like to pass on" style={{ resize: 'none' }} />
      </div>

      <div className="fx jb ac" style={{ margin: '20px 0 8px' }}>
        <span className="eyebrow m0">Life events</span>
        <button className="linkbtn" style={{ width: 'auto', margin: 0, color: 'var(--color-navy-600)' }} onClick={addEvent}>+ Add</button>
      </div>
      <div className="fx col gap12">
        {events.length === 0 && <p className="rdet">No milestones yet.</p>}
        {events.map((ev, i) => (
          <div key={i} className="card-light" style={{ padding: 12 }}>
            <div className="fx gap12">
              <input className="inp" style={{ maxWidth: 90 }} value={ev.year} onChange={e => setEvent(i, 'year', e.target.value)} placeholder="Year" />
              <input className="inp" value={ev.description} onChange={e => setEvent(i, 'description', e.target.value)} placeholder="What happened" />
            </div>
            <button className="linkbtn" style={{ width: 'auto', margin: '8px 0 0', color: 'var(--color-stone-400)', textAlign: 'left' }} onClick={() => removeEvent(i)}>Remove</button>
          </div>
        ))}
      </div>

      <button className={`btn w100 ${busy ? 'dis' : ''}`} style={{ marginTop: 22 }} onClick={onSave}>{busy ? 'Saving…' : 'Save'}</button>

      {capture && (
        <RecorderSheet
          mode="photo"
          onUse={(file) => { setCapture(false); applyPickedPhoto(file) }}
          onClose={() => setCapture(false)}
        />
      )}
    </SecScreen>
  )
}
