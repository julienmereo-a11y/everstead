import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Home, UserRound, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function ChooseAccount() {
  const navigate = useNavigate()
  const { user, profile, delegateInvites, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={28} className="text-navy-400 animate-spin" />
      </div>
    )
  }

  const firstName       = profile.full_name?.split(' ')[0] ?? 'there'
  const isOwner         = profile.role !== 'delegate'
  const trialEnded      = isOwner && profile.subscription_status === 'canceled'

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">

        <div className="flex justify-center mb-10">
          <img src="/everstead-logo-dark.png" alt="Everstead" className="h-10 w-auto" />
        </div>

        <h1 className="font-display text-2xl font-light text-navy-950 text-center mb-2">
          Welcome back, {firstName}.
        </h1>
        <p className="text-stone-500 text-sm text-center mb-8">
          Which plan would you like to access?
        </p>

        <div className="space-y-3">

          {isOwner && (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center gap-4 bg-white border border-stone-200 rounded-2xl p-5 text-left hover:border-navy-300 hover:shadow-sm transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center shrink-0 group-hover:bg-navy-100 transition-colors">
                <Home size={20} className="text-navy-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm">My plan</p>
                <p className="text-stone-500 text-xs mt-0.5">Your own Everstead plan</p>
                {trialEnded && (
                  <Link
                    to="/pricing"
                    onClick={e => e.stopPropagation()}
                    className="inline-block mt-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 hover:bg-amber-100 transition-colors"
                  >
                    Trial ended, reactivate
                  </Link>
                )}
              </div>
              <ArrowRight size={16} className="text-stone-400 group-hover:text-navy-600 transition-colors shrink-0" />
            </button>
          )}

          {delegateInvites.map(inv => (
            <button
              key={inv.id}
              onClick={() => navigate(`/delegate-dashboard?token=${inv.invite_token}`)}
              className="w-full flex items-center gap-4 bg-white border border-stone-200 rounded-2xl p-5 text-left hover:border-navy-300 hover:shadow-sm transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-sage-50 flex items-center justify-center shrink-0 group-hover:bg-sage-100 transition-colors">
                <UserRound size={20} className="text-sage-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm">
                  {inv.ownerName ?? 'Shared plan'}'s plan
                </p>
                <p className="text-stone-500 text-xs mt-0.5">Your role: {inv.role}</p>
              </div>
              <ArrowRight size={16} className="text-stone-400 group-hover:text-navy-600 transition-colors shrink-0" />
            </button>
          ))}

        </div>

        <p className="text-center text-xs text-stone-400 mt-8 leading-relaxed">
          You can switch between plans at any time from the navigation menu.
        </p>

      </div>
    </div>
  )
}
