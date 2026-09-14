// /will-generator
//
// A free simple-will builder. Two legal regimes, chosen by the language tree:
//   en: England and Wales. A typed will is valid once signed before two
//       witnesses, so the PDF is the will itself plus a signing page and a
//       one-page guide.
//   fr: France. A typed will is worthless; a testament olographe must be
//       entirely handwritten, dated and signed. The PDF is the text to copy by
//       hand, with the rules (réserve héréditaire, dépôt chez le notaire).
// Not legal advice, and the page says so before a single field appears.
// Answers never leave the browser; localStorage remembers them.
import React, { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Download, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import HreflangLinks from '../components/HreflangLinks'
import { trackEvent } from '../lib/analytics'
import i18n from '../i18n'
import enCopy from '../i18n/locales/en/willGenerator.json'
import frCopy from '../i18n/locales/fr/willGenerator.json'

i18n.addResourceBundle('en', 'willGenerator', enCopy)
i18n.addResourceBundle('fr', 'willGenerator', frCopy)

const STORAGE_KEY = 'everstead_will_builder'
const SECTION_X = 'px-6 sm:px-8 lg:px-12'
const STEPS = ['about', 'executors', 'family', 'residue', 'review']

const EMPTY = {
  accepted: false,
  fullName: '', address: '', dob: '', birthplace: '',
  executors: [{ name: '', address: '', relation: '' }, { name: '', address: '', relation: '' }],
  hasMinor: false, guardian: '', guardianAddress: '',
  gifts: [],
  residueMode: 'person', residueName: '', residueRelation: '', substitute: '', substituteRelation: '',
  funeral: '',
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const saved = JSON.parse(raw)
    return { ...EMPTY, ...saved, executors: EMPTY.executors.map((e, i) => ({ ...e, ...(saved.executors?.[i] || {}) })), gifts: Array.isArray(saved.gifts) ? saved.gifts : [] }
  } catch { return EMPTY }
}

// Standard PDF fonts cover WinAnsi only; strip the rest rather than throw.
const WINANSI_EXTRA = '‘’“”…€Œœ–—• '
const safe = (s) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, ch => (WINANSI_EXTRA.includes(ch) ? ch : '')).replace(/[ \t]+/g, ' ').trim()
const rel = (r, lang) => (r ? (lang === 'fr' ? `, ${safe(r)}` : ` (${safe(r)})`) : '')
const fmtDate = (iso, lang) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Builds the clause list once so the review screen and the PDF agree.
function buildClauses(t, lang, d) {
  const ex = d.executors.filter(e => e.name.trim())
  const c = []
  if (lang === 'en') {
    c.push({ kind: 'p', text: t('pdf.opening', { name: safe(d.fullName), address: safe(d.address) }) })
    c.push({ kind: 'p', text: t('pdf.revoke') })
    if (ex.length >= 2) c.push({ kind: 'p', text: t('pdf.executorsTwo', { name1: safe(ex[0].name), address1: safe(ex[0].address), name2: safe(ex[1].name), address2: safe(ex[1].address) }) })
    else if (ex.length === 1) c.push({ kind: 'p', text: t('pdf.executorsOne', { name: safe(ex[0].name), address: safe(ex[0].address) }) })
    let n = 3
    if (d.hasMinor && d.guardian.trim()) { c.push({ kind: 'p', text: t('pdf.guardian', { name: safe(d.guardian), address: safe(d.guardianAddress) }) }); n = 4 }
    const gifts = d.gifts.filter(g => g.what.trim() && g.to.trim())
    if (gifts.length) {
      c.push({ kind: 'p', text: t('pdf.giftsHead', { n }) })
      gifts.forEach((g, i) => c.push({ kind: 'li', text: `(${String.fromCharCode(97 + i)}) ${t('pdf.giftLine', { what: safe(g.what), to: safe(g.to), relation: rel(g.relation, lang) })}` }))
      n += 1
    }
    if (d.residueMode === 'children') c.push({ kind: 'p', text: t('pdf.residueChildren', { n }) })
    else if (d.substitute.trim()) c.push({ kind: 'p', text: t('pdf.residuePerson', { n, name: safe(d.residueName), relation: rel(d.residueRelation, lang), substitute: safe(d.substitute), subRelation: rel(d.substituteRelation, lang) }) })
    else c.push({ kind: 'p', text: t('pdf.residuePersonNoSub', { n, name: safe(d.residueName), relation: rel(d.residueRelation, lang) }) })
    n += 1
    if (d.funeral.trim()) { c.push({ kind: 'p', text: t('pdf.funeral', { n, wishes: safe(d.funeral) }) }); n += 1 }
    c.push({ kind: 'p', text: t('pdf.powers', { n }) })
  } else {
    c.push({ kind: 'p', text: t('pdf.opening') })
    c.push({ kind: 'p', text: t('pdf.identity', { name: safe(d.fullName), dob: fmtDate(d.dob, lang) || '____', birthplace: safe(d.birthplace) || '____', address: safe(d.address) }) })
    c.push({ kind: 'p', text: t('pdf.revoke') })
    if (ex.length >= 2) c.push({ kind: 'p', text: t('pdf.executorsTwo', { name1: safe(ex[0].name), address1: safe(ex[0].address), name2: safe(ex[1].name), address2: safe(ex[1].address) }) })
    else if (ex.length === 1) c.push({ kind: 'p', text: t('pdf.executorsOne', { name: safe(ex[0].name), address: safe(ex[0].address) }) })
    if (d.hasMinor && d.guardian.trim()) c.push({ kind: 'p', text: t('pdf.guardian', { name: safe(d.guardian), address: safe(d.guardianAddress) }) })
    const gifts = d.gifts.filter(g => g.what.trim() && g.to.trim())
    if (gifts.length) {
      c.push({ kind: 'p', text: t('pdf.giftsHead') })
      gifts.forEach(g => c.push({ kind: 'li', text: `– ${t('pdf.giftLine', { what: safe(g.what), to: safe(g.to), relation: rel(g.relation, lang) })}` }))
    }
    if (d.residueMode === 'children') c.push({ kind: 'p', text: t('pdf.residueChildren') })
    else if (d.substitute.trim()) c.push({ kind: 'p', text: t('pdf.residuePerson', { name: safe(d.residueName), relation: rel(d.residueRelation, lang), substitute: safe(d.substitute), subRelation: rel(d.substituteRelation, lang) }) })
    else c.push({ kind: 'p', text: t('pdf.residuePersonNoSub', { name: safe(d.residueName), relation: rel(d.residueRelation, lang) }) })
    if (d.funeral.trim()) c.push({ kind: 'p', text: t('pdf.funeral', { wishes: safe(d.funeral) }) })
    c.push({ kind: 'p', text: t('pdf.closing') })
    c.push({ kind: 'p', text: t('pdf.signature') })
  }
  return c
}

