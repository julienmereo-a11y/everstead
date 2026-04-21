import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

// States
type InviteState = 'loading' | 'found' | 'accepting' | 'accepted' | 'declined' | 'expired' | 'error'

export default function AcceptInvite() {
  const [searchParams]          = useSearchParams()
  const token                   = searchParams.get('token')
  const [state, setState]       = useState<InviteState>('loading')
  const [invite, setInvite]     = useState<any>(null)
  const [owner, setOwner]       = useState<any>(null)
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
    setOwner((person as any).profiles)
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
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-8 h-8 rounded-xl bg-sage-500 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-display text-xl font-semibold text-navy-900">Everstead</span>
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
