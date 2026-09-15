// POST /api/org/request
//
// An organisation asks one person for one document, for a stated length of
// time. The counterpart of /api/org/deliver, and the employer half of the
// onboarding flow: ID, proof of address, a certificate, without a scan sitting
// in an inbox forever.
//
//   { action: 'create', orgId, recipientEmail, docType, note, expiresDays }
//   { action: 'remind', requestId }
//   { action: 'cancel', requestId }
//
// The recipient does not have to be a linked client, or to have an account at
// all: the row carries the address, and the member reads it by auth.email()
// once they sign up. Answering it (fulfil_document_request) is what creates the
// scoped share, so nothing here grants anybody anything.
import { withSentry } from '../_lib/sentry.js'
import { rateLimited } from '../_lib/rate-limit.js'
import { db, requireAdviser, isUuid } from '../_lib/adviser-access.js'
import { sendOrgRequestEmail } from '../_lib/adviser-email.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_DAYS = [7, 14, 30, 60, 90]

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await requireAdviser(req)
  if (!ctx) return res.status(403).json({ error: 'Only an organisation can ask for a document.' })

  if (await rateLimited(req, 'org-request', { max: 60, windowMinutes: 10 })) {
    return res.status(429).json({ error: 'Too many requests in a short time. Please wait a few minutes.' })
  }

  const action = req.body?.action || 'create'

  // ── Create ────────────────────────────────────────────────────────────────
  if (action === 'create') {
    const orgId          = String(req.body?.orgId || '').trim()
    const recipientEmail = String(req.body?.recipientEmail || '').trim().toLowerCase()
    const docType        = String(req.body?.docType || '').trim().slice(0, 120)
    const note           = String(req.body?.note || '').trim().slice(0, 500) || null
    const raw            = req.body?.expiresDays
    const expiresDays    = raw === null || raw === undefined || raw === '' ? null
                           : (ALLOWED_DAYS.includes(Number(raw)) ? Number(raw) : null)

    if (!isUuid(orgId) || !ctx.firmIds.includes(orgId)) return res.status(403).json({ error: 'You are not a member of that organisation.' })
    if (!EMAIL_RE.test(recipientEmail)) return res.status(400).json({ error: 'A valid email address is required.' })
    if (!docType) return res.status(400).json({ error: 'Say what you are asking for.' })
    if (raw !== null && raw !== undefined && raw !== '' && expiresDays === null) {
      return res.status(400).json({ error: 'Choose one of the offered lengths of access.' })
    }

    const { data: org } = await db.from('advisers').select('id, firm_name').eq('id', orgId).maybeSingle()
    if (!org) return res.status(404).json({ error: 'Organisation not found.' })

    const { data: recipient } = await db.from('profiles').select('id, language').ilike('email', recipientEmail).maybeSingle()

    // One open ask per person per thing, so a re-send is a reminder.
    const { data: existing } = await db.from('adviser_document_requests')
      .select('id').eq('adviser_id', orgId).eq('recipient_email', recipientEmail)
      .eq('doc_type', docType).eq('status', 'requested').maybeSingle()
    if (existing) return res.status(409).json({ error: 'You already have an open request to that person for that document.', requestId: existing.id })

    const { data: row, error } = await db.from('adviser_document_requests').insert({
      adviser_id: orgId,
      client_id: recipient?.id ?? null,
      recipient_email: recipientEmail,
      requested_by: ctx.user.id,
      sender_name: org.firm_name,
      doc_type: docType,
      note,
      expires_days: expiresDays,
    }).select('*').single()
    if (error || !row) {
      console.error('[org/request] insert failed:', error)
      return res.status(500).json({ error: 'Could not save the request.' })
    }

    const emailed = await sendOrgRequestEmail({
      to: recipientEmail,
      lang: recipient?.language === 'fr' ? 'fr' : 'en',
      firmName: org.firm_name, docType, note, expiresDays, hasAccount: !!recipient,
    })
    return res.status(200).json({ request: row, emailed, hasAccount: !!recipient })
  }

  // ── Remind / cancel ───────────────────────────────────────────────────────
  const requestId = String(req.body?.requestId || '')
  if (!isUuid(requestId)) return res.status(400).json({ error: 'Missing request id.' })

  const { data: row } = await db.from('adviser_document_requests').select('*').eq('id', requestId).maybeSingle()
  if (!row || !ctx.firmIds.includes(row.adviser_id)) return res.status(404).json({ error: 'Request not found.' })
  if (row.status !== 'requested') return res.status(409).json({ error: 'That request has already been answered.' })

  if (action === 'cancel') {
    const { data: updated } = await db.from('adviser_document_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId).select('id, status').single()
    return res.status(200).json({ request: updated })
  }

  if (action === 'remind') {
    const { data: recipient } = await db.from('profiles').select('language').ilike('email', row.recipient_email || '').maybeSingle()
    const { data: org } = await db.from('advisers').select('firm_name').eq('id', row.adviser_id).maybeSingle()
    const emailed = await sendOrgRequestEmail({
      to: row.recipient_email,
      lang: recipient?.language === 'fr' ? 'fr' : 'en',
      firmName: org?.firm_name || row.sender_name, docType: row.doc_type, note: row.note,
      expiresDays: row.expires_days, hasAccount: !!recipient, reminder: true,
    })
    const { data: updated } = await db.from('adviser_document_requests')
      .update({ reminded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', requestId).select('*').single()
    return res.status(200).json({ request: updated || row, emailed })
  }

  return res.status(400).json({ error: 'Unknown action.' })
}

export default withSentry(handler)
