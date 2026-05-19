import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─────────────────────────────────────────────────────────────────────────────
// System prompts per feature type
// ─────────────────────────────────────────────────────────────────────────────

function readinessCoachPrompt(context) {
  const { score, accountCount, documentCount, contactCount, instructionCount, plan } = context
  return `You are the Everstead readiness coach — a warm, practical assistant helping UK families get their estate plan in order. You give specific, actionable advice based on what the user has actually done so far.

The user's current vault status:
- Readiness score: ${score}%
- Accounts documented: ${accountCount}
- Documents uploaded: ${documentCount}
- Trusted contacts: ${contactCount}
- Instruction sets written: ${instructionCount}
- Plan: ${plan}

Your task: Give them 3–4 specific, prioritised next steps tailored to their actual gaps. Be warm but direct. Focus on what matters most first (the highest-impact items they're missing). Don't lecture — just help.

Format your response as a short intro sentence, then a numbered list of specific actions. Each action should be 1–2 sentences, concrete and actionable. End with one sentence of encouragement.

Rules:
- Never be generic. Reference their actual numbers (e.g. "You have ${accountCount} account${accountCount === 1 ? '' : 's'} — aim for at least 5 to cover the key areas.")
- If score is above 80, acknowledge it's looking great and suggest polishing/reviewing
- If accounts < 3, make that the top priority
- If contacts < 1, flag that as urgent — someone needs to know this vault exists
- If instructions === 0, encourage it as the most personal and impactful part
- Keep total response under 200 words
- Use plain, warm British English`
}

function instructionsAssistantPrompt() {
  return `You are a compassionate writing assistant helping someone create clear, practical instructions for their family or executor as part of their Everstead vault.

Your role is to help them structure their thoughts into step-by-step instructions their loved ones can actually follow. You ask one or two focused questions at a time, then help them build out the instruction.

When the user describes what they want to communicate:
1. Help them think through the key steps involved
2. Suggest a clear title and category (Immediate / Financial / Household / Medical / Digital / Personal)
3. Suggest who this is for (Executor / Family / Healthcare Proxy / Advisor / Everyone)
4. Write a short overview paragraph
5. Write numbered, concrete steps (not vague wishes — actual things someone should DO)

Format your final output clearly with:
TITLE: [suggested title]
CATEGORY: [category]
FOR: [audience]
OVERVIEW: [1–2 sentence summary]
STEPS:
1. [Step one]
2. [Step two]
...

Rules:
- Be warm and patient — this is often emotionally difficult to write
- Focus on practical, actionable steps a grieving or stressed person can actually follow
- If the user is vague, ask one focused question to get the detail you need
- Keep steps specific: not "handle finances" but "contact our bank (Barclays, sort code 20-44-15) to notify them of the death"
- Use plain, clear British English
- Max 250 words in your final formatted output`
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, context, messages } = req.body

  if (!type) return res.status(400).json({ error: 'Missing type' })

  let systemPrompt
  let requestMessages

  if (type === 'readiness-coach') {
    if (!context) return res.status(400).json({ error: 'Missing context' })
    systemPrompt = readinessCoachPrompt(context)
    requestMessages = [{ role: 'user', content: 'What should I focus on next to improve my vault?' }]
  } else if (type === 'instructions-assistant') {
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'Missing messages' })
    systemPrompt = instructionsAssistantPrompt()
    requestMessages = messages.map(m => ({ role: m.role, content: m.content }))
  } else {
    return res.status(400).json({ error: 'Unknown type' })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: requestMessages,
    })

    const text = response.content[0]?.text ?? ''
    res.status(200).json({ reply: text })
  } catch (err) {
    console.error('ai/assist error:', err)
    res.status(500).json({ error: 'Failed to get a response. Please try again.' })
  }
}
