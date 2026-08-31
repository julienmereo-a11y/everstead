process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_pretend_key_for_tests_only'
const m = await import(new URL('../api/_lib/mfa-crypto.js', import.meta.url).href)
const { sealToken, openToken, hashCode, codeMatches } = m

let pass = 0, fail = 0
const ok = (name, cond) => { cond ? (pass++, console.log('  ok   ' + name)) : (fail++, console.log('  FAIL ' + name)) }

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.some.refresh-token-value'

const sealed = sealToken(TOKEN)
ok('sealed value is not the plaintext',        sealed !== TOKEN)
ok('sealed value does not contain plaintext',  !sealed.includes('refresh-token-value'))
ok('sealed value is versioned',                sealed.startsWith('v1:'))
ok('round trip returns the original',          openToken(sealed) === TOKEN)

const again = sealToken(TOKEN)
ok('same input seals differently (random iv)', again !== sealed)
ok('both open to the same plaintext',          openToken(again) === TOKEN)

// tampering
const [p, iv, tag, ct] = sealed.split(':')
const flipped = Buffer.from(ct, 'base64'); flipped[0] ^= 0xff
ok('tampered ciphertext is rejected',          openToken([p, iv, tag, flipped.toString('base64')].join(':')) === null)
ok('tampered tag is rejected',                 openToken([p, iv, Buffer.alloc(16).toString('base64'), ct].join(':')) === null)

// The migration fallback is gone (2026-08-28). Anything not in the v1 format
// is refused rather than trusted, so a dumped row cannot be replayed as-is.
ok('unsealed token is refused, not trusted',   openToken(TOKEN) === null)
ok('random string is refused',                 openToken('not-a-sealed-value') === null)

// codes
const h = hashCode('123456', 'Jane@Example.com ')
ok('code hash is not the code',                h !== '123456')
ok('code hash is hex sha256 length',           /^[0-9a-f]{64}$/.test(h))
ok('email is normalised into the hash',        h === hashCode('123456', 'jane@example.com'))
ok('correct code matches',                     codeMatches('123456', h, 'jane@example.com'))
ok('wrong code does not match',                !codeMatches('123457', h, 'jane@example.com'))
ok('right code, wrong email does not match',   !codeMatches('123456', h, 'someone@else.com'))
ok('plaintext code is no longer accepted',     !codeMatches('123456', '123456', 'jane@example.com'))
ok('short stored value never matches',         !codeMatches('999999', '123456', 'jane@example.com'))
ok('a truncated hash never matches',           !codeMatches(h, h.slice(0, 12), 'jane@example.com'))
ok('empty stored code never matches',          !codeMatches('123456', '', 'jane@example.com'))
ok('null stored code never matches',           !codeMatches('123456', null, 'jane@example.com'))

console.log(`\n  ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
