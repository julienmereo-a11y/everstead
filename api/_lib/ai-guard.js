import { createClient } from '@supabase/supabase-js'

// Service-role client — used only to verify the caller's JWT and read their
// AI-features flag. (Files/folders prefixed with `_` are not routed by Vercel.)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

/**
 * Enforce the per-user "AI features" master switch on a logged-in AI route.
 * Returns null when the caller may use AI, or `{ status, error }` to send back.
 *
 * The caller must be authenticated (Bearer JWT) AND must not have
 * ai_features_enabled = false — so when a user turns AI off, no document or text
 * is ever forwarded to the AI provider, even on a forced/direct request.
 */
export async function aiGuard(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return { status: 401, error: 'Unauthorized' }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { status: 401, error: 'Unauthorized' }

  return await flagBlocks(user.id, 'your account')
}

/**
 * Like aiGuard, but enforces a SPECIFIC user's switch rather than the caller's —
 * for delegate-facing tools that process the plan OWNER's data. The caller must
 * still be authenticated (so the route is never anonymous), and the named owner
 * must not have AI turned off. `targetUserId` is the owner's profiles.id.
 */
export async function aiGuardForUser(req, targetUserId) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return { status: 401, error: 'Unauthorized' }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { status: 401, error: 'Unauthorized' }

  if (!targetUserId) return { status: 400, error: 'Missing owner reference' }

  return await flagBlocks(targetUserId, 'this account')
}

async function flagBlocks(userId, whose) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_features_enabled')
    .eq('id', userId)
    .single()

  if (profile?.ai_features_enabled === false) {
    return { status: 403, error: `AI features are turned off for ${whose}.` }
  }
  return null
}
