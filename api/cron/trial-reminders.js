import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { planLabel } from '../_lib/plan-label.js'
import { translator, emailDate } from '../_lib/email-i18n.js'

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

  const results = { expired: 0, reminded: 0, warned: 0, deleted: 0, errors: [] }

  // ── Step 1: Mark expired trials ──────────────────────────────
  // mark_expired_trials (api/migrations/mark_expired_trials.sql) flips overdue
  // non-IAP trials to trial_expired and schedules deletion at trial end + 30
  // days, floored at now + 14 days so the 7-day warning in step 3 always has
  // room even when a trial is flipped late. Errors surface in the result
  // object — a PostgREST builder is a thenable with no .catch(), and chaining
  // one threw the TypeError that killed this whole cron until 2026-08-06.
  const { data: expiredCount, error: expireErr } = await supabase.rpc('mark_expired_trials')
  if (expireErr) {
    captureException(new Error(expireErr.message), { endpoint: 'cron/trial-reminders', stage: 'mark-expired' })
    results.errors.push(`mark-expired: ${expireErr.message}`)
  } else {
    results.expired = expiredCount ?? 0
  }

  // ── Step 2: Trial reminder emails (7 / 3 / 1 days before expiry) ──
  const { data: trialing } = await supabase
    .from('profiles')
    .select('id, full_name, email, plan, language, trial_ends_at, reminder_7_sent, reminder_3_sent, reminder_1_sent, notify_trial_reminders')
    .eq('subscription_status', 'trialing')
    .not('trial_ends_at', 'is', null)
    .neq('notify_trial_reminders', false)
    // Apple + Google auto-charge IAP trials — no card nudge for store-managed subs.
    .not('entitlement_source', 'in', '("apple_iap","google_play")')

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
          const t = translator(COPY, p.language)
          await resend.emails.send({
            from:    'Everstead <hello@everstead.care>',
            to:      p.email,
            subject: task.daysLeft === 1
              ? t('reminderSubjectTomorrow')
              : t('reminderSubjectDays', { days: task.daysLeft }),
            html: trialReminderHtml(p.full_name, p.plan, p.trial_ends_at, task.daysLeft, p.language),
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
    .select('id, full_name, email, language, scheduled_deletion_at')
    .eq('subscription_status', 'trial_expired')
    .or('deletion_warning_sent.is.null,deletion_warning_sent.eq.false')
    .lte('scheduled_deletion_at', warnBefore)
    .not('scheduled_deletion_at', 'is', null)

  await Promise.allSettled(
    (toWarn ?? []).map(async (p) => {
      const deletionDate = emailDate(p.scheduled_deletion_at, p.language)
      const t = translator(COPY, p.language)
      try {
        await resend.emails.send({
          from:    'Everstead <hello@everstead.care>',
          to:      p.email,
          subject: t('deletionSubject'),
          html:    deletionWarningHtml(p.full_name, deletionDate, p.language),
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
      console.log(`daily-jobs: skipping deletion for ${p.id}, status is ${fresh?.subscription_status}`)
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
// Customer-facing copy for both emails in this cron, per language. The HTML
// chrome stays shared below; only these strings change with profiles.language.
const COPY = {
  en: {
    reminderSubjectTomorrow: 'Your Everstead trial ends tomorrow',
    reminderSubjectDays:     'Your Everstead trial ends in {{days}} days',
    reminderH1Tomorrow:      'Your trial ends tomorrow.',
    reminderH1Days:          'Your trial ends in {{days}} days.',
    reminderIntroDated:      'Hi {{name}}, your free trial on the <strong>{{plan}}</strong> plan ends on <strong>{{date}}</strong>.',
    reminderIntroSoon:       'Hi {{name}}, your free trial on the <strong>{{plan}}</strong> plan ends soon.',
    reminderBody:            'Add your payment details before then to keep access to your estate plan, documents, and trusted contacts.',
    reminderCta:             'Go to my vault →',
    reminderFallbackName:    'there',
    deletionSubject:         'Your Everstead account will be deleted in 7 days',
    deletionH1:              'Your account will be deleted in 7 days.',
    deletionIntro:           'Hi {{name}}, your free trial ended 30 days ago and your account has been inactive since.',
    questions:               'Questions?',
    unsubscribe:             'Unsubscribe',
  },
  fr: {
    reminderSubjectTomorrow: 'Votre essai Everstead se termine demain',
    reminderSubjectDays:     'Votre essai Everstead se termine dans {{days}} jours',
    reminderH1Tomorrow:      'Votre essai se termine demain.',
    reminderH1Days:          'Votre essai se termine dans {{days}} jours.',
    reminderIntroDated:      'Bonjour {{name}}, votre essai gratuit du forfait <strong>{{plan}}</strong> se termine le <strong>{{date}}</strong>.',
    reminderIntroSoon:       'Bonjour {{name}}, votre essai gratuit du forfait <strong>{{plan}}</strong> se termine bientôt.',
    reminderBody:            'Ajoutez votre moyen de paiement avant cette date pour conserver l\'accès à votre plan, à vos documents et à vos personnes de confiance.',
    reminderCta:             'Accéder à mon coffre →',
    reminderFallbackName:    'à vous',
    deletionSubject:         'Votre compte Everstead sera supprimé dans 7 jours',
    deletionH1:              'Votre compte sera supprimé dans 7 jours.',
    deletionIntro:           'Bonjour {{name}}, votre essai gratuit s\'est terminé il y a 30 jours et votre compte est inactif depuis.',
    questions:               'Une question ?',
    unsubscribe:             'Se désabonner',
  },
}

function trialReminderHtml(name, plan, trialEndsAt, daysLeft, lang) {
  const t = translator(COPY, lang)
  const endDate = trialEndsAt ? emailDate(trialEndsAt, lang) : null
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${daysLeft === 1 ? t('reminderH1Tomorrow') : t('reminderH1Days', { days: daysLeft })}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${endDate
            ? t('reminderIntroDated', { name: name || t('reminderFallbackName'), plan: planLabel(plan), date: endDate })
            : t('reminderIntroSoon',  { name: name || t('reminderFallbackName'), plan: planLabel(plan) })}</p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">${t('reminderBody')}</p>
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${t('reminderCta')}</a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">Questions? <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a> · <a href="mailto:hello@everstead.care?subject=Unsubscribe" style="color:#9ca3af;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function deletionWarningHtml(name, deletionDate, lang) {
  const t = translator(COPY, lang)
  const firstName = name?.split(' ')[0] || t('reminderFallbackName')
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
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">${t('deletionH1')}</h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">${t('deletionIntro', { name: firstName })}</p>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">On <strong>${deletionDate}</strong>, your Everstead plan will be permanently deleted, including all your accounts, documents, trusted people, and instructions.</p>
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
