import { withSentry } from '../lib/sentry.js'
import { db, isUuid } from '../_lib/adviser-access.js'
import { sendDocumentUploadedNotice } from '../_lib/adviser-email.js'

// CLIENT-facing: after attaching a document to a request (fulfil_document_request
// RPC, under RLS), the client tells the firm. Best-effort: a failed email never
// undoes the attachment. Authenticated as the client, never the adviser.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorised' })

  const { requestId } = req.body || {}
  if (!isUuid(requestId)) return res.status(400).json({ error: 'Missing request id.' })

  const { data: row } = await db.from('adviser_document_requests')
    .select('id, adviser_id, client_id, requested_by, doc_type, document_id, status')
    .eq('id', requestId).eq('client_id', user.id).maybeSingle()
  if (!row) return res.status(404).json({ error: 'Request not found.' })
  if (row.status !== 'uploaded') return res.status(400).json({ error: 'Nothing has been attached to this request yet.' })

  const [{ data: firm }, { data: client }, { data: doc }, { data: members }] = await Promise.all([
    db.from('advisers').select('id, firm_name, contact_email').eq('id', row.adviser_id).maybeSingle(),
    db.from('profiles').select('full_name, email, language').eq('id', user.id).maybeSingle(),
    row.document_id ? db.from('documents').select('name').eq('id', row.document_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('adviser_members').select('user_id, email').eq('adviser_id', row.adviser_id).eq('invite_status', 'accepted'),
  ])
  if (!firm) return res.status(200).json({ notified: 0 })

  const ids = (members || []).map(m => m.user_id).filter(Boolean)
  const langs = {}
  if (ids.length) {
    const { data: profs } = await db.from('profiles').select('id, language').in('id', ids)
    for (const p of profs || []) langs[p.id] = p.language === 'fr' ? 'fr' : 'en'
  }
  const fallbackLang = client?.language === 'fr' ? 'fr' : 'en'
  // The person who asked first, then the rest of the firm, then the firm mailbox.
  const recipients = new Map()
  for (const m of members || []) if (m.email) recipients.set(m.email.toLowerCase(), langs[m.user_id] || fallbackLang)
  if (firm.contact_email && !recipients.has(firm.contact_email.toLowerCase())) recipients.set(firm.contact_email.toLowerCase(), fallbackLang)

  let notified = 0
  for (const [email, lang] of recipients) {
    const ok = await sendDocumentUploadedNotice({
      to: email, lang, firmName: firm.firm_name,
      clientName: client?.full_name || client?.email, docType: row.doc_type, documentName: doc?.name || null,
    })
    if (ok) notified += 1
  }
  return res.status(200).json({ notified })
}

export default withSentry(handler)
