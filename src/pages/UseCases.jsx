import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Users, Heart, User, BookOpen, Briefcase } from 'lucide-react'

const cases = {
  families: {
    icon: Users,
    title: 'For Families',
    hero: 'Make sure loved ones know where everything is and what to do first.',
    body: 'Families face a storm of practical tasks when a member passes or becomes incapacitated. Everstead gives you a structured way to prepare before that moment arrives — so your family\'s focus stays on each other, not on paperwork.',
    benefits: [
      'A single place for all critical information',
      'Clear first-steps checklist for whoever manages the estate',
      'Document access for the right people at the right time',
      'Subscription and recurring cost inventory',
      'Final wishes, clearly recorded and accessible',
    ],
    quote: '"We had no idea where my mother kept anything. Everstead would have changed everything."',
    quoteAuthor: '— Adult child and executor',
  },
  parents: {
    icon: Heart,
    title: 'For Parents',
    hero: 'Leave guidance, not guesswork, for practical and personal decisions.',
    body: 'Parents carry both practical responsibilities and personal wishes they want their children to understand. Everstead helps you document both — from financial accounts to sentimental items to the instructions only you would know.',
    benefits: [
      'Record where key documents and accounts are stored',
      'Leave personal letters and messages for specific family members',
      'Assign guardianship and care preferences for dependents and pets',
      'Document subscription and digital accounts clearly',
      'Update your plan as life changes without starting over',
    ],
    quote: '"The hardest part wasn\'t grief. It was the dozen practical decisions we had to make without knowing what she would have wanted."',
    quoteAuthor: '— Parent planning ahead',
  },
  'aging-adults': {
    icon: User,
    title: 'For Aging Adults',
    hero: 'Organize with dignity and clarity while assigning trusted support.',
    body: 'Organizing your affairs doesn\'t have to feel final — it\'s one of the most considerate things you can do for the people you love. Everstead gives you full control over what you share, who can see it, and how your wishes are expressed.',
    benefits: [
      'Gradual setup — add a little at a time',
      'Assign a trusted family member or caregiver with limited access',
      'Clearly record medical and care preferences',
      'Emergency vault for immediate access when needed',
      'No technical expertise required to set up',
    ],
    quote: '"I finally feel like I\'ve taken care of something important. My children won\'t be left wondering."',
    quoteAuthor: '— Everstead user, age 71',
  },
  executors: {
    icon: BookOpen,
    title: 'For Executors',
    hero: 'A clearer path through responsibilities, documents, and timing.',
    body: 'Being named an executor is both an honor and a significant responsibility. Everstead gives executors a structured, organized starting point — so the role begins with clarity rather than search and confusion.',
    benefits: [
      'Organized account and asset inventory from the start',
      'Documents already uploaded, tagged, and accessible',
      'Step-by-step instruction sequences to follow',
      'Contact list with roles and relationships',
      'Subscription and recurring bill inventory for fast cancellation',
      'Audit history for transparent record-keeping',
    ],
    quote: '"As executor for three estates in my career, I\'ve learned that organization is everything. Everstead is what I wish every client had."',
    quoteAuthor: '— Estate attorney',
  },
  advisors: {
    icon: Briefcase,
    title: 'For Advisors & Professionals',
    hero: 'Offer estate organization as a modern client service.',
    body: 'Financial advisors, estate attorneys, and wealth managers can differentiate their practice by helping clients prepare practically — not just legally or financially. Everstead gives you the tools to collaborate, guide, and support clients through the organization process.',
    benefits: [
      'Multi-client workspace to manage multiple client plans',
      'Co-branded client portal under your firm\'s identity',
      'Collaborative access to specific plan sections',
      'Client progress and readiness dashboards',
      'Streamlined onboarding and plan completion flows',
      'White-label options for enterprise practices',
    ],
    quote: '"This has become a genuine value-add for my practice. Clients appreciate that I\'m helping them prepare, not just plan."',
    quoteAuthor: '— Certified Financial Planner',
  },
}

const allCases = [
  { slug: 'families', label: 'For Families' },
  { slug: 'parents', label: 'For Parents' },
  { slug: 'aging-adults', label: 'For Aging Adults' },
  { slug: 'executors', label: 'For Executors' },
  { slug: 'advisors', label: 'For Advisors' },
]

function UseCasePage({ slug }) {
  const data = cases[slug]
  if (!data) return <div className="py-40 text-center text-stone-500">Use case not found.</div>
  const { icon: Icon, title, hero, body, benefits, quote, quoteAuthor } = data
  useReveal()
  return (
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-7 animate-fade-in">
            <Icon size={28} className="text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">{title}</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">{hero}</h1>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-start">
          <div className="reveal">
            <p className="text-stone-600 leading-relaxed text-lg mb-8">{body}</p>
            <Link to="/get-started" className="inline-flex items-center gap-2 bg-navy-800 text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-navy-700 transition-colors">
              Start your plan <ArrowRight size={15} />
            </Link>
          </div>
          <div className="reveal reveal-delay-1 bg-white rounded-2xl border border-stone-200 p-7">
            <h3 className="font-semibold text-navy-900 text-sm mb-5">How Everstead helps</h3>
            <ul className="space-y-3">
              {benefits.map(b => (
                <li key={b} className="flex items-start gap-3 text-sm text-stone-700">
                  <span className="w-5 h-5 rounded-full bg-sage-50 border border-sage-200 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-16 lg:py-20 bg-sage-50 border-y border-sage-100">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="font-display text-2xl font-light text-navy-950 italic leading-relaxed text-balance">{quote}</p>
          <p className="mt-4 text-stone-500 text-sm">{quoteAuthor}</p>
        </div>
      </section>

      {/* Other use cases */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="font-display text-2xl font-light text-navy-950 mb-8 reveal">Explore other use cases</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCases.filter(c => c.slug !== slug).map((c, i) => (
              <Link
                key={c.slug}
                to={`/use-cases/${c.slug}`}
                className={`reveal reveal-delay-${i + 1} group block rounded-xl border border-stone-200 bg-white p-5 hover:border-navy-300 hover:bg-navy-50 transition-all`}
              >
                <span className="font-semibold text-sm text-navy-900 group-hover:text-navy-700">{c.label}</span>
                <span className="block mt-1 text-xs text-navy-600 font-medium group-hover:gap-2 transition-all">Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function UseCasesIndex() {
  useReveal()
  return (
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">Who it's for</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            Designed for every role in a family plan.
          </h1>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid sm:grid-cols-2 gap-6">
          {allCases.map(({ slug, label }, i) => {
            const data = cases[slug]
            const Icon = data.icon
            return (
              <Link
                key={slug}
                to={`/use-cases/${slug}`}
                className={`reveal reveal-delay-${i + 1} group block bg-white border border-stone-200 rounded-2xl p-7 hover:border-navy-300 hover:shadow-md transition-all`}
              >
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                  <Icon size={20} className="text-navy-700" />
                </div>
                <h2 className="font-semibold text-navy-900 mb-2 group-hover:text-navy-700 transition-colors">{label}</h2>
                <p className="text-stone-500 text-sm leading-relaxed">{data.hero}</p>
                <span className="inline-flex items-center gap-1 text-xs text-navy-600 mt-4 font-medium">Learn more <ArrowRight size={11} /></span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function UseCases() {
  const { slug } = useParams()
  if (slug) return <UseCasePage slug={slug} />
  return <UseCasesIndex />
}
