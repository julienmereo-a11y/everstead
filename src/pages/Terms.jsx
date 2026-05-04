import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useReveal } from '../components/useReveal'

const sections = [
  {
    title: 'Acceptance of terms',
    content: `By accessing or using Everstead ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.

These terms apply to all users of the Service, including individuals, families, and professional advisors.`,
  },
  {
    title: 'Description of service',
    content: `Everstead is a secure digital organization platform that helps individuals and families organize accounts, documents, instructions, and wishes for estate planning and family handoff purposes.

Everstead is not a legal services provider and does not provide legal, financial, or tax advice. Nothing in the Service constitutes or replaces advice from a licensed professional.`,
  },
  {
    title: 'Company information',
    content: `Everstead is operated by EVERSTEAD DIGITAL LTD, a private limited company registered in England and Wales under company number 17166825.

Company status: Active. Incorporated on 19 April 2026. Registered office location: London, England, United Kingdom.`,
  },
  {
    title: 'Account registration',
    content: `To use Everstead, you must create an account with accurate information. You are responsible for maintaining the security of your account credentials. You agree to notify us immediately of any unauthorized access to your account.

You must be at least 18 years old to create an account. By registering, you confirm that you meet this requirement.`,
  },
  {
    title: 'Subscription and billing',
    content: `Everstead offers paid subscription plans with monthly and annual billing options. All plans include a 14-day free trial. After the trial period, your selected plan will automatically bill at the applicable rate unless you cancel.

You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period. We do not offer prorated refunds for partial billing periods unless required by applicable law.`,
  },
  {
    title: 'Your content',
    content: `You retain full ownership of all content you add to your Everstead plan, including account references, documents, instructions, and wishes. You grant Everstead a limited license to store, process, and serve your content solely for the purpose of providing the Service.

You are responsible for the accuracy and legality of content you upload. Do not upload content that infringes third-party rights or violates applicable law.`,
  },
  {
    title: 'Acceptable use',
    content: `You agree not to use Everstead for any unlawful purpose, to attempt to gain unauthorized access to any part of the Service, to transmit malware or harmful code, or to impersonate another person.

We reserve the right to suspend or terminate accounts that violate these terms or engage in conduct that harms other users or the integrity of the platform.`,
  },
  {
    title: 'Limitation of liability',
    content: `To the fullest extent permitted by law, Everstead is provided "as is" without warranties of any kind, express or implied. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.

Our total liability for any claim related to the Service is limited to the amount you paid us in the three months preceding the claim.`,
  },
  {
    title: 'Termination',
    content: `We may suspend or terminate your account for violation of these terms, non-payment, or extended inactivity. Upon termination, you will have 30 days to export your data. After that period, your data will be securely deleted per our data retention policy.

You may also delete your account at any time from your account settings.`,
  },
  {
    title: 'Changes to terms',
    content: `We may update these terms periodically. If we make material changes, we will notify you by email or prominent in-app notice at least 14 days before the changes take effect. Continued use of the Service after changes take effect constitutes acceptance.`,
  },
  {
    title: 'Governing law',
    content: `These terms are governed by the laws of England and Wales. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.`,
  },
  {
    title: 'Contact',
    content: `Questions about these terms? Contact us at legal@everstead.care.

Legal entity: EVERSTEAD DIGITAL LTD (company number 17166825), London, England, United Kingdom.`,
  },
]

export default function Terms() {
  useReveal()
  return (
    <>
    <Helmet>
      <title>Terms of Service — Everstead</title>
      <meta name="description" content="The terms that govern your use of Everstead — including subscription billing, your content rights, acceptable use, and how disputes are resolved." />
      <link rel="canonical" href="https://www.everstead.care/terms" />
    </Helmet>
    <div className="bg-stone-50 pt-24 min-h-screen">
      {/* Header */}
      <section className="py-16 lg:py-20 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">Legal</p>
          <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance animate-fade-up">
            Terms of Service
          </h1>
          <p className="mt-4 text-stone-400 text-sm animate-fade-up animate-delay-100">Last updated April 24, 2026</p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="space-y-10">
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
    </>
  )
}
