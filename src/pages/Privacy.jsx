import React from 'react'
import { useReveal } from '../components/useReveal'

const sections = [
  {
    title: 'Information we collect',
    content: `We collect information you provide directly when you create an account, including your name, email address, and password. We also collect the content you add to your plan — account references, document metadata, instructions, and wishes — which is stored encrypted at rest.

We collect limited usage data (pages visited, features used) to improve the platform. We do not use third-party advertising trackers. We do not sell your data to third parties.`,
  },
  {
    title: 'How we use your information',
    content: `Your information is used solely to operate and improve Everstead. Specifically: to provide the service you've signed up for, to send operational communications (account notices, security alerts), to respond to support requests, and to analyze aggregate usage patterns to improve features.

We do not use your personal plan content for any purpose other than serving it to you and the people you explicitly authorize.`,
  },
  {
    title: 'Data storage and security',
    content: `All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Your plan content — accounts, documents, instructions, and wishes — is treated as highly sensitive and stored with bank-equivalent security standards.

We operate on infrastructure with SOC 2-aligned controls, automated backups, and redundant storage across multiple secure locations. Our team accesses your data only when strictly necessary for support, and such access is logged.`,
  },
  {
    title: 'Sharing and disclosure',
    content: `We do not sell, rent, or share your personal information with third parties for marketing or advertising purposes.

We may share minimal data with service providers who help us operate the platform (e.g. cloud infrastructure providers), under strict data processing agreements. We may disclose information if required by law or to protect the rights, property, or safety of Everstead, our users, or the public.`,
  },
  {
    title: 'Your rights and controls',
    content: `You can access, update, or delete your account and plan content at any time from your account settings. You can export your full plan in a structured format on request. Upon account deletion, your data is removed from our systems within 30 days.

If you are located in the European Economic Area, you have additional rights under the GDPR including the right to access, rectification, erasure, and data portability. Contact us at privacy@everstead.com to exercise these rights.`,
  },
  {
    title: 'Cookies',
    content: `Everstead uses strictly necessary session cookies to keep you logged in. We do not use third-party tracking or advertising cookies. You can disable cookies in your browser settings, though some platform features may not function correctly without them.`,
  },
  {
    title: 'Children',
    content: `Everstead is not intended for children under 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected information from a child, please contact us immediately.`,
  },
  {
    title: 'Changes to this policy',
    content: `We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or by a prominent notice on the platform prior to the change becoming effective. The date at the top of this policy reflects the most recent update.`,
  },
  {
    title: 'Contact',
    content: `Questions about this policy or your data? Contact us at privacy@everstead.com or write to: Everstead, Inc., 123 Main Street, Suite 400, New York, NY 10001.`,
  },
]

export default function Privacy() {
  useReveal()
  return (
    <div className="bg-stone-50 pt-24 min-h-screen">
      {/* Header */}
      <section className="py-16 lg:py-20 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">Legal</p>
          <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance animate-fade-up">
            Privacy Policy
          </h1>
          <p className="mt-4 text-stone-400 text-sm animate-fade-up animate-delay-100">Last updated April 9, 2026</p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="prose-style space-y-10">
            {sections.map(({ title, content }, i) => (
              <div key={title} className="reveal">
                <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{title}</h2>
                {content.split('\n\n').map((para, j) => (
                  <p key={j} className="text-stone-600 text-sm leading-relaxed mb-3 last:mb-0">{para}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
