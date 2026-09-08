import { db } from './adviser-access.js'
import { sendVaultActivatedNotice } from './adviser-email.js'

// ─────────────────────────────────────────────────────────────────────────────
// Called from api/admin/reports.js the moment an admin verifies a death or
// incapacity report. Resolves the owner's firm, checks the owner's consent,
// and emails every accepted member of the firm (plus the firm's contact
// mailbox) in their own language. Returns a small summary for the admin UI.
//
// Never throws: verification must succeed even if the notification cannot.
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyFirmOfActivation({ ownerId, report, actorId }) {
  try {
    const { data: owner } = await db.from('profiles')
      .select('id, full_name, email, language, adviser_id').eq('id', ownerId).maybeSingle()
    if (!owner?.adviser_id) return { notified: 0, reason: 'no_firm' }

    const { data: consent } = await db.from('adviser_client_consents')
      .select('*').eq('client_id', ownerId).eq('adviser_id', owner.adviser_id).maybeSingle()
    if (!consent?.notify_on_activation) return { notified: 0, reason: 'no_consent' }

    const [{ data: firm }, { data: members }] = await Promise.all([
      db.from('advisers').select('id, firm_name, contact_email').eq('id', owner.adviser_id).maybeSingle(),
      db.from('adviser_members').select('user_id, email').eq('adviser_id', owner.adviser_id).eq('invite_status', 'accepted'),
    ])
    if (!firm) return { notified: 0, reason: 'no_firm' }

    // Each member reads in their own language; the firm mailbox (no profile)
    // follows the client's, which is the language the firm works in.
    const memberIds = (members || []).map(m => m.user_id).filter(Boolean)
    const langs = {}
    if (memberIds.length) {
      const { data: profs } = await db.from('profiles').select('id, language').in('id', memberIds)
      for (const p of profs || []) langs[p.id] = p.language === 'fr' ? 'fr' : 'en'
    }
    const ownerLang = owner.language === 'fr' ? 'fr' : 'en'
    const recipients = new Map()
    for (const m of members || []) {
      if (m.email) recipients.set(m.email.toLowerCase(), langs[m.user_id] || ownerLang)
    }
    if (firm.contact_email && !recipients.has(firm.contact_email.toLowerCase())) {
      recipients.set(firm.contact_email.toLowerCase(), ownerLang)
    }
    if (!recipients.size) return { notified: 0, reason: 'no_recipients' }

    const sharedSections = ['accounts', 'documents', 'instructions', 'people', 'alerts']
      .filter(k => consent[`share_${k}`])

    let notified = 0
    for (const [email, lang] of recipients) {
      const ok = await sendVaultActivatedNotice({
        to: email, lang,
        firmName:       firm.firm_name,
        clientName:     owner.full_name || owner.email,
        type:           report?.type === 'incident' ? 'incident' : 'death',
        verifiedAt:     report?.updated_at || new Date().toISOString(),
        dateOfDeath:    report?.date_of_death || null,
        reporterName:   report?.reporter_name || null,
        reporterRole:   report?.reporter_role || report?.relationship || null,
        sharedSections,
      })
      if (ok) notified += 1
    }

    try {
      await db.from('activity_log').insert({
        user_id:       ownerId,
        actor_id:      actorId || null,
        action:        'adviser.notified',
        resource_type: 'profiles',
        resource_id:   ownerId,
        resource_name: firm.firm_name,
        metadata:      { firm_id: firm.id, recipients: notified, report_id: report?.id || null, report_type: report?.type || null },
      })
    } catch { /* best-effort audit */ }

    return { notified, firm: firm.firm_name }
  } catch (err) {
    console.error('[adviser-notify] activation notice failed:', err?.message)
    return { notified: 0, reason: 'error' }
  }
}
