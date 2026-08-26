// About Me: the personal profile a member fills in for the people they leave
// behind. Its inputs are visually softer than the rest of the dashboard, hence
// its own input classes.
//
import React, { useEffect, useState } from 'react'
import { Field, LoadingSpinner, SectionShell, input, primaryBtn } from '../../dashboard/ui'
import { Check, CheckCircle2, Heart, Loader2, Music, Plus, Trash2, UserCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
export const ABOUT_ME_EXCLUDED_ROLES = ['Solicitor', 'Financial Adviser', 'Healthcare Proxy', 'Estate Attorney', 'Financial Advisor']

// Turn a Spotify share URL into an embeddable player URL. Returns null if not a Spotify URL.

export function spotifyEmbedUrl(url) {
  if (!url) return null
  const m = String(url).trim().match(/^https?:\/\/open\.spotify\.com\/(playlist|album|track|artist)\/([A-Za-z0-9]+)/)
  if (!m) return null
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}`
}

export const aboutInputBase = 'text-sm bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-300 placeholder:text-stone-300'

export const aboutInput = `w-full ${aboutInputBase}`

export function AboutMeSection({ aboutMe, loading, save, uploadAvatar, profile, people, isDemo, onCelebrate }) {
  const { t } = useTranslation('dashboard')
  const [form, setForm] = useState({
    full_name:     '',
    date_of_birth: '',
    avatar_url:    '',
    life_events:   [],
    passions:      '',
    spotify_url:   '',
    reflections:   '',
    recipients:    [],
    share_timing:  'on_activation',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = React.useRef(null)

  // Hydrate the form once data has loaded (prefer saved row, fall back to profile name).
  useEffect(() => {
    if (loading || hydrated) return
    setForm({
      full_name:     aboutMe?.full_name     ?? profile?.full_name ?? '',
      date_of_birth: aboutMe?.date_of_birth ?? '',
      avatar_url:    aboutMe?.avatar_url    ?? '',
      life_events:   Array.isArray(aboutMe?.life_events) ? aboutMe.life_events : [],
      passions:      aboutMe?.passions      ?? '',
      spotify_url:   aboutMe?.spotify_url    ?? '',
      reflections:   aboutMe?.reflections    ?? '',
      recipients:    Array.isArray(aboutMe?.recipients) ? aboutMe.recipients : [],
      share_timing:  aboutMe?.share_timing   ?? 'on_activation',
    })
    setHydrated(true)
  }, [loading, hydrated, aboutMe, profile])

  // Trusted people eligible to receive the About Me (family/partners/friends/executors — not professionals).
  const eligiblePeople = (people || []).filter(p => !ABOUT_ME_EXCLUDED_ROLES.includes(p.role))

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  const addLifeEvent    = () => set('life_events', [...form.life_events, { year: '', description: '' }])
  const updateLifeEvent = (i, k, v) => set('life_events', form.life_events.map((e, idx) => idx === i ? { ...e, [k]: v } : e))
  const removeLifeEvent = (i) => set('life_events', form.life_events.filter((_, idx) => idx !== i))

  const toggleRecipient = (id) =>
    set('recipients', form.recipients.includes(id) ? form.recipients.filter(r => r !== id) : [...form.recipients, id])

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file || isDemo || !uploadAvatar) return
    if (!file.type.startsWith('image/')) { setError(t('aboutMe.avatarNotImage')); return }
    if (file.size > 5 * 1024 * 1024) { setError(t('aboutMe.avatarTooBig')); return }
    setUploadingAvatar(true); setError(null)
    try {
      const url = await uploadAvatar(file)
      set('avatar_url', url)
    } catch (err) {
      setError(err.message || t('aboutMe.avatarUploadError'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const spotifyValid   = !form.spotify_url || !!spotifyEmbedUrl(form.spotify_url)
  const embedUrl       = spotifyEmbedUrl(form.spotify_url)

  const handleSave = async () => {
    if (isDemo) return
    if (!spotifyValid) { setError(t('aboutMe.spotifyInvalidSave')); return }
    setSaving(true); setError(null)
    try {
      // Drop empty life events
      const cleanEvents = form.life_events.filter(e => (e.year || '').trim() || (e.description || '').trim())
      const wasEmpty = !aboutMe
      await save({ ...form, life_events: cleanEvents })
      setSaved(true)
      if (wasEmpty && onCelebrate) onCelebrate('about_me_done', '💚', t('aboutMe.celebrateTitle'), t('aboutMe.celebrateBody'))
    } catch (err) {
      setError(err.message || t('aboutMe.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SectionShell title={t('aboutMe.title')}><LoadingSpinner /></SectionShell>

  return (
    <SectionShell
      title={t('aboutMe.title')}
      subtitle={t('aboutMe.subtitle')}
    >
      {/* Intro */}
      <div className="rounded-2xl border border-sage-200 bg-sage-50 p-5 mb-6 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0">
          <Heart size={17} />
        </div>
        <p className="text-sm text-stone-700 leading-relaxed">
          {t('aboutMe.intro')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Basics */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Profile picture */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
                {form.avatar_url
                  ? <img src={form.avatar_url} alt={t('aboutMe.profileAlt')} className="w-full h-full object-cover" />
                  : <UserCircle size={40} className="text-stone-300" />}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 size={20} className="text-navy-600 animate-spin" />
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar || isDemo}
                className="text-xs font-semibold text-sage-700 hover:text-sage-800 disabled:text-stone-400 disabled:cursor-not-allowed"
              >
                {form.avatar_url ? t('aboutMe.changePhoto') : t('aboutMe.addPhoto')}
              </button>
            </div>

            {/* Name + DOB */}
            <div className="flex-1 grid sm:grid-cols-2 gap-4 w-full">
              <Field label={t('aboutMe.fields.fullName')}>
                <input className={aboutInput} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder={t('aboutMe.fields.fullNamePlaceholder')} />
              </Field>
              <Field label={t('aboutMe.fields.dob')}>
                <input type="date" className={aboutInput} value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Life events */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-lg font-light text-navy-950">{t('aboutMe.lifeEvents.title')}</h3>
            <button onClick={addLifeEvent} className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700 hover:text-sage-800">
              <Plus size={14} /> {t('aboutMe.lifeEvents.add')}
            </button>
          </div>
          <p className="text-stone-500 text-xs mb-4">{t('aboutMe.lifeEvents.hint')}</p>
          {form.life_events.length === 0 ? (
            <button onClick={addLifeEvent} className="w-full border border-dashed border-stone-200 rounded-xl py-5 text-sm text-stone-400 hover:border-sage-300 hover:text-sage-700 transition-colors">
              {t('aboutMe.lifeEvents.addFirst')}
            </button>
          ) : (
            <div className="space-y-3">
              {form.life_events.map((ev, i) => (
                <div key={i} className="flex items-end gap-2.5">
                  <div className="w-24 shrink-0">
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">{t('aboutMe.lifeEvents.year')}</label>
                    <input
                      className={`${aboutInputBase} w-full`}
                      value={ev.year}
                      onChange={e => updateLifeEvent(i, 'year', e.target.value)}
                      placeholder="1985"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-semibold text-stone-500 mb-1">{t('aboutMe.lifeEvents.description')}</label>
                    <input
                      className={`${aboutInputBase} w-full`}
                      value={ev.description}
                      onChange={e => updateLifeEvent(i, 'description', e.target.value)}
                      placeholder={t('aboutMe.lifeEvents.descriptionPlaceholder')}
                    />
                  </div>
                  <button onClick={() => removeLifeEvent(i)} aria-label={t('aboutMe.lifeEvents.removeAria')} className="shrink-0 mb-2.5 text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passions */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Field label={t('aboutMe.fields.passions')}>
            <textarea
              rows={3}
              className={`${aboutInput} resize-none`}
              value={form.passions}
              onChange={e => set('passions', e.target.value)}
              placeholder={t('aboutMe.fields.passionsPlaceholder')}
            />
          </Field>
        </div>

        {/* Spotify */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Field label={t('aboutMe.fields.spotify')}>
            <div className="relative">
              <Music size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                className={`${aboutInput} pl-9`}
                value={form.spotify_url}
                onChange={e => set('spotify_url', e.target.value)}
                placeholder="https://open.spotify.com/playlist/…"
              />
            </div>
          </Field>
          {!spotifyValid && (
            <p className="text-xs text-red-600 mt-2">{t('aboutMe.spotifyInvalid')}</p>
          )}
          {embedUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-stone-200">
              <iframe
                title={t('aboutMe.spotifyPreview')}
                src={embedUrl}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Reflections */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <Field label={t('aboutMe.fields.reflections')}>
            <textarea
              rows={6}
              className={`${aboutInput} resize-none`}
              value={form.reflections}
              onChange={e => set('reflections', e.target.value)}
              placeholder={t('aboutMe.fields.reflectionsPlaceholder')}
            />
          </Field>
        </div>

        {/* Sharing */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-light text-navy-950 mb-1">{t('aboutMe.sharing.title')}</h3>
            <p className="text-stone-500 text-xs">{t('aboutMe.sharing.subtitle')}</p>
          </div>

          {eligiblePeople.length === 0 ? (
            <p className="text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
              {t('aboutMe.sharing.noPeopleBefore')} <strong>{t('aboutMe.sharing.noPeopleStrong')}</strong>{t('aboutMe.sharing.noPeopleAfter')}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {eligiblePeople.map(p => {
                const checked = form.recipients.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleRecipient(p.id)}
                    className={`flex items-center gap-3 text-left px-3.5 py-2.5 rounded-xl border transition-colors ${
                      checked ? 'border-sage-400 bg-sage-50' : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-sage-600' : 'border border-stone-300'}`}>
                      {checked && <Check size={11} className="text-white" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-navy-900 truncate">{p.name}</span>
                      {p.role && <span className="block text-xs text-stone-400 truncate">{p.role}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Timing */}
          <div>
            <h3 className="font-display text-lg font-light text-navy-950 mb-2">{t('aboutMe.sharing.timingTitle')}</h3>
            <div className="space-y-2.5">
              {[
                { id: 'on_activation', title: t('aboutMe.sharing.onActivationTitle'), desc: t('aboutMe.sharing.onActivationDesc') },
                { id: 'now',           title: t('aboutMe.sharing.nowTitle'),          desc: t('aboutMe.sharing.nowDesc') },
              ].map(opt => {
                const active = form.share_timing === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => set('share_timing', opt.id)}
                    className={`w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${
                      active ? 'border-navy-400 bg-navy-50' : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-navy-600' : 'border-stone-300'}`}>
                      {active && <span className="w-2 h-2 rounded-full bg-navy-600" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-navy-900">{opt.title}</span>
                      <span className="block text-xs text-stone-500 mt-0.5">{opt.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between gap-4 sticky bottom-4">
          <div className="text-sm">
            {error && <span className="text-red-600">{error}</span>}
            {saved && !error && <span className="text-sage-700 inline-flex items-center gap-1.5"><CheckCircle2 size={15} /> {t('aboutMe.saved')}</span>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || isDemo}
            className={`${primaryBtn} disabled:bg-stone-300 disabled:cursor-not-allowed shadow-sm`}
          >
            {saving ? t('aboutMe.saving') : isDemo ? t('aboutMe.signInToEdit') : <><Check size={15} /> {t('aboutMe.saveButton')}</>}
          </button>
        </div>
      </div>
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// SIGNED MEDIA — message photos/videos live in the PRIVATE `messages` bucket;
// the stored URL only encodes the path. Mint a short-lived signed URL to view.
