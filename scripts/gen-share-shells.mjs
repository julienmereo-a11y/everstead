// Writes one HTML shell per resource article so share-preview bots, which do
// not run JavaScript, see the article's own title, description and card.
//
// The SPA's index.html (and fr.html for the French tree) carry the site-wide
// defaults; react-helmet-async replaces them once React renders, which LinkedIn,
// Facebook, Slack and WhatsApp never wait for. This runs after `vite build`
// and writes dist/resources/<section>/<slug>/index.html (dist/fr/... for
// French posts). Vercel serves a file that exists before applying rewrites, so
// these win over the index.html catch-all; browsers then boot the same app.
//
// Posts are read straight from src/pages/Resources.jsx, like the sitemap and
// the OG-card generator, so there is no manifest to keep in sync.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://www.everstead.care'
const DEFAULT_IMAGE = `${BASE}/og-image.png?v=2`

const source = readFileSync(join(root, 'src/pages/Resources.jsx'), 'utf8')

// Section blocks: `  blog: {`, `  guides: {` ... at two-space indent.
const SECTIONS = ['blog', 'guides', 'checklists', 'faqs']
const starts = SECTIONS.map(s => ({ s, i: source.search(new RegExp(`^  ${s}: \\{`, 'm')) })).filter(x => x.i >= 0).sort((a, b) => a.i - b.i)
const STR = /(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/
const field = (head, key) => {
  const m = head.match(new RegExp(`\\n\\s*${key}: ${STR.source}`))
  return m ? (m[1] ?? m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"') : null
}

const posts = []
for (let k = 0; k < starts.length; k++) {
  const block = source.slice(starts[k].i, k + 1 < starts.length ? starts[k + 1].i : undefined)
  const re = /slug: '([^']+)',/g
  let m
  while ((m = re.exec(block))) {
    const head = block.slice(m.index - 1, block.indexOf('body: [', m.index))
    const title = field(head, 'title'), desc = field(head, 'desc')
    if (!title || !desc) continue
    const langM = head.match(/\n\s*lang: '(\w+)'/), ogM = head.match(/\n\s*ogImage: '([^']+)'/), dateM = head.match(/\n\s*date: '([^']*)'/)
    posts.push({ section: starts[k].s, slug: m[1], title, desc, lang: langM ? langM[1] : 'en', ogImage: ogM ? ogM[1] : null, date: dateM ? dateM[1] : '' })
  }
}
if (!posts.length) { console.error('[share-shells] no posts found in Resources.jsx; data shape changed?'); process.exit(1) }

const MONTH = /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const setMeta = (html, attr, name, value) => html.replace(new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`), `$1${esc(value)}$2`)

const templates = {}
for (const lang of ['en', 'fr']) {
  const f = join(root, 'dist', lang === 'fr' ? 'fr.html' : 'index.html')
  if (existsSync(f)) templates[lang] = readFileSync(f, 'utf8')
}
if (!templates.en) { console.error('[share-shells] dist/index.html missing; run after vite build'); process.exit(1) }

let written = 0
for (const post of posts) {
  const tpl = templates[post.lang] || templates.en
  const prefix = post.lang === 'fr' ? '/fr' : ''
  const path = `${prefix}/resources/${post.section}/${post.slug}`
  const url = `${BASE}${path}`
  const title = `${post.title} | Everstead`
  const image = post.ogImage ? `${BASE}${post.ogImage}` : (post.section === 'blog' && MONTH.test(post.date) ? `${BASE}/og/blog/${post.slug}.png` : DEFAULT_IMAGE)
  let html = tpl.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
  html = setMeta(html, 'name', 'description', post.desc)
  html = setMeta(html, 'property', 'og:type', 'article')
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', post.desc)
  html = setMeta(html, 'property', 'og:image', image)
  html = setMeta(html, 'name', 'twitter:title', title)
  html = setMeta(html, 'name', 'twitter:description', post.desc)
  html = setMeta(html, 'name', 'twitter:image', image)
  // A canonical for bots; data-rh so Helmet replaces it rather than adding a second one.
  html = html.replace(/(<meta property="og:image"[^>]*>)/, `$1\n    <link rel="canonical" href="${esc(url)}" data-rh="true" />`)
  const out = join(root, 'dist', ...path.split('/').filter(Boolean), 'index.html')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html)
  written++
}
console.log(`[share-shells] ${written} article shells written (${posts.filter(p => p.lang === 'fr').length} French)`)
