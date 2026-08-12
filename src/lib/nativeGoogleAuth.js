import { supabase } from './supabase'

// Native Google sign-in (Android v1 — iOS waits for the Sign in with Apple
// pairing required by App Store guideline 4.8).
//
// Google BLOCKS OAuth inside embedded webviews (disallowed_useragent), so the
// flow runs in the SYSTEM browser (Chrome Custom Tab) and returns via a deep
// link: care.everstead.app://auth-callback. AuthRedirectActivity (native)
// relays that intent back into the running MainActivity with CLEAR_TOP, which
// simultaneously closes the browser sheet; Capacitor then fires appUrlOpen and
// handleAuthCallbackUrl() below finishes the session.
//
// The Supabase client uses the default IMPLICIT flow, so tokens arrive in the
// URL FRAGMENT (#access_token=…&refresh_token=…) — handled here without
// touching the web app's auth configuration.
//
// Supabase dashboard prerequisite (one-time): Auth → URL Configuration →
// Additional Redirect URLs must include care.everstead.app://auth-callback

export const AUTH_CALLBACK_URL = 'care.everstead.app://auth-callback'

export async function signInWithGoogleNative() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_CALLBACK_URL,
      skipBrowserRedirect: true, // we open the URL ourselves, in the SYSTEM browser
    },
  })
  if (error) throw error
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url: data.url })
}

/** True if this appUrlOpen URL is our OAuth callback. */
export function isAuthCallbackUrl(url) {
  return typeof url === 'string' && url.startsWith(AUTH_CALLBACK_URL)
}

/**
 * Complete the sign-in from the deep-link URL. Returns:
 *  'signed-in'  — session established (onAuthStateChange has fired)
 *  'cancelled'  — user backed out / provider returned an error param
 *  'failed'     — tokens present but the session could not be set
 */
export async function handleAuthCallbackUrl(url) {
  let params
  try {
    const u = new URL(url)
    // Implicit flow → fragment; keep query as fallback for a future PKCE move.
    params = new URLSearchParams(u.hash ? u.hash.slice(1) : u.search)
  } catch {
    return 'failed'
  }
  if (params.get('error')) return 'cancelled'

  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return 'cancelled'

  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  return error ? 'failed' : 'signed-in'
}
