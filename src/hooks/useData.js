import { useState, useEffect, useCallback } from 'react'
import { supabase, uploadDocument, removeStorageFile, logActivity } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─────────────────────────────────────────────────────────────
// Generic hook factory for simple CRUD on a table
// ─────────────────────────────────────────────────────────────
function useTable(tableName, selectQuery = '*', orderBy = 'created_at') {
  const { user, refreshProfile } = useAuth()
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from(tableName)
      .select(selectQuery)
      .eq('user_id', user.id)
      .order(orderBy, { ascending: true })
    if (err) setError(err.message)
    else     setData(rows ?? [])
    setLoading(false)
  }, [user, tableName, selectQuery, orderBy])

  useEffect(() => { fetch() }, [fetch])

  const add = async (values) => {
    const { data: row, error: err } = await supabase
      .from(tableName)
      .insert({ ...values, user_id: user.id })
      .select()
      .single()
    if (err) throw err
    setData(prev => [...prev, row])
    refreshProfile()
    return row
  }

  const update = async (id, values) => {
    const { data: row, error: err } = await supabase
      .from(tableName)
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (err) throw err
    setData(prev => prev.map(r => r.id === id ? row : r))
    return row
  }

  const remove = async (id) => {
    const { error: err } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (err) throw err
    setData(prev => prev.filter(r => r.id !== id))
    refreshProfile()
  }

  return { data, loading, error, refetch: fetch, add, update, remove }
}

// ─────────────────────────────────────────────────────────────
// ACCOUNTS
// ─────────────────────────────────────────────────────────────
export function useAccounts() {
  return useTable('accounts', '*', 'sort_order')
}

// ─────────────────────────────────────────────────────────────
// DOCUMENTS (with file upload)
// ─────────────────────────────────────────────────────────────
export function useDocuments() {
  const { user } = useAuth()
  const base = useTable('documents', '*', 'created_at')

  const uploadFile = async (docRecord, file) => {
    // 1. Insert document row first (to get the ID)
    const row = await base.add({
      name:       docRecord.name,
      doc_type:   docRecord.doc_type,
      status:     'current',
      notes:      docRecord.notes,
      expires_at: docRecord.expires_at || null,
    })
    // 2. Upload file to storage
    let storagePath = null
    try {
      storagePath = await uploadDocument(user.id, row.id, file)
      // 3. Update row with storage path and file metadata
      const updated = await base.update(row.id, {
        storage_path: storagePath,
        file_size:    file.size,
        mime_type:    file.type,
      })
      logActivity(user.id, 'document.uploaded', 'documents', row.id, docRecord.name)
      return updated
    } catch (err) {
      // Clean up both the db row and any uploaded storage file
      await removeStorageFile(storagePath)
      await base.remove(row.id)
      throw err
    }
  }

  return { ...base, uploadFile }
}

// ─────────────────────────────────────────────────────────────
// TRUSTED PEOPLE (with access grants)
// ─────────────────────────────────────────────────────────────
export function usePeople() {
  const { user, profile } = useAuth()
  const base = useTable('trusted_people', '*', 'created_at')

  const invite = async ({ name, email, role, accessAreas = [], accountCategories = [], documentTypes = [], accessTiming = 'always' }) => {
    const access_grants = { accessAreas, accountCategories, documentTypes, accessTiming }
    const person = await base.add({ name, email, role, access_grants })

    fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:         'invite',
        inviteeName:  name,
        inviteeEmail: email,
        role,
        ownerName:    profile?.full_name ?? 'Someone',
        inviteToken:  person.invite_token,
      }),
    }).catch(console.error)

    logActivity(user.id, 'person.invited', 'trusted_people', person.id, name)
    base.refetch()
    return person
  }

  const update = async (id, { role, accessAreas = [], accountCategories = [], documentTypes = [], accessTiming = 'always' }) => {
    const access_grants = { accessAreas, accountCategories, documentTypes, accessTiming }
    return base.update(id, { role, access_grants })
  }

  const resendInvite = async (personId) => {
    const person = base.data?.find(p => p.id === personId)
    if (!person) return

    // Generate a fresh 64-char hex token identical in format to the DB default
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    const { error } = await supabase
      .from('trusted_people')
      .update({
        invite_token:  newToken,
        invited_at:    new Date().toISOString(),
        invite_status: 'pending',
      })
      .eq('id', personId)
      .eq('user_id', user.id)

    if (error) throw error

    // Refresh local state so the new token is available
    base.refetch()

    fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:         'invite',
        inviteeName:  person.name,
        inviteeEmail: person.email,
        role:         person.role,
        ownerName:    profile?.full_name ?? 'Someone',
        inviteToken:  newToken,
      }),
    }).catch(console.error)
  }

  return { ...base, invite, update, resendInvite }
}

