import Anthropic from '@anthropic-ai/sdk'
import { aiGuard } from '../_lib/ai-guard'
import { withSentry, captureException } from '../lib/sentry.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const blocked = await aiGuard(req)
  if (blocked) return res.status(blocked.status).json({ error: blocked.error })

  const { answers, firstName } = req.body
  // answers: { property, pension, lifeInsurance, bankAccounts, executor }

  if (!answers) return res.status(400).json({ error: 'Missing required field: answers' })

  const systemPrompt = `You are an estate planning assistant for Everstead, a UK family handoff platform.

Based on onboarding answers, extract structured data to pre-populate the user's vault.

Return a JSON object with exactly these fields:
- accounts: array of account objects to create. Each account object has:
  - name: string (descriptive name, e.g. "Barclays Current Account")
  - type: string (one of: bank, investment, pension, insurance, property, other)
  - institution: string (provider/institution name)
  - notes: string (any relevant details mentioned)
- people: array of person objects to create. Each person object has:
  - name: string
  - role: string (one of: executor, next_of_kin, solicitor, accountant, other)
  - notes: string (any details mentioned)
- onboardingSummary: string (1–2 warm sentences summarising what you've set up for them)

Rules:
- Only include entries where the user actually provided information (skip blanks or "none"/"not sure")
- Be generous with interpretation — if they say "I bank with Barclays" create a Barclays bank account entry
- For executor: if they name someone, add them as a person with role "executor"
- Keep notes brief and factual
- Return ONLY valid JSON — no markdown, no explanation`

  const userPrompt = `Here are the onboarding answers from ${firstName || 'this user'}:

Property: ${answers.property || 'Not provided'}
Pension: ${answers.pension || 'Not provided'}
Life insurance: ${answers.lifeInsurance || 'Not provided'}
Bank accounts: ${answers.bankAccounts || 'Not provided'}
Executor / trusted person: ${answers.executor || 'Not provided'}

Extract structured vault entries from these answers.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].text.trim()
    let result

    try {
      const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
      result = JSON.parse(jsonText)
    } catch {
      return res.status(500).json({ error: 'Could not process onboarding answers.' })
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('process-onboarding error:', error)
    captureException(err, { endpoint: 'ai/process-onboarding' })
    res.status(500).json({ error: 'Failed to process onboarding. Please try again.' })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
