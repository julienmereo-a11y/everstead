import React, { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Small fixed bar shown when the browser goes offline. The app shell is cached
 * by the service worker so the SPA keeps working; this just tells the user that
 * anything they change will sync when they're back online.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  )

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[100] bg-navy-900 text-white text-sm flex items-center justify-center gap-2 px-4 py-2 shadow-md"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
    >
      <WifiOff size={15} className="text-amber-300 shrink-0" />
      <span>You're offline — you can still browse, and changes will sync when you reconnect.</span>
    </div>
  )
}
