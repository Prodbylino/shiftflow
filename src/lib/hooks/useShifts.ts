'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shift, ShiftInsert, ShiftUpdate, ShiftWithOrganization } from '@/types/database'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

const SHIFTS_STORAGE_KEY = 'shiftflow_shifts'

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

const setToLocalStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore localStorage errors
  }
}

const formatSupabaseError = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const parsed = error as {
    message?: string
    code?: string
    details?: string
    hint?: string
  }

  if (!parsed.message) {
    return fallback
  }

  const extra: string[] = []
  if (parsed.code) extra.push(`code=${parsed.code}`)
  if (parsed.details) extra.push(`details=${parsed.details}`)
  if (parsed.hint) extra.push(`hint=${parsed.hint}`)

  return extra.length > 0 ? `${parsed.message} (${extra.join(', ')})` : parsed.message
}

type SupabaseErrorLike = {
  message?: string
  code?: string
  details?: string
  hint?: string
}

type AuthUserResponse = {
  data: { user: { id: string } | null }
  error: SupabaseErrorLike | null
}

type AuthSessionResponse = {
  data: { session: { user: { id: string } } | null }
  error: SupabaseErrorLike | null
}

type MutationCountResponse = {
  error: SupabaseErrorLike | null
  count: number | null
}

