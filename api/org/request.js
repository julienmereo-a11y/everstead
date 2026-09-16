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
import crypto from 'node:crypto'
import { withSentry } from '../_lib/sentry.js'
import { rateLimited } from '../_lib/rate-limit.js'
import { db, requireAdviser, isUuid } from '../_lib/adviser-access.js'
import { sendOrgRequestEmail } from '../_lib/adviser-email.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_DAYS = [7, 14, 30, 60, 90]
const MAX_RECIPIENTS = 250
const MAX_ITEMS = 8

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await requireAdviser(req)
  if (!ctx) return res.status(403).json({ error: 'Only an organisation can ask for a document.' })

  if (await rateLimited(req, 'org-request', { max: 60, windowMinutes: 10 })) {
    return res.status(429).json({ error: 'Too many requests in a short time. Please wait a few minutes.' })
  }

  const action = req.body?.action || 'create'

  // ── Create ────────────────────────────────────────────────────────────────
  // One or many people, one or many items. Several items asked together share a
  // pack_id and arrive as one email, because four separate emails for one new
  // joiner is how a reasonable ask starts to feel like harassment. They stay
  // four independent requests underneath: answered, declined and expired one at
  // a time, each granting its own scoped share.
  if (action === 'create') {
    const orgId = String(req.body?.orgId || '').trim()
    const rawList = Array.isArray(req.body?.recipientEmails) ? req.body.recipientEmails : [req.body?.recipientEmail]
    const recipients = [...new Set(rawList.map(x => String(x || '').trim().toLowerCase()).filter(Boolean))]
    const rawItems = Array.isArray(req.body?.docTypes) ? req.body.docTypes : [req.body?.docType]
    const items = [...new Set(rawItems.map(x => String(x || '').trim().slice(0, 120)).filter(Boolean))]
    const packName = String(req.body?.packName || '').trim().slice(0, 80) || null
    const note = String(req.body?.note || '').trim().slice(0, 500) || null
    const raw = req.body?.expiresDays
    const expiresDays = raw === null || raw === undefined || raw === ''
      ? null
      : (ALLOWED_DAYS.includes(Number(raw)) ? Number(raw) : null)

    if (!isUuid(orgId) || !ctx.firmIds.includes(orgId)) return res.status(403).json({ error: 'You are not a member of that organisation.' })
    if (!recipients.length) return res.status(400).json({ error: 'A valid email address is required.' })
    if (recipients.length > MAX_RECIPIENTS) return res.status(400).json({ error: `That is more than ${MAX_RECIPIENTS} addresses. Split it into smaller batches.` })
    if (!items.length) return res.status(400).json({ error: 'Say what you are asking for.' })
    if (items.length > MAX_ITEMS) return res.status(400).json({ error: `A pack can hold up to ${MAX_ITEMS} items.` })
    if (raw !== null && raw !== undefined && raw !== '' && expiresDays === null) {
      return res.status(400).json({ error: 'Choose one of the offered lengths of access.' })
    }

    const { data: org } = await db.from('advisers').select('id, firm_name').eq('id', orgId).maybeSingle()
    if (!org) return res.status(404).json({ error: 'Organisation not found.' })

    const results = []
    for (const recipientEmail of recipients) {
      if (!EMAIL_RE.test(recipientEmail)) { results.push({ email: recipientEmail, ok: false, reason: 'not an email address' }); continue }
      try {
        // Who this address resolves to, which includes an address somebody has
        // proved is theirs even though they sign in with another one. An
        // employer holds work addresses and people sign up with personal ones,
        // so a plain profiles lookup answers "no account" for most employees.
        const { data: recipientId } = await db.rpc('resolve_member_by_email', { p_email: recipientEmail })
        const { data: recipient } = recipientId
          ? await db.from('profiles').select('id, language').eq('id', recipientId).maybeSingle()
          : { data: null }

        // One open ask per person per thing, so re-sending is a reminder rather
        // than a second card in their dashboard.
        const { data: existing } = await db.from('adviser_document_requests')
          .select('doc_type').eq('adviser_id', orgId).eq('recipient_email', recipientEmail)
          .eq('status', 'requested').in('doc_type', items)
        const already = new Set((existing || []).map(x => x.doc_type))
        const toAsk = items.filter(i => !already.has(i))
        if (!toAsk.length) { results.push({ email: recipientEmail, ok: false, reason: 'already asked for all of that' }); continue }

        const packId = toAsk.length > 1 ? crypto.randomUUID() : null
        const rows = toAsk.map(docType => ({
          adviser_id: orgId,
          client_id: recipient?.id ?? null,
          recipient_email: recipientEmail,
          requested_by: ctx.user.id,
          sender_name: org.firm_name,
          doc_type: docType,
          note, expires_days: expiresDays,
          pack_id: packId,
          pack_name: packId ? (packName || 'Documents we need') : null,
        }))
        const { data: inserted, error } = await db.from('adviser_document_requests')
          .insert(rows).select('claim_token')
        if (error) {
          console.error('[org/request] insert failed:', error)
          results.push({ email: recipientEmail, ok: false, reason: 'could not save it' })
          continue
        }

        // One email per person, listing everything asked of them.
        const emailed = await sendOrgRequestEmail({
          to: recipientEmail,
          lang: recipient?.language === 'fr' ? 'fr' : 'en',
          firmName: org.firm_name,
          docTypes: toAsk, note, expiresDays,
          hasAccount: !!recipient,
          packName: packId ? (packName || null) : null,
          claimToken: inserted?.[0]?.claim_token || null,
        })
        results.push({ email: recipientEmail, ok: true, asked: toAsk.length, skipped: items.length - toAsk.length, emailed })
      } catch (err) {
        console.error('[org/request] recipient failed:', recipientEmail, err?.message)
        results.push({ email: recipientEmail, ok: false, reason: 'something went wrong' })
      }
    }

    const sent = results.filter(r => r.ok).length
    if (!sent) return res.status(409).json({ error: 'Nothing was asked. They may already have an open request for all of it.', results })
    return res.status(200).json({ sent, failed: results.length - sent, results })
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
    const { data: remindId } = await db.rpc('resolve_member_by_email', { p_email: row.recipient_email || '' })
    const { data: recipient } = remindId
      ? await db.from('profiles').select('language').eq('id', remindId).maybeSingle()
      : { data: null }
    const { data: org } = await db.from('advisers').select('firm_name').eq('id', row.adviser_id).maybeSingle()
    const emailed = await sendOrgRequestEmail({
      to: row.recipient_email,
      lang: recipient?.language === 'fr' ? 'fr' : 'en',
      firmName: org?.firm_name || row.sender_name, docType: row.doc_type, note: row.note,
      expiresDays: row.expires_days, hasAccount: !!recipient, reminder: true,
      claimToken: row.claim_token || null,
    })
    const { data: updated } = await db.from('adviser_document_requests')
      .update({
        reminded_at: new Date().toISOString(),
        // Counts towards the automatic ceiling: a nudge is a nudge whether a
        // person pressed the button or the cron did.
        reminder_count: (row.reminder_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId).select('*').single()
    return res.status(200).json({ request: updated || row, emailed })
  }

  return res.status(400).json({ error: 'Unknown action.' })
}

export default withSentry(handler)
