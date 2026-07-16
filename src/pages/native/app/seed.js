// Seed data for the Everstead mobile app prototype — verbatim from the design
// handoff (Everstead App.dc.html). Mock/local only; no backend yet.

export const SEED_TASKS = [
  { id: 1, sec: 'Will & wishes',    label: 'Write or upload your will',        done: true },
  { id: 2, sec: 'Will & wishes',    label: 'Record your funeral wishes',       done: false },
  { id: 3, sec: 'Will & wishes',    label: 'Set up Lasting Power of Attorney',  done: false },
  { id: 4, sec: 'Money & accounts', label: 'Add your current accounts',        done: true },
  { id: 5, sec: 'Money & accounts', label: 'Add pensions & investments',       done: true },
  { id: 6, sec: 'Money & accounts', label: 'List regular bills & subscriptions', done: false },
  { id: 7, sec: 'For your family',  label: 'Invite a trusted contact',         done: true },
  { id: 8, sec: 'For your family',  label: 'Assign an executor',               done: false },
  { id: 9, sec: 'For your family',  label: 'Write letters to loved ones',      done: false },
]

export const SEED_ACCOUNTS = [
  { id: 1, cat: 'Banking',                 name: 'Monzo',           detail: 'Current account ··2841' },
  { id: 2, cat: 'Banking',                 name: 'NatWest',         detail: 'Cash ISA ··7710' },
  { id: 3, cat: 'Pensions & investments',  name: 'Aviva',           detail: 'Workplace pension' },
  { id: 4, cat: 'Pensions & investments',  name: 'Vanguard',        detail: 'Stocks & Shares ISA' },
  { id: 5, cat: 'Insurance',               name: 'Legal & General', detail: 'Life insurance · joint' },
  { id: 6, cat: 'Bills & subscriptions',   name: 'Octopus Energy',  detail: 'Dual fuel · monthly' },
  { id: 7, cat: 'Bills & subscriptions',   name: 'Netflix',         detail: '£10.99 / month' },
]

export const SEED_DOCS = [
  { id: 1, name: 'Will',                  detail: 'Updated March 2026',        status: 'Up to date',  good: true },
  { id: 2, name: 'Property deeds',        detail: '14 Elm Road, Bristol',      status: 'Up to date',  good: true },
  { id: 3, name: 'Life insurance policy', detail: 'Legal & General',           status: 'Uploaded',    good: false },
  { id: 4, name: 'Passports',             detail: 'Eleanor · expires Nov 2026', status: 'Review soon', good: false },
]

export const SEED_MEMBERS = [
  { id: 1, name: 'Eleanor Whitmore', rel: 'You · Owner',        access: 'Full access',    pending: false },
  { id: 2, name: 'Tom Whitmore',     rel: 'Partner',            access: 'Full access',    pending: false },
  { id: 3, name: 'Priya Shah',       rel: 'Sister · Executor',  access: 'Emergency only', pending: false },
]

export const SEED_ACTIVITY = [
  { id: 1, txt: 'Tom uploaded “Life insurance policy”',       when: '2d ago' },
  { id: 2, txt: 'You completed “Add pensions & investments”', when: '5d ago' },
  { id: 3, txt: 'Priya accepted your invite',                          when: '1w ago' },
]

export const ACCOUNT_CATEGORIES = ['Banking', 'Pensions & investments', 'Insurance', 'Bills & subscriptions']
export const PLAN_SECTIONS = ['Will & wishes', 'Money & accounts', 'For your family']
export const ACCESS_OPTIONS = ['Full access', 'Emergency only']
