import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useReveal } from '../components/useReveal'
import { Mail, MessageSquare, ArrowRight, Loader2 } from 'lucide-react'
import { sendEnquiry } from '../lib/supabase'

export default function Contact() {
  useReveal()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))
  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await sendEnquiry('contact', {
        'Name':    form.name,
        'Email':   form.email,
        'Subject': form.subject,
        'Message': form.message,
      })
      setSent(true)
    } catch (err) {
      setError('Something went wrong sending your message. Please email us directly at hello@everstead.care.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <Helmet>
      <title>Contact — Everstead</title>
      <meta name="description" content="Get in touch with the Everstead team. Questions, press inquiries, partnership requests, or technical support — we read every message." />
      <link rel="canonical" href="https://www.everstead.care/contact" />
      <meta property="og:title" content="Contact — Everstead" />
      <meta property="og:description" content="Get in touch with the Everstead team. We read every message and reply within one business day." />
      <meta property="og:url" content="https://www.everstead.care/contact" />
    </Helmet>
    <div className="bg-stone-50 pt-24 min-h-screen">
      {/* Header */}
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">Contact</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            We'd love to hear from you.
          </h1>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">
            Questions, partnership inquiries, press requests — we read every message.
          </p>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16">
          {/* Info */}
          <div className="reveal">
            <h2 className="font-display text-2xl font-medium text-navy-950 mb-8">Get in touch</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={18} className="text-navy-700" />
                </div>
                <div>
                  <p className="font-semibold text-navy-900 text-sm mb-1">General inquiries</p>
                  <a href="mailto:hello@everstead.care" className="text-stone-500 text-sm hover:text-navy-700 transition-colors">hello@everstead.care</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={18} className="text-navy-700" />
                </div>
                <div>
                  <p className="font-semibold text-navy-900 text-sm mb-1">Support</p>
                  <a href="mailto:support@everstead.care" className="text-stone-500 text-sm hover:text-navy-700 transition-colors">support@everstead.care</a>
                  <p className="text-stone-400 text-xs mt-1">Mon–Fri, 9am–5pm GMT</p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-white border border-stone-200 rounded-2xl">
              <p className="font-semibold text-navy-900 text-sm mb-2">Looking to book a demo?</p>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">
                Estate advisors and professionals can schedule a guided walkthrough of the Advisor plan.
              </p>
              <Link
                to="/book-demo"
                className="inline-flex items-center gap-2 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors"
              >
                Book an advisor demo <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="reveal reveal-delay-1">
            {sent ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#4c7d47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="font-display text-2xl font-light text-navy-950 mb-2">Message sent</h3>
                  <p className="text-stone-500 text-sm">We'll get back to you within 1–2 business days.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">Name</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Your name"
                      className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@example.com"
                      className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">Subject</label>
                  <select name="subject" value={form.subject} onChange={handleChange} required
                    className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition appearance-none">
                    <option value="">Select a topic</option>
                    <option>General question</option>
                    <option>Technical support</option>
                    <option>Advisor / partnership inquiry</option>
                    <option>Press or media</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">Message</label>
                  <textarea name="message" value={form.message} onChange={handleChange} required rows={5}
                    placeholder="How can we help?"
                    className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition resize-none" />
                </div>
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0"><circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5"/><path d="M8 5v3.5M8 10.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full text-white font-semibold text-sm py-3.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#4c7d47' }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3d6b3a' }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#4c7d47'}>
                  {submitting ? <><Loader2 size={15} className="animate-spin" />Sending…</> : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
    </>
  )
}
