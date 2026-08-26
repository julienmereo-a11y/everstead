import { supabase } from './supabase'

// Authenticator-app (TOTP) step-up.
//
// The emailed six-digit code at sign-in is a CLIENT-side flow: the session it
// hands back is a plain password grant, so nothing in the token proves the code
// was ever entered. TOTP is different — Supabase stamps `aal: "aal2"` into the
// JWT itself only after a verified challenge, which is why the admin API gates
// on it (api/_lib/admin-auth.js). It cannot be skipped by calling the SDK
// directly with the public anon key.
//
// Both sign-in pages call these after the session exists: a verified factor
// means one more code before you are really in.

/** The account's verified authenticator factor, or null if it has none. */
export async function verifiedTotpFactor() {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) return null
    const all = [...(data?.totp ?? []), ...(data?.all ?? [])]
    return all.find(f => f.status === 'verified') ?? null
  } catch {
    return null
  }
}

/** Challenge + verify. Throws on a wrong or expired code. */
export async function completeTotpChallenge(factorId, code) {
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
  if (cErr) throw cErr
  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (vErr) throw vErr
  return true
}
