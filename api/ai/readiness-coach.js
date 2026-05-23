import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { firstName, plan, stats } = req.body
  // stats: { accountsCount, documentsCount, contactsCount, instructionsCount, wishesCount }

  if (!stats) return res.status(400).json({ error: 'Missing required field: stats' })

  const { accountsCount = 0, documentsCount = 0, contactsCount = 0, instructionsCount = 0, wishesCount = 0 } = stats

  // Calculate a simple readiness score
  const maxAccounts = 5, maxDocs = 5, maxContacts = 2, maxInstructions = 3, maxWishes = 1
  const score = Math.round(
    (Math.min(accountsCount, maxAccounts) / maxAccounts * 35) +
    (Math.min(documentsCount, maxDocs) / maxDocs * 25) +
    (Math.min(contactsCount, maxContacts) / maxContacts * 20) +
    (Math.min(instructionsCount, maxInstructions) / maxInstructions * 15) +
    (Math.min(wishesCount, maxWishes) / maxWishes * 5)
  )

  const systemPrompt = `You are the Everstead readiness coach — a warm, practical assistant helping UK families get their estate plan in order.

Return a JSON object with exactly these fields:
- readinessScore: number (0–100, use the score provided)
- message: string (2–3 sentences, warm and personal, referencing their actual numbers)
- nextAction: string (one specific, concrete action they should take next — keep it brief)
- nextActionLabel: string (button label, 3–5 words, e.g. "Add a bank account")
- nextActionRoute: string (one of: accounts, documents, contacts, instructions, wishes, overview)

Rules:
- Use warm, clear British English
- Reference their actual numbers (e.g. "You've added 2 accounts so far")
- If score > 80: acknowledge it's looking great, suggest reviewing or adding personal messages
- If contactsCount < 1: make adding a trusted contact the top priority — it's urgent
- If accountsCount < 3: prioritise adding more accounts
- If instructionsCount === 0: encourage writing first instruction set as most impactful
- Return ONLY valid JSON — no markdown, no explanation`

  const userPrompt = `Here is the vault status for ${firstName || 'this user'} (${plan || 'Essential'} plan):
- Accounts documented: ${accountsCount}
- Documents uploaded: ${documentsCount}
- Trusted contacts: ${contactsCount}
- Instruction sets written: ${instructionsCount}
- Personal messages: ${wishesCount}
- Calculated readiness score: ${score}%

Give them personalised coaching and one specific next action.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].text.trim()
    let coaching

    try {
      const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
      coaching = JSON.parse(jsonText)
    } catch {
      return res.status(500).json({ error: 'Could not parse coaching response.' })
    }

    // Ensure score is included
    coaching.readinessScore = coaching.readinessScore ?? score

    res.status(200).json({ coaching })
  } catch (error) {
    console.error('readiness-coach error:', error)
    res.status(500).json({ error: 'Failed to generate coaching. Please try again.' })
  }
}
