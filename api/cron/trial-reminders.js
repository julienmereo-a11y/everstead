import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { planLabel } from '../_lib/plan-label.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results = { reminded: 0, warned: 0, deleted: 0, errors: [] }

  // ── Step 1: Mark expired trials ──────────────────────────────
  // Set trial_expired status and schedule deletion 30 days after trial end
  await supabase.rpc('mark_expired_trials').catch(async () => {
    // Fallback inline if RPC doesn't exist
    const { data: expired } = await supabase
      .from('profiles')
      .select('id, trial_ends_at')
      .eq('subscription_status', 'trialing')
      .lt('trial_ends_at', new Date().toISOString())
      .not('trial_ends_at', 'is', null)
      .neq('entitlement_source', 'apple_iap') // Apple manages IAP lifecycle

    for (const p of expired ?? []) {
      await supabase
        .from('profiles')
        .update({
          subscription_status:  'trial_expired',
          scheduled_deletion_at: new Date(new Date(p.trial_ends_at).getTime() + 30 * 86400000).toISOString(),
        })
        .eq('id', p.id)
        .eq('subscription_status', 'trialing') // prevent overwriting active/cancelled
    }
  })

  // ── Step 2: Trial reminder emails (7 / 3 / 1 days before expiry) ──
  const { data: trialing } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, trial_ends_at, reminder_7_sent, reminder_3_sent, reminder_1_sent, notify_trial_reminders')
    .eq('subscription_status', 'trialing')
    .not('trial_ends_at', 'is', null)
    .neq('notify_trial_reminders', false)
    .neq('entitlement_source', 'apple_iap') // Apple auto-charges IAP trials — no card nudge

  const now = Date.now()

  await Promise.allSettled(
    (trialing ?? []).map(async (p) => {
      const msLeft   = new Date(p.trial_ends_at).getTime() - now
      const daysLeft = Math.ceil(msLeft / 86400000)

      const tasks = []
      if (daysLeft <= 7 && daysLeft > 6 && !p.reminder_7_sent) tasks.push({ daysLeft: 7, flag: 'reminder_7_sent' })
      if (daysLeft <= 3 && daysLeft > 2 && !p.reminder_3_sent) tasks.push({ daysLeft: 3, flag: 'reminder_3_sent' })
      if (daysLeft <= 1 && daysLeft > 0 && !p.reminder_1_sent) tasks.push({ daysLeft: 1, flag: 'reminder_1_sent' })

      for (const task of tasks) {
        try {
          await resend.emails.send({
            from:    'Everstead <hello@everstead.care>',
            to:      p.email,
            subject: task.daysLeft === 1
              ? 'Your Everstead trial ends tomorrow'
              : `Your Everstead trial ends in ${task.daysLeft} days`,
            html: trialReminderHtml(p.full_name, p.plan, p.trial_ends_at, task.daysLeft),
          })
          await supabase.from('profiles').update({ [task.flag]: true }).eq('id', p.id)
          results.reminded++
        } catch (err) {
          captureException(err, { endpoint: 'cron/trial-reminders', stage: 'reminder', userId: p.id })
          results.errors.push(`reminder ${p.id}: ${err.message}`)
        }
      }
    })
  )

  // ── Step 3: Deletion warning emails (7 days before scheduled_deletion_at) ──
  const warnBefore = new Date(now + 8 * 86400000).toISOString() // within next 8 days
  const { data: toWarn } = await supabase
    .from('profiles')
    .select('id, full_name, email, scheduled_deletion_at')
    .eq('subscription_status', 'trial_expired')
    .or('deletion_warning_sent.is.null,deletion_warning_sent.eq.false')
    .lte('scheduled_deletion_at', warnBefore)
    .not('scheduled_deletion_at', 'is', null)

  await Promise.allSettled(
    (toWarn ?? []).map(async (p) => {
      const deletionDate = new Date(p.scheduled_deletion_at)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      try {
        await resend.emails.send({
          from:    'Everstead <hello@everstead.care>',
          to:      p.email,
          subject: 'Your Everstead account will be deleted in 7 days',
          html:    deletionWarningHtml(p.full_name, deletionDate),
        })
        await supabase
          .from('profiles')
          .update({ deletion_warning_sent: true })
          .eq('id', p.id)
        results.warned++
      } catch (err) {
        captureException(err, { endpoint: 'cron/trial-reminders', stage: 'deletion-warning', userId: p.id })
        results.errors.push(`warning ${p.id}: ${err.message}`)
      }
    })
  )

  // ── Step 4: Execute permanent deletions ──────────────────────
  // Covers both trial_expired (30 days post-trial) and pending_deletion
  // (user-initiated account deletion — Stripe already cancelled at request time).
  const { data: toDelete } = await supabase
    .from('profiles')
    .select('id, email, full_name, subscription_status')
    .in('subscription_status', ['trial_expired', 'pending_deletion'])
    .lte('scheduled_deletion_at', new Date().toISOString())
    .not('scheduled_deletion_at', 'is', null)

  for (const p of toDelete ?? []) {
    // Re-fetch immediately before deletion — guard against race where user
    // reactivated between the query above and now.
    const { data: fresh } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', p.id)
      .single()

    const safeStatuses = ['active', 'trialing']
    if (!fresh || safeStatuses.includes(fresh.subscription_status)) {
      console.log(`daily-jobs: skipping deletion for ${p.id} — status is ${fresh?.subscription_status}`)
      continue
    }

    try {
      await deleteUserData(p.id)
      await supabase.from('deletion_log').insert({
        user_id:         p.id,
        deleted_at:      new Date().toISOString(),
        deletion_reason: fresh.subscription_status,
      })
      console.log(`daily-jobs: deleted user ${p.id} (${p.email}) reason=${fresh.subscription_status}`)
      results.deleted++
    } catch (err) {
      console.error(`daily-jobs: delete failed for ${p.id}:`, err.message)
      captureException(err, { endpoint: 'cron/trial-reminders', stage: 'permanent-deletion', userId: p.id })
      results.errors.push(`delete ${p.id}: ${err.message}`)
    }
  }

  console.log('daily-jobs:', results)
  res.status(200).json(results)
}

