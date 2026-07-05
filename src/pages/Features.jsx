import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import {
  ArrowRight, Folder, FileText, ClipboardList, Users, Share2, Heart,
  CreditCard, BarChart3, Lock, ShieldCheck, Bell, BookOpen, CheckCircle2,
  Eye, Clock, AlertTriangle, Key, Globe, RefreshCw, Layers, Zap, Star,
  ChevronDown, ChevronRight, UserCheck, Archive, MessageSquare, UserCircle, Sparkles
} from 'lucide-react'

/* ─── Data (icons & styling only — all copy lives in the "features" i18n namespace) ── */

const coreFeatureMeta = [
  { key: 'aboutMe',       icon: UserCircle,    accent: 'bg-sage-50 border-sage-100',       iconBg: 'bg-sage-100',    iconColor: 'text-sage-700' },
  { key: 'aiAssistant',   icon: Sparkles,      accent: 'bg-navy-50 border-navy-100',       iconBg: 'bg-navy-100',    iconColor: 'text-navy-700' },
  { key: 'accounts',      icon: Folder,        accent: 'bg-blue-50 border-blue-100',       iconBg: 'bg-blue-100',    iconColor: 'text-blue-700' },
  { key: 'documents',     icon: FileText,      accent: 'bg-emerald-50 border-emerald-100', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700' },
  { key: 'instructions',  icon: ClipboardList, accent: 'bg-violet-50 border-violet-100',   iconBg: 'bg-violet-100',  iconColor: 'text-violet-700' },
  { key: 'people',        icon: Users,         accent: 'bg-amber-50 border-amber-100',     iconBg: 'bg-amber-100',   iconColor: 'text-amber-700' },
  { key: 'access',        icon: Share2,        accent: 'bg-rose-50 border-rose-100',       iconBg: 'bg-rose-100',    iconColor: 'text-rose-700' },
  { key: 'wishes',        icon: Heart,         accent: 'bg-pink-50 border-pink-100',       iconBg: 'bg-pink-100',    iconColor: 'text-pink-700' },
  { key: 'messages',      icon: MessageSquare, accent: 'bg-violet-50 border-violet-100',   iconBg: 'bg-violet-100',  iconColor: 'text-violet-700' },
  { key: 'subscriptions', icon: CreditCard,    accent: 'bg-orange-50 border-orange-100',   iconBg: 'bg-orange-100',  iconColor: 'text-orange-700' },
  { key: 'progress',      icon: BarChart3,     accent: 'bg-teal-50 border-teal-100',       iconBg: 'bg-teal-100',    iconColor: 'text-teal-700' },
]

const problemStyles = [
  { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  { icon: Key,           color: 'text-amber-600', bg: 'bg-amber-50' },
  { icon: Clock,         color: 'text-orange-500', bg: 'bg-orange-50' },
  { icon: Globe,         color: 'text-rose-500', bg: 'bg-rose-50' },
]

const securityIcons = [Lock, Eye, BookOpen, ShieldCheck, Bell, RefreshCw]

const whoIcons = [Users, UserCheck, Archive, FileText]

const comparisonFlags = [
  { us: true,  spreadsheet: true,  solicitor: false },
  { us: true,  spreadsheet: false, solicitor: false },
  { us: true,  spreadsheet: false, solicitor: false },
  { us: true,  spreadsheet: false, solicitor: false },
  { us: true,  spreadsheet: true,  solicitor: false },
  { us: true,  spreadsheet: false, solicitor: true  },
  { us: true,  spreadsheet: true,  solicitor: false },
  { us: true,  spreadsheet: false, solicitor: false },
  { us: true,  spreadsheet: true,  solicitor: false },
]

const readinessDone = [true, true, true, true, false, false]

/* ─── Component ────────────────────────────────────────────────────────── */

export default function Features() {
  useReveal()
  const [openFeature, setOpenFeature] = useState(null)
  const { t, i18n } = useTranslation('features')

  const pageUrl = `https://www.everstead.care${i18n.language === 'fr' ? '/fr' : ''}/features`

  const coreFeatures = coreFeatureMeta.map(meta => ({
    ...meta,
    ...t(`sections.core.features.${meta.key}`, { returnObjects: true }),
  }))
  const problemItems = t('sections.problem.items', { returnObjects: true })
    .map((text, i) => ({ ...problemStyles[i], text }))
  const securityPoints = t('sections.security.points', { returnObjects: true })
    .map((point, i) => ({ ...point, icon: securityIcons[i] }))
  const whoItsFor = t('sections.who.items', { returnObjects: true })
    .map((item, i) => ({ ...item, icon: whoIcons[i] }))
  const comparison = t('sections.comparison.rows', { returnObjects: true })
    .map((point, i) => ({ point, ...comparisonFlags[i] }))
  const testimonials = t('testimonials.items', { returnObjects: true })
  const readinessChecklist = t('sections.readiness.checklist', { returnObjects: true })
    .map((label, i) => ({ label, done: readinessDone[i] }))

  return (
    <>
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="description" content={t('meta.description')} />
      <link rel="canonical" href={pageUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={t('meta.title')} />
      <meta property="og:description" content={t('meta.description')} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content="https://www.everstead.care/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
    </Helmet>
    <div className="bg-stone-50 pt-24">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5">{t('hero.eyebrow')}</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            {t('hero.title')}
          </h1>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="btn-aurora inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full"
            >
              {t('hero.ctaPrimary')} <ArrowRight size={15} />
            </Link>
            <Link to="/how-it-works" className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-6 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-colors">
              {t('hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problem bar ───────────────────────────────────────────────── */}
      <section className="bg-white border-y border-stone-100 py-8">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-stone-400 mb-6">{t('sections.problem.eyebrow')}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {problemItems.map(({ icon: Icon, text, color, bg }) => (
              <div key={text} className={`flex items-center gap-3 rounded-xl border border-stone-100 ${bg} p-4`}>
                <Icon size={18} className={`flex-shrink-0 ${color}`} />
                <span className="text-sm font-medium text-stone-700">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core features deep-dive ───────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('sections.core.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              {t('sections.core.title')}
            </h2>
            <p className="mt-4 text-stone-500 max-w-xl mx-auto text-sm leading-relaxed">
              {t('sections.core.subtitle')}
            </p>
          </div>

          <div className="space-y-6">
            {coreFeatures.map(({ icon: Icon, tag, title, headline, body, bullets, accent, iconBg, iconColor, ai }, i) => (
              <div
                key={title}
                className={`reveal reveal-delay-${Math.min(i + 1, 5)} rounded-2xl border bg-white overflow-hidden transition-all`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setOpenFeature(openFeature === i ? null : i)}
                >
                  <div className="flex items-center gap-5 p-6">
                    <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={22} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${iconColor} mb-0.5 block`}>{tag}</span>
                      <h3 className="font-semibold text-navy-950 text-base">{title}</h3>
                      <p className="text-sm text-stone-500 mt-0.5 truncate">{headline}</p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-stone-400 flex-shrink-0 transition-transform duration-200 ${openFeature === i ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {openFeature === i && (
                  <div className={`border-t px-6 pb-6 pt-5 grid lg:grid-cols-2 gap-6 ${accent}`}>
                    <div>
                      <p className="font-semibold text-navy-900 text-base mb-3">{headline}</p>
                      <p className="text-stone-600 text-sm leading-relaxed">{body}</p>
                      {ai && (
                        <p style={{ fontSize: '12px', color: '#4c7d47', marginTop: '8px', fontStyle: 'italic' }}>{ai}</p>
                      )}
                    </div>
                    <ul className="space-y-2.5">
                      {bullets.map(b => (
                        <li key={b} className="flex items-start gap-2.5">
                          <CheckCircle2 size={15} className={`mt-0.5 flex-shrink-0 ${iconColor}`} />
                          <span className="text-sm text-stone-700">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visual feature grid ────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('sections.security.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance">
              {t('sections.security.title')}
            </h2>
            <p className="mt-4 text-stone-400 max-w-xl mx-auto text-sm leading-relaxed">
              {t('sections.security.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {securityPoints.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className={`reveal reveal-delay-${Math.min(i + 1, 5)} bg-white/5 border border-white/10 rounded-xl p-6`}>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-sage-300" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1.5">{label}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center reveal">
            <Link to="/security" className="inline-flex items-center gap-2 text-stone-300 text-sm font-medium hover:text-white transition-colors">
              {t('sections.security.link')} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Who it's for ───────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('sections.who.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 text-balance">
              {t('sections.who.title')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whoItsFor.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`reveal reveal-delay-${i + 1} bg-white border border-stone-200 rounded-2xl p-6`}>
                <div className="w-11 h-11 rounded-2xl bg-navy-50 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-navy-700" />
                </div>
                <h3 className="font-semibold text-navy-950 text-sm mb-2">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-stone-50 border-y border-stone-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('sections.comparison.eyebrow')}</p>
            <h2 className="font-display text-4xl font-light text-navy-950 text-balance">
              {t('sections.comparison.title')}
            </h2>
            <p className="mt-4 text-stone-500 text-sm max-w-xl mx-auto leading-relaxed">
              {t('sections.comparison.subtitle')}
            </p>
          </div>

          <div className="reveal bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="grid grid-cols-4 border-b border-stone-100 bg-stone-50">
              <div className="p-4 col-span-1" />
              {[
                { label: t('sections.comparison.columns.everstead'), highlight: true },
                { label: t('sections.comparison.columns.spreadsheet'), highlight: false },
                { label: t('sections.comparison.columns.solicitor'), highlight: false },
              ].map(({ label, highlight }) => (
                <div key={label} className="p-4 text-center" style={highlight ? { background: 'linear-gradient(100deg, #2d5082 0%, #6f6bc6 50%, #6e9b6a 100%)' } : undefined}>
                  <span className={`text-xs font-semibold ${highlight ? 'text-white' : 'text-stone-500'}`}>{label}</span>
                </div>
              ))}
            </div>
            {comparison.map(({ point, us, spreadsheet, solicitor }, i) => (
              <div key={point} className={`grid grid-cols-4 ${i < comparison.length - 1 ? 'border-b border-stone-100' : ''}`}>
                <div className="p-4 text-sm text-stone-600">{point}</div>
                {[us, spreadsheet, solicitor].map((val, j) => (
                  <div key={j} className={`p-4 flex items-center justify-center ${j === 0 ? 'bg-navy-950/[0.03]' : ''}`}>
                    {val
                      ? <CheckCircle2 size={16} className={j === 0 ? 'text-sage-600' : 'text-stone-400'} />
                      : <span className="w-4 h-0.5 bg-stone-200 rounded-full" />
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('testimonials.eyebrow')}</p>
            <h2 className="font-display text-4xl font-light text-navy-950">{t('testimonials.title')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, name, role }, i) => (
              <div key={name} className={`reveal reveal-delay-${i + 1} bg-white border border-stone-200 rounded-2xl p-7`}>
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-stone-700 text-sm leading-relaxed mb-6 italic">"{quote}"</p>
                <div>
                  <p className="font-semibold text-navy-900 text-sm">{name}</p>
                  <p className="text-stone-500 text-xs mt-0.5">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Readiness callout ──────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-white border-y border-stone-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="reveal aurora-field aurora-dim rounded-3xl border border-navy-800 p-8 lg:p-12 grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: score mock */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-400 font-medium">{t('sections.readiness.scoreLabel')}</p>
                  <p className="text-4xl font-semibold text-white mt-1">{t('sections.readiness.scoreValue')}</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <defs>
                      <linearGradient id="featReadiness" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#2d5082" />
                        <stop offset="0.5" stopColor="#6f6bc6" />
                        <stop offset="1" stopColor="#6e9b6a" />
                      </linearGradient>
                    </defs>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="url(#featReadiness)" strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 26 * 0.76} ${2 * Math.PI * 26 * 0.24}`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                {readinessChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-sage-500' : 'bg-white/10 border border-white/20'}`}>
                      {item.done && <CheckCircle2 size={9} className="text-white" />}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-stone-300' : 'text-stone-500'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-stone-400">{t('sections.readiness.lastUpdated')}</span>
                <span className="text-xs text-sage-400 font-medium">{t('sections.readiness.attention')}</span>
              </div>
            </div>
            {/* Right: copy */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('sections.readiness.eyebrow')}</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-white leading-tight text-balance">
                {t('sections.readiness.title')}
              </h2>
              <p className="mt-4 text-stone-300 text-sm leading-relaxed">
                {t('sections.readiness.body')}
              </p>
              <ul className="mt-6 space-y-2.5">
                {t('sections.readiness.bullets', { returnObjects: true }).map(b => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-stone-300">
                    <Zap size={13} className="text-sage-400 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Legal clarity ──────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-stone-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 reveal">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3">{t('sections.legal.eyebrow')}</p>
            <h2 className="font-display text-2xl font-light text-navy-950">
              {t('sections.legal.title')}
            </h2>
            <p className="mt-4 text-stone-700 text-sm leading-relaxed">
              {t('sections.legal.body1')} <strong>{t('sections.legal.bodyNot')}</strong> {t('sections.legal.body2')}
            </p>
            <div className="mt-5 flex flex-wrap gap-4">
              <Link to="/terms" className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900 transition-colors">
                {t('sections.legal.termsLink')} <ArrowRight size={14} />
              </Link>
              <Link to="/security" className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900 transition-colors">
                {t('sections.legal.securityLink')} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-6 text-center reveal">
          <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance leading-tight">
            {t('cta.title')}
          </h2>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed">
            {t('cta.subtitle')}
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="btn-aurora inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full"
            >
              {t('cta.ctaPrimary')} <ArrowRight size={16} />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-7 py-3.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">
              {t('cta.ctaSecondary')}
            </Link>
          </div>
          <p className="mt-5 text-xs text-stone-500">{t('cta.footnote')}</p>
        </div>
      </section>

    </div>
    </>
  )
}
