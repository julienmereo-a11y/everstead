import React from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Home, HelpCircle, Shield, Star } from 'lucide-react'

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page not found — Everstead</title>
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
              Page not found
            </div>

            <h1
              className="font-display text-4xl lg:text-6xl font-light text-white text-balance mb-5"
              style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}
            >
              This page doesn't exist.
            </h1>

            <p className="text-stone-300 text-lg leading-relaxed max-w-md mx-auto mb-10">
              It may have moved, or the link might be wrong. Here are a few useful places to start.
            </p>

            {/* Primary CTA */}
            <Link
              to="/"
              className="btn-aurora inline-flex items-center gap-2 text-white font-semibold text-sm px-7 py-3.5 rounded-full mb-12"
            >
              <Home size={15} />
              Back to home
            </Link>

            {/* Quick nav */}
            <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto w-full">
              {[
                { label: 'Features', to: '/features', icon: Star, desc: 'What Everstead includes' },
                { label: 'How It Works', to: '/how-it-works', icon: HelpCircle, desc: 'Step by step guide' },
                { label: 'Pricing', to: '/pricing', icon: ArrowRight, desc: 'Plans and free trial' },
                { label: 'Security', to: '/security', icon: Shield, desc: 'How we protect your data' },
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
            Still lost?{' '}
            <a href="mailto:support@everstead.care" className="text-stone-300 hover:text-white transition-colors">
              support@everstead.care
            </a>
          </p>
        </div>
      </div>
    </>
  )
}
