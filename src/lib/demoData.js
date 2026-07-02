// ─────────────────────────────────────────────────────────────
// Demo seed data — used when ?demo=true is present in the URL.
// No Supabase calls are made in demo mode.
// ─────────────────────────────────────────────────────────────

export const DEMO_PROFILE = {
  id: 'demo-user',
  email: 'james.thornton@example.com',
  full_name: 'James Thornton',
  plan: 'family',
  subscription_status: 'active',
}

export const DEMO_ACCOUNTS = [
  { id: '1', user_id: 'demo-user', institution: 'Barclays', account_type: 'Current Account', category: 'Banking', account_number_hint: '4821', balance_display: '£8,450', notes: 'Primary day-to-day account. Direct debits and salary paid here.', sort_order: 1 },
  { id: '2', user_id: 'demo-user', institution: 'HSBC', account_type: 'Savings Account', category: 'Banking', account_number_hint: '3309', balance_display: '£22,000', notes: 'Emergency fund and holiday savings.', sort_order: 2 },
  { id: '3', user_id: 'demo-user', institution: 'Vanguard', account_type: 'Stocks & Shares ISA', category: 'Investment', account_number_hint: '7714', balance_display: '£41,200', notes: 'Long-term investment portfolio. Login via vanguardinvestor.co.uk.', sort_order: 3 },
  { id: '4', user_id: 'demo-user', institution: 'Nest', account_type: 'Workplace Pension', category: 'Retirement', account_number_hint: '0092', balance_display: '£87,300', notes: 'Employer auto-enrolment pension. Beneficiary: Carol Thornton.', sort_order: 4 },
  { id: '5', user_id: 'demo-user', institution: 'Aviva', account_type: 'Life Insurance', category: 'Insurance', account_number_hint: '5567', balance_display: '£500,000 cover', notes: 'Level term life policy. Expires 2041. Policy doc in Document Vault.', sort_order: 5 },
  { id: '6', user_id: 'demo-user', institution: 'Coinbase', account_type: 'Crypto Wallet', category: 'Digital', account_number_hint: '8823', balance_display: '~£4,100', notes: 'Bitcoin and ETH holdings. Hardware wallet stored in home safe.', sort_order: 6 },
]

const DEMO_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
export const DEMO_DOCUMENTS = [
  { id: '1', user_id: 'demo-user', name: 'Last Will & Testament', doc_type: 'Legal', status: 'current', notes: 'Signed and witnessed June 2024. Original held at Clifford Chance LLP.', storage_path: null, file_url: DEMO_PDF, updated_at: '2024-06-15T10:00:00Z' },
  { id: '2', user_id: 'demo-user', name: 'Lasting Power of Attorney (Property)', doc_type: 'Legal', status: 'current', notes: 'Registered with OPG. Attorneys: Carol Thornton, Emily Thornton.', storage_path: null, file_url: DEMO_PDF, updated_at: '2024-03-10T10:00:00Z' },
  { id: '3', user_id: 'demo-user', name: 'Aviva Life Insurance Policy', doc_type: 'Insurance', status: 'current', notes: 'Policy number AV-2041-00567. Contact: 0800 285 1088.', storage_path: null, file_url: DEMO_PDF, updated_at: '2023-11-20T10:00:00Z' },
  { id: '4', user_id: 'demo-user', name: 'Property Deeds — 14 Kensington Rd', doc_type: 'Property', status: 'current', notes: 'Title registered at HM Land Registry. Title number LN882341.', storage_path: null, file_url: DEMO_PDF, updated_at: '2022-08-05T10:00:00Z' },
  { id: '5', user_id: 'demo-user', name: 'NHS Summary Health Record', doc_type: 'Medical', status: 'expiring', notes: 'Needs renewal. Includes blood type, medications, GP contact.', storage_path: null, file_url: DEMO_PDF, expires_at: '2025-06-01', updated_at: '2022-01-10T10:00:00Z' },
  { id: '6', user_id: 'demo-user', name: 'UK Passport', doc_type: 'Personal', status: 'current', notes: 'Expires October 2030. Stored in home safe, upper drawer.', storage_path: null, file_url: DEMO_PDF, updated_at: '2020-10-01T10:00:00Z' },
]

