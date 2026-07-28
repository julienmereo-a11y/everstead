// Generates a 1200×630 social-share title card for EVERY dated blog post into
// public/og/blog/<slug>.png — aurora brand background + logo + tag pill + wrapped
// title + date footer. ArticlePage points og:image / twitter:image / BlogPosting
// image at these files for the blog section.
//
// Run after adding or renaming a blog post:  node scripts/gen-blog-og-images.mjs
// (posts are read straight from src/pages/Resources.jsx, so there is no separate
// manifest to keep in sync — a post is "blog" if its date looks like "July 2026")
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const source = readFileSync('src/pages/Resources.jsx', 'utf8')

// Extract { slug, title, date, tag } tuples. Field order in the data literals is
// stable (slug → title → date → tag); titles may use single or double quotes.
const postRe = /slug: '([^']+)',\s*\n\s*title: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),\s*\n\s*date: (?:'([^']*)'|null),\s*\n\s*tag: '([^']+)'/g
const posts = []
for (const m of source.matchAll(postRe)) {
  const title = (m[2] ?? m[3]).replace(/\\'/g, "'").replace(/\\"/g, '"')
  posts.push({ slug: m[1], title, date: m[4] ?? '', tag: m[5] })
}
// Dated "Month YYYY" posts are the blog articles (guides say "Updated 2026" — which is
// NOT a month — and FAQs have no date at all).
const MONTH_RE = /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/
const blogPosts = posts.filter(p => MONTH_RE.test(p.date))
if (blogPosts.length === 0) {
  console.error('No blog posts matched — has the Resources.jsx data shape changed?')
  process.exit(1)
}

const logoB64 = readFileSync('public/logo-v2-white.png').toString('base64')
const logo = `data:image/png;base64,${logoB64}`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Greedy word-wrap sized for Georgia at the given font size (empirical chars/line
// at 1060px of usable width). Longer titles step down a size instead of clipping.
function layoutTitle(title) {
  for (const [size, perLine, maxLines] of [[62, 30, 3], [54, 35, 4], [46, 41, 4]]) {
    const lines = []
    let line = ''
    for (const word of title.split(' ')) {
      if ((line + ' ' + word).trim().length > perLine) { lines.push(line.trim()); line = word }
      else line += ' ' + word
    }
    if (line.trim()) lines.push(line.trim())
    if (lines.length <= maxLines) return { size, lines }
  }
  // Pathological length: hard-truncate at the smallest size.
  const lines = []
  let line = ''
  for (const word of title.split(' ')) {
    if ((line + ' ' + word).trim().length > 41) { lines.push(line.trim()); line = word }
    else line += ' ' + word
  }
  if (line.trim()) lines.push(line.trim())
  return { size: 46, lines: lines.slice(0, 4) }
}

function cardSvg({ title, date, tag }) {
  const { size, lines } = layoutTitle(title)
  const lineHeight = Math.round(size * 1.22)
  // Vertically centre the title block between the logo (ends ~140) and footer (~560)
  const blockH = lines.length * lineHeight
  const firstBaseline = Math.round(350 - blockH / 2 + size * 0.8)
  const titleSvg = lines.map((l, i) =>
    `<text x="70" y="${firstBaseline + i * lineHeight}" font-size="${size}" fill="#ffffff">${esc(l)}</text>`
  ).join('\n    ')
  const tagW = Math.round(tag.length * 9.2 + 44)

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="b1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#2d5082" stop-opacity="0.95"/><stop offset="1" stop-color="#2d5082" stop-opacity="0"/></radialGradient>
    <radialGradient id="b2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6f6bc6" stop-opacity="0.85"/><stop offset="1" stop-color="#6f6bc6" stop-opacity="0"/></radialGradient>
    <radialGradient id="b3" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6e9b6a" stop-opacity="0.8"/><stop offset="1" stop-color="#6e9b6a" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="60"/></filter>
  </defs>

  <!-- aurora background -->
  <rect width="1200" height="630" fill="#0d1628"/>
  <g filter="url(#blur)">
    <ellipse cx="180" cy="120" rx="520" ry="420" fill="url(#b1)"/>
    <ellipse cx="40" cy="560" rx="560" ry="460" fill="url(#b2)"/>
    <ellipse cx="1080" cy="610" rx="620" ry="480" fill="url(#b3)"/>
    <ellipse cx="1180" cy="40" rx="420" ry="360" fill="url(#b1)"/>
  </g>
  <rect width="1200" height="630" fill="#0d1628" fill-opacity="0.18"/>

  <!-- logo + tag pill -->
  <image href="${logo}" x="70" y="58" width="210" height="52" preserveAspectRatio="xMinYMid meet"/>
  <rect x="${1200 - 70 - tagW}" y="66" width="${tagW}" height="38" rx="19" fill="#ffffff" fill-opacity="0.10" stroke="#ffffff" stroke-opacity="0.20"/>
  <text x="${1200 - 70 - tagW / 2}" y="91" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="#d9e2f2" font-weight="600">${esc(tag)}</text>

  <!-- title -->
  <g font-family="Georgia, 'Times New Roman', serif" font-weight="400">
    ${titleSvg}
  </g>

  <!-- footer -->
  <line x1="70" y1="524" x2="1130" y2="524" stroke="#ffffff" stroke-opacity="0.14"/>
  <text x="70" y="566" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#c3cee2" font-weight="600">everstead.care<tspan fill="#8d9bb8" font-weight="400"> · Blog · ${esc(date)}</tspan></text>
</svg>`
}

mkdirSync('public/og/blog', { recursive: true })
for (const post of blogPosts) {
  const png = new Resvg(cardSvg(post), { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true } })
    .render().asPng()
  writeFileSync(`public/og/blog/${post.slug}.png`, png)
  console.log(`✓ public/og/blog/${post.slug}.png  (${(png.length / 1024).toFixed(0)} kB)  — ${post.title}`)
}
console.log(`\n${blogPosts.length} cards generated.`)
