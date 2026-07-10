import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { planLabel } from '../_lib/plan-label.js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// ─────────────────────────────────────────────────────────────────────────────
// DRIP SCHEDULE
// Each email fires once, N days after the user's stripe_subscription_id was set.
// We use created_at as a close-enough proxy (checkout typically happens minutes
// after account creation). The sent-at column prevents double-sends.
// ─────────────────────────────────────────────────────────────────────────────
const SEQUENCE = [
  {
    n:          1,
    field:      'onboarding_email_1_sent_at',
    afterDays:  2,
    subject:    'Start here: add your first financial account',
    html:       email1Html,
  },
  {
    n:          2,
    field:      'onboarding_email_2_sent_at',
    afterDays:  4,
    subject:    'Who would handle things if you couldn\'t?',
    html:       email2Html,
  },
  {
    n:          3,
    field:      'onboarding_email_3_sent_at',
    afterDays:  7,
    subject:    'Your will, passport, and pension — stored in one safe place',
    html:       email3Html,
  },
  {
    n:          4,
    field:      'onboarding_email_4_sent_at',
    afterDays:  10,
    subject:    'The one thing most people forget in their estate plan',
    html:       email4Html,
  },
  {
    n:          5,
    field:      'onboarding_email_5_sent_at',
    afterDays:  13,
    subject:    'A quick check-in from Julien',
    html:       email5Html,
  },
]

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now     = new Date()
  const results = { sent: {}, errors: [] }

  for (const step of SEQUENCE) {
    // Anchor to trial start (trial_ends_at - 14 days), falling back to created_at.
    // This prevents emails firing too early/late for users who delayed checkout.
    // We fetch all candidates and filter in JS so we can use trial_ends_at per-user.
    const earliestCutoff = new Date(now.getTime() - step.afterDays * 86_400_000).toISOString()

    // Eligible: paying/trialing, this email not yet sent
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`id, full_name, email, plan, created_at, trial_ends_at`)
      .not('stripe_subscription_id', 'is', null)
      .neq('role', 'delegate')
      .not('email', 'is', null)
      .neq('marketing_emails_enabled', false) // respect unsubscribe
      .is(step.field, null)
      .lte('created_at', earliestCutoff) // broad pre-filter; refined per-user below

    if (error) {
      console.error(`onboarding-sequence email ${step.n} query error:`, error)
      results.errors.push(`email_${step.n}_query: ${error.message}`)
      continue
    }

    let stepSent = 0
    let stepSkipped = 0
    for (const user of users ?? []) {
      // Use trial start (trial_ends_at - 14 days) as anchor when available
      const trialStart = user.trial_ends_at
        ? new Date(new Date(user.trial_ends_at).getTime() - 14 * 86_400_000)
        : new Date(user.created_at)
      const sendAfter = new Date(trialStart.getTime() + step.afterDays * 86_400_000)
      if (now < sendAfter) continue // not yet time for this user

      try {
        // ── State-aware progress check (always fetch — needed for skip/recovery logic) ──
        const progress = await getUserProgress(user.id)

        // Per-step skip rules: don't tell users to do things they've already done.
        // We stamp the field as sent anyway so the cron doesn't retry tomorrow.
        const skipReason = shouldSkipForProgress(step.n, progress)
        if (skipReason) {
          await supabase
            .from('profiles')
            .update({ [step.field]: now.toISOString() })
            .eq('id', user.id)
          stepSkipped++
          continue
        }

        // ── Choose template ──
        let html, subject
        if (step.n === 3 && progress.total === 0) {
          // Recovery branch: D7 with zero progress → re-engagement
          subject = "Is something getting in the way?"
          html = recoveryHtml(user.full_name, user.id)
        } else if (step.n === 5) {
          // Personalised day-13 check-in
          html = step.html(user.full_name, user.plan, progress.accounts, progress.documents, progress.contacts, user.id)
          subject = step.subject
        } else {
          html = step.html(user.full_name, user.plan, user.id)
          subject = step.subject
        }

        await resend.emails.send({
          from:    'Everstead <hello@everstead.care>',
          to:      user.email,
          subject,
          html,
        })
        await supabase
          .from('profiles')
          .update({ [step.field]: now.toISOString() })
          .eq('id', user.id)
        stepSent++
      } catch (err) {
        console.error(`onboarding-sequence email ${step.n} for ${user.email}:`, err)
        captureException(err, { endpoint: 'cron/onboarding-sequence', step: step.n, userId: user.id })
        results.errors.push(`email_${step.n}_${user.id}: ${err.message}`)
      }
    }
    results.sent[`email_${step.n}`] = stepSent
    results.sent[`email_${step.n}_skipped`] = stepSkipped
  }

  console.log('onboarding-sequence:', results)
  return res.status(200).json(results)
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
function unsubToken(userId) {
  return Buffer.from(userId).toString('base64url')
}

