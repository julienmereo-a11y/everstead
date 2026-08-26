import React, { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Shield, ShieldAlert } from 'lucide-react'

export default function AdminProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()

  // The admin API refuses any session that has not completed an authenticator
  // challenge, so check the same thing here. Without this an admin whose
  // session is only aal1 would reach the panel and watch every request 403
  // with no explanation of what to do about it.
  //   'ok'      already stepped up
  //   'enrol'   no authenticator on the account yet
  //   'step-up' has one, but this session never completed it
  const [mfaState, setMfaState] = useState('checking')
  useEffect(() => {
    if (!user) return
    let active = true
    supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (!active) return
        if (data?.currentLevel === 'aal2') setMfaState('ok')
        else setMfaState(data?.nextLevel === 'aal2' ? 'step-up' : 'enrol')
      })
      .catch(() => { if (active) setMfaState('ok') }) // the API still decides
    return () => { active = false }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-navy-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/admin-login" replace />

  // Wait for profile before checking role
  if (!profile) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-navy-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (profile.role === 'admin' && mfaState === 'checking') {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-navy-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (profile.role === 'admin' && mfaState !== 'ok') {
    const needsEnrol = mfaState === 'enrol'
    return (
      <div className="min-h-screen aurora-field aurora-dim flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-10 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-navy-900 text-lg">
              {needsEnrol ? 'Authenticator app required' : 'One more step'}
            </h2>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">
              {needsEnrol
                ? 'The admin panel needs an authenticator app on this account. It takes about a minute to set up.'
                : 'This session has not been verified with your authenticator app. Sign in again to finish it.'}
            </p>
          </div>
          {needsEnrol ? (
            <Link
              to="/setup-mfa?next=/admin"
              className="inline-flex items-center justify-center w-full bg-navy-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-navy-800 transition-colors"
            >
              Set up my authenticator
            </Link>
          ) : (
            <Link
              to="/admin-login"
              className="inline-flex items-center justify-center w-full bg-navy-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-navy-800 transition-colors"
            >
              Sign in again
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen aurora-field aurora-dim flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-10 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-navy-900 text-lg">Access denied</h2>
            <p className="text-sm text-stone-500 mt-2 leading-relaxed">
              Your account does not have admin access. If you believe this is an error, ask an existing admin to invite you.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center w-full bg-navy-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-navy-800 transition-colors"
          >
            Back to your dashboard
          </Link>
        </div>
      </div>
    )
  }

  return children
}
