// ─────────────────────────────────────────────────────────────
// CAMPAIGN ATTRIBUTION for store links (no SDK, no cookies)
// ─────────────────────────────────────────────────────────────
// Meta ads send visitors to the website; some of them tap a store badge. There
// is no Meta SDK in the apps (it would break the privacy promises on /privacy
// and /data-promise), so install attribution comes from the stores themselves:
// App Store Connect reads pt/ct campaign tokens, Play Console reads the UTM
// referrer. This module remembers the utm_* the visitor landed with, and
// storeUrls() tags the badges with it.
//
// sessionStorage, not a cookie: it holds the campaign NAME the visitor arrived
// with (no identifier, nothing cross-site), dies with the tab, needs no consent.
const KEY = 'everstead_campaign'

// Apple's ct accepts [A-Za-z0-9_-], 40 chars max; use the same for everything.
const clean = (v, fallback) => {
  const s = String(v || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40)
  return s || fallback
}

/** Record the landing campaign. Only writes when the URL actually carries one. */
export function captureCampaign(search = typeof window !== 'undefined' ? window.location.search : '') {
  try {
    const q = new URLSearchParams(search)
    const viaMeta = q.has('fbclid')
    if (!q.get('utm_source') && !q.get('utm_campaign') && !viaMeta) return
    sessionStorage.setItem(KEY, JSON.stringify({
      source:   clean(q.get('utm_source'),   viaMeta ? 'facebook' : 'unknown'),
      medium:   clean(q.get('utm_medium'),   viaMeta ? 'paid_social' : 'unknown'),
      campaign: clean(q.get('utm_campaign'), 'untagged'),
    }))
  } catch { /* storage unavailable: links simply stay untagged */ }
}

/** The campaign this session arrived with, or null for organic visitors. */
export function getCampaign() {
  try {
    if (!sessionStorage.getItem(KEY)) captureCampaign()
    return JSON.parse(sessionStorage.getItem(KEY))
  } catch { return null }
}
