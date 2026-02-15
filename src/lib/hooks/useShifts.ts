'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shift, ShiftInsert, ShiftUpdate, ShiftWithOrganization } from '@/types/database'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

const SHIFTS_STORAGE_KEY = 'shiftflow_shifts'
const FETCH_TIMEOUT_MS = 15000

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && key && url !== 'your_supabase_project_url' && url.startsWith('http'))
}

const getFromLocalStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
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

const withTimeout = async <T,>(promise: PromiseLike<T>, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${FETCH_TIMEOUT_MS}ms`))
    }, FETCH_TIMEOUT_MS)
  })

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
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
  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])
  const externalUserId = options?.userId
  const externalAuthLoading = options?.authLoading ?? false
  const usingExternalAuth = typeof externalUserId !== 'undefined'

  const [shifts, setShifts] = useState<ShiftWithOrganization[]>(() =>
    getFromLocalStorage<ShiftWithOrganization[]>(SHIFTS_STORAGE_KEY, [])
  )
  const [loading, setLoading] = useState(usingExternalAuth ? externalAuthLoading : supabaseConfigured)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(externalUserId ?? null)

  const startDateStr = options?.startDate?.toISOString().split('T')[0]
  const endDateStr = options?.endDate?.toISOString().split('T')[0]
  const organizationId = options?.organizationId

  const applyShifts = useCallback((data: ShiftWithOrganization[] | null | undefined) => {
    const next = (data || []) as ShiftWithOrganization[]
    setShifts(next)
    setToLocalStorage(SHIFTS_STORAGE_KEY, next)
  }, [])

  const fetchShiftsForUser = useCallback(async (uid: string): Promise<boolean> => {
    const supabase = createClient()
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
        query = query.gte('date', startDateStr)
      }
      if (endDateStr) {
        query = query.lte('date', endDateStr)
      }
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error: fetchError } = await withTimeout<{
        data: ShiftWithOrganization[] | null
        error: { message: string } | null
      }>(query, 'fetch shifts')

      if (fetchError) {
        setError(fetchError.message)
        console.error('[useShifts] Error fetching shifts:', fetchError)
        return false
      }

      setError(null)
      applyShifts((data || []) as ShiftWithOrganization[])
      console.log('[useShifts] Fetched shifts from DB:', (data || []).length, 'shifts')
      return true
    } catch (fetchException) {
      const message = fetchException instanceof Error
        ? fetchException.message
        : 'Failed to fetch shifts'
      setError(message)
      console.error('[useShifts] Exception while fetching shifts:', fetchException)
      return false
    }
  }, [applyShifts, endDateStr, organizationId, startDateStr])

  const requireUserId = useCallback(async (): Promise<string | null> => {
    if (externalUserId) return externalUserId
    if (userId) return userId
    if (!supabaseConfigured) return null

    const supabase = createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('[useShifts] requireUserId getSession error', sessionError)
      return null
    }

    const sessionUserId = session?.user?.id || null
    if (!sessionUserId) {
      console.warn('[useShifts] requireUserId: no session user found')
    }
    if (sessionUserId) {
      setUserId(sessionUserId)
    }

    return sessionUserId
  }, [supabaseConfigured, userId, externalUserId])

  useEffect(() => {
    if (!supabaseConfigured) {
      return
    }

    if (usingExternalAuth) {
      if (externalAuthLoading) return

      if (!externalUserId) {
        return
      }

      let isMounted = true
      const startLoadingTimer = window.setTimeout(() => {
        if (isMounted) setLoading(true)
      }, 0)
      const fallbackTimer = window.setTimeout(() => {
        if (!isMounted) return
        setLoading(false)
        setError((prev) => prev ?? 'Loading shifts is taking longer than expected.')
      }, FETCH_TIMEOUT_MS + 1000)
      const fetchTimer = window.setTimeout(() => {
        void fetchShiftsForUser(externalUserId)
          .finally(() => {
            window.clearTimeout(startLoadingTimer)
            window.clearTimeout(fallbackTimer)
            if (isMounted) setLoading(false)
          })
      }, 0)

      return () => {
        isMounted = false
        window.clearTimeout(startLoadingTimer)
        window.clearTimeout(fallbackTimer)
        window.clearTimeout(fetchTimer)
      }
    }

    const supabase = createClient()
    let isMounted = true

    const finishLoading = () => {
      if (isMounted) {
        setLoading(false)
      }
    }

    const handleSession = async (session: Session | null) => {
      if (!isMounted) return

      if (session?.user?.id) {
        setUserId(session.user.id)
        await fetchShiftsForUser(session.user.id)
      } else {
        setUserId(null)
        // Keep cached shifts while auth is resolving/refreshed.
        setError(null)
      }

      finishLoading()
    }

    const loadInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await handleSession(session)
      } catch (sessionError) {
        console.error('[useShifts] loadInitialSession error', sessionError)
        finishLoading()
      }
    }

    loadInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return

        if (event === 'SIGNED_OUT') {
          setUserId(null)
          applyShifts([])
          setError(null)
          finishLoading()
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          await handleSession(session)
        }
      }
    )

    const timeout = setTimeout(() => {
      finishLoading()
    }, 6000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [applyShifts, fetchShiftsForUser, supabaseConfigured, usingExternalAuth, externalAuthLoading, externalUserId])

  const refetch = useCallback(async () => {
    const uid = await requireUserId()
    if (!uid) return
    await fetchShiftsForUser(uid)
  }, [fetchShiftsForUser, requireUserId])

  const createShift = async (shift: Omit<ShiftInsert, 'user_id'>): Promise<Shift | null> => {
    if (!supabaseConfigured) return null

    const uid = await requireUserId()
    if (!uid) {
      setError('Not authenticated')
      return null
    }

    setError(null)
    const supabase = createClient()

    const { data, error: createError } = await supabase
      .from('shifts')
      .insert({ ...shift, user_id: uid })
      .select(`
        *,
        organization:organizations(*)
      `)
      .single()

    console.log('[useShifts] createShift result', { data, error: createError })

    if (createError) {
      setError(createError.message)
      return null
    }

    await fetchShiftsForUser(uid)
    return data as Shift
  }

  const updateShift = async (id: string, updates: ShiftUpdate): Promise<boolean> => {
    if (!supabaseConfigured) return false

    const uid = await requireUserId()
    if (!uid) {
      setError('Not authenticated')
      return false
    }

    setError(null)
    const supabase = createClient()

    const { data, error: updateError } = await supabase
      .from('shifts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', uid)
      .select('id')

    console.log('[useShifts] updateShift result', { data, error: updateError })

    if (updateError) {
      setError(updateError.message)
      return false
    }

    await fetchShiftsForUser(uid)
    return true
  }

  const deleteShift = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false

    const uid = await requireUserId()
    if (!uid) {
      setError('Not authenticated')
      return false
    }

    setError(null)
    const supabase = createClient()

    const { data, error: deleteError } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)
      .eq('user_id', uid)
      .select('id')

    console.log('[useShifts] deleteShift result', { data, error: deleteError })

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    await fetchShiftsForUser(uid)
    return true
  }

  return {
    shifts,
    loading,
    error,
    createShift,
    updateShift,
    deleteShift,
    refetch,
  }
}
