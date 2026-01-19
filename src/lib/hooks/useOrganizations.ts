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

// Module-level cache
let cachedOrganizations: Organization[] = []
let cachedUserId: string | null = null
let initialLoadDoneOrgs = false

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
  const [organizations, setOrganizations] = useState<Organization[]>(cachedOrganizations)
  const [loading, setLoading] = useState(!initialLoadDoneOrgs)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(cachedUserId)
  const sessionHandledRef = useRef(false)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Use onAuthStateChange for session detection
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      initialLoadDoneOrgs = true
      return
    }

    const supabase = createClient()
    let isMounted = true
    sessionHandledRef.current = false

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
          cachedOrganizations = []
          setOrganizations([])
        } else {
          cachedOrganizations = data || []
          setOrganizations(data || [])
        }
      } catch (err) {
        if (!isMounted) return
        setError('Failed to load organizations')
        cachedOrganizations = []
        setOrganizations([])
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
        // Fetch organizations asynchronously
        await fetchOrgs(session.user.id)
      } else {
        cachedUserId = null
        setUserId(null)
        cachedOrganizations = []
        setOrganizations([])
      }

      if (!initialLoadDoneOrgs && isMounted) {
        setLoading(false)
        initialLoadDoneOrgs = true
      }
    }

    // Get initial session immediately - this reads from cookies
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        handleSession(session, 'get_session')
      })
      .catch(() => {
        if (!isMounted) return
        if (!initialLoadDoneOrgs) {
          setLoading(false)
          initialLoadDoneOrgs = true
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
      if (!initialLoadDoneOrgs && isMounted) {
        setLoading(false)
        initialLoadDoneOrgs = true
      }
    }, 5000)

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
        cachedOrganizations = data || []
        setOrganizations(data || [])
      }
    } catch (err) {
      setError('Failed to fetch organizations')
    }
  }, [userId, supabaseConfigured])

  const createOrganization = async (org: Omit<OrganizationInsert, 'user_id'>): Promise<Organization | null> => {
    if (!userId || !supabaseConfigured) return null
    setError(null)

    const supabase = createClient()
    const { data, error: createError } = await supabase
      .from('organizations')
      .insert({ ...org, user_id: userId })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      return null
    }

    setOrganizations(prev => [data, ...prev])
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

    setOrganizations(prev =>
      prev.map(org => org.id === id ? { ...org, ...updates } as Organization : org)
    )
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

    setOrganizations(prev => prev.filter(org => org.id !== id))
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
