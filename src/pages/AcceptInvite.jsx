import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function AcceptInvite() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const token                   = searchParams.get('token')
  const { user }                = useAuth()
  const [state, setState]       = useState('loading')
  const [invite, setInvite]     = useState(null)
  const [owner, setOwner]       = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setErrorMsg('No invite token found in the link.'); return }
    loadInvite()
  }, [token])

  const loadInvite = async () => {
    const { data: person, error } = await supabase
      .from('trusted_people')
      .select('*, profiles!trusted_people_user_id_fkey(full_name, email)')
      .eq('invite_token', token)
      .single()

    if (error || !person) { setState('expired'); return }

    if (person.invite_status === 'accepted') { setState('accepted'); setInvite(person); return }
    if (person.invite_status === 'declined') { setState('declined'); setInvite(person); return }

    const invited = new Date(person.invited_at)
    const age     = (Date.now() - invited.getTime()) / 86400000
    if (age > 7) { setState('expired'); return }

    setInvite(person)
    setOwner(person.profiles)
    setState('found')
  }

  const handleAccept = async () => {
    setState('accepting')

    if (!user) {
      // Not logged in — preserve token and send to delegate registration
      navigate(`/delegate-register?token=${token}`)
      return
    }

    // Logged in — check email matches invite
    if (user.email !== invite.email) {
      setState('error')
      setErrorMsg(`This invitation was sent to ${invite.email}. You're logged in as ${user.email}. Please sign in with the correct account.`)
      return
    }

    const { error } = await supabase
      .from('trusted_people')
      .update({ invite_status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('invite_token', token)

    if (error) { setState('error'); setErrorMsg(error.message); return }

    fetch('/api/emails/send-invite-accepted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerName:   owner?.full_name,
        ownerEmail:  owner?.email,
        inviteeName: invite.name,
        role:        invite.role,
      }),
    }).catch(console.error)

    navigate(`/delegate-dashboard?token=${token}`)
  }

  const handleDecline = async () => {
    setState('accepting')
    const { error } = await supabase
      .from('trusted_people')
      .update({ invite_status: 'declined' })
      .eq('invite_token', token)
    if (error) { setState('error'); setErrorMsg(error.message); return }
    setState('declined')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-8 h-8 rounded-xl bg-sage-500 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-display text-xl font-semibold text-navy-900">Everstead</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

          {state === 'loading' && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-stone-500 text-sm">Loading your invitation…</p>
            </div>
          )}

          {state === 'found' && invite && (
            <>
              <div className="bg-navy-950 p-7">
                <p className="font-display text-xl font-light text-white leading-snug">
                  {owner?.full_name} has invited you to their Everstead plan.
                </p>
                <p className="text-stone-400 text-sm mt-2">
                  They'd like you to be their <strong className="text-white">{invite.role}</strong>.
                </p>
              </div>
              <div className="p-7">
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  Everstead is a secure platform for organising digital life — accounts, documents, instructions, and final wishes.
                  As <strong>{invite.role}</strong>, you'll have access to the sections {owner?.full_name} has chosen to share with your role.
                </p>

                <div className="space-y-3 mb-7">
                  {[
                    'You only see what\'s been shared with your specific role',
                    'You don\'t need to do anything now — only when needed',
                    'You can update your contact details after accepting',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="text-sage-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-stone-600">{item}</span>
                    </div>
                  ))}
                </div>

                {user && user.email !== invite.email && (
                  <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                    <strong>Heads up:</strong> This invite is for <strong>{invite.email}</strong>. You're signed in as <strong>{user.email}</strong>. Sign out first if you want to accept with a different account.
                  </div>
                )}

                <button
                  onClick={handleAccept}
                  className="w-full bg-navy-800 text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-navy-700 transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  Accept invitation <ArrowRight size={15} />
                </button>
                <button
                  onClick={handleDecline}
                  className="w-full text-stone-400 text-sm py-2 hover:text-stone-600 transition-colors"
                >
                  Decline
                </button>
              </div>
            </>
          )}

          {state === 'accepting' && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-stone-500 text-sm">Confirming your role…</p>
            </div>
          )}

          {state === 'accepted' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-sage-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={28} className="text-sage-500" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">You're confirmed.</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8 max-w-xs">
                You're now part of {owner?.full_name ? `${owner.full_name}'s` : 'the'} Everstead plan as <strong>{invite?.role}</strong>.
              </p>
              <Link
                to={`/delegate-dashboard?token=${token}`}
                className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-3 text-sm text-white font-medium hover:bg-navy-700 transition-colors"
              >
                Open delegate dashboard <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {state === 'declined' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-5">
                <XCircle size={28} className="text-stone-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">Invitation declined.</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                We've notified the plan owner. If this was a mistake, ask them to re-send the invitation.
              </p>
            </div>
          )}

          {state === 'expired' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-5">
                <Shield size={28} className="text-amber-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">Invitation expired.</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                This invite link is no longer valid. Ask the plan owner to re-send your invitation.
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
                <XCircle size={28} className="text-red-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">Something went wrong.</h2>
              <p className="text-stone-500 text-sm leading-relaxed">{errorMsg || 'Please try again or contact support.'}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
