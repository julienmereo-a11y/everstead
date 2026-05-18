import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Mail } from 'lucide-react'

const facts = [
  { label: 'Founded', value: '2025' },
  { label: 'Headquarters', value: 'London, United Kingdom' },
  { label: 'Company number', value: '17166825 (England & Wales)' },
  { label: 'Category', value: 'Personal vault & estate readiness' },
  { label: 'Pricing', value: 'From £3/mo (yearly) · Free trial' },
  { label: 'Website', value: 'everstead.care' },
]

const boilerplate = `Everstead is a secure personal vault for UK families — a single, organised place to store accounts, documents, instructions, and important decisions, with controlled access for the people you trust. Founded in 2025 by Julien Thuy, Everstead was built after watching families struggle to piece together a loved one's affairs under enormous stress. The platform helps members get organised today and ensures their loved ones are protected when it counts. Everstead Digital Ltd is registered in England and Wales (No. 17166825).`

const angles = [
  'The "digital estate" problem — billions in unclaimed assets, millions of families unprepared',
  'Why most people still store important information in their heads (or a drawer)',
  'How to talk to your family about estate planning without it being morbid',
  'The rise of personal vaults — organising your life, not just your death',
  'What executors actually wish they had access to',
  'AI, privacy, and sensitive life data — where should it live?',
]

export default function Press() {
  useReveal()
  return (
    <>
      <Helmet>
        <title>Press & Media — Everstead</title>
        <meta name="description" content="Press kit, company facts, and media enquiries for Everstead — the secure personal vault for UK families." />
        <link rel="canonical" href="https://www.everstead.care/press" />
      </Helmet>

      <div className="bg-stone-50 pt-24 min-h-screen">
        {/* Hero */}
        <section className="py-20 lg:py-28 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
          <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">Press & Media</p>
            <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
              Everything that matters, in one place.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              For press enquiries, interview requests, or to request our press kit, contact us below. We typically respond within one business day.
            </p>
            <a
              href="mailto:hello@everstead.care?subject=Press%20enquiry"
              className="inline-flex items-center gap-2 mt-8 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors"
            >
              <Mail size={15} />
              hello@everstead.care
            </a>
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-20">

            {/* Company facts */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-8">Company facts</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {facts.map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">{label}</p>
                    <p className="text-sm font-medium text-navy-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* About / boilerplate */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-4">About Everstead</h2>
              <p className="text-stone-600 text-sm leading-relaxed max-w-3xl">{boilerplate}</p>
            </div>

            {/* Founder */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-6">Founder</h2>
              <div className="rounded-2xl border border-stone-200 bg-white px-8 py-7 flex items-start gap-6 max-w-xl">
                <div className="w-14 h-14 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-display text-xl font-light shrink-0">
                  JT
                </div>
                <div>
                  <p className="font-semibold text-navy-900">Julien Thuy</p>
                  <p className="text-sm text-stone-500 mb-3">Founder & CEO, Everstead</p>
                  <p className="text-sm leading-relaxed text-stone-600">
                    Julien built Everstead after witnessing first-hand the chaos and grief that follows when a family has no organised record of a loved one's affairs. He is based in London and available for interviews, podcasts, and speaking engagements on digital estate planning, personal finance organisation, and family preparedness.
                  </p>
                  <a href="mailto:hello@everstead.care?subject=Interview%20request" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                    Request an interview <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            </div>

            {/* Story angles */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-3">Story angles</h2>
              <p className="text-stone-500 text-sm mb-6">Topics we can speak to with data, insight, or a founder perspective:</p>
              <ul className="space-y-3">
                {angles.map(angle => (
                  <li key={angle} className="flex items-start gap-3 text-sm leading-relaxed text-stone-700">
                    <span className="text-sage-600 mt-0.5 font-bold shrink-0">—</span>
                    {angle}
                  </li>
                ))}
              </ul>
            </div>

            {/* Logos / assets */}
            <div className="reveal">
              <h2 className="font-display text-3xl font-light text-navy-950 mb-4">Brand assets</h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">
                Logos, screenshots, and brand guidelines are available on request. Please email us before publishing any Everstead brand assets.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
                <div className="rounded-2xl border border-stone-200 bg-navy-950 p-8 flex items-center justify-center">
                  <img src="/logo-v2-white.png" alt="Everstead logo — white" className="h-8 w-auto" />
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-8 flex items-center justify-center">
                  <img src="/logo-v2-dark.png" alt="Everstead logo — dark" className="h-8 w-auto" onError={e => { e.target.style.display='none' }} />
                  <span className="text-stone-300 text-sm font-display">Everstead</span>
                </div>
              </div>
              <p className="mt-4 text-stone-400 text-xs">For full-resolution files and brand guidelines, email hello@everstead.care</p>
            </div>

            {/* Contact */}
            <div className="reveal rounded-2xl bg-navy-950 px-10 py-10 text-center">
              <h2 className="font-display text-2xl font-light text-white mb-3">Media enquiries</h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                For press, interview, and speaking requests, contact Julien directly. We respond to all media enquiries within one business day.
              </p>
              <a
                href="mailto:hello@everstead.care?subject=Press%20enquiry"
                className="inline-flex items-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors"
              >
                <Mail size={15} />
                hello@everstead.care
              </a>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
