// POST /api/account/link-address
//
// Proves that an address belongs to the signed-in person, and records it.
//
// An organisation addresses everything to an email, and every rule that decides
// whether something is yours compares that email to the one on your account.
// For an employer those two are almost never the same: HR holds a work address,
// and a personal vault is something people sign up for with a personal one.
// Rather than ask people to keep two accounts, or key a lifelong vault to an
// address they lose on their last day, an account can hold several addresses
// once each has been proved.
//
// Proof is always a code sent to the address itself. Nothing here trusts a
// typed address, a link, or a claim: holding the link is how you learn an
// address is waiting for you, and reading the inbox is how you prove it is
// yours. That distinction is the whole security of the feature, because a
// registered address quietly receives everything sent to it afterwards.
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { withSentry, captureException } from '../_lib/sentry.js'
import { rateLimited, emailKey } from '../_lib/rate-limit.js'
import { hashCode, codeMatches } from '../_lib/mfa-crypto.js'
import { sendAddressCodeEmail } from '../_lib/adviser-email.js'

const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const UUID       = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_TTL_MIN  = 10
const MAX_ATTEMPTS  = 5
const sixDigits = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')

// Either the caller names the address, or the caller holds a link that knows
// it. The link route never reveals the address, so a forwarded email cannot
// teach a stranger where the code is going.
async function addressFor(body) {
  const token = String(body?.token || '').trim()
  if (token) {
    if (!UUID.test(token)) return { error: 'That link is not valid.' }
    const { data } = await db.from('adviser_document_requests')
      .select('recipient_email, sender_name, adviser_id')
      .eq('claim_token', token).maybeSingle()
    if (!data?.recipient_email) return { error: 'That link is not valid.' }
    return { email: String(data.recipient_email).toLowerCase(), firmName: data.sender_name }
  }
  const email = String(body?.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' }
  return { email, firmName: null }
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user }, error: authError } = await db.auth.getUser(bearer)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const action = req.body?.action
  if (!['send-code', 'verify'].includes(action)) return res.status(400).json({ error: 'Unknown action.' })

  const found = await addressFor(req.body)
  if (found.error) return res.status(400).json({ error: found.error })

  // Keyed on the caller, not their IP. This is reachable from the apps now, and
  // phones share a carrier NAT: eight code sends per quarter-hour pooled across
  // everyone on one mobile network is a limit that would start refusing people
  // who had done nothing. One account asking eight times is the real signal.
  if (await rateLimited(req, `link-address-${action}`, { key: emailKey(user.email || user.id), max: action === 'send-code' ? 8 : 20, windowMinutes: 15 })) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in a few minutes.' })
  }
  const { email, firmName } = found

  if (email === String(user.email || '').toLowerCase()) {
    return res.status(200).json({ alreadyYours: true, email })
  }

  // Somebody else's sign-in address is never available to claim, whatever the
  // inbox says. Addresses move between people; accounts do not.
  const { data: owner } = await db.from('profiles').select('id').ilike('email', email).maybeSingle()
  if (owner && owner.id !== user.id) {
    return res.status(409).json({ error: 'That address is already the sign-in address for another Everstead account.' })
  }

  try {
    if (action === 'send-code') {
      const code = sixDigits()
      const { error: upErr } = await db.from('email_verifications').upsert({
        user_id: user.id,
        email,
        code_hash: hashCode(code, email),
        expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
        attempts: 0,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,email' })
      if (upErr) throw upErr

      const { data: profile } = await db.from('profiles').select('language').eq('id', user.id).maybeSingle()
      const sent = await sendAddressCodeEmail({
        to: email,
        lang: profile?.language === 'fr' ? 'fr' : 'en',
        firmName,
        code,
      })
      if (!sent) return res.status(502).json({ error: 'Could not send the code. Please try again shortly.' })
      return res.status(200).json({ ok: true, expiresInMinutes: CODE_TTL_MIN })
    }

    // verify
    const code = String(req.body?.code || '').replace(/\D/g, '')
    const { data: row } = await db.from('email_verifications')
      .select('code_hash, expires_at, attempts')
      .eq('user_id', user.id).eq('email', email).maybeSingle()
    if (!row) return res.status(404).json({ error: 'Ask for a new code.' })
    if (new Date(row.expires_at) < new Date()) {
      await db.from('email_verifications').delete().eq('user_id', user.id).eq('email', email)
      return res.status(410).json({ error: 'That code has expired. Ask for a new one.' })
    }
    if ((row.attempts || 0) >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many wrong codes. Ask for a new one.' })
    }
    if (!codeMatches(code, row.code_hash, email)) {
      const left = MAX_ATTEMPTS - (row.attempts || 0) - 1
      await db.from('email_verifications')
        .update({ attempts: (row.attempts || 0) + 1 })
        .eq('user_id', user.id).eq('email', email)
      return res.status(400).json({ error: left > 0 ? `That code is not right. ${left} more ${left === 1 ? 'try' : 'tries'}.` : 'That code is not right. Ask for a new one.' })
    }

    const { error: regErr } = await db.rpc('register_verified_email', {
      p_user_id: user.id, p_email: email, p_source: req.body?.token ? 'request_link' : 'settings',
    })
    if (regErr) throw regErr
    await db.from('email_verifications').delete().eq('user_id', user.id).eq('email', email)

    await db.from('activity_log').insert({
      user_id: user.id, actor_id: user.id,
      action: 'account.address_verified', resource_type: 'member_emails',
      resource_id: null, resource_name: email,
      metadata: { source: req.body?.token ? 'request_link' : 'settings' },
    }).select('id').maybeSingle()

    return res.status(200).json({ ok: true, email })
  } catch (err) {
    console.error('[account/link-address]', err)
    captureException(err, { endpoint: 'account/link-address' })
    return res.status(500).json({ error: 'Could not do that just now.' })
  }
}

export default withSentry(handler)
