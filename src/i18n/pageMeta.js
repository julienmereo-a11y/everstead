import i18n from './index'
import en from './locales/en/pageMeta.json'
import fr from './locales/fr/pageMeta.json'

// Title and description for the pages that have no i18n namespace of their own.
//
// They live here rather than as literals inside the component because
// scripts/gen-share-shells.mjs reads these strings at build time to write the
// static HTML that crawlers and link-preview bots actually see. A title sitting
// in a JSX literal cannot be read by a build script, which is why these pages
// spent months sharing the generic Everstead card.
//
// English-only pages have no French entry on purpose: fallbackLng serves the
// English string in the app, and the shell generator writes no French shell and
// no French hreflang for them.
if (!i18n.hasResourceBundle('en', 'pageMeta')) i18n.addResourceBundle('en', 'pageMeta', en)
if (!i18n.hasResourceBundle('fr', 'pageMeta')) i18n.addResourceBundle('fr', 'pageMeta', fr)

/** { title, description } for one page key, in the current language tree. */
export function pageMeta(key) {
  return {
    title:       i18n.t(`${key}.title`,       { ns: 'pageMeta' }),
    description: i18n.t(`${key}.description`, { ns: 'pageMeta' }),
  }
}
