import { createClient } from '@supabase/supabase-js'

// JSZip — defensive import to handle ESM/CJS interop in Vercel's bundler
import JSZipPkg from 'jszip'
import { Resend } from 'resend'
import { withSentry, captureException } from '../_lib/sentry.js'
import { sendEmail } from '../_lib/email-send.js'
import { languageForUser, translator } from '../_lib/email-i18n.js'
const JSZip = JSZipPkg.default ?? JSZipPkg

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.VITE_APP_URL || 'https://www.everstead.care'
const resend = new Resend(process.env.RESEND_API_KEY)

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/data/export
// Requires: Authorization: Bearer <access_token>
// Body:     { deliver: 'email' } to receive it instead of downloading it
// Returns:  application/zip binary stream, or { ok, emailedTo } for 'email'
//
// The apps have no download. A Capacitor webview cannot save a file without
// the Filesystem and Share plugins, and a token in a URL is not an option, so
// the phone asks us to send the archive to the address on the account. That is
// also the safer of the two: it is "send my data to me", not "show my data to
// whoever is holding this phone", and the export lands somewhere durable.
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
  const byEmail = req.body?.deliver === 'email'
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

    // ── Document files ────────────────────────────────────────────────────────
    // The files themselves go INTO the zip, up to a budget that keeps the
    // function inside its memory and time limits (60 s). Anything over the
    // budget, or any single file over the per-file cap, is linked instead with
    // a 7-day signed URL, and documents.json says which is which.
    // Emailing needs a far smaller archive: base64 inflates an attachment by
    // about a third and mail servers start refusing well below the download
    // budget. Nothing is lost by shrinking it, because the overflow path
    // already exists: anything not packed is listed with a 7-day signed link,
    // and documents.json says which is which.
    const FILE_BUDGET   = byEmail ? 6 * 1024 * 1024 : 40 * 1024 * 1024
    const FILE_CAP      = byEmail ? 4 * 1024 * 1024 : 15 * 1024 * 1024
    let   packedBytes   = 0
    const packedFiles   = []                 // [{ path, buffer }]
    const usedNames     = new Set()
    const safeName = (doc) => {
      const raw = String(doc.name || doc.storage_path?.split('/').pop() || doc.id).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || String(doc.id)
      const ext = (doc.storage_path?.match(/\.[a-z0-9]{1,5}$/i) || [''])[0]
      let name = raw.toLowerCase().endsWith(ext.toLowerCase()) || !ext ? raw : raw + ext
      let i = 2
      while (usedNames.has(name.toLowerCase())) { name = name.replace(/(\.[^.]*)?$/, ` (${i++})$1`) }
      usedNames.add(name.toLowerCase())
      return name
    }

    const docsWithUrls = []
    for (const doc of documents) {
      const base = {
        id: doc.id, name: doc.name, type: doc.type,
        notes: doc.notes, expiry_date: doc.expiry_date,
        created_at: doc.created_at,
      }
      if (!doc.storage_path) { docsWithUrls.push(base); continue }
      let packed = null
      try {
        const { data: blob, error: dlErr } = await supabase.storage.from('documents').download(doc.storage_path)
        if (!dlErr && blob) {
          const size = blob.size ?? 0
          if (size <= FILE_CAP && packedBytes + size <= FILE_BUDGET) {
            const buffer = Buffer.from(await blob.arrayBuffer())
            const path = `documents/${safeName(doc)}`
            packedFiles.push({ path, buffer })
            packedBytes += buffer.length
            packed = path
          }
        }
      } catch (err) {
        console.error('export: could not pack', doc.id, err?.message)
      }
      if (packed) { docsWithUrls.push({ ...base, file_in_export: packed }); continue }
      try {
        const { data: signed } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 7 * 24 * 60 * 60) // 7 days
        docsWithUrls.push({ ...base, download_url: signed?.signedUrl ?? null })
      } catch {
        docsWithUrls.push(base)
      }
    }
    const linkedCount = docsWithUrls.filter(d => d.download_url).length

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
      '- documents.json      Document details and notes; file_in_export points at the copy in this zip',
      '- documents/          Your uploaded files' + (linkedCount ? ` (${linkedCount} larger file${linkedCount === 1 ? '' : 's'} linked instead, see below)` : ''),
      '- trusted-people.json Your trusted contacts and their access permissions',
      '- instructions.json   Your step-by-step instructions',
      '- wishes.json         Your personal messages and final wishes',
      '- subscriptions.json  Your tracked subscriptions',
      '- activity-log.json   A record of all changes made to your plan',
      '',
      'Document files: every file up to 15 MB is inside the documents/ folder,',
      'up to 40 MB in total. Any file beyond that has a download_url in',
      'documents.json instead, valid for 7 days from the export date.',
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
    for (const { path, buffer } of packedFiles) folder.file(path, buffer)

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

    // ── Email it, or stream it back ───────────────────────────────────────────
    if (byEmail) {
      // The recipient is the address on the account, never one from the body.
      // An export is everything the vault holds; the only address that may
      // receive it is the one that signs in.
      const to = user.email
      if (!to) return res.status(400).json({ error: 'This account has no email address to send to.' })
      const lang = await languageForUser(supabase, { userId })
      const t = translator(COPY, lang)
      const filename = `everstead-export-${exportDate}.zip`
      await sendEmail(resend, {
        from:      'Everstead <hello@everstead.care>',
        to,
        subject:   t('subject'),
        preheader: t('preheader'),
        html:      exportEmailHtml(t, filename),
        attachments: [{ filename, content: zipBuffer }],
      })
      return res.status(200).json({ ok: true, emailedTo: to })
    }

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

