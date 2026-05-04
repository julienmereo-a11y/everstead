const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

const W = 1200
const H = 630

async function main() {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // ── Background ───────────────────────────────────────────────
  ctx.fillStyle = '#0d1628'
  ctx.fillRect(0, 0, W, H)

  // ── Subtle grid overlay ──────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  const grid = 60
  for (let x = 0; x <= W; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y <= H; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  // ── Subtle radial glow in centre ─────────────────────────────
  const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 420)
  grd.addColorStop(0, 'rgba(76,125,71,0.12)')
  grd.addColorStop(1, 'rgba(13,22,40,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, W, H)

  // ── Logo icon (favicon.png — the mark) ───────────────────────
  const icon = await loadImage(path.join(__dirname, '../public/favicon.png'))
  const iconSize = 110
  const iconX = (W - iconSize) / 2
  const iconY = 160
  ctx.drawImage(icon, iconX, iconY, iconSize, iconSize)

  // ── Wordmark "Everstead" ─────────────────────────────────────
  ctx.fillStyle = '#ffffff'
  ctx.font = 'light 56px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Everstead', W / 2, iconY + iconSize + 52)

  // ── Tagline ──────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '20px Georgia, serif'
  ctx.fillText('Put your digital life in order.', W / 2, iconY + iconSize + 52 + 56)

  // ── Bottom-left URL ──────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('everstead.care', 52, H - 40)

  // ── Write PNG ────────────────────────────────────────────────
  const out = path.join(__dirname, '../public/og-image.png')
  fs.writeFileSync(out, canvas.toBuffer('image/png'))
  console.log(`Written: ${out} (${W}x${H})`)
}

main().catch(err => { console.error(err); process.exit(1) })
