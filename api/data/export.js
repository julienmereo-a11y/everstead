import { createClient } from '@supabase/supabase-js'

// JSZip — defensive import to handle ESM/CJS interop in Vercel's bundler
import JSZipPkg from 'jszip'
import { withSentry, captureException } from '../lib/sentry.js'
const JSZip = JSZipPkg.default ?? JSZipPkg

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/data/export
// Requires: Authorization: Bearer <access_token>
// Returns:  application/zip binary stream
// ─────────────────────────────────────────────────────────────────────────────

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // ── Authenticate ─────────────────────────────────────────────────────────
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Unauthorised' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    console.error('export: auth error', authError?.message)
    return res.status(401).json({ error: 'Invalid token' })
  }

  const userId = user.id
  const exportDate = new Date().toISOString().split('T')[0]
  const exportTs   = new Date().toISOString()

  try {
    // ── Fetch all tables in parallel ────────────────────────────────────────
    const [
      profileRes,
      accountsRes,
      documentsRes,
      trustedPeopleRes,
      instructionsRes,
      wishesRes,
      subscriptionsRes,
      activityRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('documents').select('*').eq('user_id', userId),
      supabase.from('trusted_people').select('*').eq('user_id', userId),
      supabase.from('instructions').select('*').eq('user_id', userId),
      supabase.from('wishes').select('*').eq('user_id', userId),
      supabase.from('subscriptions').select('*').eq('user_id', userId),
      supabase.from('activity_log').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(500),
    ])

    const profile       = profileRes.data
    const accounts      = accountsRes.data      ?? []
    const documents     = documentsRes.data     ?? []
    const trustedPeople = trustedPeopleRes.data ?? []
    const instructions  = instructionsRes.data  ?? []
    const wishes        = wishesRes.data        ?? []
    const subscriptions = subscriptionsRes.data ?? []
    const activityLog   = activityRes.data      ?? []

    // ── Fetch instruction steps filtered to this user's instructions ─────────
    let instructionSteps = []
    const instructionIds = instructions.map(i => i.id)
    if (instructionIds.length > 0) {
      const { data: steps } = await supabase
        .from('instruction_steps')
        .select('*')
        .in('instruction_id', instructionIds)
        .order('position')
      instructionSteps = steps ?? []
    }

    // ── Generate signed download URLs for document files ─────────────────────
    // We include these in documents.json so users can download their files.
    // Signed for 7 days — enough time to download after export.
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const base = {
          id: doc.id, name: doc.name, type: doc.type,
          notes: doc.notes, expiry_date: doc.expiry_date,
          created_at: doc.created_at,
        }
        if (!doc.storage_path) return base
        try {
          const { data: signed } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.storage_path, 7 * 24 * 60 * 60) // 7 days
          return { ...base, download_url: signed?.signedUrl ?? null }
        } catch {
          return base
        }
      })
    )

    // ── Build profile export (strip server-only fields) ───────────────────────
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

    // ── Merge instruction steps into instructions ──────────────────────────────
    const instructionsExport = instructions.map(instr => ({
      ...instr,
      steps: instructionSteps
        .filter(s => s.instruction_id === instr.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    }))

    // ── README ───────────────────────────────────────────────────────────────
    const readme = [
      'Everstead Data Export',
      `Exported: ${exportTs}`,
      `Account: ${profile?.email ?? userId}`,
      '',
      'This file contains a complete copy of your Everstead plan.',
      '',
      'Files included:',
      '- profile.json        Your account details',
      '- accounts.json       Your documented financial accounts and assets',
      '- documents.json      Document details, notes, and 7-day download links',
      '- trusted-people.json Your trusted contacts and their access permissions',
      '- instructions.json   Your step-by-step instructions',
      '- wishes.json         Your personal messages and final wishes',
      '- subscriptions.json  Your tracked subscriptions',
      '- activity-log.json   A record of all changes made to your plan',
      '',
      'Document files: Use the download_url in documents.json to download each',
      'uploaded file. Links are valid for 7 days from the export date.',
      '',
      'Your data belongs to you. If you need help with this export,',
      'contact us at hello@everstead.care',
      '',
      `Full data promise: ${APP_URL}/data-promise`,
    ].join('\n')

    // ── Assemble ZIP ─────────────────────────────────────────────────────────
    const zip    = new JSZip()
    const folder = zip.folder(`everstead-export-${exportDate}`)

    folder.file('README.txt',            readme)
    folder.file('profile.json',          JSON.stringify(profileExport,      null, 2))
    folder.file('accounts.json',         JSON.stringify(accounts,           null, 2))
    folder.file('documents.json',        JSON.stringify(docsWithUrls,       null, 2))
    folder.file('trusted-people.json',   JSON.stringify(trustedPeople,      null, 2))
    folder.file('instructions.json',     JSON.stringify(instructionsExport, null, 2))
    folder.file('wishes.json',           JSON.stringify(wishes,             null, 2))
    folder.file('subscriptions.json',    JSON.stringify(subscriptions,      null, 2))
    folder.file('activity-log.json',     JSON.stringify(activityLog,        null, 2))

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    // ── Log to activity_log ───────────────────────────────────────────────────
    // NB: no .catch() here — a PostgREST builder is a thenable without one, and
    // chaining it threw before the ZIP was sent, 500ing every export.
    const { error: logErr } = await supabase.from('activity_log').insert({
      user_id:   userId,
      action:    'data_export',
      entity:    'account',
      entity_id: userId,
      meta:      { exported_at: exportTs, file: `everstead-export-${exportDate}.zip` },
    })
    if (logErr) console.error('export: activity log failed', logErr.message)

    // ── Stream ZIP back ───────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="everstead-export-${exportDate}.zip"`)
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(zipBuffer)

  } catch (err) {
    console.error('export: unexpected error', err)
    captureException(err, { endpoint: 'data/export' })
    res.status(500).json({ error: 'Export failed. Please try again.' })
  }
}

// Errors are reported to Sentry (no-op until SENTRY_DSN is set) and return a clean 500.
export default withSentry(handler)
