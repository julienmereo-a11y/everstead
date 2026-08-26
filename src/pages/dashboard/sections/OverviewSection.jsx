// Overview: the readiness score, what is missing, and the shortcuts into every
// other section. This is the first thing a member sees after signing in.
//
import React, { useEffect, useState } from 'react'
import ReferralCard from '../../../components/ReferralCard'
import { SkeletonStats } from '../../../components/Skeleton'
import { PLAN_LABELS } from '../../../config/pricing'
import { SEVERITY_STYLES, STATUS_STYLES } from '../../dashboard/shared'
import { EmptyState } from '../../dashboard/ui'
import { AlertCircle, ArrowRight, Bell, BookOpen, Eye, FileText, Heart, Landmark, MessageSquare, RefreshCw, Sparkles, UserCircle, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
export const PLAN_BADGE = {
  free:      { label: PLAN_LABELS.free,      cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  essential: { label: PLAN_LABELS.essential, cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  family:    { label: PLAN_LABELS.family,    cls: 'bg-navy-50  text-navy-700  border-navy-200'  },
  advisor:   { label: PLAN_LABELS.advisor,   cls: 'bg-sage-50  text-sage-700  border-sage-200'  },
}

export function OverviewSection({ profile, accounts, documents, people, instructions, messages, alerts, markRead, onNavigate, planLimits, loading, daysSinceLogin, onCelebrate, onExecutorPreview, aboutMe, onUpgrade, persistScore, scoreInputsLoaded }) {
  const { t } = useTranslation('dashboard')
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.is_read)
  const [staleBannerDismissed, setStaleBannerDismissed] = React.useState(false)
  const showStaleBanner = !staleBannerDismissed && daysSinceLogin !== null && daysSinceLogin >= 180
  const isFamilyPlus = planLimits?.personalMessages ?? false // family and advisor have messages

  // Family member status (Family plan only)
  const [familyMembership, setFamilyMembership] = React.useState(null)
  const [familyLoading, setFamilyLoading] = React.useState(false)
  const isSecondaryUser = profile.family_role === 'secondary'
  React.useEffect(() => {
    if (profile.plan !== 'family') return
    setFamilyLoading(true)
    import('../../../lib/supabase').then(({ supabase: sb }) => {
      const query = isSecondaryUser && profile.family_id
        // Secondary: look up the membership row by family_id
        ? sb.from('family_memberships').select('*').eq('id', profile.family_id).maybeSingle()
        // Primary: look up membership where they are the primary
        : sb.from('family_memberships').select('*')
            .eq('primary_user_id', profile.id)
            .in('invite_status', ['pending', 'accepted'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
      query.then(({ data }) => { setFamilyMembership(data || null); setFamilyLoading(false) })
    })
  }, [profile.id, profile.plan, profile.family_id, isSecondaryUser])

  const vaultStats = [
    { label: t('overview.stats.accounts'), value: accounts.length, icon: Landmark, target: 5, navSection: 'accounts' },
    { label: t('overview.stats.documents'), value: documents.filter(d => d.status !== 'missing').length, icon: FileText, target: 5, navSection: 'documents' },
    { label: isFamilyPlus ? t('overview.stats.trustedPeople') : t('overview.stats.trustedContacts'), value: people.length, icon: Users, target: isFamilyPlus ? 5 : 2, navSection: 'people' },
    { label: t('overview.stats.instructions'), value: instructions.length, icon: BookOpen, target: 3, navSection: 'instructions' },
  ]

  const scoreBase = vaultStats.reduce((total, stat) => total + Math.min(stat.value / stat.target, 1), 0) / vaultStats.length
  const alertPenalty = Math.min(criticalAlerts.length * 5, 15)
  const score = Math.max(0, Math.round(scoreBase * 100) - alertPenalty)

  React.useEffect(() => {
    if (score === 100) onCelebrate?.('readiness_100', '⭐', t('overview.readiness100Title'), t('overview.readiness100Body'))
  }, [score])

  // The score is derived here from live vault data, but profiles.readiness_score
  // is what the ADMIN panel and the ADVISER portal read. It was never written
  // back, so every member showed 0% to advisers and to us, including paying
  // members with a well-filled vault.
  //
  // Gated on scoreInputsLoaded: accounts, documents, people and instructions
  // all feed the score, and a half-loaded dashboard would otherwise persist a
  // spurious 0 over a good value. Only writes when the number actually changes.
  React.useEffect(() => {
    if (!persistScore || !scoreInputsLoaded) return
    if (profile?.readiness_score === score) return
    Promise.resolve(persistScore({ readiness_score: score })).catch(() => {
      /* non-fatal: the displayed score is still correct */
    })
  }, [score, scoreInputsLoaded, persistScore, profile?.readiness_score])

  const planBadge = PLAN_BADGE[profile.plan] ?? PLAN_BADGE.essential
  const scoreLabel = isFamilyPlus ? t('overview.familyReadiness') : t('overview.planReadiness')

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto" style={{ backgroundColor: '#f8f7f5', minHeight: '100%' }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', fontWeight: '400', color: '#0d1628', letterSpacing: '-0.02em', marginBottom: '4px', lineHeight: 1.2 }}>
            {(() => {
              const h = new Date().getHours()
              const slot = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
              const first = profile.full_name?.split(' ')[0]
              return first ? t(`overview.greeting.${slot}`, { name: first }) : t(`overview.greeting.${slot}NoName`)
            })()}
          </h1>
          <p style={{ fontSize: '15px', color: '#78716c', fontWeight: '400' }}>{t('overview.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onExecutorPreview}
            className="inline-flex items-center gap-1.5 transition-colors hover:bg-stone-50 hover:text-navy-700"
            style={{ border: '1px solid #e5e2dc', backgroundColor: 'transparent', color: '#44403c', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}
          >
            <Eye size={12} /> {t('overview.executorView')}
          </button>
          <Link
            to="/print"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:bg-stone-50 hover:text-navy-700"
            style={{ border: '1px solid #e5e2dc', backgroundColor: 'transparent', color: '#44403c', borderRadius: '8px', padding: '8px 14px', fontSize: '13px' }}
          >
            <FileText size={12} /> {t('overview.exportPlan')}
          </Link>
          {profile.is_founding_member && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full text-white shadow-sm"
              style={{ background: 'linear-gradient(100deg,#2d5082,#6f6bc6,#6e9b6a)' }}
              title={t('overview.foundingMemberTitle')}
            >
              <Sparkles size={12} /> {t('shell.foundingMember')}
            </span>
          )}
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${planBadge.cls}`}>
            {t('shell.planSuffix', { plan: planBadge.label })}
          </span>
        </div>
      </div>

      {/* Recommended first step — About Me (until it's been filled in) */}
      {!aboutMe && (
        <button
          onClick={() => onNavigate('aboutme')}
          className="w-full mb-6 text-left rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 to-white p-5 flex items-center gap-4 hover:border-sage-300 transition-colors group"
        >
          <div className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #2d5082 0%, #6f6bc6 55%, #6e9b6a 100%)' }}>
            <UserCircle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-700 mb-0.5">{t('overview.aboutMeCta.kicker')}</p>
            <h3 className="font-display text-lg font-light text-navy-950 leading-snug">{t('overview.aboutMeCta.title')}</h3>
            <p className="text-sm text-stone-500 mt-0.5">{t('overview.aboutMeCta.body')}</p>
          </div>
          <ArrowRight size={18} className="text-sage-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">
                {t('overview.criticalAlerts', { count: criticalAlerts.length })}
              </p>
              <ul className="mt-1 space-y-0.5">
                {criticalAlerts.slice(0, 3).map(a => (
                  <li key={a.id} className="text-sm text-red-700">• {a.title}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stale plan banner — shown when user hasn't logged in for 180+ days */}
      {showStaleBanner && (
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <RefreshCw size={16} className="text-stone-400 mt-0.5 shrink-0" />
            <p className="text-sm text-stone-600">
              {t('overview.staleBanner', { days: daysSinceLogin })}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('accounts')}
              className="text-xs font-semibold text-navy-700 hover:text-navy-900 transition-colors whitespace-nowrap"
            >
              {t('overview.reviewNow')}
            </button>
            <button
              onClick={() => setStaleBannerDismissed(true)}
              className="text-stone-400 hover:text-stone-600 transition-colors"
              aria-label={t('overview.dismiss')}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Readiness score + stats */}
      <div className="grid lg:grid-cols-[1fr_2fr] gap-6 mb-6">
        {/* Score ring */}
        <div className="rounded-2xl flex flex-col items-center justify-center text-center" style={{ background: 'linear-gradient(135deg, #f8f7f5 0%, #f0ede8 100%)', border: '1px solid #e5e2dc', padding: '32px', gap: '0' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', color: '#78716c', textTransform: 'uppercase', marginBottom: '20px' }}>{scoreLabel}</p>
          <div className="relative" style={{ width: '152px', height: '152px' }}>
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="auroraRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#2d5082" />
                  <stop offset="0.5" stopColor="#6f6bc6" />
                  <stop offset="1" stopColor="#6e9b6a" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="48" fill="none" stroke="#e5e2dc" strokeWidth="9" />
              <circle
                cx="60" cy="60" r="48" fill="none"
                stroke={score >= 70 ? 'url(#auroraRing)' : score >= 40 ? '#d97706' : '#ef4444'}
                strokeWidth="9"
                strokeDasharray={`${2 * Math.PI * 48 * score / 100} ${2 * Math.PI * 48 * (1 - score / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {score === 0 ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#78716c', fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{t('overview.scoreZero')}</div>
                </div>
              ) : (
                <span className="font-display" style={{ fontSize: '36px', fontWeight: '300', color: '#0d1628', lineHeight: 1 }}>{t('overview.scorePercent', { score })}</span>
              )}
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#78716c', marginTop: '16px', marginBottom: '20px', lineHeight: 1.5 }}>
            {score >= 80 ? t('overview.scoreMsgHigh') :
             score >= 50 ? t('overview.scoreMsgMid') :
             t('overview.scoreMsgLow')}
          </p>

          {/* Open planning coach */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('everstead:coach', { detail: t('aiGuide.quickPrompts.focus') }))}
            className="inline-flex items-center gap-1.5 transition-all"
            style={{ background: 'linear-gradient(100deg, #2d5082 0%, #6f6bc6 50%, #6e9b6a 100%)', border: 'none', color: '#ffffff', borderRadius: '9999px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 6px 18px -6px rgba(111,107,198,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <Sparkles size={13} /> {t('aiGuide.quickPrompts.focus')}
          </button>
        </div>

        {/* Vault stats */}
        {loading ? (
          <SkeletonStats count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {vaultStats.map(({ label, value, icon: Icon, target, navSection }, index) => (
              <div
                key={label}
                onClick={() => onNavigate(navSection)}
                className="relative overflow-hidden"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e2dc',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  animation: 'fadeSlideUp 0.4s ease forwards',
                  animationDelay: `${index * 0.08}s`,
                  opacity: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center">
                    <Icon size={15} className="text-navy-700" />
                  </div>
                  <span className="text-xs" style={{ color: value === 0 ? '#4c7d47' : '#a8a29e' }}>
                    {value === 0 ? t('overview.startHere') : t('overview.statProgress', { value, target, count: value })}
                  </span>
                </div>
                {value === 0 ? (
                  <div className="mb-1">
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px dashed #b9d3b5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4c7d47', fontSize: '18px', marginBottom: '8px' }}>+</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600', color: '#ffffff', background: '#4c7d47', borderRadius: '9999px', padding: '5px 12px' }}>{t('overview.addFirst')}</span>
                  </div>
                ) : (
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: '#0d1628', fontWeight: '700', lineHeight: 1, marginBottom: '4px' }}>{value}</p>
                )}
                <p className="text-xs text-stone-500">{label}</p>
                {/* Bottom progress bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', borderRadius: '0 0 12px 12px', backgroundColor: '#f0ede8' }}>
                  <div style={{ height: '100%', width: `${Math.min((value / target) * 100, 100)}%`, backgroundColor: '#4c7d47', borderRadius: '0 0 0 12px', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Readiness coach card removed — the floating "Ask your coach" covers this. */}

      {/* Legacy messages CTA — Family/Advisor plans */}
      {planLimits?.personalMessages && (
        <div className="mb-6">
          {!messages || messages.length === 0 ? (
            <div className="bg-gradient-to-br from-stone-50 to-navy-50 border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-navy-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm">{t('overview.messagesCta.emptyTitle')}</p>
                <p className="text-xs text-stone-500 mt-0.5">{t('overview.messagesCta.emptyBody')}</p>
              </div>
              <button
                onClick={() => onNavigate('messages')}
                className="shrink-0 text-xs font-semibold text-navy-700 bg-white border border-navy-200 px-3 py-2 rounded-full hover:bg-navy-50 transition-colors whitespace-nowrap"
              >
                {t('overview.messagesCta.writeMessage')}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-navy-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-900 text-sm">{t('overview.messagesCta.saved', { count: messages.length })}</p>
                <p className="text-xs text-stone-500 mt-0.5">{t('overview.messagesCta.savedBody')}</p>
              </div>
              <button
                onClick={() => onNavigate('messages')}
                className="shrink-0 text-xs font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-3 py-2 rounded-full hover:bg-navy-100 transition-colors whitespace-nowrap"
              >
                {t('overview.messagesCta.addAnother')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Family member card — Family plan only */}
      {profile.plan === 'family' && !familyLoading && (
        <div className="mb-6">
          {familyMembership?.invite_status === 'accepted' ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-sage-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">
                  {isSecondaryUser ? t('overview.family.secondaryActive') : t('overview.family.active')}
                </p>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  {isSecondaryUser
                    ? t('overview.family.secondaryBody')
                    : t('overview.family.primaryBody', { email: familyMembership.secondary_email })}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2.5 py-1 rounded-full">{t('overview.family.activeBadge')}</span>
            </div>
          ) : familyMembership?.invite_status === 'pending' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">{t('overview.family.pending')}</p>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  {t('overview.family.pendingBody', { email: familyMembership.secondary_email })}
                </p>
              </div>
              <button
                onClick={() => onNavigate('family')}
                className="shrink-0 text-xs font-semibold text-amber-700 bg-white border border-amber-300 px-3 py-1.5 rounded-full hover:bg-amber-50 transition-colors"
              >
                {t('overview.family.manage')}
              </button>
            </div>
          ) : (
            <div className="bg-navy-50 border border-navy-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                <Heart size={18} className="text-navy-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy-900">{t('overview.family.addTitle')}</p>
                <p className="text-xs text-stone-500 mt-0.5">{t('overview.family.addBody')}</p>
              </div>
              <button
                onClick={() => onNavigate('family')}
                className="shrink-0 text-xs font-semibold text-white btn-aurora px-3 py-1.5 rounded-full hover:bg-navy-700 transition-colors"
              >
                {t('overview.family.invite')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent documents + alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-navy-900 text-sm">{t('overview.recentDocuments')}</p>
            <span className="text-xs text-stone-400">{t('overview.totalCount', { count: documents.length })}</span>
          </div>
          {documents.length === 0 ? (
            <EmptyState icon={FileText} label={t('overview.noDocuments')} action={t('overview.uploadFirstDocument')} onAction={() => onNavigate("documents")} />
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map(doc => (
                <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.current}`}>
                    {t(`documents.status.${doc.status}`, { defaultValue: doc.status })}
                  </div>
                  <span className="text-sm text-navy-800 truncate flex-1">{doc.name}</span>
                  <span className="text-xs text-stone-400 shrink-0">{t(`documents.type.${doc.doc_type}`, { defaultValue: doc.doc_type })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-navy-900 text-sm">{t('overview.recentAlerts')}</p>
            {alerts.filter(a => !a.is_read).length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                {t('overview.unreadCount', { count: alerts.filter(a => !a.is_read).length })}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <EmptyState icon={Bell} label={t('overview.noAlerts')} action={t('overview.allCaughtUp')} />
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => {
                const { icon: Icon, bar } = SEVERITY_STYLES[alert.severity]
                return (
                  <div
                    key={alert.id}
                    onClick={() => markRead(alert.id)}
                    className={`flex items-start gap-3 py-2 border-b border-stone-50 last:border-0 cursor-pointer ${alert.is_read ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${bar}`} />
                    <p className="text-sm text-navy-800 leading-snug">{alert.title}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Free users: nudge to upgrade instead of the referral trial offer.
             Paid users: the refer-a-friend (extended trial) card. ── */}
      <div className="mt-6">
        {profile?.plan === 'free' ? (
          <div className="rounded-2xl border border-navy-200 bg-navy-950 text-white p-6 sm:flex sm:items-center sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-sage-300" />
              </div>
              <div className="max-w-lg">
                <p className="font-semibold text-white text-base">{t('overview.upgrade.title')}</p>
                <p className="mt-1 text-sm text-stone-300 leading-relaxed">
                  {t('overview.upgrade.body')}
                </p>
              </div>
            </div>
            <button
              onClick={onUpgrade}
              className="mt-4 sm:mt-0 shrink-0 inline-flex items-center justify-center gap-2 btn-aurora text-white font-semibold text-sm px-6 py-3 rounded-full hover:-translate-y-0.5 transition-transform"
            >
              {t('overview.upgrade.button')} <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <ReferralCard userId={profile?.id} />
        )}
      </div>
    </div>
  )
}

// Friendly, at-the-limit upgrade nudge shown inline when a vault cap is hit.
// Plan-aware: Free users get the free-tier framing and are pointed to Everstead+;
// grandfathered Essential subscribers keep their original wording. It's never a
// blocking modal — it sits above the (disabled) add control, so nothing the user
// has already saved is touched. The database is the real authority (free_tier_allows
// + restrictive INSERT policies); this just gates the UI before an insert would be
// rejected.
// The free-tier caps are enforced by restrictive RLS INSERT policies, which reject
// with Postgres code 42501 ("new row violates row-level security policy"). The UI
// gates before that point, but if a rejection ever reaches a form, show friendly
// copy instead of the raw policy string.
