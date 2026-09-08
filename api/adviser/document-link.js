import { withSentry } from '../lib/sentry.js'
import { db, requireAdviser, loadClientForFirm, isUuid, logAdviserActivity } from '../_lib/adviser-access.js'

// Adviser-facing: a short-lived signed URL for ONE document a linked client has
// chosen to share. The `documents` bucket is owner-read-only under RLS, so the
// portal cannot sign URLs itself; this endpoint does it with the service role
// after checking the firm link and the client's documents consent.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAdviser(req)
  if (!ctx) return res.status(403).json({ error: 'Only advisers can open client documents.' })

  const { clientId, documentId } = req.body || {}
  if (!isUuid(clientId) || !isUuid(documentId)) return res.status(400).json({ error: 'Missing client or document id.' })

  const client = await loadClientForFirm(clientId, ctx.firmIds)
  if (!client) return res.status(403).json({ error: 'This client is not linked to your firm.' })
  if (!client.consents.documents) return res.status(403).json({ error: 'This client has not shared their documents with your firm.' })

  const { data: doc } = await db
    .from('documents')
    .select('id, name, storage_path, mime_type')
    .eq('id', documentId)
    .eq('user_id', clientId)
    .maybeSingle()
  if (!doc) return res.status(404).json({ error: 'Document not found.' })
  if (!doc.storage_path) return res.status(404).json({ error: 'No file has been uploaded for this document.' })

  const { data: signed, error } = await db.storage.from('documents').createSignedUrl(doc.storage_path, 300)
  if (error || !signed?.signedUrl) return res.status(500).json({ error: 'Could not create a link for this document.' })

  await logAdviserActivity({
    clientId, actorId: ctx.user.id,
    action: 'adviser.document_viewed', resourceType: 'documents',
    resourceId: doc.id, resourceName: doc.name,
    metadata: { firm_id: client.firm?.id, firm_name: client.firm?.firm_name },
  })

  return res.status(200).json({ url: signed.signedUrl, expiresIn: 300, mimeType: doc.mime_type || null })
}

export default withSentry(handler)
