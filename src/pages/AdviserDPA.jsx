import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useReveal } from '../components/useReveal'
import { ChevronDown } from 'lucide-react'

const EFFECTIVE_DATE = '1 May 2026'
const COMPANY        = 'Everstead Digital Ltd'
const COMPANY_NO     = '17166825'

const clauses = [
  {
    title: '1. Definitions',
    body: `"Agreement" means these Data Processing Terms, incorporated by reference into the Everstead Terms of Service.

"Controller" means the Adviser (the natural or legal person using an Everstead Adviser plan) who determines the purposes and means of processing personal data of their clients.

"Processor" means ${COMPANY} (company number ${COMPANY_NO}), registered in England and Wales, which processes personal data on behalf of the Controller.

"Personal Data", "Processing", "Data Subject", "Supervisory Authority" and "Data Breach" have the meanings given in UK GDPR.

"Client Families" means the end-user families whose data is organised within client vaults created or managed by the Adviser through the Everstead platform.`,
  },
  {
    title: '2. Scope and application',
    body: `These Data Processing Terms apply to all processing of personal data carried out by ${COMPANY} on behalf of Advisers in connection with the Everstead Adviser plan.

By activating an Adviser account, the Adviser (as Controller) agrees to these terms. These terms supplement and, where inconsistent, take precedence over the Everstead Terms of Service with respect to data processing activities.

The Adviser warrants that they have a lawful basis to provide client personal data to ${COMPANY} for processing under this Agreement, and that doing so complies with all applicable data protection laws.`,
  },
  {
    title: '3. Details of processing (Schedule 1)',
    body: `Subject matter: Provision of the Everstead secure vault platform for estate organisation.

Duration: For the term of the Adviser's subscription, plus any retention periods set out in these terms.

Nature of processing: Storage, retrieval, display, and deletion of personal data entered into the Everstead platform by the Adviser and/or Client Families.

Purpose: Enabling Client Families to organise accounts, documents, instructions, and wishes; enabling Advisers to support clients with estate readiness; facilitating trusted contact access.

Categories of personal data: Full name, email address, date of birth, home address, financial account details (reference numbers only — no card or banking credentials), identity document references, will and probate information, pension and insurance policy details, personal instructions and wishes.

Categories of data subjects: Client Families and their designated trusted contacts.`,
  },
  {
    title: '4. Processor obligations',
    body: `${COMPANY} shall:

(a) Process personal data only on documented instructions from the Controller (i.e. the operation of the Everstead platform in accordance with these terms), unless required to do so by applicable law;

(b) Ensure that persons authorised to process personal data are bound by appropriate confidentiality obligations;

(c) Implement and maintain appropriate technical and organisational security measures, including AES-256 encryption at rest and TLS 1.3 in transit, access controls, and audit logging;

(d) Not engage any sub-processor without prior notification to the Controller (see clause 6);

(e) Assist the Controller in responding to requests from data subjects exercising their rights under UK GDPR, having regard to the nature of the processing;

(f) Assist the Controller in ensuring compliance with its obligations relating to security, breach notification, data protection impact assessments, and prior consultation with the ICO;

(g) At the Controller's election, delete or return all personal data to the Controller after the end of the provision of services, and delete existing copies unless storage is required by applicable law;

(h) Make available to the Controller all information necessary to demonstrate compliance with these obligations, and allow for and contribute to audits and inspections conducted by the Controller or a mandated auditor.`,
  },
  {
    title: '5. Controller obligations',
    body: `The Controller shall:

(a) Ensure they have a lawful basis under UK GDPR for all personal data provided to ${COMPANY} for processing;

(b) Provide adequate privacy notices to Client Families disclosing the use of Everstead as a data processor;

(c) Ensure that any instruction given to ${COMPANY} complies with applicable data protection law;

(d) Be responsible for the accuracy and adequacy of personal data entered into the platform;

(e) Not instruct ${COMPANY} to process personal data in a manner that would cause ${COMPANY} to violate applicable law.`,
  },
  {
    title: '6. Sub-processors',
    body: `The Controller provides general written authorisation for ${COMPANY} to engage the sub-processors listed in the Subprocessors Annex, each of whom has provided appropriate data protection guarantees and is bound by a written Data Processing Agreement with ${COMPANY}.

The authoritative, up-to-date list is maintained at https://www.everstead.care/subprocessors and is incorporated into this Agreement by reference as if set out in full. The current list as at the effective date of these terms is:

— Supabase Inc. — managed database, authentication, and encrypted file storage (EU, Ireland)
— Vercel Inc. — web hosting and serverless functions (USA / global edge)
— Stripe Payments Europe Ltd. — subscription billing and payment processing (Ireland)
— Resend Inc. — transactional email delivery (USA)
— Functional Software, Inc. (Sentry) — error monitoring and crash reporting; technical context only, no vault content (USA)
— Anthropic, PBC — AI-powered chat assistant and in-product guidance; processes only the messages members send to the assistant, never the contents of their vault (USA)

International transfers to sub-processors located outside the UK are made under the UK International Data Transfer Agreement (UK IDTA) or EU Standard Contractual Clauses with the UK Addendum, as applicable.

${COMPANY} will notify Controllers of any intended changes to sub-processors (additions or replacements) at least 30 days in advance. Notifications are sent (a) directly by email to the Adviser account contact on file and (b) to subscribers of the subprocessor notification list, which any Controller may join at https://www.everstead.care/subprocessors. Controllers are given the opportunity to object during the 30-day notice period; if the Controller objects and the parties cannot resolve the matter within a reasonable period, the Controller may terminate the Agreement without penalty for that reason.`,
  },
  {
    title: '7. International transfers',
    body: `Some sub-processors listed in clause 6 are located in countries outside the UK. Where personal data is transferred to such countries, ${COMPANY} ensures appropriate safeguards are in place, including standard contractual clauses approved by the UK Information Commissioner's Office (UK IDTA or equivalent mechanism under UK GDPR).`,
  },
  {
    title: '8. Security and data breaches',
    body: `${COMPANY} maintains appropriate technical and organisational measures to protect personal data against accidental or unlawful destruction, loss, alteration, unauthorised disclosure, or access.

In the event of a personal data breach affecting Client Family data, ${COMPANY} will notify the Controller without undue delay and in any event within 72 hours of becoming aware, providing: a description of the breach; categories and approximate numbers of data subjects and records affected; the name and contact details of the data protection contact; likely consequences; and measures taken or proposed.

The Controller is responsible for determining whether notification to the Supervisory Authority (ICO) and/or affected data subjects is required.`,
  },
  {
    title: '9. Data subject rights',
    body: `${COMPANY} will, to the extent technically feasible, assist the Controller in fulfilling its obligations to respond to data subject requests. Where a data subject contacts ${COMPANY} directly regarding personal data processed on behalf of the Controller, ${COMPANY} will promptly refer the request to the Controller.

Data subjects whose data is held in client vaults may request access, rectification, erasure, or portability of their data by contacting the Adviser (Controller) directly or writing to ${COMPANY} at privacy@everstead.care, who will coordinate with the relevant Controller.`,
  },
  {
    title: '10. Retention and deletion',
    body: `On termination of an Adviser's subscription, client vault data is retained for 30 days to allow the Controller to retrieve it, then permanently deleted from ${COMPANY}'s systems.

The Controller may request earlier deletion by contacting privacy@everstead.care. ${COMPANY} will confirm deletion in writing within 30 days.

${COMPANY} may retain minimal records (billing history, audit logs) for the period required by applicable law after deletion.`,
  },
  {
    title: '11. Liability and indemnity',
    body: `Each party's liability under these Data Processing Terms is subject to the limitations set out in the Everstead Terms of Service.

If ${COMPANY} is held liable by a Supervisory Authority or court for a data protection violation caused by an instruction from the Controller that violates applicable law, the Controller shall indemnify ${COMPANY} against such liability to the extent attributable to the Controller's breach.`,
  },
  {
    title: '12. Governing law and jurisdiction',
    body: `These Data Processing Terms are governed by the laws of England and Wales. Any disputes arising shall be subject to the exclusive jurisdiction of the courts of England and Wales.`,
  },
  {
    title: '13. Contact and data protection enquiries',
    body: `Data protection enquiries relating to these terms should be directed to:

${COMPANY}
privacy@everstead.care

ICO registration number: 00013988672
Company number: ${COMPANY_NO} (England and Wales)`,
  },
]

