// An attestation of exchange: a timestamped receipt a professional can file.
//
// This is what turns our activity log into an artefact. A notaire or an HR team
// needs to be able to put something in a matter file that says who sent what,
// to whom, and when it was answered. DocSecure sells that as "fait preuve", and
// they are right that it matters.
//
// Deliberately modest about what it claims. It is a statement of Everstead's
// own records at the moment it was generated, not a qualified timestamp under
// eIDAS, and it says so on the page. Overclaiming here would be worse than not
// shipping it, because the whole value is that a professional can rely on it.
//
// pdf-lib is imported on demand so it never lands in a page bundle that does
// not ask for a receipt.
const WINANSI_EXTRA = '‘’“”…€Œœ–—• '
const safe = (s) => String(s ?? '')
  .replace(/[^\x20-\x7E\xA0-\xFF]/g, ch => (WINANSI_EXTRA.includes(ch) ? ch : ''))
  .replace(/\s+/g, ' ').trim()

const stamp = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toISOString().slice(0, 10)} at ${d.toISOString().slice(11, 19)} UTC`
}

// "Received", never how. Distinguishing a vault from a download would tell the
// sender whether the recipient holds an Everstead account, which is not theirs
// to learn. Delivery is what an attestation needs to establish.
const OUTCOME = {
  accepted:   'Received by the recipient',
  downloaded: 'Received by the recipient',
  declined:   'Declined by the recipient; the file was deleted',
  expired:    'Expired without an answer; the file was deleted',
  sent:       'Sent, not yet answered',
}

/**
 * @param {'delivery'|'share'} kind
 * @param {object} row  the inbound_deliveries or adviser_document_requests row
 * @param {object} ctx  { orgName }
 */
export async function buildAttestation(kind, row, ctx = {}) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const title = kind === 'delivery' ? 'Attestation of exchange' : 'Attestation of access'
  pdf.setTitle(title)
  pdf.setProducer('Everstead')
  pdf.setCreator('Everstead')

  const page = pdf.addPage([595.28, 841.89])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const NAVY = rgb(13 / 255, 22 / 255, 40 / 255)
  const SAGE = rgb(76 / 255, 125 / 255, 71 / 255)
  const INK  = rgb(0.11, 0.1, 0.09)
  const GREY = rgb(0.47, 0.44, 0.42)
  const LINE = rgb(0.85, 0.84, 0.82)
  const PW = 595.28, PH = 841.89, M = 56

  const draw = (text, { x = M, y, size = 10, f = font, color = INK }) =>
    page.drawText(safe(text), { x, y, size, font: f, color })

  // Header band
  page.drawRectangle({ x: 0, y: PH - 92, width: PW, height: 92, color: NAVY })
  draw('EVERSTEAD', { x: M, y: PH - 44, size: 11, f: bold, color: rgb(0.62, 0.74, 0.62) })
  draw(title, { x: M, y: PH - 68, size: 19, f: bold, color: rgb(1, 1, 1) })

  let y = PH - 132
  const row2 = (label, value, opts = {}) => {
    draw(label.toUpperCase(), { x: M, y, size: 7.5, f: bold, color: GREY })
    const lines = wrap(safe(value), opts.width ?? 320, opts.size ?? 11, opts.f ?? font)
    let yy = y - 15
    for (const l of lines) { draw(l, { x: M, y: yy, size: opts.size ?? 11, f: opts.f ?? font }); yy -= 14 }
    y = yy - 12
  }
  const wrap = (text, width, size, f) => {
    const words = String(text).split(' ')
    const out = []
    let line = ''
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (f.widthOfTextAtSize(next, size) > width && line) { out.push(line); line = w } else line = next
    }
    if (line) out.push(line)
    return out.length ? out : ['—']
  }
  const rule = () => { page.drawLine({ start: { x: M, y: y + 6 }, end: { x: PW - M, y: y + 6 }, thickness: 0.5, color: LINE }); y -= 10 }

  const ref = String(row.id || '').split('-')[0].toUpperCase()
  row2('Reference', ref ? `${ref} · full id ${row.id}` : '—', { size: 10 })
  rule()

  if (kind === 'delivery') {
    row2('Sent by', ctx.orgName || row.sender_name || '—', { f: bold })
    row2('Sent to', row.recipient_email || '—')
    row2('Document', row.title || '—')
    row2('Type', row.doc_type || '—', { size: 10 })
    rule()
    row2('Sent at', stamp(row.sent_at))
    row2('Outcome', OUTCOME[row.status] || row.status || '—')
    row2('Answered at', stamp(row.responded_at || row.downloaded_at))
    row2('Second factor', row.claim_verified_at
      ? `One-time code confirmed at ${stamp(row.claim_verified_at)}`
      : 'Recipient was signed in to the address it was sent to')
  } else {
    row2('Requested by', ctx.orgName || row.sender_name || '—', { f: bold })
    row2('Requested from', row.recipient_email || '—')
    row2('What was asked for', row.doc_type || '—')
    if (row.note) row2('Note', row.note, { size: 10 })
    rule()
    row2('Requested at', stamp(row.created_at))
    row2('Answered at', stamp(row.uploaded_at || row.updated_at))
    row2('Outcome', row.status === 'cancelled'
      ? 'Declined or withdrawn; no access was granted'
      : row.status === 'requested'
        ? 'Not yet answered'
        : 'Answered: the recipient granted access to one document of their choosing')
    row2('Access window', row.expires_days
      ? `${row.expires_days} days from the moment access was granted`
      : 'Until the recipient stops it')
  }

  rule()
  const note = kind === 'delivery'
    ? 'Everstead never attaches a file to an email. The recipient opened this through Everstead after confirming they control the address above. The document itself is not reproduced here.'
    : 'Access is to the single document the recipient chose. Nothing else in their vault was opened, and they can stop the access at any time.'
  for (const l of wrap(note, PW - M * 2, 9.5, font)) { draw(l, { y, size: 9.5, color: GREY }); y -= 13 }
  y -= 8

  const disclaimer = `Generated by Everstead from its own records on ${stamp(new Date().toISOString())}. All times are UTC. This is a statement of the records held by Everstead and is not a qualified electronic timestamp under eIDAS.`
  for (const l of wrap(disclaimer, PW - M * 2, 8.5, font)) { draw(l, { y, size: 8.5, color: GREY }); y -= 11 }

  page.drawLine({ start: { x: M, y: 78 }, end: { x: PW - M, y: 78 }, thickness: 0.5, color: LINE })
  draw('Everstead Digital Ltd, registered in England & Wales, No. 17166825, London', { y: 62, size: 8, color: GREY })
  draw('everstead.care', { y: 50, size: 8, color: SAGE })

  return pdf.save()
}

export function downloadPdf(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
