import { createClient } from '@supabase/supabase-js'
import { withSentry } from '../lib/sentry.js'
import { requireAdmin } from '../_lib/admin-auth.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─────────────────────────────────────────────────────────────────────────────
// Founder funnel snapshot
// ─────────────────────────────────────────────────────────────────────────────
// Returns a cohort funnel for the last N days (default 90) based on the
// `first_X_added_at` columns stamped by add_funnel_instrumentation.sql.
//
// Auth, in order of preference:
//   1. An admin session (Authorization: Bearer <supabase access token>)
//   2. Authorization: Bearer $ADMIN_TOKEN or $CRON_SECRET, for scripts
//   3. ?token=$ADMIN_TOKEN, for opening the HTML view in a browser
//
// A URL secret ends up in browser history, referrer headers and every proxy log
// it passes through, so the query-string path takes ADMIN_TOKEN only. CRON_SECRET
// authorises every cron endpoint we have and must never travel in a URL.
//
// Usage:
//   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
//        https://www.everstead.care/api/admin/funnel?days=90
//
//   Browser (nicely formatted HTML):
//   https://www.everstead.care/api/admin/funnel?token=YOUR_ADMIN_TOKEN&format=html
// ─────────────────────────────────────────────────────────────────────────────

async function handler(req, res) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const bearerToken  = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const queryToken   = (req.query.token || '').toString()
  const headerSecrets = [process.env.ADMIN_TOKEN, process.env.CRON_SECRET].filter(Boolean)

  const bySecret = (bearerToken && headerSecrets.includes(bearerToken))
    || (queryToken && !!process.env.ADMIN_TOKEN && queryToken === process.env.ADMIN_TOKEN)

  if (!bySecret) {
    // Falls back to a real admin session, which carries the authenticator
    // step-up when one is enrolled.
    const admin = bearerToken ? await requireAdmin(req) : null
    if (!admin) return res.status(401).json({ error: 'Unauthorised' })
  }

  const days   = Math.max(1, Math.min(365, parseInt(req.query.days || '90', 10) || 90))
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  // ── Pull the cohort ─────────────────────────────────────────────────────
  // We pull a slim per-row dataset and aggregate in JS to keep this dialect-agnostic.
  const { data: cohort, error } = await supabase
    .from('profiles')
    .select('id, created_at, stripe_subscription_id, trial_ends_at, role, first_account_added_at, first_contact_added_at, first_document_added_at, first_instruction_added_at')
    .gte('created_at', cutoff)
    .neq('role', 'delegate')

  if (error) {
    console.error('[admin/funnel] query error:', error)
    return res.status(500).json({ error: 'Could not load funnel' })
  }

  const total = cohort.length

  // Step counters
  const c = {
    signups: total,
    reached_checkout:  cohort.filter(u => u.stripe_subscription_id).length,
    added_account:     cohort.filter(u => u.first_account_added_at).length,
    added_contact:     cohort.filter(u => u.first_contact_added_at).length,
    added_document:    cohort.filter(u => u.first_document_added_at).length,
    wrote_instruction: cohort.filter(u => u.first_instruction_added_at).length,

    // Activation combos — which one best predicts paid retention?
    account_AND_contact:    cohort.filter(u => u.first_account_added_at && u.first_contact_added_at).length,
    contact_AND_document:   cohort.filter(u => u.first_contact_added_at && u.first_document_added_at).length,
    all_four:               cohort.filter(u => u.first_account_added_at && u.first_contact_added_at && u.first_document_added_at && u.first_instruction_added_at).length,

    // 30-day "still paying" proxy: created >30d ago AND has a subscription
    retained_30d: cohort.filter(u =>
      u.stripe_subscription_id &&
      new Date(u.created_at).getTime() < Date.now() - 30 * 86_400_000
    ).length,
    eligible_for_30d_retention: cohort.filter(u =>
      new Date(u.created_at).getTime() < Date.now() - 30 * 86_400_000
    ).length,
  }

  // ── Time-to-milestone (median hours from signup) ────────────────────────
  const hoursBetween = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000
  const median = (arr) => {
    if (arr.length === 0) return null
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }
  const timing = {
    median_hours_to_first_account: median(cohort.filter(u => u.first_account_added_at).map(u => hoursBetween(u.created_at, u.first_account_added_at))),
    median_hours_to_first_contact: median(cohort.filter(u => u.first_contact_added_at).map(u => hoursBetween(u.created_at, u.first_contact_added_at))),
    median_hours_to_first_doc:     median(cohort.filter(u => u.first_document_added_at).map(u => hoursBetween(u.created_at, u.first_document_added_at))),
  }

  // Early-funnel numbers live in auth.users, out of REST's reach: a SECURITY
  // DEFINER aggregate (service-role only) answers them. Caveat carried into the
  // UI: last_sign_in_at only moves on a fresh sign-in, so members who simply
  // STAYED signed in undercount as returners.
  let extras = null
  try {
    const { data } = await supabase.rpc('admin_funnel_extras', { p_days: days })
    extras = data ?? null
  } catch { /* the core funnel still renders without them */ }

  const result = {
    window_days: days,
    cohort_size: total,
    early_funnel: extras && {
      email_confirmed:  { count: extras.email_confirmed, pct_of_signups: pct(extras.email_confirmed, extras.cohort_size) },
      returned_day1:    { count: extras.returned_day1, eligible: extras.eligible_day1, pct: pct(extras.returned_day1, extras.eligible_day1) },
      returned_day7:    { count: extras.returned_day7, eligible: extras.eligible_day7, pct: pct(extras.returned_day7, extras.eligible_day7) },
      active_last_7d:   extras.active_last_7d,
      platforms:        extras.platforms,
      measured:         extras.measured || null,
      caveat: 'Returns are counted by fresh sign-ins; members who stayed signed in undercount. "Measured" rows come from real daily opens, collected since the date shown.',
    },
    funnel: {
      signups:           { count: c.signups,            pct_of_signups: 100 },
      reached_checkout:  { count: c.reached_checkout,   pct_of_signups: pct(c.reached_checkout, c.signups) },
      added_account:     { count: c.added_account,      pct_of_signups: pct(c.added_account, c.signups) },
      added_contact:     { count: c.added_contact,      pct_of_signups: pct(c.added_contact, c.signups) },
      added_document:    { count: c.added_document,     pct_of_signups: pct(c.added_document, c.signups) },
      wrote_instruction: { count: c.wrote_instruction,  pct_of_signups: pct(c.wrote_instruction, c.signups) },
    },
    activation_combos: {
      account_AND_contact:  { count: c.account_AND_contact,  pct_of_signups: pct(c.account_AND_contact,  c.signups) },
      contact_AND_document: { count: c.contact_AND_document, pct_of_signups: pct(c.contact_AND_document, c.signups) },
      all_four:             { count: c.all_four,             pct_of_signups: pct(c.all_four,             c.signups) },
    },
    retention_proxy: {
      eligible: c.eligible_for_30d_retention,
      still_subscribed_at_day_30: c.retained_30d,
      retention_pct: pct(c.retained_30d, c.eligible_for_30d_retention),
    },
    median_time_to_action: timing,
    generated_at: new Date().toISOString(),
  }

  if ((req.query.format || '').toString() === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(htmlPage(result))
  }

  return res.status(200).json(result)
}

