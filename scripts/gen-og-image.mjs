// Generates public/og-image.jpg (1200x630), the site-wide social-share card.
// JPEG, not PNG: a photo card as PNG is 1.5 MB and WhatsApp only shows previews
// under about 300 KB; the JPEG is around a tenth of that.
// Since 2026-09-13 it is the felted family from the homepage hero, full bleed,
// with the wordmark on a small light pill so it reads on any preview surface.
// No headline: the card serves both language trees, the title comes from og:title.
// Run: node scripts/gen-og-image.mjs   (requires @resvg/resvg-js)
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const photo = `data:image/jpeg;base64,${readFileSync('public/hero-felt-family.jpg').toString('base64')}`
const logo  = `data:image/png;base64,${readFileSync('public/everstead-logo-dark.png').toString('base64')}`

// Source is 1670x942. Scaled to 1200 wide it is 677 tall; 10px go from the top
// (curtain and window head) and 37px from the bottom (below the box), so every
// face and the bow stay in frame.
const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="frame"><rect width="1200" height="630"/></clipPath>
    <linearGradient id="foot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d1628" stop-opacity="0"/>
      <stop offset="1" stop-color="#0d1628" stop-opacity="0.22"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#frame)">
    <image href="${photo}" x="0" y="-10" width="1200" height="677" preserveAspectRatio="none"/>
    <rect x="0" y="470" width="1200" height="160" fill="url(#foot)"/>
  </g>
  <rect x="34" y="30" width="228" height="58" rx="29" fill="#ffffff" fill-opacity="0.92"/>
  <image href="${logo}" x="52" y="42" width="192" height="34" preserveAspectRatio="xMidYMid meet"/>
</svg>`

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } }).render().asPng()
writeFileSync('public/og-image.tmp.png', png)
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', 'public/og-image.tmp.png', '--out', 'public/og-image.jpg'], { stdio: 'ignore' })
unlinkSync('public/og-image.tmp.png')
console.log('Wrote public/og-image.jpg')
