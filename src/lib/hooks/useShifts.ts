'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { runSupabaseQueryWithRetry } from '@/lib/supabase/operations'
import { Shift, ShiftInsert, ShiftUpdate, ShiftWithOrganization } from '@/types/database'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

const SHIFTS_STORAGE_KEY = 'shiftflow_shifts'
const EXTERNAL_AUTH_LOADING_HINT_MS = 16000
type SupabaseErrorLike = {
  message?: string
  code?: string
  details?: string
  hint?: string
} | null

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

interface UseShiftsOptions {
  startDate?: Date
  endDate?: Date
  organizationId?: string
  userId?: string | null
  authLoading?: boolean
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
  const externalUserId = options?.userId
  const externalAuthLoading = options?.authLoading ?? false
  const usingExternalAuth = typeof externalUserId !== 'undefined'

  const [shifts, setShifts] = useState<ShiftWithOrganization[]>(() => getFromLocalStorage(SHIFTS_STORAGE_KEY) || [])
  const [loading, setLoading] = useState(usingExternalAuth ? externalAuthLoading : true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(() => {
    if (usingExternalAuth) {
      return externalUserId ?? null
    }

    const storedUser = getFromLocalStorage('shiftflow_user')
    return storedUser?.id || null
  })

  const sessionHandledRef = useRef(false)
  const loadingCompletedRef = useRef(false)
  const cachedShiftsRef = useRef(shifts.length > 0)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Stabilize options to prevent infinite loops
  const startDateStr = options?.startDate?.toISOString()
  const endDateStr = options?.endDate?.toISOString()
  const organizationId = options?.organizationId

  useEffect(() => {
    if (shifts.length > 0) {
      cachedShiftsRef.current = true
    }
  }, [shifts.length])

  useEffect(() => {
    if (!usingExternalAuth) return
    setUserId(externalUserId ?? null)
  }, [externalUserId, usingExternalAuth])

  const applyFetchedShifts = useCallback((data: ShiftWithOrganization[] | null | undefined) => {
    const next = (data || []) as ShiftWithOrganization[]
    setShifts(next)
    setToLocalStorage(SHIFTS_STORAGE_KEY, next)
  }, [])

  const buildShiftsQuery = useCallback((
    supabase: ReturnType<typeof createClient>,
    uid: string,
    signal: AbortSignal
  ) => {
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

    return query.abortSignal(signal)
  }, [startDateStr, endDateStr, organizationId])

  const syncShiftsForUser = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const { data, error: fetchError } = await runSupabaseQueryWithRetry<{
        data: ShiftWithOrganization[] | null
        error: SupabaseErrorLike
      }>(
        'fetch shifts',
        (supabase, signal) => buildShiftsQuery(supabase, uid, signal)
      )

      if (fetchError) {
        const message = formatSupabaseError(fetchError, 'Failed to load shifts')
        console.error('[useShifts] Error fetching shifts:', fetchError)
        setError(message)
        return false
      }

      setError(null)
      applyFetchedShifts((data || []) as ShiftWithOrganization[])
      return true
    } catch (err) {
      console.error('[useShifts] Exception while fetching shifts:', err)
      setError('Failed to load shifts')
      return false
    }
  }, [buildShiftsQuery, applyFetchedShifts])

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      loadingCompletedRef.current = true
      return
    }

    if (usingExternalAuth) {
      if (externalAuthLoading) {
        setLoading(true)
        return
      }

      if (!externalUserId) {
        setUserId(null)
        applyFetchedShifts([])
        setError(null)
        setLoading(false)
        return
      }

      let isMounted = true
      const fallbackTimer = window.setTimeout(() => {
        if (!isMounted) return
        setLoading(false)
        if (!cachedShiftsRef.current) {
          setError((prev) => prev ?? 'Loading shifts is taking longer than expected.')
        } else {
          console.warn('[useShifts] Remote shifts request is slow, using cached data')
        }
      }, EXTERNAL_AUTH_LOADING_HINT_MS)

      setLoading(true)
      setUserId(externalUserId)
      syncShiftsForUser(externalUserId)
        .finally(() => {
          window.clearTimeout(fallbackTimer)
          if (isMounted) setLoading(false)
        })

      return () => {
        isMounted = false
        window.clearTimeout(fallbackTimer)
      }
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

    const handleSession = async (session: Session | null, source: string) => {
      if (!isMounted) return

      console.log('[useShifts] handleSession called from:', source, 'userId:', session?.user?.id)

      if (sessionHandledRef.current && source !== 'auth_change') {
        console.log('[useShifts] Session already handled, skipping')
        return
      }
      sessionHandledRef.current = true

      try {
        if (session?.user) {
          setUserId(session.user.id)
          await syncShiftsForUser(session.user.id)
        } else {
          setUserId(null)
          applyFetchedShifts([])
        }
      } catch (sessionError) {
        console.error('[useShifts] Error in handleSession:', sessionError)
      } finally {
        completeLoading()
      }
    }

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

    const timeout = window.setTimeout(() => {
      completeLoading()
    }, 3000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [
    supabaseConfigured,
    usingExternalAuth,
    externalAuthLoading,
    externalUserId,
    applyFetchedShifts,
    syncShiftsForUser,
  ])

  const fetchShifts = useCallback(async () => {
    if (!userId || !supabaseConfigured) {
      return
    }

    await syncShiftsForUser(userId)
  }, [userId, supabaseConfigured, syncShiftsForUser])

  const resolveUserId = useCallback(async () => {
    if (externalUserId) {
      return externalUserId
    }

    if (userId) {
      return userId
    }

    if (usingExternalAuth) {
      return null
    }

    const supabase = createClient()

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('[useShifts] getSession() failed:', sessionError)
        return null
      }

      const sessionUserId = session?.user?.id || null
      if (sessionUserId) {
        setUserId(sessionUserId)
      }
      return sessionUserId
    } catch (getSessionError) {
      console.error('[useShifts] getSession() failed:', getSessionError)
      return null
    }
  }, [externalUserId, userId, usingExternalAuth])

  const createShift = async (shift: Omit<ShiftInsert, 'user_id'>): Promise<Shift | null> => {
    try {
      if (!supabaseConfigured) {
        return null
      }

      const effectiveUserId = await resolveUserId()
      if (!effectiveUserId) {
        setError('Session expired, please log in again')
        return null
      }

      setError(null)

      const insertPayload = { ...shift, user_id: effectiveUserId }

      const { data, error: createError } = await runSupabaseQueryWithRetry<{
        data: Shift | null
        error: SupabaseErrorLike
      }>(
        'create shift',
        (supabase, signal) =>
          supabase
            .from('shifts')
            .insert(insertPayload)
            .select('*')
            .single()
            .abortSignal(signal)
      )

      if (createError) {
        console.error('[useShifts] Error creating shift:', createError)
        setError(formatSupabaseError(createError, 'Failed to create shift'))
        return null
      }

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

      return data as Shift
    } catch (mutationError) {
      console.error('[useShifts] EXCEPTION in createShift:', mutationError)
      setError('Failed to create shift')
      return null
    }
  }

  const updateShift = async (id: string, updates: ShiftUpdate): Promise<boolean> => {
    try {
      if (!supabaseConfigured) {
        return false
      }

      const effectiveUserId = await resolveUserId()
      if (!effectiveUserId) {
        setError('Session expired, please log in again')
        return false
      }

      setError(null)

      const { error: updateError, count } = await runSupabaseQueryWithRetry<{
        error: SupabaseErrorLike
        count: number | null
      }>(
        'update shift',
        (supabase, signal) =>
          supabase
            .from('shifts')
            .update(updates, { count: 'exact' })
            .eq('id', id)
            .eq('user_id', effectiveUserId)
            .abortSignal(signal)
      )

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
      return true
    } catch (mutationError) {
      console.error('[useShifts] EXCEPTION in updateShift:', mutationError)
      setError('Failed to update shift')
      return false
    }
  }

  const deleteShift = async (id: string): Promise<boolean> => {
    try {
      if (!supabaseConfigured) {
        return false
      }

      const effectiveUserId = await resolveUserId()
      if (!effectiveUserId) {
        setError('Session expired, please log in again')
        return false
      }

      setError(null)

      const { error: deleteError, count } = await runSupabaseQueryWithRetry<{
        error: SupabaseErrorLike
        count: number | null
      }>(
        'delete shift',
        (supabase, signal) =>
          supabase
            .from('shifts')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('user_id', effectiveUserId)
            .abortSignal(signal)
      )

      if (deleteError) {
        console.error('[useShifts] Error deleting shift:', deleteError)
        setError(formatSupabaseError(deleteError, 'Failed to delete shift'))
        return false
      }

      if (!count || count === 0) {
        setError('Shift not found or permission denied')
        return false
      }

      const syncSuccess = await syncShiftsForUser(effectiveUserId)
      if (!syncSuccess) {
        setError('Shift deleted, but refresh failed. Please reload to see latest data.')
        setShifts((prev) => {
          const next = prev.filter((shiftItem) => shiftItem.id !== id)
          setToLocalStorage(SHIFTS_STORAGE_KEY, next)
          return next
        })
      }

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
