// The things that appear over the dashboard rather than inside it: trial and
// adviser-cancellation notices, the celebration toast, the life-event prompt,
// the executor preview, and the first-run tour.
//
import React, { useEffect, useState } from 'react'
import { marketPricing, planLabel } from '../../config/pricing'
import i18n from '../../i18n'
import { FamilySection } from '../Settings'
import { roleLabel } from '../dashboard/shared'
import { SectionShell } from '../dashboard/ui'
import { AlertTriangle, ArrowRight, BookOpen, Clock, CreditCard, FileText, Home, Key, Landmark, Lock, Sparkles, UserCircle, Users, X } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

// Everstead+ figures for the member's market: a French member pays in euros,
// so no price is spelled out in the copy, only interpolated from the catalogue.
function plusFigures(language) {
  const m = marketPricing(language)
  const annual = m.family.annual.perYear ?? Number((m.family.annual.perMonth * 12).toFixed(2))
  return {
    monthly:        m.money(m.family.monthly.perMonth),
    annualPerMonth: m.money(m.family.annual.perMonth),
    annual:         m.money(annual),
  }
}

export function getTrialDaysLeft(trialEndsAt) {
  if (!trialEndsAt) return null
  const ms = new Date(trialEndsAt) - Date.now()
  if (ms <= 0) return 0
  // Always show at least 1 day while any time remains today
  return Math.max(1, Math.ceil(ms / 86400000))
}

export function TrialBanner({ daysLeft, onUpgrade }) {
  const { t } = useTranslation('dashboard')
  if (daysLeft <= 0 || daysLeft > 14) return null
  const critical = daysLeft <= 1
  const urgent   = daysLeft <= 3
  const warning  = daysLeft <= 7
  // Days 8–14: subtle info strip; days 1–7: escalating colour
  const cls = critical ? 'bg-red-50 border-b border-red-200'
    : urgent   ? 'bg-amber-50 border-b border-amber-200'
    : warning  ? 'bg-stone-100 border-b border-stone-200'
    : 'bg-navy-950/5 border-b border-navy-100'
  const textCls = critical ? 'text-red-700 font-medium'
    : urgent  ? 'text-amber-700'
    : warning ? 'text-stone-600'
    : 'text-navy-700'
  const iconCls = critical ? 'text-red-500'
    : urgent  ? 'text-amber-600'
    : warning ? 'text-stone-400'
    : 'text-navy-400'
  const btnCls = critical ? 'bg-red-600 text-white hover:bg-red-700'
    : urgent  ? 'bg-amber-500 text-white hover:bg-amber-600'
    : warning ? 'bg-stone-700 text-white hover:bg-stone-800'
    : 'btn-aurora text-white hover:bg-navy-700'
  const msg = daysLeft === 1
    ? t('banners.trial.endsTomorrow')
    : daysLeft <= 7
    ? t('banners.trial.endsInDays', { days: daysLeft })
    : t('banners.trial.remaining', { days: daysLeft })
  return (
    <div className={`flex items-center justify-between gap-4 px-6 py-3 text-sm ${cls}`}>
      <div className="flex items-center gap-2">
        <Clock size={15} className={iconCls} />
        <span className={textCls}>{msg}</span>
      </div>
      {daysLeft <= 7 && (
        <button
          onClick={onUpgrade}
          className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors ${btnCls}`}
        >
          {t('banners.trial.managePlan')}
        </button>
      )}
    </div>
  )
}

export function TrialExpiredModal({ profile, onUpgrade }) {
  const { t, i18n } = useTranslation('dashboard')
  const figures = plusFigures(i18n.language)
  return (
    <div className="fixed inset-0 z-[60] bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <Lock size={28} className="text-red-500" />
        </div>
        <h2 className="font-display text-3xl font-light text-navy-950 mb-3">{t('banners.trialExpired.title')}</h2>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          {t('banners.trialExpired.body')}
        </p>
        <div className="space-y-3 mb-8">
          {[
            { name: planLabel('family'), price: t('banners.trialExpired.plusPrice', figures), note: t('banners.trialExpired.plusNote', figures), id: 'family', highlight: profile.plan !== 'advisor' },
            ...(profile.plan === 'advisor' ? [{ name: planLabel('advisor'), price: t('banners.trialExpired.proPrice'), note: t('banners.trialExpired.proNote'), id: 'advisor', highlight: true }] : []),
          ].map(plan => (
            <button
              key={plan.id}
              onClick={() => onUpgrade(plan.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all text-left ${plan.highlight ? 'border-navy-700 bg-navy-50 hover:bg-navy-100' : 'border-stone-200 hover:border-navy-300'}`}
            >
              <div>
                <p className="font-semibold text-navy-900 text-sm">{plan.name}</p>
                <p className="text-stone-400 text-xs mt-0.5">{plan.note}</p>
              </div>
              <p className="font-display text-xl font-light text-navy-900">{plan.price}</p>
            </button>
          ))}
        </div>
        <p className="text-stone-400 text-xs">
          {t('banners.trialExpired.questions')}{' '}
          <a href="mailto:support@everstead.care" className="underline hover:text-navy-700">support@everstead.care</a>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ADVISOR CANCELLATION HELPERS
