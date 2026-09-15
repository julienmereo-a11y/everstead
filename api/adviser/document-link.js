import { withSentry } from '../_lib/sentry.js'
import { db, requireAdviser, loadConnectedMember, orgCanReadDocument, isUuid, logAdviserActivity } from '../_lib/adviser-access.js'

// Organisation-facing: a short-lived signed URL for ONE document the member has
// chosen to share. The `documents` bucket is owner-read-only under RLS, so the
// portal cannot sign URLs itself; this endpoint does it with the service role
// after two checks.
//
// The link check now reads member_connections rather than profiles.adviser_id,
// so it answers for employers too. The access check is org_can_read_document:
// either the member consented to the whole documents section (professional
// firms only) or there is a live, unexpired share for this one document. An
// employer can only ever satisfy the second, and a share that has lapsed stops
// working here without anything having to be cleaned up.
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ctx = await requireAdviser(req)
  if (!ctx) return res.status(403).json({ error: 'Only advisers can open client documents.' })

  const { clientId, documentId } = req.body || {}
  if (!isUuid(clientId) || !isUuid(documentId)) return res.status(400).json({ error: 'Missing client or document id.' })

  const link = await loadConnectedMember(clientId, ctx.firmIds)
  if (!link) return res.status(403).json({ error: 'This person is not connected to your organisation.' })
  if (!(await orgCanReadDocument(link.orgId, clientId, documentId))) {
    return res.status(403).json({ error: 'This document is not shared with your organisation, or the share has expired.' })
  }

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
    metadata: { firm_id: link.orgId, org_kind: link.kind },
  })

  return res.status(200).json({ url: signed.signedUrl, expiresIn: 300, mimeType: doc.mime_type || null })
}

export default withSentry(handler)
