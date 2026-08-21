import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import HreflangLinks from '../components/HreflangLinks'
import { useTranslation } from 'react-i18next'
import { useReveal } from '../components/useReveal'
import { ArrowRight, Briefcase, Calendar, CheckCircle2, ShieldCheck, Users, Loader2 } from 'lucide-react'
import { sendEnquiry } from '../lib/supabase'
import i18n from '../i18n'
import enBookDemo from '../i18n/locales/en/bookDemo.json'
import frBookDemo from '../i18n/locales/fr/bookDemo.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later — re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'bookDemo', enBookDemo)
i18n.addResourceBundle('fr', 'bookDemo', frBookDemo)

// Icons for the info cards — the copy lives in the "bookDemo" i18n namespace.
const INFO_CARD_ICONS = [Calendar, Users, ShieldCheck, Briefcase]

export default function BookDemo() {
  useReveal()
  const { t } = useTranslation('bookDemo')
  const [form, setForm] = useState({ name: '', email: '', firm: '', role: '', clients: '', notes: '' })
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const benefits = t('coverage.benefits', { returnObjects: true })
  const infoCards = t('infoCards', { returnObjects: true })
    .map((card, i) => ({ ...card, icon: INFO_CARD_ICONS[i] }))

  const handleChange = (event) => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    await sendEnquiry('book-demo', {
      'Full name':       form.name,
      'Work email':      form.email,
      'Firm':            form.firm,
      'Role':            form.role,
      'Client families': form.clients,
      'Notes':           form.notes,
    })
    setSubmitting(false)
    setSent(true)
  }

  return (
    <>
    <Helmet>
      <title>{t('meta.title')}</title>
      <meta name="description" content={t('meta.description')} />
      <link rel="canonical" href="https://www.everstead.care/book-demo" />
      <meta property="og:title" content={t('meta.ogTitle')} />
      <meta property="og:description" content={t('meta.ogDescription')} />
      <meta property="og:url" content="https://www.everstead.care/book-demo" />
    </Helmet>
    <HreflangLinks path="/book-demo" />
    <div className="bg-stone-50 pt-24 min-h-screen">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 aurora-bg" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage-300 mb-5">{t('hero.eyebrow')}</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance">
            {t('hero.title')}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-300 max-w-3xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-16">
          <div className="reveal">
            <h2 className="font-display text-3xl font-light text-navy-950 mb-6">{t('coverage.title')}</h2>
            <ul className="space-y-3 mb-10">
              {benefits.map(item => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-stone-700">
                  <CheckCircle2 size={16} className="text-sage-600 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="space-y-4">
              {infoCards.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4">
                  <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-500">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal reveal-delay-1">
            {sent ? (
              <div className="rounded-[2rem] border border-stone-200 bg-white p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center mb-5">
                  <CheckCircle2 size={28} className="text-sage-700" />
                </div>
                <h3 className="font-display text-3xl font-light text-navy-950">{t('sent.title')}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-500 max-w-sm">
                  {t('sent.body')}
                </p>
                <Link to="/security" className="inline-flex items-center gap-2 mt-7 text-sm font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                  {t('sent.cta')} <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-[2rem] border border-stone-200 bg-white p-8 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t('form.name.label')}>
                    <input name="name" value={form.name} onChange={handleChange} required placeholder={t('form.name.placeholder')} className={inputClass} />
                  </Field>
                  <Field label={t('form.email.label')}>
                    <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder={t('form.email.placeholder')} className={inputClass} />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t('form.firm.label')}>
                    <input name="firm" value={form.firm} onChange={handleChange} required placeholder={t('form.firm.placeholder')} className={inputClass} />
                  </Field>
                  <Field label={t('form.role.label')}>
                    <input name="role" value={form.role} onChange={handleChange} required placeholder={t('form.role.placeholder')} className={inputClass} />
                  </Field>
                </div>
                <Field label={t('form.clients.label')}>
                  <input name="clients" value={form.clients} onChange={handleChange} placeholder={t('form.clients.placeholder')} className={inputClass} />
                </Field>
                <Field label={t('form.notes.label')}>
                  <textarea name="notes" rows={4} value={form.notes} onChange={handleChange} placeholder={t('form.notes.placeholder')} className={inputClass} />
                </Field>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-aurora inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {submitting ? <><Loader2 size={15} className="animate-spin" />{t('form.sending')}</> : <>{t('form.submit')} <ArrowRight size={15} /></>}
                </button>
                <p className="text-xs leading-relaxed text-stone-500">
                  {t('form.disclaimer')}
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
    </>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-stone-600 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-navy-900 placeholder-stone-400 transition focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-300'