export const DEMO_PEOPLE = [
  {
    id: '1', user_id: 'demo-user', name: 'Carol Thornton', email: 'carol.thornton@example.com',
    role: 'Primary Executor', invite_status: 'accepted',
    access_grants: {
      accessAreas: ['accounts', 'documents', 'messages', 'instructions', 'subscriptions'],
      accountCategories: [],
      documentTypes: ['Legal', 'Property'],
      accessTiming: 'after_death',
    },
  },
  {
    id: '2', user_id: 'demo-user', name: 'Emily Thornton', email: 'emily.thornton@example.com',
    role: 'Family Member', invite_status: 'accepted',
    access_grants: {
      accessAreas: ['messages', 'instructions'],
      accountCategories: [],
      documentTypes: [],
      accessTiming: 'after_death',
    },
  },
  {
    id: '3', user_id: 'demo-user', name: 'David Rahman', email: 'david.rahman@cliffords.com',
    role: 'Solicitor', invite_status: 'pending',
    access_grants: {
      accessAreas: ['documents'],
      accountCategories: [],
      documentTypes: ['Legal'],
      accessTiming: 'after_death',
    },
  },
  {
    id: '4', user_id: 'demo-user', name: 'Sophie Blake', email: 'sophie.blake@vanguard.com',
    role: 'Financial Adviser', invite_status: 'accepted',
    access_grants: {
      accessAreas: ['accounts'],
      accountCategories: ['Investment', 'Retirement'],
      documentTypes: [],
      accessTiming: 'always',
    },
  },
]

export const DEMO_INSTRUCTIONS = [
  {
    id: '1',
    user_id: 'demo-user',
    title: 'First 48 hours — what to do immediately',
    category: 'Immediate',
    audience: 'Executor',
    body: 'These are the most time-sensitive steps Carol should take in the first two days. Contact the relevant parties as soon as possible.',
    instruction_steps: [
      { id: 's1', instruction_id: '1', body: 'Notify Barclays (0345 734 5345) and HSBC (0345 740 4404) to freeze accounts temporarily.', step_order: 0 },
      { id: 's2', instruction_id: '1', body: 'Contact David Rahman at Clifford Chance to retrieve the original will.', step_order: 1 },
      { id: 's3', instruction_id: '1', body: 'Notify Aviva life insurance (0800 285 1088) to begin the claim process.', step_order: 2 },
      { id: 's4', instruction_id: '1', body: 'Register the death at the local register office within 5 days.', step_order: 3 },
    ],
  },
  {
    id: '2',
    user_id: 'demo-user',
    title: 'Cancel these subscriptions within 30 days',
    category: 'Financial',
    audience: 'Family',
    body: 'The following services should be cancelled to avoid ongoing charges. Cancellation instructions and contact details are listed per service in the Subscriptions section.',
    instruction_steps: [
      { id: 's5', instruction_id: '2', body: 'Cancel Netflix — log in via carol@example.com, go to Account > Cancel.', step_order: 0 },
      { id: 's6', instruction_id: '2', body: 'Cancel Amazon Prime — call 0800 279 7234 with the account email.', step_order: 1 },
      { id: 's7', instruction_id: '2', body: 'Cancel Spotify family plan — login details are in my password manager.', step_order: 2 },
    ],
  },
  {
    id: '3',
    user_id: 'demo-user',
    title: 'Funeral and memorial preferences',
    category: 'Personal',
    audience: 'Everyone',
    body: 'I have recorded my preferences here so the family does not have to guess. Please follow these as closely as the circumstances allow.',
    instruction_steps: [
      { id: 's8', instruction_id: '3', body: 'Cremation preferred. No formal funeral — a small gathering at home is fine.', step_order: 0 },
      { id: 's9', instruction_id: '3', body: 'I would like \'Hallelujah\' by Leonard Cohen played.', step_order: 1 },
      { id: 's10', instruction_id: '3', body: 'Scatter ashes at Loch Lomond — we visited together every summer.', step_order: 2 },
    ],
  },
]

