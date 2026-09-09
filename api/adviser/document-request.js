import { withSentry } from '../lib/sentry.js'
import { db, requireAdviser, loadClientForFirm, isUuid, logAdviserActivity } from '../_lib/adviser-access.js'
import { sendDocumentRequestEmail } from '../_lib/adviser-email.js'

// Adviser-facing: ask a linked client for a document, or remind them.
//   { action: 'create', clientId, docType, note }
//   { action: 'remind', requestId }
// The row is written with the service role after the firm-link check; the
// client is emailed in THEIR language and sees the request in their vault.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ctx = await requireAdviser(req)
  if (!ctx) return res.status(403).json({ error: 'Only advisers can request documents.' })

  const { action } = req.body || {}

  if (action === 'create') {
    const { clientId } = req.body
    const docType = String(req.body.docType || '').trim().slice(0, 120)
    const note    = String(req.body.note || '').trim().slice(0, 500) || null
    if (!isUuid(clientId)) return res.status(400).json({ error: 'Missing client id.' })
    if (!docType) return res.status(400).json({ error: 'Say which document you need.' })
    const client = await loadClientForFirm(clientId, ctx.firmIds)
    if (!client) return res.status(403).json({ error: 'This client is not linked to your firm.' })

    const { data: row, error } = await db.from('adviser_document_requests').insert({
      adviser_id: client.firm.id, client_id: clientId, requested_by: ctx.user.id, doc_type: docType, note,
    }).select('*').single()
    if (error || !row) return res.status(500).json({ error: 'Could not save the request.' })

    const emailed = await sendDocumentRequestEmail({
      to: client.profile.email, lang: client.profile.language, firmName: client.firm.firm_name, docType, note,
    })
    await logAdviserActivity({
      clientId, actorId: ctx.user.id, action: 'adviser.document_requested', resourceType: 'adviser_document_requests',
      resourceId: row.id, resourceName: docType, metadata: { firm_id: client.firm.id, firm_name: client.firm.firm_name },
    })
    return res.status(200).json({ request: { ...row, client_name: client.profile.full_name || client.profile.email }, emailed })
  }

  if (action === 'remind') {
    const { requestId } = req.body
    if (!isUuid(requestId)) return res.status(400).json({ error: 'Missing request id.' })
    const { data: row } = await db.from('adviser_document_requests').select('*').eq('id', requestId).maybeSingle()
    if (!row || !ctx.firmIds.includes(row.adviser_id)) return res.status(404).json({ error: 'Request not found.' })
    if (row.status !== 'requested') return res.status(400).json({ error: 'This request has already been answered.' })
    const client = await loadClientForFirm(row.client_id, ctx.firmIds)
    if (!client) return res.status(403).json({ error: 'This client is no longer linked to your firm.' })

    const emailed = await sendDocumentRequestEmail({
      to: client.profile.email, lang: client.profile.language, firmName: client.firm.firm_name,
      docType: row.doc_type, note: row.note, reminder: true,
    })
    const { data: updated } = await db.from('adviser_document_requests')
      .update({ reminded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', requestId).select('*').single()
    return res.status(200).json({ request: updated || row, emailed })
  }

  return res.status(400).json({ error: 'Unknown action.' })
}

export default withSentry(handler)
