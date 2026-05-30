import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || process.env.APP_URL || 'https://www.everstead.care'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Allowed sources — any value outside this set is rejected.
// Each maps to a render function that produces the takeaway email.
const SOURCES = {
  'executor-checklist':         { subject: 'Your executor checklist',                            render: executorChecklistHtml },
  'digital-estate-calculator':  { subject: 'Your digital estate estimate',                       render: digitalEstateHtml      },
  'when-someone-dies':          { subject: 'What to do when someone dies — your full guide',     render: whenSomeoneDiesHtml    },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, name, source, metadata } = req.body || {}

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (!source || !SOURCES[source]) {
    return res.status(400).json({ error: 'Unknown source' })
  }

  const normalised = email.trim().toLowerCase()
  const cleanName  = (name || '').toString().trim().slice(0, 80) || null
  const sourceIp   =
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.headers['x-real-ip']?.toString() || null
  const userAgent  = req.headers['user-agent']?.toString().slice(0, 500) || null

  // Upsert by (email, source). If they previously unsubscribed from this source,
  // re-subscribe them since they're actively opting in again.
  let unsubscribeToken
  try {
    const { data: existing, error: lookupErr } = await supabase
      .from('marketing_leads')
      .select('id, unsubscribe_token, unsubscribed_at')
      .ilike('email', normalised)
      .eq('source', source)
      .maybeSingle()

    if (lookupErr && lookupErr.code !== 'PGRST116') {
      console.error('[leads/capture] lookup error:', lookupErr)
    }

    if (existing) {
      unsubscribeToken = existing.unsubscribe_token
      const { error: updateErr } = await supabase
        .from('marketing_leads')
        .update({
          name: cleanName,
          source_metadata: metadata || null,
          unsubscribed_at: null,
          subscribed_at: new Date().toISOString(),
          source_ip: sourceIp,
          user_agent: userAgent,
        })
        .eq('id', existing.id)
      if (updateErr) console.error('[leads/capture] update error:', updateErr)
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('marketing_leads')
        .insert({
          email: normalised,
          name: cleanName,
          source,
          source_metadata: metadata || null,
          source_ip: sourceIp,
          user_agent: userAgent,
        })
        .select('unsubscribe_token')
        .single()
      if (insertErr) {
        console.error('[leads/capture] insert error:', insertErr)
      } else {
        unsubscribeToken = inserted.unsubscribe_token
      }
    }
  } catch (err) {
    console.error('[leads/capture] DB exception:', err)
    // Don't block the email send if DB write fails — better to deliver the
    // takeaway than to leave the user empty-handed. We'll fall through.
  }

  // Send the tool-specific takeaway email (best-effort — log failures)
  try {
    const { subject, render } = SOURCES[source]
    const unsubLink = unsubscribeToken
      ? `${APP_URL}/api/leads/unsubscribe?token=${unsubscribeToken}`
      : `${APP_URL}/api/leads/unsubscribe`
    await resend.emails.send({
      from:    'Everstead <hello@everstead.care>',
      to:      normalised,
      subject,
      html:    render({ name: cleanName, metadata: metadata || {}, unsubLink }),
    })
  } catch (err) {
    console.error('[leads/capture] email send error:', err)
    return res.status(500).json({ error: "Could not send the email. Please try again or contact hello@everstead.care." })
  }

  return res.status(200).json({ ok: true })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Email templates
// ─────────────────────────────────────────────────────────────────────────────

