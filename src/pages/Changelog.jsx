import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useReveal } from '../components/useReveal'
import { Link } from 'react-router-dom'

const entries = [
  {
    date: 'June 2026',
    tag: 'Update',
    tagColor: 'bg-amber-100 text-amber-700',
    title: 'Save 20% with annual billing + a smoother sign-up',
    items: [
      'New annual pricing — pay yearly and save 20%: Essential £3.19/month (£38.28/year), Family £7.99/month (£95.88/year). Monthly stays £3.99 and £9.99.',
      'Already subscribed? Nothing changes — existing members keep their current price.',
      'Change your plan or switch between monthly and annual right from the payment step, before you confirm.',
      'Refreshing during sign-up no longer loses your place or your saved card.',
      'Clearer trial messaging on the dashboard — your card on file is shown, with no duplicate "add payment" prompts.',
      'Fixes: accurate plan name in confirmation emails, correct totals on gift receipts, and a more reliable Settings page.',
      'Account and subscription controls hardened behind stricter access checks.',
    ],
  },
  {
    date: 'May 2026',
    tag: 'New',
    tagColor: 'bg-sage-100 text-sage-700',
    title: 'Press, Cookies & Accessibility pages',
    items: [
      'Added /press page with company facts, founder bio, and media contact',
      'Added standalone /cookies page with full cookie category breakdown',
      'Added /accessibility statement (WCAG 2.1 AA)',
      'Added Adviser Data Processing Agreement (/adviser-dpa)',
      'Unsubscribe links added to all marketing emails (UK GDPR compliance)',
      'Structured data updated: price, applicationCategory, FAQ schema',
      'noindex tags added to auth and redemption pages',
    ],
  },
  {
    date: 'April 2026',
    tag: 'Improvement',
    tagColor: 'bg-blue-50 text-blue-700',
    title: 'Living vault reframe + plan limits',
    items: [
      'Repositioned Everstead from death-planning to everyday vault — useful today, protected when it counts',
      'Essential plan limits enforced in-app: 1 trusted contact, 10 accounts/documents, 1 instruction set, 1 GB storage',
      'Inline upgrade prompts throughout dashboard — never hidden, always calm',
      'Personal messages locked with aspirational copy on Essential plan',
      'Referral nudge card surfaced in Overview section',
      'Progress celebration toasts for first account, first document, and 100% readiness',
    ],
  },
  {
    date: 'April 2026',
    tag: 'New',
    tagColor: 'bg-sage-100 text-sage-700',
    title: 'Post-cancellation winback + stale vault alerts',
    items: [
      'Cancellation winback email fires on subscription.deleted — 30-day data retention reminder',
      'Stale vault banner appears in dashboard after 30 days of inactivity',
      'Dashboard overview subtitle updated for clarity',
      'Trial-expired modal updated with current launch pricing',
    ],
  },
  {
    date: 'March 2026',
    tag: 'New',
    tagColor: 'bg-sage-100 text-sage-700',
    title: 'Automated email sequences',
    items: [
      'Onboarding drip: 5 emails over 13 days covering accounts, trusted contacts, documents, instructions, and a founder check-in',
      'Birthday email at milestone ages (40, 50, 60, 65, 70)',
      'Re-engagement nudge for low-progress users 7+ days post-signup',
      'Annual review prompt at 12-month anniversary',
      'Trial reminders at 7, 3, and 1 day before expiry',
      'Deletion warning 7 days before scheduled account removal',
    ],
  },
  {
    date: 'March 2026',
    tag: 'New',
    tagColor: 'bg-sage-100 text-sage-700',
    title: 'Gift subscriptions',
    items: [
      '/gift page: purchase an Everstead plan as a gift for someone you love',
      'Gifter receives immediate confirmation email',
      'Recipient receives gift code by email with personalised message',
      'Recipient "vault is ready" email on successful redemption',
      'Gift codes expire after 12 months; scheduled delivery supported',
    ],
  },
  {
    date: 'February 2026',
    tag: 'New',
    tagColor: 'bg-sage-100 text-sage-700',
    title: 'Adviser portal',
    items: [
      'Multi-client workspace for financial advisers, solicitors, and private client teams',
      'Co-branded client portal with adviser logo upload',
      'Delegate dashboard: trusted contacts see only what they are permitted to',
      'Adviser onboarding and /book-demo page for pilot enquiries',
      'Family plan: two private vaults under one subscription',
    ],
  },
  {
    date: 'January 2026',
    tag: 'Launch',
    tagColor: 'bg-navy-100 text-navy-700',
    title: 'Everstead launches',
    items: [
      'Secure vault for accounts, documents, instructions, and wishes',
      'Trusted contact system with granular permission control',
      'Readiness score: 0–100 across five estate categories',
      'MFA, audit log, role-based access control',
      '14-day free trial · Essential from £3.99/month · Family from £9.99/month',
      'UK GDPR compliant · AES-256 encryption · Supabase infrastructure · ICO registered',
    ],
  },
]

export default function Changelog() {
  useReveal()
  return (
    <>
      <Helmet>
        <title>Changelog — Everstead</title>
        <meta name="description" content="What's new and what's improved in Everstead — a running log of product updates, new features, and fixes." />
        <link rel="canonical" href="https://www.everstead.care/changelog" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Changelog — Everstead" />
        <meta property="og:description" content="What's new and what's improved in Everstead — a running log of product updates, new features, and fixes." />
        <meta property="og:url" content="https://www.everstead.care/changelog" />
        <meta property="og:image" content="https://www.everstead.care/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.everstead.care/og-image.png" />
      </Helmet>

      <div className="bg-stone-50 pt-24 min-h-screen">
        <section className="py-16 lg:py-20 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">What's new</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance animate-fade-up">
              Changelog
            </h1>
            <p className="mt-4 text-stone-400 text-sm animate-fade-up animate-delay-100">A running log of everything we ship.</p>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-0 top-2 bottom-0 w-px bg-stone-200 hidden sm:block" style={{ left: '7px' }} />

              <div className="space-y-14">
                {entries.map((entry, i) => (
                  <div key={i} className="reveal sm:pl-10 relative">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-navy-300 hidden sm:block" style={{ left: '0px' }} />

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">{entry.date}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${entry.tagColor}`}>{entry.tag}</span>
                    </div>

                    <h2 className="font-display text-xl font-medium text-navy-950 mb-4">{entry.title}</h2>

                    <ul className="space-y-2.5">
                      {entry.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm leading-relaxed text-stone-600">
                          <span className="text-sage-500 font-bold mt-0.5 shrink-0">—</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal mt-20 rounded-2xl bg-navy-950 px-8 py-8 text-center">
              <p className="text-white font-display text-xl font-light mb-2">Something you'd like to see?</p>
              <p className="text-stone-400 text-sm leading-relaxed mb-5 max-w-sm mx-auto">
                Everstead is built alongside its members. If there's a feature, integration, or improvement you'd find valuable, tell us.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-white text-navy-900 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors"
              >
                Share feedback
              </Link>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
