import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/data/export
// Requires: Authorization: Bearer <access_token>
// Returns:  application/zip binary stream
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // ── Authenticate the request ──────────────────────────────────────────────
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  // Verify the token and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  const userId = user.id

  try {
    // ── Fetch all user data in parallel ──────────────────────────────────────
    const [
      { data: profile },
      { data: accounts },
      { data: documents },
      { data: trustedPeople },
      { data: accessGrants },
      { data: instructions },
      { data: instructionSteps },
      { data: wishes },
      { data: subscriptions },
      { data: activityLog },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('documents').select('*').eq('user_id', userId),
      supabase.from('trusted_people').select('*').eq('user_id', userId),
      supabase.from('access_grants').select('*').eq('user_id', userId),
      supabase.from('instructions').select('*').eq('user_id', userId),
      supabase.from('instruction_steps').select('*'),
      supabase.from('wishes').select('*').eq('user_id', userId),
      supabase.from('subscriptions').select('*').eq('user_id', userId),
      supabase.from('activity_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
    ])

    const exportDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const exportTs   = new Date().toISOString()

    // ── Build the ZIP ─────────────────────────────────────────────────────────
    const zip = new JSZip()
    const folder = zip.folder(`everstead-export-${exportDate}`)

    // profile.json — strip sensitive server fields
    const profileExport = {
      full_name:           profile?.full_name,
      email:               profile?.email,
      plan:                profile?.plan,
      subscription_status: profile?.subscription_status,
      created_at:          profile?.created_at,
      date_of_birth:       profile?.date_of_birth,
      phone:               profile?.phone,
      address_line1:       profile?.address_line1,
      address_line2:       profile?.address_line2,
      city:                profile?.city,
      postcode:            profile?.postcode,
      country:             profile?.country,
    }
    folder.file('profile.json', JSON.stringify(profileExport, null, 2))

    // accounts.json
    const accountsExport = (accounts ?? []).map(a => ({
      id: a.id, name: a.name, type: a.type, institution: a.institution,
      account_number: a.account_number, sort_code: a.sort_code,
      notes: a.notes, estimated_value: a.estimated_value,
      currency: a.currency, is_joint: a.is_joint, created_at: a.created_at,
    }))
    folder.file('accounts.json', JSON.stringify(accountsExport, null, 2))

    // instructions.json — merge steps into each instruction
    const instructionIds = (instructions ?? []).map(i => i.id)
    const stepsForUser = (instructionSteps ?? []).filter(s => instructionIds.includes(s.instruction_id))
    const instructionsExport = (instructions ?? []).map(instr => ({
      ...instr,
      steps: stepsForUser.filter(s => s.instruction_id === instr.id).sort((a, b) => a.position - b.position),
    }))
    folder.file('instructions.json', JSON.stringify(instructionsExport, null, 2))

    // wishes.json
    folder.file('wishes.json', JSON.stringify(wishes ?? [], null, 2))

    // subscriptions.json
    folder.file('subscriptions.json', JSON.stringify(subscriptions ?? [], null, 2))

    // activity-log.json
    folder.file('activity-log.json', JSON.stringify(activityLog ?? [], null, 2))

    // trusted-people.json — merge access grants
    const peopleExport = (trustedPeople ?? []).map(p => ({
      ...p,
      access_grants: (accessGrants ?? []).filter(g => g.trusted_person_id === p.id),
    }))
    folder.file('trusted-people.json', JSON.stringify(peopleExport, null, 2))

    // documents.json — metadata only
    const docsExport = (documents ?? []).map(d => ({
      id: d.id, name: d.name, type: d.type, notes: d.notes,
      expiry_date: d.expiry_date, created_at: d.created_at,
      storage_path: d.storage_path,
    }))
    folder.file('documents.json', JSON.stringify(docsExport, null, 2))

    // documents/ — actual files via signed URLs
    const docsFolder = folder.folder('documents')
    const docResults = await Promise.allSettled(
      (documents ?? []).filter(d => d.storage_path).map(async (doc) => {
        try {
          const { data: signed } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.storage_path, 60) // 60s — enough to fetch

          if (!signed?.signedUrl) return

          const fileRes = await fetch(signed.signedUrl)
          if (!fileRes.ok) return

          const buffer = await fileRes.arrayBuffer()
          const fileName = doc.name || doc.storage_path.split('/').pop() || `document-${doc.id}`
          docsFolder.file(fileName, buffer)
        } catch {
          // Skip files that fail — they'll be listed in documents.json
        }
      })
    )
    void docResults // result unused — per-file errors are silently skipped

    // README.txt
    const readme = [
      'Everstead Data Export',
      `Exported: ${exportTs}`,
      `Account: ${profile?.email ?? userId}`,
      '',
      'This file contains a complete copy of your Everstead plan.',
      '',
      'Files included:',
      '- profile.json: Your account details',
      '- accounts.json: Your documented financial accounts and assets',
      '- documents/: Your uploaded files',
      '- documents.json: Document details and notes',
      '- trusted-people.json: Your trusted contacts and their access permissions',
      '- instructions.json: Your step-by-step instructions',
      '- wishes.json: Your personal messages and final wishes',
      '- subscriptions.json: Your tracked subscriptions',
      '- activity-log.json: A record of all changes made to your plan',
      '',
      'Your data belongs to you. If you need help with this export,',
      'contact us at hello@everstead.care',
    ].join('\n')
    folder.file('README.txt', readme)

    // ── Generate ZIP buffer ───────────────────────────────────────────────────
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    // ── Log the export to activity_log ────────────────────────────────────────
    await supabase.from('activity_log').insert({
      user_id:    userId,
      action:     'data_export',
      entity:     'account',
      entity_id:  userId,
      meta:       { exported_at: exportTs, file: `everstead-export-${exportDate}.zip` },
    }).catch(() => {}) // don't fail the export if logging fails

    // ── Return the ZIP ────────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="everstead-export-${exportDate}.zip"`)
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(zipBuffer)

  } catch (err) {
    console.error('data/export error:', err)
    res.status(500).json({ error: 'Export failed. Please try again.' })
  }
}
