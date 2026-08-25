import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Loader2, Users, Mail, Send, AlertCircle,
  UserCircle, RefreshCw, Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import i18n from '../i18n'
import enSettings from '../i18n/locales/en/settings.json'
import frSettings from '../i18n/locales/fr/settings.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later, re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'settings', enSettings)
i18n.addResourceBundle('fr', 'settings', frSettings)

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function Card({ children, className }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-2xl p-6 ${className || ''}`}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-5">{children}</p>
  )
}

const inputClass = 'w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition-colors'

// ─────────────────────────────────────────────────────────────
// FAMILY SECTION
// ─────────────────────────────────────────────────────────────
export function FamilySection({ profile, session }) {
  const { t } = useTranslation('settings')
  const [membership, setMembership]     = useState(null)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [loadingMembership, setLoadingMembership] = useState(true)

  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError]   = useState('')
  const [inviteSent, setInviteSent]     = useState(false)

  const [resendLoading, setResendLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [actionError, setActionError]   = useState('')

  const isSecondary = profile?.family_role === 'secondary'
  const isPrimary   = !isSecondary // primary or no role yet (they're the plan holder)

  const loadMembership = useCallback(async () => {
    setLoadingMembership(true)
    setActionError('')

    if (isSecondary && profile?.family_id) {
      // Secondary user — fetch membership via family_id
      const { data } = await supabase
        .from('family_memberships')
        .select('*')
        .eq('id', profile.family_id)
        .maybeSingle()
      setMembership(data || null)

      if (data?.primary_user_id) {
        const { data: pp } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.primary_user_id)
          .maybeSingle()
        setPartnerProfile(pp || null)
      }
    } else {
      // Primary user — fetch membership where they are primary
      const { data } = await supabase
        .from('family_memberships')
        .select('*')
        .eq('primary_user_id', profile.id)
        .in('invite_status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setMembership(data || null)

      if (data?.secondary_user_id) {
        const { data: pp } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.secondary_user_id)
          .maybeSingle()
        setPartnerProfile(pp || null)
      }
    }

    setLoadingMembership(false)
  }, [profile, isSecondary])

  useEffect(() => { loadMembership() }, [loadMembership])

  // ── Send invitation ──────────────────────────────────────
  const handleSendInvite = async (e) => {
    e.preventDefault()
    setInviteError('')
    setInviteLoading(true)

    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
        throw new Error(t('family.errors.invalidEmail'))
      }

      // Insert membership row
      const { data: newMembership, error: insertError } = await supabase
        .from('family_memberships')
        .insert({
          primary_user_id: profile.id,
          secondary_email: inviteEmail,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Update primary's profile with family_id if not set
      if (!profile.family_id) {
        await supabase
          .from('profiles')
          .update({ family_id: newMembership.id, family_role: 'primary' })
          .eq('id', profile.id)
      }

      // Send invite email
      await fetch('/api/emails/send-family-invite', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          primaryUserId: profile.id,
          primaryName:   profile.full_name,
          secondaryEmail: inviteEmail,
          inviteToken:    newMembership.invite_token,
        }),
      })

      setInviteSent(true)
      setInviteEmail('')
      await loadMembership()
    } catch (err) {
      setInviteError(err.message || t('family.errors.sendFailed'))
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Resend invitation ────────────────────────────────────
  const handleResend = async () => {
    if (!membership) return
    setResendLoading(true)
    setActionError('')
    try {
      // Rotate token + reset invited_at — invalidates the old link
      const { data: updated, error } = await supabase
        .from('family_memberships')
        .update({
          invited_at:   new Date().toISOString(),
          invite_token: crypto.randomUUID(),
        })
        .eq('id', membership.id)
        .select()
        .single()

      if (error) throw error

      await fetch('/api/emails/send-family-invite', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          primaryUserId:  profile.id,
          primaryName:    profile.full_name,
          secondaryEmail: updated.secondary_email,
          inviteToken:    updated.invite_token,
        }),
      })

      await loadMembership()
    } catch (err) {
      setActionError(err.message || t('family.errors.resendFailed'))
    } finally {
      setResendLoading(false)
    }
  }

  // ── Cancel pending invitation ────────────────────────────
  const handleCancelInvite = async () => {
    if (!membership) return
    setCancelLoading(true)
    setActionError('')
    try {
      await supabase
        .from('family_memberships')
        .update({ invite_status: 'cancelled' })
        .eq('id', membership.id)

      setMembership(null)
      setInviteSent(false)
    } catch (err) {
      setActionError(err.message || t('family.errors.cancelFailed'))
    } finally {
      setCancelLoading(false)
    }
  }

  // ── Remove accepted partner ──────────────────────────────
  const handleRemovePartner = async () => {
    if (!membership || !membership.secondary_user_id) return
    setRemoveLoading(true)
    setActionError('')
    try {
      // Revoke membership
      await supabase
        .from('family_memberships')
        .update({ invite_status: 'cancelled' })
        .eq('id', membership.id)

      // Update secondary's profile
      const { data: secondaryProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', membership.secondary_user_id)
        .maybeSingle()

      await supabase
        .from('profiles')
        .update({
          subscription_status: 'trial_expired',
          family_id:           null,
          family_role:         null,
        })
        .eq('id', membership.secondary_user_id)

      // Send revoked email
      if (secondaryProfile?.email) {
        await fetch('/api/emails/send-family-access-revoked', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            secondaryEmail: secondaryProfile.email,
            secondaryName:  secondaryProfile.full_name,
          }),
        })
      }

      setMembership(null)
      setPartnerProfile(null)
      setShowRemoveConfirm(false)
    } catch (err) {
      setActionError(err.message || t('family.errors.removeFailed'))
    } finally {
      setRemoveLoading(false)
    }
  }

  // ── Secondary user leaves ────────────────────────────────
  const handleLeave = async () => {
    if (!membership) return
    setRemoveLoading(true)
    setActionError('')
    try {
      await supabase
        .from('family_memberships')
        .update({ invite_status: 'cancelled' })
        .eq('id', membership.id)

      await supabase
        .from('profiles')
        .update({
          subscription_status: 'trial_expired',
          family_id:           null,
          family_role:         null,
        })
        .eq('id', profile.id)

      setShowRemoveConfirm(false)
      // Reload page to reflect new status
      window.location.reload()
    } catch (err) {
      setActionError(err.message || t('family.errors.leaveFailed'))
    } finally {
      setRemoveLoading(false)
    }
  }

  if (loadingMembership) {
    return (
      <div className="flex items-center gap-2 text-stone-400 text-sm py-4">
        <Loader2 size={14} className="animate-spin" /> {t('family.loading')}
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {actionError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {actionError}
        </div>
      )}

      {/* ── SECONDARY: show primary's info + leave option ── */}
      {isSecondary && (
        <div>
          <p className="text-sm text-stone-600 mb-4">
            {t('family.secondary.joinedBefore')}<strong>{partnerProfile?.full_name || t('family.secondary.partnerFallback')}</strong>{t('family.secondary.joinedAfter')}
          </p>

          <div className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-200 rounded-xl mb-5">
            <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center">
              <UserCircle size={20} className="text-navy-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-900">{partnerProfile?.full_name || '—'}</p>
              <p className="text-xs text-stone-500">{partnerProfile?.email || '—'}{t('family.secondary.primarySuffix')}</p>
            </div>
          </div>

          {!showRemoveConfirm && (
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              {t('family.secondary.leave')}
            </button>
          )}

          {showRemoveConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 mb-3">
                {t('family.secondary.confirmBody')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleLeave}
                  disabled={removeLoading}
                  className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {removeLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  {t('family.secondary.confirmYes')}
                </button>
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="text-xs text-stone-500 hover:text-stone-700 px-4 py-2"
                >
                  {t('family.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRIMARY: vault overview ── */}
      {isPrimary && (
        <div>
          {/* Your vault */}
          <div className="flex items-center gap-3 p-4 bg-navy-50 border border-navy-200 rounded-xl mb-5">
            <div className="w-9 h-9 rounded-full bg-navy-800 flex items-center justify-center">
              <UserCircle size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-navy-900">{profile?.full_name || t('family.primary.youFallback')}</p>
              <p className="text-xs text-stone-500">{profile?.email}{t('family.primary.vaultSuffix')}</p>
            </div>
            <CheckCircle2 size={16} className="text-sage-500" />
          </div>

          {/* No membership yet — show invite form */}
          {!membership && (
            <div>
              <p className="text-sm text-stone-600 mb-4">
                {t('family.primary.invitePrompt')}
              </p>

              {inviteSent && (
                <div className="flex items-center gap-2 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 text-xs text-sage-800 mb-4">
                  <CheckCircle2 size={13} className="shrink-0" />
                  {t('family.primary.inviteSent')}
                </div>
              )}

              <form onSubmit={handleSendInvite} className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder={t('family.primary.emailPlaceholder')}
                  required
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail}
                  className="flex items-center gap-1.5 bg-navy-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {inviteLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {t('family.primary.sendInvite')}
                </button>
              </form>

              {inviteError && (
                <p className="mt-2 text-xs text-red-600">{inviteError}</p>
              )}
            </div>
          )}

          {/* Pending invitation */}
          {membership && membership.invite_status === 'pending' && (
            <div>
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <Mail size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{membership.secondary_email}</p>
                  <p className="text-xs text-stone-500">{t('family.primary.pendingStatus')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 transition-colors disabled:opacity-50"
                >
                  {resendLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {t('family.primary.resend')}
                </button>
                <span className="text-stone-300">·</span>
                <button
                  onClick={handleCancelInvite}
                  disabled={cancelLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  {cancelLoading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  {t('family.primary.cancelInvite')}
                </button>
              </div>
            </div>
          )}

          {/* Accepted — partner connected */}
          {membership && membership.invite_status === 'accepted' && (
            <div>
              <div className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-200 rounded-xl mb-4">
                <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center">
                  <UserCircle size={20} className="text-sage-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900">{partnerProfile?.full_name || membership.secondary_email}</p>
                  <p className="text-xs text-stone-500">{partnerProfile?.email || membership.secondary_email}{t('family.primary.theirVaultSuffix')}</p>
                </div>
                <div className="flex items-center gap-1.5 text-sage-600 text-xs font-semibold">
                  <CheckCircle2 size={14} /> {t('family.primary.connected')}
                </div>
              </div>

              {!showRemoveConfirm && (
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  <Trash2 size={12} /> {t('family.primary.removePartner')}
                </button>
              )}

              {showRemoveConfirm && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800 mb-3">
                    {t('family.primary.removeConfirmBefore')}<strong>{partnerProfile?.full_name || t('family.primary.partnerFallback')}</strong>{t('family.primary.removeConfirmAfter')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRemovePartner}
                      disabled={removeLoading}
                      className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {removeLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                      {t('family.primary.removeYes')}
                    </button>
                    <button
                      onClick={() => setShowRemoveConfirm(false)}
                      className="text-xs text-stone-500 hover:text-stone-700 px-4 py-2"
                    >
                      {t('family.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────
export default function Settings() {
  const { t }                  = useTranslation('settings')
  const { user }               = useAuth()
  const navigate               = useNavigate()
  const [profile, setProfile]  = useState(null)
  const [session, setSession]  = useState(null)
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { navigate('/login'); return }
      setSession(s)

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .single()

      setProfile(p || null)
      setLoading(false)
    }
    load()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-navy-400" />
      </div>
    )
  }

  const isFamily = profile?.plan === 'family'

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-6">

        <div className="mb-10">
          <h1 className="font-display text-3xl font-light text-navy-950">{t('title')}</h1>
          <p className="text-stone-500 text-sm mt-2">{t('subtitle')}</p>
        </div>

        <div className="space-y-8">

          {/* ── Profile ── */}
          <Card>
            <SectionLabel>{t('account.label')}</SectionLabel>
            <div className="space-y-1">
              <p className="text-sm font-medium text-navy-900">{profile?.full_name || '—'}</p>
              <p className="text-sm text-stone-500">{profile?.email || user?.email}</p>
              <p className="text-xs text-stone-400 mt-2 capitalize">
                {t('account.plan')} <strong className="text-navy-700">{profile?.plan || 'Essential'}</strong>
                {profile?.family_role && (
                  <span className="ml-2 text-stone-400">· {profile.family_role === 'secondary' ? t('account.rolePartner') : t('account.rolePrimary')}</span>
                )}
              </p>
            </div>
          </Card>

          {/* ── Language ── */}
          {/* Drives profiles.language — the app and emails follow this preference
              (the marketing site's language stays URL-based: / vs /fr). */}
          <Card>
            <SectionLabel>{t('language.label')}</SectionLabel>
            <p className="text-sm text-stone-500 mb-3">{t('language.description')}</p>
            <select
              value={profile?.language || 'en'}
              onChange={async (e) => {
                const lang = e.target.value
                setProfile(p => ({ ...p, language: lang }))
                i18n.changeLanguage(lang)
                await supabase.from('profiles').update({ language: lang }).eq('id', user.id)
              }}
              className="w-full max-w-xs border border-stone-200 rounded-xl px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </Card>

          {/* ── Household section — managing the second vault on Everstead+ ── */}
          {isFamily && (
            <Card>
              <SectionLabel>{t('family.sectionLabel')}</SectionLabel>
              <div className="flex items-center gap-2 mb-5">
                <Users size={16} className="text-navy-700" />
                <h2 className="text-sm font-semibold text-navy-900">{t('family.heading')}</h2>
              </div>
              <FamilySection profile={profile} session={session} />
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
