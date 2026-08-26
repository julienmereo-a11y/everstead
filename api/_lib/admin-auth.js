import { createClient } from '@supabase/supabase-js'

// Service-role client for admin endpoints (bypasses RLS). Same pattern as
// api/admin/reports.js — the caller's JWT is verified separately in requireAdmin.
export const adminDb = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

/**
 * Read a claim from an ALREADY-VERIFIED access token.
 *
 * Only ever call this after adminDb.auth.getUser(token) has succeeded: that
 * validates the signature against the auth server. This just reads a claim the
 * SDK does not surface on the user object, so it must never be used as the
 * verification step itself.
 */
function claimFromVerifiedToken(token, claim) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json)?.[claim] ?? null
  } catch {
    return null
  }
}

/**
 * Verify the request comes from a signed-in admin. Returns the user or null.
 *
 * Two gates:
 *  1. A valid JWT whose profiles.role is 'admin'.
 *  2. STEP-UP: if that admin has enrolled an authenticator app, the session
 *     must actually have completed it (aal2). A stolen password alone is then
 *     not enough to reach the admin surface.
 *
 * The step-up is conditional ON PURPOSE. Enforcing aal2 unconditionally would
 * lock out an admin who has not enrolled yet, including the only admin on the
 * account. Once every admin has a verified factor, drop the
 * `factors?.length` condition below and require aal2 outright.
 */
export async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await adminDb
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return null

  const { data: factorData } = await adminDb.auth.admin.mfa.listFactors({ userId: user.id })
  const factors = (factorData?.factors ?? []).filter(f => f.status === 'verified')
  if (factors.length > 0 && claimFromVerifiedToken(token, 'aal') !== 'aal2') {
    return null // enrolled but this session never completed the second factor
  }

  return user
}

/** True when this admin still needs to enrol an authenticator app. */
export async function adminNeedsMfa(userId) {
  try {
    const { data } = await adminDb.auth.admin.mfa.listFactors({ userId })
    return (data?.factors ?? []).filter(f => f.status === 'verified').length === 0
  } catch {
    return false // never block the panel on a lookup failure
  }
}
