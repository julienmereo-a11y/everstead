// Exercises detectDeviceLanguage() against the locale/timezone shapes real
// phones report. The France rules are easy to get subtly wrong (a bare "fr"
// language tag vs an "-FR" region subtag vs "frr"), so they are pinned here.
const mod = new URL('../src/lib/deviceLanguage.js', import.meta.url).href

let pass = 0, fail = 0
const ok = (n, c) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n)) }

async function detect({ languages = [], language, locale, timeZone = 'Europe/London' }) {
  // navigator is a getter-only global in Node, so redefine rather than assign.
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages, language: language ?? languages[0] },
    configurable: true, writable: true,
  })
  Object.defineProperty(globalThis, 'Intl', {
    value: { DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: locale ?? languages[0] ?? 'en-GB', timeZone }) }) },
    configurable: true, writable: true,
  })
  const { detectDeviceLanguage } = await import(mod + '?t=' + Math.random())
  return detectDeviceLanguage()
}

const realIntl = Intl

// French by language
ok('fr-FR iPhone in Paris',        await detect({ languages: ['fr-FR'], timeZone: 'Europe/Paris' }) === 'fr')
ok('fr-FR iPhone abroad',          await detect({ languages: ['fr-FR'], timeZone: 'America/New_York' }) === 'fr')
ok('fr-CA (Quebec)',               await detect({ languages: ['fr-CA'], timeZone: 'America/Toronto' }) === 'fr')
ok('bare fr',                      await detect({ languages: ['fr'],    timeZone: 'Europe/London' }) === 'fr')
ok('fr second in the list',        await detect({ languages: ['en-GB', 'fr-FR'], timeZone: 'Europe/London' }) === 'fr')

// French by region
ok('en-FR (English phone, France)', await detect({ languages: ['en-FR'], timeZone: 'Europe/London' }) === 'fr')
ok('de-FR (German phone, France)',  await detect({ languages: ['de-FR'], timeZone: 'Europe/Berlin' }) === 'fr')

// French by location
ok('en-GB phone in Paris',          await detect({ languages: ['en-GB'], timeZone: 'Europe/Paris' }) === 'fr')

// English
ok('en-GB in London',               await detect({ languages: ['en-GB'], timeZone: 'Europe/London' }) === 'en')
ok('en-US in New York',             await detect({ languages: ['en-US'], timeZone: 'America/New_York' }) === 'en')
ok('en-IE in Dublin',               await detect({ languages: ['en-IE'], timeZone: 'Europe/Dublin' }) === 'en')
ok('de-DE in Berlin',               await detect({ languages: ['de-DE'], timeZone: 'Europe/Berlin' }) === 'en')
ok('es-ES in Madrid',               await detect({ languages: ['es-ES'], timeZone: 'Europe/Madrid' }) === 'en')

// Traps
ok('frr (North Frisian) is not French', await detect({ languages: ['frr-DE'], timeZone: 'Europe/Berlin' }) === 'en')
ok('en-FRO-style junk is not French',   await detect({ languages: ['en-FRX'], timeZone: 'Europe/London' }) === 'en')
ok('af-ZA is not French',               await detect({ languages: ['af-ZA'], timeZone: 'Africa/Johannesburg' }) === 'en')
ok('no signals at all defaults to en',  await detect({ languages: [], language: undefined, locale: 'en-GB' }) === 'en')

// preferredAppLanguage(): the app follows the phone, the website must not.
// A non-null return on the web would hijack the /fr tree and break SEO.
async function preferred({ native, languages, timeZone = 'Europe/London' }) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages, language: languages[0] }, configurable: true, writable: true,
  })
  Object.defineProperty(globalThis, 'Intl', {
    value: { DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: languages[0], timeZone }) }) },
    configurable: true, writable: true,
  })
  globalThis.Capacitor = native ? { isNativePlatform: () => true } : undefined
  const { preferredAppLanguage } = await import(mod + '?t=' + Math.random())
  return preferredAppLanguage()
}

ok('web returns null (URL stays canonical), French phone',
   await preferred({ native: false, languages: ['fr-FR'], timeZone: 'Europe/Paris' }) === null)
ok('web returns null, English phone',
   await preferred({ native: false, languages: ['en-GB'] }) === null)
ok('app returns fr for a French phone',
   await preferred({ native: true, languages: ['fr-FR'], timeZone: 'Europe/Paris' }) === 'fr')
ok('app returns fr for an English phone in France',
   await preferred({ native: true, languages: ['en-GB'], timeZone: 'Europe/Paris' }) === 'fr')
ok('app returns en for an English phone in the UK',
   await preferred({ native: true, languages: ['en-GB'] }) === 'en')

delete globalThis.Capacitor
Object.defineProperty(globalThis, 'Intl', { value: realIntl, configurable: true, writable: true })
console.log(`\n  ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
