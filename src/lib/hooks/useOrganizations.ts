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
  const [organizations, setOrganizations] = useState<Organization[]>([])
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
      try {
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })

        if (!isMounted) return

        if (fetchError) {
          setError(fetchError.message)
          setOrganizations([])
        } else {
          setOrganizations(data || [])
        }
      } catch (err) {
        if (!isMounted) return
        setError('Failed to load organizations')
        setOrganizations([])
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

    // Get current session to ensure we have the user_id
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      setError('Not authenticated')
      return null
    }

    const { data, error: createError } = await supabase
      .from('organizations')
      .insert({ ...org, user_id: session.user.id })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      return null
    }

    // Re-fetch all organizations from database
    const { data: allOrgs, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!fetchError && allOrgs) {
      setOrganizations(allOrgs)
    }

    return data
  }

  const updateOrganization = async (id: string, updates: OrganizationUpdate): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      setError('Not authenticated')
      return false
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return false
    }

    // Re-fetch all organizations from database
    const { data: allOrgs, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!fetchError && allOrgs) {
      setOrganizations(allOrgs)
    }

    return true
  }

  const deleteOrganization = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      setError('Not authenticated')
      return false
    }

    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    // Re-fetch all organizations from database
    const { data: allOrgs, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!fetchError && allOrgs) {
      setOrganizations(allOrgs)
    }

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
