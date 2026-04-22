import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AcceptInvite() {
  const [searchParams]          = useSearchParams()
  const token                   = searchParams.get('token')
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

    if (error || !person) {
      setState('expired')
      return
    }

    // Check if already responded
    if (person.invite_status === 'accepted') { setState('accepted'); setInvite(person); return }
    if (person.invite_status === 'declined') { setState('declined'); setInvite(person); return }

    // Check expiry (7 days)
    const invited = new Date(person.invited_at)
    const age     = (Date.now() - invited.getTime()) / 86400000
    if (age > 7)  { setState('expired'); return }

    setInvite(person)
    setOwner(person.profiles)
    setState('found')
  }

  const handleAccept = async () => {
    setState('accepting')
    const { error } = await supabase
      .from('trusted_people')
      .update({
        invite_status: 'accepted',
        accepted_at:   new Date().toISOString(),
      })
      .eq('invite_token', token)

    if (error) {
      setState('error')
      setErrorMsg(error.message)
      return
    }

    // Notify the owner (fire-and-forget)
    await supabase.functions.invoke('send-invite-accepted-email', {
      body: { personId: invite.id, ownerUserId: invite.user_id },
    }).catch(console.error)

    setState('accepted')
  }

  const handleDecline = async () => {
    await supabase
      .from('trusted_people')
      .update({ invite_status: 'declined' })
      .eq('invite_token', token)
    setState('declined')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src="data:image/png;base64,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" alt="Everstead" className="h-10 w-auto" />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

          {/* ── Loading ── */}
          {state === 'loading' && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-stone-500 text-sm">Loading your invitation…</p>
            </div>
          )}

          {/* ── Found — show details ── */}
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

          {/* ── Accepting ── */}
          {state === 'accepting' && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-stone-500 text-sm">Confirming your role…</p>
            </div>
          )}

          {/* ── Accepted ── */}
          {state === 'accepted' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-sage-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={28} className="text-sage-500" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">You're confirmed.</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8 max-w-xs">
                You're now part of {invite?.name ? `${owner?.full_name}'s` : 'the'} Everstead plan as <strong>{invite?.role}</strong>. You'll be notified when access is needed.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-navy-700 font-medium hover:text-navy-900 transition-colors"
              >
                Learn about Everstead <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* ── Declined ── */}
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

          {/* ── Expired ── */}
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

          {/* ── Error ── */}
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
