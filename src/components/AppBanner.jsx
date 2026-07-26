import React from 'react'
import { Smartphone, X } from 'lucide-react'

// Slim site-wide announcement bar for the upcoming mobile apps.
//
// LAYOUT CONTRACT: the banner is fixed at the very top, so Layout shifts the (also
// fixed) Nav down by exactly this height and pads <main> by the same amount. That
// keeps every page correct without touching them: pages using pt-24 still land flush
// under the nav, and full-bleed heroes still start immediately below the banner with
// the transparent nav overlaying them. If you change this height, nothing else needs
// editing — both offsets read from here.
export const APP_BANNER_HEIGHT = 40

// v2: re-shown to visitors who dismissed the old "coming soon" banner — the
// message changed materially (the Android app is now LIVE on Google Play).
const DISMISS_KEY = 'everstead_app_banner_dismissed_v2'

/** True once the visitor has dismissed the banner (bump the key's suffix to re-show). */
export function isAppBannerDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

export default function AppBanner({ onDismiss }) {
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode — dismiss for this session only */ }
    onDismiss?.()
  }

  return (
    <div
      role="region"
      aria-label="Product announcement"
      className="fixed top-0 left-0 right-0 z-[60] text-white"
      style={{
        height: APP_BANNER_HEIGHT,
        background: 'linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%)',
      }}
    >
      <div className="relative max-w-7xl mx-auto h-full px-12 sm:px-6 lg:px-8 flex items-center justify-center">
        <p className="flex items-center gap-2 text-xs sm:text-sm font-medium leading-none text-center">
          <Smartphone size={14} className="shrink-0" aria-hidden="true" />
          <span>
            The Everstead app is here — now on{' '}
            <a
              href="https://play.google.com/store/apps/details?id=care.everstead.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 decoration-white/50 hover:decoration-white"
            >
              Google Play
            </a>
            , with <span className="font-semibold">iOS</span> coming soon.
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 sm:right-4 lg:right-8 p-1.5 rounded-md text-white/75 hover:text-white hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