export const DEMO_SUBSCRIPTIONS = [
  { id: '1', user_id: 'demo-user', name: 'Netflix', billing_cycle: 'Monthly', amount: 17.99, next_charge_date: '2026-05-03', notes: 'Family plan. Account: james@example.com' },
  { id: '2', user_id: 'demo-user', name: 'Spotify', billing_cycle: 'Monthly', amount: 17.99, next_charge_date: '2026-05-08', notes: 'Family plan. Cancel through app.' },
  { id: '3', user_id: 'demo-user', name: 'Amazon Prime', billing_cycle: 'Annual', amount: 95.00, next_charge_date: '2026-11-14', notes: 'Includes video, music, delivery.' },
  { id: '4', user_id: 'demo-user', name: 'Dropbox Plus', billing_cycle: 'Annual', amount: 119.99, next_charge_date: '2026-09-22', notes: '2TB cloud storage. Work documents backed up here.' },
  { id: '5', user_id: 'demo-user', name: 'The Times Digital', billing_cycle: 'Monthly', amount: 26.00, next_charge_date: '2026-05-01', notes: 'Subscriber since 2019.' },
]

export const DEMO_ALERTS = [
  { id: '1', user_id: 'demo-user', title: 'NHS Medical Record is expiring soon', detail: 'Your NHS Summary Health Record expires June 2025. Update it to keep your medical information current.', severity: 'warning', is_read: false, created_at: '2026-04-20T09:00:00Z' },
  { id: '2', user_id: 'demo-user', title: 'Solicitor invite still pending', detail: 'David Rahman has not yet accepted his invitation. Consider resending or following up directly.', severity: 'info', is_read: false, created_at: '2026-04-18T14:00:00Z' },
  { id: '3', user_id: 'demo-user', title: 'Plan readiness below 80%', detail: 'Your plan is currently at 76%. Adding 2 more items will bring it above the recommended threshold.', severity: 'info', is_read: true, created_at: '2026-04-15T10:00:00Z' },
]

export const DEMO_ACTIVITY = [
  { id: '1', user_id: 'demo-user', action: 'document.uploaded', resource_name: 'Aviva Life Insurance Policy', created_at: '2026-04-22T16:30:00Z', metadata: {} },
  { id: '2', user_id: 'demo-user', action: 'person.invited', resource_name: 'David Rahman', created_at: '2026-04-20T11:00:00Z', metadata: {} },
  { id: '3', user_id: 'demo-user', action: 'account.updated', resource_name: 'Vanguard — Stocks & Shares ISA', created_at: '2026-04-18T09:45:00Z', metadata: {} },
  { id: '4', user_id: 'demo-user', action: 'instruction.created', resource_name: 'First 48 hours — what to do immediately', created_at: '2026-04-15T14:00:00Z', metadata: {} },
  { id: '5', user_id: 'demo-user', action: 'account.created', resource_name: 'Coinbase — Crypto Wallet', created_at: '2026-04-12T10:20:00Z', metadata: {} },
]

export const DEMO_MESSAGES = [
  {
    id: '1',
    user_id: 'demo-user',
    recipient_name: 'Carol Thornton',
    recipient_role: 'Primary Executor',
    title: 'To my wife Carol',
    type: 'video',
    content: null,
    video_url: null,
    thumbnail_url: null,
    released: true,
    released_at: '2026-04-01T10:00:00Z',
    released_by: 'owner',
    created_at: '2026-03-10T09:00:00Z',
    updated_at: '2026-03-10T09:00:00Z',
  },
  {
    id: '2',
    user_id: 'demo-user',
    recipient_name: 'Emily Thornton',
    recipient_role: 'Family Member',
    title: 'A message for Emily, with love',
    type: 'note',
    content: 'Emily, by the time you read this, I hope you know how proud I have always been of you. The courage and warmth you show the world every day is extraordinary. Take care of your mum, and know that everything I have done has been with you in mind. There is a letter in the top drawer of my desk — please read it when you are ready. All my love, Dad.',
    video_url: null,
    thumbnail_url: null,
    released: false,
    released_at: null,
    released_by: null,
    created_at: '2026-02-14T11:00:00Z',
    updated_at: '2026-02-14T11:00:00Z',
  },
  {
    id: '3',
    user_id: 'demo-user',
    recipient_name: 'David Rahman',
    recipient_role: 'Solicitor',
    title: 'Notes for David — estate priorities',
    type: 'note',
    content: 'David, my primary concern is that the property at 14 Kensington Road passes to Carol without delay. The mortgage is fully repaid. Please contact NatWest directly — I have left their details in the Accounts section. The crypto holdings on Coinbase are secondary; the hardware wallet is in the home safe. Please coordinate with Sophie Carter on the IHT planning — she has all the background. Thank you for everything.',
    video_url: null,
    thumbnail_url: null,
    released: false,
    released_at: null,
    released_by: null,
    created_at: '2026-01-28T15:30:00Z',
    updated_at: '2026-01-28T15:30:00Z',
  },
]

