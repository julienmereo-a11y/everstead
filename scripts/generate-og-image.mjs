import { createCanvas, loadImage } from 'canvas'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const W = 1200
const H = 630

const canvas = createCanvas(W, H)
const ctx    = canvas.getContext('2d')

// ── Background ────────────────────────────────────────────────
// Deep navy base
ctx.fillStyle = '#0d1628'
ctx.fillRect(0, 0, W, H)

// Subtle radial glow — top-left
const glow = ctx.createRadialGradient(200, 160, 0, 200, 160, 600)
glow.addColorStop(0,   'rgba(76, 125, 71, 0.18)')   // sage green hint
glow.addColorStop(0.5, 'rgba(76, 125, 71, 0.06)')
glow.addColorStop(1,   'rgba(13, 22, 40, 0)')
ctx.fillStyle = glow
ctx.fillRect(0, 0, W, H)

// Subtle grid lines
ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
ctx.lineWidth = 1
const gridSize = 60
for (let x = 0; x <= W; x += gridSize) {
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
}
for (let y = 0; y <= H; y += gridSize) {
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
}

// ── Logo image ────────────────────────────────────────────────
try {
  const logo = await loadImage(join(__dirname, '../public/logo-v2-white.png'))
  const logoH = 52
  const logoW = (logo.width / logo.height) * logoH
  ctx.drawImage(logo, 72, 68, logoW, logoH)
} catch {
  // Fallback: text logo
  ctx.fillStyle = '#ffffff'
  ctx.font      = '500 28px sans-serif'
  ctx.fillText('Everstead', 72, 104)
}

// ── Divider line ──────────────────────────────────────────────
ctx.strokeStyle = 'rgba(255,255,255,0.12)'
ctx.lineWidth   = 1
ctx.beginPath()
ctx.moveTo(72, 152)
ctx.lineTo(W - 72, 152)
ctx.stroke()

// ── Headline ──────────────────────────────────────────────────
ctx.fillStyle = '#ffffff'
ctx.font      = '300 62px Georgia, serif'
ctx.fillText('Put your estate', 72, 260)
ctx.fillText('in order.', 72, 338)

// ── Sub-headline ──────────────────────────────────────────────
ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
ctx.font      = '300 22px Georgia, serif'
ctx.fillText('Secure, simple estate planning for UK families.', 72, 400)

// ── Feature pills ─────────────────────────────────────────────
const pills = ['Accounts', 'Documents', 'Trusted people', 'Final wishes']
const pillY = 480
let pillX = 72

ctx.font = '400 15px -apple-system, BlinkMacSystemFont, sans-serif'

for (const label of pills) {
  const textW = ctx.measureText(label).width
  const pW    = textW + 28
  const pH    = 34
  const r     = 17

  // Pill background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.09)'
  ctx.beginPath()
  ctx.roundRect(pillX, pillY, pW, pH, r)
  ctx.fill()

  // Pill border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.roundRect(pillX, pillY, pW, pH, r)
  ctx.stroke()

  // Pill text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.fillText(label, pillX + 14, pillY + 22)

  pillX += pW + 12
}

// ── Bottom URL badge ──────────────────────────────────────────
ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
ctx.beginPath()
ctx.roundRect(72, 558, 200, 36, 8)
ctx.fill()

ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
ctx.font      = '400 14px -apple-system, BlinkMacSystemFont, sans-serif'
ctx.fillText('everstead.care', 92, 581)

// ── Right side decorative card ────────────────────────────────
const cardX = 730
const cardY = 80
const cardW = 390
const cardH = 470
const cardR = 16

// Card shadow / backdrop
ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
ctx.beginPath()
ctx.roundRect(cardX + 6, cardY + 6, cardW, cardH, cardR)
ctx.fill()

// Card background
const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH)
cardGrad.addColorStop(0, 'rgba(255, 255, 255, 0.10)')
cardGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)')
ctx.fillStyle = cardGrad
ctx.beginPath()
ctx.roundRect(cardX, cardY, cardW, cardH, cardR)
ctx.fill()

// Card border
ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
ctx.lineWidth   = 1
ctx.beginPath()
ctx.roundRect(cardX, cardY, cardW, cardH, cardR)
ctx.stroke()

// Card header bar
ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
ctx.beginPath()
ctx.roundRect(cardX, cardY, cardW, 52, [cardR, cardR, 0, 0])
ctx.fill()

// Traffic-light dots
const dotY = cardY + 26
const dots = ['rgba(255,95,87,0.7)', 'rgba(255,189,46,0.7)', 'rgba(40,200,64,0.7)']
dots.forEach((color, i) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cardX + 24 + i * 20, dotY, 6, 0, Math.PI * 2)
  ctx.fill()
})

// Card title
ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
ctx.font      = '400 13px -apple-system, BlinkMacSystemFont, sans-serif'
ctx.fillText('Estate Plan Summary', cardX + 100, dotY + 5)

// Card rows — simulated data rows
const rows = [
  { label: 'Barclays Current Account', sub: 'Bank · ••••4821', value: '£12,400' },
  { label: 'ISA Portfolio',             sub: 'Investment · ••••0094', value: '£67,200' },
  { label: 'Life Insurance Policy',     sub: 'Document · In force',   value: null },
  { label: 'Sarah Mitchell',            sub: 'Executor · Confirmed',   value: null },
  { label: 'Funeral wishes',            sub: 'Wishes · 3 items',       value: null },
]

let rowY = cardY + 72

for (const row of rows) {
  // Row separator
  if (rowY > cardY + 72) {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(cardX + 20, rowY)
    ctx.lineTo(cardX + cardW - 20, rowY)
    ctx.stroke()
  }

  // Dot accent
  ctx.fillStyle = 'rgba(76, 125, 71, 0.8)'
  ctx.beginPath()
  ctx.arc(cardX + 32, rowY + 28, 4, 0, Math.PI * 2)
  ctx.fill()

  // Label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font      = '400 14px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText(row.label, cardX + 50, rowY + 24)

  // Sub-label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)'
  ctx.font      = '400 12px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText(row.sub, cardX + 50, rowY + 40)

  // Value (right-aligned)
  if (row.value) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font      = '500 14px -apple-system, BlinkMacSystemFont, sans-serif'
    const vW = ctx.measureText(row.value).width
    ctx.fillText(row.value, cardX + cardW - 24 - vW, rowY + 24)
  }

  rowY += 74
}

// ── Write file ────────────────────────────────────────────────
const outPath = join(__dirname, '../public/og-image.png')
const buf     = canvas.toBuffer('image/png')
writeFileSync(outPath, buf)
console.log(`✅  OG image written → ${outPath}  (${W}×${H})`)
