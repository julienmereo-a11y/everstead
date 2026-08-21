import React from 'react'
import { Helmet } from 'react-helmet-async'

const BASE = 'https://www.everstead.care'

// hreflang alternates for pages that exist in BOTH language trees ('/x' and
// '/fr/x' render the same page in each language). Rendered as its own Helmet
// block — helmet-async merges it with the page's main one. Only mount this on
// pages listed in TRANSLATED_PATHS (src/i18n/index.js); advertising a French
// alternate for an untranslated page would send Google to English content.
export default function HreflangLinks({ path }) {
  const p = path === '/' ? '' : path
  const en = p ? `${BASE}${p}` : BASE
  const fr = `${BASE}/fr${p}`
  return (
    <Helmet>
      <link rel="alternate" hrefLang="en-GB" href={en} />
      <link rel="alternate" hrefLang="fr" href={fr} />
      <link rel="alternate" hrefLang="x-default" href={en} />
    </Helmet>
  )
}
