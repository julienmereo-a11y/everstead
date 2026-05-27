import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Download, Clock, ShieldCheck, ArrowRight } from 'lucide-react'
import { useReveal } from '../components/useReveal'

const promises = [
  {
    icon: Download,
    title: 'Export everything, anytime',
    body: "You can download a complete copy of your entire Everstead plan at any time — accounts, documents, instructions, wishes, and more — in standard readable formats. No hoops, no waiting.",
    cta: {
      label: 'Export your data →',
      href: '/dashboard?tab=settings',
      requiresAuth: true,
    },
  },
  {
    icon: Clock,
    title: '90 days notice if anything changes',
    body: "If Everstead ever ceases trading, we commit to giving every user a minimum of 90 days notice, continued free access to export their data, and clear guidance on what to do next. Your plan will never disappear without warning.",
  },
  {
    icon: ShieldCheck,
    title: 'We will never sell your data',
    body: "Everstead does not sell, share, or monetise your personal data. Ever. We make money from subscriptions — not from you. Full details are in our Privacy Policy.",
    cta: {
      label: 'Read our Privacy Policy →',
      href: '/privacy',
    },
  },
]

const commitments = [
  'You can export your complete data at any time from your dashboard settings.',
  'If Everstead ceases trading for any reason, we will give all users a minimum of 90 days written notice before any data is deleted.',
  'During any wind-down period, data export will remain free and unrestricted for all users regardless of subscription status.',
  'We will never sell your personal data to third parties.',
  'You have the right to request deletion of your data at any time by contacting hello@everstead.care.',
]

export default function DataPromise() {
  useReveal()

  return (
    <>
      <Helmet>
        <title>Our Data Promise — Everstead</title>
        <meta name="description" content="Your data belongs to you. Export everything anytime, 90-day wind-down commitment, and we will never sell your data. Everstead's full data promise." />
        <link rel="canonical" href="https://www.everstead.care/data-promise" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Our Data Promise — Everstead" />
        <meta property="og:description" content="Your data belongs to you. Export everything anytime, 90-day wind-down commitment, and we will never sell your data." />
        <meta property="og:url" content="https://www.everstead.care/data-promise" />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>

      <div className="bg-stone-50">

        {/* ── Hero — extends under the fixed nav ── */}
        <section className="pt-44 pb-20 lg:pt-52 lg:pb-28 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <p className="reveal text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">
              Data Promise
            </p>
            <h1 className="reveal reveal-delay-1 font-display text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-6 text-balance leading-tight">
              Your data belongs to you. Always.
            </h1>
            <p className="reveal reveal-delay-2 text-lg text-stone-300 leading-relaxed max-w-xl mx-auto">
              Everstead is built to last. But we believe you should never feel locked in.
            </p>
          </div>
        </section>

        {/* ── Three promise cards ── */}
        <section className="py-20 lg:py-28 bg-white border-b border-stone-100">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6">
              {promises.map(({ icon: Icon, title, body, cta }, i) => (
                <div
                  key={title}
                  className={`reveal reveal-delay-${i + 1} bg-stone-50 border border-stone-200 rounded-2xl p-7 flex flex-col`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-navy-100 flex items-center justify-center mb-5">
                    <Icon size={20} className="text-navy-700" />
                  </div>
                  <h2 className="font-semibold text-navy-950 text-lg mb-3">{title}</h2>
                  <p className="text-sm text-stone-600 leading-relaxed flex-1">{body}</p>
                  {cta && (
                    <Link
                      to={cta.href}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors"
                    >
                      {cta.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Full written commitment ── */}
        <section className="py-20 lg:py-28 bg-stone-50">
          <div className="max-w-2xl mx-auto px-6 lg:px-8">
            <h2 className="reveal font-display text-3xl font-light text-navy-950 mb-8">
              Our commitment in full
            </h2>
            <div className="reveal reveal-delay-1 bg-white border border-stone-200 rounded-2xl p-8 space-y-6 text-sm text-stone-600 leading-relaxed">
              <p>
                Everstead Digital Ltd is registered in England and Wales (Company No. 17166825). We take our responsibility to our users seriously.
              </p>
              <p className="font-semibold text-navy-900">We commit to the following:</p>
              <ul className="space-y-3">
                {commitments.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-sage-600 font-semibold shrink-0 mt-0.5">→</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              <p className="pt-2 border-t border-stone-100">
                If you have any questions about your data or this commitment, please contact us at{' '}
                <a href="mailto:hello@everstead.care" className="text-navy-700 underline underline-offset-2">hello@everstead.care</a>.
                {' '}We will respond within 2 business days.
              </p>
              <p className="text-xs text-stone-400">
                Last updated: May 2026 · Everstead Digital Ltd · everstead.care
              </p>
            </div>

            {/* ── CTA ── */}
            <div className="reveal reveal-delay-2 mt-10 flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/dashboard?tab=settings"
                className="inline-flex items-center gap-2 bg-navy-800 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-navy-700 transition-colors"
              >
                <Download size={15} /> Export my data
              </Link>
              <Link
                to="/privacy"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-navy-700 transition-colors"
              >
                Read our Privacy Policy <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
