import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Loader2, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import enMessageView from '../i18n/locales/en/messageView.json'
import frMessageView from '../i18n/locales/fr/messageView.json'

// Self-registered namespace (keeps src/i18n/index.js untouched). Safe to move
// into the central resources map later: re-adding the same bundle is a no-op.
i18n.addResourceBundle('en', 'messageView', enMessageView)
i18n.addResourceBundle('fr', 'messageView', frMessageView)

// Public page for an unregistered recipient to read a released personal message
// via its secure token link (/m/:token). No login required.
export default function MessageView() {
  const { token } = useParams()
  const { t } = useTranslation('messageView')
  const [state, setState] = useState({ status: 'loading', msg: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/messages/view?token=${encodeURIComponent(token)}`)
        if (!res.ok) { if (!cancelled) setState({ status: 'notfound' }); return }
        const data = await res.json()
        if (!cancelled) setState({ status: 'ok', msg: data })
      } catch {
        if (!cancelled) setState({ status: 'notfound' })
      }
    })()
    return () => { cancelled = true }
  }, [token])

  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-GB'
  const fmt = (iso) => { try { return new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long' }).format(new Date(iso)) } catch { return '' } }

  return (
    <div className="min-h-screen aurora-field aurora-dim flex flex-col">
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="px-6 py-5">
        <Link to="/"><img src="/logo-v2-white.png" alt="Everstead" className="h-9 w-auto" /></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        {state.status === 'loading' && (
          <div className="text-white/70 flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> {t('loading')}</div>
        )}

        {state.status === 'notfound' && (
          <div className="text-center max-w-md">
            <h1 className="font-display text-3xl font-light text-white mb-3">{t('notFound.title')}</h1>
            <p className="text-navy-200 text-sm leading-relaxed">{t('notFound.body')}</p>
          </div>
        )}

        {state.status === 'ok' && state.msg && (
          <div className="w-full max-w-xl">
            <div className="text-center mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-300 mb-3">{state.msg.recipientName ? t('forName', { name: state.msg.recipientName }) : t('forYou')}</p>
              <h1 className="font-display text-3xl lg:text-4xl font-light text-white">{state.msg.title}</h1>
              <p className="text-navy-200 text-sm mt-3">{t('from', { name: state.msg.senderName })}{state.msg.releasedAt ? ` · ${fmt(state.msg.releasedAt)}` : ''}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {state.msg.type === 'video' && state.msg.mediaUrl && (
                <video src={state.msg.mediaUrl} controls playsInline className="w-full bg-black max-h-[60vh]" />
              )}
              {state.msg.type === 'photo' && state.msg.mediaUrl && (
                <img src={state.msg.mediaUrl} alt={state.msg.title} className="w-full object-contain bg-stone-50 max-h-[60vh]" />
              )}
              {state.msg.content && (
                <p className="text-navy-900 text-base leading-relaxed whitespace-pre-wrap px-7 py-6" style={{ fontFamily: 'Georgia, serif' }}>
                  {state.msg.content}
                </p>
              )}
            </div>
            <p className="text-center text-navy-300 text-xs mt-6 flex items-center justify-center gap-1.5">
              <Heart size={11} /> {t('footer')}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
