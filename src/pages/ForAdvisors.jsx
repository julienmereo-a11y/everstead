import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import {
  Users, ShieldCheck, BarChart2, Briefcase, ArrowRight,
  CheckCircle2, Building2, FileText, Clock, Shield
} from 'lucide-react'

const benefits = [
  {
    icon: Briefcase,
    title: 'Clients arrive better prepared',
    desc: 'When a client has an Everstead vault, your initial meetings go deeper. No more spending the first hour hunting for account numbers or discovering a missing LPA.',
  },
  {
    icon: Users,
    title: 'Co-branded client portal',
    desc: 'Your firm\'s name and branding appear inside the client\'s vault. Every time they log in, they see your relationship — not a third-party tool.',
  },
  {
    icon: BarChart2,
    title: 'Track readiness across your book',
    desc: 'See which clients have completed their estate plan, who still has gaps, and where the biggest risks sit — across all your clients in one workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Your liability, protected',
    desc: 'Everstead is an organisation and access tool — it does not give financial, legal, or tax advice. Its scope is clearly defined in its terms of service. Recommending it to clients does not create professional liability for your firm.',
  },
  {
    icon: FileText,
    title: 'Document visibility on your terms',
    desc: 'Clients choose what to share with you. You can view uploaded documents, account registers, and instructions — only what they\'ve explicitly granted you access to.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliant data handling',
    desc: 'EU data residency, AES-256 encryption, and full GDPR compliance. Your clients\' data is held to the same standard you\'d expect from any professional tool.',
  },
]

const ifaBullets = [
  'First meeting spent finding basic account information',
  'Clients with no record of digital assets or subscriptions',
  'Executors calling you after a death with basic questions',
  'LPAs and wills that haven\'t been reviewed in years',
  'No way to track client readiness across your book',
]

const solicitorBullets = [
  'Weeks spent chasing documents before probate can begin',
  'Clients who die with no clear record of their assets',
  'Families calling in distress without knowing what their loved one had',
  'Wills and LPAs that can\'t be located when needed',
  'No single source of truth before administration begins',
]

const useCases = [
  {
    title: 'Independent financial advisers',
    desc: 'Add estate organisation to your service without building it yourself. Clients with organised estates make better decisions and trust you more.',
  },
  {
    title: 'Estate solicitors',
    desc: 'Reduce the back-and-forth before probate. When a client\'s vault is complete, your team has what they need without weeks of document-chasing.',
  },
  {
    title: 'Accountants & tax advisers',
    desc: 'Help clients track assets, subscriptions, and accounts in one place. A cleaner picture at year-end — and far fewer surprises.',
  },
  {
    title: 'Wealth managers',
    desc: 'Differentiate your offering by giving high-net-worth clients a tool their bank doesn\'t. The family vault positions you as genuinely comprehensive.',
  },
]

const steps = [
  { num: '01', title: 'Apply for early access', desc: 'We\'re working directly with the first 50 advisory firms. Tell us a bit about your practice and we\'ll be in touch within 48 hours.' },
  { num: '02', title: 'Onboard your team', desc: 'We set up your co-branded workspace, add your team members, and walk you through the adviser portal in under an hour.' },
  { num: '03', title: 'Invite your clients', desc: 'Clients receive a branded invitation to set up their vault. Most complete their first session in under 30 minutes.' },
  { num: '04', title: 'Manage from one place', desc: 'See every client\'s readiness score, access shared documents, and track progress — all in your adviser dashboard.' },
]

const trustSignals = [
  { icon: Shield,        label: 'UK data residency' },
  { icon: ShieldCheck,   label: 'AES-256 encryption' },
  { icon: CheckCircle2,  label: 'GDPR compliant' },
  { icon: Briefcase,     label: 'No financial advice given' },
  { icon: Building2,     label: 'SOC 2 infrastructure' },
]

