// Guards the native app's French.
//
// The whole native UI was hardcoded English until 2026-08-27 while the app
// SHIPPED French locale files and a detector — nothing consulted them. This
// check makes that class of regression fail the build, two ways:
//
//  1. Key parity: every key present in en/mobile.json must exist in
//     fr/mobile.json and vice versa, with no empty values (an empty string
//     falls back to English silently: returnEmptyString is false).
//  2. No new hardcoded UI strings in the native tree: JSX text nodes that look
//     like English sentences fail the build unless allowlisted.
import { readFile } from 'node:fs/promises'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const failures = []

// ── 1. key parity ────────────────────────────────────────────────────────────
const en = JSON.parse(await readFile(ROOT + 'src/i18n/locales/en/mobile.json', 'utf8'))
const fr = JSON.parse(await readFile(ROOT + 'src/i18n/locales/fr/mobile.json', 'utf8'))
const flat = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]])
const enMap = new Map(flat(en)), frMap = new Map(flat(fr))
for (const k of enMap.keys()) if (!frMap.has(k)) failures.push(`fr/mobile.json is missing "${k}"`)
for (const k of frMap.keys()) if (!enMap.has(k)) failures.push(`en/mobile.json is missing "${k}"`)
for (const [k, v] of frMap) if (v === '' && enMap.get(k) !== '') failures.push(`fr/mobile.json "${k}" is empty (falls back to English silently)`)

// ── 2. hardcoded UI strings in native screens ────────────────────────────────
// JSX text nodes: >Some English words<. Attribute strings are too noisy to gate;
// text nodes are where regressions actually land.
const ALLOW = new Set([
  'Everstead', 'Everstead+', 'English', 'Français', 'OK', 'FR', 'EN',
])
const files = []
const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f)
  if (statSync(p).isDirectory()) walk(p); else if (/\.jsx?$/.test(f)) files.push(p) } }
walk(ROOT + 'src/pages/native')
walk(ROOT + 'src/components/native')

const TEXT_NODE = />\s*([A-Z][A-Za-z][^<>{}\n]{2,80}?)\s*</g
for (const file of files) {
  // The App Review demo persona (Eleanor's fictional estate) is deliberately
  // English; reviewers review in English and the data is not UI.
  if (file.endsWith('MobileAppDemo.jsx') || file.endsWith('seed.js')) continue
  const src = await readFile(file, 'utf8')
  for (const line of src.split('\n')) {
    const t = line.trim()
    if (t.startsWith('//') || t.startsWith('*')) continue
    for (const m of t.matchAll(TEXT_NODE)) {
      const text = m[1].trim()
      if (ALLOW.has(text)) continue
      if (!/[a-z] [a-z]/.test(text) && text.split(' ').length < 2) continue // single tokens: class-ish
      failures.push(`${path.relative(ROOT, file)}: hardcoded JSX text "${text}" (use the mobile namespace)`)
    }
  }
}

// ── 3. every t()/i18n.t() key used in the native tree must exist ─────────────
// A missing key renders AS THE KEY ("settings.title" on screen), silently.
const KEY_RE = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]|i18n\.t\(\s*['"]mobile:([a-zA-Z0-9_.]+)['"]/g
const plural = (k) => enMap.has(k) || enMap.has(k + '_one') || enMap.has(k + '_other')
for (const file of files) {
  const src = await readFile(file, 'utf8')
  for (const m of src.matchAll(KEY_RE)) {
    const key = m[1] || m[2]
    if (!key || !key.includes('.')) continue
    if (key.endsWith('.')) {
      // Dynamic key: t('tabs.' + k). Assert the section itself exists.
      const section = key.slice(0, -1)
      if (!(section in en)) failures.push(`${path.relative(ROOT, file)}: t('${key}…') section "${section}" not in mobile.json`)
      continue
    }
    if (!plural(key)) failures.push(`${path.relative(ROOT, file)}: t('${key}') has no entry in mobile.json`)
  }
}

if (failures.length) {
  console.error('\n  Native i18n check failed:\n')
  for (const f of failures) console.error('    ' + f)
  console.error('')
  process.exit(1)
}
console.log(`native i18n OK: ${enMap.size} keys, en/fr in parity, no hardcoded screen text`)
