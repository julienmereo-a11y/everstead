import React from 'react'
import { Link } from 'react-router-dom'

const cols = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'How We Protect Data', href: '/security' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    heading: 'Use Cases',
    links: [
      { label: 'For Families', href: '/use-cases/families' },
      { label: 'For Parents', href: '/use-cases/parents' },
      { label: 'For Executors', href: '/use-cases/executors' },
      { label: 'For Advisors', href: '/use-cases/advisors' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', href: '/resources/blog' },
      { label: 'Guides', href: '/resources/guides' },
      { label: 'Checklists', href: '/resources/checklists' },
      { label: 'FAQs', href: '/resources/faqs' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Book Demo', href: '/book-demo' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-stone-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-navy-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" fillOpacity="0.9"/>
                  <path d="M8 5L11 6.75V10.25L8 12L5 10.25V6.75L8 5Z" fill="white" fillOpacity="0.25"/>
                </svg>
              </div>
              <span className="font-display text-lg font-semibold text-white tracking-tight">Everstead</span>
            </Link>
            <p className="text-sm leading-relaxed text-stone-500 max-w-[220px]">
              A secure family handoff platform for the moments that matter most.
            </p>
            <p className="text-xs leading-relaxed text-stone-600 max-w-[240px]">
              Everstead is an organisation platform, not a legal service or law firm.
            </p>
          </div>

          {/* Columns */}
          {cols.map(col => (
            <div key={col.heading}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link to={l.href} className="text-sm text-stone-400 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-navy-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone-600">
          <p>© {new Date().getFullYear()} Everstead. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-stone-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-stone-400 transition-colors">Terms</Link>
            <Link to="/security" className="hover:text-stone-400 transition-colors">Trust</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
