import React from 'react'
import { Link } from 'react-router-dom'

// ── Trustpilot rating (manual) ───────────────────────────────────────────────
// We do NOT recreate Trustpilot's trademarked stars. Instead, drop a genuine,
// unaltered screenshot of your own Trustpilot rating into /public and set `image`
// below — it links to your profile. Until an image is present, a plain-text badge
// (nominative fair use — no trademarked star) shows instead. `label` is the fallback
// text only; keep it matching your real Trustpilot rating.
const TRUSTPILOT = {
  label: 'Excellent',
  profileUrl: 'https://www.trustpilot.com/review/everstead.care',
  image: '/trustpilot-rating.png',   // your real screenshot; falls back to text if missing
}

function TrustpilotBadge() {
  const { label, profileUrl, image } = TRUSTPILOT
  const [imgOk, setImgOk] = React.useState(!!image)
  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-block"
      aria-label={`Rated ${label} on Trustpilot — read our reviews`}
    >
      {imgOk ? (
        <img
          src={image}
          alt={`Rated ${label} on Trustpilot`}
          loading="lazy"
          className="w-auto max-w-[180px] h-auto"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="text-xs text-stone-400 group-hover:text-white transition-colors whitespace-nowrap">
          Rated <span className="font-medium text-[#00b67a]">{label}</span> on Trustpilot&nbsp;→
        </span>
      )}
    </a>
  )
}

const cols = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Security', href: '/security' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    heading: 'Use Cases',
    links: [
      { label: 'For Families', href: '/use-cases/families' },
      { label: 'For Parents', href: '/use-cases/parents' },
      { label: 'For Executors', href: '/use-cases/executors' },
      { label: 'For Advisers', href: '/for-advisers' },
      { label: 'Family Vault', href: '/family-vault' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', href: '/resources/blog' },
      { label: 'Guides', href: '/resources/guides' },
      { label: 'Checklists', href: '/resources/checklists' },
      { label: 'FAQs', href: '/resources/faqs' },
      { label: 'Free Tools', href: '/resources#tools' },
      { label: 'How We Compare', href: '/compare' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Press', href: '/press' },
      { label: 'Book a Demo', href: '/book-demo' },
      { label: '🎁 Give as a gift', href: '/gift' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Data Promise', href: '/data-promise' },
      { label: 'Adviser DPA', href: '/adviser-dpa' },
      { label: 'Subprocessors', href: '/subprocessors' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="aurora-field aurora-dim text-stone-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <Link to="/">
              <img src="/logo-v2-white.png" alt="Everstead" className="h-10 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed text-stone-500 max-w-[220px]">
              A secure family handoff platform for the moments that matter most.
            </p>
            <p className="text-xs leading-relaxed text-stone-600 max-w-[240px]">
              Everstead is an organisation platform, not a legal service or law firm.
            </p>
            <div className="pt-1">
              <TrustpilotBadge />
            </div>
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
          <p>© {new Date().getFullYear()} Everstead Digital Ltd. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-stone-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-stone-400 transition-colors">Terms</Link>
            <Link to="/data-promise" className="hover:text-stone-400 transition-colors">Data Promise</Link>
            <Link to="/cookies" className="hover:text-stone-400 transition-colors">Cookies</Link>
            <Link to="/accessibility" className="hover:text-stone-400 transition-colors">Accessibility</Link>
            <Link to="/security" className="hover:text-stone-400 transition-colors">Trust</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
