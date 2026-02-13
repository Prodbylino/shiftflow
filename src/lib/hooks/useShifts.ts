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

const runWithTimeout = async <T>(
  operation: PromiseLike<T>,
  label: string,
  timeoutMs = 15000
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race<T>([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
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
  const [userId, setUserId] = useState<string | null>(null)
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
      const { data, error: fetchError } = await runWithTimeout(
        queryShiftsForUser(uid),
        'fetch shifts'
      )

      if (fetchError) {
        const message = formatSupabaseError(fetchError, 'Failed to load shifts')
        console.error('[useShifts] Error fetching shifts:', fetchError)
        setError(message)
        applyFetchedShifts([])
        return false
      }

      setError(null)
      applyFetchedShifts((data || []) as ShiftWithOrganization[])
      return true
    } catch (err) {
      console.error('[useShifts] Exception while fetching shifts:', err)
      setError('Failed to load shifts')
      applyFetchedShifts([])
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
        const { data, error: fetchError } = await runWithTimeout(
          queryShiftsForUser(uid),
          'fetch shifts'
        )

        if (!isMounted) return

        if (fetchError) {
          console.error('[useShifts] Error fetching shifts:', fetchError)
          setError(formatSupabaseError(fetchError, 'Failed to load shifts'))
          applyFetchedShifts([])
        } else {
          console.log('[useShifts] Fetched shifts from DB:', data?.length || 0, 'shifts')
          setError(null)
          applyFetchedShifts((data || []) as ShiftWithOrganization[])
        }
      } catch (err) {
        if (!isMounted) return
        console.error('[useShifts] Exception while fetching shifts:', err)
        setError('Failed to load shifts')
        applyFetchedShifts([])
      }
    }

    const handleSession = async (session: { user: { id: string } } | null, source: string) => {
      if (!isMounted) return

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:247',message:'handleSession called',data:{source:source,sessionUserId:session?.user?.id,alreadyHandled:sessionHandledRef.current},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log('[useShifts] handleSession called from:', source, 'userId:', session?.user?.id)

      // Prevent duplicate handling
      if (sessionHandledRef.current && source !== 'auth_change') {
        console.log('[useShifts] Session already handled, skipping')
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:254',message:'handleSession skipped (duplicate)',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return
      }
      sessionHandledRef.current = true

      try {
        if (session?.user) {
          console.log('[useShifts] User authenticated, setting userId:', session.user.id)
          setUserId(session.user.id)
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:262',message:'handleSession setting userId',data:{userId:session.user.id},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          await fetchShiftsData(session.user.id)
        } else {
          console.log('[useShifts] No session, clearing data')
          setUserId(null)
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:267',message:'handleSession no session, clearing userId',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          applyFetchedShifts([])
        }
      } catch (sessionError) {
        console.error('[useShifts] Error in handleSession:', sessionError)
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:271',message:'handleSession error',data:{error:String(sessionError)},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
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
  }, [supabaseConfigured, queryShiftsForUser, applyFetchedShifts])

  const fetchShifts = useCallback(async () => {
    if (!userId || !supabaseConfigured) {
      return
    }

    await syncShiftsForUser(userId)
  }, [userId, supabaseConfigured, syncShiftsForUser])

  const resolveUserId = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:337',message:'resolveUserId called',data:{currentUserId:userId},timestamp:Date.now(),runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('[useShifts] resolveUserId called, current userId state:', userId)
    
    // If userId is already set, use it immediately to avoid timeout issues after page refresh
    if (userId) {
      console.log('[useShifts] Using existing userId from state:', userId)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:344',message:'resolveUserId using existing userId',data:{userId:userId},timestamp:Date.now(),runId:'run2',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return userId
    }

    const supabase = createClient()

    // CRITICAL FIX: Use getSession() first (faster, reads from cookies) instead of getUser() (slower, validates token)
    // getSession() is much faster after page refresh and doesn't timeout
    console.log('[useShifts] userId not set, trying getSession() first (faster than getUser)')
    try {
      const getSessionResponse = await runWithTimeout(
        supabase.auth.getSession(),
        'auth.getSession',
        5000 // Shorter timeout for getSession (5s instead of 15s)
      ) as AuthSessionResponse
      const { data: { session } } = getSessionResponse
      const sessionUserId = session?.user?.id || null
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:356',message:'getSession result (first attempt)',data:{sessionUserId:sessionUserId},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('[useShifts] getSession() returned:', sessionUserId)
      if (sessionUserId) {
        setUserId(sessionUserId)
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:361',message:'getSession success, returning userId',data:{userId:sessionUserId},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return sessionUserId
      }
    } catch (getSessionError) {
      console.log('[useShifts] getSession() failed, trying getUser() as fallback:', getSessionError)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:367',message:'getSession exception, falling back to getUser',data:{error:String(getSessionError)},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    // Only try getUser() if getSession() failed (getUser is slower and may timeout)
    console.log('[useShifts] Falling back to getUser()')
    try {
      const getUserResponse = await runWithTimeout(
        supabase.auth.getUser(),
        'auth.getUser',
        5000 // Shorter timeout (5s instead of 15s) to fail fast
      ) as AuthUserResponse
      const { data: { user }, error: userError } = getUserResponse

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:378',message:'getUser result (fallback)',data:{userId:user?.id,hasError:!!userError,errorMessage:userError?.message},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (user?.id) {
        console.log('[useShifts] getUser() returned:', user.id)
        setUserId(user.id)
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:384',message:'getUser success, returning userId',data:{userId:user.id},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return user.id
      }

      if (userError) {
        console.log('[useShifts] getUser() failed:', userError.message)
      }
    } catch (getUserError) {
      console.error('[useShifts] getUser() also failed:', getUserError)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:393',message:'getUser exception',data:{error:String(getUserError)},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:397',message:'resolveUserId final result - no userId found',data:{finalUserId:null},timestamp:Date.now(),runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return null
  }, [userId])

  const createShift = async (shift: Omit<ShiftInsert, 'user_id'>): Promise<Shift | null> => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:359',message:'createShift START',data:{supabaseConfigured:supabaseConfigured,currentUserId:userId},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('[useShifts] createShift START')
      if (!supabaseConfigured) {
        console.error('[useShifts] Supabase not configured')
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:363',message:'createShift blocked: supabase not configured',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return null
      }

      const effectiveUserId = await resolveUserId()
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:370',message:'createShift after resolveUserId',data:{effectiveUserId:effectiveUserId},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!effectiveUserId) {
        setError('Session expired, please log in again')
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:373',message:'createShift blocked: no userId',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return null
      }

      setError(null)

      const supabase = createClient()
      const insertPayload = { ...shift, user_id: effectiveUserId }
      console.log('[useShifts] Inserting shift to database:', insertPayload)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:377',message:'createShift inserting to database',data:{hasSupabaseClient:!!supabase,userId:effectiveUserId},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const createResponse = await runWithTimeout(
        supabase
          .from('shifts')
          .insert(insertPayload)
          .select('*')
          .single(),
        'create shift'
      ) as CreateShiftResponse
      const { data, error: createError } = createResponse

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:388',message:'createShift database response',data:{hasData:!!data,hasError:!!createError,errorMessage:createError?.message},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (createError) {
        console.error('[useShifts] Error creating shift:', createError)
        setError(formatSupabaseError(createError, 'Failed to create shift'))
        return null
      }

      await syncShiftsForUser(effectiveUserId)

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
      const updateResponse = await runWithTimeout(
        supabase
          .from('shifts')
          .update(updates, { count: 'exact' })
          .eq('id', id)
          .eq('user_id', effectiveUserId),
        'update shift'
      ) as MutationCountResponse
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:455',message:'deleteShift START',data:{shiftId:id,supabaseConfigured:supabaseConfigured,currentUserId:userId},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('[useShifts] deleteShift START, id:', id)
      if (!supabaseConfigured) {
        console.error('[useShifts] Supabase not configured')
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:459',message:'deleteShift blocked: supabase not configured',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return false
      }

      const effectiveUserId = await resolveUserId()
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:466',message:'deleteShift after resolveUserId',data:{effectiveUserId:effectiveUserId},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!effectiveUserId) {
        setError('Session expired, please log in again')
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:469',message:'deleteShift blocked: no userId',data:{},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return false
      }

      setError(null)

      const supabase = createClient()
      console.log('[useShifts] Deleting shift from database, shift id:', id)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:473',message:'deleteShift deleting from database',data:{hasSupabaseClient:!!supabase,userId:effectiveUserId,shiftId:id},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const deleteResponse = await runWithTimeout(
        supabase
          .from('shifts')
          .delete({ count: 'exact' })
          .eq('id', id)
          .eq('user_id', effectiveUserId),
        'delete shift'
      ) as MutationCountResponse
      const { error: deleteError, count } = deleteResponse

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:485',message:'deleteShift database response',data:{count:count,hasError:!!deleteError,errorMessage:deleteError?.message},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (deleteError) {
        console.error('[useShifts] Error deleting shift:', deleteError)
        setError(formatSupabaseError(deleteError, 'Failed to delete shift'))
        return false
      }

      if (!count) {
        setError('Shift not found or permission denied')
        return false
      }

      await syncShiftsForUser(effectiveUserId)

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