// ─────────────────────────────────────────────────────────────

export function getAdvisorDaysLeft(cancelledAt) {
  if (!cancelledAt) return null
  const deadline = new Date(cancelledAt).getTime() + 30 * 86400000
  return Math.ceil((deadline - Date.now()) / 86400000)
}

export function AdvisorCancelledBanner({ daysLeft, advisorName, onAddPayment }) {
  const { t } = useTranslation('dashboard')
  const urgent = daysLeft <= 7
  return (
    <div className={`flex items-start justify-between gap-4 px-6 py-4 text-sm ${urgent ? 'bg-red-50 border-b border-red-200' : 'bg-orange-50 border-b border-orange-200'}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${urgent ? 'text-red-500' : 'text-orange-500'}`} />
        <div>
          <p className={`font-semibold ${urgent ? 'text-red-800' : 'text-orange-800'}`}>
            {advisorName ? t('banners.advisorCancelled.titleNamed', { name: advisorName }) : t('banners.advisorCancelled.titleUnnamed')}
          </p>
          <p className={`text-xs mt-0.5 leading-relaxed ${urgent ? 'text-red-700' : 'text-orange-700'}`}>
            {daysLeft === 1
              ? t('banners.advisorCancelled.lockedTomorrow')
              : t('banners.advisorCancelled.graceDays', { days: daysLeft })}
          </p>
        </div>
      </div>
      <button
        onClick={onAddPayment}
        className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap ${urgent ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
      >
        {t('banners.advisorCancelled.addPayment')}
      </button>
    </div>
  )
}

export function AdvisorCancelledModal({ advisorName, onAddPayment }) {
  const { t, i18n } = useTranslation('dashboard')
  const figures = plusFigures(i18n.language)
  return (
    <div className="fixed inset-0 z-[60] bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-6">
          <CreditCard size={28} className="text-orange-500" />
        </div>
        <h2 className="font-display text-3xl font-light text-navy-950 mb-3">{t('banners.advisorModal.title')}</h2>
        <p className="text-stone-500 text-sm leading-relaxed mb-2">
          {advisorName
            ? <><strong>{advisorName}</strong> {t('banners.advisorModal.cancelledNamedSuffix')}</>
            : <>{t('banners.advisorModal.cancelledUnnamed')}</>}
        </p>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          {t('banners.advisorModal.graceEnded')}
        </p>
        <div className="space-y-3 mb-8">
          {[
            { name: planLabel('family'), price: t('banners.advisorModal.plusPrice', figures), note: t('banners.advisorModal.plusNote', figures), id: 'family', highlight: true },
          ].map(plan => (
            <button
              key={plan.id}
              onClick={() => onAddPayment(plan.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all text-left ${plan.highlight ? 'border-navy-700 bg-navy-50 hover:bg-navy-100' : 'border-stone-200 hover:border-navy-300'}`}
            >
              <div>
                <p className="font-semibold text-navy-900 text-sm">{plan.name}</p>
                <p className="text-stone-400 text-xs mt-0.5">{plan.note}</p>
              </div>
              <p className="font-display text-xl font-light text-navy-900">{plan.price}</p>
            </button>
          ))}
        </div>
        <p className="text-stone-400 text-xs">
          {t('banners.advisorModal.questions')}{' '}
          <a href="mailto:support@everstead.care" className="underline hover:text-navy-700">support@everstead.care</a>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FAMILY WRAPPER — fetches session so FamilySection has access_token
// ─────────────────────────────────────────────────────────────

export function FamilyWrapper({ profile }) {
  const { t } = useTranslation('dashboard')
  const [session, setSession] = React.useState(null)
  React.useEffect(() => {
    import('../../lib/supabase').then(({ supabase: s }) => {
      s.auth.getSession().then(({ data: { session: sess } }) => setSession(sess))
    })
  }, [])
  if (!session) return null
  return (
    <SectionShell
      title={t('shell.family.title')}
      subtitle={profile.family_role === 'secondary'
        ? t('shell.family.subtitleSecondary')
        : t('shell.family.subtitlePrimary')}
    >
      <FamilySection profile={profile} session={session} />
    </SectionShell>
  )
}

// ─────────────────────────────────────────────────────────────
// CELEBRATION TOAST
// ─────────────────────────────────────────────────────────────

export function CelebrationToast({ message, onDone }) {
  const [visible, setVisible] = React.useState(true)
  React.useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300) }, 5000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[55] max-w-sm bg-white border border-sage-200 rounded-2xl shadow-xl p-5 flex items-start gap-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center shrink-0 text-xl">
        {message.emoji}
      </div>
      <div>
        <p className="font-semibold text-navy-900 text-sm">{message.headline}</p>
        <p className="text-stone-500 text-xs mt-0.5 leading-relaxed">{message.body}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD ROOT
// ─────────────────────────────────────────────────────────────

export function LifeEventPromptModal({ prompt, onNavigate, onClose }) {
  const { t } = useTranslation('dashboard')
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <p className="font-semibold text-navy-900 text-sm pt-1.5">{t('modals.lifeEvent.title')}</p>
          <button onClick={onClose} className="ml-auto text-stone-300 hover:text-stone-500 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed mb-5">{prompt.message}</p>
        {prompt.cta && (
          <button
            onClick={() => onNavigate(prompt.cta.section)}
            className="w-full btn-aurora text-white text-sm font-semibold py-2.5 rounded-full hover:bg-navy-700 transition-colors"
          >
            {prompt.cta.label}
          </button>
        )}
        <button onClick={onClose} className="w-full mt-2 text-xs text-stone-400 hover:text-stone-600 py-1.5 transition-colors">
          {t('modals.lifeEvent.later')}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EXECUTOR PREVIEW MODAL
// ─────────────────────────────────────────────────────────────

export function ExecutorPreviewModal({ profile, people, accounts, documents, instructions, onClose }) {
  const { t } = useTranslation('dashboard')
  const dateLocale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const executor = people.find(p => p.role?.toLowerCase().includes('executor')) || people[0]
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-navy-950 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-widest">{t('modals.executorPreview.eyebrow')}</p>
            <p className="text-white text-sm font-medium mt-0.5">
              {t('modals.executorPreview.whatTheySee', { name: executor?.name || t('modals.executorPreview.yourExecutor') })}
            </p>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Plan owner */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{t('modals.executorPreview.planOwner')}</p>
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="font-semibold text-navy-900">{profile.full_name}</p>
              <p className="text-xs text-stone-500 mt-0.5">{profile.email}</p>
              {profile.date_of_birth && (
                <p className="text-xs text-stone-400 mt-0.5">
                  {t('modals.executorPreview.dob', { date: new Date(profile.date_of_birth).toLocaleDateString(dateLocale) })}
                </p>
              )}
            </div>
          </div>

          {/* Trusted contacts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {t('modals.executorPreview.trustedContacts', { n: people.length })}
            </p>
            {people.length === 0 ? (
              <p className="text-sm text-stone-400 italic">{t('modals.executorPreview.noContacts')}</p>
            ) : (
              <div className="space-y-2">
                {people.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-navy-700">{p.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900">{p.name}</p>
                      <p className="text-xs text-stone-400 truncate">{t('modals.executorPreview.personMeta', { role: roleLabel(t, p.role), email: p.email })}</p>
                    </div>
                    {/* invite_status VALUES are stored, only the badge label translates. */}
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${p.invite_status === 'accepted' ? 'bg-sage-50 text-sage-700 border-sage-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {p.invite_status === 'accepted' ? t('modals.executorPreview.statusActive') : t('modals.executorPreview.statusPending')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial accounts */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {t('modals.executorPreview.accounts', { n: accounts.length })}
            </p>
            {accounts.length === 0 ? (
              <p className="text-sm text-stone-400 italic">{t('modals.executorPreview.noAccounts')}</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {accounts.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-2">
                    <Landmark size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-navy-800 flex-1">{a.institution}</span>
                    <span className="text-xs text-stone-400">{t(`accounts.category.${a.category}`, { defaultValue: a.category })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key documents */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {t('modals.executorPreview.documents', { n: documents.length })}
            </p>
            {documents.length === 0 ? (
              <p className="text-sm text-stone-400 italic">{t('modals.executorPreview.noDocuments')}</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {documents.map(d => (
                  <div key={d.id} className="flex items-center gap-3 py-2">
                    <FileText size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-navy-800 flex-1">{d.name}</span>
                    <span className="text-xs text-stone-400">{t(`documents.type.${d.doc_type}`, { defaultValue: d.doc_type })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          {instructions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                {t('modals.executorPreview.instructions', { n: instructions.length })}
              </p>
              <div className="divide-y divide-stone-100">
                {instructions.map(i => (
                  <div key={i.id} className="flex items-center gap-3 py-2">
                    <BookOpen size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-navy-800">{i.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-800 leading-relaxed">
              <Trans t={t} i18nKey="modals.executorPreview.footer" components={{ b: <strong /> }} />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────

export const TOUR_STEPS = [
  { id: 'overview', icon: Home,       title: 'Welcome home', body: 'Whenever you sign in, this is your calm overview, everything at a glance, no pressure to do it all at once.' },
  { id: 'accounts', icon: Landmark,   title: 'Your vault', body: 'Your accounts, documents and subscriptions live here, the practical things, gathered safely in one place.' },
  { id: 'people',   icon: Users,      title: 'The people you trust', body: 'Invite family or an executor and choose exactly what each person can see, and only when the time is right. Nothing is shared until you say so.' },
  { id: 'aboutme',  icon: UserCircle, title: 'The part that’s really you', body: 'About Me is the heart of it, your story, your wishes, and messages for the people you love. Come back and add to it whenever something comes to mind.' },
]

export function DashboardTour({ setActiveSection, onClose }) {
  const { t } = useTranslation('dashboard')
  const [step, setStep] = useState(0)
  useEffect(() => {
    setActiveSection(TOUR_STEPS[step].id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step, setActiveSection])
  const s = TOUR_STEPS[step]
  const Icon = s.icon
  const last = step === TOUR_STEPS.length - 1
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-end justify-center sm:justify-end p-4 sm:p-6">
      <div className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 px-6 py-5 animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-navy-950 flex items-center justify-center shrink-0"><Icon size={15} className="text-sage-300" /></div>
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">{t('tour.progress', { step: step + 1, total: TOUR_STEPS.length })}</span>
        </div>
        <h3 className="font-display text-xl text-navy-950 mb-1.5">{t(`tour.steps.${s.id}.title`)}</h3>
        <p className="text-sm text-stone-600 leading-relaxed mb-5">{t(`tour.steps.${s.id}.body`)}</p>
        <div className="flex items-center gap-1.5 mb-5">
          {TOUR_STEPS.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-navy-700' : 'w-1.5 bg-stone-200'}`} />)}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">{t('tour.skip')}</button>
          <div className="flex items-center gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="text-sm text-stone-500 hover:text-navy-800 px-3 py-2">{t('tour.back')}</button>}
            <button onClick={() => last ? onClose() : setStep(step + 1)} className="btn-aurora inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-full">
              {last ? t('tour.done') : <>{t('tour.next')} <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
