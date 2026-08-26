#!/usr/bin/env node
//
// Fails the build when a fact that has to live in more than one place stops
// agreeing with itself.
//
// Some constants genuinely cannot have a single home: the serverless runtime
// cannot import src/config/pricing.js (it reads import.meta.env at load), and
// Postgres cannot import JavaScript at all. The answer is not to give up on one
// source of truth, it is to make divergence impossible to ship. Every entry here
// is a fact with a designated OWNER and one or more MIRRORS that must match it.
//
// This has already bitten us once: the free tier's limits were raised in the
// database while every client still blocked at the old number, so the product
// refused what the database allowed. Add a case here whenever you are forced to
// write the same fact down twice.
//
// Run: node scripts/check-shared-constants.mjs   (also runs as part of `npm run build`)

import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const ROOT = new URL('..', import.meta.url).pathname

/** Load an ESM module that uses import.meta.env, by bundling it first. */
async function loadWithEnvStubbed(entry) {
  const result = await build({
    entryPoints: [ROOT + entry],
    bundle: true, write: false, format: 'esm', platform: 'neutral',
    define: { 'import.meta.env': '{}' },
  })
  const code = result.outputFiles[0].text
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
}

const failures = []
const check = (name, expected, actual) => {
  const e = JSON.stringify(expected), a = JSON.stringify(actual)
  if (e !== a) failures.push(`${name}\n      owner:  ${e}\n      mirror: ${a}`)
}

const pricing = await loadWithEnvStubbed('src/config/pricing.js')

// ── Fact 1: plan display names ──────────────────────────────────────────────
// Owner: src/config/pricing.js PLAN_LABELS
// Mirror: api/_lib/plan-label.js, which the whole API and every email uses.
{
  const server = await import(ROOT + 'api/_lib/plan-label.js')
  const mirrored = Object.fromEntries(
    Object.keys(pricing.PLAN_LABELS).map(k => [k, server.planLabel(k)])
  )
  check('PLAN_LABELS: api/_lib/plan-label.js has drifted from src/config/pricing.js',
        pricing.PLAN_LABELS, mirrored)
}

// ── Fact 2: free tier hard limits ───────────────────────────────────────────
// Owner: the DATABASE (free_tier_allows plus the restrictive INSERT policies).
// Mirror: src/config/pricing.js FREE_LIMITS, which every client gates on.
// We read the numbers back out of the migration that defines the function, so
// editing one side without the other stops the build.
{
  const sqlPath = 'api/migrations/free_tier_five_accounts_documents.sql'
  const sql = await readFile(ROOT + sqlPath, 'utf8')
  const limitFor = (kind) => {
    const m = sql.match(new RegExp(`p_kind = '${kind}'[\\s\\S]*?v_limit := (\\d+)`))
    return m ? Number(m[1]) : null
  }
  const fromSql = {
    accounts:      limitFor('accounts'),
    documents:     limitFor('documents'),
    trustedPeople: limitFor('trusted_people'),
  }
  if (Object.values(fromSql).some(v => v === null)) {
    failures.push(`FREE_LIMITS: could not read the limits out of ${sqlPath}.\n`
      + '      If the function moved to a newer migration, point this check at it.')
  } else {
    check(`FREE_LIMITS: src/config/pricing.js disagrees with ${sqlPath}`,
          fromSql, pricing.FREE_LIMITS)
  }
}

// ── Fact 3: the limits the CLIENT actually enforces ─────────────────────────
// PLANS.free.limits in src/lib/stripe.js is what isAtLimit() reads, so it is
// what every screen gates on, web and native. This is the exact pair that broke
// before: the database and FREE_LIMITS said 5 while PLANS still said 1, so the
// product refused what the database allowed. Checking FREE_LIMITS alone would
// not have caught it.
//
// We assert the DERIVATION rather than the value. A number copied across can
// drift; `FREE_LIMITS.accounts` cannot.
{
  const stripePath = 'src/lib/stripe.js'
  const src   = await readFile(ROOT + stripePath, 'utf8')
  const start = src.indexOf('free:', src.indexOf('export const PLANS'))
  const block = start === -1 ? '' : src.slice(start, src.indexOf('essential:', start))
  const wants = [['maxAccounts', 'FREE_LIMITS.accounts'],
                 ['maxDocuments', 'FREE_LIMITS.documents'],
                 ['trustedPeople', 'FREE_LIMITS.trustedPeople']]
  const wrong = wants.filter(([field, from]) =>
    !new RegExp(`${field}:\\s*${from.replace('.', '\\.')}\\b`).test(block))
  if (!block) {
    failures.push(`FREE_LIMITS: could not find the free plan in ${stripePath}.`)
  } else if (wrong.length) {
    failures.push(`PLANS.free.limits in ${stripePath} must derive from FREE_LIMITS, not hard-code numbers\n`
      + wrong.map(([f, from]) => `      ${f} should read \`${f}: ${from}\``).join('\n'))
  }
}

// ── Fact 4: the country lists ───────────────────────────────────────────────
// Owner: src/config/countries.js, the list the signup form renders.
// Mirror: api/_lib/countries.js, which decides who is allowed to register.
// A copy, because no api/ file imports from src/ and this one guards account
// creation. Drift here would let the form offer a country the server refuses,
// or worse, let the server accept one the product will not serve.
{
  const client = await loadWithEnvStubbed('src/config/countries.js')
  const server = await import(ROOT + 'api/_lib/countries.js')
  check('ACCEPTED_COUNTRIES: api/_lib/countries.js has drifted from src/config/countries.js',
        client.COUNTRIES.map(c => c.name).sort(), [...server.ACCEPTED_COUNTRIES].sort())
  check('RESTRICTED_COUNTRIES: api/_lib/countries.js has drifted from src/config/countries.js',
        [...client.RESTRICTED_COUNTRIES].sort(), [...server.RESTRICTED_COUNTRIES].sort())
}

if (failures.length) {
  console.error('\n  Shared constants have drifted:\n')
  for (const f of failures) console.error('    ' + f + '\n')
  console.error('  Fix the mirror, or update both sides deliberately.\n')
  process.exit(1)
}
console.log('shared constants agree')
