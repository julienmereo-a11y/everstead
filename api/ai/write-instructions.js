import Anthropic from '@anthropic-ai/sdk'
import { aiGuard } from '../_lib/ai-guard.js'
import { withSentry, captureException } from '../_lib/sentry.js'
import { jurisdictionNote } from '../_lib/jurisdiction.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const blocked = await aiGuard(req)
  if (blocked) return res.status(blocked.status).json({ error: blocked.error })

  const { purpose, recipient, firstSteps, resources, additional, userName, country, assetCountries, lang } = req.body

  if (!purpose) return res.status(400).json({ error: 'Missing required field: purpose' })

  const systemPrompt = `You are a compassionate writing assistant helping someone create clear, practical instructions for their family or executor as part of their Everstead estate plan vault.

Your job is to write warm, step-by-step instructions that a grieving or stressed loved one can actually follow. The instructions should feel personal, not clinical.

${jurisdictionNote({ country, assetCountries, lang })}

Rules:
- Write in the user's language: British English when English, French written for France when French
- Never use em dashes or en dashes; use commas, full stops, colons or parentheses instead
- Structure as a short intro paragraph followed by numbered steps
- Be specific and actionable, not "handle finances" but "contact our bank at the number on the card"
- Keep the total response between 150-300 words
- Sound like the person is speaking directly to their loved one
- Do not include a title in your response, just the body text starting with the intro paragraph`

  const userPrompt = `Please write instructions for my Everstead vault based on these details:

Purpose / what these instructions are for: ${purpose}
Who they are for: ${recipient || 'my family and executor'}
The first things they should do: ${firstSteps || 'Not specified'}
Useful resources, contacts, or account details to include: ${resources || 'Not specified'}
Any additional notes or wishes: ${additional || 'None'}
${userName ? `My name is ${userName}.` : ''}

Write these as warm, practical instructions in my voice, addressed directly to my loved ones.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    res.status(200).json({ instructions: message.content[0].text })
  } catch (error) {
    console.error('write-instructions error:', error)
    captureException(error, { endpoint: 'ai/write-instructions' })
    res.status(500).json({ error: 'Failed to write instructions. Please try again.' })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
