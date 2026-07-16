import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isNative } from '../../lib/platform'

// Logged-out entry screen for the iOS app. Replaces the marketing Home page
// there (see App.jsx's RootRoute) so the app doesn't read as a repackaged
// website — a real risk under Apple App Review guideline 4.2. Signed-in
// native users never see this; RootRoute sends them straight to /dashboard.

const DESCRIPTION = 'One secure place for your accounts, documents, trusted contacts, and wishes — organised for life, not just for death.'

export default function NativeWelcome() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  if (!isNative()) return <Navigate to="/" replace />

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-sage-300 rounded-full animate-spin" />
      </div>
    )
  }
  if (user) return <Navigate to="/dashboard" replace />

  const handleLearnMore = async () => {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url: 'https://www.everstead.care' })
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <h1 className="font-display text-4xl font-light text-white">Everstead</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-300">{DESCRIPTION}</p>

        <div className="mt-10 space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="btn-aurora w-full rounded-full py-3.5 text-sm font-semibold"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/native/signup')}
            className="w-full rounded-full py-3.5 text-sm font-semibold bg-white/10 text-white border border-white/20"
          >
            Sign Up
          </button>
        </div>

        <button
          onClick={handleLearnMore}
          className="mt-8 text-sm text-sage-300 underline underline-offset-4"
        >
          Learn more about Everstead
        </button>
      </div>
    </div>
  )
}