// ── Hard-delete all user data ─────────────────────────────────
async function deleteUserData(userId) {
  // Fetch storage paths before deleting DB rows
  const { data: docs } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('user_id', userId)

  const storagePaths = (docs ?? []).map(d => d.storage_path).filter(Boolean)
  if (storagePaths.length) {
    await supabase.storage.from('documents').remove(storagePaths).catch(() => {})
  }

  // Get instruction IDs for cascade
  const { data: instructions } = await supabase
    .from('instructions')
    .select('id')
    .eq('user_id', userId)
  const instructionIds = (instructions ?? []).map(i => i.id)
  if (instructionIds.length) {
    await supabase.from('instruction_steps').delete().in('instruction_id', instructionIds)
  }

  // Delete table data in dependency order
  // access_grants + delegate_sessions reference trusted_people, so go first
  await supabase.from('mfa_pending')       .delete().eq('user_id', userId)
  await supabase.from('delegate_sessions') .delete().eq('user_id', userId)
  await supabase.from('access_grants')     .delete().eq('user_id', userId)

  const tables = [
    'trusted_people', 'activity_log', 'alerts', 'instructions',
    'documents', 'accounts', 'wishes', 'subscriptions',
  ]
  for (const table of tables) {
    await supabase.from(table).delete().eq('user_id', userId)
  }

  // Delete profile row, then auth user (order matters — profile FK references auth.users)
  await supabase.from('profiles').delete().eq('id', userId)
  await supabase.auth.admin.deleteUser(userId)
}

// ── Email templates ───────────────────────────────────────────
function trialReminderHtml(name, plan, trialEndsAt, daysLeft) {
  const endDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:32px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${daysLeft === 1 ? 'Your trial ends tomorrow.' : `Your trial ends in ${daysLeft} days.`}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Hi ${name || 'there'}, your free trial on the <strong>${planLabel(plan)}</strong> plan ends${endDate ? ` on <strong>${endDate}</strong>` : ' soon'}.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">Add your payment details before then to keep access to your estate plan, documents, and trusted contacts.</p>
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">Go to my vault →</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Questions? <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a> · <a href="mailto:hello@everstead.care?subject=Unsubscribe" style="color:#9ca3af;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function deletionWarningHtml(name, deletionDate) {
  const firstName = name?.split(' ')[0] || 'there'
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:32px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Your account will be deleted in 7 days.</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">Hi ${firstName}, your free trial ended 30 days ago and your account has been inactive since.</p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">On <strong>${deletionDate}</strong>, your Everstead plan will be permanently deleted — including all your accounts, documents, trusted people, and instructions.</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">If you'd like to keep your plan, it only takes a moment.</p>
          <a href="${APP_URL}/trial-ended" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">Continue with Everstead →</a>
          <p style="margin:32px 0 0;color:#9ca3af;font-size:14px;line-height:1.6;">If you no longer need Everstead, you don't need to do anything. Your account will be removed automatically on ${deletionDate}.</p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Julien · Founder, Everstead · <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a> · <a href="mailto:hello@everstead.care?subject=Unsubscribe" style="color:#9ca3af;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
