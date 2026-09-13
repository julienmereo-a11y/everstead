// Jurisdiction context for the AI features.
//
// Language and country are different things: a French speaker in Brussels does
// not want French succession law, and an English speaker in Lyon does not want
// probate. Guidance is keyed on profiles.country (residence) plus
// profiles.asset_countries, never on the interface language. This returns a
// short paragraph for a system prompt. It is deliberately high level: the
// assistant explains the landscape and points to the right professional; it
// never gives legal or tax advice.

const NOTES = {
  'United Kingdom': 'Residence: United Kingdom. Default to England and Wales, and say so when Scotland or Northern Ireland differ (Scotland uses confirmation rather than probate, and registration has 8 days rather than 5). Key terms: probate or letters of administration, executor, Lasting Power of Attorney registered with the Office of the Public Guardian, Tell Us Once, inheritance tax (IHT400, tax due six months after the end of the month of death), death registration within 5 days. Pensions and life policies written in trust usually pass outside the estate by nomination.',
  'France': "Residence: France. Key terms (use the French words even when answering in English): notaire, who handles most successions; déclaration de succession within six months of the death (twelve if it occurred abroad); réserve héréditaire, which limits what can be given away from the children; assurance-vie, which usually passes outside the succession to the named beneficiaries; mandat de protection future for incapacity; death declared at the mairie within 24 hours; the right to decide what happens to online accounts (mort numérique). Recommend a notaire for anything specific.",
  'Belgium': 'Residence: Belgium. Key terms: notaire / notaris handles most successions; déclaration de succession within four months of a death in Belgium (longer if it occurred abroad); réserve héréditaire since the 2018 reform is half of the estate for the children together; inheritance tax (droits de succession / erfbelasting) is regional, so Flanders, Wallonia and Brussels have different rates; a lasting mandate (mandat extrajudiciaire / zorgvolmacht) covers incapacity; death declared at the commune. Recommend a notaire and say which region matters.',
  'Switzerland': 'Residence: Switzerland. Succession is largely cantonal in procedure: the certificate of heirs (certificat d’héritier / Erbschein) comes from the cantonal authority; the reserved portion (réserve héréditaire / Pflichtteil) was reduced by the 2023 reform (half for descendants, none for parents); the advance care directive (mandat pour cause d’inaptitude / Vorsorgeauftrag) is validated by the adult protection authority (APEA / KESB); inheritance tax is cantonal and spouses and descendants are often exempt. Always name the canton as the deciding factor and recommend a local notary or lawyer.',
  'Luxembourg': 'Residence: Luxembourg. Key terms: notaire; déclaration de succession within six months; réserve héréditaire; direct-line heirs are largely exempt from inheritance duties on the legal share; the mandat de protection future exists since 2020. Recommend a notaire.',
  'Ireland': 'Residence: Ireland. Key terms: Grant of Probate or Letters of Administration from the Probate Office; Enduring Power of Attorney registered with the Decision Support Service; Capital Acquisitions Tax with thresholds by relationship; death registered within three months. Recommend a solicitor.',
  'United States': 'Residence: United States. Probate, powers of attorney and estate tax vary by state; explain general principles, name the state as the deciding factor, and recommend a local estate attorney.',
  'Canada': 'Residence: Canada. Probate, powers of attorney and the treatment of the estate vary by province (Quebec uses the civil-law succession with a notaire); explain general principles, name the province as the deciding factor, and recommend a local notary or lawyer.',
}

const EU_REGULATION = new Set(['France', 'Belgium', 'Luxembourg', 'Germany', 'Netherlands', 'Spain', 'Italy', 'Portugal', 'Austria', 'Greece', 'Finland', 'Sweden', 'Poland'])

export function jurisdictionNote({ country, assetCountries = [], lang } = {}) {
  const home = country || (String(lang || '').slice(0, 2).toLowerCase() === 'fr' ? 'France' : 'United Kingdom')
  const lines = []
  lines.push(NOTES[home] || `Residence: ${home}. Succession, probate and powers of attorney follow local law; explain general principles only and recommend a local professional.`)
  const others = [...new Set((assetCountries || []).filter(c => c && c !== home))]
  if (others.length) {
    lines.push(`The member also holds assets in: ${others.join(', ')}. Cross-border estates are where families lose the most time: real estate usually follows the law of the country it sits in, and each country has its own paperwork and deadlines. ${EU_REGULATION.has(home) || others.some(c => EU_REGULATION.has(c)) ? 'For EU countries, the EU Succession Regulation (650/2012) generally applies one law to the whole estate, the law of habitual residence unless the person chose the law of their nationality; the United Kingdom, Ireland and Denmark are outside it.' : ''} Recommend a professional with cross-border experience for anything specific.`)
  }
  lines.push('Never give legal or tax advice; describe how things generally work, name the deadlines and the professional to see, and suggest what to record in the vault.')
  return lines.join('\n')
}

export const jurisdictionFor = (profile) => jurisdictionNote({ country: profile?.country, assetCountries: profile?.asset_countries, lang: profile?.language })
