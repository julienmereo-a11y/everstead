import { timingSafeEqual } from 'node:crypto'

/**
 * Compare an Authorization header against a shared bearer secret.
 *
 * The obvious form, `authHeader !== \`Bearer ${process.env.SECRET}\``, fails
 * OPEN when the variable is missing: the expected value becomes the literal
 * string "Bearer undefined", which anyone can send. That is the wrong way for a
 * misconfiguration to fail on endpoints that email every member we have, so a
 * missing secret is refused outright.
 *
 * Returns true when the caller is authorised.
 */
export function bearerMatches(authHeader, secret) {
  if (!secret || typeof secret !== 'string') return false
  const given = typeof authHeader === 'string' ? authHeader : ''
  const expected = `Bearer ${secret}`
  // Length is not secret; comparing unequal-length buffers throws.
  if (given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}