type CreateShiftResponse = {
  data: Shift | null
  error: SupabaseErrorLike | null
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
  const [shifts, setShifts] = useState<ShiftWithOrganization[]>(() => getFromLocalStorage(SHIFTS_STORAGE_KEY) || [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // CRITICAL FIX: Initialize userId from localStorage to avoid needing API calls after refresh
  // This ensures userId is available immediately, avoiding all timeout issues
  const [userId, setUserId] = useState<string | null>(() => {
    const storedUser = getFromLocalStorage('shiftflow_user')
    return storedUser?.id || null
  })
  const sessionHandledRef = useRef(false)
  const loadingCompletedRef = useRef(false)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Stabilize options to prevent infinite loops
  const startDateStr = options?.startDate?.toISOString()
  const endDateStr = options?.endDate?.toISOString()
  const organizationId = options?.organizationId

  const applyFetchedShifts = useCallback((data: ShiftWithOrganization[] | null | undefined) => {
    const next = (data || []) as ShiftWithOrganization[]
    setShifts(next)
    setToLocalStorage(SHIFTS_STORAGE_KEY, next)
  }, [])

  const queryShiftsForUser = useCallback(async (uid: string) => {
    const supabase = createClient()

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

    return query
  }, [startDateStr, endDateStr, organizationId])

  const syncShiftsForUser = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const { data, error: fetchError } = await queryShiftsForUser(uid)


      if (fetchError) {
        const message = formatSupabaseError(fetchError, 'Failed to load shifts')
        console.error('[useShifts] Error fetching shifts:', fetchError)
        setError(message)
        // CRITICAL FIX: Don't clear existing shifts on fetch error - preserve current state
        // Only clear on initial load, not on sync after mutation
        // applyFetchedShifts([]) // REMOVED - this was wiping out the calendar
        return false
      }

      setError(null)
      applyFetchedShifts((data || []) as ShiftWithOrganization[])
      return true
    } catch (err) {
      console.error('[useShifts] Exception while fetching shifts:', err)
      setError('Failed to load shifts')
      // CRITICAL FIX: Don't clear existing shifts on exception - preserve current state
      // applyFetchedShifts([]) // REMOVED - this was wiping out the calendar
      return false
    }
  }, [queryShiftsForUser, applyFetchedShifts])

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
        const { data, error: fetchError } = await queryShiftsForUser(uid)

        if (!isMounted) return


        if (fetchError) {
          console.error('[useShifts] Error fetching shifts:', fetchError)
          setError(formatSupabaseError(fetchError, 'Failed to load shifts'))
          // CRITICAL FIX: Only clear shifts on initial load (when shifts.length is 0)
          // Don't clear existing shifts on refresh errors - preserve current state
          if (shifts.length === 0) {
            applyFetchedShifts([])
          }
        } else {
          console.log('[useShifts] Fetched shifts from DB:', data?.length || 0, 'shifts')
          setError(null)
          applyFetchedShifts((data || []) as ShiftWithOrganization[])
        }
      } catch (err) {
        if (!isMounted) return
        console.error('[useShifts] Exception while fetching shifts:', err)
        setError('Failed to load shifts')
        // Only clear shifts on initial load
        if (shifts.length === 0) {
          applyFetchedShifts([])
        }
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
          void fetchShiftsData(session.user.id)
        } else {
          console.log('[useShifts] No session, clearing data')
          setUserId(null)
          applyFetchedShifts([])
        }
      } catch (sessionError) {
        console.error('[useShifts] Error in handleSession:', sessionError)
      } finally {
        completeLoading()
      }
    }

    // Get initial session immediately - this reads from cookies
    const loadInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await handleSession(session, 'get_session')
      } catch (sessionError) {
        console.error('[useShifts] Error getting session:', sessionError)
        completeLoading()
      }
    }
    loadInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return

        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          sessionHandledRef.current = false
          await handleSession(session, 'auth_change')
        } else if (event === 'INITIAL_SESSION') {
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
  }, [supabaseConfigured, queryShiftsForUser, applyFetchedShifts, shifts.length])

  const fetchShifts = useCallback(async () => {
    if (!userId || !supabaseConfigured) {
      return
    }

    await syncShiftsForUser(userId)
  }, [userId, supabaseConfigured, syncShiftsForUser])

  const resolveUserId = useCallback(async () => {
    console.log('[useShifts] resolveUserId called, current userId state:', userId, 'type:', typeof userId, 'truthy:', !!userId)
    
    // CRITICAL FIX: If userId is already set, use it immediately - no API calls needed
    // This is the fastest path and avoids all timeout issues
    if (userId) {
      console.log('[useShifts] Using existing userId from state (NO API CALL):', userId)
      return userId
    }
    
    console.warn('[useShifts] WARNING: userId is null/undefined, will attempt getSession() - this should be rare after page load')

    const supabase = createClient()

    // CRITICAL FIX: ONLY use getSession() - NEVER call getUser() as it always times out after refresh
    // getSession() reads from cookies and is much faster/more reliable
    console.log('[useShifts] userId not set, using getSession() ONLY (no getUser fallback)')
    try {
      const getSessionResponse = await supabase.auth.getSession() as AuthSessionResponse
      const { data: { session } } = getSessionResponse
      const sessionUserId = session?.user?.id || null
      console.log('[useShifts] getSession() returned:', sessionUserId)
      if (sessionUserId) {
        setUserId(sessionUserId)
        return sessionUserId
      }
    } catch (getSessionError) {
      console.error('[useShifts] getSession() failed (no fallback to getUser):', getSessionError)
    }

    return null
  }, [userId])

  const createShift = async (shift: Omit<ShiftInsert, 'user_id'>): Promise<Shift | null> => {
    try {
      console.log('[useShifts] createShift START')
      if (!supabaseConfigured) {
        console.error('[useShifts] Supabase not configured')
        return null
      }

      const effectiveUserId = await resolveUserId()
      if (!effectiveUserId) {
        setError('Session expired, please log in again')
        return null
      }

      setError(null)

      const supabase = createClient()
      
      const insertPayload = { ...shift, user_id: effectiveUserId }
      console.log('[useShifts] Inserting shift to database:', insertPayload)

      const createResponse = await supabase
        .from('shifts')
        .insert(insertPayload)
        .select('*')
        .single() as CreateShiftResponse
      const { data, error: createError } = createResponse


      if (createError) {
        console.error('[useShifts] Error creating shift:', createError)
        setError(formatSupabaseError(createError, 'Failed to create shift'))
        // CRITICAL FIX: Don't sync on error - preserve current state
        // await syncShiftsForUser(effectiveUserId) // REMOVED - this was causing issues
        return null
      }

      // Keep local state consistent even if follow-up fetch fails
      const syncSuccess = await syncShiftsForUser(effectiveUserId)
      if (!syncSuccess) {
        setError('Shift created, but refresh failed. Please reload to see latest data.')

        if (data) {
          const optimisticShift = data as ShiftWithOrganization
          setShifts((prev) => {
            const exists = prev.some((shiftItem) => shiftItem.id === optimisticShift.id)
            const next = exists ? prev : [...prev, optimisticShift]
            setToLocalStorage(SHIFTS_STORAGE_KEY, next)
            return next
          })
        }
      }

      console.log('[useShifts] createShift END')
      return data as Shift
    } catch (mutationError) {
      console.error('[useShifts] EXCEPTION in createShift:', mutationError)
      setError('Failed to create shift')
      return null
    }
  }

  const updateShift = async (id: string, updates: ShiftUpdate): Promise<boolean> => {
    try {
      console.log('[useShifts] updateShift START, id:', id)
      if (!supabaseConfigured) {
        console.error('[useShifts] Supabase not configured')
        return false
      }

      const effectiveUserId = await resolveUserId()
      if (!effectiveUserId) {
        setError('Session expired, please log in again')
        return false
      }

      setError(null)

      const supabase = createClient()
      const updateResponse = await supabase
        .from('shifts')
        .update(updates, { count: 'exact' })
        .eq('id', id)
        .eq('user_id', effectiveUserId) as MutationCountResponse
      const { error: updateError, count } = updateResponse

      if (updateError) {
        console.error('[useShifts] Error updating shift:', updateError)
        setError(formatSupabaseError(updateError, 'Failed to update shift'))
        return false
      }

      if (!count) {
        setError('Shift not found or permission denied')
        return false
      }

      await syncShiftsForUser(effectiveUserId)

      console.log('[useShifts] updateShift END')
      return true
    } catch (mutationError) {
      console.error('[useShifts] EXCEPTION in updateShift:', mutationError)
      setError('Failed to update shift')
      return false
    }
  }

  const deleteShift = async (id: string): Promise<boolean> => {
    try {
      console.log('[useShifts] deleteShift START, id:', id)
      if (!supabaseConfigured) {
        console.error('[useShifts] Supabase not configured')
        return false
      }

      const effectiveUserId = await resolveUserId()
      if (!effectiveUserId) {
        setError('Session expired, please log in again')
        return false
      }

      setError(null)

      const supabase = createClient()
      
      console.log('[useShifts] Deleting shift from database, shift id:', id)

      const deleteResponse = await supabase
        .from('shifts')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', effectiveUserId) as MutationCountResponse
      const { error: deleteError, count } = deleteResponse


      if (deleteError) {
        console.error('[useShifts] Error deleting shift:', deleteError)
        setError(formatSupabaseError(deleteError, 'Failed to delete shift'))
        // CRITICAL FIX: Don't sync on error - preserve current state
        // await syncShiftsForUser(effectiveUserId) // REMOVED - this was causing calendar wipeout
        return false
      }

      if (!count || count === 0) {
        setError('Shift not found or permission denied')
        // CRITICAL FIX: Don't sync on not found - preserve current state
        // await syncShiftsForUser(effectiveUserId) // REMOVED
        return false
      }

      // Keep local state consistent even if follow-up fetch fails
      const syncSuccess = await syncShiftsForUser(effectiveUserId)
      if (!syncSuccess) {
        setError('Shift deleted, but refresh failed. Please reload to see latest data.')
        setShifts((prev) => {
          const next = prev.filter((shiftItem) => shiftItem.id !== id)
          setToLocalStorage(SHIFTS_STORAGE_KEY, next)
          return next
        })
      }

      console.log('[useShifts] deleteShift END')
      return true
    } catch (mutationError) {
      console.error('[useShifts] EXCEPTION in deleteShift:', mutationError)
      setError('Failed to delete shift')
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