// ─────────────────────────────────────────────────────────────
// INSTRUCTIONS (with steps)
// ─────────────────────────────────────────────────────────────
export function useInstructions() {
  const { user } = useAuth()
  const base = useTable('instructions', `
    *,
    instruction_steps (*)
  `, 'sort_order')

  const addWithSteps = async ({ title, category, audience, body, steps = [] }) => {
    const instruction = await base.add({ title, category, audience, body })

    if (steps.length > 0) {
      const stepRows = steps.map((s, i) => ({
        instruction_id: instruction.id,
        body: s,
        step_order: i,
      }))
      await supabase.from('instruction_steps').insert(stepRows)
    }

    base.refetch()
    return instruction
  }

  const updateWithSteps = async (instructionId, { title, category, audience, body, steps = [] }) => {
    const instruction = await base.update(instructionId, { title, category, audience, body })

    await supabase
      .from('instruction_steps')
      .delete()
      .eq('instruction_id', instructionId)

    if (steps.length > 0) {
      const stepRows = steps.map((s, i) => ({
        instruction_id: instructionId,
        body: s,
        step_order: i,
      }))
      await supabase.from('instruction_steps').insert(stepRows)
    }

    base.refetch()
    return instruction
  }

  const removeWithSteps = async (instructionId) => {
    await supabase
      .from('instruction_steps')
      .delete()
      .eq('instruction_id', instructionId)

    await base.remove(instructionId)
  }

  const updateStep = async (stepId, completed) => {
    await supabase
      .from('instruction_steps')
      .update({ completed })
      .eq('id', stepId)
    base.refetch()
  }

  return { ...base, addWithSteps, updateWithSteps, removeWithSteps, updateStep }
}

// ─────────────────────────────────────────────────────────────
// WISHES
// ─────────────────────────────────────────────────────────────
export function useWishes() {
  return useTable('wishes', '*', 'created_at')
}

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────
export function useSubscriptions() {
  return useTable('subscriptions', '*', 'name')
}

// ─────────────────────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────────────────────
export function useAlerts() {
  const { user } = useAuth()
  const base = useTable('alerts', '*', 'created_at')

  const markRead = async (id) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id).eq('user_id', user.id)
    base.refetch()
  }

  const markAllRead = async () => {
    await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id)
    base.refetch()
  }

  const unreadCount = base.data.filter(a => !a.is_read).length

  return { ...base, markRead, markAllRead, unreadCount }
}

// ─────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────
export function useMessages() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { supabase } = await import('../lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const { data: rows } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setData(rows || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (msg) => {
    const { supabase } = await import('../lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    const { data: row } = await supabase.from('messages').insert({ ...msg, user_id: session.user.id }).select().single()
    if (row) setData(prev => [row, ...prev])
    return row
  }

  const update = async (id, changes) => {
    const { supabase } = await import('../lib/supabase')
    const { data: row } = await supabase.from('messages').update(changes).eq('id', id).select().single()
    if (row) setData(prev => prev.map(m => m.id === id ? row : m))
    return row
  }

  const uploadVideo = async (messageId, file) => {
    const { supabase } = await import('../lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    const path = `${session.user.id}/${messageId}/${file.name}`
    const { error } = await supabase.storage.from('messages').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('messages').getPublicUrl(path)
    await update(messageId, { video_url: publicUrl })
    return publicUrl
  }

  return { data, loading, add, update, uploadVideo, refresh: load }
}

// ─────────────────────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────────────────────
export function useActivityLog(limit = 20) {
  const { user } = useAuth()
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data: rows }) => {
        setData(rows ?? [])
        setLoading(false)
      })
  }, [user, limit])

  return { data, loading }
}