function shell({ heading, body, footerNote, unsubLink }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;">
          <img src="${APP_URL}/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 20px;color:#0d1628;font-size:26px;font-weight:normal;line-height:1.3;">${heading}</h1>
          ${body}
          <div style="margin:36px 0 0;text-align:center;border-top:1px solid #e8e5e0;padding-top:28px;">
            <p style="margin:0 0 16px;color:#4a5568;font-size:15px;line-height:1.6;">Everstead is where you put your accounts, documents, trusted people, and final wishes in one secure place — so the people you love know exactly what to do, when it counts.</p>
            <a href="${APP_URL}/get-started" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Start your free plan →</a>
            <p style="margin:14px 0 0;color:#9ca3af;font-size:13px;">14-day free trial · No card needed to try the demo</p>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f9f8f6;border-top:1px solid #e8e5e0;">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;line-height:1.5;">${footerNote || 'You requested this from a free tool on everstead.care.'}</p>
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;"><a href="${unsubLink}" style="color:#6b7280;">Unsubscribe from this list</a> · Everstead Digital Ltd · UK</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function executorChecklistHtml({ name, unsubLink }) {
  const firstName = name?.split(' ')[0] || 'there'
  const sections = [
    { title: '1. In the first 24–48 hours', items: [
      'Obtain the medical certificate of cause of death from the GP or hospital',
      'Register the death within 5 days (8 in Scotland) at the register office',
      'Get extra certified copies of the death certificate — you will need many',
      'Notify immediate family and close friends',
      'Secure the deceased\'s home, vehicle, and pets',
    ]},
    { title: '2. In the first 2 weeks', items: [
      'Locate the will — check home, solicitor, bank deposit box',
      'Make funeral arrangements (within the bounds of the will\'s wishes)',
      'Use the Tell Us Once service to notify HMRC, DWP, DVLA, and councils',
      'Notify employer, pension provider, and life insurance company',
      'Contact banks and building societies — accounts will be frozen',
    ]},
    { title: '3. Within the first month', items: [
      'Apply for probate (or letters of administration if no will)',
      'Make a complete inventory of assets and debts (the "estate accounts")',
      'Notify utility companies, council tax, broadband, mobile providers',
      'Cancel subscriptions, memberships, and recurring direct debits',
      'Notify insurers — home, car, life, health',
    ]},
    { title: '4. Within 3–6 months', items: [
      'Submit the IHT400 form to HMRC if inheritance tax is due',
      'Pay any inheritance tax owed (due 6 months after the end of the month of death)',
      'Receive the grant of probate — typically 8–16 weeks after applying',
      'Distribute specific gifts named in the will',
      'Close accounts and consolidate assets into the executor\'s estate account',
    ]},
    { title: '5. Final steps', items: [
      'Place a Section 27 Trustee Act notice to protect against unknown creditors',
      'Settle final tax returns for the deceased\'s last year',
      'Prepare and circulate the estate accounts to beneficiaries',
      'Distribute the residual estate as directed by the will',
      'Keep records for at least 12 years',
    ]},
  ]

  const body = `
    <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName}, here's the executor's checklist you requested — the practical, UK-specific steps to handle an estate from day one through final distribution. Save this email, or print it.</p>

    <div style="background:#fff7ed;border-left:3px solid #d97706;border-radius:6px;padding:14px 18px;margin:0 0 28px;">
      <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;"><strong>A note:</strong> this is a guide, not legal advice. For estates with complex tax positions, property in multiple jurisdictions, or disputed wills, instruct a probate solicitor.</p>
    </div>

    ${sections.map(s => `
      <h2 style="margin:24px 0 12px;color:#0d1628;font-size:17px;font-weight:600;">${s.title}</h2>
      <ul style="margin:0 0 8px;padding:0 0 0 20px;color:#374151;font-size:14px;line-height:1.8;">
        ${s.items.map(i => `<li style="margin:0 0 6px;">${i}</li>`).join('')}
      </ul>
    `).join('')}
  `

  return shell({
    heading: 'Your executor checklist',
    body,
    footerNote: 'You requested the executor checklist from everstead.care/executor-checklist.',
    unsubLink,
  })
}

