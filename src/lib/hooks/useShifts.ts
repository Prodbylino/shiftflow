'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shift, ShiftInsert, ShiftUpdate, ShiftWithOrganization } from '@/types/database'
import { AuthChangeEvent } from '@supabase/supabase-js'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
}

// Helper to safely access localStorage
const getFromLocalStorage = (key: string) => {
  if (typeof window === 'undefined') return null
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

const setToLocalStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore localStorage errors
  }
}

// Module-level cache
let cachedShifts: ShiftWithOrganization[] = getFromLocalStorage('shiftflow_shifts') || []
let cachedUserId: string | null = null
let initialLoadDoneShifts = false

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(cachedUserId)
  const sessionHandledRef = useRef(false)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Stabilize options to prevent infinite loops
  const startDateStr = options?.startDate?.toISOString()
  const endDateStr = options?.endDate?.toISOString()
  const organizationId = options?.organizationId

  // Use onAuthStateChange for session detection
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      initialLoadDoneShifts = true
      return
    }

    const supabase = createClient()
    let isMounted = true
    sessionHandledRef.current = false

    const fetchShiftsData = async (uid: string) => {
      try {
        let query = supabase
          .from('shifts')
          .select(`
            *,
            organization:organizations(*)
          `)
          .eq('user_id', uid)
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

        if (!isMounted) return

        if (fetchError) {
          setError(fetchError.message)
          cachedShifts = []
          setShifts([])
          setToLocalStorage('shiftflow_shifts', [])
        } else {
          cachedShifts = (data || []) as ShiftWithOrganization[]
          setShifts(cachedShifts)
          setToLocalStorage('shiftflow_shifts', data || [])
        }
      } catch (err) {
        if (!isMounted) return
        setError('Failed to load shifts')
        cachedShifts = []
        setShifts([])
        setToLocalStorage('shiftflow_shifts', [])
      }
    }

    const handleSession = async (session: { user: { id: string } } | null, source: string) => {
      if (!isMounted) return

      // Prevent duplicate handling
      if (sessionHandledRef.current && source !== 'auth_change') return
      sessionHandledRef.current = true

      if (session?.user) {
        cachedUserId = session.user.id
        setUserId(session.user.id)
        // Fetch shifts and wait for completion
        await fetchShiftsData(session.user.id)
      } else {
        cachedUserId = null
        setUserId(null)
        cachedShifts = []
        setShifts([])
        setToLocalStorage('shiftflow_shifts', [])
      }

      // Only set loading to false after data is loaded
      if (isMounted) {
        setLoading(false)
        initialLoadDoneShifts = true
      }
    }

    // Get initial session immediately - this reads from cookies
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        handleSession(session, 'get_session')
      })
      .catch(() => {
        if (!isMounted) return
        if (!initialLoadDoneShifts) {
          setLoading(false)
          initialLoadDoneShifts = true
        }
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          sessionHandledRef.current = false
          await handleSession(session, 'auth_change')
        } else if (event === 'INITIAL_SESSION' && !sessionHandledRef.current) {
          await handleSession(session, 'auth_change')
        }
      }
    )

    // Safety timeout
    const timeout = setTimeout(() => {
      if (!initialLoadDoneShifts && isMounted) {
        setLoading(false)
        initialLoadDoneShifts = true
      }
    }, 5000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
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
    const updatedShifts = [...shifts, newShift].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    cachedShifts = updatedShifts
    setShifts(updatedShifts)
    setToLocalStorage('shiftflow_shifts', updatedShifts)
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

    const updatedShifts = shifts.map(s => s.id === id ? data as ShiftWithOrganization : s)
    cachedShifts = updatedShifts
    setShifts(updatedShifts)
    setToLocalStorage('shiftflow_shifts', updatedShifts)
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

    const updatedShifts = shifts.filter(s => s.id !== id)
    cachedShifts = updatedShifts
    setShifts(updatedShifts)
    setToLocalStorage('shiftflow_shifts', updatedShifts)
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
