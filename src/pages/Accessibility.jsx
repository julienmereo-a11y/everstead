import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useReveal } from '../components/useReveal'

const sections = [
  {
    title: 'Our commitment',
    body: `Everstead is committed to making our platform and website accessible to everyone, including people with disabilities. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA as a minimum standard.

We believe accessibility is not a feature — it is a baseline. Everyone should be able to organise their important information and protect the people they love, regardless of how they access the web.`,
  },
  {
    title: 'Current accessibility status',
    body: `We are working continuously to improve the accessibility of Everstead. Current measures include:

— Semantic HTML throughout the application, with appropriate heading structure and landmark regions.
— All interactive elements (buttons, links, form inputs) are keyboard-navigable and include visible focus indicators.
— Colour contrast ratios meet or exceed WCAG 2.1 AA across all core screens.
— Form fields include visible labels; error messages are descriptive and associated with the relevant field.
— Images used for meaning include descriptive alternative text. Decorative images are marked appropriately.
— The platform does not rely on colour alone to convey information.
— Fonts are set in relative units (rem/em) and respect the user's browser text size preferences.`,
  },
  {
    title: 'Known limitations',
    body: `We are aware of the following areas where accessibility can be improved:

— Some complex data visualisations (such as the readiness score chart) may not yet be fully interpretable by screen readers. We are working on text-based alternatives.
— A small number of older document upload interactions may not be fully keyboard-accessible on all browsers. Improvements are in progress.
— PDF documents stored in user vaults are user-generated and may not themselves be accessible.

We prioritise fixing accessibility issues as they are identified. If you encounter a barrier not listed here, please tell us.`,
  },
  {
    title: 'Assistive technology support',
    body: `Everstead is tested with the following combinations:

— NVDA with Chrome on Windows
— VoiceOver with Safari on macOS and iOS
— TalkBack with Chrome on Android

We aim to support all major screen readers and assistive technologies. If you experience issues with a specific tool, please let us know and we will investigate.`,
  },
  {
    title: 'Feedback and contact',
    body: `If you encounter an accessibility barrier on Everstead — or if you need content in an alternative format — please contact us:

Email: hello@everstead.care
Subject: Accessibility

We aim to respond within 5 business days. We take all accessibility reports seriously and will work with you to find a solution.`,
  },
  {
    title: 'Enforcement',
    body: `If you are not satisfied with our response, you can contact the Equality Advisory and Support Service (EASS) in the UK: www.equalityadvisoryservice.com`,
  },
]

export default function Accessibility() {
  useReveal()
  return (
    <>
      <Helmet>
        <title>Accessibility — Everstead</title>
        <meta name="description" content="Everstead's accessibility statement — our commitment to WCAG 2.1 AA, what we've done, known limitations, and how to report issues." />
        <link rel="canonical" href="https://www.everstead.care/accessibility" />
      </Helmet>

      <div className="bg-stone-50 pt-24 min-h-screen">
        <section className="py-16 lg:py-20 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">Legal</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance animate-fade-up">
              Accessibility Statement
            </h1>
            <p className="mt-4 text-stone-400 text-sm animate-fade-up animate-delay-100">Last updated May 2026</p>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="max-w-3xl mx-auto px-6 lg:px-8">
            <div className="space-y-10">
              {sections.map(({ title, body }) => (
                <div key={title} className="reveal">
                  <h2 className="font-display text-xl font-medium text-navy-950 mb-3">{title}</h2>
                  {body.split('\n\n').map((para, i) => (
                    <p key={i} className="text-stone-600 text-sm leading-relaxed mb-3 last:mb-0">{para}</p>
                  ))}
                </div>
              ))}
              <p className="text-stone-400 text-xs reveal">
                Everstead Digital Ltd — registered in England &amp; Wales, No. 17166825.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
