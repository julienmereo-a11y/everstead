// Registers the native app's strings with i18next.
//
// The native screens were hardcoded English until 2026-08-27: the app shipped
// with French locale files in the bundle and a detector that set i18n.language
// correctly, and then no screen asked i18next for anything. Import this module
// (for its side effect) from MobileApp and from anything that renders OUTSIDE
// the MobileApp tree (BiometricGate); re-registering is a no-op.
//
// French copy rules, same as the website: written as French rather than
// translated word for word, vouvoiement, a real NBSP (U+00A0) before ? ! : ;
// and inside « », and never an em or en dash.
import i18n from '../../../i18n'
import enMobile from '../../../i18n/locales/en/mobile.json'
import frMobile from '../../../i18n/locales/fr/mobile.json'

i18n.addResourceBundle('en', 'mobile', enMobile)
i18n.addResourceBundle('fr', 'mobile', frMobile)
