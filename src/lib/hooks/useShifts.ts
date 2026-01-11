'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shift, ShiftInsert, ShiftUpdate, ShiftWithOrganization } from '@/types/database'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
}

// Module-level cache
let cachedShifts: ShiftWithOrganization[] = []
let cachedUserId: string | null = null
let initialLoadDone = false

interface UseShiftsOptions {
  startDate?: Date
  endDate?: Date
  organizationId?: string
}

interface UseShiftsReturn {
  shifts: ShiftWithOrganization[]
  loading: boolean
  error: string | null
  createShift: (shift: Omit<ShiftInsert, 'user_id'>) => Promise<Shift | null>
  updateShift: (id: string, updates: ShiftUpdate) => Promise<boolean>
  deleteShift: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
}

export function useShifts(options?: UseShiftsOptions): UseShiftsReturn {
  const [shifts, setShifts] = useState<ShiftWithOrganization[]>(cachedShifts)
  const [loading, setLoading] = useState(!initialLoadDone)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(cachedUserId)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Stabilize options to prevent infinite loops
  const startDateStr = options?.startDate?.toISOString()
  const endDateStr = options?.endDate?.toISOString()
  const organizationId = options?.organizationId

  // Combined user fetch and data fetch to prevent race conditions
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      initialLoadDone = true
      return
    }

    // Skip if already initialized - use cached data
    if (initialLoadDone) {
      return
    }

    let cancelled = false

    const loadData = async () => {
      const supabase = createClient()

      try {
        // Get user first
        const { data: { user } } = await supabase.auth.getUser()

        if (cancelled) return

        if (!user) {
          cachedUserId = null
          setUserId(null)
          setLoading(false)
          initialLoadDone = true
          return
        }

        cachedUserId = user.id
        setUserId(user.id)

        // Fetch shifts immediately after getting user
        let query = supabase
          .from('shifts')
          .select(`
            *,
            organization:organizations(*)
          `)
          .eq('user_id', user.id)
          .order('date', { ascending: true })

        if (startDateStr) {
          query = query.gte('date', startDateStr.split('T')[0])
        }
        if (endDateStr) {
          query = query.lte('date', endDateStr.split('T')[0])
        }
        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        const { data, error: fetchError } = await query

        if (cancelled) return

        if (fetchError) {
          setError(fetchError.message)
        } else {
          cachedShifts = (data || []) as ShiftWithOrganization[]
          setShifts(cachedShifts)
        }
      } catch (err) {
        if (cancelled) return
        setError('Failed to load shifts')
      } finally {
        if (!cancelled) {
          setLoading(false)
          initialLoadDone = true
        }
      }
    }

    loadData()

    return () => { cancelled = true }
  }, [supabaseConfigured, startDateStr, endDateStr, organizationId])

  const fetchShifts = useCallback(async () => {
    if (!userId || !supabaseConfigured) {
      return
    }
    setError(null)

    try {
      const supabase = createClient()
      let query = supabase
        .from('shifts')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: true })

      if (startDateStr) {
        query = query.gte('date', startDateStr.split('T')[0])
      }
      if (endDateStr) {
        query = query.lte('date', endDateStr.split('T')[0])
      }
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
      } else {
        cachedShifts = (data || []) as ShiftWithOrganization[]
        setShifts(cachedShifts)
      }
    } catch (err) {
      setError('Failed to fetch shifts')
    }
  }, [userId, supabaseConfigured, startDateStr, endDateStr, organizationId])

  const createShift = async (shift: Omit<ShiftInsert, 'user_id'>): Promise<Shift | null> => {
    if (!userId || !supabaseConfigured) return null
    setError(null)

    const supabase = createClient()
    const { data, error: createError } = await supabase
      .from('shifts')
      .insert({ ...shift, user_id: userId })
      .select(`
        *,
        organization:organizations(*)
      `)
      .single()

    if (createError) {
      setError(createError.message)
      return null
    }

    const newShift = data as ShiftWithOrganization
    setShifts(prev => [...prev, newShift].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ))
    return newShift
  }

  const updateShift = async (id: string, updates: ShiftUpdate): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()
    const { data, error: updateError } = await supabase
      .from('shifts')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        organization:organizations(*)
      `)
      .single()

    if (updateError) {
      setError(updateError.message)
      return false
    }

    setShifts(prev =>
      prev.map(s => s.id === id ? data as ShiftWithOrganization : s)
    )
    return true
  }

  const deleteShift = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    setShifts(prev => prev.filter(s => s.id !== id))
    return true
  }

  return {
    shifts,
    loading,
    error,
    createShift,
    updateShift,
    deleteShift,
    refetch: fetchShifts,
  }
}