// Customer-facing copy for the emailed export. Both languages: a French member
// asking for their data should not be handed an English envelope.
const COPY = {
  en: {
    subject:    'Your Everstead data',
    preheader:  'The archive is attached.',
    h1:         'Your data, as you asked',
    body:       'Everything your vault holds is in the attached archive: your accounts, documents, instructions, wishes, trusted people and messages, as files you can open without Everstead.',
    readme:     'Open <strong>README.txt</strong> first. It explains what each file contains, and lists anything too large to attach, with a link that works for seven days.',
    keepSafe:   'This archive is not encrypted and it contains everything. Keep it somewhere you would keep a passport.',
    didntAsk:   'If you did not ask for this, someone has access to your account. Change your password and write to us at hello@everstead.care.',
  },
  fr: {
    subject:    'Vos données Everstead',
    preheader:  "L'archive est en pièce jointe.",
    h1:         'Vos données, comme demandé',
    body:       "Tout ce que contient votre coffre se trouve dans l'archive jointe : vos comptes, documents, consignes, volontés, personnes de confiance et messages, sous forme de fichiers lisibles sans Everstead.",
    readme:     "Ouvrez d'abord <strong>README.txt</strong>. Il explique ce que contient chaque fichier et répertorie ce qui était trop volumineux pour être joint, avec un lien valable sept jours.",
    keepSafe:   "Cette archive n'est pas chiffrée et elle contient tout. Conservez-la où vous conserveriez un passeport.",
    didntAsk:   "Si vous n'êtes pas à l'origine de cette demande, quelqu'un a accès à votre compte. Changez votre mot de passe et écrivez-nous à hello@everstead.care.",
  },
}

function exportEmailHtml(t, filename) {
  return `
  <div style="background:#f5f4f0;padding:32px 0;font-family:Georgia,serif;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
      <p style="margin:0 0 24px;color:#0d1628;font-size:18px;letter-spacing:0.3px;">Everstead</p>
      <h1 style="margin:0 0 16px;color:#0d1628;font-size:22px;font-weight:normal;">${t('h1')}</h1>
      <p style="margin:0 0 16px;color:#44403c;font-size:15px;line-height:1.65;">${t('body')}</p>
      <p style="margin:0 0 16px;color:#44403c;font-size:15px;line-height:1.65;">${t('readme')}</p>
      <p style="margin:0 0 16px;padding:14px 16px;background:#fff7ed;border-radius:10px;color:#9a3412;font-size:14px;line-height:1.6;">${t('keepSafe')}</p>
      <p style="margin:0;color:#78716c;font-size:13px;line-height:1.6;">${t('didntAsk')}</p>
      <p style="margin:24px 0 0;color:#a8a29e;font-size:12px;">${filename}</p>
    </div>
  </div>`
}
