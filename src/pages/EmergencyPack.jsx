// /emergency-pack
//
// A free one-page emergency pack: who to call, where things are, what you
// would want. Filled in the browser, rendered to a one-page A4 PDF with
// pdf-lib (loaded on demand, never in the main bundle), and shared on. No
// account, nothing sent to a server: the form is remembered in localStorage
// so a visitor can come back and finish it. Copy lives in emergencyPack.json.
import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, Copy, Download, FileText, Loader2, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import HreflangLinks from '../components/HreflangLinks'
import { trackEvent } from '../lib/analytics'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/emergencyPack.json'
import frCopy from '../i18n/locales/fr/emergencyPack.json'

i18n.addResourceBundle('en', 'emergencyPack', enCopy)
i18n.addResourceBundle('fr', 'emergencyPack', frCopy)

const STORAGE_KEY = 'everstead_emergency_pack'
const SECTION_X = 'px-6 sm:px-8 lg:px-12'
const WHERE_FIELDS = ['will', 'solicitor', 'bank', 'insurance', 'documents', 'digital']
const WISH_FIELDS = ['funeral', 'pets', 'other']

const EMPTY = {
  name: '',
  contacts: [{ name: '', relation: '', phone: '' }, { name: '', relation: '', phone: '' }, { name: '', relation: '', phone: '' }],
  will: '', solicitor: '', bank: '', insurance: '', documents: '', digital: '',
  funeral: '', pets: '', other: '',
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const saved = JSON.parse(raw)
    return { ...EMPTY, ...saved, contacts: EMPTY.contacts.map((c, i) => ({ ...c, ...(saved.contacts?.[i] || {}) })) }
  } catch { return EMPTY }
}

// The standard PDF fonts cover WinAnsi only. Strip anything outside it rather
// than let pdf-lib throw on an emoji or an unusual dash.
const WINANSI_EXTRA = '‘’“”…€Œœ–—• '
const safe = (s) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, ch => (WINANSI_EXTRA.includes(ch) ? ch : '')).replace(/\s+/g, ' ').trim()

