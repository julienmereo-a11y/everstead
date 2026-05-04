import React from 'react'
import { Helmet } from 'react-helmet-async'
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

If you are located in the UK or European Economic Area, you have additional rights under UK GDPR and EU GDPR, including rights of access, rectification, erasure, and data portability. Contact us at privacy@everstead.care to exercise these rights.`,
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
    content: `Questions about this policy or your data? Contact us at privacy@everstead.care.

Data controller: EVERSTEAD DIGITAL LTD (company number 17166825), London, England, United Kingdom.`,
  },
]

export default function Privacy() {
  useReveal()
  return (
    <>
    <Helmet>
      <title>Privacy Policy — Everstead</title>
      <meta name="description" content="How Everstead collects, uses, and protects your personal information. Your data is encrypted, never sold, and always under your control." />
      <link rel="canonical" href="https://www.everstead.care/privacy" />
    </Helmet>
    <div className="bg-stone-50 pt-24 min-h-screen">
      {/* Header */}
      <section className="py-16 lg:py-20 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">Legal</p>
          <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance animate-fade-up">
            Privacy Policy
          </h1>
          <p className="mt-4 text-stone-400 text-sm animate-fade-up animate-delay-100">Last updated April 24, 2026</p>
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

            <div id="cookies" className="reveal space-y-6">
              <h2 className="font-display text-xl font-medium text-navy-950">Cookie Policy</h2>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">What are cookies?</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Cookies are small text files placed on your device when you visit a website.
                  They help websites function correctly and provide information to website owners.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">How we use cookies</h3>
                <p className="text-stone-600 text-sm leading-relaxed">Everstead uses two types of cookies:</p>

                <div className="space-y-2">
                  <h4 className="font-semibold text-navy-800 text-sm">Essential cookies (always active)</h4>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    These cookies are strictly necessary for Everstead to function. They keep you
                    securely logged in, protect your session against fraud, and ensure the platform
                    operates correctly. These cookies cannot be disabled as the service cannot work
                    without them. No consent is required for these cookies under UK PECR.
                  </p>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    Examples include: authentication session cookies, security tokens, user preference cookies.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-navy-800 text-sm">Analytics cookies (require your consent)</h4>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    We use Google Analytics to understand how visitors use our website — which pages
                    are visited, how long people spend on them, and where they come from. This helps
                    us improve Everstead. These cookies are only placed on your device after you give
                    your consent. No personally identifiable information is collected through analytics cookies.
                  </p>
                  <p className="text-stone-600 text-sm leading-relaxed">
                    Provider: Google Analytics (Google LLC). Data may be processed in the USA under standard contractual clauses.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">What we do not use</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Everstead does not use advertising cookies, marketing tracking pixels, social media
                  cookies, or any third-party tracking technologies beyond Google Analytics. We never
                  sell your data.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">Managing your cookie preferences</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  You can change or withdraw your cookie consent at any time by clicking
                  "Cookie settings" in the footer of our website. You can also control cookies
                  through your browser settings — please note that disabling essential cookies
                  may affect the functionality of the platform.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-navy-900 text-sm">Contact</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  If you have any questions about our use of cookies, please contact us at{' '}
                  <a href="mailto:hello@everstead.care" className="text-navy-700 hover:text-navy-900 underline">hello@everstead.care</a>.
                </p>
              </div>

              <p className="text-stone-500 text-xs leading-relaxed italic">
                Last updated: May 2026. Everstead Digital Ltd, registered in England &amp; Wales, No. 17166825.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  )
}