export default function ForAdvisors() {
  useReveal()
  const [tab, setTab] = useState('ifa')

  const scrollToBenefits = (e) => {
    e.preventDefault()
    document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <Helmet>
        <title>Everstead for Advisers — Estate Organisation for Your Clients</title>
        <meta name="description" content="Give your clients a co-branded estate vault they'll actually use. Everstead for advisers includes a client portal, readiness tracking, and document access — built for IFAs, solicitors, and wealth managers." />
        <link rel="canonical" href="https://www.everstead.care/for-advisors" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Everstead for Advisers — Estate Organisation for Your Clients" />
        <meta property="og:description" content="Give your clients a co-branded estate vault they'll actually use. Everstead for advisers includes a client portal, readiness tracking, and document access." />
        <meta property="og:url" content="https://www.everstead.care/for-advisors" />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>

      <div className="bg-stone-50 min-h-screen">

        {/* Hero — extends under the fixed nav (no top padding on wrapper);
            internal pt-44 lifts the content below the 96px nav strip */}
        <section className="pt-44 pb-20 lg:pt-52 lg:pb-28 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
          <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">For advisers</p>
            <h1 className="font-display text-4xl lg:text-6xl font-light text-white leading-tight text-balance">
              Your clients need an organised estate. We help them build one.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-2xl mx-auto">
              Everstead gives advisers a co-branded client vault — with readiness tracking, document access, and a portal your clients open between every meeting.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book-demo" className="inline-flex items-center justify-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors">
                Book a demo <ArrowRight size={14} />
              </Link>
              <a href="#benefits" onClick={scrollToBenefits} className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
                See how it works
              </a>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="bg-white border-b border-stone-100 py-5">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {trustSignals.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-stone-400">
                  <Icon size={14} className="shrink-0" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The problem */}
        <section className="py-20 lg:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 reveal">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">The problem</p>
                <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 text-balance leading-tight mb-6">
                  Most clients come to meetings unprepared — and both of you know it.
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-4">
                  They can't find the pension statement from 2019. They haven't updated their LPA since their divorce. Their digital accounts are scattered across six different email addresses, and their spouse doesn't know any of the passwords.
                </p>
                <p className="text-stone-600 text-sm leading-relaxed">
                  The result: the first hour of every review is spent on administration, not advice. And when the worst happens, the executor spends months chasing information that should have been organised years earlier.
                </p>
              </div>
              <div>
                {/* Tab toggle */}
                <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-4 w-fit">
                  <button
                    onClick={() => setTab('ifa')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'ifa' ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-navy-800'}`}
                  >
                    For IFAs
                  </button>
                  <button
                    onClick={() => setTab('solicitor')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'solicitor' ? 'bg-white text-navy-900 shadow-sm' : 'text-stone-500 hover:text-navy-800'}`}
                  >
                    For Solicitors
                  </button>
                </div>
                <div className="space-y-3">
                  {(tab === 'ifa' ? ifaBullets : solicitorBullets).map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-2 shrink-0" />
                      <p className="text-sm text-stone-600 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section id="benefits" className="py-20 lg:py-28 bg-stone-50">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">What you get</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">Everything your practice needs. Nothing it doesn't.</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {benefits.map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="reveal bg-white rounded-2xl p-7 border border-stone-100 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                    <Icon size={18} className="text-navy-700" />
                  </div>
                  <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            {/* Ongoing strip */}
            <div className="reveal bg-white rounded-2xl px-7 py-5 border border-stone-100 shadow-sm flex items-start gap-5">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-navy-700" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-900 text-sm mb-1">Ongoing, not one-off</h3>
                <p className="text-stone-500 text-sm leading-relaxed">Estate organisation isn't a single meeting — it's ongoing. Everstead keeps clients engaged between reviews, with smart reminders that flag changes and gaps.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">Getting started</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">Up and running in days, not months.</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {steps.map(({ num, title, desc }, i) => (
                <div key={i} className="reveal p-7 rounded-2xl bg-stone-50 border border-stone-100">
                  <p className="text-3xl font-display font-light text-stone-200 mb-3">{num}</p>
                  <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="py-20 lg:py-28 bg-stone-50">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">Who uses it</p>
              <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950">Built for professionals who deal with estates.</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {useCases.map(({ title, desc }, i) => (
                <div key={i} className="reveal bg-white rounded-2xl p-7 border border-stone-100">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={15} className="text-sage-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                      <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Early access — replaces testimonial */}
        <section className="py-20 bg-white">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center reveal">
            <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-5">
              We're onboarding our first adviser partners now.
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed mb-8">
              Everstead is in early access. We're working directly with a small cohort of IFAs, solicitors, and estate planners to shape how the adviser portal develops. If you work with clients on estate or later life planning, we'd like to hear from you.
            </p>
            <Link to="/book-demo" className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-navy-800 transition-colors">
              Book a 20-minute call <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Adviser plan detail */}
        <section className="py-20 lg:py-28 bg-navy-50">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 reveal">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-600 mb-4">Early access</p>
                <h2 className="font-display text-3xl font-light text-navy-950 mb-6 leading-tight">
                  Join the first cohort of adviser partners.
                </h2>
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  We're working personally with our first adviser firms — no contracts, no setup fees, and a direct line to the founding team. You help shape the product. We handle everything else.
                </p>
                <div className="space-y-3">
                  {[
                    'Multi-client workspace',
                    'Co-branded client portal',
                    'Estate Readiness Score per client',
                    'Document & account access (client-permissioned)',
                    'Adviser collaboration tools',
                    'Priority support',
                    'No commitment during early access',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 size={15} className="text-sage-500 shrink-0" />
                      <span className="text-sm text-stone-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm">
                <h3 className="font-semibold text-navy-900 mb-2">First 50 firms — onboarded personally</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-6">
                  We're working directly with the first 50 advisory firms. You get a personal onboarding session, a direct line to the founding team, and the ability to shape how the adviser portal develops.
                </p>
                <Link
                  to="/book-demo"
                  className="w-full inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-navy-800 transition-colors"
                >
                  Book a 20-minute demo <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 bg-white">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center reveal">
            <h2 className="font-display text-3xl font-light text-navy-950 mb-4">
              The adviser channel built around your practice.
            </h2>
            <p className="text-stone-500 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
              Estate planning software built around advisers, not just individuals. Give your clients a vault they'll return to — and a tool that makes your practice more efficient.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book-demo" className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-navy-800 transition-colors">
                Book a demo <ArrowRight size={14} />
              </Link>
              <Link to="/contact" className="inline-flex items-center justify-center gap-2 border border-stone-200 text-navy-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors">
                Send us a message
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
