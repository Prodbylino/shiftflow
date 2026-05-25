'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { runSupabaseQueryWithRetry } from '@/lib/supabase/operations'
import { Organization, OrganizationInsert, OrganizationUpdate } from '@/types/database'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

const EXTERNAL_AUTH_LOADING_HINT_MS = 25000
type SupabaseErrorLike = { message?: string } | null

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

interface UseOrganizationsReturn {
  organizations: Organization[]
  loading: boolean
  error: string | null
  createOrganization: (org: Omit<OrganizationInsert, 'user_id'>) => Promise<Organization | null>
  updateOrganization: (id: string, updates: OrganizationUpdate) => Promise<boolean>
  deleteOrganization: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
}

interface UseOrganizationsOptions {
  userId?: string | null
  authLoading?: boolean
}

export function useOrganizations(options?: UseOrganizationsOptions): UseOrganizationsReturn {
  const externalUserId = options?.userId
  const externalAuthLoading = options?.authLoading ?? false
  const usingExternalAuth = typeof externalUserId !== 'undefined'

  const [organizations, setOrganizations] = useState<Organization[]>(() => getFromLocalStorage('timesheetai_orgs') || [])
  const [loading, setLoading] = useState(usingExternalAuth ? externalAuthLoading : true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(externalUserId ?? null)
  const cachedOrganizationsRef = useRef(organizations.length > 0)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  useEffect(() => {
    if (organizations.length > 0) {
      cachedOrganizationsRef.current = true
    }
  }, [organizations.length])

  const fetchOrgsForUser = useCallback(async (uid: string) => {
    console.log('[useOrganizations] Fetching organizations for user:', uid)

    try {
      const { data, error: fetchError } = await runSupabaseQueryWithRetry<{
        data: Organization[] | null
        error: SupabaseErrorLike
      }>(
        'fetch organizations',
        (supabase, signal) =>
          supabase
            .from('organizations')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .abortSignal(signal)
      )

      if (fetchError) {
        if (!cachedOrganizationsRef.current) {
          setError(fetchError.message ?? 'Failed to fetch organizations')
        } else {
          setError(null)
          console.warn('[useOrganizations] Fetch failed, keeping cached organizations:', fetchError)
        }
        console.error('[useOrganizations] Error fetching organizations:', fetchError)
        return
      }

      setError(null)
      setOrganizations(data || [])
      setToLocalStorage('timesheetai_orgs', data || [])
      console.log('[useOrganizations] Fetched organizations from DB:', (data || []).length, 'orgs')
    } catch (fetchException) {
      if (cachedOrganizationsRef.current) {
        setError(null)
        console.warn('[useOrganizations] Request failed, keeping cached organizations:', fetchException)
        return
      }

      const isAbort = fetchException instanceof DOMException && fetchException.name === 'AbortError'
      const message = fetchException instanceof Error
        ? (isAbort ? 'Organizations request timed out. Please try again.' : fetchException.message)
        : 'Failed to fetch organizations'
      setError(message)
      console.error('[useOrganizations] Exception while fetching organizations:', fetchException)
    }
  }, [])

  useEffect(() => {
    if (!usingExternalAuth) return
    setUserId(externalUserId ?? null)
  }, [externalUserId, usingExternalAuth])

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    if (usingExternalAuth) {
      if (externalAuthLoading) {
        setLoading(true)
        return
      }

      if (!externalUserId) {
        setOrganizations([])
        setToLocalStorage('timesheetai_orgs', [])
        setLoading(false)
        return
      }

      let isMounted = true
      const fallbackTimer = window.setTimeout(() => {
        if (!isMounted) return
        setLoading(false)
        if (!cachedOrganizationsRef.current) {
          setError((prev) => prev ?? 'Loading organizations is taking longer than expected.')
        } else {
          console.warn('[useOrganizations] Remote organizations request is slow, using cached data')
        }
      }, EXTERNAL_AUTH_LOADING_HINT_MS)
      setLoading(true)
      fetchOrgsForUser(externalUserId)
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

    const completeLoading = () => {
      if (isMounted) {
        setLoading(false)
      }
    }

    const handleSession = async (session: Session | null) => {
      if (!isMounted) return

      try {
        if (session?.user) {
          setUserId(session.user.id)
          await fetchOrgsForUser(session.user.id)
        } else {
          setUserId(null)
          setOrganizations([])
          setToLocalStorage('timesheetai_orgs', [])
        }
      } catch (error) {
        console.error('Error in handleSession:', error)
      } finally {
        // Always complete loading, even if there's an error
        completeLoading()
      }
    }

    const loadInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await handleSession(session)
      } catch (error) {
        console.error('Error getting session:', error)
        completeLoading()
      }
    }
    loadInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return

        if (
          event === 'SIGNED_IN' ||
          event === 'SIGNED_OUT' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION'
        ) {
          await handleSession(session)
        }
      }
    )

    const timeout = setTimeout(() => {
      completeLoading()
    }, 6000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [supabaseConfigured, usingExternalAuth, externalAuthLoading, externalUserId, fetchOrgsForUser])

  const fetchOrganizations = useCallback(async () => {
    if (!userId || !supabaseConfigured) {
      return
    }
    setError(null)

    try {
      await fetchOrgsForUser(userId)
    } catch {
      setError('Failed to fetch organizations')
    }
  }, [userId, supabaseConfigured, fetchOrgsForUser])


  const resolveUserId = useCallback(async () => {
    if (userId) return userId

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const sessionUserId = session?.user?.id || null
      if (sessionUserId) {
        setUserId(sessionUserId)
      }
      return sessionUserId
    } catch {
      return null
    }
  }, [userId])

  const createOrganization = async (org: Omit<OrganizationInsert, 'user_id'>): Promise<Organization | null> => {
    if (!supabaseConfigured) return null
    setError(null)

    let effectiveUserId = externalUserId ?? userId
    if (!effectiveUserId) {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        setError(sessionError.message)
        return null
      }
      effectiveUserId = session?.user?.id ?? null
    }

    if (!effectiveUserId) {
      setError('Not authenticated')
      return null
    }

    const { data, error: createError } = await runSupabaseQueryWithRetry<{
      data: Organization | null
      error: SupabaseErrorLike
    }>(
      'create organization',
      (supabase, signal) =>
        supabase
          .from('organizations')
          .insert({ ...org, user_id: effectiveUserId })
          .select()
          .single()
          .abortSignal(signal)
    )

    if (createError) {
      console.error('[useOrganizations] Error creating:', createError)
      if (createError.message?.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.')
      } else {
        setError(createError.message ?? 'Failed to create organization')
      }
      return null
    }

    console.log('[useOrganizations] Organization created:', data)
    if (!data) {
      setError('Failed to create organization')
      return null
    }

    const updatedOrgs = [data, ...organizations]
    setOrganizations(updatedOrgs)
    setToLocalStorage('timesheetai_orgs', updatedOrgs)
    return data
  }

  const updateOrganization = async (id: string, updates: OrganizationUpdate): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const { error: updateError } = await runSupabaseQueryWithRetry<{
      error: SupabaseErrorLike
    }>(
      'update organization',
      (supabase, signal) =>
        supabase
          .from('organizations')
          .update(updates)
          .eq('id', id)
          .abortSignal(signal)
    )

    if (updateError) {
      setError(updateError.message ?? 'Failed to update organization')
      return false
    }

    const updatedOrgs = organizations.map(org => org.id === id ? { ...org, ...updates } as Organization : org)
    setOrganizations(updatedOrgs)
    setToLocalStorage('timesheetai_orgs', updatedOrgs)
    return true
  }

  const deleteOrganization = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const { error: deleteError } = await runSupabaseQueryWithRetry<{
      error: SupabaseErrorLike
    }>(
      'delete organization',
      (supabase, signal) =>
        supabase
          .from('organizations')
          .delete()
          .eq('id', id)
          .abortSignal(signal)
    )

    if (deleteError) {
      setError(deleteError.message ?? 'Failed to delete organization')
      return false
    }

    const updatedOrgs = organizations.filter(org => org.id !== id)
    setOrganizations(updatedOrgs)
    setToLocalStorage('timesheetai_orgs', updatedOrgs)
    return true
  }

  return {
    organizations,
    loading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refetch: fetchOrganizations,
  }
}
