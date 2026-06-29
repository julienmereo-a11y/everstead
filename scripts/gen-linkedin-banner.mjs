// Generates a LinkedIn profile banner (1584x396) on the Everstead aurora brand.
// Centered composition so the lower-left profile-photo circle covers only background.
// Run: node scripts/gen-linkedin-banner.mjs   (requires @resvg/resvg-js)
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'

const logo = `data:image/png;base64,${readFileSync('public/logo-v2-white.png').toString('base64')}`
const W = 1584, H = 396, CX = W / 2

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a7a2e6"/>
      <stop offset="1" stop-color="#9fc79a"/>
    </linearGradient>
    <radialGradient id="b1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#2d5082" stop-opacity="0.95"/><stop offset="1" stop-color="#2d5082" stop-opacity="0"/></radialGradient>
    <radialGradient id="b2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6f6bc6" stop-opacity="0.85"/><stop offset="1" stop-color="#6f6bc6" stop-opacity="0"/></radialGradient>
    <radialGradient id="b3" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6e9b6a" stop-opacity="0.8"/><stop offset="1" stop-color="#6e9b6a" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="70"/></filter>
  </defs>

  <!-- aurora background -->
  <rect width="${W}" height="${H}" fill="#0d1628"/>
  <g filter="url(#blur)">
    <ellipse cx="240" cy="70" rx="620" ry="320" fill="url(#b1)"/>
    <ellipse cx="120" cy="430" rx="640" ry="340" fill="url(#b2)"/>
    <ellipse cx="1420" cy="420" rx="700" ry="360" fill="url(#b3)"/>
    <ellipse cx="1500" cy="-20" rx="520" ry="300" fill="url(#b1)"/>
  </g>
  <rect width="${W}" height="${H}" fill="#0d1628" fill-opacity="0.16"/>

  <!-- logo, centered top -->
  <image href="${logo}" x="${CX - 100}" y="44" width="200" height="50" preserveAspectRatio="xMidYMid meet"/>

  <!-- headline, centered -->
  <g font-family="Georgia, 'Times New Roman', serif" font-weight="400" text-anchor="middle">
    <text x="${CX}" y="218" font-size="52" fill="#ffffff">Everything that matters,</text>
    <text x="${CX}" y="288" font-size="52" fill="#ffffff"><tspan fill="url(#word)" font-style="italic">gathered</tspan> in one secure place.</text>
  </g>

  <!-- domain -->
  <text x="${CX}" y="348" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" letter-spacing="3" fill="#aeb9d2" font-weight="600">EVERSTEAD.CARE</text>
</svg>`

const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: true } }).render().asPng()
const out = '/Users/julienthuy/Downloads/everstead-linkedin-banner.png'
writeFileSync(out, png)
console.log('Wrote', out, png.length, 'bytes')
