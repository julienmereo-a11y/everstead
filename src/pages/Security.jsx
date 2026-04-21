import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import {
  ArrowRight, Lock, Shield, Eye, Key, RotateCcw,
  AlertCircle, Users, FileText, CheckCircle2, ExternalLink,
  Server, Globe, ChevronDown
} from 'lucide-react'

const pillars = [
  {
    icon: Lock,
    title: 'AES-256 encryption at rest',
    desc: 'Every file, note, account record, and document you store is encrypted at rest using AES-256 — the standard used by banks and government agencies worldwide.',
  },
  {
    icon: Shield,
    title: 'TLS 1.3 in transit',
    desc: 'All data travelling between your device and our servers is encrypted using TLS 1.3. Your information is never transmitted unprotected, including on public networks.',
  },
  {
    icon: Users,
    title: 'Role-based access control',
    desc: 'Permissions are granular and revocable. You assign exactly what each trusted person can see — financial accounts, legal documents, wishes — independently of one another.',
  },
  {
    icon: Eye,
    title: 'Complete audit log',
    desc: 'Every login, file access, permission change, and update is recorded. You have full visibility into who has accessed your plan and when.',
  },
  {
    icon: Key,
    title: 'Emergency vault access',
    desc: 'You designate a single trusted person with emergency access. You control exactly what they can see and under what conditions access becomes active.',
  },
  {
    icon: RotateCcw,
    title: 'Automated backups',
    desc: 'Your plan is backed up automatically to multiple secure locations with point-in-time restore. No single point of failure. Your data is never at risk from a single incident.',
  },
  {
    icon: AlertCircle,
    title: 'Incident response',
    desc: 'A defined security incident response process is in place. In the unlikely event of a security concern, we notify affected users promptly and transparently.',
  },
  {
    icon: FileText,
    title: 'Privacy first — always',
    desc: 'We do not sell, license, or share your personal information with third parties for advertising or any commercial purpose. Your data is yours. Export or delete it at any time.',
  },
]

const infrastructure = [
  {
    name: 'Supabase',
    role: 'Database, authentication & file storage',
    cert: 'SOC 2 Type II certified',
    region: 'EU West (London)',
    url: 'https://supabase.com/security',
    detail: 'All user data, documents, and account records are stored on Supabase\'s infrastructure, which holds SOC 2 Type II certification. Data is stored exclusively in the EU West (London) region.',
  },
  {
    name: 'Vercel',
    role: 'Application hosting & delivery',
    cert: 'SOC 2 Type II certified',
    region: 'Global CDN, EU-first',
    url: 'https://vercel.com/security',
    detail: 'The Everstead application is hosted on Vercel, which holds SOC 2 Type II certification. Static assets are served via a global CDN with EU-first routing.',
  },
  {
    name: 'Stripe',
    role: 'Payment processing',
    cert: 'PCI DSS Level 1',
    region: 'Global',
    url: 'https://stripe.com/security',
    detail: 'All payment processing is handled by Stripe, the highest-certified payment processor in the world. Everstead never stores card details — they go directly to Stripe.',
  },
  {
    name: 'Resend',
    role: 'Transactional email',
    cert: 'SOC 2 Type II certified',
    region: 'EU',
    url: 'https://resend.com/security',
    detail: 'Transactional emails (invitations, alerts, confirmations) are sent via Resend. Email content containing sensitive information is never stored beyond delivery.',
  },
]

const faqItems = [
  {
    q: 'Can Everstead employees read my documents?',
    a: 'No. Documents are encrypted at rest using AES-256. Access to the storage layer requires service-role credentials which are restricted to automated systems only. No Everstead employee has routine access to your documents or personal data.',
  },
  {
    q: 'Where is my data stored?',
    a: 'All data is stored in the EU West (London) region on Supabase\'s infrastructure. We do not transfer personal data outside of the European Economic Area. This is compliant with UK GDPR and EU GDPR requirements.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'You can export your full plan at any time from your dashboard. If you cancel, your data is retained for 30 days to allow for re-activation, then permanently deleted from all systems. We do not retain backups of deleted accounts beyond 90 days.',
  },
  {
    q: 'What happens if Everstead is breached?',
    a: 'We have a defined incident response plan. In the event of a confirmed breach affecting personal data, we will notify affected users within 72 hours as required by UK GDPR. We will publish a full incident report including scope, timeline, and remediation steps.',
  },
  {
    q: 'Is Everstead GDPR compliant?',
    a: 'Yes. Everstead is operated as a UK-registered company and complies with UK GDPR. We act as a data controller for your personal information. Our lawful basis for processing is contractual necessity and legitimate interest. You have full rights to access, rectification, erasure, and portability of your data.',
  },
  {
    q: 'Do you share data with third parties?',
    a: 'We share data only with the infrastructure providers listed on this page (Supabase, Vercel, Stripe, Resend), strictly for the purpose of operating the service. We never sell, license, or share personal data for advertising or marketing purposes.',
  },
  {
    q: 'Are you SOC 2 certified?',
    a: 'Everstead itself is not yet SOC 2 certified — that certification is targeted for 2026 as we scale the Advisor tier. However, every infrastructure provider we use (Supabase, Vercel, Stripe, Resend) holds SOC 2 Type II certification. We can provide their certification documents on request.',
  },
]

