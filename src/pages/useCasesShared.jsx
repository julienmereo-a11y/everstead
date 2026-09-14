import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users, Heart, User, BookOpen, Briefcase,
  FolderOpen, ClipboardList, Bell, Shield, Lock, Eye,
} from 'lucide-react'

// Shared between the use-case index, the persona template (UseCases.jsx) and
// the families page (UseCaseFamilies.jsx). Icons, colours and hrefs only: all
// visible text lives in the "useCases" i18n namespace.

export const cases = {
  families: {
    icon: Users,
    color: 'navy',
    featureIcons: [FolderOpen, ClipboardList, Bell],
  },
  parents: {
    icon: Heart,
    color: 'sage',
    featureIcons: [Heart, Shield, ClipboardList],
  },
  'aging-adults': {
    icon: User,
    color: 'stone',
    featureIcons: [Lock, Bell, Eye],
  },
  executors: {
    icon: BookOpen,
    color: 'amber',
    featureIcons: [ClipboardList, FolderOpen, Shield],
  },
  advisors: {
    icon: Briefcase,
    color: 'indigo',
    featureIcons: [Users, Eye, Briefcase],
    ctaHref: '/book-demo',
  },
}

export const allCases = ['families', 'parents', 'aging-adults', 'executors', 'advisors']

// "Explore other use cases" strip at the foot of every persona page.
export function OtherUseCases({ current }) {
  const { t } = useTranslation('useCases')
  return (
    <section className="py-16 lg:py-20 bg-white border-t border-stone-100">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <h2 className="font-display text-xl font-light text-navy-950 mb-7 reveal">{t('sections.exploreOther')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allCases.filter(c => c !== current).map((c, i) => {
            const CIcon = cases[c].icon
            return (
              <Link
                key={c}
                to={`/use-cases/${c}`}
                className={`reveal reveal-delay-${i + 1} group block rounded-xl border border-stone-200 bg-stone-50 p-5 hover:border-navy-300 hover:bg-navy-50 transition-all`}
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center mb-3 group-hover:border-navy-200 transition-colors">
                  <CIcon size={15} className="text-navy-600" />
                </div>
                <span className="font-semibold text-sm text-navy-900 group-hover:text-navy-700 block mb-1">{t(`personas.${c}.title`)}</span>
                <span className="text-xs text-navy-600 font-medium group-hover:gap-2 transition-all">{t('sections.explore')}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
