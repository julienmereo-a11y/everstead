import React from 'react'
import { Navigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield } from 'lucide-react'

export default function AdminProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  if (isDemo) return children

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

  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
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
