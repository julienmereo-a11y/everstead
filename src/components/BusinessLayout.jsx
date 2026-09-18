// Shell for the Everstead for Business tree: its own header, the shared footer.
// Lazy-loaded from App.jsx so the business copy never lands in the family bundle.
import React, { useEffect, useState } from 'react'
import BusinessNav from './BusinessNav'
import Footer from './Footer'
import WebSummitBanner, { WEB_SUMMIT_BANNER_HEIGHT, isWebSummitBannerDismissed } from './WebSummitBanner'
import { isNative } from '../lib/platform'

export default function BusinessLayout({ children }) {
  // Same Web Summit bar and the same layout contract as the family site.
  const [bannerVisible, setBannerVisible] = useState(false)
  useEffect(() => {
    if (!isNative() && !isWebSummitBannerDismissed()) setBannerVisible(true)
  }, [])
  const topOffset = bannerVisible ? WEB_SUMMIT_BANNER_HEIGHT : 0
  return (
    <>
      {bannerVisible && <WebSummitBanner onDismiss={() => setBannerVisible(false)} />}
      <BusinessNav topOffset={topOffset} />
      <main style={topOffset ? { paddingTop: topOffset, '--app-banner-h': `${topOffset}px` } : undefined}>{children}</main>
      <Footer />
    </>
  )
}
