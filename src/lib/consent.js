// ─────────────────────────────────────────────────────────────
// COOKIE CONSENT (web only)
// ─────────────────────────────────────────────────────────────
// Self-hosted consent manager built on vanilla-cookieconsent (MIT). It replaced
// Cookiebot on 2026-09-06: Cookiebot's trial lapsed silently, its banner was
// "paused", and every consent-gated script (GA4, Meta Pixel) stayed dark for
// weeks while consents appeared to be recorded. Nothing here can expire.
//
// How gating works: tags in index.html carry `type="text/plain"` plus
// `data-category="statistics" | "marketing"`. They never execute on their own;
// the library flips them to real scripts once (and only once) their category
// is consented, on this visit or from the stored choice on later visits.
// Google Consent Mode is kept in sync in the callbacks below.
//
// Copy lives in i18n (common.json `cookie.*` + `consent.*`, cookies.json
// `categories`) so the dialog reads the same as the Cookie Policy page.
// Everything is loaded lazily: the native apps never import the library.
import { languageFromPath } from '../i18n'
import enCommon from '../i18n/locales/en/common.json'
import frCommon from '../i18n/locales/fr/common.json'
import enCookies from '../i18n/locales/en/cookies.json'
import frCookies from '../i18n/locales/fr/cookies.json'

const COPY = { en: { common: enCommon, cookies: enCookies }, fr: { common: frCommon, cookies: frCookies } }

let lib
const load = () => (lib ||= Promise.all([
  import('vanilla-cookieconsent'),
  import('vanilla-cookieconsent/dist/cookieconsent.css'),
  import('./consent.css'),
]).then(([m]) => m))

const granted = (cc, category) => (cc.acceptedCategory(category) ? 'granted' : 'denied')

// Consent Mode v2 mirror. The GA tag itself is category-gated, so this mostly
// matters for correctness and for any future Google product on the site.
const syncGoogleConsent = (cc) => {
  try {
    window.gtag?.('consent', 'update', {
      analytics_storage:  granted(cc, 'statistics'),
      ad_storage:         granted(cc, 'marketing'),
      ad_user_data:       granted(cc, 'marketing'),
      ad_personalization: 'denied', // we run no personalised advertising
    })
  } catch { /* measurement must never break the site */ }
}

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

function translation(lang) {
  const { common, cookies } = COPY[lang] || COPY.en
  const c = common.cookie, x = common.consent
  const prefix = lang === 'fr' ? '/fr' : ''
  const policy = `<a href="${prefix}/cookies">${escape(c.learnMore)}</a>`
  const [essential, analytics, marketing] = cookies.categories
  const meta = (cat) =>
    `<p class="cc-meta">${escape(x.provider)}: ${escape(cat.provider)}<br>` +
    `${escape(x.retention)}: ${escape(cat.retention)}<br>` +
    `${escape(x.examples)}: ${escape(cat.examples)}</p>`
  return {
    consentModal: {
      title: x.title,
      description: `${escape(c.message)} ${policy}`,
      acceptAllBtn: c.acceptAll,
      acceptNecessaryBtn: c.essentialOnly,
      showPreferencesBtn: x.manage,
    },
    preferencesModal: {
      title: x.preferencesTitle,
      acceptAllBtn: c.acceptAll,
      acceptNecessaryBtn: c.essentialOnly,
      savePreferencesBtn: x.save,
      closeIconLabel: x.close,
      sections: [
        { description: escape(x.preferencesIntro) },
        { title: essential.name, description: escape(essential.description) + meta(essential), linkedCategory: 'necessary' },
        { title: analytics.name, description: escape(analytics.description) + meta(analytics), linkedCategory: 'statistics' },
        { title: marketing.name, description: escape(marketing.description) + meta(marketing), linkedCategory: 'marketing' },
        { title: x.moreTitle, description: `${escape(x.moreBody)} ${policy}` },
      ],
    },
  }
}

/** Boot the consent manager. Call once, on the web only. */
export async function initConsent() {
  const cc = await load()
  const lang = languageFromPath(window.location.pathname)
  cc.run({
    // First-party cookie holding the choice + a consent id and timestamps
    // (the evidence of consent). Six months, the CNIL's recommended validity.
    cookie: { name: 'everstead_consent', expiresAfterDays: 182, sameSite: 'Lax' },
    revision: 1, // bump to ask everyone again after a material change
    guiOptions: {
      consentModal:     { layout: 'bar inline', position: 'bottom', equalWeightButtons: true, flipButtons: false },
      preferencesModal: { layout: 'box', equalWeightButtons: true, flipButtons: false },
    },
    categories: {
      necessary:  { enabled: true, readOnly: true },
      statistics: { autoClear: { cookies: [{ name: /^_ga/ }, { name: /^_gid/ }, { name: /^_gat/ }] } },
      marketing:  { autoClear: { cookies: [{ name: /^_fb[pc]$/ }] } },
    },
    onFirstConsent: () => syncGoogleConsent(cc),
    onConsent:      () => syncGoogleConsent(cc),
    onChange:       () => syncGoogleConsent(cc),
    language: { default: lang, translations: { [lang]: translation(lang) } },
  })
}

/** Reopen the preferences dialog (footer "Cookie settings", Cookie Policy page). */
export async function showCookiePreferences() {
  const cc = await load()
  cc.showPreferences()
}
