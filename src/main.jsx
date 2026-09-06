import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import { isNative } from './lib/platform'
import { captureCampaign } from './lib/campaign'
import { initConsent } from './lib/consent'
import './i18n' // initialise i18next BEFORE the app renders (path-based locale)
import './index.css'

// Store-link attribution: keep the utm_* the visitor arrived with (see lib/campaign).
if (!isNative()) {
  captureCampaign()
  // Cookie consent is a web concern; the library itself loads lazily and never
  // ships in the native bundle (initConsent is only ever called here).
  initConsent().catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
      {/* Vercel web analytics — web only. In the native app its script lives at
          /_vercel/insights/script.js on the Vercel host, which doesn't exist on
          capacitor://localhost, so it must not run there. */}
      {!isNative() && <Analytics />}
    </HelmetProvider>
  </React.StrictMode>,
)