// Messages released to Carol Thornton (delegate view — released manually or on death)
export const DEMO_DELEGATE_MESSAGES = DEMO_MESSAGES.filter(m =>
  m.recipient_name === 'Carol Thornton' && m.released
)

export const DEMO_DELEGATE = {
  invite: {
    id: 'demo-invite',
    name: 'Carol Thornton',
    email: 'carol.thornton@example.com',
    role: 'Primary Executor',
    invite_status: 'accepted',
    accepted_at: '2026-04-10T10:00:00Z',
    user_id: 'demo-user',
    access_grants: [
      { id: 'g1', resource_type: 'documents', resource_category: '' },
      { id: 'g2', resource_type: 'accounts', resource_category: '' },
      { id: 'g3', resource_type: 'instructions', resource_category: '' },
    ],
  },
  owner: {
    full_name: 'James Thornton',
    email: 'james.thornton@example.com',
    plan: 'family',
    // Set to 'deceased' to simulate auto-release after death is validated by Everstead team.
    // In production this field is set server-side when the death report is approved.
    owner_status: 'active', // change to 'deceased' to see auto-release behaviour
  },
}

// ─────────────────────────────────────────────────────────────
// ADVISOR PORTAL DEMO DATA
// ─────────────────────────────────────────────────────────────

export const DEMO_ADVISOR = {
  id: 'demo-advisor',
  full_name: 'Sophie Carter',
  email: 'sophie.carter@carterwealthmanagement.co.uk',
  firm: 'Carter Wealth Management',
  role: 'Financial Adviser',
  plan: 'advisor',
  families_limit: 5,
  subscription_status: 'active',
  billing_cycle: 'yearly',
  next_billing_date: '2027-04-26',
  plan_started_at: '2026-04-26',
}

