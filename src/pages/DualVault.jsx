import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import {
  Lock, Users, ShieldCheck, ArrowRight, CheckCircle2,
  Heart, Share2, EyeOff, UserCircle, Folder
} from 'lucide-react'

const privateBenefits = [
  {
    icon: EyeOff,
    title: 'Completely separate',
    desc: 'Each vault is a private, independent account. Your partner never has access to your information unless you explicitly share it.',
  },
  {
    icon: Lock,
    title: 'One password each',
    desc: 'No shared logins. No shared folders. Each person signs in separately, with their own credentials and their own data.',
  },
  {
    icon: Share2,
    title: 'Share only what you choose',
    desc: 'Want to share one section — like your joint accounts — without sharing everything else? That\'s exactly what role-based access is built for.',
  },
]

const whyMatters = [
  {
    scenario: 'You have assets you haven\'t told your partner about yet',
    response: 'Your vault is private. They don\'t see anything you haven\'t explicitly shared.',
  },
  {
    scenario: 'You\'re going through a difficult period and need your own plan in place',
    response: 'Your estate organisation is yours. Completely independent. No joint account to untangle.',
  },
  {
    scenario: 'You both want to be organised, but keep your financial information private',
    response: 'Two vaults. One subscription. No compromise on privacy.',
  },
  {
    scenario: 'You want to share some accounts but not others',
    response: 'Role-based access lets you share individual sections — joint accounts, emergency contacts — while keeping everything else private.',
  },
]

const comparisonRows = [
  { feature: 'Each person has their own vault',          dualVault: true,  single: false },
  { feature: 'Completely private data by default',       dualVault: true,  single: false },
  { feature: 'One subscription for both',                dualVault: true,  single: false },
  { feature: 'Selective sharing between partners',       dualVault: true,  single: false },
  { feature: 'Separate trusted contacts per person',     dualVault: true,  single: false },
  { feature: 'Independent readiness scores',             dualVault: true,  single: false },
  { feature: 'Each person keeps their own access after separation', dualVault: true, single: false },
]

const testimonials = [
  {
    quote: 'The family plan is what convinced me. My husband and I both wanted to organise our estates, but we didn\'t want to share everything. Two private vaults on one subscription was exactly what we needed.',
    name: 'Victoria Miller',
    badge: 'Verified Trustpilot review',
  },
  {
    quote: 'I was looking for a service like this for a long time since starting a family. Everstead was the only one that hit the mark.',
    name: 'Yasmina Banine',
    badge: 'Verified Trustpilot review',
  },
]

