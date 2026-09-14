// "Send this to your parents": a pre-written message an adult child can forward
// to a parent, with the link already inside. Used on the dashboard overview
// and settings (with the member's referral link, dismissible) and on the
// public families page (plain link). Copy lives in common.json → sendToParents.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Mail, MessageCircle, Share2, X } from 'lucide-react'
import { trackEvent } from '../lib/analytics'

export default function SendToParentsCard({ link, location = 'unknown', dismissKey = null, eyebrow = null, title = null, body = null }) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return dismissKey ? localStorage.getItem(dismissKey) === '1' : false } catch { return false }
  })
  if (dismissed) return null

  const message = t('sendToParents.message', { link, interpolation: { escapeValue: false } })
  const track = (cta) => trackEvent('cta_click', { location, cta: `send_to_parents_${cta}` })
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`
  const mailto = `mailto:?subject=${encodeURIComponent(t('sendToParents.subject'))}&body=${encodeURIComponent(message)}`
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked: the text is on screen */ }
    track('copy')
  }
  const share = async () => {
    track('share')
    try { await navigator.share({ text: message }) } catch { /* cancelled */ }
  }
  const dismiss = () => {
    try { if (dismissKey) localStorage.setItem(dismissKey, '1') } catch { /* private mode */ }
    setDismissed(true)
    track('dismiss')
  }

  const btn = 'inline-flex items-center gap-2 rounded-full text-sm font-semibold px-4 py-2.5 transition-colors'

  return (
    <div className="relative bg-white border border-stone-200 rounded-2xl p-6 lg:p-7">
      {dismissKey && (
        <button type="button" onClick={dismiss} aria-label={t('sendToParents.dismiss')} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors">
          <X size={16} />
        </button>
      )}
      {eyebrow && <span className="section-label section-label-light">{eyebrow}</span>}
      <h3 className="font-display text-2xl font-light text-navy-950 m-0 leading-tight pr-8">{title || t('sendToParents.title')}</h3>
      <p className="mt-2 m-0 text-[15px] text-stone-600 leading-relaxed">{body || t('sendToParents.body')}</p>
      <blockquote className="mt-5 m-0 rounded-xl border-l-[3px] border-sage-400 bg-sage-50 px-4 py-3 text-sm text-navy-950 leading-relaxed whitespace-pre-line break-words">
        {message}
      </blockquote>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => track('whatsapp')} className={`${btn} bg-navy-600 hover:bg-navy-700 text-white`}>
          <MessageCircle size={15} /> {t('sendToParents.whatsapp')}
        </a>
        <a href={mailto} onClick={() => track('email')} className={`${btn} bg-white border border-stone-300 text-navy-900 hover:border-navy-400`}>
          <Mail size={15} /> {t('sendToParents.email')}
        </a>
        <button type="button" onClick={copy} className={`${btn} bg-white border border-stone-300 text-navy-900 hover:border-navy-400`}>
          {copied ? <><Check size={15} /> {t('sendToParents.copied')}</> : <><Copy size={15} /> {t('sendToParents.copy')}</>}
        </button>
        {canShare && (
          <button type="button" onClick={share} className={`${btn} bg-white border border-stone-300 text-navy-900 hover:border-navy-400`}>
            <Share2 size={15} /> {t('sendToParents.share')}
          </button>
        )}
      </div>
    </div>
  )
}
