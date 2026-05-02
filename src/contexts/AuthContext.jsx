import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Fetch profile (auto-creates on first login after email confirmation) ──
  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) { setProfile(data); return }

    // PGRST116 = no rows — new user just confirmed their email
    if (error?.code === 'PGRST116') {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const meta = authUser?.user_metadata || {}
      const trialEndsAt = meta.trial_ends_at
        || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id:                  userId,
          email:               authUser.email,
          full_name:           meta.full_name  || '',
          plan:                meta.plan        || 'essential',
          billing_cycle:       meta.billing_cycle || 'monthly',
          subscription_status: 'trialing',
          trial_ends_at:       trialEndsAt,
          phone:               meta.phone       || null,
          country:             meta.country     || null,
          nationality:         meta.nationality || null,
        })
        .select()
        .single()

      if (newProfile) setProfile(newProfile)
    }
  }, [])

  // ── Bootstrap session ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

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
