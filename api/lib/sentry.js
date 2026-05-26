// Optional Sentry error monitoring wrapper.
// Works as a no-op until SENTRY_DSN is set — safe to deploy before setup.
//
// Setup (5 minutes):
//   1. Create a project at https://sentry.io (free tier)
//   2. npm install @sentry/node
//   3. Add SENTRY_DSN to Vercel environment variables
//
// Usage in API handlers:
//   import { captureException } from '../lib/sentry.js'
//   try { ... } catch (err) { captureException(err, { userId, endpoint: 'webhook' }); throw err }

let _sentry = null

function getSentry() {
  if (!process.env.SENTRY_DSN) return null
  if (_sentry) return _sentry
  try {
    // Dynamic require — only loads if @sentry/node is installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const S = require('@sentry/node')
    S.init({
      dsn:               process.env.SENTRY_DSN,
      environment:       process.env.NODE_ENV || 'production',
      tracesSampleRate:  0.05, // 5% of requests — enough for perf insight, low cost
      release:           process.env.VERCEL_GIT_COMMIT_SHA,
    })
    _sentry = S
  } catch {
    // @sentry/node not installed — silent no-op
  }
  return _sentry
}

/**
 * Report an error to Sentry.
 * @param {Error} err
 * @param {Record<string, unknown>} [context] - Extra key-value pairs attached to the event
 */
export function captureException(err, context = {}) {
  const S = getSentry()
  if (!S) return
  S.withScope(scope => {
    Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v))
    S.captureException(err)
  })
}

/**
 * Wrap a Vercel API handler with automatic error capture.
 * Errors are reported to Sentry then re-thrown so Vercel still logs them.
 * @param {Function} handler
 */
export function withSentry(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res)
    } catch (err) {
      captureException(err, {
        url:    req.url,
        method: req.method,
      })
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
}
