import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { BookOpen, FileText, CheckSquare, HelpCircle, ArrowRight } from 'lucide-react'

const sections = {
  blog: {
    label: 'Blog',
    icon: BookOpen,
    desc: 'Practical guidance on estate planning, family organization, and digital life management.',
    posts: [
      { title: 'What executors wish they had known', date: 'March 2026', tag: 'Estate planning', desc: 'A practical look at the most common challenges executors face — and how to make the role easier for the people you choose.' },
      { title: 'The digital accounts problem: what happens to your online life', date: 'February 2026', tag: 'Digital life', desc: 'Social media, cloud storage, email, crypto. Most people have dozens of accounts and no plan for what happens to them.' },
      { title: 'How to have the "estate conversation" with aging parents', date: 'February 2026', tag: 'Family', desc: 'Tips for starting a practical and compassionate conversation about organization without it feeling like a confrontation.' },
      { title: 'Why a will alone isn\'t enough', date: 'January 2026', tag: 'Estate planning', desc: 'Wills handle legal distribution — but the practical chaos of an estate often has nothing to do with the will.' },
      { title: 'Building your family\'s financial inventory', date: 'January 2026', tag: 'Organization', desc: 'Step by step: how to document your accounts, subscriptions, and assets so everything is findable when it matters.' },
      { title: 'What financial advisors can offer beyond the portfolio', date: 'December 2025', tag: 'Advisors', desc: 'Estate organization is an emerging service offering that deepens client relationships and differentiates practices.' },
    ],
  },
  guides: {
    label: 'Guides',
    icon: FileText,
    desc: 'Comprehensive guides on key topics in estate planning and family readiness.',
    posts: [
      { title: 'Complete guide to digital estate planning', date: 'Updated 2026', tag: 'Comprehensive', desc: 'A full overview of what digital estate planning involves, from account inventories to platform-specific policies for each major service.' },
      { title: 'The executor\'s playbook', date: 'Updated 2026', tag: 'Executors', desc: 'A structured guide to fulfilling executor duties: legal steps, financial tasks, timelines, and common pitfalls to avoid.' },
      { title: 'Setting up an emergency vault', date: 'Updated 2026', tag: 'Security', desc: 'How to designate emergency access and what to include, so a trusted person can act quickly without compromise.' },
      { title: 'Financial accounts inventory: a starter framework', date: 'Updated 2026', tag: 'Organization', desc: 'A categorized approach to documenting banking, investments, insurance, and subscriptions — everything you\'d want someone to find.' },
    ],
  },
  checklists: {
    label: 'Checklists',
    icon: CheckSquare,
    desc: 'Practical, printable checklists to help you build and review your plan.',
    posts: [
      { title: 'Estate readiness checklist', date: 'Updated 2026', tag: 'Starter', desc: 'A 40-item checklist covering accounts, documents, contacts, wishes, and sharing — the core of a complete estate plan.' },
      { title: 'Executor first steps checklist', date: 'Updated 2026', tag: 'Executors', desc: 'The first 30 days after a death: what to do, who to contact, what to locate, and what to defer.' },
      { title: 'Annual plan review checklist', date: 'Updated 2026', tag: 'Maintenance', desc: 'A short checklist to run once a year — or after a major life event — to keep your plan current and complete.' },
      { title: 'Digital accounts inventory template', date: 'Updated 2026', tag: 'Templates', desc: 'A structured template for cataloging every digital account: login reference, category, action instructions, and owner.' },
    ],
  },
  faqs: {
    label: 'FAQs',
    icon: HelpCircle,
    desc: 'Answers to the most common questions about Everstead and estate planning.',
    posts: [
      { title: 'General questions about Everstead', date: null, tag: 'Product', desc: 'How does Everstead work? Who is it for? What makes it different from a password manager or a will?' },
      { title: 'Security and privacy questions', date: null, tag: 'Security', desc: 'How is data encrypted? Who can access my plan? What happens if there\'s a data breach?' },
      { title: 'Pricing and billing questions', date: null, tag: 'Billing', desc: 'Free trial details, how to cancel, what happens to your data, switching plans.' },
      { title: 'Estate planning 101', date: null, tag: 'Education', desc: 'Answers to common questions about wills, trusts, executors, POA, and how Everstead fits in.' },
    ],
  },
}

const sectionList = [
  { slug: 'blog', label: 'Blog', icon: BookOpen },
  { slug: 'guides', label: 'Guides', icon: FileText },
  { slug: 'checklists', label: 'Checklists', icon: CheckSquare },
  { slug: 'faqs', label: 'FAQs', icon: HelpCircle },
]

function ResourceSection({ slug }) {
  const data = sections[slug]
  useReveal()
  if (!data) return <div className="py-40 text-center text-stone-500">Section not found.</div>
  const { label, icon: SectionIcon, desc, posts } = data
  return (
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-7 animate-fade-in">
            <SectionIcon size={24} className="text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">Resources</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">{label}</h1>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">{desc}</p>
        </div>
      </section>

      {/* Section nav */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 flex gap-1 overflow-x-auto py-3">
          {sectionList.map(s => (
            <Link
              key={s.slug}
              to={`/resources/${s.slug}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${s.slug === slug ? 'bg-navy-50 text-navy-800' : 'text-stone-600 hover:bg-stone-100 hover:text-navy-800'}`}
            >
              <s.icon size={14} />
              {s.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid sm:grid-cols-2 gap-6">
          {posts.map(({ title, date, tag, desc: postDesc }, i) => (
            <div key={title} className={`reveal reveal-delay-${Math.min(i + 1, 5)} bg-white border border-stone-200 rounded-2xl p-7 hover:border-navy-200 hover:shadow-sm transition-all cursor-pointer`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-navy-50 text-navy-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-navy-100">{tag}</span>
                {date && <span className="text-xs text-stone-400">{date}</span>}
              </div>
              <h3 className="font-semibold text-navy-900 mb-2 leading-snug">{title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">{postDesc}</p>
              <span className="inline-flex items-center gap-1 text-xs text-navy-700 font-medium hover:gap-2 transition-all">Read more <ArrowRight size={11} /></span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ResourcesIndex() {
  useReveal()
  return (
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">Resources</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            Guides, checklists, and insight.
          </h1>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">
            Everything you need to understand estate planning and get your family plan in order.
          </p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid sm:grid-cols-2 gap-6">
          {sectionList.map(({ slug, label, icon: Icon }, i) => {
            const data = sections[slug]
            return (
              <Link
                key={slug}
                to={`/resources/${slug}`}
                className={`reveal reveal-delay-${i + 1} group bg-white border border-stone-200 rounded-2xl p-7 hover:border-navy-300 hover:shadow-md transition-all`}
              >
                <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                  <Icon size={22} className="text-navy-700" />
                </div>
                <h2 className="font-semibold text-navy-900 mb-2 group-hover:text-navy-700 transition-colors">{label}</h2>
                <p className="text-stone-500 text-sm leading-relaxed mb-4">{data.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs text-navy-700 font-medium">Browse {label.toLowerCase()} <ArrowRight size={11} /></span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function Resources() {
  const { section } = useParams()
  if (section) return <ResourceSection slug={section} />
  return <ResourcesIndex />
}