export default function Security() {
  useReveal()
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="bg-stone-50 pt-24">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #3b659d 0%, transparent 55%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-8 animate-fade-in">
            <Shield size={32} className="text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">Security & Privacy</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            Your most sensitive information, protected without compromise.
          </h1>
          <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">
            Everstead was designed from the ground up for trust, privacy, and control. Every technical and operational decision reflects the responsibility we hold.
          </p>
        </div>
      </section>

      {/* ── INFRASTRUCTURE ───────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="reveal mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Infrastructure</p>
            <h2 className="font-display text-3xl font-light text-navy-950 mb-4">
              Built on SOC 2 certified infrastructure — top to bottom.
            </h2>
            <p className="text-stone-600 leading-relaxed max-w-2xl">
              Everstead does not operate its own data centres. Every layer of our stack is handled by providers that hold independent security certifications — so your data is protected at every point in the chain.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {infrastructure.map(({ name, role, cert, region, url, detail }, i) => (
              <div key={name} className={`reveal reveal-delay-${i + 1} bg-stone-50 border border-stone-200 rounded-2xl p-6`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-navy-900 text-sm">{name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{role}</p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-400 hover:text-navy-600 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={11} />{cert}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-navy-50 text-navy-700 border border-navy-200 px-2.5 py-1 rounded-full">
                    <Globe size={11} />{region}
                  </span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECURITY PILLARS ─────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Security controls</p>
            <h2 className="font-display text-3xl font-light text-navy-950 text-balance">
              Eight layers of protection for your plan.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`reveal reveal-delay-${Math.min(i % 4 + 1, 5)} bg-white border border-stone-200 rounded-2xl p-6`}>
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                  <Icon size={20} className="text-navy-700" />
                </div>
                <h3 className="font-semibold text-navy-900 text-sm mb-2">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GDPR / DATA RESIDENCY ────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-navy-950 grain">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4">UK GDPR & Data residency</p>
            <h2 className="font-display text-3xl font-light text-white mb-5">
              Your data stays in the UK. Full stop.
            </h2>
            <p className="text-stone-300 leading-relaxed mb-5">
              Everstead is operated as a UK-registered company and is compliant with UK GDPR. All personal data is stored and processed exclusively in the EU West (London) region. We never transfer your data outside the EEA.
            </p>
            <p className="text-stone-400 text-sm leading-relaxed">
              As a data controller, we are responsible for how your data is collected, stored, and used. You have the right to access, correct, export, and permanently delete your data at any time — directly from your dashboard or by contacting us.
            </p>
          </div>
          <div className="reveal reveal-delay-1 space-y-3">
            {[
              ['UK GDPR compliant', 'Data processing follows UK GDPR requirements'],
              ['EU West (London) data residency', 'No data transferred outside EEA'],
              ['Right to access & portability', 'Export your full plan at any time'],
              ['Right to erasure', 'Permanent deletion within 30 days of request'],
              ['No third-party data sales', 'Your data is never sold or licensed'],
              ['72-hour breach notification', 'As required by UK GDPR Article 33'],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <CheckCircle2 size={15} className="text-sage-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PERMISSIONS ──────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-stone-50 border-y border-stone-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Role permissions</p>
            <h2 className="font-display text-3xl font-light text-navy-950 mb-5">You control who sees what, always.</h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              Permissions in Everstead are not binary. You don't have to give a trusted person full access to give them relevant access. Every person in your plan has a defined scope — and you can update or revoke it any time.
            </p>
            <p className="text-stone-600 leading-relaxed">
              Share financial account references with your executor, funeral preferences with your children, and legal document access with your attorney — all independently, all reversible.
            </p>
          </div>
          <div className="reveal reveal-delay-1 bg-white rounded-2xl border border-stone-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-5">Sample access matrix</p>
            <div className="space-y-3">
              {[
                { name: 'Sarah (Executor)',   access: ['Accounts', 'Documents', 'Instructions'] },
                { name: 'David (Attorney)',   access: ['Legal documents'] },
                { name: 'Emma (Daughter)',    access: ['Wishes', 'Instructions'] },
                { name: 'James (Advisor)',    access: ['Financial accounts', 'Financial docs'] },
              ].map(({ name, access }) => (
                <div key={name} className="flex items-start gap-3 py-2.5 border-b border-stone-50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 shrink-0 mt-0.5">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy-900">{name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {access.map(a => (
                        <span key={a} className="text-xs bg-navy-50 text-navy-700 border border-navy-100 px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Security FAQ</p>
            <h2 className="font-display text-3xl font-light text-navy-950">Questions we get asked.</h2>
          </div>
          <div className="space-y-3">
            {faqItems.map(({ q, a }, i) => (
              <div key={i} className={`reveal reveal-delay-${Math.min(i + 1, 5)} border border-stone-200 rounded-xl overflow-hidden bg-white`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left flex items-start justify-between gap-4 px-6 py-5"
                >
                  <span className="font-medium text-navy-900 text-sm">{q}</span>
                  <ChevronDown size={16} className={`text-stone-400 mt-0.5 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">{a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <section className="py-16 bg-stone-100 border-t border-stone-200">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-widest text-navy-600 mb-4">Security contact</p>
          <h2 className="font-display text-2xl font-light text-navy-950 mb-4">
            Have a security concern or question?
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
            If you believe you've found a security vulnerability or have a question about how we handle your data, please contact us directly. We take all reports seriously and respond within 48 hours.
          </p>
          <a
            href="mailto:security@everstead.care"
            className="inline-flex items-center gap-2 bg-navy-800 text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-navy-700 transition-colors"
          >
            security@everstead.care
            <ArrowRight size={15} />
          </a>
          <p className="text-xs text-stone-400 mt-5">
            For general support: <a href="mailto:hello@everstead.care" className="text-navy-600 hover:text-navy-900">hello@everstead.care</a>
          </p>
        </div>
      </section>

    </div>
  )
}
