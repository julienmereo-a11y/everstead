import React from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Briefcase } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdvisorProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  // Always allow demo mode through
  if (isDemo) return children

  // Waiting for Supabase session to resolve
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Loading your portal…</p>
        </div>
      </div>
    )
  }

  // Not signed in at all → send to login, remember destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Signed in but profile not yet loaded (brief gap after login)
  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
      </div>
    )
  }

  // Signed in but not on the advisor plan → show clear error, don't redirect silently
  if (profile.plan !== 'advisor') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm space-y-5">
          <div className="w-14 h-14 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center mx-auto">
            <Briefcase size={26} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-light text-navy-950 mb-2">Everstead Pro required</h1>
            <p className="text-sm text-stone-500 leading-relaxed">
              The Adviser Portal is only available on Everstead Pro. You're currently on the{' '}
              <span className="font-semibold capitalize">{profile.plan}</span> plan.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-navy-800 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-navy-700 transition-colors"
            >
              View Everstead Pro
            </Link>
            <Link
              to="/dashboard"
              className="text-sm text-stone-500 hover:text-navy-700 transition-colors"
            >
              Back to your dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return children
}
