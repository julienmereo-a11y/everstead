import crypto from 'node:crypto'

// At-rest protection for the short-lived mfa_pending rows.
//
// The sign-in flow verifies the password first and the emailed code second, so
// between those two steps there has to be somewhere to keep the half-finished
// session. That row used to hold a live access token, a live refresh token and
// the code itself, all in plain text. A database dump alone was therefore enough
// to take over any account with a pending row, and because expired rows were
// never swept, rows outlived their ten-minute window by months.
//
// Now the tokens are sealed with AES-256-GCM and the code is stored as an HMAC,
// so a leaked row is inert on its own.
//
// The key is derived from SUPABASE_SERVICE_ROLE_KEY rather than a new secret, on
// purpose. The threat being closed is a database leak WITHOUT the environment:
// anyone holding the service role key can already mint a session for any user,
// so deriving from it gives up nothing and means the protection is live the
// moment this deploys, with nothing for anyone to remember to configure. Set
// MFA_PENDING_KEY to separate them if you ever want independent rotation.

const SECRET = process.env.MFA_PENDING_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || ''

const key = (purpose) =>
  crypto.hkdfSync('sha256', Buffer.from(SECRET, 'utf8'), Buffer.alloc(0),
                  Buffer.from(`everstead:mfa-pending:${purpose}:v1`, 'utf8'), 32)

const PREFIX = 'v1'

/** Seal a token for storage. Returns plain text unchanged if no secret is set. */
export function sealToken(plain) {
  if (!SECRET || !plain) return plain
  const iv = crypto.randomBytes(12)
  const c  = crypto.createCipheriv('aes-256-gcm', key('token'), iv)
  const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()])
  return [PREFIX, iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join(':')
}

/**
 * Open a sealed token.
 *
 * Rows written by the previous deploy hold plain text and have no prefix, so
 * they are returned as-is. That keeps anyone who asked for a code seconds before
 * this shipped from being locked out mid-sign-in. Once no such row can still be
 * inside its ten-minute window, the fallback can go.
 */
export function openToken(stored) {
  if (!stored || typeof stored !== 'string') return stored
  const parts = stored.split(':')
  if (parts[0] !== PREFIX || parts.length !== 4) return stored // legacy plaintext
  try {
    const [, iv, tag, ct] = parts
    const d = crypto.createDecipheriv('aes-256-gcm', key('token'), Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8')
  } catch {
    return null // tampered, or written under a different key
  }
}

/** Store the code as an HMAC, bound to the address it was sent to. */
export function hashCode(code, email) {
  if (!SECRET) return String(code)
  return crypto.createHmac('sha256', key('code'))
    .update(`${String(email).trim().toLowerCase()}:${String(code)}`)
    .digest('hex')
}

/** Constant-time check, accepting legacy plaintext rows for the same reason as above. */
export function codeMatches(submitted, stored, email) {
  if (!stored) return false
  const eq = (a, b) => {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b))
    return x.length === y.length && crypto.timingSafeEqual(x, y)
  }
  if (eq(hashCode(submitted, email), stored)) return true
  return stored.length <= 12 && eq(submitted, stored) // legacy plaintext row
}