export const DEMO_ADVISOR_FAMILIES = [
  {
    id: 'f1',
    owner_id: 'demo-user',
    owner_name: 'James Thornton',
    owner_email: 'james.thornton@example.com',
    plan: 'family',
    readiness_score: 76,
    invite_status: 'accepted',
    advisor_role: 'Financial Adviser',
    last_updated: '2026-04-22T16:30:00Z',
    accounts: [
      { id: 'a1', institution: 'Barclays', account_type: 'Current Account', category: 'Banking', account_number_hint: '4821', balance_display: '£8,450', notes: 'Primary day-to-day account.' },
      { id: 'a2', institution: 'Vanguard', account_type: 'Stocks & Shares ISA', category: 'Investment', account_number_hint: '7714', balance_display: '£41,200', notes: 'Long-term investment portfolio.' },
      { id: 'a3', institution: 'Nest', account_type: 'Workplace Pension', category: 'Retirement', account_number_hint: '0092', balance_display: '£87,300', notes: 'Employer auto-enrolment pension.' },
    ],
    documents: [
      { id: 'd1', name: 'Last Will & Testament', doc_type: 'Legal', status: 'current', updated_at: '2024-06-15T10:00:00Z', file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', file_type: 'pdf' },
      { id: 'd2', name: 'Lasting Power of Attorney (Property)', doc_type: 'Legal', status: 'current', updated_at: '2024-03-10T10:00:00Z', file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', file_type: 'pdf' },
      { id: 'd3', name: 'Aviva Life Insurance Policy', doc_type: 'Insurance', status: 'current', updated_at: '2023-11-20T10:00:00Z', file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', file_type: 'pdf' },
    ],
    instructions: [
      { id: 'i1', title: 'First 48 hours — what to do immediately', category: 'Urgent', audience: 'Executor', steps_count: 7 },
      { id: 'i2', title: 'IHT planning notes', category: 'Financial', audience: 'Adviser', steps_count: 4 },
    ],
    alerts: [
      { id: 'al1', title: 'NHS Medical Record expiring soon', severity: 'warning', is_read: false },
      { id: 'al2', title: 'Plan readiness below 80%', severity: 'info', is_read: false },
    ],
    trusted_people: [
      { id: 'p1', name: 'Carol Thornton', role: 'Primary Executor', invite_status: 'accepted' },
      { id: 'p2', name: 'Emily Thornton', role: 'Family Member', invite_status: 'accepted' },
      { id: 'p3', name: 'Sophie Carter', role: 'Financial Adviser', invite_status: 'accepted' },
    ],
    advisor_permissions: {
      accounts: true,
      documents: true,
      instructions: false,
      people: false,
      alerts: true,
    },
    activity_log: [
      { id: 'act1', action: 'document.uploaded', resource_name: 'Aviva Life Insurance Policy', created_at: '2026-04-22T16:30:00Z' },
      { id: 'act2', action: 'account.updated', resource_name: 'Vanguard ISA', created_at: '2026-04-20T11:00:00Z' },
      { id: 'act3', action: 'instruction.created', resource_name: 'First 48 hours', created_at: '2026-04-15T14:00:00Z' },
      { id: 'act4', action: 'person.invited', resource_name: 'Emily Thornton', created_at: '2026-04-10T09:00:00Z' },
      { id: 'act5', action: 'account.created', resource_name: 'Coinbase Wallet', created_at: '2026-03-28T10:20:00Z' },
    ],
    advisor_notes: 'Pension nomination form needs updating — discuss in June review. IHT threshold likely to be an issue given property value.',
    next_review_date: '2026-06-15',
    meeting_notes: '26 Apr 2026: Discussed LPA registration. Client confirmed Carol is primary attorney. Will follow up on pension nomination next time.',
  },
  {
    id: 'f2',
    owner_id: 'demo-user-2',
    owner_name: 'Margaret & Robert Okafor',
    owner_email: 'r.okafor@example.com',
    plan: 'family',
    readiness_score: 91,
    invite_status: 'accepted',
    advisor_role: 'Financial Adviser',
    last_updated: '2026-04-19T11:00:00Z',
    accounts: [
      { id: 'a4', institution: 'Lloyds', account_type: 'Current Account', category: 'Banking', account_number_hint: '2291', balance_display: '£14,300', notes: 'Joint account.' },
      { id: 'a5', institution: 'Scottish Widows', account_type: 'Pension', category: 'Retirement', account_number_hint: '8834', balance_display: '£213,000', notes: 'Robert primary pension.' },
      { id: 'a6', institution: 'Hargreaves Lansdown', account_type: 'SIPP', category: 'Retirement', account_number_hint: '5541', balance_display: '£98,400', notes: 'Margaret SIPP.' },
    ],
    documents: [
      { id: 'd4', name: 'Mirror Wills', doc_type: 'Legal', status: 'current', updated_at: '2025-01-10T10:00:00Z', file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', file_type: 'pdf' },
      { id: 'd5', name: 'Joint LPA — Property & Finance', doc_type: 'Legal', status: 'current', updated_at: '2025-01-10T10:00:00Z', file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', file_type: 'pdf' },
    ],
    instructions: [
      { id: 'i3', title: 'Estate administration checklist', category: 'Legal', audience: 'Executor', steps_count: 9 },
    ],
    alerts: [],
    trusted_people: [
      { id: 'p4', name: 'Robert Okafor', role: 'Spouse / Partner', invite_status: 'accepted' },
      { id: 'p5', name: 'Sophie Carter', role: 'Financial Adviser', invite_status: 'accepted' },
    ],
    advisor_permissions: {
      accounts: true,
      documents: true,
      instructions: true,
      people: true,
      alerts: true,
    },
    activity_log: [
      { id: 'act6', action: 'document.uploaded', resource_name: 'Mirror Wills', created_at: '2026-04-19T11:00:00Z' },
      { id: 'act7', action: 'account.created', resource_name: 'Scottish Widows Pension', created_at: '2026-04-05T09:30:00Z' },
    ],
    advisor_notes: 'Very organised couple. Review IHT position annually — combined estate well above threshold.',
    next_review_date: '2026-07-10',
    meeting_notes: '19 Apr 2026: Annual review complete. Both wills updated. LPA in place for both.',
  },
  {
    id: 'f3',
    owner_id: 'demo-user-3',
    owner_name: 'Patricia Yuen',
    owner_email: 'p.yuen@example.com',
    plan: 'essential',
    readiness_score: 54,
    invite_status: 'pending',
    advisor_role: 'Financial Adviser',
    last_updated: null,
    accounts: [],
    documents: [],
    instructions: [],
    alerts: [
      { id: 'al3', title: 'Invite not yet accepted', severity: 'warning', is_read: false },
    ],
    trusted_people: [],
    activity_log: [],
    advisor_notes: '',
    next_review_date: '',
    meeting_notes: '',
  },
]

// ─────────────────────────────────────────────────────────────
// DEMO REPORTS (death + incident) — used in admin panel demo
// ─────────────────────────────────────────────────────────────
export const DEMO_REPORTS = [
  {
    id: 'r1',
    type: 'death',
    status: 'pending',
    submitted_at: '2026-04-25T09:14:00Z',
    owner_name: 'James Thornton',
    owner_email: 'james.thornton@example.com',
    owner_plan: 'family',
    reporter_name: 'Carol Thornton',
    reporter_email: 'carol.thornton@example.com',
    reporter_phone: '+44 7700 900142',
    reporter_role: 'Primary Executor',
    relationship: 'Spouse / Partner',
    date_of_death: '2026-04-24',
    place_of_death: 'London, United Kingdom',
    death_cert_number: '',
    additional_notes: 'Death certificate is being processed. Will upload as soon as available.',
    supporting_doc: null,
    timeline: [
      { at: '2026-04-25T09:14:00Z', event: 'Report submitted by Carol Thornton' },
    ],
  },
  {
    id: 'r2',
    type: 'incident',
    status: 'pending',
    submitted_at: '2026-04-23T14:32:00Z',
    owner_name: 'Margaret Okafor',
    owner_email: 'margaret.okafor@example.com',
    owner_plan: 'essential',
    reporter_name: 'Robert Okafor',
    reporter_email: 'r.okafor@example.com',
    reporter_phone: '+44 7911 123456',
    reporter_role: 'Family Member',
    relationship: 'Spouse / Partner',
    incident_type: 'Medical emergency (hospitalisation)',
    incident_date: '2026-04-22',
    location: "St Thomas' Hospital, London",
    description: 'Margaret suffered a severe stroke on the morning of 22 April and is currently in the ICU. She is unable to communicate or make decisions.',
    access_reason: 'Need access to insurance policy documents and banking details to manage ongoing bills and initiate the insurance claim.',
    supporting_doc: null,
    timeline: [
      { at: '2026-04-23T14:32:00Z', event: 'Report submitted by Robert Okafor' },
    ],
  },
  {
    id: 'r3',
    type: 'death',
    status: 'verified',
    submitted_at: '2026-04-10T11:00:00Z',
    owner_name: 'Patricia Yuen',
    owner_email: 'p.yuen@example.com',
    owner_plan: 'essential',
    reporter_name: 'Philip Yuen',
    reporter_email: 'philip.yuen@example.com',
    reporter_phone: '+44 7800 654321',
    reporter_role: 'Primary Executor',
    relationship: 'Child',
    date_of_death: '2026-04-09',
    place_of_death: 'Manchester, United Kingdom',
    death_cert_number: 'MC-2026-041892',
    additional_notes: '',
    supporting_doc: 'death_cert_yuen.pdf',
    timeline: [
      { at: '2026-04-10T11:00:00Z', event: 'Report submitted by Philip Yuen' },
      { at: '2026-04-11T09:22:00Z', event: 'Document verified by admin' },
      { at: '2026-04-11T09:25:00Z', event: 'Status updated to Verified — delegate access unlocked' },
    ],
  },
  {
    id: 'r4',
    type: 'incident',
    status: 'actioned',
    submitted_at: '2026-03-28T08:45:00Z',
    owner_name: 'David Hartley',
    owner_email: 'david.hartley@example.com',
    owner_plan: 'family',
    reporter_name: 'Susan Hartley',
    reporter_email: 'susan.hartley@example.com',
    reporter_phone: '+44 7733 987654',
    reporter_role: 'Family Caretaker',
    relationship: 'Spouse / Partner',
    incident_type: 'Degenerative condition (e.g. dementia)',
    incident_date: '2026-03-15',
    location: 'Addenbrooke\'s Hospital, Cambridge',
    description: 'David was formally diagnosed with advanced Alzheimer\'s on 15 March. He can no longer manage his own affairs.',
    access_reason: 'LPA has been registered. Need to access all financial accounts and insurance documents to begin estate management.',
    supporting_doc: 'lpa_hartley.pdf',
    timeline: [
      { at: '2026-03-28T08:45:00Z', event: 'Report submitted by Susan Hartley' },
      { at: '2026-03-29T10:10:00Z', event: 'Admin requested LPA document — email sent to reporter' },
      { at: '2026-03-30T14:00:00Z', event: 'LPA document received and verified' },
      { at: '2026-03-30T14:15:00Z', event: 'Status updated to Actioned — full access released' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// LIVE REPORT STORE — in-memory queue shared between delegate
// dashboard submissions and the admin panel. Resets on page
// refresh (acceptable for demo purposes).
// ─────────────────────────────────────────────────────────────
let _liveReports = [...DEMO_REPORTS]

export function getLiveReports() { return _liveReports }

export function submitReport(payload) {
  const report = {
    id: `r${Date.now()}`,
    status: 'pending',
    submitted_at: new Date().toISOString(),
    supporting_doc: null,
    timeline: [
      { at: new Date().toISOString(), event: `Report submitted by ${payload.reporter_name}` },
    ],
    ...payload,
  }
  _liveReports = [report, ..._liveReports]
  return report
}

export function updateReportStatus(id, status, timelineEvent) {
  _liveReports = _liveReports.map(r =>
    r.id !== id ? r : {
      ...r,
      status,
      timeline: [...r.timeline, { at: new Date().toISOString(), event: timelineEvent }],
    }
  )
}

// ─────────────────────────────────────────────────────────────
// OWNER STATUS STORE — tracks suspended/incapacitated owners
// keyed by owner_email (demo proxy for user_id).
// In production this maps to a profiles.owner_status column.
// ─────────────────────────────────────────────────────────────
const _ownerStatuses = {}  // { [owner_email]: 'active' | 'deceased' | 'incapacitated' }

export function getOwnerStatus(ownerEmail) {
  return _ownerStatuses[ownerEmail] ?? 'active'
}

export function setOwnerStatus(ownerEmail, status) {
  _ownerStatuses[ownerEmail] = status
}

// Called by admin panel when a report is verified.
// Sets the owner's status and unlocks all 'after_death' access grants
// for their trusted people (represented here as a store-level flag).
export function verifyReport(reportId) {
  const report = _liveReports.find(r => r.id === reportId)
  if (!report) return

  const newOwnerStatus = report.type === 'death' ? 'deceased' : 'incapacitated'
  setOwnerStatus(report.owner_email, newOwnerStatus)

  // Mark the report verified + add to timeline
  updateReportStatus(reportId, 'verified',
    `Report verified — owner status set to "${newOwnerStatus}" and after-death access grants unlocked`)
}
