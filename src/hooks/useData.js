import { useState, useEffect, useCallback } from 'react'
import { supabase, uploadDocument, logActivity } from '../lib/supabase'
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
    try {
      const storagePath = await uploadDocument(user.id, row.id, file)
      // 3. Update row with storage path and file metadata
      const updated = await base.update(row.id, {
        storage_path: storagePath,
        file_size:    file.size,
        mime_type:    file.type,
      })
      logActivity(user.id, 'document.uploaded', 'documents', row.id, docRecord.name)
      return updated
    } catch (err) {
      // Clean up the db row if upload fails
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
  const { user } = useAuth()
  const base = useTable('trusted_people', `
    *,
    access_grants (*)
  `, 'created_at')

  const invite = async ({ name, email, role, accessGrants = [] }) => {
    // 1. Create the trusted person record
    const person = await base.add({ name, email, role })

    // 2. Create access grants
    if (accessGrants.length > 0) {
      const grants = accessGrants.map(g => ({
        trusted_person_id: person.id,
        user_id: user.id,
        resource_type: g.resource_type,
        resource_category: g.resource_category ?? null,
      }))
      await supabase.from('access_grants').insert(grants)
    }

    // 3. Send invite email via Supabase Edge Function
    await supabase.functions.invoke('send-invite-email', {
      body: { personId: person.id, ownerUserId: user.id },
    }).catch(console.error) // non-blocking

    logActivity(user.id, 'person.invited', 'trusted_people', person.id, name)
    base.refetch()
    return person
  }

  const resendInvite = async (personId) => {
    await supabase.functions.invoke('send-invite-email', {
      body: { personId, ownerUserId: user.id },
    })
  }

  return { ...base, invite, resendInvite }
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
