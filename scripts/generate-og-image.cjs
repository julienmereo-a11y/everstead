const { createCanvas, loadImage } = require('/Users/julienthuy/Downloads/everstead-platform-blueprint/node_modules/canvas')
const fs = require('fs')

const W = 1200, H = 630
const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')

function rr(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
  ctx.closePath()
}

loadImage('/Users/julienthuy/Downloads/everstead-platform-blueprint/public/logo-v2-white.png').then(function(logo) {
  // Background
  var bg = ctx.createLinearGradient(0,0,W,H)
  bg.addColorStop(0,'#0b1220'); bg.addColorStop(1,'#111d35')
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
  for (var x=0; x<=W; x+=48) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (var y=0; y<=H; y+=48) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

  // Glow
  var glow = ctx.createRadialGradient(60,H,0,60,H,500)
  glow.addColorStop(0,'rgba(34,80,54,0.2)'); glow.addColorStop(1,'rgba(0,0,0,0)')
  ctx.fillStyle = glow; ctx.fillRect(0,0,W,H)

  // Logo: 1584×396 → draw at height 40px
  var logoH = 40
  var logoW = Math.round(logoH * 1584 / 396)
  ctx.drawImage(logo, 64, 38, logoW, logoH)

  // Headline
  var lx = 64, lMaxW = 510
  ctx.fillStyle = '#ffffff'; ctx.font = '300 78px Georgia, serif'
  ctx.fillText('Put your estate', lx, 218, lMaxW)
  ctx.fillText('in order.', lx, 304, lMaxW)

  // Subtitle
  ctx.fillStyle = 'rgba(203,213,225,0.75)'; ctx.font = '400 22px Arial, sans-serif'
  ctx.fillText('Secure, simple estate planning for UK families.', lx, 360, lMaxW)

  // Tags
  var tags = ['Accounts', 'Documents', 'Trusted people', 'Final wishes']
  var tx = lx
  ctx.font = '400 15px Arial, sans-serif'
  tags.forEach(function(tag) {
    var pw = ctx.measureText(tag).width + 24
    rr(tx,412,pw,32,16); ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fill()
    rr(tx,412,pw,32,16); ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.lineWidth=1; ctx.stroke()
    ctx.fillStyle='rgba(226,232,240,0.85)'; ctx.fillText(tag, tx+12, 433)
    tx += pw + 8
  })

  // URL pill
  ctx.font = '400 14px Arial, sans-serif'
  var urlW = ctx.measureText('everstead.care').width + 22
  rr(lx,466,urlW,28,14); ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fill()
  rr(lx,466,urlW,28,14); ctx.strokeStyle='rgba(255,255,255,0.11)'; ctx.lineWidth=1; ctx.stroke()
  ctx.fillStyle='rgba(148,163,184,0.85)'; ctx.fillText('everstead.care', lx+11, 484)

  // Card
  var cx=686, cy=54, cw=458, ch=520, cr=14
  ctx.save()
  ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=48; ctx.shadowOffsetY=12
  rr(cx,cy,cw,ch,cr); ctx.fillStyle='#1c2845'; ctx.fill()
  ctx.restore()
  rr(cx,cy,cw,ch,cr); ctx.fillStyle='#1c2845'; ctx.fill()
  rr(cx,cy,cw,ch,cr); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.stroke()

  // Title bar
  ctx.save(); rr(cx,cy,cw,52,cr); ctx.clip()
  ctx.fillStyle='#1f2f52'; ctx.fillRect(cx,cy,cw,52); ctx.restore()
  ctx.beginPath(); ctx.moveTo(cx,cy+52); ctx.lineTo(cx+cw,cy+52)
  ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1; ctx.stroke()

  // Traffic lights
  var lights = [{x:cx+20,c:'#ef4444'},{x:cx+40,c:'#f59e0b'},{x:cx+60,c:'#22c55e'}]
  lights.forEach(function(d) {
    ctx.beginPath(); ctx.arc(d.x,cy+26,6,0,Math.PI*2); ctx.fillStyle=d.c; ctx.fill()
  })
  ctx.fillStyle='rgba(226,232,240,0.9)'; ctx.font='500 15px Arial, sans-serif'
  ctx.fillText('Estate Plan Summary', cx+84, cy+31)

  // Rows
  var rows = [
    {label:'Barclays Current Account', value:'£12,400', sub:'Bank · ••••4821'},
    {label:'ISA Portfolio',            value:'£67,200', sub:'Investment · ••••0094'},
    {label:'Life Insurance Policy',    value:'',        sub:'Document · In force'},
    {label:'Sarah Mitchell',           value:'',        sub:'Executor · Confirmed'},
    {label:'Funeral wishes',           value:'',        sub:'Wishes · 3 items'}
  ]
  var rowH=84, rowPadX=42, rowStartY=cy+68
  rows.forEach(function(row, i) {
    var ry = rowStartY + i*rowH
    ctx.beginPath(); ctx.arc(cx+20,ry+22,4.5,0,Math.PI*2); ctx.fillStyle='#4ade80'; ctx.fill()
    ctx.fillStyle='#e2e8f0'; ctx.font='500 16px Georgia, serif'
    ctx.fillText(row.label, cx+rowPadX, ry+26)
    if (row.value) {
      ctx.font='400 16px Georgia, serif'
      var vw = ctx.measureText(row.value).width
      ctx.fillStyle='#e2e8f0'; ctx.fillText(row.value, cx+cw-vw-20, ry+26)
    }
    ctx.fillStyle='rgba(148,163,184,0.65)'; ctx.font='400 13px Arial, sans-serif'
    ctx.fillText(row.sub, cx+rowPadX, ry+46)
    if (i < rows.length-1) {
      ctx.beginPath(); ctx.moveTo(cx+rowPadX,ry+rowH-8); ctx.lineTo(cx+cw-20,ry+rowH-8)
      ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1; ctx.stroke()
    }
  })

  var buf = canvas.toBuffer('image/png')
  fs.writeFileSync('/Users/julienthuy/Downloads/everstead-platform-blueprint/public/og-image.png', buf)
  console.log('done', (buf.length/1024).toFixed(0), 'KB')
})
