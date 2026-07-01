import { createClient } from '@supabase/supabase-js'

// Service-role client for admin endpoints (bypasses RLS). Same pattern as
// api/admin/reports.js — the caller's JWT is verified separately in requireAdmin.
export const adminDb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Verify the request comes from a signed-in admin. Returns the user or null.
// Extract JWT from the Authorization header → validate → check profiles.role.
export async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await adminDb
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  return profile?.role === 'admin' ? user : null
}
