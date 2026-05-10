import { useCallback, useEffect, useState } from 'react'

import type { Shift, ShiftInsert, ShiftUpdate, ShiftWithOrganization } from '../types/database'
import { useSupabase } from '../supabase/SupabaseProvider'

export interface UseShiftsOptions {
  userId: string | null
  startDate?: Date
  endDate?: Date
  organizationId?: string
}

export interface UseShiftsReturn {
  shifts: ShiftWithOrganization[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createShift: (shift: Omit<ShiftInsert, 'user_id'>) => Promise<Shift | null>
  updateShift: (id: string, updates: ShiftUpdate) => Promise<boolean>
  deleteShift: (id: string) => Promise<boolean>
}

const toIsoDate = (d?: Date) => (d ? d.toISOString().split('T')[0] : undefined)

export function useShifts(options: UseShiftsOptions): UseShiftsReturn {
  const supabase = useSupabase()
  const { userId, startDate, endDate, organizationId } = options

  const [shifts, setShifts] = useState<ShiftWithOrganization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchShifts = useCallback(async () => {
    if (!userId) {
      setShifts([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let query = supabase
      .from('shifts')
      .select('*, organization:organizations(*)')
      .eq('user_id', userId)
      .order('date', { ascending: true })

    const startIso = toIsoDate(startDate)
    const endIso = toIsoDate(endDate)
    if (startIso) query = query.gte('date', startIso)
    if (endIso) query = query.lte('date', endIso)
    if (organizationId) query = query.eq('organization_id', organizationId)

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setShifts((data ?? []) as ShiftWithOrganization[])
    setLoading(false)
  }, [supabase, userId, startDate, endDate, organizationId])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  const createShift = useCallback<UseShiftsReturn['createShift']>(
    async (shift) => {
      if (!userId) {
        setError('Not signed in')
        return null
      }
      const { data, error: createError } = await supabase
        .from('shifts')
        .insert({ ...shift, user_id: userId })
        .select('*')
        .single()

      if (createError) {
        setError(createError.message)
        return null
      }
      await fetchShifts()
      return data as Shift
    },
    [supabase, userId, fetchShifts],
  )

  const updateShift = useCallback<UseShiftsReturn['updateShift']>(
    async (id, updates) => {
      if (!userId) {
        setError('Not signed in')
        return false
      }
      const { error: updateError } = await supabase
        .from('shifts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)

      if (updateError) {
        setError(updateError.message)
        return false
      }
      await fetchShifts()
      return true
    },
    [supabase, userId, fetchShifts],
  )

  const deleteShift = useCallback<UseShiftsReturn['deleteShift']>(
    async (id) => {
      if (!userId) {
        setError('Not signed in')
        return false
      }
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (deleteError) {
        setError(deleteError.message)
        return false
      }
      await fetchShifts()
      return true
    },
    [supabase, userId, fetchShifts],
  )

  return { shifts, loading, error, refetch: fetchShifts, createShift, updateShift, deleteShift }
}
