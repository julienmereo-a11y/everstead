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
 *  2. STEP-UP: the session must have completed an authenticator challenge
 *     (aal2). A stolen password alone is not enough to reach the admin surface.
 *
 * The aal2 requirement is unconditional as of 2026-08-26, once every admin had
 * enrolled. An admin without a verified factor can no longer reach the admin
 * API at all: AdminLogin sends them to /setup-mfa to enrol, which verifies as
 * part of setup and lands them back here at aal2.
 *
 * Note the emailed sign-in code cannot serve as this gate. It is a client-flow
 * check that returns a plain password grant, so nothing in the token proves it
 * happened. Only a TOTP challenge is stamped into the JWT.
 */
export async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user }, error } = await adminDb.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await adminDb
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return null

  if (claimFromVerifiedToken(token, 'aal') !== 'aal2') {
    return null // no authenticator challenge on this session
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
