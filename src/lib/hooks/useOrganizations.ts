'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Organization, OrganizationInsert, OrganizationUpdate } from '@/types/database'
import { useAuth } from './useAuth'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
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
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  const fetchOrganizations = useCallback(async () => {
    if (!user || !supabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrganizations(data || [])
    }
    setLoading(false)
  }, [user, supabaseConfigured])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  const createOrganization = async (org: Omit<OrganizationInsert, 'user_id'>): Promise<Organization | null> => {
    if (!user || !supabaseConfigured) return null
    setError(null)

    const supabase = createClient()
    const { data, error: createError } = await supabase
      .from('organizations')
      .insert({ ...org, user_id: user.id })
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