function Clause({ title, body }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-start justify-between gap-4 px-6 py-5"
        aria-expanded={open}
      >
        <span className="font-medium text-navy-900 text-sm leading-snug">{title}</span>
        <ChevronDown size={16} className={`text-stone-400 mt-0.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-stone-100 pt-4 space-y-3">
          {body.split('\n\n').map((para, i) => (
            <p key={i} className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">{para}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdviserDPA() {
  useReveal()
  return (
    <>
      <Helmet>
        <title>Data Processing Agreement — Everstead Advisers</title>
        <meta name="description" content="Everstead's Data Processing Agreement for Adviser accounts — UK GDPR Article 28 compliant terms governing how Everstead processes client family data on behalf of advisers." />
        <link rel="canonical" href="https://www.everstead.care/adviser-dpa" />
      </Helmet>

      <div className="bg-stone-50 min-h-screen">
        <section className="pt-40 pb-16 lg:pt-44 lg:pb-20 grain relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">Legal · Advisers</p>
            <h1 className="font-display text-4xl lg:text-5xl font-light text-white leading-tight text-balance animate-fade-up">
              Data Processing Agreement
            </h1>
            <p className="mt-4 text-stone-300 text-sm animate-fade-up animate-delay-100">Effective {EFFECTIVE_DATE} · UK GDPR Article 28 compliant</p>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 space-y-10">

            <div className="reveal rounded-2xl bg-navy-50 border border-navy-100 px-6 py-5">
              <p className="text-sm text-navy-800 leading-relaxed">
                <strong>Who this applies to:</strong> These Data Processing Terms apply to all Adviser plan accounts on Everstead. By activating an Adviser account, you (the Adviser, acting as Data Controller) agree to these terms. Everstead Digital Ltd acts as Data Processor. These terms are automatically incorporated into your Everstead subscription agreement.
              </p>
            </div>

            <div className="reveal space-y-3">
              {clauses.map(c => (
                <Clause key={c.title} title={c.title} body={c.body} />
              ))}
            </div>

            <div className="reveal space-y-3">
              <p className="text-stone-500 text-xs leading-relaxed">
                These Data Processing Terms were last updated on {EFFECTIVE_DATE}. {COMPANY} reserves the right to update these terms to reflect changes in sub-processors, applicable law, or platform capabilities. Material changes will be communicated to Advisers at least 30 days in advance by email.
              </p>
              <p className="text-stone-500 text-xs leading-relaxed">
                {COMPANY} · Registered in England and Wales · Company No. {COMPANY_NO} · ICO Reg. 00013988672 · privacy@everstead.care
              </p>
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