async function buildPdf(t, lang, data, { blank = false } = {}) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(t('pdf.title'))
  pdf.setProducer('Everstead')
  pdf.setCreator('Everstead')
  pdf.setLanguage(lang)
  const page = pdf.addPage([595.28, 841.89])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const NAVY = rgb(13 / 255, 22 / 255, 40 / 255)
  const SAGE = rgb(76 / 255, 125 / 255, 71 / 255)
  const INK = rgb(0.11, 0.1, 0.09)
  const GREY = rgb(0.47, 0.44, 0.42)
  const LINE = rgb(0.85, 0.84, 0.82)
  const WHITE = rgb(1, 1, 1)
  const PW = 595.28, PH = 841.89, M = 44, W = PW - 2 * M

  const draw = (text, { x, y, size = 10, f = font, color = INK }) => page.drawText(safe(text), { x, y, size, font: f, color })
  const wrap = (text, f, size, width) => {
    const words = safe(text).split(' ').filter(Boolean)
    const lines = []
    let line = ''
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (f.widthOfTextAtSize(next, size) <= width) line = next
      else { if (line) lines.push(line); line = w }
    }
    if (line) lines.push(line)
    return lines
  }

  // Header band
  page.drawRectangle({ x: 0, y: PH - 96, width: PW, height: 96, color: NAVY })
  draw('Everstead', { x: M, y: PH - 30, size: 10, f: bold, color: rgb(0.62, 0.74, 0.62) })
  draw(t('pdf.title'), { x: M, y: PH - 58, size: 24, f: bold, color: WHITE })
  draw(t('pdf.subtitle'), { x: M, y: PH - 78, size: 10.5, color: rgb(0.78, 0.82, 0.9) })
  const who = blank ? '' : safe(data.name)
  const prepared = who ? t('pdf.preparedBy', { name: who }) : ''
  const updated = t('pdf.updated', { date: new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) })
  if (prepared) draw(prepared, { x: PW - M - font.widthOfTextAtSize(safe(prepared), 9.5), y: PH - 58, size: 9.5, color: WHITE })
  draw(updated, { x: PW - M - font.widthOfTextAtSize(safe(updated), 9), y: PH - 74, size: 9, color: rgb(0.78, 0.82, 0.9) })

  let y = PH - 96 - 30
  const section = (title, hint) => {
    draw(title.toUpperCase(), { x: M, y, size: 8.5, f: bold, color: SAGE })
    if (hint) draw(hint, { x: M + bold.widthOfTextAtSize(safe(title.toUpperCase()), 8.5) + 8, y, size: 8, color: GREY })
    y -= 6
    page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.6, color: LINE })
    y -= 16
  }
  // A labelled value; when empty (or blank pack), ruled lines to write on.
  const field = (label, value, { x = M, width = W, lines = 2 } = {}) => {
    draw(label, { x, y, size: 8, color: GREY })
    let cy = y - 13
    const text = blank ? '' : safe(value)
    if (text) {
      const wrapped = wrap(text, font, 10, width).slice(0, lines)
      for (const l of wrapped) { draw(l, { x, y: cy, size: 10 }); cy -= 13 }
      cy -= (lines - wrapped.length) * 13
    } else {
      for (let i = 0; i < lines; i++) { page.drawLine({ start: { x, y: cy - 2 }, end: { x: x + width, y: cy - 2 }, thickness: 0.5, color: LINE }); cy -= 13 }
    }
    return cy
  }

  // Who to call first: three rows, three columns
  section(t('contacts.title'), t('pdf.contactsHint'))
  const cols = [0.42, 0.28, 0.30]
  const cx = [M, M + W * cols[0], M + W * (cols[0] + cols[1])]
  const cw = [W * cols[0] - 10, W * cols[1] - 10, W * cols[2]]
  draw(t('contacts.name'), { x: cx[0], y, size: 8, color: GREY })
  draw(t('contacts.relation'), { x: cx[1], y, size: 8, color: GREY })
  draw(t('contacts.phone'), { x: cx[2], y, size: 8, color: GREY })
  y -= 15
  data.contacts.forEach((c, i) => {
    const vals = blank ? ['', '', ''] : [c.name, c.relation, c.phone].map(safe)
    draw(`${i + 1}.`, { x: M - 14, y, size: 10, f: bold, color: SAGE })
    vals.forEach((v, k) => {
      if (v) draw(wrap(v, font, 10, cw[k])[0] || '', { x: cx[k], y, size: 10 })
      else page.drawLine({ start: { x: cx[k], y: y - 2 }, end: { x: cx[k] + cw[k], y: y - 2 }, thickness: 0.5, color: LINE })
    })
    y -= 20
  })
  y -= 10

  // Where things are: two columns
  section(t('where.title'))
  const colW = (W - 18) / 2
  const startY = y
  let leftY = startY, rightY = startY
  WHERE_FIELDS.forEach((key, i) => {
    const left = i % 2 === 0
    const before = left ? leftY : rightY
    y = before
    const after = field(t(`where.${key}`), data[key], { x: left ? M : M + colW + 18, width: colW, lines: 2 })
    if (left) leftY = after - 10; else rightY = after - 10
  })
  y = Math.min(leftY, rightY) - 4

  // In one line
  section(t('wishes.title'))
  WISH_FIELDS.forEach(key => { y = field(t(`wishes.${key}`), data[key], { lines: key === 'other' ? 3 : 2 }) - 8 })

  // Footer
  page.drawLine({ start: { x: M, y: 46 }, end: { x: PW - M, y: 46 }, thickness: 0.6, color: LINE })
  draw(t('pdf.madeWith'), { x: M, y: 32, size: 8.5, color: GREY })

  return pdf.save()
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export default function EmergencyPack() {
  const { t, i18n: i18nInst } = useTranslation('emergencyPack')
  const lang = i18nInst.language === 'fr' ? 'fr' : 'en'
  const pageUrl = `https://www.everstead.care${lang === 'fr' ? '/fr' : ''}/emergency-pack`
  const [data, setData] = useState(loadSaved)
  const [busy, setBusy] = useState(null) // null | 'pdf' | 'blank'
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* private mode */ }
  }, [data])

  const set = (key, value) => setData(d => ({ ...d, [key]: value }))
  const setContact = (i, key, value) => setData(d => ({ ...d, contacts: d.contacts.map((c, k) => (k === i ? { ...c, [key]: value } : c)) }))
  const clear = () => { setData(EMPTY); try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ } }

  const make = async (blank) => {
    setBusy(blank ? 'blank' : 'pdf')
    setFailed(false)
    try {
      const bytes = await buildPdf(t, lang, data, { blank })
      downloadBytes(bytes, lang === 'fr' ? (blank ? 'everstead-kit-urgence-vierge.pdf' : 'everstead-kit-urgence.pdf') : (blank ? 'everstead-emergency-pack-blank.pdf' : 'everstead-emergency-pack.pdf'))
      trackEvent('tool_complete', { tool: 'emergency_pack', blank })
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  const shareText = t('share.text', { link: pageUrl, interpolation: { escapeValue: false } })
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(pageUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
    trackEvent('cta_click', { location: 'emergency_pack', cta: 'share_copy' })
  }

  const input = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-navy-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300'
  const label = 'block text-xs font-semibold text-stone-600 mb-1.5'

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.description')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.jpg" />
      </Helmet>
      <HreflangLinks path="/emergency-pack" />

      <div className="bg-stone-50 min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden grain">
          <div className="absolute inset-0 aurora-bg" />
          <div className={`relative max-w-3xl mx-auto ${SECTION_X} pt-28 pb-20 lg:pt-32 lg:pb-24 text-center`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-4">{t('hero.eyebrow')}</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight text-balance">{t('hero.title')}</h1>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-stone-300 max-w-xl mx-auto">{t('hero.sub')}</p>
          </div>
        </section>

        {/* Form */}
        <section className={`max-w-3xl mx-auto ${SECTION_X} pb-16 -mt-8`}>
          <form onSubmit={e => { e.preventDefault(); make(false) }} className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6 sm:p-8 lg:p-10 space-y-10">
            <div>
              <h2 className="section-label section-label-light">{t('about.title')}</h2>
              <label className={label} htmlFor="ep-name">{t('about.name')}</label>
              <input id="ep-name" className={input} value={data.name} onChange={e => set('name', e.target.value)} placeholder={t('about.namePh')} autoComplete="name" />
            </div>

            <div>
              <h2 className="section-label section-label-light">{t('contacts.title')}</h2>
              <p className="text-sm text-stone-500 mb-4 -mt-1">{t('contacts.intro')}</p>
              <div className="space-y-3">
                {data.contacts.map((c, i) => (
                  <div key={i} className="grid sm:grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center">
                    <span className="hidden sm:flex w-7 h-7 rounded-full bg-navy-950 text-white text-xs font-bold items-center justify-center">{i + 1}</span>
                    <input className={input} value={c.name} onChange={e => setContact(i, 'name', e.target.value)} placeholder={t('contacts.name')} aria-label={`${t('contacts.name')} ${i + 1}`} />
                    <input className={input} value={c.relation} onChange={e => setContact(i, 'relation', e.target.value)} placeholder={t('contacts.relation')} aria-label={`${t('contacts.relation')} ${i + 1}`} />
                    <input className={input} type="tel" value={c.phone} onChange={e => setContact(i, 'phone', e.target.value)} placeholder={t('contacts.phone')} aria-label={`${t('contacts.phone')} ${i + 1}`} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="section-label section-label-light">{t('where.title')}</h2>
              <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
                {WHERE_FIELDS.map(key => (
                  <div key={key}>
                    <label className={label} htmlFor={`ep-${key}`}>{t(`where.${key}`)}</label>
                    <input id={`ep-${key}`} className={input} value={data[key]} onChange={e => set(key, e.target.value)} placeholder={t(`where.${key}Ph`)} maxLength={160} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="section-label section-label-light">{t('wishes.title')}</h2>
              <div className="space-y-4">
                {WISH_FIELDS.map(key => (
                  <div key={key}>
                    <label className={label} htmlFor={`ep-${key}`}>{t(`wishes.${key}`)}</label>
                    <input id={`ep-${key}`} className={input} value={data[key]} onChange={e => set(key, e.target.value)} placeholder={t(`wishes.${key}Ph`)} maxLength={200} />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-100 pt-6">
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={!!busy} className="inline-flex items-center gap-2 rounded-full bg-navy-600 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-3 transition-colors">
                  {busy === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {busy === 'pdf' ? t('actions.generating') : t('actions.download')}
                </button>
                <button type="button" onClick={() => make(true)} disabled={!!busy} className="inline-flex items-center gap-2 rounded-full bg-white border border-stone-300 hover:border-navy-400 disabled:opacity-60 text-navy-900 text-sm font-semibold px-5 py-3 transition-colors">
                  <FileText size={15} /> {t('actions.blank')}
                </button>
                <button type="button" onClick={clear} className="inline-flex items-center gap-2 rounded-full text-stone-500 hover:text-stone-700 text-sm font-medium px-3 py-3 transition-colors">
                  {t('actions.clear')}
                </button>
              </div>
              {failed && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{t('actions.failed')}</p>}
              <p className="mt-4 m-0 flex items-start gap-2 text-xs text-stone-500 leading-relaxed">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-sage-600" /> {t('privacy')}
              </p>
            </div>
          </form>
        </section>

        {/* Share the tool */}
        <section className={`max-w-3xl mx-auto ${SECTION_X} pb-16`}>
          <div className="bg-white border border-stone-200 rounded-2xl p-6 lg:p-7">
            <h2 className="font-display text-2xl font-light text-navy-950 m-0 leading-tight">{t('share.title')}</h2>
            <p className="mt-2 m-0 text-[15px] text-stone-600 leading-relaxed">{t('share.body')}</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('cta_click', { location: 'emergency_pack', cta: 'share_whatsapp' })} className="inline-flex items-center gap-2 rounded-full bg-navy-600 hover:bg-navy-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors">
                <MessageCircle size={15} /> {t('share.whatsapp')}
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(t('share.subject'))}&body=${encodeURIComponent(shareText)}`} onClick={() => trackEvent('cta_click', { location: 'emergency_pack', cta: 'share_email' })} className="inline-flex items-center gap-2 rounded-full bg-white border border-stone-300 hover:border-navy-400 text-navy-900 text-sm font-semibold px-4 py-2.5 transition-colors">
                <Mail size={15} /> {t('share.email')}
              </a>
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-full bg-white border border-stone-300 hover:border-navy-400 text-navy-900 text-sm font-semibold px-4 py-2.5 transition-colors">
                {copied ? <><Check size={15} /> {t('share.copied')}</> : <><Copy size={15} /> {t('share.copy')}</>}
              </button>
            </div>
          </div>
        </section>

        {/* Then: keep it current */}
        <section className={`relative py-20 lg:py-24 text-stone-50 overflow-hidden grain bg-gradient-to-br from-navy-950 to-navy-800 ${SECTION_X}`}>
          <div className="relative max-w-3xl mx-auto text-center">
            <span className="section-label section-label-dark">{t('after.eyebrow')}</span>
            <h2 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(2rem,3.4vw,3rem)]">{t('after.title')}</h2>
            <p className="mt-5 m-0 text-base leading-[1.6] text-stone-300 max-w-xl mx-auto">{t('after.body')}</p>
            <Link
              to="/get-started?plan=free"
              onClick={() => trackEvent('cta_click', { location: 'emergency_pack', cta: 'start_free' })}
              className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-stone-50 hover:bg-white text-navy-950 text-base font-semibold px-[30px] py-4 transition-colors"
            >
              {t('after.cta')} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
