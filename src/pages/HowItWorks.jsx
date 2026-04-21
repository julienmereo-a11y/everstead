import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useReveal } from '../components/useReveal'

const steps = [
  {
    number: '1',
    title: 'Add your accounts and documents',
    body: 'Inventory bank, digital, insurance accounts and upload your essential documents.',
  },
  {
    number: '2',
    title: 'Assign trusted people and access levels',
    body: 'Give your spouse, children, attorney, and advisor the right level of access.',
  },
  {
    number: '3',
    title: 'Leave step-by-step instructions',
    body: 'Write clear guidance — who to call, what to close, how to access the essentials.',
  },
  {
    number: '4',
    title: 'Keep everything updated over time',
    body: 'Annual reminders guide your review — no effort required to stay current.',
  },
]

export default function HowItWorks() {
  useReveal()
  return (
    <div className="bg-stone-50 pt-24">

      {/* Hero */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">
            How it works
          </p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            Everything you need to know, clearly explained.
          </h1>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">
            Everstead is designed to be set up in a single afternoon and maintained in minutes each year.
          </p>
        </div>
      </section>

      {/* Four Steps */}
      <section className="bg-[#0f1a2b] py-24 lg:py-32 grain relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 60%, #2d6a4f33, transparent 60%)' }} />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-8">

          {/* Section label + headline */}
          <div className="text-center mb-20 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">
              HOW IT WORKS
            </p>
            <h2 className="font-display text-5xl lg:text-6xl font-bold text-white leading-tight">
              Four steps to lasting peace of mind.
            </h2>
          </div>

          {/* Steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">

            {/* Connector line row — desktop only */}
            <div className="hidden md:col-span-4 md:grid grid-cols-4 items-center mb-0" aria-hidden="true">
              {steps.map((s, i) => (
                <div key={s.number} className="flex items-center">
                  {/* Circle */}
                  <div className="flex-shrink-0 mx-auto relative">
                    <div className="w-16 h-16 rounded-full bg-[#1e2d42] border border-[#2d4060] flex items-center justify-center">
                      <span className="font-display text-2xl font-bold text-sage-400">{s.number}</span>
                    </div>
                  </div>
                  {/* Line after (except last) */}
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-px bg-[#2d4060] mx-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            {steps.map((s, i) => (
              <div
                key={s.number}
                className={`reveal reveal-delay-${i + 1} flex flex-col items-center text-center px-6 pt-10 pb-4 md:pt-8`}
              >
                {/* Mobile: show number circle */}
                <div className="md:hidden w-16 h-16 rounded-full bg-[#1e2d42] border border-[#2d4060] flex items-center justify-center mb-6">
                  <span className="font-display text-2xl font-bold text-sage-400">{s.number}</span>
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-4 leading-snug">
                  {s.title}
                </h3>
                <p className="text-stone-400 text-base leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security note */}
      <section className="bg-[#0c1520] py-14 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-sage-400 text-xs font-semibold uppercase tracking-widest mb-3">Security, always</p>
          <p className="text-stone-400 text-base leading-relaxed max-w-2xl mx-auto">
            All data is encrypted in transit and at rest. Access is logged. You can revoke permissions at any time.
            Your plan is stored with the same security standards used by financial institutions.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy-950 grain relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #6ea6d8, transparent 60%)' }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center reveal">
          <h2 className="font-display text-4xl font-light text-white mb-6">Ready to start your plan?</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/get-started"
              className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-stone-100 transition-colors"
            >
              Get Started Free <ArrowRight size={15} />
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 bg-white/10 text-white font-medium text-sm px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
