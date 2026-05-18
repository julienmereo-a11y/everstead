import React from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'

const categories = [
  {
    name: 'Essential cookies',
    required: true,
    description:
      'These cookies are strictly necessary for Everstead to function. They keep you securely logged in, protect your session against fraud, and ensure the platform works correctly. They cannot be disabled — the service cannot operate without them. No consent is required under UK PECR.',
    examples: 'Authentication session tokens, security tokens, user preference cookies.',
    provider: 'Everstead Digital Ltd',
    retention: 'Session / up to 1 year',
  },
  {
    name: 'Analytics cookies',
    required: false,
    description:
      'We use Google Analytics to understand how visitors use our website — which pages are visited, how long people spend on them, and how they arrive. This helps us improve the product. These cookies are only placed after you give your consent. No personally identifiable information is collected.',
    examples: '_ga, _gid, _gat',
    provider: 'Google LLC (data may be processed in the USA under standard contractual clauses)',
    retention: 'Up to 2 years',
  },
  {
    name: 'Marketing cookies',
    required: false,
    description:
      'We use Meta Pixel to measure the effectiveness of our advertising on Facebook and Instagram. This cookie is only placed after you consent to marketing cookies. We do not use it to build advertising profiles or sell your data.',
    examples: '_fbp, _fbc',
    provider: 'Meta Platforms Ireland Ltd',
    retention: 'Up to 3 months',
  },
]

export default function Cookies() {
  useReveal()
  return (
    <>
      <Helmet>
        <title>Cookie Policy — Everstead</title>
        <meta name="description" content="How Everstead uses cookies — what they are, which ones we set, and how to manage your preferences." />
        <link rel="canonical" href="https://www.everstead.care/cookies" />
      </Helmet>

      <div className="bg-stone-50 pt-24 min-h-screen">
        <section className="py-16 lg:py-20 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">Legal</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance animate-fade-up">
              Cookie Policy
            </h1>
            <p className="mt-4 text-stone-400 text-sm animate-fade-up animate-delay-100">Last updated May 2026</p>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 space-y-10">

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">What are cookies?</h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                Cookies are small text files placed on your device when you visit a website. They help websites function correctly and allow us to understand how people use Everstead so we can improve it.
              </p>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-6">Cookies we use</h2>
              <div className="space-y-6">
                {categories.map(cat => (
                  <div key={cat.name} className="rounded-2xl border border-stone-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-navy-900 text-sm">{cat.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cat.required ? 'bg-navy-100 text-navy-700' : 'bg-stone-100 text-stone-600'}`}>
                        {cat.required ? 'Always active' : 'Consent required'}
                      </span>
                    </div>
                    <p className="text-stone-600 text-sm leading-relaxed mb-4">{cat.description}</p>
                    <div className="grid sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-stone-500 uppercase tracking-wide mb-1">Examples</p>
                        <p className="text-stone-500 font-mono">{cat.examples}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-500 uppercase tracking-wide mb-1">Provider</p>
                        <p className="text-stone-500">{cat.provider}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-500 uppercase tracking-wide mb-1">Retention</p>
                        <p className="text-stone-500">{cat.retention}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">What we do not use</h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                Everstead does not use advertising profiling cookies, social media tracking pixels (beyond the Meta Pixel described above), or any third-party data broker technologies. We never sell your data to third parties.
              </p>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">Managing your preferences</h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-3">
                When you first visit Everstead, a cookie banner will ask for your consent to non-essential cookies. You can change or withdraw your consent at any time by clicking <strong>"Cookie settings"</strong> in the footer of any page.
              </p>
              <p className="text-stone-600 text-sm leading-relaxed">
                You can also manage cookies through your browser settings. Please note that disabling essential cookies may prevent you from logging in or using parts of the platform.
              </p>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">Legal basis</h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                Our use of cookies complies with the UK Privacy and Electronic Communications Regulations (PECR) and UK GDPR. Essential cookies are set on the basis of legitimate interest. Analytics and marketing cookies are set only on the basis of your explicit consent.
              </p>
            </div>

            <div className="reveal">
              <h2 className="font-display text-xl font-medium text-navy-950 mb-3">Contact</h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                Questions about our use of cookies? Email us at{' '}
                <a href="mailto:hello@everstead.care" className="text-navy-700 hover:text-navy-900 underline">hello@everstead.care</a>{' '}
                or see our full{' '}
                <Link to="/privacy" className="text-navy-700 hover:text-navy-900 underline">Privacy Policy</Link>.
              </p>
              <p className="mt-4 text-stone-400 text-xs">
                Everstead Digital Ltd — registered in England &amp; Wales, No. 17166825. ICO registration no. 00013988672.
              </p>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
