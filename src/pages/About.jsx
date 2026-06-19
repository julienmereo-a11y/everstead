import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowRight, Heart, Shield, Clock, CheckCircle2, Quote } from 'lucide-react'
import { useReveal } from '../components/useReveal'

const values = [
  {
    icon: Heart,
    title: 'Empathy before everything',
    desc: 'Every decision — from the words we use to the screens we build — begins with the question: how does this feel to someone in the middle of grief? Clarity and calm are not nice-to-haves. They are the whole product.',
  },
  {
    icon: Shield,
    title: 'Trust is the product',
    desc: 'Security and privacy are not features we added on. They are the reason the platform exists. We hold your information with the same weight a trusted solicitor or family adviser would. We earn that trust every day.',
  },
  {
    icon: Clock,
    title: 'Planned in calm, used in crisis',
    desc: 'The best time to organise is before anything goes wrong. We design for quiet Sunday afternoons, so that when the worst happens, your family has everything they need without asking a single question.',
  },
]

export default function About() {
  useReveal()

  return (
    <>
      <Helmet>
        <title>About Everstead — Why we exist</title>
        <meta name="description" content="Everstead was built so no family has to spend their grief searching for paperwork. Learn who we are, why we built this, and what drives every decision we make." />
      </Helmet>

      <div className="bg-stone-50 pt-24">

        {/* ── Hero ── */}
        <section className="relative py-24 lg:py-36 overflow-hidden grain">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
          {/* Sage glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(76,125,71,0.10) 0%, transparent 70%)' }} />
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full border border-white/5" />
          <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full border border-white/5" />

          <div className="relative max-w-4xl mx-auto px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-6 animate-fade-in">
              Our mission
            </p>
            <h1 className="font-display text-5xl lg:text-7xl font-light text-white leading-[1.1] text-balance animate-fade-up">
              No family should spend their grief searching for paperwork.
            </h1>
            <p className="mt-8 text-stone-300 text-xl leading-relaxed max-w-2xl animate-fade-up" style={{ animationDelay: '100ms' }}>
              Everstead exists to make sure they never have to. We turn the overwhelming work of estate organisation into something a family can do together — calmly, clearly, and well before it is urgent.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-sage-500 hover:bg-sage-400 text-white font-semibold text-sm px-6 py-3.5 rounded-lg transition-colors"
              >
                Start organising <ArrowRight size={15} />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-6 py-3.5 rounded-lg transition-colors border border-white/10"
              >
                See how it works
              </Link>
            </div>
          </div>
        </section>

        {/* ── The moment that started it ── */}
        <section className="py-24 lg:py-36 border-b border-stone-200">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-6">Where this began</p>
            <blockquote className="font-display text-3xl lg:text-4xl font-light text-navy-950 leading-snug mb-8 text-balance">
              "We spent an entire month after a bereavement just trying to find things. Account numbers, insurance policies, online accounts, subscriptions to cancel. All while grieving. It was avoidable chaos."
            </blockquote>
            <p className="text-stone-400 text-sm font-medium mb-10">— Julien, Founder of Everstead</p>
            <div className="pt-10 border-t border-stone-200">
              <p className="text-stone-600 leading-relaxed text-lg mb-5">
                That experience is not unique. Millions of families go through the same thing every year — not because they did not care, but because no one ever gave them a simple way to prepare.
              </p>
              <p className="text-stone-600 leading-relaxed">
                Everstead was built to close that gap. The work of organising your estate should happen once, in calm, on your own terms. The benefit lasts forever — for you, for your family, and for the people you trust to carry things forward.
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
                  <img src="/julien-thuy-2026.jpeg" alt="Julien Thuy, Founder of Everstead" className="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <p className="font-semibold text-navy-900 text-lg">Julien Thuy</p>
                  <p className="text-stone-500 text-sm mt-0.5">Founder, Everstead</p>
                  <p className="text-stone-400 text-xs mt-1">London, UK</p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-6">Who built this</p>
                <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-8 text-balance leading-snug">
                  A product built from lived experience — not a boardroom brief.
                </h2>
                <div className="space-y-4 text-stone-600 leading-relaxed">
                  <p>
                    Everstead was founded after going through the painful, disorganised reality of managing a bereavement. Weeks of searching for account numbers, chasing banks, cancelling subscriptions — all while trying to grieve. It was the kind of problem no product seemed built to solve.
                  </p>
                  <p>
                    That experience made one thing clear: the tools people actually need when the worst happens need to be built before it happens. Not by a large enterprise software company, but by someone who understands what a family is actually going through — and who cares deeply about getting it right.
                  </p>
                  <p>
                    Everstead is built with that responsibility at its centre. Every design decision, every piece of copy, every security choice is made with the same question in mind: would I trust this with my own family?
                  </p>
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
                <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-6">What we are here to do</p>
                <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950 leading-tight mb-8 text-balance">
                  Make the practical side of loss manageable — before it ever needs to be.
                </h2>
                <p className="text-stone-600 leading-relaxed text-lg mb-5">
                  Estate planning has always been important. But the tools that exist today — solicitors, spreadsheets, filing cabinets — were never designed for modern families who hold their lives across dozens of digital accounts and platforms.
                </p>
                <p className="text-stone-600 leading-relaxed">
                  We are building the platform that brings together every account, document, instruction, and trusted contact in one private, structured, secure place — designed specifically for the moment when everything matters most.
                </p>
              </div>

              {/* Impact stats */}
              <div className="reveal space-y-5">
                {[
                  {
                    stat: '4+ weeks',
                    label: 'Average time families spend locating assets after a bereavement',
                    note: 'Source: UK bereavement research',
                  },
                  {
                    stat: '£15,000+',
                    label: 'Estimated value of unclaimed digital assets and accounts left without instructions',
                    note: 'Based on UK consumer financial data',
                  },
                  {
                    stat: '1 in 3',
                    label: 'Adults in the UK have no documented plan for what happens to their accounts and assets',
                    note: 'YouGov / Solicitors for the Elderly research',
                  },
                ].map(({ stat, label, note }) => (
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
              <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">What guides every decision</p>
              <h2 className="font-display text-4xl lg:text-5xl font-light text-navy-950">Our values</h2>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-10 text-center">What families say</p>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  quote: "I'd been putting this off for years. Everstead made it feel manageable — I did it over a Sunday afternoon and felt an enormous weight lift. My children now know exactly what to do.",
                  name: 'Margaret, 67',
                  location: 'Surrey',
                },
                {
                  quote: "When my father passed, we had nothing to go on. It took months to sort out his estate. I've now set up Everstead so my kids will never go through the same thing. It's the most responsible thing I've done for them.",
                  name: 'David, 58',
                  location: 'Edinburgh',
                },
              ].map(({ quote, name, location }) => (
                <div key={name} className="bg-stone-50 border border-stone-200 rounded-2xl p-8 relative">
                  <Quote size={20} className="text-navy-200 mb-5" />
                  <p className="text-stone-700 leading-relaxed text-sm mb-6 italic">"{quote}"</p>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-6">Our commitment to you</p>
            <h2 className="font-display text-3xl lg:text-4xl font-light text-navy-950 mb-8 text-balance leading-snug">
              We will never sell your data. We will never compromise on security. We will always be on your side.
            </h2>
            <div className="space-y-4">
              {[
                'Your data belongs to you — always. You can export or delete it at any time.',
                'We use bank-grade AES-256 encryption for every document, account, and record you store.',
                'We do not run ads, sell access to your data, or share it with third parties.',
                'Every role-based permission exists so the right people see only what they need to.',
                'We are registered in the UK and regulated under UK data protection law (ICO No. 17166825).',
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-sage-600 mt-0.5 flex-shrink-0" />
                  <p className="text-stone-600 leading-relaxed text-sm">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 lg:py-32 bg-navy-950 grain relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full border border-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(76,125,71,0.08) 0%, transparent 70%)' }} />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-6">Ready to start?</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light text-white mb-6 text-balance">
              Give your family the clarity they deserve.
            </h2>
            <p className="text-stone-300 mb-10 text-lg leading-relaxed max-w-xl mx-auto">
              It takes less than an afternoon to put your house in order. The relief — for you and for them — lasts a lifetime.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-sage-500 hover:bg-sage-400 text-white font-semibold text-sm px-7 py-3.5 rounded-lg transition-colors"
              >
                Start Your Everstead <ArrowRight size={15} />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-7 py-3.5 rounded-lg transition-colors border border-white/10"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
