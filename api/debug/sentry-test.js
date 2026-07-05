import { withSentry, captureException } from '../lib/sentry.js'

// TEMPORARY diagnostic endpoint — deliberately throws so we can confirm the
// captureException wiring actually reaches Sentry. Gated by a one-time token
// (not a real credential) so nobody else can trigger it. Delete this file once
// the test event is confirmed in Sentry.
const TEST_TOKEN = 'e45bdc508e2c4bd6df7b0b1a675b06b6'

async function handler(req, res) {
  if (req.query.token !== TEST_TOKEN) return res.status(404).json({ error: 'Not found' })

  try {
    throw new Error('Sentry wiring test — safe to ignore, triggered manually to verify captureException reaches Sentry.')
  } catch (err) {
    console.error('sentry-test:', err.message)
    captureException(err, { endpoint: 'debug/sentry-test', purpose: 'manual verification' })
    return res.status(200).json({ ok: true, message: 'Test error sent to Sentry.' })
  }
}

export default withSentry(handler)
