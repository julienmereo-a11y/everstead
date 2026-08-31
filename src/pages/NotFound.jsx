import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Home, HelpCircle, Shield, Star } from 'lucide-react'

export default function NotFound() {
  // The 404 renders under BOTH url trees (the /fr basename included), so it was
  // the one fully-English page a French visitor could still land on.
  const { t } = useTranslation()
  return (
    <>
      <Helmet>
        <title>{t('notFound.metaTitle')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen grain relative overflow-hidden flex flex-col">
        {/* Dark background */}
        <div className="absolute inset-0 aurora-bg" />
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full border border-white/5" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full border border-white/5" />

        {/* Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center pt-32 pb-20">
          {/* 404 number */}
          <p
            className="font-display font-light leading-none mb-6 select-none"
            style={{
              fontSize: 'clamp(96px, 20vw, 200px)',
              color: 'rgba(255,255,255,0.06)',
              letterSpacing: '-0.04em',
            }}
          >
            404
          </p>

          {/* Pull it up over the number */}
          <div className="relative -mt-16 lg:-mt-24">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{ backgroundColor: 'rgba(76,125,71,0.15)', color: '#86b882', border: '1px solid rgba(76,125,71,0.25)' }}
            >
              {t('notFound.badge')}
            </div>

            <h1
              className="font-display text-4xl lg:text-6xl font-light text-white text-balance mb-5"
              style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}
            >
              {t('notFound.title')}
            </h1>

            <p className="text-stone-300 text-lg leading-relaxed max-w-md mx-auto mb-10">
              {t('notFound.body')}
            </p>

            {/* Primary CTA */}
            <Link
              to="/"
              className="btn-aurora inline-flex items-center gap-2 text-white font-semibold text-sm px-7 py-3.5 rounded-full mb-12"
            >
              <Home size={15} />
              {t('notFound.backHome')}
            </Link>

            {/* Quick nav */}
            <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto w-full">
              {[
                { label: t('notFound.features'), to: '/features', icon: Star, desc: t('notFound.featuresDesc') },
                { label: t('notFound.how'), to: '/how-it-works', icon: HelpCircle, desc: t('notFound.howDesc') },
                { label: t('notFound.pricing'), to: '/pricing', icon: ArrowRight, desc: t('notFound.pricingDesc') },
                { label: t('notFound.security'), to: '/security', icon: Shield, desc: t('notFound.securityDesc') },
              ].map(({ label, to, icon: Icon, desc }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all group"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(76,125,71,0.15)' }}
                  >
                    <Icon size={16} style={{ color: '#86b882' }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className="relative border-t py-5 px-6 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-stone-500 text-xs">
            {t('notFound.stillLost')}{' '}
            <a href="mailto:support@everstead.care" className="text-stone-300 hover:text-white transition-colors">
              support@everstead.care
            </a>
          </p>
        </div>
      </div>
    </>
  )
}
