import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Folder, FileText, ClipboardList, Users, Share2, Heart, CreditCard, BarChart3 } from 'lucide-react'

const features = [
  { icon: Folder,       title: 'Account Inventory',     desc: 'Organise every financial, digital, and practical account in one place.' },
  { icon: FileText,     title: 'Document Vault',         desc: 'Upload, tag, and share legal and personal documents with the right people.' },
  { icon: ClipboardList,title: 'Instructions',           desc: 'Leave clear step-by-step guidance for loved ones when they need it most.' },
  { icon: Users,        title: 'Trusted People',         desc: 'Assign roles and control who sees what — executor, family, advisor, and more.' },
  { icon: Share2,       title: 'Access Controls',        desc: 'Share by category, revoke any time, with a full audit log of every access.' },
  { icon: Heart,        title: 'Final Wishes',           desc: 'Capture personal preferences — from funeral wishes to sentimental items.' },
  { icon: CreditCard,   title: 'Subscription Tracker',  desc: 'Catalog every recurring cost so nothing is missed or left running.' },
  { icon: BarChart3,    title: 'Readiness Score',        desc: 'A clear completeness indicator showing what is done and what is missing.' },
]

export default function Features() {
  return (
    <div className="bg-stone-50 pt-24">

      {/* Header */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-800 to-navy-700" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5">Features</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            Everything you need, nothing you don't.
          </h1>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto">
            Everstead gives you a calm, complete picture of your estate — organised, accessible, and ready when it matters.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center">
                  <Icon size={20} className="text-navy-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-navy-950 mb-1">{title}</h2>
                  <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy-950 grain relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #6ea6d8, transparent 50%)' }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-light text-white mb-6">Ready to put your plan in order?</h2>
          <Link to="/get-started" className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold text-sm px-7 py-3.5 rounded-lg hover:bg-stone-100 transition-colors">
            Get Started Free <ArrowRight size={15} />
          </Link>
        </div>
      </section>

    </div>
  )
}
