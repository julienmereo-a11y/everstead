// Generates public/og-image.png (1200x630) — the social-share preview card.
// Aurora brand background + Everstead logo + live hero line + a glassy vault card.
// Run: node scripts/gen-og-image.mjs   (requires @resvg/resvg-js)
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'

const logoB64 = readFileSync('public/logo-v2-white.png').toString('base64')
const logo = `data:image/png;base64,${logoB64}`

// Glass vault rows
const rows = [
  ['#7fb87a', 'Accounts', '12'],
  ['#8e8ad8', 'Documents', '8'],
  ['#6f9bdc', 'Trusted people', '3'],
  ['#c9a24b', 'Final wishes', 'Ready'],
]
const rowH = 78
const cardX = 712, cardY = 132, cardW = 416, cardH = 366
const rowsSvg = rows.map((r, i) => {
  const y = cardY + 96 + i * rowH
  return `
    <circle cx="${cardX + 34}" cy="${y}" r="6" fill="${r[0]}"/>
    <text x="${cardX + 58}" y="${y + 6}" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#eef1f8" font-weight="500">${r[1]}</text>
    <text x="${cardX + cardW - 34}" y="${y + 6}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#aab6cf">${r[2]}</text>
    ${i < rows.length - 1 ? `<line x1="${cardX + 34}" y1="${y + rowH / 2 - 5}" x2="${cardX + cardW - 34}" y2="${y + rowH / 2 - 5}" stroke="#ffffff" stroke-opacity="0.08"/>` : ''}`
}).join('')

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a7a2e6"/>
      <stop offset="1" stop-color="#9fc79a"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.04"/>
    </linearGradient>
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

  <!-- logo -->
  <image href="${logo}" x="72" y="60" width="226" height="56" preserveAspectRatio="xMinYMid meet"/>

  <!-- headline -->
  <g font-family="Georgia, 'Times New Roman', serif" font-weight="400">
    <text x="70" y="252" font-size="62" fill="#ffffff">Everything that</text>
    <text x="70" y="328" font-size="62" fill="#ffffff">matters, <tspan fill="url(#word)" font-style="italic">gathered</tspan></text>
    <text x="70" y="404" font-size="62" fill="#ffffff">in one secure place.</text>
  </g>

  <!-- subtext -->
  <text x="72" y="468" font-family="Helvetica, Arial, sans-serif" font-size="23" fill="#c3cee2">Accounts, documents, trusted people and final wishes —</text>
  <text x="72" y="500" font-family="Helvetica, Arial, sans-serif" font-size="23" fill="#c3cee2">organised for life, not just for death.</text>

  <!-- domain pill -->
  <rect x="72" y="536" width="168" height="40" rx="20" fill="#ffffff" fill-opacity="0.10" stroke="#ffffff" stroke-opacity="0.18"/>
  <text x="156" y="561" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#e7ecf7" font-weight="600">everstead.care</text>

  <!-- glass vault card -->
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="22" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.16"/>
  <text x="${cardX + 34}" y="${cardY + 50}" font-family="Helvetica, Arial, sans-serif" font-size="15" letter-spacing="2" fill="#aeb9d2" font-weight="700">YOUR EVERSTEAD VAULT</text>
  <line x1="${cardX + 34}" y1="${cardY + 70}" x2="${cardX + cardW - 34}" y2="${cardY + 70}" stroke="#ffffff" stroke-opacity="0.1"/>
  ${rowsSvg}
</svg>`

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true } })
  .render().asPng()
writeFileSync('public/og-image.png', png)
console.log('Wrote public/og-image.png', png.length, 'bytes')
