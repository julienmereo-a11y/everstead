// Generates public/sitemap.xml from the code, so a new page or article can
// never be forgotten the way the hand-written list was (four French articles
// were missing when this replaced it). Runs as part of `npm run build`.
//
// Sources:
//   • the English public routes below (priorities carried over from the old file)
//   • TRANSLATED_PATHS in src/i18n/index.js for the French tree
//   • every dated post in src/pages/Resources.jsx, in the language it is written in
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://www.everstead.care'

// [path, changefreq, priority]. Auth flows are deliberately absent.
const EN_PAGES = [
  ['/', 'weekly', '1.0'],
  ['/pricing', 'monthly', '0.9'],
  ['/get-started', 'monthly', '0.9'],
  ['/how-it-works', 'monthly', '0.8'],
  ['/features', 'monthly', '0.8'],
  ['/use-cases', 'monthly', '0.8'],
  ['/use-cases/families', 'monthly', '0.7'],
  ['/use-cases/parents', 'monthly', '0.7'],
  ['/use-cases/executors', 'monthly', '0.7'],
  ['/gift', 'monthly', '0.8'],
  ['/for-advisers', 'monthly', '0.8'],
  ['/what-to-do-when-someone-dies', 'monthly', '0.8'],
  ['/book-demo', 'monthly', '0.7'],
  ['/resources', 'weekly', '0.7'],
  ['/resources/blog', 'weekly', '0.6'],
  ['/resources/guides', 'monthly', '0.6'],
  ['/resources/checklists', 'monthly', '0.6'],
  ['/resources/faqs', 'monthly', '0.6'],
  ['/executor-checklist', 'monthly', '0.7'],
  ['/estate-readiness-score', 'monthly', '0.7'],
  ['/digital-estate-worth', 'monthly', '0.7'],
  ['/security', 'monthly', '0.7'],
  ['/family-vault', 'monthly', '0.7'],
  ['/compare', 'monthly', '0.7'],
  ['/compare/farewill', 'monthly', '0.7'],
  ['/compare/settld', 'monthly', '0.7'],
  ['/compare/safekeep', 'monthly', '0.7'],
  ['/compare/lyfeguard', 'monthly', '0.7'],
  ['/compare/octopus-legacy', 'monthly', '0.7'],
  ['/compare/doing-nothing', 'monthly', '0.8'],
  ['/about', 'monthly', '0.6'],
  ['/contact', 'monthly', '0.6'],
  ['/press', 'monthly', '0.6'],
  ['/changelog', 'monthly', '0.6'],
  ['/apres-un-deces', 'monthly', '0.6'],
  ['/data-promise', 'yearly', '0.5'],
  ['/adviser-dpa', 'yearly', '0.5'],
  ['/subprocessors', 'monthly', '0.3'],
  ['/privacy', 'yearly', '0.3'],
  ['/terms', 'yearly', '0.3'],
  ['/cookies', 'yearly', '0.3'],
  ['/accessibility', 'yearly', '0.3'],
  ['/mentions-legales', 'yearly', '0.3'],
]

// French pages that exist without being in TRANSLATED_PATHS (sub-routes and
// French-only tools), mirroring FR_EXTRA in Footer.jsx.
const FR_EXTRA = [
  ['/use-cases/families', 'monthly', '0.7'],
  ['/use-cases/parents', 'monthly', '0.7'],
  ['/use-cases/executors', 'monthly', '0.7'],
  ['/resources/blog', 'weekly', '0.6'],
  ['/resources/guides', 'monthly', '0.6'],
  ['/resources/checklists', 'monthly', '0.6'],
  ['/resources/faqs', 'monthly', '0.6'],
  ['/assistant-apres-deces', 'monthly', '0.8'],
]
const FR_SKIP = new Set(['/login', '/forgot-password', '/reset-password'])

function translatedPaths() {
  const src = readFileSync(join(root, 'src/i18n/index.js'), 'utf8')
  const block = src.match(/TRANSLATED_PATHS = new Set\(\[([\s\S]*?)\]\)/)
  if (!block) throw new Error('TRANSLATED_PATHS not found in src/i18n/index.js')
  return [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1])
}

// Posts live in section objects: `blog: { ... posts: [ { slug, ..., lang? } ] }`.
// A post without `lang` is English.
function resourcePosts() {
  const src = readFileSync(join(root, 'src/pages/Resources.jsx'), 'utf8')
  const posts = []
  for (const section of ['blog', 'guides', 'checklists', 'faqs']) {
    const start = src.indexOf(`\n  ${section}: {`)
    if (start < 0) throw new Error(`section ${section} not found in Resources.jsx`)
    const end = src.indexOf('\n  },\n', start)
    const body = src.slice(start, end)
    for (const m of body.matchAll(/slug: '([^']+)'/g)) {
      // The lang flag sits in the post's head, before its body array.
      const head = body.slice(m.index, m.index + 400).split('body:')[0]
      const lang = /lang: 'fr'/.test(head) ? 'fr' : 'en'
      posts.push({ section, slug: m[1], lang })
    }
  }
  return posts
}

// French comparison pages exist only for the competitors listed in FR_SLUGS.
function frCompareSlugs() {
  const src = readFileSync(join(root, 'src/pages/Compare.jsx'), 'utf8')
  const block = src.match(/FR_SLUGS = new Set\(\[([\s\S]*?)\]\)/)
  return block ? [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : []
}

const priorityOf = Object.fromEntries(EN_PAGES.map(([p, , pr]) => [p, pr]))
const freqOf     = Object.fromEntries(EN_PAGES.map(([p, cf]) => [p, cf]))

const entries = []
for (const [p, cf, pr] of EN_PAGES) entries.push([p, cf, pr])
for (const post of resourcePosts().filter(p => p.lang === 'en')) entries.push([`/resources/${post.section}/${post.slug}`, 'monthly', '0.6'])
for (const p of translatedPaths()) {
  if (FR_SKIP.has(p)) continue
  entries.push([p === '/' ? '/fr' : `/fr${p}`, freqOf[p] ?? 'monthly', priorityOf[p] ?? '0.6'])
}
for (const [p, cf, pr] of FR_EXTRA) entries.push([`/fr${p}`, cf, pr])
for (const slug of frCompareSlugs()) entries.push([`/fr/compare/${slug}`, 'monthly', '0.7'])
for (const post of resourcePosts().filter(p => p.lang === 'fr')) entries.push([`/fr/resources/${post.section}/${post.slug}`, 'monthly', '0.6'])

const seen = new Set()
const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for (const [p, cf, pr] of entries) {
  if (seen.has(p)) continue
  seen.add(p)
  xml.push('  <url>', `    <loc>${BASE}${p === '/' ? '/' : p}</loc>`, `    <changefreq>${cf}</changefreq>`, `    <priority>${pr}</priority>`, '  </url>')
}
xml.push('</urlset>', '')
writeFileSync(join(root, 'public/sitemap.xml'), xml.join('\n'))
console.log(`sitemap: ${seen.size} URLs (${[...seen].filter(p => p.startsWith('/fr')).length} French)`)
