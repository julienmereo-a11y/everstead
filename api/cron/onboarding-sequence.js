import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { withSentry, captureException } from '../lib/sentry.js'
import { planLabel } from '../_lib/plan-label.js'
import { translator, pickLang } from '../_lib/email-i18n.js'

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
//
// Subjects live in COPY (below) so they follow profiles.language like the body.
// ─────────────────────────────────────────────────────────────────────────────
const SEQUENCE = [
  {
    // Day 1: a personal welcome from Julien himself. Unlike the rest of the
    // sequence it is plain text on white (no logo banner, no button) and is
    // sent FROM julien@ so a reply lands in the founder's own inbox.
    n:          0,
    field:      'onboarding_email_0_sent_at',
    afterDays:  1,
    subjectKey: 'email0Subject',
    html:       email0Html,
    from:       (lang) => pickLang(lang) === 'fr'
      ? "Julien d'Everstead <julien@everstead.care>"
      : 'Julien from Everstead <julien@everstead.care>',
  },
  {
    n:          1,
    field:      'onboarding_email_1_sent_at',
    afterDays:  2,
    subjectKey: 'email1Subject',
    html:       email1Html,
  },
  {
    n:          2,
    field:      'onboarding_email_2_sent_at',
    afterDays:  4,
    subjectKey: 'email2Subject',
    html:       email2Html,
  },
  {
    n:          3,
    field:      'onboarding_email_3_sent_at',
    afterDays:  7,
    subjectKey: 'email3Subject',
    html:       email3Html,
  },
  {
    n:          4,
    field:      'onboarding_email_4_sent_at',
    afterDays:  10,
    subjectKey: 'email4Subject',
    html:       email4Html,
  },
  {
    n:          5,
    field:      'onboarding_email_5_sent_at',
    afterDays:  13,
    subjectKey: 'email5Subject',
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
  // At most ONE sequence email per member per run. The cron is daily, so a
  // member whose earlier steps are overdue catches up a day at a time rather
  // than getting several emails in one morning.
  const emailedThisRun = new Set()

  for (const step of SEQUENCE) {
    // Anchor to trial start (trial_ends_at - 14 days), falling back to created_at.
    // This prevents emails firing too early/late for users who delayed checkout.
    // We fetch all candidates and filter in JS so we can use trial_ends_at per-user.
    const earliestCutoff = new Date(now.getTime() - step.afterDays * 86_400_000).toISOString()

    // Eligible: paying/trialing, this email not yet sent
    // Paid members (subscription) AND free members. The old filter required a
    // stripe_subscription_id, which free members never have by design, so from
    // the freemium switch until 2026-08-27 every free signup received none of
    // these emails: the exact population that churns on day one. Advisers are
    // B2B and never belonged in a consumer drip.
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`id, full_name, email, plan, language, created_at, trial_ends_at`)
      .or('stripe_subscription_id.not.is.null,plan.eq.free')
      .neq('plan', 'advisor')
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
      if (emailedThisRun.has(user.id)) continue // one per member per run

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
        // Subject and body both follow the recipient's own profiles.language.
        const t = translator(COPY, user.language)
        let html, subject
        if (step.n === 3 && progress.total === 0) {
          // Recovery branch: D7 with zero progress → re-engagement
          subject = t('recoverySubject')
          html = recoveryHtml(user.full_name, user.id, user.language, user.plan)
        } else if (step.n === 5) {
          // Personalised day-13 check-in
          html = step.html(user.full_name, user.plan, progress.accounts, progress.documents, progress.contacts, user.id, user.language)
          subject = t(step.subjectKey)
        } else {
          html = step.html(user.full_name, user.plan, user.id, user.language)
          subject = t(step.subjectKey)
        }

        emailedThisRun.add(user.id)
        await resend.emails.send({
          from:    step.from ? step.from(user.language) : 'Everstead <hello@everstead.care>',
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
// COPY
// Every customer-facing string in this cron, per language. The HTML chrome is
// shared; only these strings change with the recipient's profiles.language.
// Nothing here is ever addressed to the founder, so the whole file localises.
// ─────────────────────────────────────────────────────────────────────────────
const COPY = {
  en: {
    // Shared chrome
    signature:        ': Julien, founder of Everstead',
    footerQuestions:  'Questions? Reply to this email or write to',
    footerUnsubscribe:'Unsubscribe',
    fallbackName:     'there',
    fallbackNameLead: 'there',

    // Email 0, Day 1: personal welcome from Julien
    email0Subject: 'A personal welcome to Everstead',
    email0P1: "Hi {{name}},",
    email0P2: "It's Julien, the founder of Everstead. I wanted to write to you myself, a day in, just to say welcome, and thank you for trusting us with something this personal.",
    email0P3: "I started Everstead after my grandmother died. We found a small notebook in a drawer with everything we needed to know: her accounts, her passwords, the people to call. That notebook was an act of love, and Everstead is my attempt to give every family the same, kept safe.",
    email0P4: "There's no rush and no right pace. Add one thing when you have a quiet moment, and it will already be more than most families have.",
    email0P5: "If anything is unclear, or if you simply want to tell me what brought you here, reply to this email. It comes straight to me, and I read every message.",
    email0P6: "I truly hope Everstead helps you, and the people you love.",
    email0SignName: 'Julien',
    email0SignRole: 'Founder, Everstead',

    // Email 1, Day 2: add your first account
    email1Subject: 'Start here: add your first financial account',
    email1H1:      "{{name}}, let's start with what you own.",
    email1P1:      "The foundation of any good estate plan is a clear picture of your finances, bank accounts, investments, pensions, property. It's what your family would need to find in an emergency.",
    email1P2:      "In Everstead you can add all of them in a few minutes. Here's what to include:",
    email1Tip1:    '<strong>Bank accounts</strong>, current accounts, savings, ISAs',
    email1Tip2:    '<strong>Investments & pensions</strong>, workplace pensions, SIPPs, stocks & shares',
    email1Tip3:    '<strong>Property</strong>, your home, buy-to-lets, land',
    email1Tip4:    '<strong>Insurance policies</strong>, life, critical illness, income protection',
    email1Cta:     'Add my first account →',

    // Email 2, Day 4: trusted contacts
    email2Subject: "Who would handle things if you couldn't?",
    email2H1:      "Who would handle things if you couldn't?",
    email2P1:      'Hi {{name}}. One of the most important things you can do in Everstead is name the people who should have access to your plan, your spouse, a sibling, a solicitor, or a close friend.',
    email2P2:      "These are your <strong>trusted contacts</strong>. They only get access when you grant it, but when the time comes, they'll know exactly where everything is and what to do.",
    email2P3:      'It takes 60 seconds and makes an enormous difference.',
    email2Cta:     'Add a trusted contact →',

    // Email 3, Day 7: document vault
    email3Subject: 'Your will, passport, and pension, stored in one safe place',
    email3H1:      'Your documents deserve a safer home.',
    email3P1:      'Hi {{name}}. Think about where your will is right now. Your passport. Your pension statements. Your life insurance policy. Could your family find them quickly if they needed to?',
    email3P2:      "Everstead's encrypted vault keeps them in one place, organised, accessible, and private. Here's what's worth uploading first:",
    email3Tip1:    '<strong>Your will</strong>, or a note about where the original is stored',
    email3Tip2:    '<strong>Passport & ID</strong>, the numbers matter as much as the documents',
    email3Tip3:    '<strong>Pension & insurance</strong>, policy numbers, provider contacts',
    email3Tip4:    '<strong>Property deeds</strong>, especially if you own without a mortgage',
    email3Cta:     'Upload my first document →',

    // Email 4, Day 10: instructions
    email4Subject: 'The one thing most people forget in their estate plan',
    email4H1:      'The one thing most people forget.',
    email4P1:      "Hi {{name}}. Accounts and documents are essential, but there's something just as important that almost everyone overlooks: <strong>instructions</strong>.",
    email4P2:      'What should your family do first? Who should they call? Where is the spare key? What are your funeral wishes? What happens to the dog?',
    email4P3:      "In Everstead you can write step-by-step instructions your trusted contacts will see the moment they need them. It sounds morbid, but families who have it say it's one of the most generous things you can leave behind.",
    email4P4:      "It doesn't need to be perfect. Just start.",
    email4Cta:     'Write my first instruction →',

    // Email 5, Day 13: personal check-in
    email5Subject:      'A quick check-in from Julien',
    email5H1:           'A quick note from me.',
    email5P1:           "Hi {{name}}, it's Julien: I started Everstead after watching my own family struggle to piece together a loved one's affairs under enormous stress. I built it so no one else would have to go through that.",
    email5P2:           "You've had two weeks with your <strong>{{plan}}</strong> plan. Here's where things stand:",
    email5Summary:      "You've added {{accounts}}, {{documents}}, and named {{contacts}}.",
    email5GapAccounts:  "You haven't added any financial accounts yet, it only takes 2 minutes.",
    email5GapDocuments: 'Your document vault is empty, uploading your will or pension statement is a great first step.',
    email5GapContacts:  "You haven't named a trusted contact yet, this is the person who'd act on your behalf if needed.",
    email5NoGaps:       'Your plan is shaping up well, keep it up.',
    email5P3:           "If you got stuck on anything, or there's something I can help you set up, just hit reply. I read every message.",
    email5P4:           "And if your trial is ending soon, everything you've built is still here, ready to go.",
    email5P4Free:       "And remember, your free plan does not expire. Everything you add is yours to keep.",
    email5Cta:          'Go to my vault →',

    // Counts used by email 5
    countAccountsOne:  '{{n}} financial account',
    countAccountsMany: '{{n}} financial accounts',
    countDocumentsOne: '{{n}} document',
    countDocumentsMany:'{{n}} documents',
    countContactsOne:  '{{n}} trusted contact',
    countContactsMany: '{{n}} trusted contacts',

    // Recovery email, D7 with zero progress
    recoverySubject: 'Is something getting in the way?',
    recoveryH1:      'Is something getting in the way?',
    recoveryP1:      "Hi {{name}}, it's Julien: I'm writing personally because I noticed you signed up a week ago and haven't added anything to your vault yet. That's pretty common, and usually for one of three reasons:",
    recoveryP2:      "<strong>1. You're not sure where to start.</strong> Honestly, the easiest first step is adding one account, a current account, a savings account, your work pension. It takes about 90 seconds and the rest gets easier from there.",
    recoveryP3:      "<strong>2. The timing isn't right.</strong> You meant to come back to it. Life got busy. That's OK, your account is here whenever you're ready, and your trial doesn't start counting against you until you actually use the platform.",
    recoveryP3Free:  "<strong>2. The timing isn't right.</strong> You meant to come back to it. Life got busy. That's OK, your account is free and it will be here whenever you're ready.",
    recoveryP4:      "<strong>3. Something's broken or confusing.</strong> If anything didn't work the way you expected (sign-in, navigation, finding where to add things) please just reply and tell me. I'll either fix it or walk you through it.",
    recoveryP5:      'Hit reply if you want a hand. Otherwise, the simplest possible next step is below.',
    recoveryCta:     'Add one account in 90 seconds →',
  },
  fr: {
    // Shared chrome
    signature:        "Julien, fondateur d'Everstead",
    footerQuestions:  'Une question\u00A0? Répondez à ce message ou écrivez à',
    footerUnsubscribe:'Se désabonner',
    fallbackName:     'à vous',
    fallbackNameLead: 'Bonjour',

    // Email 0, Day 1: personal welcome from Julien
    email0Subject: 'Un mot de bienvenue, personnellement',
    email0P1: 'Bonjour {{name}},',
    email0P2: "C'est Julien, le fondateur d'Everstead. Je tenais à vous écrire moi-même, au lendemain de votre inscription, simplement pour vous souhaiter la bienvenue, et vous remercier de nous confier quelque chose d'aussi personnel.",
    email0P3: "J'ai créé Everstead après le décès de ma grand-mère. Nous avons trouvé dans un tiroir un petit carnet avec tout ce qu'il fallait savoir\u00A0: ses comptes, ses mots de passe, les personnes à prévenir. Ce carnet était un acte d'amour, et Everstead est ma façon d'offrir la même chose à chaque famille, en lieu sûr.",
    email0P4: "Il n'y a ni urgence ni bon rythme. Ajoutez une seule chose quand vous aurez un moment calme, et ce sera déjà plus que ce que la plupart des familles ont.",
    email0P5: "Si quoi que ce soit n'est pas clair, ou si vous avez simplement envie de me raconter ce qui vous a amené ici, répondez à ce message. Il arrive directement dans ma boîte, et je lis tout.",
    email0P6: "J'espère sincèrement qu'Everstead vous aidera, vous et ceux que vous aimez.",
    email0SignName: 'Julien',
    email0SignRole: "Fondateur d'Everstead",

    // Email 1, Day 2: add your first account
    email1Subject: 'Commencez ici\u00A0: ajoutez votre premier compte financier',
    email1H1:      '{{name}}, commençons par ce que vous possédez.',
    email1P1:      "La base d'un bon plan de succession, c'est une vision claire de vos finances\u00A0: comptes bancaires, placements, retraite, biens immobiliers. C'est ce que vos proches auraient besoin de retrouver en cas d'urgence.",
    email1P2:      "Dans Everstead, vous pouvez tous les ajouter en quelques minutes. Voici ce qu'il vaut mieux inclure\u00A0:",
    email1Tip1:    '<strong>Comptes bancaires</strong>, comptes courants, livret A, LDDS',
    email1Tip2:    '<strong>Placements et retraite</strong>, PER, assurance vie, PEA, comptes-titres',
    email1Tip3:    '<strong>Biens immobiliers</strong>, votre résidence principale, vos locations, vos terrains',
    email1Tip4:    '<strong>Contrats de prévoyance</strong>, assurance décès, garantie invalidité, maintien de salaire',
    email1Cta:     'Ajouter mon premier compte →',

    // Email 2, Day 4: trusted contacts
    email2Subject: 'Qui prendrait le relais si vous ne pouviez plus\u00A0?',
    email2H1:      'Qui prendrait le relais si vous ne pouviez plus\u00A0?',
    email2P1:      "Bonjour {{name}}. L'une des choses les plus importantes à faire dans Everstead, c'est de désigner les personnes qui doivent avoir accès à votre plan\u00A0: votre conjoint, un frère ou une sœur, votre notaire, ou un proche.",
    email2P2:      "Ce sont vos <strong>personnes de confiance</strong>. Elles n'obtiennent l'accès que lorsque vous le leur donnez, mais le moment venu, elles sauront exactement où se trouve chaque chose et quoi faire.",
    email2P3:      'Cela prend 60 secondes et change tout pour vos proches.',
    email2Cta:     'Ajouter une personne de confiance →',

    // Email 3, Day 7: document vault
    email3Subject: 'Votre testament, votre passeport et vos contrats de retraite, réunis en lieu sûr',
    email3H1:      'Vos documents méritent un endroit plus sûr.',
    email3P1:      "Bonjour {{name}}. Pensez à l'endroit où se trouve votre testament en ce moment. Votre passeport. Vos relevés de retraite. Votre contrat d'assurance vie. Vos proches sauraient-ils les retrouver rapidement en cas de besoin\u00A0?",
    email3P2:      "Le coffre chiffré d'Everstead les réunit au même endroit\u00A0: classés, accessibles et confidentiels. Voici ce qu'il vaut mieux ajouter en premier\u00A0:",
    email3Tip1:    "<strong>Votre testament</strong>, ou une note indiquant où l'original est conservé",
    email3Tip2:    "<strong>Passeport et pièce d'identité</strong>, les numéros comptent autant que les documents",
    email3Tip3:    '<strong>Retraite et assurances</strong>, numéros de contrat, coordonnées des organismes',
    email3Tip4:    '<strong>Actes de propriété</strong>, surtout si votre bien est déjà payé',
    email3Cta:     'Ajouter mon premier document →',

    // Email 4, Day 10: instructions
    email4Subject: 'Ce que presque tout le monde oublie dans son plan de succession',
    email4H1:      'Ce que presque tout le monde oublie.',
    email4P1:      "Bonjour {{name}}. Les comptes et les documents sont essentiels, mais il y a tout aussi important, et presque personne n'y pense\u00A0: les <strong>consignes</strong>.",
    email4P2:      "Que doivent faire vos proches en premier\u00A0? Qui doivent-ils appeler\u00A0? Où se trouve le double des clés\u00A0? Quelles sont vos volontés pour vos obsèques\u00A0? Qui s'occupe du chien\u00A0?",
    email4P3:      "Dans Everstead, vous pouvez écrire des consignes étape par étape que vos personnes de confiance verront au moment où elles en auront besoin. Cela peut sembler morbide, mais les familles qui en disposent disent que c'est l'une des choses les plus généreuses que l'on puisse laisser derrière soi.",
    email4P4:      "Elles n'ont pas besoin d'être parfaites. Commencez, simplement.",
    email4Cta:     'Écrire ma première consigne →',

    // Email 5, Day 13: personal check-in
    email5Subject:      'Un petit mot de Julien',
    email5H1:           'Un mot de ma part.',
    email5P1:           "Bonjour {{name}}, c'est Julien\u00A0: j'ai créé Everstead après avoir vu ma propre famille tenter de reconstituer les affaires d'un proche dans un moment déjà très difficile. Je l'ai construit pour que personne d'autre n'ait à vivre cela.",
    email5P2:           'Vous utilisez votre forfait <strong>{{plan}}</strong> depuis deux semaines. Voici où vous en êtes\u00A0:',
    email5Summary:      'Vous avez ajouté {{accounts}}, {{documents}}, et nommé {{contacts}}.',
    email5GapAccounts:  "Vous n'avez pas encore ajouté de compte financier, cela ne prend que 2 minutes.",
    email5GapDocuments: 'Votre coffre à documents est vide, ajouter votre testament ou un relevé de retraite est un excellent premier pas.',
    email5GapContacts:  "Vous n'avez pas encore nommé de personne de confiance, c'est elle qui agirait en votre nom si besoin.",
    email5NoGaps:       'Votre plan prend forme, continuez comme cela.',
    email5P3:           'Si quelque chose vous a bloqué, ou si je peux vous aider à mettre quoi que ce soit en place, répondez simplement à ce message. Je lis tout.',
    email5P4:           "Et si votre essai touche à sa fin, tout ce que vous avez construit reste ici, prêt à l'emploi.",
    email5P4Free:       "Et rappelez-vous, votre plan gratuit n'expire pas. Tout ce que vous y mettez reste à vous.",
    email5Cta:          'Accéder à mon coffre →',

    // Counts used by email 5
    countAccountsOne:  '{{n}} compte financier',
    countAccountsMany: '{{n}} comptes financiers',
    countDocumentsOne: '{{n}} document',
    countDocumentsMany:'{{n}} documents',
    countContactsOne:  '{{n}} personne de confiance',
    countContactsMany: '{{n}} personnes de confiance',

    // Recovery email, D7 with zero progress
    recoverySubject: 'Quelque chose vous bloque\u00A0?',
    recoveryH1:      'Quelque chose vous bloque\u00A0?',
    recoveryP1:      "Bonjour {{name}}, c'est Julien\u00A0: je vous écris personnellement parce que j'ai remarqué que votre coffre est encore vide, une semaine après votre inscription. C'est très courant, et en général pour l'une de ces trois raisons\u00A0:",
    recoveryP2:      "<strong>1. Vous ne savez pas par où commencer.</strong> Le plus simple, honnêtement, c'est d'ajouter un seul compte\u00A0: un compte courant, un livret, votre retraite d'entreprise. Cela prend environ 90 secondes et tout le reste devient plus facile ensuite.",
    recoveryP3:      "<strong>2. Ce n'est pas le bon moment.</strong> Vous comptiez y revenir. La vie a pris le dessus. Ce n'est pas grave, votre compte vous attend, et votre essai ne joue pas contre vous tant que vous n'utilisez pas vraiment la plateforme.",
    recoveryP3Free:  "<strong>2. Ce n'est pas le bon moment.</strong> Vous comptiez y revenir. La vie a pris le dessus. Ce n'est pas grave, votre compte est gratuit et il vous attendra.",
    recoveryP4:      "<strong>3. Quelque chose ne fonctionne pas ou prête à confusion.</strong> Si quoi que ce soit ne s'est pas passé comme prévu (connexion, navigation, trouver où ajouter les choses), répondez-moi simplement. Soit je le corrige, soit je vous guide.",
    recoveryP5:      "Répondez à ce message si vous voulez un coup de main. Sinon, l'étape la plus simple est juste en dessous.",
    recoveryCta:     'Ajouter un compte en 90 secondes →',
  },
}

/**
 * Count phrase for the recipient's language. French treats 0 as singular
 * ("0 compte financier"), English does not ("0 financial accounts"), so the
 * English branch keeps its exact original wording.
 */
function countPhrase(t, lang, n, oneKey, manyKey) {
  const singular = pickLang(lang) === 'fr' ? n <= 1 : n === 1
  return t(singular ? oneKey : manyKey, { n })
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
function unsubToken(userId) {
  return Buffer.from(userId).toString('base64url')
}

function layout(body, userId, lang) {
  const t = translator(COPY, lang)
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
            ${t('footerQuestions')} <a href="mailto:hello@everstead.care" style="color:#4c7d47;">hello@everstead.care</a>
            · <a href="${unsubUrl}" style="color:#9ca3af;">${t('footerUnsubscribe')}</a>
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
// EMAIL 0 — Day 1: personal welcome, written as Julien
// ─────────────────────────────────────────────────────────────────────────────
// Deliberately NOT the branded layout: no logo banner, no gradient button, no
// tips table. It should read like a short letter someone actually typed. Only
// the legally required unsubscribe survives, as small and quiet as possible.
function email0Html(name, _plan, userId, lang) {
  const t     = translator(COPY, lang)
  const first = name?.split(' ')[0] || t('fallbackNameLead')
  const unsubUrl = userId
    ? `${APP_URL}/api/email/unsubscribe?token=${unsubToken(userId)}`
    : 'mailto:hello@everstead.care?subject=Unsubscribe'
  const para = (text, mb = 16) =>
    `<p style="margin:0 0 ${mb}px;color:#1f2937;font-size:16px;line-height:1.75;">${text}</p>`
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:44px 20px;">
    <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;text-align:left;">
      <tr><td>
        ${para(t('email0P1', { name: first }))}
        ${para(t('email0P2'))}
        ${para(t('email0P3'))}
        ${para(t('email0P4'))}
        ${para(t('email0P5'))}
        ${para(t('email0P6'), 28)}
        <p style="margin:0;color:#1f2937;font-size:16px;line-height:1.6;">${t('email0SignName')}</p>
        <p style="margin:0 0 36px;color:#6b7280;font-size:14px;line-height:1.6;">${t('email0SignRole')}</p>
        <p style="margin:0;color:#c2beb8;font-size:12px;line-height:1.5;">
          <a href="${unsubUrl}" style="color:#c2beb8;">${t('footerUnsubscribe')}</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 1 — Day 2: Add your first account
// ─────────────────────────────────────────────────────────────────────────────
function email1Html(name, _plan, userId, lang) {
  const t     = translator(COPY, lang)
  const first = name?.split(' ')[0] || t('fallbackNameLead')
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${t('email1H1', { name: first })}
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email1P1')}
    </p>
    <p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email1P2')}
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;width:100%;">
      ${tip('🏦', t('email1Tip1'))}
      ${tip('📈', t('email1Tip2'))}
      ${tip('🏠', t('email1Tip3'))}
      ${tip('🛡️', t('email1Tip4'))}
    </table>
    ${cta(`${APP_URL}/dashboard`, t('email1Cta'))}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">${t('signature')}</p>
  `, userId, lang)
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 2 — Day 4: Trusted contacts
// ─────────────────────────────────────────────────────────────────────────────
function email2Html(name, _plan, userId, lang) {
  const t     = translator(COPY, lang)
  const first = name?.split(' ')[0] || t('fallbackName')
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${t('email2H1')}
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email2P1', { name: first })}
    </p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email2P2')}
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email2P3')}
    </p>
    ${cta(`${APP_URL}/dashboard`, t('email2Cta'))}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">${t('signature')}</p>
  `, userId, lang)
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 3 — Day 7: Document vault
// ─────────────────────────────────────────────────────────────────────────────
function email3Html(name, _plan, userId, lang) {
  const t     = translator(COPY, lang)
  const first = name?.split(' ')[0] || t('fallbackName')
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${t('email3H1')}
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email3P1', { name: first })}
    </p>
    <p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email3P2')}
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;width:100%;">
      ${tip('📜', t('email3Tip1'))}
      ${tip('🪪', t('email3Tip2'))}
      ${tip('📄', t('email3Tip3'))}
      ${tip('🏡', t('email3Tip4'))}
    </table>
    ${cta(`${APP_URL}/dashboard`, t('email3Cta'))}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">${t('signature')}</p>
  `, userId, lang)
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 4 — Day 10: Instructions feature
// ─────────────────────────────────────────────────────────────────────────────
function email4Html(name, _plan, userId, lang) {
  const t     = translator(COPY, lang)
  const first = name?.split(' ')[0] || t('fallbackName')
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${t('email4H1')}
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email4P1', { name: first })}
    </p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email4P2')}
    </p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email4P3')}
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email4P4')}
    </p>
    ${cta(`${APP_URL}/dashboard`, t('email4Cta'))}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">${t('signature')}</p>
  `, userId, lang)
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL 5 — Day 13: Personal check-in from Julien (data-driven)
// ─────────────────────────────────────────────────────────────────────────────
function email5Html(name, plan, accountCount = 0, documentCount = 0, contactCount = 0, userId, lang) {
  const isFree = plan === 'free'
  const t        = translator(COPY, lang)
  const first    = name?.split(' ')[0] || t('fallbackName')
  const planName = planLabel(plan)

  // Build a personalised data summary
  const dataSummary = t('email5Summary', {
    accounts:  countPhrase(t, lang, accountCount,  'countAccountsOne',  'countAccountsMany'),
    documents: countPhrase(t, lang, documentCount, 'countDocumentsOne', 'countDocumentsMany'),
    contacts:  countPhrase(t, lang, contactCount,  'countContactsOne',  'countContactsMany'),
  })

  // Identify gaps to surface
  const gaps = []
  if (accountCount === 0) gaps.push(t('email5GapAccounts'))
  if (documentCount === 0) gaps.push(t('email5GapDocuments'))
  if (contactCount === 0) gaps.push(t('email5GapContacts'))

  const gapsHtml = gaps.length > 0
    ? `<table cellpadding="0" cellspacing="0" style="margin:16px 0 24px;width:100%;background:#fdf8f0;border-radius:10px;padding:8px;">
        ${gaps.map(g => `<tr><td style="padding:10px 14px;vertical-align:top;font-size:18px;line-height:1;">💡</td><td style="padding:10px 0;color:#92400e;font-size:14px;line-height:1.6;">${g}</td></tr>`).join('')}
      </table>`
    : `<p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.7;">
        ${t('email5NoGaps')}
      </p>`

  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${t('email5H1')}
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email5P1', { name: first })}
    </p>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email5P2', { plan: planName })}
    </p>
    <p style="margin:0 0 8px;color:#0d1628;font-size:15px;line-height:1.7;background:#f9f8f6;border-radius:8px;padding:14px 18px;">
      ${dataSummary}
    </p>
    ${gapsHtml}
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('email5P3')}
    </p>
    <p style="margin:0 0 32px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${isFree ? t('email5P4Free') : t('email5P4')}
    </p>
    ${cta(`${APP_URL}/dashboard`, t('email5Cta'))}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">${t('signature')}</p>
  `, userId, lang)
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
function recoveryHtml(name, userId, lang, plan) {
  const isFree = plan === 'free'
  const t     = translator(COPY, lang)
  const first = name?.split(' ')[0] || t('fallbackName')
  return layout(`
    <h1 style="margin:0 0 16px;color:#0d1628;font-size:24px;font-weight:normal;">
      ${t('recoveryH1')}
    </h1>
    <p style="margin:0 0 16px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('recoveryP1', { name: first })}
    </p>
    <p style="margin:0 0 14px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('recoveryP2')}
    </p>
    <p style="margin:0 0 14px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${isFree ? t('recoveryP3Free') : t('recoveryP3')}
    </p>
    <p style="margin:0 0 24px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('recoveryP4')}
    </p>
    <p style="margin:0 0 28px;color:#4a5568;font-size:16px;line-height:1.7;">
      ${t('recoveryP5')}
    </p>
    ${cta(`${APP_URL}/dashboard`, t('recoveryCta'))}
    <p style="margin:32px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">${t('signature')}</p>
  `, userId, lang)
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
