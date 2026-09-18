// Slim site-wide bar: Everstead is in the Web Summit 2026 startup programme.
//
// LAYOUT CONTRACT (same as the retired app-store bar): the banner is fixed at
// the very top, so each layout shifts its fixed nav down by exactly this
// height and pads <main> by the same amount. Pages using pt-24 still land
// flush under the nav and full-bleed heroes still start under the banner. If
// the height changes, nothing else needs editing: both offsets read from here.
//
// Text only, no Web Summit logo: their mark is theirs, and the claim is
// exactly what the blog post says, which is where the link goes.
import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, X } from 'lucide-react'
import { trackEvent } from '../lib/analytics'

export const WEB_SUMMIT_BANNER_HEIGHT = 36

const DISMISS_KEY = 'everstead_websummit_banner_dismissed_v1'

/** True once the visitor has dismissed the banner (bump the key's suffix to re-show). */
export function isWebSummitBannerDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

// The announcement exists in both languages; each tree links to its own.
const POST = {
  en: '/resources/blog/everstead-at-web-summit-2026',
  fr: '/resources/blog/everstead-web-summit-2026-lisbonne',
}

export default function WebSummitBanner({ onDismiss }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'fr' ? 'fr' : 'en'
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode: dismissed for this session only */ }
    onDismiss?.()
  }

  return (
    <div
      role="region"
      aria-label={t('announcement.webSummit.aria')}
      className="fixed top-0 left-0 right-0 z-[60] bg-navy-950 text-stone-100"
      style={{ height: WEB_SUMMIT_BANNER_HEIGHT }}
    >
      <div className="relative max-w-7xl mx-auto h-full px-10 sm:px-6 lg:px-8 flex items-center justify-center">
        {/* On a phone the whole line is the link: the sentence plus a separate
            "Read the announcement" did not fit beside the close button. */}
        <p className="m-0 flex items-center gap-2 text-[12px] sm:text-[13px] leading-none text-center whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{t('announcement.webSummit.text')}</span>
          <Link
            to={POST[lang]}
            onClick={() => trackEvent('banner_click', { banner: 'web_summit_2026' })}
            className="hidden sm:inline-flex items-center gap-1 font-semibold text-sage-300 hover:text-white transition-colors shrink-0"
          >
            {t('announcement.webSummit.cta')} <ArrowRight size={12} aria-hidden="true" />
          </Link>
          <Link
            to={POST[lang]}
            onClick={() => trackEvent('banner_click', { banner: 'web_summit_2026' })}
            className="sm:hidden inline-flex items-center gap-1 font-medium text-stone-100 hover:text-white transition-colors"
          >
            {t('announcement.webSummit.textShort')} <ArrowRight size={12} className="text-sage-300" aria-hidden="true" />
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('announcement.webSummit.dismiss')}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
