import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const { t } = useTranslation('login')
  const [email, setEmail]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent]             = useState(false)
  const [error, setError]           = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('forgot.errors.generic'))
      }
      setSent(true)
    } catch (err) {
      setError(err.message ?? t('forgot.errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div style={{ backgroundColor: '#f8f7f5' }} className="pt-24 min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={24} className="text-sage-600" />
              </div>
              <h1 className="font-display text-2xl font-light text-navy-950 mb-2" style={{ fontFamily: 'Georgia, serif' }}>{t('forgot.sentTitle')}</h1>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                {t('forgot.sentBody1')} <strong>{email}</strong>{t('forgot.sentBody2')}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-navy-700 font-medium text-sm hover:text-navy-900 transition-colors"
              >
                <ArrowLeft size={13} /> {t('forgot.backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="font-display text-2xl font-light text-navy-950 mb-1" style={{ fontFamily: 'Georgia, serif' }}>{t('forgot.title')}</h1>
                <p className="text-stone-500 text-sm">{t('forgot.subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5">{t('forgot.emailLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder={t('forgot.emailPlaceholder')}
                    className="w-full border border-stone-300 rounded-lg px-4 py-3 text-sm text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-navy-400 bg-white transition"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-aurora w-full text-white font-semibold text-sm py-3.5 rounded-full transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? <><Loader2 size={15} className="animate-spin" />{t('forgot.submitLoading')}</> : t('forgot.submit')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-navy-700 transition-colors"
                >
                  <ArrowLeft size={13} /> {t('forgot.backToLogin')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
