import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import JSZipPkg from 'jszip'
import { withSentry, captureException } from '../_lib/sentry.js'
import { db, requireAdviser, loadClientForFirm, loadSharedPlan, isUuid, logAdviserActivity } from '../_lib/adviser-access.js'
import { DEMO_ADVISOR_FAMILIES } from '../../src/lib/demoData.js'

const JSZip = JSZipPkg.default ?? JSZipPkg

// -----------------------------------------------------------------------------
// POST /api/adviser/probate-pack   { clientId }          Authorization: Bearer <jwt>
// POST /api/adviser/probate-pack   { demo: true, lang }  (no auth, demo data only)
//
// The estate pack a solicitor or notaire needs when administration starts: one
// ZIP holding an inventory PDF (accounts with provider, reference, last known
// value and date; documents; trusted people; instructions) plus the shared
// document FILES themselves, not a list of their names.
//
// Only the sections the client consented to are included. The inventory is
// written in the ADVISER's language: a French notaire reads French even when
// the client filled their vault in English.
// -----------------------------------------------------------------------------

const NB = '\u00a0' // French typography: no-break space before high punctuation
const DOTS = '\u2022\u2022\u2022\u2022'

// The standard PDF fonts only know WinAnsi. Anything outside it (emoji, CJK,
// unusual symbols) would throw at draw time, so it becomes a question mark.
const WINANSI = /[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC\n]/g
// ZIP entry names: no path separators, control characters or shell-hostile symbols.
const UNSAFE_NAME = /[\\/:*?"<>|\u0000-\u001F\u007F-\u00A0]/g

const COPY = {
  en: {
    title:            'Estate inventory',
    subtitle:         'Prepared from the Everstead vault of',
    preparedFor:      'Prepared for:',
    generated:        'Generated on:',
    note:             'The information in this document is as recorded by the client in their Everstead vault. Values are the last figures the client entered, not date-of-death valuations, and should be confirmed with each provider. Everstead is an organisation tool and does not provide legal, tax or financial advice.',
    activationDeath:  'Everstead verified a death report on {{date}}. The vault has been activated for the people the client named.',
    activationIncap:  'Everstead verified an incapacity report on {{date}}. The vault has been activated for the people the client named.',
    dod:              'Date of death as recorded by the reporter: {{date}}.',
    notActivated:     'The vault has not been activated: no death or incapacity report has been verified for this client.',
    summary:          'Contents',
    summaryLine:      '{{accounts}} accounts and assets, {{documents}} documents ({{files}} files attached), {{people}} trusted people, {{instructions}} sets of instructions.',
    sAccounts:        'Accounts and assets',
    sDocuments:       'Documents',
    sPeople:          'Trusted people',
    sInstructions:    'Instructions left by the client',
    notShared:        'Not shared by the client with your firm.',
    none:             'None recorded.',
    colProvider:      'Provider', colType: 'Type', colCategory: 'Category', colRef: 'Reference',
    colValue:         'Last known value', colUpdated: 'Last updated', colNotes: 'Notes',
    colName:          'Name', colStatus: 'Status', colExpires: 'Expires', colFile: 'File in this pack',
    noFile:           'No file uploaded',
    colRole:          'Role', colEmail: 'Email', colInvite: 'Invitation',
    forAudience:      'For: {{audience}}', category: 'Category: {{category}}',
    footer:           'Everstead  |  Confidential, prepared for {{firm}}  |  Page {{n}} of {{total}}',
    zipInventory:     'Estate inventory.pdf',
    zipFolder:        'documents',
    zipName:          'Estate pack',
    readme: [
      'Everstead estate pack',
      '',
      'Client: {{client}}',
      'Prepared for: {{firm}}',
      'Generated: {{date}}',
      '',
      'Contents',
      '  Estate inventory.pdf   Accounts, documents, trusted people and instructions the client shared with your firm.',
      '  documents/             The document files themselves, numbered to match the inventory.',
      '',
      'This pack contains only the sections the client chose to share with your firm. It is confidential and intended for the administration of their affairs.',
      'Everstead is an organisation tool and does not provide legal, tax or financial advice. Values are as entered by the client and must be confirmed with each provider.',
      '',
      'Questions: support@everstead.care',
    ],
    demoDoc:          'Sample document for demonstration purposes only.',
  },
  fr: {
    title:            'Inventaire successoral',
    subtitle:         'Établi à partir du coffre Everstead de',
    preparedFor:      `Établi pour${NB}:`,
    generated:        `Généré le${NB}:`,
    note:             `Les informations de ce document sont celles que le client a enregistrées dans son coffre Everstead. Les montants sont les derniers chiffres saisis par le client, et non des valeurs au jour du décès${NB}: ils doivent être confirmés auprès de chaque établissement. Everstead est un outil d'organisation et ne fournit aucun conseil juridique, fiscal ou financier.`,
    activationDeath:  'Everstead a vérifié un signalement de décès le {{date}}. Le coffre a été activé pour les personnes désignées par le client.',
    activationIncap:  "Everstead a vérifié un signalement d'incapacité le {{date}}. Le coffre a été activé pour les personnes désignées par le client.",
    dod:              `Date du décès indiquée par le déclarant${NB}: {{date}}.`,
    notActivated:     `Le coffre n'a pas été activé${NB}: aucun signalement de décès ou d'incapacité n'a été vérifié pour ce client.`,
    summary:          'Contenu',
    summaryLine:      '{{accounts}} comptes et actifs, {{documents}} documents ({{files}} fichiers joints), {{people}} personnes de confiance, {{instructions}} consignes.',
    sAccounts:        'Comptes et actifs',
    sDocuments:       'Documents',
    sPeople:          'Personnes de confiance',
    sInstructions:    'Consignes laissées par le client',
    notShared:        'Non partagé par le client avec votre cabinet.',
    none:             "Rien d'enregistré.",
    colProvider:      'Établissement', colType: 'Type', colCategory: 'Catégorie', colRef: 'Référence',
    colValue:         'Dernière valeur connue', colUpdated: 'Mis à jour le', colNotes: 'Notes',
    colName:          'Nom', colStatus: 'Statut', colExpires: 'Expire le', colFile: 'Fichier dans ce dossier',
    noFile:           'Aucun fichier',
    colRole:          'Rôle', colEmail: 'E-mail', colInvite: 'Invitation',
    forAudience:      `Pour${NB}: {{audience}}`, category: `Catégorie${NB}: {{category}}`,
    footer:           'Everstead  |  Confidentiel, établi pour {{firm}}  |  Page {{n}} sur {{total}}',
    zipInventory:     'Inventaire successoral.pdf',
    zipFolder:        'documents',
    zipName:          'Dossier succession',
    readme: [
      'Dossier succession Everstead',
      '',
      `Client${NB}: {{client}}`,
      `Établi pour${NB}: {{firm}}`,
      `Généré le${NB}: {{date}}`,
      '',
      'Contenu',
      '  Inventaire successoral.pdf   Comptes, documents, personnes de confiance et consignes que le client a partagés avec votre cabinet.',
      "  documents/                   Les fichiers eux-mêmes, numérotés comme dans l'inventaire.",
      '',
      'Ce dossier ne contient que les rubriques que le client a choisi de partager avec votre cabinet. Il est confidentiel et destiné au règlement de ses affaires.',
      "Everstead est un outil d'organisation et ne fournit aucun conseil juridique, fiscal ou financier. Les montants sont ceux saisis par le client et doivent être confirmés auprès de chaque établissement.",
      '',
      `Questions${NB}: support@everstead.care`,
    ],
    demoDoc:          'Document fictif, à des fins de démonstration uniquement.',
  },
}

const t = (lang, key, vars = {}) =>
  String(COPY[lang]?.[key] ?? COPY.en[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`))

const fmtDate = (v, lang) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const safe = (s) => String(s ?? '').replace(/\r\n?/g, '\n').replace(WINANSI, '?')
const fileSafe = (s) => String(s || 'document').replace(UNSAFE_NAME, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'document'

const NAVY  = rgb(0.082, 0.133, 0.251)
const INK   = rgb(0.11, 0.10, 0.09)
const GREY  = rgb(0.45, 0.43, 0.41)
const LINE  = rgb(0.85, 0.84, 0.82)
const FILL  = rgb(0.965, 0.962, 0.955)
const A4    = [595.28, 841.89]
const M     = 48
const W     = A4[0] - 2 * M

// A tiny flowing-layout engine on top of pdf-lib: cursor, page breaks, wrapped
// text and tables. Nothing more than the inventory needs.
class Inventory {
  constructor(pdf, fonts) {
    this.pdf = pdf
    this.f = fonts
    this.page = null
    this.y = 0
    this.newPage()
  }
  newPage() {
    this.page = this.pdf.addPage(A4)
    this.y = A4[1] - M
  }
  ensure(h) { if (this.y - h < M + 24) this.newPage() }
  gap(h) { this.y -= h }
  wrap(text, font, size, width) {
    const out = []
    for (const para of safe(text).split('\n')) {
      const words = para.split(/\s+/).filter(Boolean)
      if (!words.length) { out.push(''); continue }
      let line = ''
      for (const w of words) {
        const trial = line ? `${line} ${w}` : w
        if (font.widthOfTextAtSize(trial, size) <= width) { line = trial; continue }
        if (line) out.push(line)
        // A single word wider than the column is broken by character.
        if (font.widthOfTextAtSize(w, size) > width) {
          let chunk = ''
          for (const ch of w) {
            if (font.widthOfTextAtSize(chunk + ch, size) > width) { out.push(chunk); chunk = ch } else chunk += ch
          }
          line = chunk
        } else line = w
      }
      out.push(line)
    }
    return out
  }
  text(str, { size = 10, font = this.f.regular, color = INK, x = M, width = W, lineHeight = 1.35, after = 0 } = {}) {
    const lines = this.wrap(str, font, size, width)
    const lh = size * lineHeight
    for (const line of lines) {
      this.ensure(lh)
      this.page.drawText(line, { x, y: this.y - size, size, font, color })
      this.y -= lh
    }
    this.y -= after
    return lines.length
  }
  heading(str) {
    this.ensure(40)
    this.gap(14)
    this.page.drawText(safe(str), { x: M, y: this.y - 13, size: 13, font: this.f.bold, color: NAVY })
    this.y -= 20
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: M + W, y: this.y }, thickness: 1, color: NAVY })
    this.y -= 10
  }
  table(cols, rows, { size = 9 } = {}) {
    const widths = cols.map(c => c.w * W)
    const pad = 5
    const lh = size * 1.3
    const drawHeader = () => {
      const cells = cols.map((c, i) => this.wrap(c.label, this.f.bold, size, widths[i] - pad * 2))
      const h = Math.max(1, ...cells.map(c => c.length)) * lh + pad * 2
      this.ensure(h)
      this.page.drawRectangle({ x: M, y: this.y - h, width: W, height: h, color: FILL })
      let x = M
      cells.forEach((cell, i) => {
        cell.forEach((line, li) => {
          this.page.drawText(line, { x: x + pad, y: this.y - pad - size - li * lh, size, font: this.f.bold, color: NAVY })
        })
        x += widths[i]
      })
      this.y -= h
    }
    drawHeader()
    rows.forEach((row) => {
      const cells = cols.map((c, i) => this.wrap(c.value(row), this.f.regular, size, widths[i] - pad * 2))
      const lines = Math.max(1, ...cells.map(c => c.length))
      const h = lines * lh + pad * 2
      if (this.y - h < M + 24) { this.newPage(); drawHeader() }
      let x = M
      cells.forEach((cell, i) => {
        cell.forEach((line, li) => {
          this.page.drawText(line, { x: x + pad, y: this.y - pad - size - li * lh, size, font: this.f.regular, color: cols[i].muted ? GREY : INK })
        })
        x += widths[i]
      })
      this.y -= h
      this.page.drawLine({ start: { x: M, y: this.y }, end: { x: M + W, y: this.y }, thickness: 0.5, color: LINE })
    })
    this.gap(6)
  }
  footers(label) {
    const pages = this.pdf.getPages()
    pages.forEach((p, i) => {
      const txt = safe(label.replace('{{n}}', String(i + 1)).replace('{{total}}', String(pages.length)))
      p.drawText(txt, { x: M, y: M - 14, size: 8, font: this.f.regular, color: GREY })
    })
  }
}

const extFor = (doc) => {
  const fromPath = String(doc.storage_path || '').split('.').pop()
  if (fromPath && fromPath.length <= 5 && /^[a-z0-9]+$/i.test(fromPath)) return fromPath.toLowerCase()
  const map = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp', 'text/plain': 'txt' }
  return map[doc.mime_type] || 'bin'
}

async function buildInventoryPdf({ lang, client, firm, plan, activation, consents, attached }) {
  const pdf     = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold    = await pdf.embedFont(StandardFonts.HelveticaBold)
  pdf.setTitle(`${t(lang, 'title')} - ${client.full_name || ''}`)
  pdf.setAuthor('Everstead')
  pdf.setCreator('Everstead adviser portal')
  const inv = new Inventory(pdf, { regular, bold })
  const today = fmtDate(new Date(), lang)

  // Title block
  inv.page.drawText('EVERSTEAD', { x: M, y: inv.y - 10, size: 10, font: bold, color: NAVY })
  inv.y -= 30
  inv.text(t(lang, 'title'), { size: 24, font: bold, color: NAVY, after: 4 })
  inv.text(`${t(lang, 'subtitle')} ${client.full_name || client.email || ''}`, { size: 12, color: GREY, after: 14 })
  inv.text(`${t(lang, 'preparedFor')} ${firm?.firm_name || ''}`, { size: 10, after: 2 })
  inv.text(`${t(lang, 'generated')} ${today}`, { size: 10, color: GREY, after: 12 })
  inv.text(t(lang, 'note'), { size: 9, color: GREY, after: 10 })

  if (activation?.type) {
    const key = activation.type === 'death' ? 'activationDeath' : 'activationIncap'
    inv.text(t(lang, key, { date: fmtDate(activation.verified_at, lang) }), { size: 10, font: bold, color: NAVY, after: 2 })
    if (activation.date_of_death) inv.text(t(lang, 'dod', { date: fmtDate(activation.date_of_death, lang) }), { size: 10, after: 2 })
  } else {
    inv.text(t(lang, 'notActivated'), { size: 9, color: GREY })
  }

  inv.heading(t(lang, 'summary'))
  inv.text(t(lang, 'summaryLine', {
    accounts: plan.accounts.length, documents: plan.documents.length, files: attached.length,
    people: plan.trusted_people.length, instructions: plan.instructions.length,
  }), { size: 10 })

  // Accounts
  inv.heading(t(lang, 'sAccounts'))
  if (!consents.accounts) inv.text(t(lang, 'notShared'), { size: 10, color: GREY })
  else if (!plan.accounts.length) inv.text(t(lang, 'none'), { size: 10, color: GREY })
  else inv.table([
    { label: t(lang, 'colProvider'), w: 0.20, value: r => r.institution },
    { label: t(lang, 'colType'),     w: 0.17, value: r => r.account_type },
    { label: t(lang, 'colCategory'), w: 0.12, value: r => r.category, muted: true },
    { label: t(lang, 'colRef'),      w: 0.12, value: r => r.account_number_hint ? `${DOTS} ${r.account_number_hint}` : '' },
    { label: t(lang, 'colValue'),    w: 0.13, value: r => r.balance_display },
    { label: t(lang, 'colUpdated'),  w: 0.12, value: r => fmtDate(r.updated_at, lang), muted: true },
    { label: t(lang, 'colNotes'),    w: 0.14, value: r => r.notes, muted: true },
  ], plan.accounts)

  // Documents
  inv.heading(t(lang, 'sDocuments'))
  if (!consents.documents) inv.text(t(lang, 'notShared'), { size: 10, color: GREY })
  else if (!plan.documents.length) inv.text(t(lang, 'none'), { size: 10, color: GREY })
  else inv.table([
    { label: t(lang, 'colName'),    w: 0.30, value: r => r.name },
    { label: t(lang, 'colType'),    w: 0.13, value: r => r.doc_type, muted: true },
    { label: t(lang, 'colStatus'),  w: 0.10, value: r => r.status, muted: true },
    { label: t(lang, 'colExpires'), w: 0.13, value: r => fmtDate(r.expires_at, lang), muted: true },
    { label: t(lang, 'colUpdated'), w: 0.13, value: r => fmtDate(r.updated_at, lang), muted: true },
    { label: t(lang, 'colFile'),    w: 0.21, value: r => r._file || t(lang, 'noFile') },
  ], plan.documents)

  // People
  inv.heading(t(lang, 'sPeople'))
  if (!consents.people) inv.text(t(lang, 'notShared'), { size: 10, color: GREY })
  else if (!plan.trusted_people.length) inv.text(t(lang, 'none'), { size: 10, color: GREY })
  else inv.table([
    { label: t(lang, 'colName'),   w: 0.30, value: r => r.name },
    { label: t(lang, 'colRole'),   w: 0.25, value: r => r.role },
    { label: t(lang, 'colEmail'),  w: 0.30, value: r => r.email },
    { label: t(lang, 'colInvite'), w: 0.15, value: r => r.invite_status, muted: true },
  ], plan.trusted_people)

  // Instructions
  inv.heading(t(lang, 'sInstructions'))
  if (!consents.instructions) inv.text(t(lang, 'notShared'), { size: 10, color: GREY })
  else if (!plan.instructions.length) inv.text(t(lang, 'none'), { size: 10, color: GREY })
  else for (const ins of plan.instructions) {
    inv.ensure(40)
    inv.text(ins.title, { size: 11, font: bold, after: 1 })
    const meta = [
      ins.audience && t(lang, 'forAudience', { audience: ins.audience }),
      ins.category && t(lang, 'category', { category: ins.category }),
    ].filter(Boolean).join('   ')
    if (meta) inv.text(meta, { size: 8.5, color: GREY, after: 3 })
    if (ins.body) inv.text(ins.body, { size: 9.5, after: 3 })
    ;(ins.steps || []).forEach((s, i) => inv.text(`${i + 1}.  ${s}`, { size: 9.5, x: M + 12, width: W - 12 }))
    inv.gap(10)
  }

  inv.footers(t(lang, 'footer', { firm: firm?.firm_name || 'Everstead' }))
  return pdf.save()
}

async function placeholderPdf(lang, name) {
  const pdf  = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const page = pdf.addPage(A4)
  page.drawText(safe(name), { x: M, y: A4[1] - 100, size: 18, font, color: NAVY })
  page.drawText(safe(t(lang, 'demoDoc')), { x: M, y: A4[1] - 130, size: 11, font, color: GREY })
  return pdf.save()
}

export async function buildPack({ lang, client, firm, plan, activation, consents, isDemo }) {
  const zip = new JSZip()
  const folder = zip.folder(t(lang, 'zipFolder'))
  const attached = []

  // Document files first, so the inventory can name each attached file.
  let n = 0
  for (const doc of plan.documents) {
    if (!doc.storage_path) continue
    let bytes = null
    if (isDemo) {
      bytes = await placeholderPdf(lang, doc.name)
    } else {
      try {
        const { data, error } = await db.storage.from('documents').download(doc.storage_path)
        if (!error && data) bytes = new Uint8Array(await data.arrayBuffer())
      } catch (err) {
        captureException(err, { endpoint: 'adviser/probate-pack', stage: 'download', documentId: doc.id })
      }
    }
    if (!bytes) continue
    n += 1
    const fileName = `${String(n).padStart(2, '0')} - ${fileSafe(doc.name)}.${isDemo ? 'pdf' : extFor(doc)}`
    folder.file(fileName, bytes)
    doc._file = `${t(lang, 'zipFolder')}/${fileName}`
    attached.push(fileName)
  }

  const inventory = await buildInventoryPdf({ lang, client, firm, plan, activation, consents, attached })
  zip.file(t(lang, 'zipInventory'), inventory)
  zip.file('README.txt', COPY[lang].readme.join('\n')
    .replace('{{client}}', client.full_name || client.email || '')
    .replace('{{firm}}', firm?.firm_name || '')
    .replace('{{date}}', fmtDate(new Date(), lang)))

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const stamp  = new Date().toISOString().slice(0, 10)
  const name   = `${t(lang, 'zipName')} - ${fileSafe(client.full_name || 'client')} - ${stamp}.zip`
  return { buffer, name, attached }
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const body = req.body || {}

  let lang, client, firm, plan, activation, consents, actorId = null
  const isDemo = body.demo === true

  if (isDemo) {
    lang = body.lang === 'fr' ? 'fr' : 'en'
    const fam = DEMO_ADVISOR_FAMILIES[0]
    client = { full_name: fam.owner_name, email: fam.owner_email }
    firm   = { firm_name: lang === 'fr' ? 'Cabinet de démonstration' : 'Demonstration firm' }
    consents = { accounts: true, documents: true, people: true, instructions: true }
    plan = {
      accounts:       fam.accounts.map(a => ({ ...a, updated_at: fam.last_updated })),
      documents:      fam.documents.map(d => ({ ...d, mime_type: 'application/pdf', storage_path: 'demo/sample.pdf' })),
      trusted_people: fam.trusted_people.map(p => ({ ...p, email: p.email || '' })),
      instructions:   fam.instructions.map(i => ({ ...i, body: '', steps: [] })),
    }
    activation = null
  } else {
    const ctx = await requireAdviser(req)
    if (!ctx) return res.status(403).json({ error: 'Only advisers can download an estate pack.' })
    if (!isUuid(body.clientId)) return res.status(400).json({ error: 'Missing client id.' })
    const linked = await loadClientForFirm(body.clientId, ctx.firmIds)
    if (!linked) return res.status(403).json({ error: 'This client is not linked to your firm.' })
    lang     = ctx.language
    client   = linked.profile
    firm     = linked.firm
    consents = linked.consents
    actorId  = ctx.user.id
    plan = await loadSharedPlan(client.id, consents)
    const { data: rep } = await db.from('reports').select('type, updated_at, date_of_death')
      .eq('owner_id', client.id).eq('status', 'verified').order('updated_at', { ascending: false }).limit(1).maybeSingle()
    activation = rep || null
  }

  try {
    const { buffer, name, attached } = await buildPack({ lang, client, firm, plan, activation, consents, isDemo })

    if (!isDemo) {
      await logAdviserActivity({
        clientId: client.id, actorId,
        action: 'adviser.estate_pack_downloaded', resourceType: 'profiles',
        resourceId: client.id, resourceName: firm?.firm_name || null,
        metadata: {
          firm_id: firm?.id, documents_attached: attached.length,
          sections: ['accounts', 'documents', 'instructions', 'people'].filter(k => consents[k]),
        },
      })
    }

    const ascii = name.replace(/[^\x20-\x7E]/g, '_')
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('adviser/probate-pack:', err)
    captureException(err, { endpoint: 'adviser/probate-pack', demo: isDemo })
    return res.status(500).json({ error: 'Could not build the estate pack. Please try again.' })
  }
}

export default withSentry(handler)
