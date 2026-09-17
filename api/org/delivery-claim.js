// POST /api/org/delivery-claim
//
// The claim link is no longer the whole capability. A recipient who follows it
// gets a one-time code at the address the organisation addressed the delivery
// to, and only that pair opens anything. A forwarded link carries the token but
// not the code.
//
//   { action: 'send-code', token }         → emails a six-digit code
//   { action: 'verify',    token, code }   → opens a ten-minute window
//   { action: 'download',  token }         → signed URL, no account needed
//   { action: 'decline',   token }         → clears the staged file
//
// 'download' is a first-class outcome, not a failed signup. Someone receiving a
// contract from an employer they have not started with yet should be able to
// take it and leave; the vault is offered afterwards on the page.
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../_lib/sentry.js'
import { rateLimited, emailKey } from '../_lib/rate-limit.js'
import { hashCode, codeMatches } from '../_lib/mfa-crypto.js'
import { sendClaimCodeEmail } from '../_lib/adviser-email.js'

const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CODE_TTL_MIN     = 10
const VERIFIED_TTL_MIN = 15
const MAX_ATTEMPTS     = 5
const LINK_TTL_SEC     = 300

const sixDigits = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
const minutesAgo = (iso, n) => !!iso && (Date.now() - new Date(iso).getTime()) < n * 60_000
const expired = (d) => d.expires_at && new Date(d.expires_at) < new Date()

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, token } = req.body || {}
  if (typeof token !== 'string' || token.length < 20) return res.status(400).json({ error: 'Missing link.' })
  if (!['send-code', 'verify', 'download', 'decline'].includes(action)) return res.status(400).json({ error: 'Unknown action.' })

  // Public and unauthenticated: throttle hard, and separately per action so a
  // burst of guesses cannot also exhaust someone else's ability to send a code.
  //
  // Keyed on the LINK, not the caller's IP. This is opened from an email on a
  // phone, which reaches us through a carrier NAT shared by thousands, so an IP
  // limit tight enough to matter would refuse people who had done nothing.
  // One token asking for six codes in a quarter-hour is the real signal, and a
  // token is 32 random bytes, so nobody is spraying across many of them.
  // Guessing the code itself is already bounded per row by claim_attempts.
  if (await rateLimited(req, `delivery-claim-${action}`, { key: emailKey(token), max: action === 'verify' ? 12 : 6, windowMinutes: 15 })) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' })
  }

  const { data: d } = await db.from('inbound_deliveries').select('*').eq('claim_token', token).maybeSingle()
  if (!d) return res.status(404).json({ error: 'This link is no longer valid.' })
  // A downloaded delivery is still open for downloading again: the staged
  // object is kept until expiry for exactly that, and a signed URL lasts five
  // minutes on whatever connection a phone happens to have. It is closed to
  // declining, which makes no sense once the file has been taken. Anything
  // accepted, declined or expired is finished.
  const open = d.status === 'sent' || (d.status === 'downloaded' && action !== 'decline')
  if (!open) return res.status(409).json({ error: 'This one has already been answered.', status: d.status })
  if (expired(d)) {
    await db.from('inbound_deliveries').update({ status: 'expired' }).eq('id', d.id)
    await db.storage.from('deliveries').remove([d.storage_path]).catch(() => {})
    return res.status(410).json({ error: 'This delivery has expired. Ask the sender to send it again.' })
  }

  // ── Send the code ─────────────────────────────────────────────────────────
  if (action === 'send-code') {
    const code = sixDigits()
    const { error } = await db.from('inbound_deliveries').update({
      claim_code_hash: hashCode(code, d.recipient_email),
      claim_code_expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
      claim_code_sent_at: new Date().toISOString(),
      claim_attempts: 0,
      claim_verified_at: null,
    }).eq('id', d.id)
    if (error) return res.status(500).json({ error: 'Could not send a code. Please try again.' })

    const { data: claimantId } = await db.rpc('resolve_member_by_email', { p_email: d.recipient_email })
    const { data: profile } = claimantId
      ? await db.from('profiles').select('language').eq('id', claimantId).maybeSingle()
      : { data: null }
    const sent = await sendClaimCodeEmail({
      to: d.recipient_email,
      lang: profile?.language === 'fr' ? 'fr' : 'en',
      firmName: d.sender_name, code,
    })
    // Always 200: whether the address exists is not this endpoint's to reveal.
    return res.status(200).json({ ok: true, delivered: sent, expiresInMinutes: CODE_TTL_MIN })
  }

  // ── Check the code ────────────────────────────────────────────────────────
  if (action === 'verify') {
    const code = String(req.body?.code || '').replace(/\D/g, '')
    if (code.length !== 6) return res.status(400).json({ error: 'Enter the six-digit code.' })
    if (!d.claim_code_hash || !d.claim_code_expires_at || new Date(d.claim_code_expires_at) < new Date()) {
      return res.status(410).json({ error: 'That code has expired. Ask for a new one.' })
    }
    if ((d.claim_attempts || 0) >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many wrong codes. Ask for a new one.' })
    }
    if (!codeMatches(code, d.claim_code_hash, d.recipient_email)) {
      await db.from('inbound_deliveries').update({ claim_attempts: (d.claim_attempts || 0) + 1 }).eq('id', d.id)
      const left = MAX_ATTEMPTS - (d.claim_attempts || 0) - 1
      return res.status(400).json({ error: left > 0 ? 'That code is not right.' : 'That code is not right. Ask for a new one.', attemptsLeft: Math.max(0, left) })
    }
    await db.from('inbound_deliveries').update({
      claim_verified_at: new Date().toISOString(), claim_attempts: 0, claim_code_hash: null,
    }).eq('id', d.id)
    return res.status(200).json({ ok: true, verifiedForMinutes: VERIFIED_TTL_MIN })
  }

  // Both remaining actions need a fresh verification.
  if (!minutesAgo(d.claim_verified_at, VERIFIED_TTL_MIN)) {
    return res.status(403).json({ error: 'Confirm the code again to continue.', needsCode: true })
  }

  // ── Take it, with no account ──────────────────────────────────────────────
  if (action === 'download') {
    try {
      const { data: signed, error } = await db.storage
        .from('deliveries').createSignedUrl(d.storage_path, LINK_TTL_SEC, { download: d.title })
      if (error || !signed?.signedUrl) return res.status(502).json({ error: 'The file could not be opened. Ask the sender to send it again.' })

      // The staged object stays until the delivery expires, so the recipient can
      // come back to the same link within the window. The expiry cron clears it.
      await db.from('inbound_deliveries').update({
        status: 'downloaded', downloaded_at: new Date().toISOString(), responded_at: new Date().toISOString(),
      }).eq('id', d.id)

      return res.status(200).json({ url: signed.signedUrl, expiresIn: LINK_TTL_SEC })
    } catch (err) {
      captureException(err, { endpoint: 'org/delivery-claim', stage: 'download' })
      return res.status(500).json({ error: 'Could not open this document. Please try again.' })
    }
  }

  // ── Decline ───────────────────────────────────────────────────────────────
  await db.from('inbound_deliveries').update({
    status: 'declined', responded_at: new Date().toISOString(), claim_token: null,
  }).eq('id', d.id)
  await db.storage.from('deliveries').remove([d.storage_path]).catch(() => {})
  return res.status(200).json({ ok: true })
}

export default withSentry(handler)
