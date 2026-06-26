import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_URL  = process.env.PUBLIC_BASE_URL || 'https://www.everstead.care'
const TEAM_TO   = process.env.REPORTS_TO || process.env.FEEDBACK_TO || 'julien@everstead.care'

// A delegate notifies Everstead that the plan owner has died (or is incapacitated).
// We verify them via their invite token, record the report for the team to verify,
// email the team, and — for a death — email the reporter a practical UK guide.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const b = req.body || {}
  const inviteToken = b.inviteToken
  const type = b.type === 'incident' ? 'incident' : 'death'
  if (!inviteToken) return res.status(400).json({ error: 'Missing invite token' })

  // Verify the reporter is a genuine delegate (and get an authoritative email —
  // never email an arbitrary client-supplied address).
  const { data: tp, error: tpErr } = await supabase
    .from('trusted_people')
    .select('id, user_id, name, email, role')
    .eq('invite_token', inviteToken)
    .maybeSingle()
  if (tpErr || !tp || !tp.email) return res.status(403).json({ error: 'Invalid or expired link' })

  const ownerId = tp.user_id
  const { data: owner } = await supabase
    .from('profiles')
    .select('full_name, email, plan')
    .eq('id', ownerId)
    .maybeSingle()

  const reporterEmail = tp.email
  const reporterName  = (b.reporter_name || tp.name || 'A trusted person').toString().slice(0, 120)
  const empty = (v) => (v == null || v === '' ? null : String(v).slice(0, 2000))

  const { data: report, error: insErr } = await supabase
    .from('reports')
    .insert({
      type,
      status:            'pending',
      owner_id:          ownerId || null,
      owner_name:        owner?.full_name || null,
      owner_email:       owner?.email || null,
      owner_plan:        owner?.plan || null,
      reporter_name:     reporterName,
      reporter_email:    reporterEmail,
      reporter_phone:    empty(b.reporter_phone),
      reporter_role:     empty(b.reporter_role) || tp.role || null,
      relationship:      empty(b.relationship),
      date_of_death:     empty(b.date_of_death),
      place_of_death:    empty(b.place_of_death),
      death_cert_number: empty(b.death_cert_number),
      incident_type:     empty(b.incident_type),
      incident_date:     empty(b.incident_date),
      location:          empty(b.location),
      notes:             empty(b.additional_notes) || empty(b.description),
    })
    .select('id')
    .single()
  if (insErr) return res.status(500).json({ error: 'Could not save the report' })

  const ownerName = owner?.full_name || 'the plan owner'

  // Email the reporter — the UK guide for a death, a short confirmation otherwise.
  try {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      reporterEmail,
      subject: type === 'death'
        ? 'What to do now — a guide, and the support available to you'
        : 'We have received your report',
      html:    type === 'death' ? guideHtml(reporterName, ownerName) : confirmHtml(reporterName, ownerName),
    })
  } catch (err) {
    console.error('reports/submit reporter email:', err.message)
  }

  // Notify the team to verify.
  try {
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      TEAM_TO,
      subject: `${type === 'death' ? '🕊️ Death' : '⚠️ Incapacity'} report to verify — ${ownerName}`,
      html:    teamHtml(type, { reporterName, reporterEmail, owner, ...b }),
    })
  } catch (err) {
    console.error('reports/submit team email:', err.message)
  }

  return res.status(200).json({ ok: true, reportId: report.id })
}

// ── Email templates ──────────────────────────────────────────────────────────
const AURORA = 'linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%)'

