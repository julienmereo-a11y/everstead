import Anthropic from '@anthropic-ai/sdk'
import { aiGuard } from '../_lib/ai-guard.js'
import { withSentry, captureException } from '../lib/sentry.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const blocked = await aiGuard(req)
  if (blocked) return res.status(blocked.status).json({ error: blocked.error })

  const { fileBase64, mimeType, fileName } = req.body

  if (!fileBase64 || !mimeType) {
    return res.status(400).json({ error: 'Missing required fields: fileBase64, mimeType' })
  }

  const systemPrompt = `You are a document analysis assistant for Everstead, a UK estate planning platform. Your job is to extract key details from financial and legal documents.

Extract the following fields from the document and return them as a JSON object:
- documentName: A clear, descriptive name for this document (e.g. "Barclays Current Account Statement")
- documentType: One of: bank_account, investment, pension, insurance, property, will, lpa, tax, identity, other
- provider: The institution or company name (e.g. "Barclays", "Aviva", "HMRC")
- accountNumber: Account number, policy number, or reference number if present (string or null)
- value: Monetary value if shown, formatted as a string with currency (e.g. "£12,450.00") or null
- expiryDate: Expiry or renewal date in ISO format (YYYY-MM-DD) if present, or null
- notes: One or two sentences summarising any other important details worth noting, or null

Return ONLY valid JSON with these exact field names. No explanation, no markdown, just the JSON object.`

  const userPrompt = `Please extract the key details from this document${fileName ? ` (${fileName})` : ''}.`

  // Build the content block based on file type
  let contentBlock
  if (mimeType === 'application/pdf') {
    contentBlock = {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: fileBase64,
      },
    }
  } else {
    // Image types: image/jpeg, image/png, image/gif, image/webp
    contentBlock = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: fileBase64,
      },
    }
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: userPrompt },
          ],
        },
      ],
    })

    const rawText = message.content[0].text.trim()

    // Parse JSON from response
    let extracted
    try {
      // Strip markdown code fences if present
      const jsonText = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
      extracted = JSON.parse(jsonText)
    } catch {
      return res.status(500).json({ error: 'Could not parse document details. Please fill in manually.' })
    }

    res.status(200).json({ extracted })
  } catch (error) {
    console.error('extract-document error:', error)
    captureException(err, { endpoint: 'ai/extract-document' })
    res.status(500).json({ error: 'Failed to scan document. Please fill in details manually.' })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
