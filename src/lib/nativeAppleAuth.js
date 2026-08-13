import { supabase } from './supabase'

// Native Sign in with Apple (iOS only) — App Store guideline 4.8 requires it
// alongside any third-party login (Google) in the iOS app.
//
// Flow: ASAuthorization sheet (Face ID, fully native — no browser) via
// @capacitor-community/apple-sign-in → identity token → Supabase
// signInWithIdToken. Nonce handling per Apple/Supabase spec: the SHA-256 HASH
// of a random nonce goes to Apple, the RAW nonce goes to Supabase, which
// verifies the token's nonce claim matches.
//
// Apple quirks handled here:
// - The user's NAME is only returned on the very FIRST authorization for this
//   Apple ID — we persist it to profiles.full_name immediately or lose it.
// - "Hide My Email" users get @privaterelay.appleid.com addresses — fine for
//   auth; outbound email needs everstead.care registered in Apple's Private
//   Email Relay config (Apple Developer → Services) or Resend mail bounces.

const randomNonce = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const sha256Hex = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Returns 'signed-in' | 'cancelled'. Throws on real failures. */
export async function signInWithAppleNative() {
  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')

  const rawNonce = randomNonce()
  const hashedNonce = await sha256Hex(rawNonce)

  let auth
  try {
    auth = await SignInWithApple.authorize({
      clientId: 'care.everstead.app',
      redirectURI: 'https://www.everstead.care/', // required by the plugin API; unused in the native flow
      scopes: 'email name',
      nonce: hashedNonce,
    })
  } catch (e) {
    // The user closing the Apple sheet rejects with a cancellation code (1001).
    const msg = String(e?.message || e)
    if (/cancel|1001/i.test(msg)) return 'cancelled'
    throw e
  }

  const token = auth?.response?.identityToken
  if (!token) return 'cancelled'

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token,
    nonce: rawNonce,
  })
  if (error) throw error

  // First-authorization-only name: persist it before it's gone forever.
  const given = auth.response?.givenName || ''
  const family = auth.response?.familyName || ''
  const fullName = `${given} ${family}`.trim()
  if (fullName && data?.user) {
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle()
      if (profile && !profile.full_name) {
        await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id)
      }
    } catch { /* cosmetic — never fail the sign-in over it */ }
  }

  return 'signed-in'
}
