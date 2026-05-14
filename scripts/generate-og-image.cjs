/**
 * Regenerates public/og-image.png using node-canvas.
 * Same design as original, with £ rendering bug fixed.
 * Run: node scripts/generate-og-image.cjs
 */

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const W = 1200
const H = 630
const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')

function roundRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Background gradient
const bg = ctx.createLinearGradient(0, 0, W, H)
bg.addColorStop(0, '#0b1220')
bg.addColorStop(1, '#111d35')
ctx.fillStyle = bg
ctx.fillRect(0, 0, W, H)

// Grid
ctx.strokeStyle = 'rgba(255,255,255,0.04)'
ctx.lineWidth = 1
for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

// Green glow bottom-left
const glow = ctx.createRadialGradient(60, H, 0, 60, H, 500)
glow.addColorStop(0, 'rgba(34,80,54,0.2)')
glow.addColorStop(1, 'rgba(0,0,0,0)')
ctx.fillStyle = glow
ctx.fillRect(0, 0, W, H)

// ── Left column ──────────────────────────────────────────────────────────────
const lx = 64
const lMaxW = 510

// Logo dot
ctx.beginPath(); ctx.arc(lx + 5, 56, 5, 0, Math.PI * 2)
ctx.fillStyle = '#4ade80'; ctx.fill()

// Wordmark
ctx.fillStyle = 'rgba(226,232,240,0.9)'
ctx.font = '500 20px -apple-system, "Helvetica Neue", Arial, sans-serif'
ctx.fillText('Everstead', lx + 18, 62)

// Headline
ctx.fillStyle = '#ffffff'
ctx.font = '300 78px Georgia, "Times New Roman", serif'
ctx.fillText('Put your estate', lx, 218, lMaxW)
ctx.fillText('in order.', lx, 304, lMaxW)

// Subtitle
ctx.fillStyle = 'rgba(203,213,225,0.75)'
ctx.font = '400 22px -apple-system, "Helvetica Neue", Arial, sans-serif'
ctx.fillText('Secure, simple estate planning for UK families.', lx, 360, lMaxW)

// Pill tags
const tags = ['Accounts', 'Documents', 'Trusted people', 'Final wishes']
let tx = lx
ctx.font = '400 15px -apple-system, "Helvetica Neue", Arial, sans-serif'
for (const tag of tags) {
  const pw = ctx.measureText(tag).width + 24
  roundRect(tx, 412, pw, 32, 16)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill()
  roundRect(tx, 412, pw, 32, 16)
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = 'rgba(226,232,240,0.85)'
  ctx.fillText(tag, tx + 12, 433)
  tx += pw + 8
}

// URL pill
ctx.font = '400 14px -apple-system, "Helvetica Neue", Arial, sans-serif'
const urlW = ctx.measureText('everstead.care').width + 22
roundRect(lx, 466, urlW, 28, 14)
ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill()
roundRect(lx, 466, urlW, 28, 14)
ctx.strokeStyle = 'rgba(255,255,255,0.11)'; ctx.lineWidth = 1; ctx.stroke()
ctx.fillStyle = 'rgba(148,163,184,0.85)'
ctx.fillText('everstead.care', lx + 11, 484)

// ── Right card ───────────────────────────────────────────────────────────────
const cx = 686, cy = 54, cw = 458, ch = 520, cr = 14

// Shadow
ctx.save()
ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 48; ctx.shadowOffsetY = 12
roundRect(cx, cy, cw, ch, cr); ctx.fillStyle = '#1c2845'; ctx.fill()
ctx.restore()

// Card body
roundRect(cx, cy, cw, ch, cr); ctx.fillStyle = '#1c2845'; ctx.fill()
roundRect(cx, cy, cw, ch, cr)
ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke()

// Title bar
ctx.save()
roundRect(cx, cy, cw, 52, cr); ctx.clip()
ctx.fillStyle = '#1f2f52'; ctx.fillRect(cx, cy, cw, 52)
ctx.restore()

// Divider
ctx.beginPath(); ctx.moveTo(cx, cy + 52); ctx.lineTo(cx + cw, cy + 52)
ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke()

// Traffic lights
[{ x: cx + 20, c: '#ef4444' }, { x: cx + 40, c: '#f59e0b' }, { x: cx + 60, c: '#22c55e' }]
  .forEach(({ x, c }) => { ctx.beginPath(); ctx.arc(x, cy + 26, 6, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill() })

// Title
ctx.fillStyle = 'rgba(226,232,240,0.9)'
ctx.font = '500 15px -apple-system, "Helvetica Neue", Arial, sans-serif'
ctx.fillText('Estate Plan Summary', cx + 84, cy + 31)

// Rows
const rows = [
  { label: 'Barclays Current Account', value: '£12,400', sub: 'Bank · ••••4821' },
  { label: 'ISA Portfolio',             value: '£67,200', sub: 'Investment · ••••0094' },
  { label: 'Life Insurance Policy',     value: '',        sub: 'Document · In force' },
  { label: 'Sarah Mitchell',            value: '',        sub: 'Executor · Confirmed' },
  { label: 'Funeral wishes',            value: '',        sub: 'Wishes · 3 items' },
]

const rowH = 84, rowPadX = 42, rowStartY = cy + 68

rows.forEach(({ label, value, sub }, i) => {
  const ry = rowStartY + i * rowH

  // Green dot
  ctx.beginPath(); ctx.arc(cx + 20, ry + 22, 4.5, 0, Math.PI * 2)
  ctx.fillStyle = '#4ade80'; ctx.fill()

  // Label — Georgia renders £ correctly
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '500 16px Georgia, "Times New Roman", serif'
  ctx.fillText(label, cx + rowPadX, ry + 26)

  // Value right-aligned
  if (value) {
    ctx.font = '400 16px Georgia, "Times New Roman", serif'
    const vw = ctx.measureText(value).width
    ctx.fillStyle = '#e2e8f0'
    ctx.fillText(value, cx + cw - vw - 20, ry + 26)
  }

  // Sub label
  ctx.fillStyle = 'rgba(148,163,184,0.65)'
  ctx.font = '400 13px -apple-system, "Helvetica Neue", Arial, sans-serif'
  ctx.fillText(sub, cx + rowPadX, ry + 46)

  // Row divider
  if (i < rows.length - 1) {
    ctx.beginPath()
    ctx.moveTo(cx + rowPadX, ry + rowH - 8)
    ctx.lineTo(cx + cw - 20, ry + rowH - 8)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.stroke()
  }
})

// Save
const out = path.resolve(__dirname, '../public/og-image.png')
const buf = canvas.toBuffer('image/png')
fs.writeFileSync(out, buf)
console.log(`✅  ${out}  (${W}×${H}, ${(buf.length/1024).toFixed(0)} KB)`)