function digitalEstateHtml({ name, metadata, unsubLink }) {
  const firstName = name?.split(' ')[0] || 'there'
  const total     = metadata?.total ?? null
  const breakdown = Array.isArray(metadata?.breakdown) ? metadata.breakdown : []

  const formatted = total != null
    ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(total)
    : null

  const breakdownHtml = breakdown.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
         ${breakdown.map(row => `
           <tr>
             <td style="padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;color:#374151;">${escapeHtml(row.label || '')}</td>
             <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0ede8;text-align:right;font-size:14px;font-weight:600;color:#0d1628;">${escapeHtml(row.value || '')}</td>
           </tr>
         `).join('')}
       </table>`
    : ''

  const totalCard = formatted
    ? `<div style="background:#f9f8f6;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
         <p style="margin:0 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">Estimated digital estate value</p>
         <p style="margin:0;font-size:48px;font-weight:300;color:#0d1628;line-height:1.1;">${formatted}</p>
       </div>`
    : ''

  const body = `
    <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName}, here's your digital estate estimate.</p>
    ${totalCard}
    ${breakdown.length > 0 ? `<h2 style="margin:0 0 12px;color:#0d1628;font-size:17px;font-weight:600;">Where the value sits</h2>${breakdownHtml}` : ''}
    <h2 style="margin:24px 0 12px;color:#0d1628;font-size:17px;font-weight:600;">Why this matters</h2>
    <p style="margin:0 0 16px;color:#4a5568;font-size:14px;line-height:1.7;">A typical UK adult now holds several thousand pounds of value spread across digital accounts — investment platforms, crypto wallets, loyalty points, domain names, cloud storage, monetised social accounts. Most of it is inaccessible to family after death, because no one knows it's there.</p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:14px;line-height:1.7;">Everstead's role is simple: a structured place to record every account (no passwords needed — just references), who has access, and what should happen to it. Your family inherits a usable map, not a guessing game.</p>
  `

  return shell({
    heading: 'Your digital estate estimate',
    body,
    footerNote: 'You requested this estimate from everstead.care/digital-estate-worth.',
    unsubLink,
  })
}

function whenSomeoneDiesHtml({ name, unsubLink }) {
  const firstName = name?.split(' ')[0] || 'there'
  const phases = [
    { title: 'Phase 1 — The first few hours', text: 'If the death was expected and at home, call the GP. If unexpected or at night, call 111. The GP issues the Medical Certificate of Cause of Death (MCCD). You cannot register the death without it. Tell close family before social media gets there first.' },
    { title: 'Phase 2 — Within 5 days', text: 'Register the death at the register office (8 days in Scotland). Take the MCCD plus the deceased\'s NHS number, full name, date and place of birth, address, and occupation. You\'ll get the death certificate and the green form for the funeral director — buy 6–10 certified copies, you\'ll need them.' },
    { title: 'Phase 3 — Tell organisations', text: 'Use Tell Us Once (gov.uk/tell-us-once) — it notifies HMRC, DWP, DVLA, Passport Office, and your local council in one go. Separately tell: banks, employer/pension provider, life insurer, utility companies, broadband and mobile, GP surgery, dentist, council tax, and TV licence.' },
    { title: 'Phase 4 — The funeral', text: 'You don\'t have to use a funeral director (though most people do). Check the will for funeral wishes. Funeral costs can usually be paid out of the deceased\'s frozen bank account before probate. Ask the bank for the funeral payment form.' },
    { title: 'Phase 5 — Probate', text: 'Find the will (home, solicitor, bank). Apply for probate (gov.uk/applying-for-probate) — typically 8–16 weeks. If no will, apply for letters of administration. For estates over £325,000 (£500,000 with main residence to a direct descendant), file the IHT400 form.' },
    { title: 'Phase 6 — Settling the estate', text: 'Make a complete list of assets and debts. Open an executor\'s account. Pay debts and inheritance tax. Place a Section 27 Trustee Act notice to protect yourself from unknown creditors. Distribute the estate as the will directs. Prepare estate accounts for beneficiaries.' },
    { title: 'Phase 7 — After', text: 'Keep records for 12 years. Cancel any remaining subscriptions, social media accounts (Facebook memorialisation, Google inactive account manager). Update household admin if the deceased was the primary bill-payer. Give yourself permission to grieve.' },
  ]

  const body = `
    <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">Hi ${firstName} — when someone close to you dies, the practical steps come at you fast, often while you\'re trying to process the news. This is a sequenced guide so you don\'t have to think.</p>

    <div style="background:#f0fdf4;border-left:3px solid #4c7d47;border-radius:6px;padding:14px 18px;margin:0 0 28px;">
      <p style="margin:0;color:#14532d;font-size:13px;line-height:1.6;"><strong>Bereavement support:</strong> Cruse Bereavement Care — 0808 808 1677 (free, UK). Samaritans — 116 123 (any time, free). You don\'t have to do this alone.</p>
    </div>

    ${phases.map(p => `
      <h2 style="margin:24px 0 10px;color:#0d1628;font-size:17px;font-weight:600;">${p.title}</h2>
      <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.7;">${p.text}</p>
    `).join('')}

    <div style="background:#fef3c7;border-left:3px solid #d97706;border-radius:6px;padding:14px 18px;margin:24px 0 0;">
      <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;"><strong>This is a guide, not legal advice.</strong> For estates with complex tax, property abroad, contested wills, or trusts, instruct a probate solicitor early. STEP UK has a member directory at step.org.</p>
    </div>
  `

  return shell({
    heading: 'What to do when someone dies — your full guide',
    body,
    footerNote: 'You requested this guide from everstead.care/what-to-do-when-someone-dies.',
    unsubLink,
  })
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
