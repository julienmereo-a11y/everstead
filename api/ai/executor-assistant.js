import Anthropic from '@anthropic-ai/sdk'
import { aiGuardForUser } from '../_lib/ai-guard'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { question, delegateName, ownerName, ownerId, vaultSummary, conversationHistory = [] } = req.body

  if (!question) return res.status(400).json({ error: 'Missing required field: question' })

  // This tool processes the plan OWNER's data on a delegate's behalf, so it
  // respects the OWNER's AI off-switch (caller must still be authenticated).
  const blocked = await aiGuardForUser(req, ownerId)
  if (blocked) return res.status(blocked.status).json({ error: blocked.error })

  const ownerFirstName = ownerName?.split(' ')[0] || 'the plan owner'

  const systemPrompt = `You are a calm, knowledgeable, and compassionate assistant helping ${delegateName || 'an executor or family member'} navigate ${ownerFirstName}'s Everstead estate plan.

You have access to the following vault summary:
${vaultSummary || 'No vault summary provided.'}

Your role:
- Guide them through the practical steps of UK estate administration
- Answer questions about probate, notifying institutions, handling accounts, and working with solicitors
- Help them understand what's in the vault and what to do next
- Be empathetic — they may be grieving or under significant stress

Key UK estate knowledge:
- Deaths must be registered within 5 days in England and Wales at the local register office
- Request at least 10 certified death certificates — most institutions need originals
- Tell Us Once (gov.uk) notifies multiple government departments in one step
- Most estates require a Grant of Probate from the Probate Registry (typically 4–8 weeks)
- Estates under ~£10,000 often don't need probate — confirm with each institution
- Joint accounts usually transfer automatically; sole accounts are frozen until probate
- Pensions and life insurance written in trust are paid outside probate — check nomination forms
- IHT threshold is £325,000 + residence nil-rate band; IHT400 must be filed before probate if exceeded
- Settld.com can notify banks and utilities in bulk (free service)
- For missing wills: Certainty National Will Register can run a search
- Always recommend seeking legal advice for complex estates

Rules:
- Be warm, calm, and practical — never clinical
- Give specific, actionable steps — not vague guidance
- If they ask about specific documents or accounts, refer them to the relevant vault section
- Never provide legal advice — guide towards seeking a solicitor for complex situations
- Keep responses concise: 2–4 short paragraphs or a numbered list
- Use plain, warm British English`

  // Build conversation messages
  const messages = [
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ]

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    })

    res.status(200).json({ response: message.content[0].text })
  } catch (error) {
    console.error('executor-assistant error:', error)
    res.status(500).json({ error: 'Failed to get a response. Please try again.' })
  }
}
