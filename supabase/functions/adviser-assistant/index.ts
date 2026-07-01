import Anthropic from 'npm:@anthropic-ai/sdk@0.94.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// Assistant for professional advisers / solicitors using the Everstead Adviser Portal.
// It helps them work the platform and answer questions about THEIR OWN client portfolio.
// The firm's client data is injected below at request time and is the only client data
// it may ever discuss — the query is scoped to the caller's firm by SECURITY DEFINER RPCs,
// so it structurally cannot see another firm's portfolio.
const SYSTEM_PROMPT = `You are Everstead's assistant for professional advisers and solicitors using the Everstead Adviser Portal. Everstead is a secure place where UK families gather their accounts, documents, trusted people and final wishes; advisers manage a portfolio of client families on the firm's behalf.

WHO YOU HELP: financial advisers, solicitors, estate planners and their firms. Be warm, professional, concise and practical — like a knowledgeable colleague. No fluff.

WHAT YOU DO:
1. Guide them around the Adviser Portal — inviting and managing client families, using the family cap, inviting teammates (owner only), reading alerts, the Guides, and their firm's invoices/billing (invoices are uploaded by the Everstead team; the firm is on a custom plan).
2. Answer questions about THEIR OWN portfolio using the FIRM CONTEXT provided below — e.g. how many families they're using vs their cap, which clients have low readiness and may need a nudge, recent activity.

HARD PRIVACY & GATING RULES (never break these):
- You may ONLY discuss the clients listed in FIRM CONTEXT below. Never mention, infer, invent, or compare against any client, firm or person not in that list. If asked about someone not listed, say you can only see this firm's clients.
- Clients retain full control of their own plans. Advisers only ever see what a client has explicitly shared. You do NOT have access to the inside of any client's plan (their individual accounts, documents, instructions or messages) — that lives in the client's own vault. If asked for that detail, explain it isn't shared with the portal yet and point them to the client's page / to ask the client.
- Never expose or repeat a client's email address unless the adviser clearly already knows it and it's necessary; prefer names.

SCOPE & TONE:
- You are NOT regulated advice. For specific legal, tax or financial questions, give general, practical information and defer to the adviser's own professional judgement.
- Keep answers short and useful. Use plain language. When guiding a task, give the concrete steps in the portal.
- If you genuinely don't know or the data isn't in FIRM CONTEXT, say so plainly rather than guessing.`

interface InMessage { role: 'user' | 'assistant'; content: string }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  // User-scoped client: RPC calls run as the caller, so the firm-scoped RPCs below
  // can only ever return THIS adviser's firm + clients.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // AI off-switch (best-effort) — respect an explicit opt-out.
  const { data: profile } = await supabase.from('profiles').select('ai_features_enabled').eq('id', user.id).single()
  if (profile?.ai_features_enabled === false) return json({ error: 'AI features are turned off for your account.' }, 403)

  // Verify the caller is an adviser and resolve their firm (scoped RPC).
  const { data: firmRows } = await supabase.rpc('get_adviser_firm')
  const firm = Array.isArray(firmRows) ? firmRows[0] : firmRows
  if (!firm) return json({ error: 'This assistant is only available to advisers.' }, 403)

  // The firm's client families (scoped RPC — cannot return another firm's clients).
  const { data: clients } = await supabase.rpc('get_adviser_clients')
  const list = Array.isArray(clients) ? clients : []
  const portfolio = list.length
    ? list.map((c: Record<string, unknown>) =>
        `- ${(c.full_name as string) || (c.email as string) || 'Unnamed'}: readiness ${c.readiness_score ?? 'n/a'}%, plan ${c.plan ?? '—'}, status ${c.subscription_status ?? '—'}`,
      ).join('\n')
    : '(no client families added yet)'

  const firmContext =
    `\n\nFIRM CONTEXT (the ONLY client data you may discuss — do not reference anyone outside this list):\n` +
    `Firm: ${firm.firm_name}\n` +
    `Family cap: ${firm.max_families} · Using: ${list.length}\n` +
    `Adviser role: ${firm.role === 'owner' ? 'firm owner (can invite teammates)' : 'team member'}\n` +
    `Client families (${list.length}):\n${portfolio}`

  let body: { messages?: InMessage[] }
  try { body = await req.json() } catch { return json({ error: 'Invalid request body.' }, 400) }
  // The Anthropic API requires the conversation to start with a user message — drop
  // any leading assistant greeting a client may have included.
  const raw = Array.isArray(body.messages) ? body.messages : []
  const firstUser = raw.findIndex(m => m.role === 'user')
  const history = firstUser === -1 ? [] : raw.slice(firstUser)
  if (history.length === 0) return json({ error: 'No messages provided.' }, 400)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'AI is not configured. Please contact support.' }, 500)

  const anthropic = new Anthropic({ apiKey })
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT + firmContext,
      // deno-lint-ignore no-explicit-any
      messages: history.map(m => ({ role: m.role, content: m.content })) as any,
    })
    const reply = response.content
      .filter((b: { type: string }) => b.type === 'text')
      // deno-lint-ignore no-explicit-any
      .map((b: any) => b.text).join('\n').trim()
    return json({ reply })
  } catch (err) {
    // deno-lint-ignore no-explicit-any
    const e = err as any
    const status = typeof e?.status === 'number' ? e.status : 502
    console.error('adviser-assistant error:', status, typeof e?.message === 'string' ? e.message : 'unknown error')
    return json({ error: 'The assistant is unavailable right now. Please try again.' }, status)
  }
})