function pct(num, denom) {
  if (!denom) return 0
  return Math.round((num / denom) * 1000) / 10
}

function htmlPage(r) {
  const row = (label, count, percent, sub) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #eef2ed;font-size:14px;color:#0d1628;">${label}${sub ? `<br><span style="font-size:12px;color:#9ca3af;font-weight:normal;">${sub}</span>` : ''}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #eef2ed;font-size:14px;color:#0d1628;text-align:right;font-variant-numeric:tabular-nums;">${count}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #eef2ed;font-size:14px;color:#4c7d47;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;">${percent}%</td>
    </tr>
  `
  const f = r.funnel
  const a = r.activation_combos
  const t = r.median_time_to_action
  const fmtHours = (h) => h == null ? '—' : (h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Everstead funnel · last ${r.window_days} days</title>
  <style>
    body { margin:0; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#f8f7f5; color:#0d1628; padding:32px 16px; }
    .wrap { max-width:780px; margin:0 auto; }
    h1 { font-family:Georgia,serif; font-weight:400; font-size:28px; margin:0 0 4px; }
    .sub { color:#6b7280; font-size:13px; margin:0 0 28px; }
    .card { background:#fff; border:1px solid #e7e5e4; border-radius:14px; overflow:hidden; margin:0 0 20px; }
    .cardHead { padding:14px 18px; border-bottom:1px solid #eef2ed; background:#f9f8f6; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#4c7d47; }
    table { width:100%; border-collapse:collapse; }
    .footer { color:#9ca3af; font-size:12px; margin-top:24px; line-height:1.6; }
    .kv { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:14px 18px; }
    .kv > div { font-size:13px; }
    .kv strong { display:block; color:#9ca3af; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; }
    .kv span { color:#0d1628; font-variant-numeric:tabular-nums; font-size:15px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Funnel snapshot</h1>
    <p class="sub">Cohort: ${r.cohort_size} signups in the last ${r.window_days} days · generated ${new Date(r.generated_at).toLocaleString('en-GB')}</p>

    ${r.early_funnel ? `
    <div class="card">
      <div class="cardHead">Before anything is added</div>
      <table>
        <tbody>
          ${row('Confirmed their email', r.early_funnel.email_confirmed.count, r.early_funnel.email_confirmed.pct_of_signups)}
          ${row('Came back after day 1', r.early_funnel.returned_day1.count, r.early_funnel.returned_day1.pct, `of ${r.early_funnel.returned_day1.eligible} old enough to count`)}
          ${row('Came back after day 7', r.early_funnel.returned_day7.count, r.early_funnel.returned_day7.pct, `of ${r.early_funnel.returned_day7.eligible} old enough to count`)}
        </tbody>
      </table>
      <div class="kv">
        <div><strong>Active in the last 7 days</strong><span>${r.early_funnel.active_last_7d}</span></div>
        <div><strong>Signup platform</strong><span>${Object.entries(r.early_funnel.platforms).map(([k, v]) => `${k} ${v}`).join(' · ')}</span></div>
        ${r.early_funnel.measured?.since ? `
        <div><strong>Measured opens, last 7d</strong><span>${r.early_funnel.measured.opened_last_7d}</span></div>
        <div><strong>Measured returners (since ${r.early_funnel.measured.since})</strong><span>${r.early_funnel.measured.returners}</span></div>` : ''}
      </div>
      <p style="margin:0;padding:0 18px 14px;color:#9ca3af;font-size:11px;">${r.early_funnel.caveat}</p>
    </div>` : ''}

    <div class="card">
      <div class="cardHead">Funnel</div>
      <table>
        <tbody>
          ${row('Signups',                         f.signups.count,           f.signups.pct_of_signups)}
          ${row('Reached Stripe checkout',         f.reached_checkout.count,  f.reached_checkout.pct_of_signups)}
          ${row('Added first account',             f.added_account.count,     f.added_account.pct_of_signups)}
          ${row('Added first trusted contact',     f.added_contact.count,     f.added_contact.pct_of_signups)}
          ${row('Uploaded first document',         f.added_document.count,    f.added_document.pct_of_signups)}
          ${row('Wrote first instruction',         f.wrote_instruction.count, f.wrote_instruction.pct_of_signups)}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="cardHead">Activation combos (candidates for "first value moment")</div>
      <table>
        <tbody>
          ${row('Added account AND contact',       a.account_AND_contact.count,  a.account_AND_contact.pct_of_signups, 'social-commitment moment')}
          ${row('Added contact AND document',      a.contact_AND_document.count, a.contact_AND_document.pct_of_signups, 'hypothesised activation combo')}
          ${row('Completed all four',              a.all_four.count,             a.all_four.pct_of_signups, 'fully activated')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="cardHead">30-day retention proxy</div>
      <div class="kv">
        <div><strong>Eligible (signed up &gt;30d ago)</strong><span>${r.retention_proxy.eligible}</span></div>
        <div><strong>Still subscribed</strong><span>${r.retention_proxy.still_subscribed_at_day_30}</span></div>
        <div><strong>Retention</strong><span>${r.retention_proxy.retention_pct}%</span></div>
      </div>
    </div>

    <div class="card">
      <div class="cardHead">Median time from signup to action</div>
      <div class="kv">
        <div><strong>First account</strong><span>${fmtHours(t.median_hours_to_first_account)}</span></div>
        <div><strong>First contact</strong><span>${fmtHours(t.median_hours_to_first_contact)}</span></div>
        <div><strong>First document</strong><span>${fmtHours(t.median_hours_to_first_doc)}</span></div>
      </div>
    </div>

    <p class="footer">Tip: append <code>&amp;days=30</code> for a 30-day window. Append no <code>format</code> param for raw JSON.</p>
  </div>
</body>
</html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
