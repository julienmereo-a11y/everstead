import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

export const config = { api: { bodyParser: false } }

async function buffer(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  let event

  try {
    const buf = await buffer(req)
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // ── checkout.session.completed ────────────────────────────
  // Fires immediately when user completes checkout — even if on trial.
  // Sets stripe IDs, subscription_status, and trial_ends_at from Stripe.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const customerId     = session.customer
    const customerEmail  = session.customer_details?.email
    const subscriptionId = session.subscription

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId      = subscription.items.data[0]?.price?.id
    const isTrialing   = subscription.status === 'trialing'

    // trial_ends_at comes from Stripe — the authoritative source
    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null

    // plan + billing_cycle + referred_by are embedded as metadata at checkout creation
    const metaPlan         = subscription.metadata?.plan          || null
    const metaBillingCycle = subscription.metadata?.billing_cycle || null
    const metaReferredBy   = subscription.metadata?.referred_by   || null

    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    const profileUpdate = {
      stripe_customer_id:     customerId,
      subscription_status:    isTrialing ? 'trialing' : 'active',
      stripe_subscription_id: subscriptionId,
      stripe_price_id:        priceId,
      trial_ends_at:          trialEndsAt,
      current_period_end:     currentPeriodEnd,
    }
    if (metaPlan)         profileUpdate.plan          = metaPlan
    if (metaBillingCycle) profileUpdate.billing_cycle = metaBillingCycle
    if (metaReferredBy)   profileUpdate.referred_by   = metaReferredBy

    const { data: profiles } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('email', customerEmail)
      .select('id, full_name, email, plan')

    if (profiles?.[0]) {
      const p = profiles[0]
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: isTrialing
          ? 'Your Everstead trial has started — card saved'
          : 'Your Everstead subscription is confirmed',
        html: paymentConfirmedHtml(p.full_name, p.plan, isTrialing, subscription.trial_end ?? subscription.current_period_end,
          subscription.trial_end && subscription.created ? Math.round((subscription.trial_end - subscription.created) / 86400) : 14),
      }).catch(console.error)

      // ── Referral conversion notification ─────────────────
      if (metaReferredBy) {
        const { data: referrers } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('referral_code', metaReferredBy)
          .limit(1)
        if (referrers?.[0]?.email) {
          await resend.emails.send({
            from:    'Everstead <hello@everstead.care>',
            to:      referrers[0].email,
            subject: 'Your referral just joined Everstead 🎉',
            html:    referralConversionHtml(referrers[0].full_name, p.full_name || p.email),
          }).catch(console.error)
        }
      }

      // ── Owner notification ────────────────────────────────
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      'julien@everstead.care',
        subject: `💳 Card captured — ${p.full_name || p.email} (${metaPlan || p.plan || 'unknown'})`,
        html:    ownerNewSignupHtml({
          name:         p.full_name,
          email:        p.email,
          plan:         metaPlan || p.plan,
          billingCycle: metaBillingCycle,
          isTrialing,
          trialEnd:     subscription.trial_end,
          referredBy:   metaReferredBy,
          customerId,
          subscriptionId,
        }),
      }).catch(console.error)
    }
  }

  // ── customer.subscription.created ────────────────────────
  // Fires immediately when the inline-checkout flow creates the subscription.
  // Syncs plan/billing/trial data to the profile using user_id from metadata.
  // Also sends the owner notification — this is the most reliable hook for it
  // because the subscription object is already fully formed here.
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object
    const priceId          = subscription.items.data[0]?.price?.id
    const metaPlan         = subscription.metadata?.plan          || null
    const metaBillingCycle = subscription.metadata?.billing_cycle || null
    const metaReferredBy   = subscription.metadata?.referred_by   || null
    const metaUserId       = subscription.metadata?.user_id       || null
    const isTrialing       = subscription.status === 'trialing'

    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    const profileUpdate = {
      stripe_customer_id:     subscription.customer,
      stripe_subscription_id: subscription.id,
      stripe_price_id:        priceId,
      subscription_status:    isTrialing ? 'trialing' : subscription.status,
      trial_ends_at:          trialEndsAt,
      current_period_end:     currentPeriodEnd,
    }
    if (metaPlan)         profileUpdate.plan          = metaPlan
    if (metaBillingCycle) profileUpdate.billing_cycle = metaBillingCycle
    if (metaReferredBy)   profileUpdate.referred_by   = metaReferredBy

    // Prefer user_id from metadata (avoids race condition where stripe_customer_id
    // hasn't been written to profiles yet when the webhook arrives)
    let updatedProfile = null
    if (metaUserId) {
      const { data } = await supabase.from('profiles').update(profileUpdate).eq('id', metaUserId).select('id, full_name, email, plan, billing_cycle').single()
      updatedProfile = data
    } else {
      const { data } = await supabase.from('profiles').update(profileUpdate).eq('stripe_customer_id', subscription.customer).select('id, full_name, email, plan, billing_cycle').single()
      updatedProfile = data
    }

    // Owner notification — fired here (not in setup_intent.succeeded) so it
    // always has a fully-formed subscription object and no race conditions.
    if (updatedProfile) {
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      'julien@everstead.care',
        subject: `💳 New subscriber — ${updatedProfile.full_name || updatedProfile.email} (${metaPlan || updatedProfile.plan || 'unknown'})`,
        html:    ownerNewSignupHtml({
          name:           updatedProfile.full_name,
          email:          updatedProfile.email,
          plan:           metaPlan || updatedProfile.plan,
          billingCycle:   metaBillingCycle || updatedProfile.billing_cycle,
          isTrialing,
          trialEnd:       subscription.trial_end,
          referredBy:     metaReferredBy,
          customerId:     subscription.customer,
          subscriptionId: subscription.id,
        }),
      }).catch(err => console.error('owner notification error:', err.message))
    }
  }

  // ── setup_intent.succeeded ────────────────────────────────
  // Fires when the user confirms their card in the inline checkout.
  // Sends the welcome/confirmation email to the user.
  // Owner notification is handled in customer.subscription.created instead
  // to avoid the race condition where stripe_subscription_id may not be in
  // the profile yet when this event fires.
  if (event.type === 'setup_intent.succeeded') {
    const setupIntent = event.data.object

    // Only handle setup intents linked to a customer (subscription flow)
    if (!setupIntent.customer) return res.status(200).json({ received: true })

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, plan, billing_cycle, stripe_subscription_id')
      .eq('stripe_customer_id', setupIntent.customer)

    if (profiles?.[0]) {
      const p = profiles[0]

      let subscription = null
      if (p.stripe_subscription_id) {
        try { subscription = await stripe.subscriptions.retrieve(p.stripe_subscription_id) } catch {}
      }
      const isTrialing = subscription?.status === 'trialing'
      const periodEnd  = subscription?.trial_end || subscription?.current_period_end

      // Welcome / payment confirmation email to user
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: isTrialing
          ? 'Your Everstead trial has started — card saved'
          : 'Your Everstead subscription is confirmed',
        html: paymentConfirmedHtml(
          p.full_name, p.plan, isTrialing, periodEnd,
          subscription?.trial_end && subscription?.created
            ? Math.round((subscription.trial_end - subscription.created) / 86400)
            : 14
        ),
      }).catch(err => console.error('welcome email error:', err.message))
    }
  }

  // ── customer.subscription.deleted ────────────────────────
  // Fires at period end when cancel_at_period_end subscription expires.
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const { data: deletedProfiles } = await supabase
      .from('profiles')
      .update({ subscription_status: 'cancelled', plan: null, current_period_end: null, cancel_at: null })
      .eq('stripe_customer_id', subscription.customer)
      .select('id, full_name, email, plan')

    // Send winback email to the cancelled user
    if (deletedProfiles?.[0]?.email) {
      const p = deletedProfiles[0]
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: 'Your Everstead data is safe — come back any time',
        html:    cancellationWinbackHtml(p.full_name),
      }).catch(console.error)
    }

    // Cascade subscription status to secondary family member
    if (deletedProfiles?.[0]?.id) {
      const primaryUserId = deletedProfiles[0].id
      const { data: membership } = await supabase
        .from('family_memberships')
        .select('secondary_user_id')
        .eq('primary_user_id', primaryUserId)
        .eq('invite_status', 'accepted')
        .maybeSingle()

      if (membership?.secondary_user_id) {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled', plan: null })
          .eq('id', membership.secondary_user_id)
      }
    }
  }

  // ── customer.subscription.updated ────────────────────────
  // Fires when trial converts to active, billing cycle changes,
  // cancel_at_period_end is set (cancellation scheduled), or
  // user changes plan/cycle via the Stripe Customer Portal.
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    const priceId = subscription.items.data[0]?.price?.id

    // Reverse-map price ID → plan + billing_cycle so portal changes stay in sync
    const PRICE_TO_PLAN = {
      [process.env.VITE_STRIPE_ESSENTIAL_MONTHLY]: { plan: 'essential', billing_cycle: 'monthly' },
      [process.env.VITE_STRIPE_ESSENTIAL_YEARLY]:  { plan: 'essential', billing_cycle: 'yearly'  },
      [process.env.VITE_STRIPE_FAMILY_MONTHLY]:    { plan: 'family',    billing_cycle: 'monthly' },
      [process.env.VITE_STRIPE_FAMILY_YEARLY]:     { plan: 'family',    billing_cycle: 'yearly'  },
      [process.env.VITE_STRIPE_ADVISOR_MONTHLY]:   { plan: 'advisor',   billing_cycle: 'monthly' },
      [process.env.VITE_STRIPE_ADVISOR_YEARLY]:    { plan: 'advisor',   billing_cycle: 'yearly'  },
    }
    const planInfo = PRICE_TO_PLAN[priceId] || {}

    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    const profileUpdate = {
      subscription_status: subscription.cancel_at_period_end ? 'cancelling' : subscription.status,
      current_period_end:  currentPeriodEnd,
      stripe_price_id:     priceId,
      ...planInfo,
    }

    if (subscription.cancel_at_period_end && subscription.cancel_at) {
      profileUpdate.cancel_at = new Date(subscription.cancel_at * 1000).toISOString()
    } else if (!subscription.cancel_at_period_end) {
      profileUpdate.cancel_at = null
    }

    // Detect plan upgrade before applying update
    const prevPriceId = event.data.previous_attributes?.items?.data?.[0]?.price?.id
    const prevPlan    = PRICE_TO_PLAN[prevPriceId]?.plan

    const { data: updatedProfiles } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('stripe_customer_id', subscription.customer)
      .select('id, full_name, email, plan, subscription_status')

    // Post-upgrade celebratory email (essential → family)
    if (
      prevPlan === 'essential' &&
      planInfo.plan === 'family' &&
      updatedProfiles?.[0]?.email
    ) {
      const p = updatedProfiles[0]
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: 'Welcome to Family — your second vault is ready',
        html:    upgradeConfirmedHtml(p.full_name),
      }).catch(console.error)
    }

    // Cascade subscription status to secondary family member
    if (updatedProfiles?.[0]?.id) {
      const primaryUserId = updatedProfiles[0].id
      const newStatus     = updatedProfiles[0].subscription_status
      const newPlan       = updatedProfiles[0].plan

      const { data: membership } = await supabase
        .from('family_memberships')
        .select('secondary_user_id')
        .eq('primary_user_id', primaryUserId)
        .eq('invite_status', 'accepted')
        .maybeSingle()

      if (membership?.secondary_user_id) {
        await supabase
          .from('profiles')
          .update({ subscription_status: newStatus, plan: newPlan })
          .eq('id', membership.secondary_user_id)
      }
    }
  }

  // ── customer.subscription.trial_will_end ─────────────────
  // Fires 3 days before the trial ends — send a reminder email.
  if (event.type === 'customer.subscription.trial_will_end') {
    const subscription = event.data.object

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, plan')
      .eq('stripe_subscription_id', subscription.id)

    if (profiles?.[0]) {
      const p = profiles[0]
      const trialEndDate = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
        : null

      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: 'Your Everstead trial ends in 3 days',
        html:    trialEndingReminderHtml(p.full_name, p.plan, trialEndDate),
      }).catch(console.error)
    }
  }

  // ── invoice.payment_failed ────────────────────────────────
  // Fires when Stripe cannot charge the card — at trial end or renewal.
  // Mark the profile so the user is shown the payment-failed screen.
  // Guard: do NOT overwrite pending_deletion — Stripe sometimes fires a final
  // failed-payment event after the subscription is cancelled on account deletion.
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object

    const { data: existing } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('stripe_customer_id', invoice.customer)
      .single()

    if (existing?.subscription_status === 'pending_deletion') {
      return res.status(200).json({ received: true })
    }

    await supabase
      .from('profiles')
      .update({ subscription_status: 'trial_expired' })
      .eq('stripe_customer_id', invoice.customer)

    // Fetch profile to send a notification email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, plan')
      .eq('stripe_customer_id', invoice.customer)

    if (profiles?.[0]) {
      const p = profiles[0]
      await resend.emails.send({
        from:    'Everstead <hello@everstead.care>',
        to:      p.email,
        subject: 'Action required — payment failed for Everstead',
        html:    paymentFailedHtml(p.full_name, p.plan),
      }).catch(console.error)
    }
  }

  res.status(200).json({ received: true })
}

