// Site-wide <head> defaults, one set per language tree.
//
// Three consumers read this single source:
//   • index.html carries the English set as static tags (what non-JS crawlers
//     and share-preview bots see), marked data-rh="true" so react-helmet-async
//     REPLACES them once React renders instead of appending a second copy.
//   • vite.config.js writes dist/fr.html, the same shell with the French set,
//     served for every /fr/* URL.
//   • DefaultHead in App.jsx re-emits the current language's set through Helmet,
//     so a page that declares no description of its own still has the right
//     one, and any page-level <Helmet> overrides tag by tag.
export const SEO_DEFAULTS = {
  en: {
    title:       'Everstead | Your life, organised.',
    ogTitle:     'Everstead | Everything that matters, gathered in one secure place.',
    description: 'One secure place for your accounts, documents, trusted contacts, and wishes, organised for life, not just for death.',
    locale:      'en_GB',
    htmlLang:    'en-GB',
  },
  fr: {
    title:       'Everstead | Le coffre numérique pour préparer votre succession',
    ogTitle:     'Everstead | Tout ce qui compte, réuni en un seul endroit sûr.',
    description: "Comptes, assurance-vie, documents et dernières volontés réunis dans un coffre numérique sécurisé, que vous partagez avec vos proches ou votre notaire le moment venu. Préparez votre succession l'esprit tranquille, l'inscription est gratuite.",
    locale:      'fr_FR',
    htmlLang:    'fr',
  },
}

export const SEO_IMAGE = 'https://www.everstead.care/og-image.png?v=2'
