import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useReveal } from '../components/useReveal'
import {
  Users, ShieldCheck, BarChart2, Briefcase, ArrowRight,
  CheckCircle2, Building2, FileText, Clock, Shield, BookOpen
} from 'lucide-react'
import EmailCaptureCard from '../components/EmailCaptureCard'
import enForAdvisers from '../i18n/locales/en/forAdvisers.json'
import frForAdvisers from '../i18n/locales/fr/forAdvisers.json'

// The "forAdvisers" namespace is registered here (not in src/i18n/index.js) so
// the JSON ships with this lazy-loaded page instead of the main bundle.
if (!i18n.hasResourceBundle('en', 'forAdvisers')) {
  i18n.addResourceBundle('en', 'forAdvisers', enForAdvisers)
  i18n.addResourceBundle('fr', 'forAdvisers', frForAdvisers)
}

// ─────────────────────────────────────────────────────────────────────────────
// NON-TEXT DATA (icons, ids, analytics sources — all visible copy lives in the
// "forAdvisers" i18n namespace, in the same array order as these)
// ─────────────────────────────────────────────────────────────────────────────

const LEAD_MAGNET_META = [
  { source: 'adviser-inheritance-conversations', icon: Users },
  { source: 'adviser-pre-bereavement-checklist', icon: FileText },
  { source: 'adviser-positioning-playbook', icon: BookOpen },
]

const BENEFIT_ICONS = [Briefcase, Users, BarChart2, ShieldCheck, FileText, ShieldCheck]

const STEP_NUMS = ['01', '02', '03', '04']

const TRUST_ICONS = [Shield, ShieldCheck, CheckCircle2, Briefcase, Building2]

