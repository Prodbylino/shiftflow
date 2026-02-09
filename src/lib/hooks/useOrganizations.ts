'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Organization, OrganizationInsert, OrganizationUpdate } from '@/types/database'
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

interface UseOrganizationsReturn {
  organizations: Organization[]
  loading: boolean
  error: string | null
  createOrganization: (org: Omit<OrganizationInsert, 'user_id'>) => Promise<Organization | null>
  updateOrganization: (id: string, updates: OrganizationUpdate) => Promise<boolean>
  deleteOrganization: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
}

export function useOrganizations(): UseOrganizationsReturn {
  const [organizations, setOrganizations] = useState<Organization[]>(() => getFromLocalStorage('shiftflow_orgs') || [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const sessionHandledRef = useRef(false)
  const loadingCompletedRef = useRef(false)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

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

    const fetchOrgs = async (uid: string) => {
      console.log('[useOrganizations] Fetching organizations for user:', uid)
      try {
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })

        if (!isMounted) return

        if (fetchError) {
          console.error('[useOrganizations] Error fetching organizations:', fetchError)
          setError(fetchError.message)
          setOrganizations([])
          setToLocalStorage('shiftflow_orgs', [])
        } else {
          console.log('[useOrganizations] Fetched organizations from DB:', data?.length || 0, 'orgs')
          setOrganizations(data || [])
          setToLocalStorage('shiftflow_orgs', data || [])
        }
      } catch (err) {
        if (!isMounted) return
        setError('Failed to load organizations')
        setOrganizations([])
        setToLocalStorage('shiftflow_orgs', [])
      }
    }

    const handleSession = async (session: { user: { id: string } } | null, source: string) => {
      if (!isMounted) return

      // Prevent duplicate handling
      if (sessionHandledRef.current && source !== 'auth_change') return
      sessionHandledRef.current = true

      try {
        if (session?.user) {
          setUserId(session.user.id)
          // Fetch organizations and wait for completion
          await fetchOrgs(session.user.id)
        } else {
          setUserId(null)
          setOrganizations([])
          setToLocalStorage('shiftflow_orgs', [])
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
  }, [supabaseConfigured])

  const fetchOrganizations = useCallback(async () => {
    if (!userId || !supabaseConfigured) {
      return
    }
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setOrganizations(data || [])
      }
    } catch (err) {
      setError('Failed to fetch organizations')
    }
  }, [userId, supabaseConfigured])

  const createOrganization = async (org: Omit<OrganizationInsert, 'user_id'>): Promise<Organization | null> => {
    if (!supabaseConfigured) return null
    setError(null)

    const supabase = createClient()

    // Use getUser() to validate session with server
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user?.id) {
      console.error('[useOrganizations] No valid user:', userError)
      // Fallback to getSession
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        setError('Not authenticated')
        return null
      }
    }
    
    const effectiveUserId = user?.id || (await supabase.auth.getSession()).data.session?.user?.id
    
    if (!effectiveUserId) {
      setError('Not authenticated')
      return null
    }

    const { data, error: createError } = await supabase
      .from('organizations')
      .insert({ ...org, user_id: effectiveUserId })
      .select()
      .single()

    if (createError) {
      console.error('[useOrganizations] Error creating:', createError)
      if (createError.message?.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.')
      } else {
        setError(createError.message)
      }
      return null
    }

    console.log('[useOrganizations] Organization created:', data)
    const updatedOrgs = [data, ...organizations]
    setOrganizations(updatedOrgs)
    setToLocalStorage('shiftflow_orgs', updatedOrgs)
    return data
  }

  const updateOrganization = async (id: string, updates: OrganizationUpdate): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return false
    }

    const updatedOrgs = organizations.map(org => org.id === id ? { ...org, ...updates } as Organization : org)
    setOrganizations(updatedOrgs)
    setToLocalStorage('shiftflow_orgs', updatedOrgs)
    return true
  }

  const deleteOrganization = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    const updatedOrgs = organizations.filter(org => org.id !== id)
    setOrganizations(updatedOrgs)
    setToLocalStorage('shiftflow_orgs', updatedOrgs)
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
