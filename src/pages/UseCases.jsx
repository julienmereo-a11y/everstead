import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import {
  ArrowRight, Users, Heart, User, BookOpen, Briefcase,
  CheckCircle2, XCircle, FileText, Bell, Lock, ClipboardList,
  Shield, Eye, Star, Clock, FolderOpen,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Data (icons, colors, and hrefs only — all visible text lives in the
// "useCases" i18n namespace)
// ─────────────────────────────────────────────────────────────────────────────

const cases = {
  families: {
    icon: Users,
    color: 'navy',
    featureIcons: [FolderOpen, ClipboardList, Bell],
  },
  parents: {
    icon: Heart,
    color: 'sage',
    featureIcons: [Heart, Shield, ClipboardList],
  },
  'aging-adults': {
    icon: User,
    color: 'stone',
    featureIcons: [Lock, Bell, Eye],
  },
  executors: {
    icon: BookOpen,
    color: 'amber',
    featureIcons: [ClipboardList, FolderOpen, Shield],
  },
  advisors: {
    icon: Briefcase,
    color: 'indigo',
    featureIcons: [Users, Eye, Briefcase],
    ctaHref: '/book-demo',
  },
}

const allCases = ['families', 'parents', 'aging-adults', 'executors', 'advisors']

const roleIcons = [Eye, Users, BookOpen, Briefcase]

// ─────────────────────────────────────────────────────────────────────────────
// Individual use-case page
// ─────────────────────────────────────────────────────────────────────────────

function UseCasePage({ slug }) {
  const { t, i18n } = useTranslation('useCases')
  const data = cases[slug]
  if (!data) return <div className="py-40 text-center text-stone-500">{t('sections.notFound')}</div>

  const { icon: Icon, ctaHref } = data
  const title = t(`personas.${slug}.title`)
  const hero = t(`personas.${slug}.hero`)
  const tagline = t(`personas.${slug}.tagline`)
  const body = t(`personas.${slug}.body`)
  const scenario = t(`personas.${slug}.scenario`)
  const painPoints = t(`personas.${slug}.painPoints`, { returnObjects: true })
  const benefits = t(`personas.${slug}.benefits`, { returnObjects: true })
  const features = t(`personas.${slug}.features`, { returnObjects: true })
    .map((f, i) => ({ ...f, icon: data.featureIcons[i] }))
  const quote = t(`quotes.${slug}.text`)
  const quoteAuthor = t(`quotes.${slug}.author`)
  const ctaText = t(`cta.${slug}.text`)
  const ctaNote = t(`cta.${slug}.note`)

  const baseUrl = `https://www.everstead.care${i18n.language === 'fr' ? '/fr' : ''}`

  useReveal()

  return (
    <>
    <Helmet>
      <title>{t('meta.personaTitle', { title })}</title>
      <meta name="description" content={`${tagline} ${body?.slice(0, 120) ?? ''}`} />
      <link rel="canonical" href={`${baseUrl}/use-cases/${slug}`} />
      <meta property="og:title" content={t('meta.personaTitle', { title })} />
      <meta property="og:description" content={tagline} />
      <meta property="og:url" content={`${baseUrl}/use-cases/${slug}`} />
    </Helmet>
    <HreflangLinks path="/use-cases" />
    <div className="bg-stone-50 pt-24">

      {/* Hero */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-6 animate-fade-in">
            <Icon size={28} className="text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">{title}</p>
          <h1 className="font-display text-4xl lg:text-5xl xl:text-6xl font-light text-white leading-tight text-balance animate-fade-up mb-5">
            {hero}
          </h1>
          <p className="text-stone-300 text-lg font-light animate-fade-in">{tagline}</p>
        </div>
      </section>

      {/* Scenario + pain points */}
      <section className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">{t('sections.situation')}</p>
            <h2 className="font-display text-2xl lg:text-3xl font-light text-navy-950 leading-snug mb-6">{body}</h2>
            <p className="text-stone-600 leading-relaxed text-base italic border-l-2 border-sage-300 pl-5">
              {scenario}
            </p>
          </div>
          <div className="reveal reveal-delay-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">{t('sections.withoutIt')}</p>
            <ul className="space-y-3">
              {painPoints.map(p => (
                <li key={p} className="flex items-start gap-3">
                  <XCircle size={17} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-stone-700 text-sm leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* What Everstead provides */}
      <section className="py-16 lg:py-20 bg-white border-y border-stone-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-xl mb-10 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-600 mb-3">{t('sections.withEverstead')}</p>
            <h2 className="font-display text-2xl lg:text-3xl font-light text-navy-950">{t('sections.whatChanges')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <div key={b} className={`reveal reveal-delay-${i + 1} flex items-start gap-3 bg-stone-50 rounded-xl border border-stone-100 p-5`}>
                <CheckCircle2 size={17} className="text-sage-500 flex-shrink-0 mt-0.5" />
                <span className="text-stone-700 text-sm leading-relaxed">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature spotlight */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-10 reveal">{t('sections.keyFeatures', { name: t(`personas.${slug}.shortName`) })}</p>
          <div className="grid lg:grid-cols-3 gap-8">
            {features.map(({ icon: FIcon, title: fTitle, body: fBody }, i) => (
              <div key={fTitle} className={`reveal reveal-delay-${i + 1}`}>
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                  <FIcon size={20} className="text-navy-700" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2 text-base">{fTitle}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{fBody}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-16 lg:py-20 bg-sage-50 border-y border-sage-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <div className="flex justify-center gap-0.5 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill="currentColor" className="text-amber-400" />
            ))}
          </div>
          <p className="font-display text-xl lg:text-2xl font-light text-navy-950 italic leading-relaxed text-balance">{quote}</p>
          <p className="mt-5 text-stone-500 text-sm">{quoteAuthor}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-4 text-balance">
            {t('cta.shared.readyTitle')}
          </h2>
          <p className="text-stone-500 mb-8 text-base leading-relaxed">
            {t('cta.shared.readyBody')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={ctaHref || '/get-started'}
              className="btn-aurora inline-flex items-center justify-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full"
            >
              {ctaText} <ArrowRight size={15} />
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center justify-center gap-2 bg-white text-navy-800 font-semibold text-sm px-7 py-3.5 rounded-full border border-stone-200 hover:border-navy-300 hover:bg-stone-50 transition-colors"
            >
              {t('cta.shared.seeHowItWorks')}
            </Link>
          </div>
          {ctaNote && (
            <p className="mt-4 text-stone-400 text-xs">{ctaNote}</p>
          )}
        </div>
      </section>

      {/* Other use cases */}
      <section className="py-16 lg:py-20 bg-white border-t border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="font-display text-xl font-light text-navy-950 mb-7 reveal">{t('sections.exploreOther')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allCases.filter(c => c !== slug).map((c, i) => {
              const d = cases[c]
              const CIcon = d.icon
              return (
                <Link
                  key={c}
                  to={`/use-cases/${c}`}
                  className={`reveal reveal-delay-${i + 1} group block rounded-xl border border-stone-200 bg-stone-50 p-5 hover:border-navy-300 hover:bg-navy-50 transition-all`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center mb-3 group-hover:border-navy-200 transition-colors">
                    <CIcon size={15} className="text-navy-600" />
                  </div>
                  <span className="font-semibold text-sm text-navy-900 group-hover:text-navy-700 block mb-1">{t(`personas.${c}.title`)}</span>
                  <span className="text-xs text-navy-600 font-medium group-hover:gap-2 transition-all">{t('sections.explore')}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Index page
// ─────────────────────────────────────────────────────────────────────────────

function UseCasesIndex() {
  const { t, i18n } = useTranslation('useCases')
  useReveal()
  const baseUrl = `https://www.everstead.care${i18n.language === 'fr' ? '/fr' : ''}`
  return (
    <>
    <Helmet>
      <title>{t('meta.index.title')}</title>
      <meta name="description" content={t('meta.index.description')} />
      <link rel="canonical" href={`${baseUrl}/use-cases`} />
      <meta property="og:title" content={t('meta.index.ogTitle')} />
      <meta property="og:description" content={t('meta.index.ogDescription')} />
      <meta property="og:url" content={`${baseUrl}/use-cases`} />
    </Helmet>
    <div className="bg-stone-50 pt-24">

      {/* Hero */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">{t('hero.eyebrow')}</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-stone-300 text-lg font-light max-w-2xl mx-auto animate-fade-in">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Stats row */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8 grid grid-cols-3 divide-x divide-stone-100">
          {t('stats', { returnObjects: true }).map(({ value, label }) => (
            <div key={label} className="text-center px-6 reveal">
              <p className="font-display text-3xl font-light text-navy-950">{value}</p>
              <p className="text-stone-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use case cards */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-6">
            {allCases.map((slug, i) => {
              const data = cases[slug]
              const Icon = data.icon
              return (
                <Link
                  key={slug}
                  to={`/use-cases/${slug}`}
                  className={`reveal reveal-delay-${i + 1} group block bg-white border border-stone-200 rounded-2xl p-7 hover:border-navy-300 hover:shadow-md transition-all`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                      <Icon size={20} className="text-navy-700" />
                    </div>
                    <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest mt-1">{t('index.learnMore')}</span>
                  </div>
                  <h2 className="font-semibold text-navy-900 mb-2 group-hover:text-navy-700 transition-colors text-lg">{t(`personas.${slug}.title`)}</h2>
                  <p className="text-stone-500 text-sm leading-relaxed mb-4">{t(`personas.${slug}.hero`)}</p>
                  <p className="text-stone-400 text-xs italic leading-relaxed border-t border-stone-100 pt-4">{t(`personas.${slug}.tagline`)}</p>
                </Link>
              )
            })}

            {/* CTA card */}
            <div className="reveal aurora-field aurora-dim rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">{t('index.card.eyebrow')}</p>
                <h3 className="font-display text-xl font-light text-white mb-3">
                  {t('index.card.title')}
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed">
                  {t('index.card.body')}
                </p>
              </div>
              <Link
                to="/get-started"
                className="btn-aurora inline-flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-full mt-7 self-start"
              >
                {t('cta.start')} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it all fits together */}
      <section className="py-16 lg:py-20 bg-white border-y border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="reveal">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">{t('index.fit.eyebrow')}</p>
              <h2 className="font-display text-3xl font-light text-navy-950 leading-snug mb-6">
                {t('index.fit.title')}
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">
                {t('index.fit.body')}
              </p>
              <Link to="/how-it-works" className="inline-flex items-center gap-2 text-navy-700 font-semibold text-sm hover:text-navy-900 transition-colors">
                {t('index.fit.link')} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="reveal reveal-delay-1 space-y-3">
              {t('index.fit.roles', { returnObjects: true }).map(({ role, desc }, i) => {
                const RIcon = roleIcons[i]
                return (
                  <div key={role} className="flex items-start gap-4 bg-stone-50 border border-stone-100 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                      <RIcon size={15} className="text-navy-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy-900 text-sm mb-0.5">{role}</p>
                      <p className="text-stone-500 text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-4 text-balance">
            {t('cta.bottom.title')}
          </h2>
          <p className="text-stone-500 mb-8 leading-relaxed">
            {t('cta.bottom.body')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/get-started" className="btn-aurora inline-flex items-center justify-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full">
              {t('cta.start')} <ArrowRight size={15} />
            </Link>
            <Link to="/book-demo" className="inline-flex items-center justify-center gap-2 bg-white text-navy-800 font-semibold text-sm px-7 py-3.5 rounded-full border border-stone-200 hover:border-navy-300 hover:bg-stone-50 transition-colors">
              {t('cta.bookDemo')}
            </Link>
          </div>
        </div>
      </section>
    </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export default function UseCases() {
  const { slug } = useParams()
  if (slug) return <UseCasePage slug={slug} />
  return <UseCasesIndex />
}