export default function DualVault() {
  useReveal()

  return (
    <>
      <Helmet>
        <title>Family Vault — Two Private Vaults, One Subscription | Everstead</title>
        <meta name="description" content="Everstead's Family plan gives couples two completely private vaults under one subscription. Each person keeps their own data. Share only what you choose. No competitor offers this." />
        <link rel="canonical" href="https://www.everstead.care/family-vault" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Family Vault — Two Private Vaults, One Subscription | Everstead" />
        <meta property="og:description" content="Two completely private vaults. One subscription. Each person keeps their own data, shares only what they choose. The only estate planning tool built for couples who value their privacy." />
        <meta property="og:url" content="https://www.everstead.care/family-vault" />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>

      <div className="bg-stone-50 pt-24 min-h-screen">

        {/* Hero */}
        <section className="py-20 lg:py-28 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
          <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">Family plan</p>
            <h1 className="font-display text-4xl lg:text-6xl font-light text-white leading-tight text-balance">
              Two private vaults. One subscription. No compromises.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              Most estate planning tools assume couples share everything. Everstead doesn't. The Family plan gives each person a completely private vault — organised separately, shared only by choice.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/get-started" className="inline-flex items-center justify-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors">
                Start your free trial <ArrowRight size={14} />
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
                See pricing
              </Link>
            </div>
            <p className="mt-5 text-sm text-stone-400">Family plan from £10/mo. 14-day free trial.</p>
          </div>
        </section>

        {/* The gap in the market */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">Why this matters</p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 text-balance leading-tight mb-6">
              Most couples don't share everything.<br />Most estate tools assume they do.
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed mb-4">
              Every other estate organisation platform is built around a single account. If you want your partner to be involved, you share that account — which means they can see everything.
            </p>
            <p className="text-stone-500 text-sm leading-relaxed">
              That's not how families actually work. You might have assets from before the relationship. A business interest you haven't discussed. A pension that's yours. Old accounts your partner doesn't know about. None of that means you're hiding something — it means you deserve your own private space, even within a shared plan.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 lg:py-28 bg-stone-50">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">How it works</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">Two vaults. Completely independent.</h2>
            </div>

            {/* Vault illustration */}
            <div className="reveal grid md:grid-cols-2 gap-6 mb-16">
              <div className="rounded-2xl border-2 border-navy-200 bg-white p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center">
                    <UserCircle size={20} className="text-navy-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-sm">Your vault</p>
                    <p className="text-xs text-stone-400">Private — only you can see this</p>
                  </div>
                  <Lock size={14} className="text-navy-400 ml-auto" />
                </div>
                <div className="space-y-2">
                  {['Your accounts & assets', 'Your documents', 'Your instructions', 'Your trusted contacts', 'Your final wishes'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-stone-600 py-2 border-b border-stone-50 last:border-0">
                      <Folder size={13} className="text-stone-300 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-sage-200 bg-white p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center">
                    <UserCircle size={20} className="text-sage-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-sm">Your partner's vault</p>
                    <p className="text-xs text-stone-400">Private — only they can see this</p>
                  </div>
                  <Lock size={14} className="text-sage-400 ml-auto" />
                </div>
                <div className="space-y-2">
                  {['Their accounts & assets', 'Their documents', 'Their instructions', 'Their trusted contacts', 'Their final wishes'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-stone-600 py-2 border-b border-stone-50 last:border-0">
                      <Folder size={13} className="text-stone-300 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sharing note */}
            <div className="reveal rounded-2xl bg-navy-50 border border-navy-100 p-7 text-center max-w-2xl mx-auto">
              <Share2 size={20} className="text-navy-500 mx-auto mb-3" />
              <h3 className="font-semibold text-navy-900 text-sm mb-2">Sharing is always your choice</h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                Want to share your joint bank accounts with each other? Share just that section. Your mortgage details, your shared investments — whatever makes sense. Everything else stays private. No all-or-nothing.
              </p>
            </div>
          </div>
        </section>

        {/* Why it matters — scenarios */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">Real situations</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">Privacy isn't about secrets. It's about control.</h2>
            </div>
            <div className="space-y-4">
              {whyMatters.map(({ scenario, response }, i) => (
                <div key={i} className="reveal grid md:grid-cols-2 gap-4 rounded-2xl border border-stone-100 overflow-hidden bg-stone-50">
                  <div className="p-6 bg-stone-100/50">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">The situation</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{scenario}</p>
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-semibold text-sage-600 uppercase tracking-wider mb-2">With Everstead</p>
                    <p className="text-sm text-stone-600 leading-relaxed">{response}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="py-20 lg:py-28 bg-stone-50">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">Private benefits</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">Built for how couples actually live.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-14">
              {privateBenefits.map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="reveal bg-white rounded-2xl p-7 border border-stone-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                    <Icon size={18} className="text-navy-700" />
                  </div>
                  <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <div className="reveal rounded-2xl border border-stone-200 overflow-hidden bg-white">
              <div className="grid grid-cols-3 bg-navy-50 border-b border-stone-200">
                <div className="px-6 py-4">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Feature</p>
                </div>
                <div className="px-6 py-4 text-center border-l border-stone-200">
                  <p className="text-xs font-semibold text-navy-700 uppercase tracking-widest">Family plan</p>
                </div>
                <div className="px-6 py-4 text-center border-l border-stone-200">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Single vault</p>
                </div>
              </div>
              {comparisonRows.map((row, i) => (
                <div key={i} className={`grid grid-cols-3 border-b border-stone-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-stone-50/50'}`}>
                  <div className="px-6 py-4 text-sm text-stone-700 leading-snug flex items-center">{row.feature}</div>
                  <div className="px-6 py-4 flex items-center justify-center border-l border-stone-100">
                    {row.dualVault
                      ? <CheckCircle2 size={18} className="text-sage-500" />
                      : <span className="w-4 h-0.5 bg-stone-200 rounded" />}
                  </div>
                  <div className="px-6 py-4 flex items-center justify-center border-l border-stone-100">
                    {row.single
                      ? <CheckCircle2 size={18} className="text-stone-400" />
                      : <span className="w-4 h-0.5 bg-stone-200 rounded" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map(({ quote, name, badge }, i) => (
                <div key={i} className="reveal rounded-2xl bg-stone-50 border border-stone-100 p-8">
                  <p className="text-sage-500 text-lg mb-4">★★★★★</p>
                  <blockquote className="font-display text-lg font-light text-navy-950 leading-relaxed mb-6">"{quote}"</blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
                      <UserCircle size={14} className="text-stone-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{name}</p>
                      <p className="text-xs text-stone-400">{badge}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="py-20 lg:py-28 bg-navy-950">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-300 mb-5">Family plan</p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-white mb-4 text-balance">
              Two vaults. Everything in Essential. From £10/month.
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed mb-8 max-w-xl mx-auto">
              One subscription for both of you. Each person gets a full, private vault — accounts, documents, instructions, trusted contacts, and final wishes — kept completely separate unless you choose to share.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link to="/get-started" className="inline-flex items-center justify-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors">
                Start free trial <ArrowRight size={14} />
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
                Compare all plans
              </Link>
            </div>
            <p className="text-stone-500 text-xs">14-day free trial. No commitment. Cancel any time.</p>
          </div>
        </section>

      </div>
    </>
  )
}
