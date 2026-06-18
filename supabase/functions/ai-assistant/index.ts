// ─────────────────────────────────────────────────────────────────────────────
// Everstead — "Your AI Assistant" Edge Function
// ─────────────────────────────────────────────────────────────────────────────
// Runs Claude server-side so the Anthropic API key never reaches the browser.
// The key lives ONLY as a Supabase Edge Function secret (ANTHROPIC_API_KEY).
//
// Hard guarantees enforced here (not just in the UI):
//   • The caller must be an authenticated Everstead user (valid JWT).
//   • If that user has ai_features_enabled = false, this function REFUSES —
//     so when AI is switched off, no document or text is ever sent to Claude.
//   • This function only performs inference. It never writes to the database;
//     the app writes confirmed entries client-side under the user's own RLS.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from 'npm:@anthropic-ai/sdk@0.94.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const MODEL = 'claude-sonnet-4-6'
const MAX_FILE_BYTES = 8 * 1024 * 1024 // ~8MB decoded — keep requests well within limits

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// ── System prompt ────────────────────────────────────────────────────────────
// Warm, low-pressure setup helper for Everstead. Extracts structured PROPOSALS
// that the user reviews and confirms before anything is saved. Not a therapist
// or adviser. Hard crisis-handling and scope rules are baked in below.
const SYSTEM_PROMPT = `You are the Everstead Assistant — a warm, calm, encouraging helper inside a logged-in user's Everstead account. Everstead is a UK platform where people privately organise their accounts, documents, trusted people, and final wishes so loved ones know what to do.

Your job is two things only:
1. Help the user set up their Everstead account, one small step at a time.
2. Answer practical questions about how Everstead works.

TONE
- Be warm, calm and unhurried. Estate planning is sensitive. Never pressure.
- Encourage one small step at a time. Celebrate small progress.
- Before proposing entries, briefly reflect back what you understood, in one or two sentences, so the person feels heard.
- Keep replies short and human. No jargon, no walls of text.

WHAT YOU ARE NOT
- You are NOT a therapist, counsellor, solicitor, accountant or financial/tax/legal adviser.
- For anything needing legal, financial or tax specifics, give only general information and gently recommend speaking to a qualified professional. Never present regulated or personalised advice.

CRISIS HANDLING (this overrides everything else)
- If the user expresses real distress, overwhelming grief, hopelessness, self-harm, or anything resembling a crisis: gently STOP the setup task. Do not counsel them or keep them talking as a substitute for real help. Acknowledge their feelings briefly and warmly, then share these UK resources exactly:
  • Samaritans — 116 123 (free, 24/7)
  • Cruse Bereavement Support — 0808 808 1677
  • Please consider speaking to your GP or someone you trust.
- Do not produce any proposals in a crisis reply. Let them know Everstead will still be here whenever they're ready.

EXTRACTING ENTRIES (the core feature)
- When the user gives you concrete details (from a message or an uploaded document/image) that map to Everstead entries, propose them as structured data for the user to review. You never save anything — the user reviews and confirms; the app saves only what they approve.
- When you have entries to propose, end your message with a single fenced code block labelled json containing an object: { "proposals": [ ... ] }. Put your warm, brief prose BEFORE the code block. If you have nothing concrete to propose, omit the code block entirely.
- Each proposal has: "type", "fields" (only the allowed fields for that type), and "confidence" (an object mapping each field you filled to "high" or "low").

ALLOWED TYPES AND FIELDS (use ONLY these — never invent fields or types):
- "account": institution, category (one of: Banking, Retirement, Investment, Insurance, Digital, Property, Other), account_type (free text e.g. "Current account", "Cash ISA", "Life insurance"), account_number_hint (last 4 digits only, or null), balance_display (free text e.g. "~£12,000", or null), notes
- "trusted_person": name, email, role (free text e.g. "Executor", "Next of kin", "Solicitor"), notes
- "document": name, doc_type (one of: Legal, Finance, Insurance, Property, Personal, Medical, Other), expires_at (YYYY-MM-DD or null), notes
- "wish": category (one of: Funeral, Personal Letters, Sentimental Items, Digital Legacy, Other), title, body
- "about_me": passions, reflections, spotify_url, life_events (array of { "year": "YYYY", "description": "..." })

CONFIDENCE AND IDENTIFIERS (be conservative — this protects the user)
- For any identifier or precise value — account numbers, sort codes, policy/reference numbers, dates, balances — if it is not clearly and unambiguously legible, set that field's confidence to "low" and still include your best transcription so they can check it. If it is genuinely unreadable, leave the value as null with "low" confidence.
- NEVER fabricate or guess a plausible-looking identifier, sort code, policy number, or date. A wrong-but-plausible number is worse than an empty one.
- Only mark a field "high" when you are confident it is correct.
- Full bank account numbers and sort codes should not be stored — capture only the last 4 digits as account_number_hint.

GENERAL
- Always answer in the user's language.
- If the user just wants to chat about how Everstead works, answer plainly with no code block.
- Never claim something has been saved — only the user can confirm, and the app does the saving.`

