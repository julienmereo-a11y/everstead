import React from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  // Allow demo mode through without a real session
  if (isDemo) return children

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Loading your plan…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Wait for profile to finish loading before rendering the protected page
  if (!profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Loading your plan…</p>
        </div>
      </div>
    )
  }

  return children
}
