import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import {
  ArrowRight, CheckCircle2, ChevronDown,
  Folder, Users, ClipboardList, Bell,
  Lock, Shield, Eye, FileText, Heart,
  Clock, Star,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// NON-TEXT DATA (icons, ids, styles — all visible copy lives in the
// "howItWorks" i18n namespace)
// ─────────────────────────────────────────────────────────────────────────────

const STEP_META = [
  { number: '01', id: 'step-1', icon: Folder },
  { number: '02', id: 'step-2', icon: FileText },
  { number: '03', id: 'step-3', icon: Users },
  { number: '04', id: 'step-4', icon: ClipboardList },
]

const PREVIEW_ITEM_DONE = [true, true, true, false]

const FAMILY_POINT_ICONS = [Eye, ClipboardList, Bell, Shield]

const FAMILY_CATEGORY_ICONS = [Folder, FileText, Heart, Lock]

const TIME_CARD_STYLES = [
  { color: 'bg-navy-50 border-navy-200', textColor: 'text-navy-700' },
  { color: 'bg-sage-50 border-sage-200', textColor: 'text-sage-700' },
  { color: 'bg-stone-100 border-stone-200', textColor: 'text-stone-600' },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function HowItWorks() {
  useReveal()
  const { t, i18n } = useTranslation('howItWorks')

  const localePrefix = i18n.language === 'fr' ? '/fr' : ''
  const pageUrl = `https://www.everstead.care${localePrefix}/how-it-works`

  const steps = STEP_META.map((meta, i) => ({
    ...meta,
    label: t(`steps.${i}.label`),
    title: t(`steps.${i}.title`),
    body: t(`steps.${i}.body`),
    bullets: t(`steps.${i}.bullets`, { returnObjects: true }),
    preview: {
      title: t(`steps.${i}.preview.title`),
      items: t(`steps.${i}.preview.items`, { returnObjects: true })
        .map((item, j) => ({ ...item, done: PREVIEW_ITEM_DONE[j] })),
      cta: t(`steps.${i}.preview.cta`),
    },
  }))

  const heroStats = t('hero.stats', { returnObjects: true })

  const familyPoints = t('familyView.points', { returnObjects: true })
    .map((text, i) => ({ icon: FAMILY_POINT_ICONS[i], text }))

  const familyCategories = t('familyView.mockup.categories', { returnObjects: true })
    .map((cat, i) => ({ ...cat, icon: FAMILY_CATEGORY_ICONS[i], shared: true }))

  const timeCards = t('timeBreakdown.cards', { returnObjects: true })
    .map((card, i) => ({ ...card, ...TIME_CARD_STYLES[i] }))

  const faqs = t('faq.items', { returnObjects: true })

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: t('schema.howToName'),
    description: t('schema.howToDescription'),
    totalTime: 'PT1H',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.body,
      url: `${pageUrl}#${s.id}`,
    })),
  }

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
      <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
      <script type="application/ld+json">{JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      })}</script>
    </Helmet>
    <HreflangLinks path="/how-it-works" />
    <div className="bg-stone-50 pt-24">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">
            {t('hero.eyebrow')}
          </p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            {t('hero.titleLine1')}<br className="hidden lg:block" /> {t('hero.titleLine2')}
          </h1>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">
            {t('hero.subtitle')}
          </p>

          {/* Time / effort stats */}
          <div className="mt-12 inline-grid grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10 animate-fade-up animate-delay-200">
            {heroStats.map(({ value, label }) => (
              <div key={label} className="bg-white/5 px-8 py-5 text-center">
                <p className="font-display text-2xl font-light text-white">{value}</p>
                <p className="text-xs text-stone-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STEP INDICATOR ────────────────────────────────────────── */}
      <div className="bg-navy-950 border-b border-white/5 sticky top-16 z-10 hidden lg:block">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-center gap-0">
            {steps.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-3 px-6 py-4 text-sm text-stone-400 hover:text-white transition-colors group"
              >
                <span className="w-6 h-6 rounded-full border border-stone-600 group-hover:border-sage-400 flex items-center justify-center text-xs font-bold transition-colors">
                  {i + 1}
                </span>
                <span className="font-medium">{s.label}</span>
                {i < steps.length - 1 && (
                  <ArrowRight size={12} className="ml-3 text-stone-600" />
                )}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── STEPS ─────────────────────────────────────────────────── */}
      {steps.map((step, i) => {
        const isEven = i % 2 === 0
        return (
          <section
            key={step.id}
            id={step.id}
            className={`py-24 lg:py-32 ${isEven ? 'bg-stone-50' : 'bg-white'} border-b border-stone-100`}
          >
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
              <div className={`grid lg:grid-cols-2 gap-16 items-center ${!isEven ? 'lg:[&>*:first-child]:order-2' : ''}`}>

                {/* Copy */}
                <div className="reveal">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="font-display text-5xl font-light text-stone-200 leading-none">{step.number}</span>
                    <div className="w-8 h-px bg-stone-300" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-navy-500">{step.label}</span>
                  </div>

                  <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 leading-snug text-balance mb-5">
                    {step.title}
                  </h2>

                  <p className="text-stone-600 leading-relaxed mb-8">
                    {step.body}
                  </p>

                  <ul className="space-y-2.5">
                    {step.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2.5">
                        <CheckCircle2 size={15} className="text-sage-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-stone-600">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Preview card */}
                <div className="reveal reveal-delay-1">
                  <div className="bg-navy-950 rounded-2xl overflow-hidden shadow-2xl border border-navy-800">
                    {/* Card header */}
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                      </div>
                      <div className="flex-1 mx-3 bg-white/5 rounded-md px-3 py-1 text-xs text-stone-500">
                        everstead.care/dashboard
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-5">
                        <p className="text-sm font-semibold text-white">{step.preview.title}</p>
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                          <step.icon size={13} className="text-stone-400" />
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {step.preview.items.map((item, j) => (
                          <div
                            key={j}
                            className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all ${
                              item.done
                                ? 'bg-white/5 border border-white/10'
                                : 'bg-white/[0.02] border border-dashed border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                item.done ? 'bg-sage-500' : 'border border-white/20'
                              }`}>
                                {item.done && <CheckCircle2 size={10} className="text-white" />}
                              </div>
                              <span className={`text-sm ${item.done ? 'text-stone-300' : 'text-stone-500'}`}>
                                {item.label}
                              </span>
                            </div>
                            {item.tag && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                item.done
                                  ? 'bg-white/10 text-stone-400'
                                  : 'bg-white/5 text-stone-600'
                              }`}>
                                {item.tag}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <button className="mt-4 w-full text-left text-xs text-sage-400 font-medium px-4 py-2.5 rounded-xl border border-dashed border-sage-800 hover:border-sage-600 transition-colors">
                        {step.preview.cta}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
        )
      })}

      {/* ── WHAT YOUR FAMILY SEES ─────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5">{t('familyView.eyebrow')}</p>
              <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance leading-tight mb-6">
                {t('familyView.title')}
              </h2>
              <p className="text-stone-300 leading-relaxed mb-8">
                {t('familyView.body')}
              </p>
              <ul className="space-y-4">
                {familyPoints.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-sage-400" />
                    </div>
                    <p className="text-stone-300 text-sm leading-relaxed">{text}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Delegate view mockup */}
            <div className="reveal reveal-delay-1">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-white/5 border-b border-white/10 px-6 py-4">
                  <p className="text-xs text-stone-400 font-medium">{t('familyView.mockup.header')}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-sage-900/40 border border-sage-700/40 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-sage-400 mb-1">{t('familyView.mockup.calloutTitle')}</p>
                    <p className="text-xs text-stone-400">{t('familyView.mockup.calloutBody')}</p>
                  </div>
                  {familyCategories.map(({ label, count, icon: Icon, shared }) => (
                    <div key={label} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                          <Icon size={13} className="text-stone-400" />
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{label}</p>
                          <p className="text-xs text-stone-500">{count}</p>
                        </div>
                      </div>
                      <ArrowRight size={13} className="text-stone-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIME BREAKDOWN ────────────────────────────────────────── */}
      <section className="py-24 lg:py-28 bg-stone-50 border-b border-stone-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-500 mb-4">{t('timeBreakdown.eyebrow')}</p>
            <h2 className="font-display text-4xl font-light text-navy-950 text-balance">
              {t('timeBreakdown.title')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 reveal">
            {timeCards.map(({ time, label, desc, color, textColor }) => (
              <div key={label} className={`rounded-2xl border p-6 ${color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className={textColor} />
                  <span className={`text-xs font-semibold uppercase tracking-widest ${textColor}`}>{label}</span>
                </div>
                <p className={`font-display text-3xl font-light mb-3 ${textColor}`}>{time}</p>
                <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-white border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-500 mb-4">{t('faq.eyebrow')}</p>
            <h2 className="font-display text-4xl font-light text-navy-950">{t('faq.title')}</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} delay={i + 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-6 text-center reveal">
          <div className="flex justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-amber-400 fill-amber-400" />)}
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-light text-white text-balance mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-stone-300 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            {t('cta.body')}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="btn-aurora inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full"
            >
              {t('cta.primary')} <ArrowRight size={15} />
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-7 py-3.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors"
            >
              {t('cta.secondary')}
            </Link>
          </div>
          <p className="text-stone-500 text-xs mt-5">{t('cta.finePrint')}</p>
        </div>
      </section>

    </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ ITEM
// ─────────────────────────────────────────────────────────────────────────────
function FaqItem({ q, a, delay }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`reveal reveal-delay-${Math.min(delay, 5)} border border-stone-200 rounded-xl overflow-hidden bg-white`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left flex items-start justify-between gap-4 px-6 py-5"
      >
        <span className="font-medium text-navy-900 text-sm leading-snug">{q}</span>
        <ChevronDown size={16} className={`text-stone-400 mt-0.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">{a}</div>
      )}
    </div>
  )
}
