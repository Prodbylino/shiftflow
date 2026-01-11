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

  // Get user on mount
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      initialLoadDone = true
      return
    }

    // Skip if already initialized
    if (initialLoadDone) {
      return
    }

    const supabase = createClient()
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        cachedUserId = user?.id ?? null
        setUserId(user?.id ?? null)
        if (!user) {
          setLoading(false)
          initialLoadDone = true
        }
      })
      .catch(() => {
        // Handle auth errors gracefully
        setLoading(false)
        initialLoadDone = true
      })
  }, [supabaseConfigured])

  const fetchOrganizations = useCallback(async () => {
    if (!userId || !supabaseConfigured) {
      setLoading(false)
      return
    }
    // Only show loading on first load, not on refetch
    if (!initialLoadDone) {
      setLoading(true)
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
    } finally {
      setLoading(false)
      initialLoadDone = true
    }
  }, [userId, supabaseConfigured])

  useEffect(() => {
    if (userId) {
      fetchOrganizations()
    }
  }, [userId, fetchOrganizations])

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
