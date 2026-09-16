import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Service-role client — rate_limit_log is server-only (RLS deny-all for clients).
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

/**
 * A rate-limit subject derived from an email address rather than an IP.
 *
 * Hashed, because rate_limit_log is a long-lived table and a customer's email
 * address has no business sitting in it. The hash is stable, so the count still
 * works, and it is meaningless to anyone reading the rows.
 */
export function emailKey(email) {
  const norm = String(email ?? '').trim().toLowerCase()
  return 'e:' + createHash('sha256').update(norm).digest('hex').slice(0, 32)
}

// Sliding-window rate limit backed by rate_limit_log (the same table + pattern as
// api/auth/delegate-register.js). Returns true if the caller is over the limit.
// Fails OPEN on a DB error so a logging blip never blocks a legitimate request.
//
// `key` overrides the default per-IP subject. Reach for it on anything the
// mobile apps call: phone traffic arrives through carrier-grade NAT, where
// thousands of subscribers share one public address, so a per-IP limit tight
// enough to be worth having will eventually refuse people who have done
// nothing. Keying on the account is both NAT-proof and usually the more
// accurate control anyway.
export async function rateLimited(req, endpoint, { max = 5, windowMinutes = 15, key } = {}) {
  const subject = key || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { count, error } = await db
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip', subject)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  if (error) return false // fail open
  if ((count ?? 0) >= max) return true

  // NB: a PostgREST builder is a thenable, not a real Promise — no .catch(). Use try/catch.
  try { await db.from('rate_limit_log').insert({ ip: subject, endpoint }) } catch { /* non-fatal */ }
  return false
}
