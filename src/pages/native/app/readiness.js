// Estate-readiness score — mirrors the web Dashboard's client-side computation
// EXACTLY (src/pages/Dashboard.jsx). There is no server-side score; both web and
// mobile derive it from real data counts so the two always agree.
//
// Four equally-weighted metrics, each a completion ratio capped at 1.0, averaged,
// then penalised 5% per critical alert (max 15%).

export function readinessStats({ accounts = [], documents = [], people = [], instructions = [], isFamilyPlus = false }) {
  return [
    { key: 'accounts',     label: 'Accounts documented',                         value: accounts.length,                                          target: 5 },
    { key: 'documents',    label: 'Documents uploaded',                          value: documents.filter(d => d.status !== 'missing').length,     target: 5 },
    { key: 'people',       label: isFamilyPlus ? 'Trusted people' : 'Trusted contacts', value: people.length,                                    target: isFamilyPlus ? 5 : 2 },
    { key: 'instructions', label: 'Instructions written',                        value: instructions.length,                                      target: 3 },
  ]
}

export function computeReadiness({ accounts, documents, people, instructions, criticalAlertCount = 0, isFamilyPlus = false }) {
  const stats = readinessStats({ accounts, documents, people, instructions, isFamilyPlus })
  const scoreBase = stats.reduce((total, s) => total + Math.min(s.value / s.target, 1), 0) / stats.length
  const alertPenalty = Math.min(criticalAlertCount * 5, 15)
  const score = Math.max(0, Math.round(scoreBase * 100) - alertPenalty)
  return { score, stats }
}
