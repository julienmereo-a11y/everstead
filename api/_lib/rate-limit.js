import { createClient } from '@supabase/supabase-js'

// Service-role client — rate_limit_log is server-only (RLS deny-all for clients).
const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Sliding-window IP rate limit backed by rate_limit_log (the same table + pattern as
// api/auth/delegate-register.js). Returns true if the caller is over the limit.
// Fails OPEN on a DB error so a logging blip never blocks a legitimate request.
export async function rateLimited(req, endpoint, { max = 5, windowMinutes = 15 } = {}) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { count, error } = await db
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  if (error) return false // fail open
  if ((count ?? 0) >= max) return true

  // NB: a PostgREST builder is a thenable, not a real Promise — no .catch(). Use try/catch.
  try { await db.from('rate_limit_log').insert({ ip, endpoint }) } catch { /* non-fatal */ }
  return false
}
