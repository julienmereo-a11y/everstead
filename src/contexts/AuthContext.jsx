import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Fetch profile ────────────────────────────────────────────
  // Profile is created automatically by the handle_new_user DB trigger on signup.
  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
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
      if (session?.user) {
        fetchProfile(session.user.id)

        // Fire welcome email exactly once: on the first SIGNED_IN event after signup.
        // This fires when the user confirms their email (or immediately if auto-confirmed).
        // GetStarted stores plan data in localStorage; we read it here, then leave it
        // in place so Dashboard can still sync the plan.
        if (_event === 'SIGNED_IN') {
          const raw = localStorage.getItem('everstead_pending_signup')
          if (raw) {
            try {
              const pending = JSON.parse(raw)
              if (pending.email === session.user.email) {
                const welcomeKey = `everstead_welcome_sent_${session.user.id}`
                if (!localStorage.getItem(welcomeKey)) {
                  localStorage.setItem(welcomeKey, '1')
                  fetch('/api/emails/send-welcome', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                      name:  pending.full_name,
                      email: session.user.email,
                      plan:  pending.plan,
                    }),
                  }).catch(() => {})
                }
              }
            } catch {}
          }
        }
      } else {
        setProfile(null)
      }
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
