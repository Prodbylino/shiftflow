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
  const [shifts, setShifts] = useState<ShiftWithOrganization[]>(() => getFromLocalStorage('shiftflow_shifts') || [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const sessionHandledRef = useRef(false)
  const loadingCompletedRef = useRef(false)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Stabilize options to prevent infinite loops
  const startDateStr = options?.startDate?.toISOString()
  const endDateStr = options?.endDate?.toISOString()
  const organizationId = options?.organizationId

  // Use onAuthStateChange for session detection
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      loadingCompletedRef.current = true
      return
    }

    const supabase = createClient()
    let isMounted = true
    sessionHandledRef.current = false
    loadingCompletedRef.current = false

    const completeLoading = () => {
      if (isMounted && !loadingCompletedRef.current) {
        setLoading(false)
        loadingCompletedRef.current = true
      }
    }

    const fetchShiftsData = async (uid: string) => {
      console.log('[useShifts] Fetching shifts for user:', uid)
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
          console.error('[useShifts] Error fetching shifts:', fetchError)
          setError(fetchError.message)
          setShifts([])
          setToLocalStorage('shiftflow_shifts', [])
        } else {
          console.log('[useShifts] Fetched shifts from DB:', data?.length || 0, 'shifts')
          setShifts((data || []) as ShiftWithOrganization[])
          setToLocalStorage('shiftflow_shifts', data || [])
        }
      } catch (err) {
        if (!isMounted) return
        setError('Failed to load shifts')
        setShifts([])
        setToLocalStorage('shiftflow_shifts', [])
      }
    }

    const handleSession = async (session: { user: { id: string } } | null, source: string) => {
      if (!isMounted) return

      console.log('[useShifts] handleSession called from:', source, 'userId:', session?.user?.id)

      // Prevent duplicate handling
      if (sessionHandledRef.current && source !== 'auth_change') {
        console.log('[useShifts] Session already handled, skipping')
        return
      }
      sessionHandledRef.current = true

      try {
        if (session?.user) {
          console.log('[useShifts] User authenticated, setting userId:', session.user.id)
          setUserId(session.user.id)
          // Fetch shifts and wait for completion
          await fetchShiftsData(session.user.id)
        } else {
          console.log('[useShifts] No session, clearing data')
          setUserId(null)
          setShifts([])
          setToLocalStorage('shiftflow_shifts', [])
        }
      } catch (error) {
        console.error('Error in handleSession:', error)
      } finally {
        // Always complete loading, even if there's an error
        completeLoading()
      }
    }

    // Get initial session immediately - this reads from cookies
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        handleSession(session, 'get_session')
      })
      .catch((error) => {
        console.error('Error getting session:', error)
        completeLoading()
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

    // Safety timeout - ensure loading completes within 3 seconds
    const timeout = setTimeout(() => {
      completeLoading()
    }, 3000)

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
        setShifts((data || []) as ShiftWithOrganization[])
      }
    } catch (err) {
      setError('Failed to fetch shifts')
    }
  }, [userId, supabaseConfigured, startDateStr, endDateStr, organizationId])

  const createShift = async (shift: Omit<ShiftInsert, 'user_id'>): Promise<Shift | null> => {
    try {
      console.log('[useShifts] createShift START, userId state:', userId)
      if (!supabaseConfigured) {
        console.error('[useShifts] Supabase not configured')
        return null
      }
      setError(null)

      console.log('[useShifts] Creating supabase client')
      const supabase = createClient()

      console.log('[useShifts] Getting session')
      // Get current session to ensure we have the user_id
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[useShifts] Session check in createShift:', session?.user?.id)
      if (!session?.user?.id) {
        console.error('[useShifts] Not authenticated - no session')
        setError('Not authenticated')
        return null
      }

      console.log('[useShifts] Inserting shift to database, data:', shift)

      const { data, error: createError } = await supabase
        .from('shifts')
        .insert({ ...shift, user_id: session.user.id })
        .select(`
          *,
          organization:organizations(*)
        `)
        .single()

      if (createError) {
        console.error('[useShifts] Error creating shift:', createError)
        setError(createError.message)
        return null
      }

      console.log('[useShifts] Shift created successfully:', data)

      console.log('[useShifts] Re-fetching all shifts')
      // Re-fetch all shifts from database to ensure we have the latest data
      const { data: allShifts, error: fetchError } = await supabase
        .from('shifts')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', session.user.id)
        .order('date', { ascending: true })

      if (!fetchError && allShifts) {
        console.log('[useShifts] Re-fetched', allShifts.length, 'shifts, updating state')
        const shiftsData = allShifts as ShiftWithOrganization[]
        setShifts(shiftsData)
        setToLocalStorage('shiftflow_shifts', shiftsData)
      }

      console.log('[useShifts] createShift END')
      return data
    } catch (error) {
      console.error('[useShifts] EXCEPTION in createShift:', error)
      return null
    }
  }

  const updateShift = async (id: string, updates: ShiftUpdate): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      console.error('Not authenticated - no session')
      setError('Not authenticated')
      return false
    }

    console.log('Updating shift:', id)

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
      console.error('Error updating shift:', updateError)
      setError(updateError.message)
      return false
    }

    console.log('Shift updated successfully:', data)

    // Re-fetch all shifts from database to ensure we have the latest data
    const { data: allShifts, error: fetchError } = await supabase
      .from('shifts')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', session.user.id)
      .order('date', { ascending: true })

    if (!fetchError && allShifts) {
      const shiftsData = allShifts as ShiftWithOrganization[]
      setShifts(shiftsData)
      setToLocalStorage('shiftflow_shifts', shiftsData)
    }

    return true
  }

  const deleteShift = async (id: string): Promise<boolean> => {
    try {
      console.log('[useShifts] deleteShift START, id:', id, 'userId state:', userId)
      if (!supabaseConfigured) {
        console.error('[useShifts] Supabase not configured')
        return false
      }
      setError(null)

      console.log('[useShifts] Creating supabase client')
      const supabase = createClient()

      console.log('[useShifts] Getting session')
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[useShifts] Session check in deleteShift:', session?.user?.id)
      if (!session?.user?.id) {
        console.error('[useShifts] Not authenticated - no session')
        setError('Not authenticated')
        return false
      }

      console.log('[useShifts] Deleting shift from database')

      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('[useShifts] Error deleting shift:', deleteError)
        setError(deleteError.message)
        return false
      }

      console.log('[useShifts] Shift deleted successfully')

      console.log('[useShifts] Re-fetching all shifts')
      // Re-fetch all shifts from database to ensure we have the latest data
      const { data: allShifts, error: fetchError } = await supabase
        .from('shifts')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', session.user.id)
        .order('date', { ascending: true })

      if (!fetchError && allShifts) {
        console.log('[useShifts] Re-fetched', allShifts.length, 'shifts, updating state')
        const shiftsData = allShifts as ShiftWithOrganization[]
        setShifts(shiftsData)
        setToLocalStorage('shiftflow_shifts', shiftsData)
      }

      console.log('[useShifts] deleteShift END')
      return true
    } catch (error) {
      console.error('[useShifts] EXCEPTION in deleteShift:', error)
      return false
    }
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
