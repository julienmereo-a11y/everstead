// ─────────────────────────────────────────────────────────────────────────────
// Geo entry routing: send visitors in France to the French tree.
//
// Runs at Vercel's edge before the SPA rewrite. Deliberately conservative,
// because IP-based redirects are the classic way to wreck international SEO:
//
//  1. ONLY the bare root "/" is matched. Someone who clicked an English result
//     in Google, or any deep link, lands exactly where they asked. hreflang
//     (emitted by src/components/HreflangLinks.jsx) is what tells Google to
//     show /fr results to French searchers; that is the supported mechanism,
//     this redirect is only a convenience for people typing the domain.
//  2. Bots are never redirected. Googlebot crawls mostly from US IPs, but any
//     crawler bounced around by geo would index the wrong tree.
//  3. An explicit choice wins. The footer language link sets everstead_lang,
//     so "English" on a French page sticks instead of bouncing back to /fr.
//  4. 307, never 301: the root's canonical content is English, and a cached
//     permanent redirect would be very hard to undo.
//  5. Query strings are preserved (referral and promo links land on the root).
//
// UK, Ireland and everywhere else fall through to the English site.
// ─────────────────────────────────────────────────────────────────────────────

export const config = { matcher: '/' }

// Countries served the French tree. France only for now: the content is
// France-specific (notaire, assurance-vie, réserve héréditaire), so sending
// Belgium or Switzerland here would promise law we do not cover.
const FRENCH_TREE_COUNTRIES = new Set(['FR'])

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegram|discord|lighthouse|headless/i

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || ''
  if (BOT_RE.test(ua)) return

  // Someone who has already chosen a language keeps it.
  const cookie = request.headers.get('cookie') || ''
  if (/(?:^|;\s*)everstead_lang=/.test(cookie)) return

  const country = request.headers.get('x-vercel-ip-country') || ''
  if (!FRENCH_TREE_COUNTRIES.has(country.toUpperCase())) return

  const url = new URL(request.url)
  url.pathname = '/fr'
  return Response.redirect(url.toString(), 307)
}
