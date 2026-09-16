import crypto from 'node:crypto'
import { withSentry } from '../_lib/sentry.js'
import { rateLimited } from '../_lib/rate-limit.js'
import { db, requireAdviser, isUuid, logAdviserActivity } from '../_lib/adviser-access.js'
import { sendDeliveryEmail } from '../_lib/adviser-email.js'
import { autoFileAllowed, fileDeliveryIntoVault } from '../_lib/deliveries.js'

// Organisation-facing: send one document to a person's own vault.
//
// The file is already in the private `deliveries` staging bucket (the caller
// uploaded it with their own session; storage RLS pins the first path segment
// to their organisation). This endpoint only creates the row and sends the
// notice. Nothing reaches the recipient's vault until they accept, which is
// what /api/org/delivery-respond does.
//
// Two gates, both deliberate:
//   • advisers.can_deliver must be true. Pushing a file into a stranger's vault
//     by email address is the shape of a phishing campaign, so an organisation
//     cannot do it until a human has verified its domain.
//   • the storage path must sit under the caller's own organisation id.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOC_TYPES = ['Legal', 'Finance', 'Insurance', 'Property', 'Personal', 'Medical', 'Other']

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await requireAdviser(req)
  if (!ctx) return res.status(403).json({ error: 'Only an organisation can send a document.' })

  if (await rateLimited(req, 'org-deliver', { max: 60, windowMinutes: 10 })) {
    return res.status(429).json({ error: 'Too many sends in a short time. Please wait a few minutes.' })
  }

  const orgId          = String(req.body?.orgId || '').trim()
  const recipientEmail = String(req.body?.recipientEmail || '').trim().toLowerCase()
  const title          = String(req.body?.title || '').trim().slice(0, 160)
  const note           = String(req.body?.note || '').trim().slice(0, 500) || null
  const storagePath    = String(req.body?.storagePath || '').trim()
  const mimeType       = String(req.body?.mimeType || '').trim().slice(0, 120) || null
  const fileSize       = Number.isFinite(req.body?.fileSize) ? Math.max(0, Math.trunc(req.body.fileSize)) : null
  const docType        = DOC_TYPES.includes(req.body?.docType) ? req.body.docType : 'Other'

  if (!isUuid(orgId) || !ctx.firmIds.includes(orgId)) return res.status(403).json({ error: 'You are not a member of that organisation.' })
  if (!EMAIL_RE.test(recipientEmail)) return res.status(400).json({ error: 'A valid recipient email address is required.' })
  if (!title) return res.status(400).json({ error: 'Give the document a name the recipient will recognise.' })
  if (!storagePath || !storagePath.startsWith(`${orgId}/`) || storagePath.includes('..')) {
    return res.status(400).json({ error: 'That file does not belong to your organisation.' })
  }

  const { data: org } = await db
    .from('advisers')
    .select('id, firm_name, can_deliver, status')
    .eq('id', orgId)
    .maybeSingle()
  if (!org) return res.status(404).json({ error: 'Organisation not found.' })
  if (!org.can_deliver) {
    return res.status(403).json({ error: 'Your organisation is not verified for sending yet. Contact hello@everstead.care.' })
  }

  // The object must actually exist, or the recipient gets an inbox item that
  // fails on accept.
  const folder = storagePath.slice(0, storagePath.lastIndexOf('/'))
  const file   = storagePath.slice(storagePath.lastIndexOf('/') + 1)
  const { data: listed } = await db.storage.from('deliveries').list(folder, { search: file, limit: 1 })
  if (!listed?.length) return res.status(400).json({ error: 'The uploaded file could not be found. Please try the upload again.' })

  // A recipient who already has an account gets it in their dashboard; one who
  // does not gets a claim link that opens a free account first.
  const { data: recipient } = await db
    .from('profiles')
    .select('id, language')
    .ilike('email', recipientEmail)
    .maybeSingle()

  const claimToken = recipient ? null : crypto.randomBytes(32).toString('base64url')

  const { data: row, error } = await db
    .from('inbound_deliveries')
    .insert({
      org_id: orgId,
      member_id: recipient?.id ?? null,
      recipient_email: recipientEmail,
      title,
      doc_type: docType,
      note,
      storage_path: storagePath,
      mime_type: mimeType,
      file_size: fileSize,
      sent_by: ctx.user.id,
      sender_name: org.firm_name,
      claim_token: claimToken,
    })
    .select('*')
    .single()
  if (error || !row) {
    console.error('[org/deliver] insert failed:', error)
    return res.status(500).json({ error: 'Could not record the delivery.' })
  }

  // One accept per organisation, ever. Someone who accepted this organisation
  // before is not asked again: the document goes straight in, the way a payslip
  // lands in a coffre-fort. The first one still waits for them, because that
  // accept is the consent, and without it any verified organisation could drop
  // files into a stranger's vault.
  let filed = false
  if (recipient?.id && await autoFileAllowed(db, recipient.id, orgId)) {
    const { error: fileErr, documentId } = await fileDeliveryIntoVault(db, row, recipient.id)
    if (fileErr) {
      console.error('[org/deliver] auto-file failed, leaving it to be accepted:', fileErr)
    } else {
      filed = true
      await db.from('activity_log').insert({
        user_id: recipient.id, actor_id: recipient.id,
        action: 'document.delivered_filed', resource_type: 'documents',
        resource_id: documentId, resource_name: title,
        metadata: { org_id: orgId, delivery_id: row.id, automatic: true },
      })
    }
  }

  const emailed = await sendDeliveryEmail({
    to: recipientEmail,
    lang: recipient?.language === 'fr' ? 'fr' : 'en',
    firmName: org.firm_name,
    title,
    note,
    claimToken,
    filed,
  })

  if (recipient?.id) {
    await logAdviserActivity({
      clientId: recipient.id,
      actorId: ctx.user.id,
      action: 'org.document_delivered',
      resourceType: 'inbound_deliveries',
      resourceId: row.id,
      resourceName: title,
      metadata: { firm_id: orgId, firm_name: org.firm_name },
    })
  }

  // claim_token never leaves the server: it is the capability that binds the
  // delivery to whoever opens the link.
  const { claim_token: _omit, ...safe } = row
  return res.status(200).json({ delivery: { ...safe, status: filed ? 'accepted' : safe.status }, emailed, hasAccount: !!recipient, filed })
}

export default withSentry(handler)
