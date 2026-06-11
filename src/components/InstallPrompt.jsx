import React, { useState, useEffect } from 'react'
import { X, Share, Plus, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const DISMISS_KEY = 'everstead_install_dismissed'

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

// Already running as an installed app?
function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari
  )
}

function dismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

/**
 * Subtle, dismissible "Add to home screen" prompt.
 * - Android/Chromium: captures `beforeinstallprompt` and offers a real Install button.
 * - iOS Safari: no such event, so we show the manual Share → Add to Home Screen steps.
 * Shows once; dismissal is remembered in localStorage.
 */
export default function InstallPrompt() {
  const { user } = useAuth()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const ios = isIos()

  useEffect(() => {
    if (isStandalone() || dismissed()) return

    // Android / desktop Chromium
    const onBeforeInstall = (e) => {
      e.preventDefault()        // stop Chrome's mini-infobar
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS Safari never fires the event — show the manual instructions instead,
    // but only in actual Safari (not in-app webviews) and not already installed.
    if (ios && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)) {
      const t = setTimeout(() => setShow(true), 2500) // let the page settle first
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onBeforeInstall) }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [ios])

  const close = () => {
    setShow(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    close()
  }

  // Only surface the prompt to logged-in users (higher intent than marketing
  // visitors). The beforeinstallprompt event is still captured above regardless,
  // so we don't lose it if it fires before sign-in.
  if (!show || !user) return null

  return (
    <div
      role="dialog"
      aria-label="Install Everstead"
      className="fixed inset-x-3 bottom-3 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[360px] z-[90]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative rounded-2xl bg-white border border-stone-200 shadow-xl p-4 pr-9">
        <button
          onClick={close}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <img src="/pwa-192x192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-navy-900 text-sm">Add Everstead to your home screen</p>

            {ios ? (
              <p className="text-xs text-stone-500 leading-relaxed mt-1">
                Tap the <Share size={12} className="inline -mt-0.5 text-navy-600" /> Share button below, then choose
                <span className="font-medium text-navy-700"> “Add to Home Screen” <Plus size={11} className="inline -mt-0.5" /></span>.
              </p>
            ) : (
              <p className="text-xs text-stone-500 leading-relaxed mt-1">
                Install it for one-tap access and a full-screen, app-like experience. No app store needed.
              </p>
            )}

            {!ios && (
              <button
                onClick={install}
                className="mt-3 inline-flex items-center gap-1.5 bg-navy-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-navy-700 transition-colors"
              >
                <Download size={13} /> Install Everstead
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
