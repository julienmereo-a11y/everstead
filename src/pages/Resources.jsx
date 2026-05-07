import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { useReveal } from '../components/useReveal'
import { BookOpen, FileText, CheckSquare, HelpCircle, ArrowRight, ChevronDown, ArrowLeft, Check } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT DATA
// ─────────────────────────────────────────────────────────────────────────────

const sections = {
  blog: {
    label: 'Blog',
    icon: BookOpen,
    desc: 'Practical guidance on estate planning, family organisation, and digital life management.',
    posts: [
      {
        slug: 'what-executors-wish-they-had-known',
        title: 'What executors wish they had known',
        date: 'March 2026',
        tag: 'Estate planning',
        desc: 'A practical look at the most common challenges executors face — and how to make the role easier for the people you choose.',
        readTime: '6 min read',
        body: [
          {
            type: 'intro',
            text: 'Being named an executor is an honour — and an enormous responsibility. Most people who take on the role are unprepared for the sheer volume of practical work involved, especially when they are also grieving. Here is what the experience typically teaches, and how you can make it easier for the people you appoint.',
          },
          {
            type: 'heading',
            text: 'The paperwork starts immediately',
          },
          {
            type: 'text',
            text: 'Within days of a death, executors must locate the original will, obtain the death certificate, notify relevant institutions, and begin cataloguing assets. Without a central record to work from, this can take weeks of phone calls, requests, and waiting. Banks, pension providers, and insurers each have their own processes — and they all want documentation.',
          },
          {
            type: 'heading',
            text: 'The most common complaint: not knowing where things are',
          },
          {
            type: 'text',
            text: 'In post-mortem surveys of executors, the single most cited frustration is not knowing where documents are stored, which accounts existed, or who the relevant contacts were. A solicitor might have the will, the bank might have original deeds, and an accountant might hold tax records — all in different places, none of them communicated.',
          },
          {
            type: 'list',
            heading: 'What executors consistently wish they had had access to:',
            items: [
              'A full list of financial accounts (bank, investment, pension, ISA)',
              'Insurance policy numbers and provider contacts',
              'Details of any outstanding loans or liabilities',
              'Login guidance for digital accounts that need closing or transferring',
              'Contact details for the solicitor, accountant, and financial adviser',
              'A copy of funeral preferences, to avoid family disagreements',
              'Subscription services to cancel (to stop charges continuing)',
            ],
          },
          {
            type: 'heading',
            text: 'Digital accounts are now a major complication',
          },
          {
            type: 'text',
            text: 'Ten years ago, digital estate was a footnote. Today it is central. Email accounts, cloud storage, streaming subscriptions, social media profiles, investment apps, and sometimes cryptocurrency — all of these need to be found, evaluated, and actioned. Most platforms have no clear succession process. Without prior guidance, executors can be locked out entirely.',
          },
          {
            type: 'heading',
            text: 'What you can do now',
          },
          {
            type: 'text',
            text: 'The most effective thing you can do for your executor is create a structured inventory — a single reference point covering your accounts, documents, contacts, and instructions. It does not need to contain passwords; it needs to contain enough information for someone to know what exists and who to contact.',
          },
          {
            type: 'text',
            text: 'Review it annually, and after any major life event: a house purchase, a new pension, a divorce, a business change. The goal is not perfection — it is enough clarity that your executor can act without guessing.',
          },
          {
            type: 'cta',
            text: 'Everstead is designed to be exactly that reference point — a structured, private, role-based record your executor can access when they need it most.',
          },
        ],
      },
      {
        slug: 'digital-accounts-problem',
        title: 'The digital accounts problem: what happens to your online life',
        date: 'February 2026',
        tag: 'Digital life',
        desc: 'Social media, cloud storage, email, crypto. Most people have dozens of accounts and no plan for what happens to them.',
        readTime: '5 min read',
        body: [
          {
            type: 'intro',
            text: 'The average person now has over 100 digital accounts. When they die, most of those accounts enter a legal and practical grey zone — locked, inaccessible, sometimes charging subscriptions for months before anyone notices.',
          },
          {
            type: 'heading',
            text: 'The scale of the problem',
          },
          {
            type: 'text',
            text: 'Email accounts contain decades of correspondence and often act as the key to resetting every other account. Cloud storage — Google Drive, iCloud, Dropbox — may hold irreplaceable family photos, financial records, and personal documents. Streaming services, news subscriptions, and software licences continue billing until actively cancelled.',
          },
          {
            type: 'heading',
            text: 'Platform policies vary widely',
          },
          {
            type: 'text',
            text: "Google allows you to designate an Inactive Account Manager — someone who gets notified and can download your data if your account goes dormant. Apple's Legacy Contact feature works similarly. Facebook offers a memorialisation option or account deletion. But most platforms have no formal process at all — and even where they exist, they require a death certificate, proof of relationship, and weeks of waiting.",
          },
          {
            type: 'list',
            heading: 'The accounts most families need guidance on:',
            items: [
              'Primary email (often the key to everything else)',
              'Cloud storage and shared photo albums',
              'Social media — memorialise or delete?',
              'Financial apps and investment platforms',
              'Cryptocurrency wallets (access is often irreversible to lose)',
              'Business accounts and domain registrations',
              'Subscription services still charging after death',
            ],
          },
          {
            type: 'heading',
            text: 'Cryptocurrency deserves special attention',
          },
          {
            type: 'text',
            text: 'Unlike bank accounts, cryptocurrency is controlled entirely by private keys. If your executor does not have access to the wallet and recovery phrase, that value is gone permanently — no bank to call, no legal recourse. If you hold crypto, documenting where it is held and how to access it is not optional.',
          },
          {
            type: 'heading',
            text: 'What to do',
          },
          {
            type: 'text',
            text: 'You do not need to share passwords directly. What matters is leaving enough information for a trusted person to know what accounts exist and what steps to take. An inventory of account types, the platform names, and clear instructions about what you want done is far more valuable than a password that may be outdated by the time anyone reads it.',
          },
        ],
      },
      {
        slug: 'estate-conversation-aging-parents',
        title: "How to have the 'estate conversation' with aging parents",
        date: 'February 2026',
        tag: 'Family',
        desc: 'Tips for starting a practical and compassionate conversation about organisation without it feeling like a confrontation.',
        readTime: '5 min read',
        body: [
          {
            type: 'intro',
            text: "It is one of the most important conversations a family can have — and one of the easiest to avoid. Talking to aging parents about their estate, their wishes, and their documents can feel uncomfortable, even intrusive. But avoiding it creates real problems when it matters most.",
          },
          {
            type: 'heading',
            text: 'Why the conversation is worth having',
          },
          {
            type: 'text',
            text: 'Without a clear record, families face painful uncertainty at the worst possible moment. Where is the will? Who is the solicitor? Which accounts existed? What were the funeral preferences? These questions cause significant distress when they have to be answered in the days after a death.',
          },
          {
            type: 'heading',
            text: 'How to frame the conversation',
          },
          {
            type: 'list',
            heading: 'Approaches that tend to work:',
            items: [
              "Frame it as helping them, not as anticipating loss. \"I want to make sure we can support you the way you'd want\" lands differently than \"I need to know your finances.\"",
              'Use a personal trigger — a news story, a friend who went through an estate, your own planning. "It made me think about us too."',
              'Focus on practical organisation rather than death. Most people are comfortable talking about where documents are stored.',
              'Make it collaborative. Offer to set things up together, not just ask for information.',
              'Start small. You don\'t need to cover everything in one conversation. Ask about the will first, then return to the rest.',
            ],
          },
          {
            type: 'heading',
            text: 'What actually needs to be covered',
          },
          {
            type: 'list',
            heading: 'The core questions to work through over time:',
            items: [
              'Is there a will, and where is it held?',
              'Who is the solicitor or estate lawyer?',
              'Are there lasting power of attorney documents in place?',
              'Where are the key financial accounts held?',
              'Are there any outstanding liabilities or loans?',
              'What are their funeral and burial preferences?',
              'Who should be contacted first in an emergency?',
            ],
          },
          {
            type: 'heading',
            text: 'If they are reluctant',
          },
          {
            type: 'text',
            text: 'Some people feel strongly that this information is private, or that the conversation is morbid. Respect that, and work incrementally. The minimum goal is knowing where to find the will and who the solicitor is. Everything else can come over time.',
          },
        ],
      },
      {
        slug: 'why-a-will-is-not-enough',
        title: "Why a will alone isn't enough",
        date: 'January 2026',
        tag: 'Estate planning',
        desc: "Wills handle legal distribution — but the practical chaos of an estate often has nothing to do with the will.",
        readTime: '5 min read',
        body: [
          {
            type: 'intro',
            text: "A will is essential. But it covers only one part of what a family actually needs when someone dies. The administrative and practical burden of an estate settlement is often enormous — and a will addresses almost none of it.",
          },
          {
            type: 'heading',
            text: 'What a will does',
          },
          {
            type: 'text',
            text: "A will specifies how your estate should be distributed, who you appoint as executor, and if you have young children, your guardianship preferences. It is a legal document, probated through official channels, and it governs the final distribution of assets.",
          },
          {
            type: 'heading',
            text: "What a will doesn't do",
          },
          {
            type: 'list',
            items: [
              "It doesn't tell your executor what accounts exist or where to find them",
              "It doesn't help your family access digital accounts while waiting for probate",
              "It doesn't record your funeral preferences or personal wishes",
              "It doesn't tell anyone which subscriptions need cancelling",
              "It doesn't specify what happens to social media, photos, or cloud storage",
              "It doesn't provide contact details for your solicitor, accountant, or adviser",
              "It doesn't tell your family what passwords or access methods exist",
              "It doesn't capture the practical guidance that executors desperately need",
            ],
          },
          {
            type: 'heading',
            text: 'The gap between the legal and the practical',
          },
          {
            type: 'text',
            text: "Probate can take six months to over a year. During that time, your executor needs to manage accounts, close services, handle correspondence, and make practical decisions — without a complete picture of what exists. A will provides the legal authority to act; it does not provide the information needed to act well.",
          },
          {
            type: 'heading',
            text: 'The complement to a will',
          },
          {
            type: 'text',
            text: "Think of an estate organisation plan as the practical companion to a will. Where a will handles legal distribution, an organised estate record handles everything else: the accounts, the documents, the contacts, the instructions, the digital life. Together, they give your family what they actually need.",
          },
        ],
      },
      {
        slug: 'building-financial-inventory',
        title: "Building your family's financial inventory",
        date: 'January 2026',
        tag: 'Organisation',
        desc: "Step by step: how to document your accounts, subscriptions, and assets so everything is findable when it matters.",
        readTime: '7 min read',
        body: [
          {
            type: 'intro',
            text: "A financial inventory is a structured record of every account, asset, and financial relationship you have. It is not a list of passwords — it is a map that tells a trusted person what exists and how to reach it.",
          },
          {
            type: 'heading',
            text: 'Why an inventory matters',
          },
          {
            type: 'text',
            text: "Executors and family members consistently report that the hardest part of estate settlement is not the legal or financial complexity — it is the discovery phase. Finding out what accounts existed, which ones still have balances, which ones have direct debits attached. An inventory eliminates that burden entirely.",
          },
          {
            type: 'heading',
            text: 'What to include',
          },
          {
            type: 'list',
            heading: 'Category by category:',
            items: [
              'Banking: current accounts, savings accounts, ISAs — provider, account reference, rough balance range',
              'Investments: ISAs, pensions, SIPPs, shares, bonds — provider, account type, value range',
              'Insurance: life, health, home, car, income protection — provider, policy number, beneficiaries',
              'Property: address, mortgage lender, mortgage reference, solicitor who handled the purchase',
              'Business interests: any shares, partnerships, directorship roles',
              'Digital accounts: email, cloud storage, social media, streaming, software',
              'Cryptocurrency: platform or wallet type, value note, access guidance',
              'Subscriptions: regular charges that would need cancelling',
              'Loans and liabilities: mortgages, loans, credit cards',
            ],
          },
          {
            type: 'heading',
            text: 'What level of detail is right',
          },
          {
            type: 'text',
            text: "You don't need to include balances or passwords. You need enough that a trusted person can contact the right institution with the right reference. For a bank: the bank name and account type. For an investment account: the provider and rough account value. For insurance: the provider and policy number.",
          },
          {
            type: 'heading',
            text: 'Keep it updated',
          },
          {
            type: 'text',
            text: "Review your inventory at least once a year, or after any major change: opening a new account, moving a pension, remortgaging, starting a business. A stale inventory is still useful — but a current one is what actually protects your family.",
          },
        ],
      },
      {
        slug: 'what-advisors-can-offer-beyond-portfolio',
        title: 'What financial advisors can offer beyond the portfolio',
        date: 'December 2025',
        tag: 'Advisors',
        desc: 'Estate organisation is an emerging service offering that deepens client relationships and differentiates practices.',
        readTime: '5 min read',
        body: [
          {
            type: 'intro',
            text: "Financial planning has traditionally focused on accumulation: growing the portfolio, managing risk, planning for retirement. But the most pressing practical need many clients have is not investment management — it is organisation. Who knows where everything is? Who has the information they need?",
          },
          {
            type: 'heading',
            text: 'The gap advisers are uniquely positioned to fill',
          },
          {
            type: 'text',
            text: "Clients trust their financial adviser. That relationship — built over years — is precisely what makes estate organisation guidance so valuable coming from that source. When an adviser introduces the idea of structured estate organisation as part of a review, clients take it seriously in a way they might not when it comes from a general consumer tool.",
          },
          {
            type: 'heading',
            text: 'What estate organisation means in practice',
          },
          {
            type: 'list',
            items: [
              'Helping clients understand what their executor would actually need',
              'Facilitating a structured account and document inventory',
              'Ensuring contact details, policy numbers, and adviser details are recorded',
              'Coordinating with solicitors on will and LPA documentation',
              "Providing clients' families with a clear point of contact",
              'Reviewing and updating plans after major life events',
            ],
          },
          {
            type: 'heading',
            text: 'Why it differentiates a practice',
          },
          {
            type: 'text',
            text: "Estate organisation is low-effort for the adviser and extremely high-value for the client. It is the kind of service that gets mentioned to children, shared with siblings, and remembered at exactly the moment it matters most — when the client or a family member is dealing with a death. Practices that offer this tend to inherit client relationships across generations.",
          },
          {
            type: 'cta',
            text: 'Everstead for Advisors gives practices a co-branded client portal to manage estate organisation as a formal service, with role-based access and per-client visibility controls.',
          },
        ],
      },
    ],
  },

  guides: {
    label: 'Guides',
    icon: FileText,
    desc: 'Comprehensive guides on key topics in estate planning and family readiness.',
    posts: [
      {
        slug: 'complete-guide-digital-estate-planning',
        title: 'Complete guide to digital estate planning',
        date: 'Updated 2026',
        tag: 'Comprehensive',
        desc: 'A full overview of what digital estate planning involves, from account inventories to platform-specific policies for each major service.',
        readTime: '10 min read',
        body: [
          {
            type: 'intro',
            text: "Digital estate planning is the process of organising, documenting, and providing access instructions for your online accounts, digital assets, and electronic records — so that when you die or become incapacitated, a trusted person can act on your behalf without being locked out or left guessing.",
          },
          {
            type: 'heading',
            text: 'Why digital estate planning is now essential',
          },
          {
            type: 'text',
            text: "The average person now has over 100 digital accounts. These include email, cloud storage, social media, financial apps, crypto wallets, streaming services, and software subscriptions. Many hold significant financial or sentimental value. Without a plan, they become inaccessible, continue charging, or are lost permanently.",
          },
          {
            type: 'heading',
            text: 'Categories of digital assets',
          },
          {
            type: 'list',
            heading: 'The major categories to address:',
            items: [
              'Email accounts — primary and secondary (often the key to resetting everything else)',
              'Cloud storage — Google Drive, iCloud, Dropbox, OneDrive',
              'Social media — Facebook, Instagram, LinkedIn, X',
              'Financial apps — investment platforms, banking apps, budgeting tools',
              'Cryptocurrency — wallets, exchanges, hardware devices',
              'Domain names and websites — especially for business owners',
              'Digital purchases — ebooks, music, software licences',
              'Subscription services — streaming, news, SaaS tools',
              'Password managers — the master access point',
            ],
          },
          {
            type: 'heading',
            text: 'Platform-specific legacy policies',
          },
          {
            type: 'text',
            text: "Google: Inactive Account Manager lets you designate someone to receive a notification and download data if your account is dormant for a set period. Set this up in your Google account settings under Data & Privacy.",
          },
          {
            type: 'text',
            text: "Apple: Legacy Contact (iOS 15.2+, macOS Monterey+) allows you to designate up to five people who can request access to your account data after your death. They receive an access key to store.",
          },
          {
            type: 'text',
            text: "Facebook: You can designate a Legacy Contact who can manage your memorialised profile, or request account deletion. Find this in Settings > Memorialisation Settings.",
          },
          {
            type: 'text',
            text: "For platforms without formal legacy policies: your executor will typically need to submit a death certificate, proof of relationship, and a formal request. This process can take weeks and is not guaranteed to succeed.",
          },
          {
            type: 'heading',
            text: 'Cryptocurrency: the special case',
          },
          {
            type: 'text',
            text: "Cryptocurrency is controlled by private keys. If your executor cannot access your wallet or recovery phrase, the funds are permanently inaccessible — there is no bank or authority to petition. Document your wallet type, exchange accounts, and recovery phrase storage location, and ensure at least one trusted person knows how to access it.",
          },
          {
            type: 'heading',
            text: 'How to approach your digital estate plan',
          },
          {
            type: 'list',
            items: [
              'Inventory all accounts by category',
              'Set up platform legacy features where available (Google, Apple, Facebook)',
              'Document wallet and crypto access instructions separately from general accounts',
              'Identify which accounts have financial value and which have sentimental value',
              'Leave clear instructions on what you want done with each type',
              'Designate a digital executor (this can be the same as your main executor)',
              'Review and update after any significant account change',
            ],
          },
        ],
      },
      {
        slug: 'executors-playbook',
        title: "The executor's playbook",
        date: 'Updated 2026',
        tag: 'Executors',
        desc: 'A structured guide to fulfilling executor duties: legal steps, financial tasks, timelines, and common pitfalls to avoid.',
        readTime: '12 min read',
        body: [
          {
            type: 'intro',
            text: "Being named an executor is one of the most important responsibilities a person can be given. It involves legal, financial, and administrative duties that must be completed in a specific order, under time pressure, while often grieving. This playbook gives you a clear structure.",
          },
          {
            type: 'heading',
            text: 'The first 72 hours',
          },
          {
            type: 'list',
            items: [
              'Obtain a medical certificate of cause of death from the attending doctor',
              'Register the death at the local register office (within 5 days in England and Wales)',
              'Obtain multiple certified copies of the death certificate (you will need them)',
              'Locate and secure the original will',
              'Make a note of immediate financial pressures (funeral costs, outstanding bills)',
            ],
          },
          {
            type: 'heading',
            text: 'First month: legal and financial setup',
          },
          {
            type: 'list',
            items: [
              'Contact the solicitor named in the will or engage a probate solicitor',
              'Apply for the Grant of Probate (or Letters of Administration if there is no will)',
              'Notify HMRC of the death — and of your role as executor',
              'Open an executor bank account for estate funds',
              'Begin cataloguing all assets: bank accounts, investments, property, personal effects',
              'Begin cataloguing all liabilities: mortgages, loans, credit cards, tax owed',
              "Notify relevant institutions with a copy of the death certificate — bank, pension, insurer",
              'Cancel unnecessary subscriptions and direct debits',
            ],
          },
          {
            type: 'heading',
            text: 'Months two to six: administration',
          },
          {
            type: 'list',
            items: [
              'Complete the inheritance tax return (IHT400 if applicable)',
              'Pay any inheritance tax due before probate can proceed',
              'Await Grant of Probate — typically 8–12 weeks from application',
              'Collect in all assets once probate is granted',
              'Sell property and investments as directed or needed',
              'Pay all outstanding debts and liabilities from estate funds',
              'File a final income tax return for the deceased',
            ],
          },
          {
            type: 'heading',
            text: 'Distribution and closure',
          },
          {
            type: 'list',
            items: [
              "Distribute legacies as specified in the will",
              "Distribute the residuary estate to named beneficiaries",
              "Prepare estate accounts for beneficiaries' review",
              "Obtain receipts from beneficiaries",
              "Retain records for at least 12 years after distribution",
            ],
          },
          {
            type: 'heading',
            text: 'Common pitfalls',
          },
          {
            type: 'list',
            items: [
              'Distributing assets before paying debts — executors can be personally liable',
              'Missing the inheritance tax payment deadline (6 months from end of month of death)',
              'Not notifying HMRC, leading to unexpected tax demands later',
              'Failing to check for all assets — digital accounts, pension death benefits, joint accounts',
              'Not keeping adequate records of decisions and payments made',
            ],
          },
        ],
      },
      {
        slug: 'setting-up-emergency-vault',
        title: 'Setting up an emergency vault',
        date: 'Updated 2026',
        tag: 'Security',
        desc: 'How to designate emergency access and what to include, so a trusted person can act quickly without compromise.',
        readTime: '6 min read',
        body: [
          {
            type: 'intro',
            text: "An emergency vault is a designated, access-controlled summary of critical information that a trusted person can reach in an urgent situation — illness, incapacity, or death. It is different from your full estate plan: it is curated for speed and practicality.",
          },
          {
            type: 'heading',
            text: 'What goes in an emergency vault',
          },
          {
            type: 'list',
            items: [
              'Primary bank account details (enough to manage immediate bills)',
              'Insurance policy numbers — especially health, life, and home',
              'Contact details for GP and any specialist consultants',
              'Next of kin contacts and their relationship',
              'Location of the will and key documents (physical or digital)',
              'Solicitor and financial adviser contact details',
              'Any critical medical information: conditions, allergies, medications',
              'Emergency access guidance for essential digital accounts',
            ],
          },
          {
            type: 'heading',
            text: 'Who should have access',
          },
          {
            type: 'text',
            text: "Limit emergency vault access to one or two people you trust completely — a spouse, an adult child, or a sibling. The point is not comprehensive disclosure; it is ensuring that at least one person can act immediately when needed, without having to search for information.",
          },
          {
            type: 'heading',
            text: 'What NOT to include',
          },
          {
            type: 'list',
            items: [
              'Full passwords (these change, and broad access creates security risk)',
              'Sensitive financial detail that is not immediately relevant in an emergency',
              'Information about people who do not need to know (e.g. private medical history)',
            ],
          },
          {
            type: 'heading',
            text: 'Keeping it current',
          },
          {
            type: 'text',
            text: "Review the vault annually, and whenever contact details, insurance policies, or key accounts change. An outdated emergency vault is better than nothing — but a current one is what actually works under pressure.",
          },
          {
            type: 'heading',
            text: 'The distinction between vault and full plan',
          },
          {
            type: 'text',
            text: "Think of your full estate plan as the complete picture — every account, document, instruction, and wish. The emergency vault is a curated subset: only what someone needs in the first 24–72 hours. It is meant to be instantly actionable, not comprehensive.",
          },
        ],
      },
      {
        slug: 'financial-accounts-inventory-framework',
        title: 'Financial accounts inventory: a starter framework',
        date: 'Updated 2026',
        tag: 'Organisation',
        desc: "A categorised approach to documenting banking, investments, insurance, and subscriptions — everything you'd want someone to find.",
        readTime: '7 min read',
        body: [
          {
            type: 'intro',
            text: "A financial inventory is not a will. It is not a legal document. It is a practical reference — a structured record that tells a trusted person what accounts exist, who holds them, and how to contact the right people. It is what executors desperately need and rarely have.",
          },
          {
            type: 'heading',
            text: 'Banking',
          },
          {
            type: 'list',
            heading: 'For each account, record:',
            items: [
              'Bank name and account type (current, savings, ISA)',
              'Account reference or last 4 digits',
              'Whether it has direct debits attached',
              'Approximate balance range (not exact)',
              'Branch contact if relevant',
            ],
          },
          {
            type: 'heading',
            text: 'Pensions and investments',
          },
          {
            type: 'list',
            heading: 'For each account:',
            items: [
              'Provider name and account type',
              'Pension reference number or account ID',
              'Nominated beneficiary if applicable',
              'Whether it is a defined benefit or defined contribution scheme',
              'Contact details for the pension provider',
            ],
          },
          {
            type: 'heading',
            text: 'Insurance',
          },
          {
            type: 'list',
            heading: 'For each policy:',
            items: [
              'Insurer name and policy type',
              'Policy number',
              'Sum assured or cover amount',
              'Named beneficiaries (especially for life insurance)',
              'Claims contact number',
            ],
          },
          {
            type: 'heading',
            text: 'Property',
          },
          {
            type: 'list',
            items: [
              'Property address and ownership structure (sole, joint)',
              'Mortgage lender and account reference',
              'Approximate equity',
              'Solicitor who handled the purchase',
              'Location of title deeds if held physically',
            ],
          },
          {
            type: 'heading',
            text: 'Subscriptions and regular payments',
          },
          {
            type: 'text',
            text: "List every recurring payment: streaming services, software, gym memberships, insurance premiums, broadband. The goal is to allow someone to cancel these promptly, avoiding months of unnecessary charges continuing after death.",
          },
          {
            type: 'heading',
            text: 'How to maintain it',
          },
          {
            type: 'text',
            text: "Review once a year and after any significant financial change. You do not need to keep it up to the day — just roughly current. Even a two-year-old inventory is dramatically more useful than nothing.",
          },
        ],
      },
    ],
  },

  checklists: {
    label: 'Checklists',
    icon: CheckSquare,
    desc: 'Practical, printable checklists to help you build and review your plan.',
    posts: [
      {
        slug: 'estate-readiness-checklist',
        title: 'Estate readiness checklist',
        date: 'Updated 2026',
        tag: 'Starter',
        desc: 'A 40-item checklist covering accounts, documents, contacts, wishes, and sharing — the core of a complete estate plan.',
        readTime: '5 min read',
        body: [
          {
            type: 'intro',
            text: "Use this checklist to assess and build your estate plan. You do not need to complete everything at once — work through it section by section. Even a partially completed plan is far more valuable than none.",
          },
          {
            type: 'checklist',
            heading: 'Documents',
            items: [
              'Will is up to date and reflects your current wishes',
              'Will location is recorded and known to executor',
              'Lasting Power of Attorney (property & finances) is in place',
              'Lasting Power of Attorney (health & welfare) is in place',
              'Copies of LPA documents are accessible',
              'Passport and driving licence details are recorded',
              'Birth certificate location is noted',
              'Marriage or civil partnership certificate location is noted',
            ],
          },
          {
            type: 'checklist',
            heading: 'Financial accounts',
            items: [
              'All bank accounts (current and savings) are documented',
              'ISAs and investment accounts are recorded',
              'Pension accounts and providers are listed',
              'Life insurance policies are documented with policy numbers',
              'Home and contents insurance details are recorded',
              'Car and other insurance policies are noted',
              'Outstanding loans and credit facilities are listed',
              'Mortgage details (lender, reference, balance range) are recorded',
            ],
          },
          {
            type: 'checklist',
            heading: 'Property and assets',
          },
          {
            type: 'checklist',
            items: [
              'Property address and ownership structure is noted',
              'Vehicle registration and ownership is recorded',
              'Any business interests, shares, or directorships are documented',
              'Valuable personal items (jewellery, art, collectibles) are listed',
              'Cryptocurrency or digital assets are documented with access notes',
            ],
          },
          {
            type: 'checklist',
            heading: 'Digital life',
            items: [
              'Primary email account access guidance is provided',
              'Cloud storage accounts are listed (Google, iCloud, Dropbox)',
              'Social media accounts are listed with instructions',
              'Google Inactive Account Manager is configured',
              'Apple Legacy Contact is set (if applicable)',
              'Facebook Legacy Contact or deletion preference is set',
              'Subscription services requiring cancellation are listed',
            ],
          },
          {
            type: 'checklist',
            heading: 'Contacts and people',
            items: [
              'Executor name(s) and contact details are recorded',
              'Solicitor or estate lawyer contact is documented',
              'Financial adviser contact is recorded',
              'Accountant contact is recorded',
              'GP contact details are noted',
              'Trusted person for emergency access is designated',
            ],
          },
          {
            type: 'checklist',
            heading: 'Wishes',
            items: [
              'Funeral preferences are recorded (burial, cremation, location, readings)',
              'Personal letters or messages are written or noted',
              'Preferences for sentimental items are recorded',
              'Digital legacy instructions are noted (what to keep, delete, share)',
              'Care preferences for pets are recorded if applicable',
            ],
          },
        ],
      },
      {
        slug: 'executor-first-steps-checklist',
        title: 'Executor first steps checklist',
        date: 'Updated 2026',
        tag: 'Executors',
        desc: 'The first 30 days after a death: what to do, who to contact, what to locate, and what to defer.',
        readTime: '5 min read',
        body: [
          {
            type: 'intro',
            text: "The first 30 days after a death are the most time-sensitive. Certain steps must be taken in order, and certain decisions should be deferred until proper legal authority is in place. This checklist keeps you on track.",
          },
          {
            type: 'checklist',
            heading: 'First 72 hours',
            items: [
              'Obtain the medical certificate of cause of death',
              'Register the death (within 5 days in England & Wales)',
              'Obtain 10–15 certified copies of the death certificate',
              'Locate the original will',
              'Identify all named executors — confirm who is acting',
              'Notify immediate family and close friends',
              'Secure the deceased\'s home and property',
              'Cancel or pause any immediate services that need attention',
            ],
          },
          {
            type: 'checklist',
            heading: 'Week one',
            items: [
              'Contact the nominated solicitor or engage a probate solicitor',
              'Notify the deceased\'s bank of the death (account may be frozen)',
              'Notify pension provider(s) — death benefits may need to be claimed',
              'Notify life insurance provider(s)',
              'Arrange the funeral (can proceed before probate)',
              'Notify HMRC via the "Tell Us Once" service',
              'Notify DWP to stop benefit payments',
              'Cancel the deceased\'s driving licence and passport',
            ],
          },
          {
            type: 'checklist',
            heading: 'Weeks two to four',
            items: [
              'Begin compiling a full asset inventory',
              'Begin compiling a full liabilities inventory',
              'Identify and stop all active subscriptions and direct debits',
              'Redirect post to executor address if needed',
              'Notify utilities and council tax of change of occupant',
              'Notify the Electoral Register of the death',
              'Apply for Grant of Probate (once solicitor has assessed)',
              'Open an executor\'s bank account for estate funds',
              'Maintain a clear log of all decisions and actions taken',
            ],
          },
          {
            type: 'checklist',
            heading: 'What to defer (do not do these before probate)',
            items: [
              'Do not distribute any assets to beneficiaries yet',
              'Do not sell or transfer property without Grant of Probate',
              'Do not close investment accounts without Grant of Probate',
              'Do not make any gifts from estate funds',
            ],
          },
        ],
      },
      {
        slug: 'annual-plan-review-checklist',
        title: 'Annual plan review checklist',
        date: 'Updated 2026',
        tag: 'Maintenance',
        desc: 'A short checklist to run once a year — or after a major life event — to keep your plan current and complete.',
        readTime: '3 min read',
        body: [
          {
            type: 'intro',
            text: "Your estate plan is not a one-time exercise. Life changes — accounts open and close, relationships shift, wishes evolve. A brief annual review keeps everything current and ensures your plan actually reflects your life as it is today.",
          },
          {
            type: 'text',
            text: "Run this review each year, or immediately after any of these: a marriage, divorce, or separation; the birth or adoption of a child; the death of someone named in your plan; a house purchase or sale; a major change in financial circumstances; a new job or business.",
          },
          {
            type: 'checklist',
            heading: 'Documents',
            items: [
              'Is the will still accurate? Does it reflect your current wishes and family situation?',
              'Are LPA documents still in place and held by the right people?',
              'Are key documents still where you noted them?',
            ],
          },
          {
            type: 'checklist',
            heading: 'Financial accounts',
            items: [
              'Have any new accounts been opened? Add them to the inventory.',
              'Have any accounts been closed? Remove or mark them.',
              'Has your pension situation changed?',
              'Have any insurance policies been updated, cancelled, or replaced?',
              'Are nominated beneficiaries on pensions and life insurance still correct?',
            ],
          },
          {
            type: 'checklist',
            heading: 'Digital accounts',
            items: [
              'Are your legacy contact settings still active on Google and Apple?',
              'Have any new major accounts been opened?',
              'Are social media access instructions still current?',
              'Are subscription services that would need cancelling still listed?',
            ],
          },
          {
            type: 'checklist',
            heading: 'People and contacts',
            items: [
              'Are your executor(s) still the right people? Are they still willing?',
              'Are contact details for solicitor, adviser, and accountant still correct?',
              'Is your emergency vault contact still the right person?',
              'Has anything changed in your family that affects who should be named?',
            ],
          },
          {
            type: 'checklist',
            heading: 'Wishes',
            items: [
              'Are your funeral preferences still as you want them recorded?',
              'Are there any letters or personal notes you want to update or add?',
              'Is there anything significant that has happened this year that you want to record?',
            ],
          },
        ],
      },
      {
        slug: 'digital-accounts-inventory-template',
        title: 'Digital accounts inventory template',
        date: 'Updated 2026',
        tag: 'Templates',
        desc: 'A structured template for cataloguing every digital account: login reference, category, action instructions, and owner.',
        readTime: '4 min read',
        body: [
          {
            type: 'intro',
            text: "Use this template to document your digital accounts. For each account, you are recording enough for a trusted person to identify what exists and take the right action — not storing passwords directly.",
          },
          {
            type: 'checklist',
            heading: 'Email accounts',
            items: [
              'Primary email: provider, address, recovery method, action instruction',
              'Secondary email(s): provider, address, purpose, action instruction',
              'Work email: provider, IT contact for handover',
            ],
          },
          {
            type: 'checklist',
            heading: 'Cloud storage',
            items: [
              'Google (Drive/Photos): account email, legacy contact set? Download instructions.',
              'iCloud: account email, legacy contact set? Key data stored here?',
              'Dropbox / OneDrive / other: account email, key contents, action instruction',
            ],
          },
          {
            type: 'checklist',
            heading: 'Social media',
            items: [
              'Facebook: account email, memorialise or delete? Legacy contact set?',
              'Instagram: account email, delete or preserve? Linked to Facebook?',
              'LinkedIn: account email, close account (notify HR/colleagues first?)',
              'Other platforms: account email, action instruction',
            ],
          },
          {
            type: 'checklist',
            heading: 'Financial apps',
            items: [
              'Investment / trading apps: platform name, account reference, action',
              'Banking apps: already covered in financial inventory, cross-reference',
              'Budgeting or finance tracking apps: platform, account, close/transfer',
              'Cryptocurrency: wallet type, exchange platform, recovery phrase location',
            ],
          },
          {
            type: 'checklist',
            heading: 'Subscriptions to cancel',
            items: [
              'Streaming services (Netflix, Spotify, Apple TV+, etc.): account email',
              'News and magazine subscriptions: publication, account email',
              'Software subscriptions: product name, account email, billing card',
              'Gym or fitness memberships: provider, member number',
              'Other recurring digital charges: service name, account reference',
            ],
          },
          {
            type: 'text',
            text: "For each entry, add a brief action note: 'close account', 'transfer to [person]', 'download data first then close', 'preserve for [reason]'. A brief note on your wishes is more helpful than any technical detail.",
          },
        ],
      },
    ],
  },

  faqs: {
    label: 'FAQs',
    icon: HelpCircle,
    desc: 'Answers to the most common questions about Everstead and estate planning.',
    posts: [
      {
        slug: 'general-questions',
        title: 'General questions about Everstead',
        date: null,
        tag: 'Product',
        desc: 'How does Everstead work? Who is it for? What makes it different from a password manager or a will?',
        readTime: '4 min read',
        body: [
          { type: 'intro', text: "Answers to the most common questions about what Everstead is, who it is for, and how it fits into your life and estate planning." },
          {
            type: 'faq',
            items: [
              {
                q: 'What is Everstead?',
                a: 'Everstead is a private estate organisation platform. It helps you document your financial accounts, important documents, trusted contacts, final wishes, and instructions — all in one structured, access-controlled place. It is designed to be the practical reference that families and executors actually need.',
              },
              {
                q: 'Who is Everstead for?',
                a: 'Everstead is for anyone who wants to make sure their family is not left guessing. That includes individuals setting up their own plan, couples or families organising together, aging adults working with adult children, executors managing a plan on behalf of someone, and financial advisers offering estate organisation as a client service.',
              },
              {
                q: 'How is this different from a will?',
                a: "A will is a legal document that handles the distribution of your estate after death. Everstead is the practical companion to a will — it records what accounts exist, where documents are, who to contact, and what your wishes are. Most of the practical work of an estate settlement has nothing to do with the will. Everstead fills that gap.",
              },
              {
                q: 'How is this different from a password manager?',
                a: "A password manager stores credentials securely for your own daily use. Everstead is designed for someone else to use when you cannot — it is organised around estate categories (accounts, documents, people, wishes) and built for handover, not daily login. You do not need to store passwords; you need to store enough for someone to contact the right institutions.",
              },
              {
                q: 'Is Everstead a legal service?',
                a: "No. Everstead is an organisation and planning platform. It does not draft wills, prepare legal instruments, give legal or financial advice, or replace a solicitor, estate lawyer, accountant, or adviser. If you need legal or financial guidance, please consult a qualified professional.",
              },
              {
                q: 'How long does it take to set up?',
                a: "Most people have a useful, functional plan within a few hours. You do not need to complete everything at once — start with accounts and documents, then add contacts and wishes over time. The readiness score in your dashboard shows your progress and highlights what is still missing.",
              },
              {
                q: 'Can I start for free?',
                a: "Yes. Every plan includes a 14-day free trial. A card is required to start, but you won't be charged until the trial ends — cancel before then and pay nothing. You have full access to all features on your chosen plan during the trial.",
              },
            ],
          },
        ],
      },
      {
        slug: 'security-privacy-questions',
        title: 'Security and privacy questions',
        date: null,
        tag: 'Security',
        desc: "How is data encrypted? Who can access my plan? What happens if there's a data breach?",
        readTime: '4 min read',
        body: [
          { type: 'intro', text: "Questions about how Everstead protects your information, who can access it, and what happens in edge cases." },
          {
            type: 'faq',
            items: [
              {
                q: 'How is my data encrypted?',
                a: 'All data stored in Everstead is encrypted at rest using AES-256 encryption. All data transmitted to and from the platform is encrypted in transit using TLS. Encryption is applied at the storage layer — not just the connection layer.',
              },
              {
                q: 'Who can access my plan?',
                a: 'Only you and the people you explicitly invite with specific roles. Every section of your plan has access controls — you decide who sees what. People you designate as trusted contacts can only see the sections you have granted them access to. Everstead staff do not have access to the content of your plan.',
              },
              {
                q: 'Can Everstead read my documents or account details?',
                a: 'No. Everstead staff cannot access the content of your estate plan. Your data is yours. We do not sell it, share it, or use it for any purpose beyond operating the platform.',
              },
              {
                q: 'What happens if there is a data breach?',
                a: 'We maintain security monitoring and incident response procedures. In the event of a security incident, we would notify affected users promptly and in accordance with our obligations under UK data protection law (UK GDPR). Because data is encrypted at rest, a breach of the storage layer would not expose readable content.',
              },
              {
                q: 'Is Everstead compliant with UK data protection law?',
                a: 'Yes. Everstead is registered with the ICO and operates in compliance with UK GDPR. Full details are in our Privacy Policy.',
              },
              {
                q: 'What happens to my data if I cancel?',
                a: 'You can export a copy of your data at any time. After account cancellation, your data is retained for 30 days to allow recovery, then deleted. We do not keep your data after you have left.',
              },
            ],
          },
        ],
      },
      {
        slug: 'pricing-billing-questions',
        title: 'Pricing and billing questions',
        date: null,
        tag: 'Billing',
        desc: 'Free trial details, how to cancel, what happens to your data, switching plans.',
        readTime: '3 min read',
        body: [
          { type: 'intro', text: "Questions about plans, pricing, billing, and what happens when you upgrade, downgrade, or cancel." },
          {
            type: 'faq',
            items: [
              {
                q: 'How does the free trial work?',
                a: 'Every plan comes with a 14-day free trial. A card is required at signup, but you are not charged for 14 days — cancel any time before and pay nothing. At the end of the trial, your card on file is charged automatically. If the payment fails, your account moves to a read-only state.',
              },
              {
                q: 'What are the plans and prices?',
                a: 'Essential is £7/month (or £5/month billed yearly). Family is £15/month (or £12/month billed yearly). Advisor is £60/month (or £48/month billed yearly). All prices are in pounds sterling and include VAT where applicable.',
              },
              {
                q: 'Can I switch plans?',
                a: 'Yes. You can upgrade or downgrade at any time from your account settings. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period.',
              },
              {
                q: 'How do I cancel?',
                a: 'You can cancel at any time from the Membership section of your dashboard settings. There are no cancellation fees. Your plan continues until the end of your current billing period, after which access is removed. Your data is retained for 30 days before deletion.',
              },
              {
                q: 'What happens to my data if I cancel?',
                a: 'Your data is retained for 30 days after cancellation, giving you time to export or reconsider. After 30 days, it is permanently deleted. You can export a full copy of your data at any time from your account settings.',
              },
              {
                q: 'Do you offer refunds?',
                a: "We don't offer refunds for partial billing periods. If you cancel mid-period, you retain access until the end of that period. If you have a specific billing issue, contact support@everstead.care.",
              },
              {
                q: 'Is there a discount for annual billing?',
                a: 'Yes. Choosing yearly billing saves approximately 20% compared to monthly billing across all plans.',
              },
            ],
          },
        ],
      },
      {
        slug: 'estate-planning-101',
        title: 'Estate planning 101',
        date: null,
        tag: 'Education',
        desc: 'Answers to common questions about wills, trusts, executors, POA, and how Everstead fits in.',
        readTime: '6 min read',
        body: [
          { type: 'intro', text: "Common questions about the basics of estate planning in the UK — what terms mean, what you need, and where Everstead fits into the picture." },
          {
            type: 'faq',
            items: [
              {
                q: 'What is a will and do I need one?',
                a: "A will is a legal document that specifies how you want your estate distributed after your death, who you appoint as executor, and (if you have children) your guardianship preferences. Without a will, your estate is distributed according to the rules of intestacy — which may not reflect your wishes. Most adults should have one. You should use a qualified solicitor or will-writing service.",
              },
              {
                q: 'What is an executor?',
                a: "An executor is the person you appoint in your will to manage the administration of your estate after you die. Duties include obtaining the death certificate, applying for probate, collecting assets, paying debts, and distributing the estate to beneficiaries. You can appoint up to four executors. It is a significant responsibility.",
              },
              {
                q: 'What is a Lasting Power of Attorney (LPA)?',
                a: "An LPA is a legal document that gives someone you trust — your attorney — the authority to make decisions on your behalf if you lose mental capacity. There are two types: Property & Financial Affairs (managing your money and property) and Health & Welfare (making decisions about your care and medical treatment). Both require registration with the Office of the Public Guardian.",
              },
              {
                q: 'What is probate?',
                a: "Probate is the legal process of administering a deceased person's estate. In England and Wales, executors apply to the Probate Registry for a Grant of Probate, which gives them legal authority to collect in assets and distribute the estate. The process typically takes 3–12 months. Estates under a certain threshold, or with only jointly held assets, may not require probate.",
              },
              {
                q: 'What is inheritance tax (IHT)?',
                a: "Inheritance tax is a tax on the estate of someone who has died. The current nil-rate band is £325,000 — estates above this threshold are taxed at 40% on the excess (with some exceptions and reliefs, including a residence nil-rate band for passing property to direct descendants). IHT must be paid before probate is granted.",
              },
              {
                q: 'What is the difference between a will and a trust?',
                a: "A will takes effect on death and is subject to probate. A trust is a legal arrangement where assets are held by trustees for the benefit of beneficiaries, and can operate during your lifetime and after death. Trusts can offer tax planning benefits and more controlled distribution, but are more complex to set up. They are typically relevant for larger or more complex estates.",
              },
              {
                q: "Where does Everstead fit into all of this?",
                a: "Everstead complements your legal estate planning — it doesn't replace it. Once you have a will, LPA, and the right professional advice in place, Everstead is where you store the practical record: what accounts exist, where documents are held, who the contacts are, what your wishes are. It is the information your executor and family will actually need on the day.",
              },
            ],
          },
        ],
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sectionList = [
  { slug: 'blog', label: 'Blog', icon: BookOpen },
  { slug: 'guides', label: 'Guides', icon: FileText },
  { slug: 'checklists', label: 'Checklists', icon: CheckSquare },
  { slug: 'faqs', label: 'FAQs', icon: HelpCircle },
]

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE DETAIL PAGE
// ─────────────────────────────────────────────────────────────────────────────

function FaqAccordion({ items }) {
  const [open, setOpen] = React.useState(null)
  return (
    <div className="space-y-3 mt-6">
      {items.map(({ q, a }, i) => (
        <div key={i} className="border border-stone-200 rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left flex items-start justify-between gap-4 px-6 py-5"
          >
            <span className="font-medium text-navy-900 text-sm leading-snug">{q}</span>
            <ChevronDown size={16} className={`text-stone-400 mt-0.5 flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">{a}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function ArticleDetail({ sectionSlug, postSlug }) {
  useReveal()
  const sectionData = sections[sectionSlug]
  const post = sectionData?.posts.find(p => p.slug === postSlug)

  if (!post) return (
    <div className="bg-stone-50 pt-24 min-h-screen">
      <div className="py-40 text-center text-stone-500">Article not found. <Link to="/resources" className="text-navy-700 underline">Back to resources</Link></div>
    </div>
  )

  const { title, date, tag, readTime, body } = post
  const SectionIcon = sectionData.icon

  return (
    <div className="bg-stone-50 pt-24">
      {/* Hero */}
      <section className="py-16 lg:py-24 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8">
          <Link
            to={`/resources/${sectionSlug}`}
            className="inline-flex items-center gap-1.5 text-stone-400 hover:text-white text-xs font-medium mb-8 transition-colors"
          >
            <ArrowLeft size={13} /> Back to {sectionData.label}
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-stone-200 text-xs font-medium px-3 py-1 rounded-full">
              <SectionIcon size={11} /> {sectionData.label}
            </span>
            <span className="bg-navy-700 text-stone-200 text-xs font-medium px-2.5 py-1 rounded-full border border-white/10">{tag}</span>
            {date && <span className="text-stone-400 text-xs">{date}</span>}
            {readTime && <span className="text-stone-400 text-xs">· {readTime}</span>}
          </div>
          <h1 className="font-display text-3xl lg:text-5xl font-light text-white leading-tight text-balance">{title}</h1>
        </div>
      </section>

      {/* Section nav */}
      <section className="border-b border-stone-200 bg-white sticky top-16 z-10">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 flex gap-1 overflow-x-auto py-3">
          {sectionList.map(s => (
            <Link
              key={s.slug}
              to={`/resources/${s.slug}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${s.slug === sectionSlug ? 'bg-navy-50 text-navy-800' : 'text-stone-600 hover:bg-stone-100 hover:text-navy-800'}`}
            >
              <s.icon size={14} />
              {s.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Body */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="space-y-8">
            {body.map((block, i) => {
              if (block.type === 'intro') return (
                <p key={i} className="text-lg text-stone-700 leading-relaxed font-light border-l-4 border-navy-200 pl-5">{block.text}</p>
              )
              if (block.type === 'heading') return (
                <h2 key={i} className="font-display text-2xl font-light text-navy-950 pt-4">{block.text}</h2>
              )
              if (block.type === 'text') return (
                <p key={i} className="text-stone-600 leading-relaxed text-base">{block.text}</p>
              )
              if (block.type === 'list') return (
                <div key={i}>
                  {block.heading && <p className="font-semibold text-navy-900 text-sm mb-3">{block.heading}</p>}
                  <ul className="space-y-2.5">
                    {block.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-navy-50 border border-navy-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ArrowRight size={10} className="text-navy-600" />
                        </div>
                        <span className="text-stone-600 text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
              if (block.type === 'checklist') return (
                <div key={i}>
                  {block.heading && <p className="font-semibold text-navy-900 text-sm mb-3 mt-6 first:mt-0">{block.heading}</p>}
                  {block.items && (
                    <ul className="space-y-2">
                      {block.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 bg-white border border-stone-200 rounded-lg px-4 py-3">
                          <div className="w-5 h-5 rounded border-2 border-stone-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check size={10} className="text-stone-300" />
                          </div>
                          <span className="text-stone-700 text-sm leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
              if (block.type === 'faq') return (
                <FaqAccordion key={i} items={block.items} />
              )
              if (block.type === 'cta') return (
                <div key={i} className="bg-navy-50 border border-navy-200 rounded-2xl px-6 py-5">
                  <p className="text-sm text-navy-800 leading-relaxed">{block.text}</p>
                  <Link
                    to="/get-started"
                    className="inline-flex items-center gap-2 mt-4 bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-navy-700 transition-colors"
                  >
                    Get started free <ArrowRight size={14} />
                  </Link>
                </div>
              )
              return null
            })}
          </div>

          {/* Footer nav */}
          <div className="mt-16 pt-8 border-t border-stone-200 flex items-center justify-between gap-4">
            <Link
              to={`/resources/${sectionSlug}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900 transition-colors"
            >
              <ArrowLeft size={14} /> Back to {sectionData.label}
            </Link>
            <Link
              to="/get-started"
              className="inline-flex items-center gap-2 bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-navy-700 transition-colors"
            >
              Get started free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION LISTING PAGE
// ─────────────────────────────────────────────────────────────────────────────

function ResourceSection({ slug }) {
  const data = sections[slug]
  useReveal()
  if (!data) return <div className="py-40 text-center text-stone-500">Section not found.</div>
  const { label, icon: SectionIcon, desc, posts } = data
  return (
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-7 animate-fade-in">
            <SectionIcon size={24} className="text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 animate-fade-in">Resources</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">{label}</h1>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">{desc}</p>
        </div>
      </section>

      {/* Section nav */}
      <section className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 flex gap-1 overflow-x-auto py-3">
          {sectionList.map(s => (
            <Link
              key={s.slug}
              to={`/resources/${s.slug}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${s.slug === slug ? 'bg-navy-50 text-navy-800' : 'text-stone-600 hover:bg-stone-100 hover:text-navy-800'}`}
            >
              <s.icon size={14} />
              {s.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid sm:grid-cols-2 gap-6">
          {posts.map(({ slug: postSlug, title, date, tag, desc: postDesc, readTime }, i) => (
            <Link
              key={postSlug}
              to={`/resources/${slug}/${postSlug}`}
              className={`reveal reveal-delay-${Math.min(i + 1, 5)} group bg-white border border-stone-200 rounded-2xl p-7 hover:border-navy-200 hover:shadow-sm transition-all`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-navy-50 text-navy-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-navy-100">{tag}</span>
                {date && <span className="text-xs text-stone-400">{date}</span>}
                {readTime && <span className="text-xs text-stone-400">· {readTime}</span>}
              </div>
              <h3 className="font-semibold text-navy-900 mb-2 leading-snug group-hover:text-navy-700 transition-colors">{title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-4">{postDesc}</p>
              <span className="inline-flex items-center gap-1 text-xs text-navy-700 font-medium group-hover:gap-2 transition-all">
                {slug === 'checklists' ? 'View checklist' : slug === 'faqs' ? 'Read answers' : 'Read more'} <ArrowRight size={11} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEX
// ─────────────────────────────────────────────────────────────────────────────

function ResourcesIndex() {
  useReveal()
  return (
    <div className="bg-stone-50 pt-24">
      <section className="py-20 lg:py-28 grain relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 to-navy-800" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-5 animate-fade-in">Resources</p>
          <h1 className="font-display text-5xl lg:text-6xl font-light text-white leading-tight text-balance animate-fade-up">
            Guides, checklists, and insight.
          </h1>
          <p className="mt-5 text-stone-300 text-lg leading-relaxed max-w-xl mx-auto animate-fade-up animate-delay-100">
            Everything you need to understand estate planning and get your family plan in order.
          </p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 grid sm:grid-cols-2 gap-6">
          {sectionList.map(({ slug, label, icon: Icon }, i) => {
            const data = sections[slug]
            return (
              <Link
                key={slug}
                to={`/resources/${slug}`}
                className={`reveal reveal-delay-${i + 1} group bg-white border border-stone-200 rounded-2xl p-7 hover:border-navy-300 hover:shadow-md transition-all`}
              >
                <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center mb-5">
                  <Icon size={22} className="text-navy-700" />
                </div>
                <h2 className="font-semibold text-navy-900 mb-2 group-hover:text-navy-700 transition-colors">{label}</h2>
                <p className="text-stone-500 text-sm leading-relaxed mb-4">{data.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs text-navy-700 font-medium">Browse {label.toLowerCase()} <ArrowRight size={11} /></span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER ENTRY
// ─────────────────────────────────────────────────────────────────────────────

export default function Resources() {
  const { section, post } = useParams()
  if (section && post) return <ArticleDetail sectionSlug={section} postSlug={post} />
  if (section) return <ResourceSection slug={section} />
  return <ResourcesIndex />
}
