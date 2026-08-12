const WebSocket = require('ws')
const ws = new WebSocket(process.argv[2], { perMessageDeflate: false })
let id = 0
const send = (method, params) => new Promise((res) => {
  const myId = ++id
  const onMsg = (data) => { const m = JSON.parse(data); if (m.id === myId) { ws.off('message', onMsg); res(m.result || m) } }
  ws.on('message', onMsg)
  ws.send(JSON.stringify({ id: myId, method, params }))
})
ws.on('open', async () => {
  await send('Runtime.enable', {})
  const r = await send('Runtime.evaluate', { expression: process.argv[3], returnByValue: true })
  console.log(JSON.stringify(r.result ? r.result.value : r))
  process.exit(0)
})
setTimeout(() => { console.log('TIMEOUT'); process.exit(1) }, 15000)