// ─────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────

function paymentConfirmedHtml(name, plan, isTrialing, periodEnd, trialDays = 14) {
  const chargeDate = periodEnd
    ? new Date(periodEnd * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const bodyText = isTrialing
    ? `Your card has been saved for your <strong>${plan || 'Essential'}</strong> plan. Your ${trialDays}-day free trial is now active — you won't be charged until it ends${chargeDate ? ` on <strong>${chargeDate}</strong>` : ''}.`
    : `Your <strong>${plan || 'Essential'}</strong> plan is now active. Your payment was confirmed and your subscription starts today.`

  return emailShell(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${isTrialing ? `Trial started, ${name || 'there'}` : `Subscription confirmed, ${name || 'there'}`}
    </h1>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">${bodyText}</p>
    <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to dashboard →</a>
  `)
}

function trialEndingReminderHtml(name, plan, endDate) {
  return emailShell(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Your trial ends in 3 days, ${name || 'there'}</h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
      Your 14-day free trial on the <strong>${plan || 'Essential'}</strong> plan ends${endDate ? ` on <strong>${endDate}</strong>` : ' soon'}.
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">
      Your card on file will be charged automatically when the trial ends. No action is needed — just continue using Everstead.
      If you'd like to cancel before being charged, you can do so from your account settings.
    </p>
    <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to dashboard →</a>
  `)
}

function paymentFailedHtml(name, plan) {
  return emailShell(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">Payment failed, ${name || 'there'}</h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.6;">
      We were unable to charge the card on file for your <strong>${plan || 'Essential'}</strong> plan.
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.6;">
      Please update your payment method to keep your plan active. Your data is safe and will remain for 30 days.
    </p>
    <a href="${process.env.VITE_APP_URL}/dashboard" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Update payment method →</a>
  `)
}

function emailShell(body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">${body}</td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">Questions? <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ownerNewSignupHtml({ name, email, plan, billingCycle, isTrialing, trialEnd, referredBy, customerId, subscriptionId }) {
  const signedUpAt = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
  const trialEndDate = trialEnd
    ? new Date(trialEnd * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const row = (label, value) => value
    ? `<tr>
        <td style="padding:10px 0;color:#6b7280;font-size:14px;border-bottom:1px solid #f0ede8;width:160px;">${label}</td>
        <td style="padding:10px 0;color:#0d1628;font-size:14px;border-bottom:1px solid #f0ede8;font-weight:500;">${value}</td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="140" style="display:block;height:auto;" />
        </td></tr>
        <tr><td style="padding:36px 40px 28px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#4c7d47;">New signup</p>
          <h1 style="margin:0 0 24px;color:#0d1628;font-size:22px;font-weight:normal;">
            ${name || email} just joined Everstead
          </h1>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Name', name || '—')}
            ${row('Email', `<a href="mailto:${email}" style="color:#4c7d47;">${email}</a>`)}
            ${row('Plan', plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '—')}
            ${row('Billing', billingCycle ? billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1) : '—')}
            ${row('Type', isTrialing ? '14-day trial' : 'Paid immediately')}
            ${trialEndDate ? row('Trial ends', trialEndDate) : ''}
            ${referredBy ? row('Referred by', referredBy) : ''}
            ${row('Signed up', signedUpAt)}
            ${row('Stripe customer', `<a href="https://dashboard.stripe.com/customers/${customerId}" style="color:#4c7d47;font-size:12px;">${customerId}</a>`)}
            ${row('Subscription', `<a href="https://dashboard.stripe.com/subscriptions/${subscriptionId}" style="color:#4c7d47;font-size:12px;">${subscriptionId}</a>`)}
          </table>
          <div style="margin-top:28px;">
            <a href="${process.env.VITE_APP_URL}/admin" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">View in admin panel →</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Everstead · automated owner notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function upgradeConfirmedHtml(name) {
  const first = name?.split(' ')[0] || 'there'
  const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'
  return emailShell(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      Welcome to Family, ${first}.
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      Your plan has been upgraded to <strong>Everstead Family</strong>. Here's what's now unlocked:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;width:100%;background:#f9f8f6;border-radius:10px;padding:8px;">
      <tr>
        <td style="padding:10px 14px;vertical-align:top;font-size:18px;line-height:1;">👫</td>
        <td style="padding:10px 0;color:#1a202c;font-size:14px;line-height:1.6;"><strong>Two private vaults</strong> — invite your partner or family member to their own secure vault under the same subscription</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;vertical-align:top;font-size:18px;line-height:1;">👥</td>
        <td style="padding:10px 0;color:#1a202c;font-size:14px;line-height:1.6;"><strong>Up to 10 trusted contacts</strong> — more people who can access your plan when it matters</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;vertical-align:top;font-size:18px;line-height:1;">💬</td>
        <td style="padding:10px 0;color:#1a202c;font-size:14px;line-height:1.6;"><strong>Personal messages</strong> — write messages to the people you love, delivered when the time comes</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;vertical-align:top;font-size:18px;line-height:1;">📦</td>
        <td style="padding:10px 0;color:#1a202c;font-size:14px;line-height:1.6;"><strong>25 GB storage</strong> — plenty of space for documents, photos, and everything important</td>
      </tr>
    </table>
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">Go to my vault →</a>
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">— Julien, founder of Everstead</p>
  `)
}

function referralConversionHtml(referrerName, newMemberName) {
  const first = referrerName?.split(' ')[0] || 'there'
  const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'
  return emailShell(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      Your referral just joined, ${first}. 🎉
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      <strong>${newMemberName}</strong> just signed up to Everstead using your referral link. Thank you for sharing — it genuinely means a lot.
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
      If you haven't already claimed your referral reward, you can find it in your dashboard under Settings.
    </p>
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;">View my dashboard →</a>
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">— Julien, founder of Everstead</p>
  `)
}

function cancellationWinbackHtml(name) {
  const firstName = name?.split(' ')[0] || 'there'
  const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#0d1628;padding:28px 40px;text-align:center;">
          <img src="https://www.everstead.care/logo-v2-white.png" alt="Everstead" width="160" style="display:block;margin:0 auto;height:auto;max-width:160px;" />
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
            ${firstName}, your data is safe.
          </h1>
          <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
            Your Everstead subscription has ended — but everything you've built is still here. Your accounts, documents, instructions, and wishes will be safely stored for <strong>30 days</strong>.
          </p>
          <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
            After 30 days, your data will be permanently deleted in line with our privacy policy.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f6;border:1px solid #e8e5e0;border-radius:10px;overflow:hidden;margin-bottom:32px;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e8e5e0;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">What you'll lose access to</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <ul style="margin:0;padding:0 0 0 18px;color:#4a5568;font-size:14px;line-height:1.8;">
                <li>Your account and document vault</li>
                <li>Trusted contact access and permissions</li>
                <li>Step-by-step instructions</li>
                <li>Personal messages and final wishes</li>
                <li>Readiness score and review reminders</li>
              </ul>
            </td></tr>
          </table>

          <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.7;">
            If you'd like to come back, it takes 30 seconds — your trial has ended but you can restart on any plan.
          </p>
          <a href="${APP_URL}/get-started"
             style="display:inline-block;background:#0d1628;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;margin-bottom:32px;">
            Restart my account →
          </a>
          <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
            — Julien, founder of Everstead
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e8e5e0;">
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
            Questions? Reply to this email or write to <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
