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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:173',message:'syncShiftsForUser START',data:{uid:uid,currentShiftsCount:shifts.length},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      const { data, error: fetchError } = await runWithTimeout(
        queryShiftsForUser(uid),
        'fetch shifts'
      )

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:180',message:'syncShiftsForUser response',data:{hasData:!!data,dataCount:data?.length,hasError:!!fetchError,errorMessage:fetchError?.message,errorCode:fetchError?.code},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      if (fetchError) {
        const message = formatSupabaseError(fetchError, 'Failed to load shifts')
        console.error('[useShifts] Error fetching shifts:', fetchError)
        setError(message)
        // CRITICAL FIX: Don't clear existing shifts on fetch error - preserve current state
        // Only clear on initial load, not on sync after mutation
        // applyFetchedShifts([]) // REMOVED - this was wiping out the calendar
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:188',message:'syncShiftsForUser error - preserving existing shifts',data:{preservedShiftsCount:shifts.length},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        return false
      }

      setError(null)
      applyFetchedShifts((data || []) as ShiftWithOrganization[])
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:194',message:'syncShiftsForUser success',data:{newShiftsCount:(data || []).length},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return true
    } catch (err) {
      console.error('[useShifts] Exception while fetching shifts:', err)
      setError('Failed to load shifts')
      // CRITICAL FIX: Don't clear existing shifts on exception - preserve current state
      // applyFetchedShifts([]) // REMOVED - this was wiping out the calendar
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:201',message:'syncShiftsForUser exception - preserving existing shifts',data:{preservedShiftsCount:shifts.length,error:String(err)},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return false
    }
  }, [queryShiftsForUser, applyFetchedShifts, shifts.length])

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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:219',message:'fetchShiftsData START',data:{uid:uid,currentShiftsCount:shifts.length},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      try {
        const { data, error: fetchError } = await runWithTimeout(
          queryShiftsForUser(uid),
          'fetch shifts',
          10000 // Shorter timeout (10s instead of 15s) to fail faster
        )

        if (!isMounted) return

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:228',message:'fetchShiftsData response',data:{hasData:!!data,dataCount:data?.length,hasError:!!fetchError,errorMessage:fetchError?.message,errorCode:fetchError?.code},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        if (fetchError) {
          console.error('[useShifts] Error fetching shifts:', fetchError)
          setError(formatSupabaseError(fetchError, 'Failed to load shifts'))
          // CRITICAL FIX: Only clear shifts on initial load (when shifts.length is 0)
          // Don't clear existing shifts on refresh errors - preserve current state
          if (shifts.length === 0) {
            applyFetchedShifts([])
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:237',message:'fetchShiftsData error - clearing (initial load)',data:{},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:241',message:'fetchShiftsData error - preserving existing shifts',data:{preservedShiftsCount:shifts.length},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
          }
        } else {
          console.log('[useShifts] Fetched shifts from DB:', data?.length || 0, 'shifts')
          setError(null)
          applyFetchedShifts((data || []) as ShiftWithOrganization[])
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:248',message:'fetchShiftsData success',data:{newShiftsCount:(data || []).length},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
        }
      } catch (err) {
        if (!isMounted) return
        console.error('[useShifts] Exception while fetching shifts:', err)
        setError('Failed to load shifts')
        // CRITICAL FIX: Only clear shifts on initial load
        if (shifts.length === 0) {
          applyFetchedShifts([])
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:258',message:'fetchShiftsData exception - clearing (initial load)',data:{error:String(err)},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:262',message:'fetchShiftsData exception - preserving existing shifts',data:{preservedShiftsCount:shifts.length,error:String(err)},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
        }
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
    fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:388',message:'resolveUserId called',data:{currentUserId:userId,userIdType:typeof userId,userIdTruthy:!!userId},timestamp:Date.now(),runId:'run4',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    console.log('[useShifts] resolveUserId called, current userId state:', userId, 'type:', typeof userId, 'truthy:', !!userId)
    
    // CRITICAL FIX: If userId is already set, use it immediately - no API calls needed
    // This is the fastest path and avoids all timeout issues
    if (userId) {
      console.log('[useShifts] Using existing userId from state (NO API CALL):', userId)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:396',message:'resolveUserId returning existing userId (NO API CALL)',data:{userId:userId},timestamp:Date.now(),runId:'run4',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      return userId
    }
    
    console.warn('[useShifts] WARNING: userId is null/undefined, will attempt getSession() - this should be rare after page load')

    const supabase = createClient()

    // CRITICAL FIX: ONLY use getSession() - NEVER call getUser() as it always times out after refresh
    // getSession() reads from cookies and is much faster/more reliable
    console.log('[useShifts] userId not set, using getSession() ONLY (no getUser fallback)')
    try {
      // Use a shorter timeout (3s) and if it fails, we'll return null
      const getSessionResponse = await runWithTimeout(
        supabase.auth.getSession(),
        'auth.getSession',
        3000 // Very short timeout (3s) to fail fast
      ) as AuthSessionResponse
      const { data: { session } } = getSessionResponse
      const sessionUserId = session?.user?.id || null
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:408',message:'getSession result',data:{sessionUserId:sessionUserId,hasSession:!!session},timestamp:Date.now(),runId:'run3',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      console.log('[useShifts] getSession() returned:', sessionUserId)
      if (sessionUserId) {
        setUserId(sessionUserId)
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:413',message:'getSession success, returning userId',data:{userId:sessionUserId},timestamp:Date.now(),runId:'run3',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        return sessionUserId
      }
    } catch (getSessionError) {
      console.error('[useShifts] getSession() failed (no fallback to getUser):', getSessionError)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:419',message:'getSession exception - returning null (no getUser fallback)',data:{error:String(getSessionError)},timestamp:Date.now(),runId:'run3',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:424',message:'resolveUserId final result - no userId found',data:{finalUserId:null},timestamp:Date.now(),runId:'run3',hypothesisId:'H'})}).catch(()=>{});
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
      
      // CRITICAL FIX: Skip session verification - we already have userId from resolveUserId()
      // getSession() can also timeout, so we trust the userId we got from resolveUserId()
      // The database RLS policies will enforce security anyway
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:471',message:'createShift skipping session verification (using userId from resolveUserId)',data:{effectiveUserId:effectiveUserId},timestamp:Date.now(),runId:'run3',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      const insertPayload = { ...shift, user_id: effectiveUserId }
      console.log('[useShifts] Inserting shift to database:', insertPayload)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:390',message:'createShift inserting to database',data:{hasSupabaseClient:!!supabase,userId:effectiveUserId,hasValidSession:true},timestamp:Date.now(),runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const createResponse = await runWithTimeout(
        supabase
          .from('shifts')
          .insert(insertPayload)
          .select('*')
          .single(),
        'create shift',
        10000 // Shorter timeout for create (10s)
      ) as CreateShiftResponse
      const { data, error: createError } = createResponse

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:402',message:'createShift database response',data:{hasData:!!data,dataId:data?.id,hasError:!!createError,errorMessage:createError?.message,errorCode:createError?.code,errorDetails:createError?.details},timestamp:Date.now(),runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (createError) {
        console.error('[useShifts] Error creating shift:', createError)
        setError(formatSupabaseError(createError, 'Failed to create shift'))
        // CRITICAL FIX: Don't sync on error - preserve current state
        // await syncShiftsForUser(effectiveUserId) // REMOVED - this was causing issues
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:410',message:'createShift error - not syncing to preserve state',data:{},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        return null
      }

      // Only sync if create was successful
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:416',message:'createShift success - syncing shifts',data:{createdShiftId:data?.id},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
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
      
      // CRITICAL FIX: Skip session verification - we already have userId from resolveUserId()
      // getSession() can also timeout, so we trust the userId we got from resolveUserId()
      // The database RLS policies will enforce security anyway
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:641',message:'deleteShift skipping session verification (using userId from resolveUserId)',data:{effectiveUserId:effectiveUserId},timestamp:Date.now(),runId:'run3',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      console.log('[useShifts] Deleting shift from database, shift id:', id)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:576',message:'deleteShift deleting from database',data:{hasSupabaseClient:!!supabase,userId:effectiveUserId,shiftId:id,hasValidSession:true},timestamp:Date.now(),runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      const deleteResponse = await runWithTimeout(
        supabase
          .from('shifts')
          .delete({ count: 'exact' })
          .eq('id', id)
          .eq('user_id', effectiveUserId),
        'delete shift',
        10000 // Shorter timeout for delete (10s)
      ) as MutationCountResponse
      const { error: deleteError, count } = deleteResponse

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:589',message:'deleteShift database response',data:{count:count,hasError:!!deleteError,errorMessage:deleteError?.message,errorCode:deleteError?.code,errorDetails:deleteError?.details},timestamp:Date.now(),runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (deleteError) {
        console.error('[useShifts] Error deleting shift:', deleteError)
        setError(formatSupabaseError(deleteError, 'Failed to delete shift'))
        // CRITICAL FIX: Don't sync on error - preserve current state
        // await syncShiftsForUser(effectiveUserId) // REMOVED - this was causing calendar wipeout
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:595',message:'deleteShift error - not syncing to preserve state',data:{},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        return false
      }

      if (!count || count === 0) {
        setError('Shift not found or permission denied')
        // CRITICAL FIX: Don't sync on not found - preserve current state
        // await syncShiftsForUser(effectiveUserId) // REMOVED
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:602',message:'deleteShift not found - not syncing to preserve state',data:{count:count},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        return false
      }

      // Only sync if delete was successful
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/135ddc28-30a6-4314-830c-525fbad3d053',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useShifts.ts:608',message:'deleteShift success - syncing shifts',data:{deletedCount:count},timestamp:Date.now(),runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
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
