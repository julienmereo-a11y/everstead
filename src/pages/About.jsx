import React from 'react'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import enAbout from '../i18n/locales/en/about.json'
import frAbout from '../i18n/locales/fr/about.json'
import { ArrowRight, Heart, Shield, Clock, CheckCircle2, Quote } from 'lucide-react'
import { useReveal } from '../components/useReveal'

// Self-registered namespace (page-scoped strings stay in this lazy chunk;
// central src/i18n/index.js keeps only the shared always-loaded namespaces).
i18n.addResourceBundle('en', 'about', enAbout)
i18n.addResourceBundle('fr', 'about', frAbout)

// Icons for the values cards — all visible copy lives in the "about" i18n namespace
const VALUE_ICONS = [Heart, Shield, Clock]

export default function About() {
  useReveal()
  const { t } = useTranslation('about')

  const values = t('values.items', { returnObjects: true })
    .map((v, i) => ({ ...v, icon: VALUE_ICONS[i] }))
  const founderParagraphs = t('founder.paragraphs', { returnObjects: true })
  const stats = t('mission.stats', { returnObjects: true })
  const testimonials = t('testimonials.items', { returnObjects: true })
  const commitments = t('commitment.points', { returnObjects: true })

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
      </Helmet>
      <HreflangLinks path="/about" />

      <div className="bg-stone-50 pt-24">

        {/* ── Hero ── */}
        <section className="relative py-24 lg:py-36 overflow-hidden grain">
          <div className="absolute inset-0 aurora-bg" />
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full border border-white/5" />
          <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full border border-white/5" />

          <div className="relative max-w-4xl mx-auto px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-6 animate-fade-in">
              {t('hero.eyebrow')}
            </p>
            <h1 className="font-display text-5xl lg:text-7xl font-light text-white leading-[1.1] text-balance animate-fade-up">
              {t('hero.title')}
            </h1>
            <p className="mt-8 text-stone-300 text-xl leading-relaxed max-w-2xl animate-fade-up" style={{ animationDelay: '100ms' }}>
              {t('hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <Link
                to="/get-started"
                className="btn-aurora inline-flex items-center gap-2 text-white font-semibold text-sm px-6 py-3.5 rounded-full transition-colors"
              >
                {t('hero.ctaPrimary')} <ArrowRight size={15} />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-6 py-3.5 rounded-full transition-colors border border-white/10"
              >
                {t('hero.ctaSecondary')}
              </Link>
            </div>
          </div>
        </section>

        {/* ── The moment that started it ── */}
        <section className="py-24 lg:py-36 border-b border-stone-200">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-6">{t('origin.eyebrow')}</p>
            <blockquote className="font-display text-3xl lg:text-4xl font-light text-navy-950 leading-snug mb-8 text-balance">
              {t('origin.quote')}
            </blockquote>
            <p className="text-stone-400 text-sm font-medium mb-10">{t('origin.attribution')}</p>
            <div className="pt-10 border-t border-stone-200">
              <p className="text-stone-600 leading-relaxed text-lg mb-5">
                {t('origin.para1')}
              </p>
              <p className="text-stone-600 leading-relaxed">
                {t('origin.para2')}
              </p>
            </div>
          </div>
        </section>

        {/* ── Founder ── */}
        <section className="py-24 lg:py-36 border-b border-stone-200">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-[280px_1fr] gap-12 lg:gap-20 items-start reveal">
              {/* Photo / avatar */}
              <div className="flex flex-col items-center lg:items-start gap-5">
                <div className="w-40 h-40 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg bg-stone-100">
                  <img src="/julien-thuy-2026.jpeg" alt={t('founder.photoAlt')} className="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <p className="font-semibold text-navy-900 text-lg">{t('founder.name')}</p>
                  <p className="text-stone-500 text-sm mt-0.5">{t('founder.role')}</p>
                  <p className="text-stone-400 text-xs mt-1">{t('founder.location')}</p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-6">{t('founder.eyebrow')}</p>
                <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-8 text-balance leading-snug">
                  {t('founder.title')}
                </h2>
                <div className="space-y-4 text-stone-600 leading-relaxed">
                  {founderParagraphs.map((para, i) => (
                    <p key={i}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What we're here to do ── */}
        <section className="py-24 lg:py-36 border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div className="reveal">
                <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-6">{t('mission.eyebrow')}</p>
                <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 leading-tight mb-8 text-balance">
                  {t('mission.title')}
                </h2>
                <p className="text-stone-600 leading-relaxed text-lg mb-5">
                  {t('mission.para1')}
                </p>
                <p className="text-stone-600 leading-relaxed">
                  {t('mission.para2')}
                </p>
              </div>

              {/* Impact stats */}
              <div className="reveal space-y-5">
                {stats.map(({ stat, label, note }) => (
                  <div key={stat} className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-navy-200 hover:shadow-sm transition-all">
                    <p className="font-display text-4xl font-light text-navy-950 mb-2">{stat}</p>
                    <p className="text-stone-700 text-sm leading-relaxed font-medium mb-1">{label}</p>
                    <p className="text-stone-400 text-xs">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="py-24 lg:py-36 border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16 reveal">
              <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('values.eyebrow')}</p>
              <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950">{t('values.title')}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {values.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="reveal bg-white border border-stone-200 rounded-2xl p-8 hover:border-navy-300 hover:shadow-sm transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center mb-6">
                    <Icon size={20} className="text-navy-700" />
                  </div>
                  <h3 className="font-semibold text-navy-900 mb-3">{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Social proof ── */}
        <section className="py-24 lg:py-36 border-b border-stone-200 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-10 text-center">{t('testimonials.eyebrow')}</p>
            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map(({ quote, name, location }) => (
                <div key={name} className="bg-stone-50 border border-stone-200 rounded-2xl p-8 relative">
                  <Quote size={20} className="text-navy-200 mb-5" />
                  <p className="text-stone-700 leading-relaxed text-sm mb-6 italic">{quote}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-navy-700 text-xs font-semibold">{name[0]}</span>
                    </div>
                    <div>
                      <p className="text-navy-900 text-sm font-semibold">{name}</p>
                      <p className="text-stone-400 text-xs">{location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Commitment ── */}
        <section className="py-24 lg:py-36 border-b border-stone-200">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-6">{t('commitment.eyebrow')}</p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-8 text-balance leading-snug">
              {t('commitment.title')}
            </h2>
            <div className="space-y-4">
              {commitments.map((line, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-sage-600 mt-0.5 flex-shrink-0" />
                  <p className="text-stone-600 leading-relaxed text-sm">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 lg:py-32 aurora-field aurora-dim relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full border border-white/5" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-6">{t('cta.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white mb-6 text-balance">
              {t('cta.title')}
            </h2>
            <p className="text-stone-300 mb-10 text-lg leading-relaxed max-w-xl mx-auto">
              {t('cta.body')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/get-started"
                className="btn-aurora inline-flex items-center gap-2 text-white font-semibold text-sm px-7 py-3.5 rounded-full transition-colors"
              >
                {t('cta.primary')} <ArrowRight size={15} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-7 py-3.5 rounded-full transition-colors border border-white/10"
              >
                {t('cta.secondary')}
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
