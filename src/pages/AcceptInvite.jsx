import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'
import enAcceptInvite from '../i18n/locales/en/acceptInvite.json'
import frAcceptInvite from '../i18n/locales/fr/acceptInvite.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later: re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'acceptInvite', enAcceptInvite)
i18n.addResourceBundle('fr', 'acceptInvite', frAcceptInvite)

export default function AcceptInvite() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const token                   = searchParams.get('token')
  const { user }                = useAuth()
  const { t }                   = useTranslation('acceptInvite')
  const [state, setState]       = useState('loading')
  const [invite, setInvite]     = useState(null)
  const [owner, setOwner]       = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setErrorMsg(t('errors.noToken')); return }
    loadInvite()
  }, [token])

  const loadInvite = async () => {
    const { data, error } = await supabase.rpc('get_invite_details', { p_token: token })
    const person = data?.[0]

    if (error || !person) { setState('expired'); return }

    if (person.invite_status === 'accepted') { setState('accepted'); setInvite(person); return }
    if (person.invite_status === 'declined') { setState('declined'); setInvite(person); return }

    const age = (Date.now() - new Date(person.invited_at).getTime()) / 86400000
    if (age > 7) { setState('expired'); return }

    setInvite(person)
    setOwner({ full_name: person.owner_name, email: person.owner_email })
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
      setErrorMsg(t('errors.wrongEmail', { invited: invite.email, current: user.email }))
      return
    }

    const { error } = await supabase
      .from('trusted_people')
      .update({ invite_status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('invite_token', token)

    if (error) { setState('error'); setErrorMsg(error.message); return }

    fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:        'invite-accepted',
        ownerName:   owner?.full_name,
        ownerEmail:  owner?.email,
        inviteeName: invite.name,
        role:        invite.role,
        inviteToken: token, // proves this call comes from a real invite
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

        <div className="flex justify-center mb-10">
          <img src="/everstead-logo-dark.png" alt="Everstead" className="h-10 w-auto" />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

          {state === 'loading' && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-stone-500 text-sm">{t('loading')}</p>
            </div>
          )}

          {state === 'found' && invite && (
            <>
              <div className="aurora-field aurora-dim p-7">
                <p className="font-display text-xl font-light text-white leading-snug">
                  {t('found.title', { name: owner?.full_name })}
                </p>
                <p className="text-stone-400 text-sm mt-2">
                  <Trans
                    t={t}
                    i18nKey="found.roleLine"
                    values={{ role: invite.role }}
                    components={{ bold: <strong className="text-white" /> }}
                  />
                </p>
              </div>
              <div className="p-7">
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  <Trans
                    t={t}
                    i18nKey="found.body"
                    values={{ role: invite.role, name: owner?.full_name }}
                    components={{ bold: <strong /> }}
                  />
                </p>

                <div className="space-y-3 mb-7">
                  {[
                    t('found.bullet1'),
                    t('found.bullet2'),
                    t('found.bullet3'),
                  ].map(item => (
                    <div key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="text-sage-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-stone-600">{item}</span>
                    </div>
                  ))}
                </div>

                {user && user.email !== invite.email && (
                  <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                    <Trans
                      t={t}
                      i18nKey="found.wrongAccount"
                      values={{ invited: invite.email, current: user.email }}
                      components={{ bold: <strong /> }}
                    />
                  </div>
                )}

                <button
                  onClick={handleAccept}
                  className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  {t('found.accept')} <ArrowRight size={15} />
                </button>
                <button
                  onClick={handleDecline}
                  className="w-full text-stone-400 text-sm py-2 hover:text-stone-600 transition-colors"
                >
                  {t('found.decline')}
                </button>
              </div>
            </>
          )}

          {state === 'accepting' && (
            <div className="p-10 flex flex-col items-center text-center gap-4">
              <Loader2 size={28} className="text-navy-400 animate-spin" />
              <p className="text-stone-500 text-sm">{t('accepting')}</p>
            </div>
          )}

          {state === 'accepted' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-sage-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={28} className="text-sage-500" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('accepted.title')}</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-8 max-w-xs">
                <Trans
                  t={t}
                  i18nKey={owner?.full_name ? 'accepted.bodyNamed' : 'accepted.bodyGeneric'}
                  values={{ name: owner?.full_name, role: invite?.role }}
                  components={{ bold: <strong /> }}
                />
              </p>
              <Link
                to={`/delegate-dashboard?token=${token}`}
                className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-5 py-3 text-sm text-white font-medium hover:bg-navy-700 transition-colors"
              >
                {t('accepted.cta')} <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {state === 'declined' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-5">
                <XCircle size={28} className="text-stone-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('declined.title')}</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                {t('declined.body')}
              </p>
            </div>
          )}

          {state === 'expired' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-5">
                <Shield size={28} className="text-amber-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('expired.title')}</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                {t('expired.body')}
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
                <XCircle size={28} className="text-red-400" />
              </div>
              <h2 className="font-display text-2xl font-light text-navy-950 mb-3">{t('error.title')}</h2>
              <p className="text-stone-500 text-sm leading-relaxed">{errorMsg || t('error.fallback')}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