export default function ForAdvisors() {
  useReveal()
  const [tab, setTab] = useState('ifa')
  const { t, i18n: i18nInstance } = useTranslation('forAdvisers')

  const localePrefix = i18nInstance.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/for-advisers`

  const trustSignals = t('trustSignals', { returnObjects: true })
    .map((label, i) => ({ icon: TRUST_ICONS[i], label }))

  const ifaBullets = t('problem.ifaBullets', { returnObjects: true })
  const solicitorBullets = t('problem.solicitorBullets', { returnObjects: true })

  const benefits = t('benefits.items', { returnObjects: true })
    .map((item, i) => ({ ...item, icon: BENEFIT_ICONS[i] }))

  const steps = t('steps.items', { returnObjects: true })
    .map((item, i) => ({ ...item, num: STEP_NUMS[i] }))

  const useCases = t('useCases.items', { returnObjects: true })

  const adviserLeadMagnets = t('resources.items', { returnObjects: true })
    .map((item, i) => ({ ...item, ...LEAD_MAGNET_META[i] }))

  const scrollToBenefits = (e) => {
    e.preventDefault()
    document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.ogTitle')} />
        <meta property="og:description" content={t('meta.ogDescription')} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>
      <HreflangLinks path="/for-advisers" />

      <div className="bg-stone-50 min-h-screen">

        {/* Hero — extends under the fixed nav (no top padding on wrapper);
            internal pt-44 lifts the content below the 96px nav strip */}
        <section className="pt-44 pb-20 lg:pt-52 lg:pb-28 grain relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg" />
          <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">{t('hero.eyebrow')}</p>
            <h1 className="font-display text-4xl lg:text-6xl font-light text-white leading-tight text-balance">
              {t('hero.title')}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              {t('hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book-demo" className="btn-aurora inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-full text-sm font-semibold transition-transform hover:-translate-y-0.5">
                {t('hero.bookDemo')} <ArrowRight size={14} />
              </Link>
              <a href="#benefits" onClick={scrollToBenefits} className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors">
                {t('hero.seeHow')}
              </a>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="bg-white border-b border-stone-100 py-5">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {trustSignals.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-stone-400">
                  <Icon size={14} className="shrink-0" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The problem */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 reveal">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">{t('problem.eyebrow')}</p>
                <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 text-balance leading-tight mb-6">
                  {t('problem.title')}
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-4">
                  {t('problem.p1')}
                </p>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {t('problem.p2')}
                </p>
              </div>
              <div>
                {/* Tab toggle */}
                <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-4 w-fit">
                  <button
                    onClick={() => setTab('ifa')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'ifa' ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-navy-800'}`}
                  >
                    {t('problem.tabIfa')}
                  </button>
                  <button
                    onClick={() => setTab('solicitor')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'solicitor' ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-navy-800'}`}
                  >
                    {t('problem.tabSolicitor')}
                  </button>
                </div>
                <div className="space-y-3">
                  {(tab === 'ifa' ? ifaBullets : solicitorBullets).map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-2 shrink-0" />
                      <p className="text-sm text-stone-600 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section id="benefits" className="py-20 lg:py-28 bg-stone-50">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">{t('benefits.eyebrow')}</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">{t('benefits.title')}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {benefits.map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="reveal bg-white rounded-2xl p-7 border border-stone-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                    <Icon size={18} className="text-navy-700" />
                  </div>
                  <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            {/* Ongoing strip */}
            <div className="reveal bg-white rounded-2xl px-7 py-5 border border-stone-100 shadow-sm flex items-start gap-5">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-navy-700" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-900 text-sm mb-1">{t('benefits.ongoing.title')}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{t('benefits.ongoing.desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">{t('steps.eyebrow')}</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">{t('steps.title')}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {steps.map(({ num, title, desc }, i) => (
                <div key={i} className="reveal p-7 rounded-2xl bg-stone-50 border border-stone-100">
                  <p className="text-3xl font-display font-light text-stone-200 mb-3">{num}</p>
                  <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="py-20 lg:py-28 bg-stone-50">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">{t('useCases.eyebrow')}</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">{t('useCases.title')}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {useCases.map(({ title, desc }, i) => (
                <div key={i} className="reveal bg-white rounded-2xl p-7 border border-stone-100">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={15} className="text-sage-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                      <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lead magnets — written content for advisers */}
        <section id="resources" className="py-20 bg-stone-50 border-t border-stone-100">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-600 mb-4">{t('resources.eyebrow')}</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 leading-tight max-w-2xl mx-auto">
                {t('resources.title')}
              </h2>
              <p className="mt-4 text-stone-500 text-sm leading-relaxed max-w-xl mx-auto">
                {t('resources.body')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 reveal">
              {adviserLeadMagnets.map((lm) => (
                <AdviserLeadMagnetCard key={lm.source} {...lm} />
              ))}
            </div>
          </div>
        </section>

        {/* Early access — replaces testimonial */}
        <section className="py-20 bg-white">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center reveal">
            <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-5">
              {t('earlyAccess.title')}
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed mb-8">
              {t('earlyAccess.body')}
            </p>
            <Link to="/book-demo" className="inline-flex items-center justify-center gap-2 btn-aurora text-white px-6 py-3 rounded-full text-sm font-semibold transition-transform hover:-translate-y-0.5">
              {t('earlyAccess.cta')} <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Adviser plan detail */}
        <section className="py-20 lg:py-28 bg-navy-50">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 reveal">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">{t('plan.eyebrow')}</p>
                <h2 className="font-display text-3xl font-light text-navy-950 mb-6 leading-tight">
                  {t('plan.title')}
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  {t('plan.body')}
                </p>
                <div className="space-y-3">
                  {t('plan.features', { returnObjects: true }).map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 size={15} className="text-sage-500 shrink-0" />
                      <span className="text-sm text-stone-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm">
                <h3 className="font-semibold text-navy-900 mb-2">{t('plan.card.title')}</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-6">
                  {t('plan.card.body')}
                </p>
                <Link
                  to="/book-demo"
                  className="w-full inline-flex items-center justify-center gap-2 btn-aurora text-white px-6 py-3 rounded-full text-sm font-semibold transition-transform hover:-translate-y-0.5"
                >
                  {t('plan.card.cta')} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 bg-white">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center reveal">
            <h2 className="font-display text-3xl font-light text-navy-950 mb-4">
              {t('bottom.title')}
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
              {t('bottom.body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book-demo" className="inline-flex items-center justify-center gap-2 btn-aurora text-white px-6 py-3 rounded-full text-sm font-semibold transition-transform hover:-translate-y-0.5">
                {t('bottom.bookDemo')} <ArrowRight size={14} />
              </Link>
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 border border-stone-200 text-navy-900 px-6 py-3 rounded-full text-sm font-semibold hover:bg-stone-50 transition-colors">
                {t('bottom.contact')}
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  AdviserLeadMagnetCard — collapsed card + inline email capture on expand
// ─────────────────────────────────────────────────────────────────────────────
function AdviserLeadMagnetCard({ source, icon: Icon, label, title, summary, buttonLabel }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation('forAdvisers')

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-sage-50 text-sage-700 flex items-center justify-center">
          <Icon size={17} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">{label}</p>
      </div>
      <h3 className="font-display text-lg text-navy-950 leading-snug mb-3">{title}</h3>
      <p className="text-sm text-stone-600 leading-relaxed mb-5 flex-1">{summary}</p>

      {open ? (
        <EmailCaptureCard
          source={source}
          title={t('resources.emailTitle')}
          subtitle={t('resources.emailSubtitle')}
          buttonLabel={buttonLabel}
        />
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="btn-aurora mt-auto inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-transform hover:-translate-y-0.5"
        >
          {buttonLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