function shell(headline, bodyInner) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#fafaf9;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1c1917;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#2d5082;background:${AURORA};border-radius:16px;padding:28px;text-align:center;">
      <img src="${BASE_URL}/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
      <h1 style="margin:14px 0 0;color:#fff;font-family:Georgia,serif;font-weight:400;font-size:24px;line-height:1.25;">${headline}</h1>
    </div>
    <div style="background:#fff;border:1px solid #e7e5e4;border-top:0;border-radius:0 0 16px 16px;padding:28px;">
      ${bodyInner}
      <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">
        Everstead isn't a legal service and this guide is general information, not legal or financial advice. Please also contact the relevant authorities, financial institutions and professionals as needed. Questions? <a href="mailto:support@everstead.care" style="color:#4c7d47;">support@everstead.care</a>.
      </p>
    </div>
  </div></body></html>`
}

function link(href, label) {
  return `<a href="${href}" style="color:#4c7d47;text-decoration:underline;">${label}</a>`
}

function guideHtml(reporterName, ownerName) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;">Dear ${escapeHtml(reporterName)},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#44403c;">We're so sorry for the loss of ${escapeHtml(ownerName)}. When you feel ready, here are the practical steps families in the UK usually need to take. There's no rush — take what's useful and leave the rest for later.</p>

    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#2d5082;">In the first few days</p>
    <ul style="margin:0 0 22px;padding-left:20px;font-size:15px;line-height:1.7;color:#44403c;">
      <li>Register the death (within 5 days in England, Wales &amp; Northern Ireland; 8 in Scotland) — ${link('https://www.gov.uk/register-a-death', 'gov.uk/register-a-death')}</li>
      <li>Use <strong>Tell Us Once</strong> to notify most government departments in one step — ${link('https://www.gov.uk/after-a-death/organisations-you-need-to-contact-and-tell-us-once', 'the organisations to contact')}</li>
      <li>Order extra copies of the death certificate — banks and providers each ask for one</li>
    </ul>

    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#2d5082;">In the following weeks</p>
    <ul style="margin:0 0 22px;padding-left:20px;font-size:15px;line-height:1.7;color:#44403c;">
      <li>Notify banks, pensions and providers; deal with the will and probate — ${link('https://www.gov.uk/applying-for-probate', 'gov.uk/applying-for-probate')}</li>
      <li>Check whether you're entitled to bereavement benefits — ${link('https://www.gov.uk/bereavement-support-payment', 'Bereavement Support Payment')}</li>
      <li>Full overview of everything after a death — ${link('https://www.gov.uk/after-a-death', 'gov.uk/after-a-death')}</li>
    </ul>

    <div style="background:#f5f8f4;border:1px solid #dfeadd;border-radius:12px;padding:18px 20px;margin:0 0 22px;">
      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#1c1917;"><strong>Your Everstead resources</strong></p>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#44403c;">A free step-by-step guide tailored to the UK, and a practical executor checklist:</p>
      <a href="${BASE_URL}/what-to-do-when-someone-dies" style="display:inline-block;background:#2d5082;background:${AURORA};color:#fff;font-weight:600;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:9999px;">Open the full guide</a>
      <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#78716c;">Or the ${link(`${BASE_URL}/executor-checklist`, 'executor checklist')}.</p>
    </div>

    <p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#2d5082;">Support for you</p>
    <p style="margin:0 0 4px;font-size:15px;line-height:1.65;color:#44403c;">Grief is heavy. Cruse Bereavement Support offers free help — ${link('https://www.cruse.org.uk/', 'cruse.org.uk')}.</p>`
  return shell('A guide for the days ahead', body)
}

function confirmHtml(reporterName, ownerName) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65;">Dear ${escapeHtml(reporterName)},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#44403c;">Thank you for letting us know about ${escapeHtml(ownerName)}. We've received your report and our team will review it within <strong>2 business days</strong>. We may contact you for verification, and relevant access will be unlocked once it's confirmed.</p>`
  return shell('We have received your report', body)
}

function teamHtml(type, p) {
  const row = (k, v) => v ? `<tr><td style="padding:6px 14px 6px 0;color:#78716c;font-size:13px;white-space:nowrap;">${k}</td><td style="padding:6px 0;font-size:13px;color:#1c1917;">${escapeHtml(String(v))}</td></tr>` : ''
  const rows = type === 'death'
    ? row('Date of death', p.date_of_death) + row('Place of death', p.place_of_death) + row('Death cert ref', p.death_cert_number)
    : row('Incident type', p.incident_type) + row('Incident date', p.incident_date) + row('Location', p.location)
  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">A <strong>${type === 'death' ? 'death' : 'incapacity'} report</strong> needs verification.</p>
    <table style="border-collapse:collapse;width:100%;">
      ${row('Plan owner', p.owner?.full_name)}${row('Owner email', p.owner?.email)}${row('Plan', p.owner?.plan)}
      <tr><td colspan="2" style="padding:8px 0;"><hr style="border:0;border-top:1px solid #e7e5e4;"></td></tr>
      ${row('Reporter', p.reporterName)}${row('Reporter email', p.reporterEmail)}${row('Phone', p.reporter_phone)}${row('Role', p.reporter_role)}${row('Relationship', p.relationship)}
      ${rows}
      ${row('Notes', p.additional_notes || p.description)}
    </table>
    <p style="margin:18px 0 0;font-size:12px;color:#a8a29e;">Recorded in the <code>reports</code> table (status: pending).</p>`
  return shell(`${type === 'death' ? 'Death' : 'Incapacity'} report to verify`, body)
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