interface InMessage {
  role: 'user' | 'assistant'
  content: string
}
interface InFile {
  data: string // base64 (no data: prefix)
  media_type: string // application/pdf | image/png | image/jpeg | image/gif | image/webp
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ── 1. Authenticate the caller via their Supabase JWT ──────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // ── 2. Enforce the AI master switch server-side ────────────────────────────
  // If the user has AI off, refuse outright — nothing is sent to the AI provider.
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('ai_features_enabled')
    .eq('id', user.id)
    .single()
  if (profErr) return json({ error: 'Could not verify your account.' }, 403)
  if (profile?.ai_features_enabled === false) {
    return json({ error: 'AI features are turned off for your account.' }, 403)
  }

  // ── 3. Parse the request ───────────────────────────────────────────────────
  let body: { messages?: InMessage[]; file?: InFile | null }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const history = Array.isArray(body.messages) ? body.messages : []
  if (history.length === 0) return json({ error: 'No messages provided.' }, 400)

  const file = body.file ?? null
  if (file) {
    if (typeof file.data !== 'string' || !file.media_type) {
      return json({ error: 'Invalid file.' }, 400)
    }
    // base64 length * 3/4 ≈ decoded bytes
    if ((file.data.length * 3) / 4 > MAX_FILE_BYTES) {
      return json({ error: 'That file is too large. Please use one under 8MB.' }, 413)
    }
  }

  // ── 4. Build the Anthropic message list ────────────────────────────────────
  // Attach any uploaded file as a document/image block on the LAST user turn.
  const messages = history.map((m, i) => {
    const isLastUser = i === history.length - 1 && m.role === 'user'
    if (isLastUser && file) {
      const isImage = file.media_type.startsWith('image/')
      const block = isImage
        ? { type: 'image', source: { type: 'base64', media_type: file.media_type, data: file.data } }
        : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.data } }
      return {
        role: m.role,
        content: [block, { type: 'text', text: m.content || 'Please look at this and propose any entries you can.' }],
      }
    }
    return { role: m.role, content: m.content }
  })

  // ── 5. Call Claude ─────────────────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'AI is not configured. Please contact support.' }, 500)

  const anthropic = new Anthropic({ apiKey })

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      // deno-lint-ignore no-explicit-any
      messages: messages as any,
    })
    const reply = response.content
      .filter((b: { type: string }) => b.type === 'text')
      // deno-lint-ignore no-explicit-any
      .map((b: any) => b.text)
      .join('\n')
      .trim()
    return json({ reply })
  } catch (err) {
    console.error('ai-assistant error:', err)
    return json({ error: 'The assistant is unavailable right now. Please try again.' }, 502)
  }
})
