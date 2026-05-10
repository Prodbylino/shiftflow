import { useCallback, useEffect, useState } from 'react'

import type { Organization, OrganizationInsert, OrganizationUpdate } from '../types/database'
import { useSupabase } from '../supabase/SupabaseProvider'

export interface UseOrganizationsReturn {
  organizations: Organization[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createOrganization: (org: Omit<OrganizationInsert, 'user_id'>) => Promise<Organization | null>
  updateOrganization: (id: string, updates: OrganizationUpdate) => Promise<boolean>
  deleteOrganization: (id: string) => Promise<boolean>
}

export function useOrganizations(userId: string | null): UseOrganizationsReturn {
  const supabase = useSupabase()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizations = useCallback(async () => {
    if (!userId) {
      setOrganizations([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setOrganizations((data ?? []) as Organization[])
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  const createOrganization = useCallback<UseOrganizationsReturn['createOrganization']>(
    async (org) => {
      if (!userId) {
        setError('Not signed in')
        return null
      }
      const { data, error: createError } = await supabase
        .from('organizations')
        .insert({ ...org, user_id: userId })
        .select('*')
        .single()

      if (createError) {
        setError(createError.message)
        return null
      }
      await fetchOrganizations()
      return data as Organization
    },
    [supabase, userId, fetchOrganizations],
  )

  const updateOrganization = useCallback<UseOrganizationsReturn['updateOrganization']>(
    async (id, updates) => {
      if (!userId) {
        setError('Not signed in')
        return false
      }
      const { error: updateError } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)

      if (updateError) {
        setError(updateError.message)
        return false
      }
      await fetchOrganizations()
      return true
    },
    [supabase, userId, fetchOrganizations],
  )

  const deleteOrganization = useCallback<UseOrganizationsReturn['deleteOrganization']>(
    async (id) => {
      if (!userId) {
        setError('Not signed in')
        return false
      }
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (deleteError) {
        setError(deleteError.message)
        return false
      }
      await fetchOrganizations()
      return true
    },
    [supabase, userId, fetchOrganizations],
  )

  return {
    organizations,
    loading,
    error,
    refetch: fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  }
}
