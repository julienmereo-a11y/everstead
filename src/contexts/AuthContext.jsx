import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isNative, isIOS, apiPost } from '../lib/platform'

const AuthContext = createContext(null)

// RevenueCat app_user_id is set to the Supabase user id so the RevenueCat
// webhook (api/revenuecat/webhook.js) can join a purchase event straight back
// to a profiles row with no separate mapping step. iOS-only for now — Android
// support would reuse the same calls once an Android build exists.
let revenueCatConfigured = false
// Only touch the RevenueCat SDK when a real public key is configured (Phase B).
// Initialising it with an undefined key leaves the native SDK in a broken state
// where later calls (e.g. logOut on sign-out) can crash the webview.
const REVENUECAT_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY
async function syncRevenueCatUser(userId) {
  if (!isNative() || !isIOS() || !REVENUECAT_KEY) return
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    if (!revenueCatConfigured) {
      await Purchases.configure({ apiKey: REVENUECAT_KEY, appUserID: userId })
      revenueCatConfigured = true
    } else {
      await Purchases.logIn({ appUserID: userId })
    }
  } catch (err) {
    console.error('RevenueCat sync error:', err)
  }
}

async function revenueCatLogOut() {
  if (!isNative() || !isIOS() || !revenueCatConfigured) return
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    await Purchases.logOut()
  } catch (err) {
    console.error('RevenueCat logout error:', err)
  }
}

// Record the device on sign-in (and let the server alert on a new one). Runs at
// most once per browser tab-session, and never blocks sign-in.
function checkDevice(session) {
  try {
    if (sessionStorage.getItem('everstead_device_checked')) return
    sessionStorage.setItem('everstead_device_checked', '1')
    let deviceId = localStorage.getItem('everstead_device_id')
    if (!deviceId) {
      deviceId = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      localStorage.setItem('everstead_device_id', deviceId)
    }
    // apiPost, not a relative fetch — on native a relative /api/… call hits the
    // capacitor://localhost SPA fallback and silently does nothing (see platform.js),
    // which would leave new-device security alerts permanently dead on mobile.
    apiPost('/api/auth/device-check', { deviceId },
      { Authorization: `Bearer ${session.access_token}` }).catch(() => {})
  } catch { /* non-blocking */ }
}

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null)
  const [profile,         setProfile]         = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [delegateInvites, setDelegateInvites] = useState([])

  // ── Fetch profile ────────────────────────────────────────────
  // Profile is created automatically by the handle_new_user DB trigger on signup.
  // Returns the row as well as storing it, so callers can poll for a change they're
  // waiting on (e.g. the plan flipping to 'family' once RevenueCat's webhook lands).
  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
    return data
  }, [])

  const fetchDelegateInvites = useCallback(async (email) => {
    const { data: rows } = await supabase
      .from('trusted_people')
      .select('id, invite_token, role, invite_status')
      .eq('email', email)
      .eq('invite_status', 'accepted')

    if (!rows?.length) { setDelegateInvites([]); return }

    // Profiles are RLS-protected — use SECURITY DEFINER RPC to get owner names
    const withOwners = await Promise.all(
      rows.map(async (inv) => {
        const { data: details } = await supabase.rpc('get_invite_details', { p_token: inv.invite_token })
        return { ...inv, ownerName: details?.[0]?.owner_name ?? null }
      })
    )
    setDelegateInvites(withOwners)
  }, [])

  // ── Bootstrap session ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Await both fetches so loading is never false while profile is still null
        await Promise.all([
          fetchProfile(session.user.id),
          fetchDelegateInvites(session.user.email),
        ])
        syncRevenueCatUser(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchDelegateInvites(session.user.email)
        syncRevenueCatUser(session.user.id)

        // On an actual sign-in (password, magic link, or Google), record the
        // device and alert on a new one. SIGNED_IN fires for every method;
        // session restores fire INITIAL_SESSION, so this won't run on reload.
        if (_event === 'SIGNED_IN') checkDevice(session)

        // Welcome email is now sent by the Stripe webhook (checkout.session.completed)
        // after the user completes payment — not here on SIGNED_IN.
        // This prevents sending the email to users who abandon the checkout flow.
      } else {
        setProfile(null)
        setDelegateInvites([])
        if (_event === 'SIGNED_OUT') revenueCatLogOut()
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile, fetchDelegateInvites])

  // ── Auth actions ─────────────────────────────────────────────
  const signUp = async ({ email, password, fullName, metadata = {} }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, ...metadata },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) throw error
    return data
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signInWithMagicLink = async (email, redirectTo) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo ?? `${window.location.origin}/dashboard` },
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates, profileUserId = user?.id) => {
    if (!profileUserId) throw new Error('Unable to complete signup. Please try again.')

    const payload = { id: profileUserId, ...updates }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    if (user?.id === profileUserId) setProfile(data)
    return data
  }

  const refreshProfile = () => user && fetchProfile(user.id)

  // ── Plan helpers ─────────────────────────────────────────────
  const isTrialing    = profile?.subscription_status === 'trialing'
  const isActive      = ['trialing', 'active'].includes(profile?.subscription_status)
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at) - Date.now()) / 86400000))
    : 0

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      delegateInvites, fetchDelegateInvites,
      signUp, signIn, signInWithMagicLink, signOut,
      updateProfile, refreshProfile,
      isTrialing, isActive, trialDaysLeft,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