async function buildPdf(t, lang, d) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(t('pdf.title')); pdf.setProducer('Everstead'); pdf.setCreator('Everstead'); pdf.setLanguage(lang)
  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const sans = await pdf.embedFont(StandardFonts.Helvetica)
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const INK = rgb(0.1, 0.09, 0.08), GREY = rgb(0.45, 0.43, 0.41), NAVY = rgb(13 / 255, 22 / 255, 40 / 255), SAGE = rgb(76 / 255, 125 / 255, 71 / 255), LINE = rgb(0.8, 0.79, 0.77), RED = rgb(0.72, 0.13, 0.13)
  const PW = 595.28, PH = 841.89, M = 60, W = PW - 2 * M
  let page, y
  const footer = () => page.drawText(safe(t('pdf.footer')), { x: M, y: 34, size: 7.5, font: sans, color: GREY })
  const newPage = () => { page = pdf.addPage([PW, PH]); y = PH - M; footer() }
  const ensure = (h) => { if (y - h < 60) newPage() }
  const wrap = (text, font, size, width) => {
    const out = []
    for (const para of safe(text).split('\n')) {
      let line = ''
      for (const w of para.split(' ')) {
        const next = line ? `${line} ${w}` : w
        if (font.widthOfTextAtSize(next, size) <= width) line = next
        else { if (line) out.push(line); line = w }
      }
      out.push(line)
    }
    return out
  }
  const text = (str, { font = serif, size = 11.5, color = INK, x = M, width = W, lineHeight = size * 1.45, after = 8 } = {}) => {
    for (const line of wrap(str, font, size, width)) { ensure(lineHeight); page.drawText(line, { x, y: y - size, size, font, color }); y -= lineHeight }
    y -= after
  }
  const rule = () => { ensure(12); page.drawLine({ start: { x: M, y: y - 4 }, end: { x: PW - M, y: y - 4 }, thickness: 0.6, color: LINE }); y -= 14 }
  const label = (str) => { ensure(20); page.drawText(safe(str).toUpperCase(), { x: M, y: y - 8, size: 8, font: sansBold, color: SAGE }); y -= 20 }
  const signLine = (lbl, width = 230, x = M) => { ensure(36); page.drawLine({ start: { x, y: y - 18 }, end: { x: x + width, y: y - 18 }, thickness: 0.6, color: INK }); page.drawText(safe(lbl), { x, y: y - 30, size: 8.5, font: sans, color: GREY }) }

  newPage()
  const clauses = buildClauses(t, lang, d)

  if (lang === 'en') {
    page.drawText(safe(t('pdf.title')), { x: M, y: y - 26, size: 26, font: serifBold, color: NAVY }); y -= 34
    text(`${t('pdf.of')} ${safe(d.fullName)}`, { font: serif, size: 14, after: 2 })
    text(t('pdf.made', { date: '____________________' }), { font: sans, size: 9.5, color: GREY, after: 14 })
    rule()
    for (const c of clauses) text(c.text, c.kind === 'li' ? { x: M + 18, width: W - 18, after: 4 } : {})
    y -= 8
    label(t('pdf.signingHead'))
    text(t('pdf.attestation', { name: safe(d.fullName) }), { font: serif, size: 11, after: 14 })
    ensure(60); signLine(t('pdf.testatorSignature', { name: safe(d.fullName) }), 260); signLine(t('pdf.date'), 140, M + 300); y -= 48
    for (const n of [1, 2]) {
      ensure(140)
      label(t('pdf.witness', { n }))
      signLine(t('pdf.wSignature'), 230); signLine(t('pdf.wName'), 200, M + 260); y -= 46
      signLine(t('pdf.wAddress'), 460); y -= 46
      signLine(t('pdf.wOccupation'), 230); y -= 50
    }
  } else {
    page.drawText(safe(t('pdf.title')), { x: M, y: y - 26, size: 26, font: serifBold, color: NAVY }); y -= 34
    text(t('pdf.subtitle'), { font: sans, size: 10, color: GREY, after: 10 })
    ensure(70)
    page.drawRectangle({ x: M, y: y - 62, width: W, height: 62, color: rgb(0.99, 0.95, 0.94), borderColor: RED, borderWidth: 0.8 })
    const warn = wrap(t('pdf.warning'), sansBold, 9.5, W - 24); let wy = y - 16
    for (const l of warn) { page.drawText(l, { x: M + 12, y: wy, size: 9.5, font: sansBold, color: RED }); wy -= 13.5 }
    y -= 76
    rule()
    for (const c of clauses) text(c.text, c.kind === 'li' ? { x: M + 18, width: W - 18, after: 4, size: 12.5, lineHeight: 20 } : { size: 12.5, lineHeight: 20, after: 10 })
  }

  // Guide page
  newPage()
  page.drawText(safe(t('pdf.guideTitle')), { x: M, y: y - 20, size: 18, font: sansBold, color: NAVY }); y -= 40
  t('pdf.guide', { returnObjects: true }).forEach((g, i) => {
    ensure(40)
    page.drawText(`${i + 1}.`, { x: M, y: y - 11, size: 11, font: sansBold, color: SAGE })
    text(g, { font: sans, size: 10.5, x: M + 20, width: W - 20, lineHeight: 15, after: 10 })
  })
  return pdf.save()
}

