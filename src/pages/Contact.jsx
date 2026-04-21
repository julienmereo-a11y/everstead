import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { Mail, MessageSquare, ArrowRight } from 'lucide-react'

export default function Contact() {
  useReveal()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)

  const handleChange = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }))
  const handleSubmit = e => {
    e.preventDefault()
    setSent(true)
  }

  return (
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
                  <p className="text-stone-500 text-sm">hello@everstead.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={18} className="text-navy-700" />
                </div>
                <div>
                  <p className="font-semibold text-navy-900 text-sm mb-1">Support</p>
                  <p className="text-stone-500 text-sm">support@everstead.com</p>
                  <p className="text-stone-400 text-xs mt-1">Mon–Fri, 9am–5pm ET</p>
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
                <button type="submit"
                  className="w-full bg-navy-800 text-white font-semibold text-sm py-3.5 rounded-lg hover:bg-navy-700 transition-colors">
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
