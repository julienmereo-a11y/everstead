import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import {
  ArrowRight, Lock, Shield, Eye, Key, RotateCcw,
  AlertCircle, Users, FileText, CheckCircle2, ExternalLink,
  Server, Globe, ChevronDown
} from 'lucide-react'

// Icon/url config stays in JS; all visible text comes from the `security` namespace.
const PILLAR_ICONS = [Lock, Shield, Users, Eye, Key, RotateCcw, AlertCircle, FileText]
const INFRA = [
  { key: 'supabase', name: 'Supabase', url: 'https://supabase.com/security' },
  { key: 'vercel', name: 'Vercel', url: 'https://vercel.com/security' },
  { key: 'stripe', name: 'Stripe', url: 'https://stripe.com/security' },
  { key: 'resend', name: 'Resend', url: 'https://resend.com/security' },
]

export default function Security() {
  useReveal()
  const { t, i18n } = useTranslation('security')
  const [openFaq, setOpenFaq] = useState(null)

  // /fr pages canonicalise to the /fr URL tree; English stays at the root.
  const urlPrefix = i18n.language === 'fr' ? '/fr' : ''

  const pillars = t('pillars.items', { returnObjects: true }).map((p, i) => ({ icon: PILLAR_ICONS[i], ...p }))
  const infrastructure = INFRA.map(({ key, name, url }) => ({
    name,
    url,
    role: t(`infrastructure.items.${key}.role`),
    cert: t(`infrastructure.items.${key}.cert`),
    region: t(`infrastructure.items.${key}.region`),
    detail: t(`infrastructure.items.${key}.detail`),
  }))
  const faqItems = t('faq.items', { returnObjects: true })
  const gdprPoints = t('gdpr.points', { returnObjects: true })
  const demoPeople = t('demo.people', { returnObjects: true })
  const releaseSteps = t('release.steps', { returnObjects: true })

  return (
    <>
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="description" content={t('meta.description')} />
      <link rel="canonical" href={`https://www.everstead.care${urlPrefix}/security`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={t('meta.title')} />
      <meta property="og:description" content={t('meta.description')} />
      <meta property="og:url" content={`https://www.everstead.care${urlPrefix}/security`} />
      <meta property="og:image" content="https://www.everstead.care/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      <script type="application/ld+json">{JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      })}</script>
    </Helmet>
    <div className="bg-stone-50 pt-24">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-8 animate-fade-in">
            <Shield size={32} className="text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">{t('hero.kicker')}</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            {t('hero.title')}
          </h1>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">
            {t('hero.subtitle')}
          </p>
          <p className="mt-4 text-xs text-stone-500 animate-fade-up animate-delay-200" style={{ letterSpacing: '0.02em' }}>
            {t('hero.trustLine')}
          </p>
        </div>
      </section>

      {/* ── INFRASTRUCTURE ───────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="reveal mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('infrastructure.kicker')}</p>
            <h2 className="font-display text-3xl font-light text-navy-950 mb-4">
              {t('infrastructure.title')}
            </h2>
            <p className="text-stone-600 leading-relaxed max-w-2xl">
              {t('infrastructure.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {infrastructure.map(({ name, role, cert, region, url, detail }, i) => (
              <div key={name} className={`reveal reveal-delay-${i + 1} bg-stone-50 border border-stone-200 rounded-2xl p-6`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-navy-900 text-sm">{name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{role}</p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-navy-600 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={11} />{cert}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-navy-50 text-navy-700 border border-navy-200 px-2.5 py-1 rounded-full">
                    <Globe size={11} />{region}
                  </span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY PILLARS ─────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('pillars.kicker')}</p>
            <h2 className="font-display text-3xl font-light text-navy-950 text-balance">
              {t('pillars.title')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`reveal reveal-delay-${Math.min(i % 4 + 1, 5)} bg-white border border-stone-200 rounded-2xl p-6`}>
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                  <Icon size={20} className="text-navy-700" />
                </div>
                <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GDPR / DATA RESIDENCY ────────────────────────────── */}
      <section className="py-20 lg:py-24 aurora-field aurora-dim relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('gdpr.kicker')}</p>
            <h2 className="font-display text-3xl font-light text-white mb-5">
              {t('gdpr.title')}
            </h2>
            <p className="text-stone-300 leading-relaxed mb-5">
              {t('gdpr.p1')}
            </p>
            <p className="text-stone-400 text-sm leading-relaxed">
              {t('gdpr.p2')}
            </p>
          </div>
          <div className="reveal reveal-delay-1 space-y-3">
            {gdprPoints.map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <CheckCircle2 size={15} className="text-sage-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PERMISSIONS ──────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-stone-50 border-y border-stone-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('demo.kicker')}</p>
            <h2 className="font-display text-3xl font-light text-navy-950 mb-5">{t('demo.title')}</h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              {t('demo.p1')}
            </p>
            <p className="text-stone-600 leading-relaxed">
              {t('demo.p2')}
            </p>
          </div>
          <div className="reveal reveal-delay-1 bg-white rounded-2xl border border-stone-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-5">{t('demo.matrixLabel')}</p>
            <div className="space-y-3">
              {demoPeople.map(({ name, access }) => (
                <div key={name} className="flex items-start gap-3 py-2.5 border-b border-stone-50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 shrink-0 mt-0.5">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy-900">{name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {access.map(a => (
                        <span key={a} className="text-xs bg-navy-50 text-navy-700 border border-navy-100 px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ACCESS RELEASE ───────────────────────────────────── */}
      <section className="py-20 lg:py-28 aurora-field aurora-dim relative overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">{t('release.kicker')}</p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-white text-balance leading-tight mb-5">
              {t('release.title')}
            </h2>
            <p className="text-navy-200 leading-relaxed">
              {t('release.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {releaseSteps.map(({ title, body }, i) => (
              <div key={title} className={`reveal reveal-delay-${i + 1} bg-white/[0.06] border border-white/10 rounded-2xl p-6`}>
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sage-300 font-semibold mb-4">{i + 1}</div>
                <p className="text-white font-semibold mb-2">{title}</p>
                <p className="text-navy-200 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-navy-300 text-sm mt-8 reveal flex items-start gap-2 max-w-2xl">
            <CheckCircle2 size={16} className="text-sage-400 mt-0.5 shrink-0" />
            {t('release.note')}
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('faq.kicker')}</p>
            <h2 className="font-display text-3xl font-light text-navy-950">{t('faq.title')}</h2>
          </div>
          <div className="space-y-3">
            {faqItems.map(({ q, a }, i) => (
              <div key={i} className={`reveal reveal-delay-${Math.min(i + 1, 5)} border border-stone-200 rounded-xl overflow-hidden bg-white`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left flex items-start justify-between gap-4 px-6 py-5"
                >
                  <span className="font-medium text-navy-900 text-sm">{q}</span>
                  <ChevronDown size={16} className={`text-stone-400 mt-0.5 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">{a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <section className="py-16 bg-stone-100 border-t border-stone-200">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">{t('cta.kicker')}</p>
          <h2 className="font-display text-2xl font-light text-navy-950 mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
            {t('cta.body')}
          </p>
          <a
            href="mailto:security@everstead.care"
            className="btn-aurora inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full transition-colors text-white"
          >
            security@everstead.care
            <ArrowRight size={15} />
          </a>
          <p className="text-xs text-stone-400 mt-5">
            {t('cta.generalSupport')} <a href="mailto:hello@everstead.care" className="text-navy-600 hover:text-navy-900">hello@everstead.care</a>
          </p>
          <p className="text-xs text-stone-400 mt-3">
            {t('cta.dataPromiseQuestion')}{' '}
            <Link to="/data-promise" className="text-navy-600 hover:text-navy-900">{t('cta.dataPromiseLink')}</Link>
          </p>
        </div>
      </section>

    </div>
    </>
  )
}