function download(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export default function WillGenerator() {
  const { t, i18n: inst } = useTranslation('willGenerator')
  const lang = inst.language === 'fr' ? 'fr' : 'en'
  const pageUrl = `https://www.everstead.care${lang === 'fr' ? '/fr' : ''}/will-generator`
  const [d, setD] = useState(loadSaved)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [missing, setMissing] = useState([])
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* private mode */ } }, [d])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step])

  const set = (k, v) => setD(x => ({ ...x, [k]: v }))
  const setExec = (i, k, v) => setD(x => ({ ...x, executors: x.executors.map((e, j) => (j === i ? { ...e, [k]: v } : e)) }))
  const setGift = (i, k, v) => setD(x => ({ ...x, gifts: x.gifts.map((g, j) => (j === i ? { ...g, [k]: v } : g)) }))
  const addGift = () => setD(x => ({ ...x, gifts: [...x.gifts, { what: '', to: '', relation: '' }] }))
  const removeGift = (i) => setD(x => ({ ...x, gifts: x.gifts.filter((_, j) => j !== i) }))
  const reset = () => { setD(EMPTY); setStep(0); try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ } }

  const requiredMissing = useMemo(() => {
    const m = []
    if (!d.fullName.trim()) m.push(t('about.fullName'))
    if (!d.address.trim()) m.push(t('about.address'))
    if (lang === 'en' && !d.executors[0].name.trim()) m.push(t('executors.first'))
    if (d.residueMode === 'person' && !d.residueName.trim()) m.push(t('residue.person'))
    return m
  }, [d, lang, t])

  const clauses = useMemo(() => buildClauses(t, lang, d), [t, lang, d])

  const make = async () => {
    if (requiredMissing.length) { setMissing(requiredMissing); return }
    setMissing([]); setBusy(true); setFailed(false)
    try {
      download(await buildPdf(t, lang, d), lang === 'fr' ? 'everstead-testament-a-recopier.pdf' : 'everstead-simple-will.pdf')
      trackEvent('tool_complete', { tool: 'will_generator', lang })
    } catch { setFailed(true) } finally { setBusy(false) }
  }

  const input = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-navy-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300'
  const label = 'block text-xs font-semibold text-stone-600 mb-1.5'
  const btnPrimary = 'inline-flex items-center gap-2 rounded-full bg-navy-600 hover:bg-navy-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-3 transition-colors'
  const btnGhost = 'inline-flex items-center gap-2 rounded-full bg-white border border-stone-300 hover:border-navy-400 text-navy-900 text-sm font-semibold px-5 py-3 transition-colors'
  const ex = d.executors.filter(e => e.name.trim())
  const gifts = d.gifts.filter(g => g.what.trim() && g.to.trim())

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
      </Helmet>
      <HreflangLinks path="/will-generator" />

      <div className="bg-stone-50 min-h-screen">
        <section className="relative overflow-hidden grain">
          <div className="absolute inset-0 aurora-bg" />
          <div className={`relative max-w-3xl mx-auto ${SECTION_X} pt-28 pb-20 lg:pt-32 lg:pb-24 text-center`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-4">{t('hero.eyebrow')}</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-tight text-balance">{t('hero.title')}</h1>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-stone-300 max-w-xl mx-auto">{t('hero.sub')}</p>
          </div>
        </section>

        <section className={`max-w-3xl mx-auto ${SECTION_X} pb-20 -mt-8`}>
          {/* Gate: the notice must be accepted before any field appears */}
          {!d.accepted ? (
            <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-6 sm:p-8 lg:p-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><AlertTriangle size={18} /></div>
                <div>
                  <h2 className="font-display text-2xl font-light text-navy-950 m-0">{t('notice.title')}</h2>
                  <p className="mt-2 m-0 text-[15px] text-stone-600 leading-relaxed">{t('notice.body')}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2 list-none m-0 p-0">
                {t('notice.reasons', { returnObjects: true }).map(r => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-stone-700"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{r}</li>
                ))}
              </ul>
              <label className="mt-6 flex items-start gap-3 text-sm text-navy-950 cursor-pointer">
                <input type="checkbox" className="mt-1" onChange={e => set('accepted', e.target.checked)} />
                <span>{t('notice.accept')}</span>
              </label>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden">
              {/* Step indicator */}
              <ol className="flex flex-wrap gap-x-4 gap-y-2 px-6 sm:px-8 py-4 border-b border-stone-100 bg-stone-50 list-none m-0 text-xs">
                {STEPS.map((s, i) => (
                  <li key={s} className={`flex items-center gap-1.5 ${i === step ? 'text-navy-800 font-semibold' : i < step ? 'text-sage-700' : 'text-stone-400'}`}>
                    {i < step ? <CheckCircle2 size={13} /> : <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center border ${i === step ? 'border-navy-700' : 'border-stone-300'}`}>{i + 1}</span>}
                    {t(`steps.${s}`)}
                  </li>
                ))}
              </ol>

              <div className="p-6 sm:p-8 lg:p-10 space-y-6">
                {step === 0 && (
                  <>
                    <h2 className="font-display text-2xl font-light text-navy-950 m-0">{t('about.title')}</h2>
                    <div><label className={label} htmlFor="w-name">{t('about.fullName')}</label><input id="w-name" className={input} value={d.fullName} onChange={e => set('fullName', e.target.value)} placeholder={t('about.fullNamePh')} autoComplete="name" /></div>
                    <div><label className={label} htmlFor="w-address">{t('about.address')}</label><input id="w-address" className={input} value={d.address} onChange={e => set('address', e.target.value)} placeholder={t('about.addressPh')} /></div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div><label className={label} htmlFor="w-dob">{t('about.dob')}</label><input id="w-dob" type="date" className={input} value={d.dob} onChange={e => set('dob', e.target.value)} /></div>
                      {lang === 'fr' && <div><label className={label} htmlFor="w-bp">{t('about.birthplace')}</label><input id="w-bp" className={input} value={d.birthplace} onChange={e => set('birthplace', e.target.value)} placeholder={t('about.birthplacePh')} /></div>}
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h2 className="font-display text-2xl font-light text-navy-950 m-0">{t('executors.title')}</h2>
                    <p className="m-0 -mt-3 text-sm text-stone-500 leading-relaxed">{t('executors.intro')}</p>
                    {[0, 1].map(i => (
                      <div key={i} className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-sage-700">{t(i === 0 ? 'executors.first' : 'executors.second')}</p>
                        <input className={input} value={d.executors[i].name} onChange={e => setExec(i, 'name', e.target.value)} placeholder={t('executors.name')} aria-label={`${t('executors.name')} ${i + 1}`} />
                        <input className={input} value={d.executors[i].address} onChange={e => setExec(i, 'address', e.target.value)} placeholder={t('executors.address')} aria-label={`${t('executors.address')} ${i + 1}`} />
                        <input className={input} value={d.executors[i].relation} onChange={e => setExec(i, 'relation', e.target.value)} placeholder={t('executors.relationPh')} aria-label={`${t('executors.relation')} ${i + 1}`} />
                      </div>
                    ))}
                    <p className="m-0 text-xs text-stone-400">{t('executors.jointNote')}</p>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="font-display text-2xl font-light text-navy-950 m-0">{t('family.title')}</h2>
                    <p className="m-0 -mt-3 text-sm text-stone-500 leading-relaxed">{t('family.guardianIntro')}</p>
                    <label className="flex items-center gap-3 text-sm text-navy-950 cursor-pointer"><input type="checkbox" checked={d.hasMinor} onChange={e => set('hasMinor', e.target.checked)} />{t('family.hasMinor')}</label>
                    {d.hasMinor && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div><label className={label}>{t('family.guardian')}</label><input className={input} value={d.guardian} onChange={e => set('guardian', e.target.value)} /></div>
                        <div><label className={label}>{t('family.guardianAddress')}</label><input className={input} value={d.guardianAddress} onChange={e => set('guardianAddress', e.target.value)} /></div>
                      </div>
                    )}
                    <p className="m-0 pt-2 text-sm text-stone-500 leading-relaxed border-t border-stone-100">{t('family.giftsIntro')}</p>
                    {d.gifts.map((g, i) => (
                      <div key={i} className="grid sm:grid-cols-[1.3fr_1fr_0.8fr_auto] gap-2 items-center">
                        <input className={input} value={g.what} onChange={e => setGift(i, 'what', e.target.value)} placeholder={t('family.giftWhatPh')} aria-label={t('family.giftWhat')} />
                        <input className={input} value={g.to} onChange={e => setGift(i, 'to', e.target.value)} placeholder={t('family.giftTo')} aria-label={t('family.giftTo')} />
                        <input className={input} value={g.relation} onChange={e => setGift(i, 'relation', e.target.value)} placeholder={t('family.giftRelation')} aria-label={t('family.giftRelation')} />
                        <button type="button" onClick={() => removeGift(i)} aria-label={t('family.removeGift')} className="text-stone-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={addGift} className={btnGhost}><Plus size={15} /> {t('family.addGift')}</button>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className="font-display text-2xl font-light text-navy-950 m-0">{t('residue.title')}</h2>
                    <p className="m-0 -mt-3 text-sm text-stone-500 leading-relaxed">{t('residue.intro')}</p>
                    <div>
                      <label className={label}>{t('residue.mode')}</label>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {['person', 'children'].map(m => (
                          <button key={m} type="button" onClick={() => set('residueMode', m)} className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${d.residueMode === m ? 'border-navy-300 bg-navy-50 ring-1 ring-navy-200 text-navy-900 font-medium' : 'border-stone-200 hover:border-stone-300 text-stone-700'}`}>
                            {t(m === 'person' ? 'residue.modePerson' : 'residue.modeChildren')}
                          </button>
                        ))}
                      </div>
                    </div>
                    {d.residueMode === 'person' ? (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div><label className={label}>{t('residue.person')}</label><input className={input} value={d.residueName} onChange={e => set('residueName', e.target.value)} /></div>
                          <div><label className={label}>{t('residue.personRelation')}</label><input className={input} value={d.residueRelation} onChange={e => set('residueRelation', e.target.value)} /></div>
                        </div>
                        <p className="m-0 text-sm text-stone-500 leading-relaxed">{t('residue.substituteIntro')}</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div><label className={label}>{t('residue.substitute')}</label><input className={input} value={d.substitute} onChange={e => set('substitute', e.target.value)} /></div>
                          <div><label className={label}>{t('residue.substituteRelation')}</label><input className={input} value={d.substituteRelation} onChange={e => set('substituteRelation', e.target.value)} /></div>
                        </div>
                      </>
                    ) : (
                      <p className="m-0 text-sm text-stone-600 leading-relaxed rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">{t('residue.childrenNote')}</p>
                    )}
                    <div><label className={label}>{t('residue.funeral')}</label><input className={input} value={d.funeral} onChange={e => set('funeral', e.target.value)} placeholder={t('residue.funeralPh')} maxLength={240} /></div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <h2 className="font-display text-2xl font-light text-navy-950 m-0">{t('review.title')}</h2>
                    <p className="m-0 -mt-3 text-sm text-stone-500 leading-relaxed">{t('review.body')}</p>
                    <dl className="grid sm:grid-cols-[180px_1fr] gap-x-6 gap-y-3 text-sm m-0">
                      <dt className="text-stone-500">{t('review.summaryExecutors')}</dt><dd className="m-0 text-navy-950">{ex.length ? ex.map(e => e.name).join(', ') : t('review.none')}</dd>
                      <dt className="text-stone-500">{t('review.summaryGuardian')}</dt><dd className="m-0 text-navy-950">{d.hasMinor && d.guardian ? d.guardian : t('review.none')}</dd>
                      <dt className="text-stone-500">{t('review.summaryGifts')}</dt><dd className="m-0 text-navy-950">{gifts.length ? gifts.map(g => `${g.what} → ${g.to}`).join('; ') : t('review.none')}</dd>
                      <dt className="text-stone-500">{t('review.summaryResidue')}</dt><dd className="m-0 text-navy-950">{d.residueMode === 'children' ? t('residue.modeChildren') : (d.residueName || t('review.none'))}</dd>
                      <dt className="text-stone-500">{t('review.summaryFuneral')}</dt><dd className="m-0 text-navy-950">{d.funeral || t('review.none')}</dd>
                    </dl>
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 max-h-72 overflow-y-auto">
                      {clauses.map((c, i) => <p key={i} className={`m-0 mb-2 text-[13px] leading-relaxed text-stone-700 ${c.kind === 'li' ? 'pl-4' : ''} font-display`}>{c.text}</p>)}
                    </div>
                    {missing.length > 0 && <p className="m-0 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{t('review.missing', { fields: missing.join(', ') })}</p>}
                    {failed && <p className="m-0 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{t('review.failed')}</p>}
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={make} disabled={busy} className={btnPrimary}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{busy ? t('review.generating') : t('review.download')}</button>
                      <button type="button" onClick={reset} className="text-sm text-stone-500 hover:text-stone-700 px-2">{t('review.clear')}</button>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                  <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-navy-800 disabled:opacity-40"><ArrowLeft size={14} /> {t('nav.back')}</button>
                  {step < STEPS.length - 1 && <button type="button" onClick={() => setStep(s => s + 1)} className={btnPrimary}>{t('nav.next')} <ArrowRight size={15} /></button>}
                </div>
              </div>
            </div>
          )}
          <p className="mt-4 m-0 flex items-start gap-2 text-xs text-stone-500 leading-relaxed"><ShieldCheck size={14} className="shrink-0 mt-0.5 text-sage-600" /> {t('after.privacy')}</p>
        </section>

        <section className={`relative py-20 lg:py-24 text-stone-50 overflow-hidden grain bg-gradient-to-br from-navy-950 to-navy-800 ${SECTION_X}`}>
          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="font-display font-light text-stone-50 text-balance m-0 leading-[1.1] text-[clamp(2rem,3.4vw,3rem)]">{t('after.title')}</h2>
            <p className="mt-5 m-0 text-base leading-[1.6] text-stone-300 max-w-xl mx-auto">{t('after.body')}</p>
            <Link to="/get-started?plan=free" onClick={() => trackEvent('cta_click', { location: 'will_generator', cta: 'start_free' })} className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-stone-50 hover:bg-white text-navy-950 text-base font-semibold px-[30px] py-4 transition-colors">
              {t('after.cta')} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
