import Anthropic from '@anthropic-ai/sdk'
import { aiGuard } from '../_lib/ai-guard'
import { withSentry, captureException } from '../lib/sentry.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const blocked = await aiGuard(req)
  if (blocked) return res.status(blocked.status).json({ error: blocked.error })

  const { authorName, recipientName, relationship, wants, gratitude, hopes } = req.body

  if (!recipientName) return res.status(400).json({ error: 'Missing required field: recipientName' })

  const systemPrompt = `You are a compassionate writing assistant helping someone write a heartfelt personal message for their Everstead vault — a letter their loved one will read after they are gone or unable to speak.

Write a warm, personal letter that sounds authentically human. This is one of the most meaningful things a person can leave behind.

Rules:
- Write in the first person, as if the author is speaking directly
- Length: 150–250 words — long enough to feel meaningful, short enough to stay focused
- Tone: warm, loving, personal — never formal or stiff
- Use British English naturally
- End with a warm, loving sign-off
- Do not include a salutation line at the top or a subject heading — start directly with the body
- Make it feel specific to this person and relationship, not generic`

  const userPrompt = `Please write a personal message for my Everstead vault with these details:

${authorName ? `My name: ${authorName}` : ''}
This message is for: ${recipientName}
Our relationship: ${relationship || 'Not specified'}
What I most want them to know: ${wants || 'Not specified'}
What I'm grateful for or want to apologise for: ${gratitude || 'Not specified'}
My hopes for their future: ${hopes || 'Not specified'}

Write this as a warm, heartfelt personal letter from me to ${recipientName}.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    res.status(200).json({ message: message.content[0].text })
  } catch (error) {
    console.error('write-message error:', error)
    captureException(err, { endpoint: 'ai/write-message' })
    res.status(500).json({ error: 'Failed to write message. Please try again.' })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