function layout(body, userId) {
  const unsubUrl = userId
    ? `${APP_URL}/api/email/unsubscribe?token=${unsubToken(userId)}`
    : `mailto:hello@everstead.care?subject=Unsubscribe`
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">${body}</td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            Questions? Reply to this email or write to <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
            · <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function cta(href, label) {
  return `<a href="${href}" style="display:inline-block;background:#2d5082;background:linear-gradient(100deg,#2d5082 0%,#6f6bc6 50%,#6e9b6a 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:15px;">${label}</a>`
}

function tip(icon, text) {
  return `<tr>
    <td style="padding:10px 14px;vertical-align:top;font-size:20px;line-height:1;">${icon}</td>
    <td style="padding:10px 0;color:#4a5568;font-size:14px;line-height:1.6;">${text}</td>
  </tr>`
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 1 — Day 2: Add your first account
// ─────────────────────────────────────────────────────────────────────────────
function email1Html(name, _plan, userId) {
  const first = name?.split(' ')[0] || 'there'
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${first}, let's start with what you own.
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      The foundation of any good estate plan is a clear picture of your finances — bank accounts, investments, pensions, property. It's what your family would need to find in an emergency.
    </p>
    <p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.7;">
      In Everstead you can add all of them in a few minutes. Here's what to include:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;width:100%;">
      ${tip('🏦', '<strong>Bank accounts</strong> — current accounts, savings, ISAs')}
      ${tip('📈', '<strong>Investments & pensions</strong> — workplace pensions, SIPPs, stocks & shares')}
      ${tip('🏠', '<strong>Property</strong> — your home, buy-to-lets, land')}
      ${tip('🛡️', '<strong>Insurance policies</strong> — life, critical illness, income protection')}
    </table>
    ${cta(`${APP_URL}/dashboard`, 'Add my first account →')}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">— Julien, founder of Everstead</p>
  `, userId)
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 2 — Day 4: Trusted contacts
// ─────────────────────────────────────────────────────────────────────────────
function email2Html(name, _plan, userId) {
  const first = name?.split(' ')[0] || 'there'
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      Who would handle things if you couldn't?
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      Hi ${first}. One of the most important things you can do in Everstead is name the people who should have access to your plan — your spouse, a sibling, a solicitor, or a close friend.
    </p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      These are your <strong>trusted contacts</strong>. They only get access when you grant it — but when the time comes, they'll know exactly where everything is and what to do.
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
      It takes 60 seconds and makes an enormous difference.
    </p>
    ${cta(`${APP_URL}/dashboard`, 'Add a trusted contact →')}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">— Julien, founder of Everstead</p>
  `, userId)
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 3 — Day 7: Document vault
// ─────────────────────────────────────────────────────────────────────────────
function email3Html(name, _plan, userId) {
  const first = name?.split(' ')[0] || 'there'
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      Your documents deserve a safer home.
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      Hi ${first}. Think about where your will is right now. Your passport. Your pension statements. Your life insurance policy. Could your family find them quickly if they needed to?
    </p>
    <p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.7;">
      Everstead's encrypted vault keeps them in one place — organised, accessible, and private. Here's what's worth uploading first:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;width:100%;">
      ${tip('📜', '<strong>Your will</strong> — or a note about where the original is stored')}
      ${tip('🪪', '<strong>Passport & ID</strong> — the numbers matter as much as the documents')}
      ${tip('📄', '<strong>Pension & insurance</strong> — policy numbers, provider contacts')}
      ${tip('🏡', '<strong>Property deeds</strong> — especially if you own without a mortgage')}
    </table>
    ${cta(`${APP_URL}/dashboard`, 'Upload my first document →')}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">— Julien, founder of Everstead</p>
  `, userId)
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 4 — Day 10: Instructions feature
// ─────────────────────────────────────────────────────────────────────────────
function email4Html(name, _plan, userId) {
  const first = name?.split(' ')[0] || 'there'
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      The one thing most people forget.
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      Hi ${first}. Accounts and documents are essential — but there's something just as important that almost everyone overlooks: <strong>instructions</strong>.
    </p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      What should your family do first? Who should they call? Where is the spare key? What are your funeral wishes? What happens to the dog?
    </p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      In Everstead you can write step-by-step instructions your trusted contacts will see the moment they need them. It sounds morbid — but families who have it say it's one of the most generous things you can leave behind.
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
      It doesn't need to be perfect. Just start.
    </p>
    ${cta(`${APP_URL}/dashboard`, 'Write my first instruction →')}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">— Julien, founder of Everstead</p>
  `, userId)
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 5 — Day 13: Personal check-in from Julien (data-driven)
// ─────────────────────────────────────────────────────────────────────────────
function email5Html(name, plan, accountCount = 0, documentCount = 0, contactCount = 0, userId) {
  const first    = name?.split(' ')[0] || 'there'
  const planName = planLabel(plan)

  // Build a personalised data summary
  const dataSummary = `You've added ${accountCount} financial ${accountCount === 1 ? 'account' : 'accounts'}, ${documentCount} ${documentCount === 1 ? 'document' : 'documents'}, and named ${contactCount} trusted ${contactCount === 1 ? 'contact' : 'contacts'}.`

  // Identify gaps to surface
  const gaps = []
  if (accountCount === 0) gaps.push("You haven't added any financial accounts yet — it only takes 2 minutes.")
  if (documentCount === 0) gaps.push('Your document vault is empty — uploading your will or pension statement is a great first step.')
  if (contactCount === 0) gaps.push("You haven't named a trusted contact yet — this is the person who'd act on your behalf if needed.")

  const gapsHtml = gaps.length > 0
    ? `<table cellpadding="0" cellspacing="0" style="margin:16px 0 24px;width:100%;background:#fdf8f0;border-radius:10px;padding:8px;">
        ${gaps.map(g => `<tr><td style="padding:10px 14px;vertical-align:top;font-size:18px;line-height:1;">💡</td><td style="padding:10px 0;color:#92400e;font-size:14px;line-height:1.6;">${g}</td></tr>`).join('')}
      </table>`
    : `<p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.7;">
        Your plan is shaping up well — keep it up.
      </p>`

  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      A quick note from me.
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      Hi ${first}, it's Julien — I started Everstead after watching my own family struggle to piece together a loved one's affairs under enormous stress. I built it so no one else would have to go through that.
    </p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      You've had two weeks with your <strong>${planName}</strong> plan. Here's where things stand:
    </p>
    <p style="margin:0 0 8px;color:#0d1628;font-size:15px;line-height:1.7;background:#f9f8f6;border-radius:8px;padding:14px 18px;">
      ${dataSummary}
    </p>
    ${gapsHtml}
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      If you got stuck on anything, or there's something I can help you set up — just hit reply. I read every message.
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
      And if your trial is ending soon — everything you've built is still here, ready to go.
    </p>
    ${cta(`${APP_URL}/dashboard`, 'Go to my vault →')}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">— Julien, founder of Everstead</p>
  `, userId)
}

// ─────────────────────────────────────────────────────────────────────────────
//  State-aware helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the user's current progress across the four key dimensions.
 * Returns counts AND a total so callers can branch on "zero progress".
 */
async function getUserProgress(userId) {
  const [accountsRes, documentsRes, contactsRes, instructionsRes] = await Promise.all([
    supabase.from('accounts')      .select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('documents')     .select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('trusted_people').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('instructions')  .select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  const accounts     = accountsRes.count     ?? 0
  const documents    = documentsRes.count    ?? 0
  const contacts     = contactsRes.count     ?? 0
  const instructions = instructionsRes.count ?? 0
  return {
    accounts,
    documents,
    contacts,
    instructions,
    total: accounts + documents + contacts + instructions,
  }
}

/**
 * Skip rules per step. Returns a string reason (for logging) or null if we
 * should send. The stamp-as-sent happens at the caller so the cron doesn't
 * keep retrying tomorrow.
 *
 * Email 5 is always sent (it's the personalised check-in regardless of state).
 * Recovery branch on email 3 is handled at the caller, not here.
 */
function shouldSkipForProgress(stepN, progress) {
  if (stepN === 1 && progress.accounts > 0)     return 'accounts already added'
  if (stepN === 2 && progress.contacts > 0)     return 'trusted contact already added'
  if (stepN === 3 && progress.documents > 0)    return 'document already uploaded'
  if (stepN === 4 && progress.instructions > 0) return 'instruction already written'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
//  Recovery email — sent at D7 if the user has done literally nothing
// ─────────────────────────────────────────────────────────────────────────────
function recoveryHtml(name, userId) {
  const first = name?.split(' ')[0] || 'there'
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      Is something getting in the way?
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      Hi ${first}, it's Julien — I'm writing personally because I noticed you signed up a week ago and haven't added anything to your vault yet. That's pretty common, and usually for one of three reasons:
    </p>
    <p style="margin:0 0 14px;color:#4a5568;font-size:16px;line-height:1.7;">
      <strong>1. You're not sure where to start.</strong> Honestly, the easiest first step is adding one account — a current account, a savings account, your work pension. It takes about 90 seconds and the rest gets easier from there.
    </p>
    <p style="margin:0 0 14px;color:#4a5568;font-size:16px;line-height:1.7;">
      <strong>2. The timing isn't right.</strong> You meant to come back to it. Life got busy. That's OK — your account is here whenever you're ready, and your trial doesn't start counting against you until you actually use the platform.
    </p>
    <p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.7;">
      <strong>3. Something's broken or confusing.</strong> If anything didn't work the way you expected — sign-in, navigation, finding where to add things — please just reply and tell me. I'll either fix it or walk you through it.
    </p>
    <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.7;">
      Hit reply if you want a hand. Otherwise, the simplest possible next step is below.
    </p>
    ${cta(`${APP_URL}/dashboard`, 'Add one account in 90 seconds →')}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">— Julien, founder of Everstead</p>
  `, userId)
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
