'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Organization, OrganizationInsert, OrganizationUpdate } from '@/types/database'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
}

// Module-level cache
let cachedOrganizations: Organization[] = []
let cachedUserId: string | null = null
let initialLoadDone = false

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
  const [loading, setLoading] = useState(!initialLoadDone)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(cachedUserId)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Combined user fetch and data fetch to prevent race conditions
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      initialLoadDone = true
      return
    }

    // Skip if already initialized - use cached data
    if (initialLoadDone) {
      return
    }

    let cancelled = false

    // Timeout protection
    const timeout = setTimeout(() => {
      if (!cancelled && !initialLoadDone) {
        console.warn('Organizations loading timeout')
        setLoading(false)
        initialLoadDone = true
      }
    }, 8000)

    const loadData = async () => {
      const supabase = createClient()

      try {
        // Get user first
        const { data: { user } } = await supabase.auth.getUser()

        if (cancelled) return

        if (!user) {
          cachedUserId = null
          setUserId(null)
          setLoading(false)
          initialLoadDone = true
          clearTimeout(timeout)
          return
        }

        cachedUserId = user.id
        setUserId(user.id)

        // Fetch organizations immediately after getting user
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (cancelled) return

        if (fetchError) {
          setError(fetchError.message)
        } else {
          cachedOrganizations = data || []
          setOrganizations(data || [])
        }
      } catch (err) {
        if (cancelled) return
        console.error('Organizations load error:', err)
        setError('Failed to load organizations')
      } finally {
        if (!cancelled) {
          clearTimeout(timeout)
          setLoading(false)
          initialLoadDone = true
        }
      }
    }

    loadData()

    return () => { cancelled = true }
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
