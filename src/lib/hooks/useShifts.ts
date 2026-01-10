'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shift, ShiftInsert, ShiftUpdate, ShiftWithOrganization } from '@/types/database'
import { useAuth } from './useAuth'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
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
  const { user } = useAuth()
  const [shifts, setShifts] = useState<ShiftWithOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Stabilize options to prevent infinite loops
  const startDateStr = options?.startDate?.toISOString()
  const endDateStr = options?.endDate?.toISOString()
  const organizationId = options?.organizationId

  const fetchShifts = useCallback(async () => {
    if (!user || !supabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    let query = supabase
      .from('shifts')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', user.id)
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

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setShifts((data || []) as ShiftWithOrganization[])
    }
    setLoading(false)
  }, [user, supabaseConfigured, startDateStr, endDateStr, organizationId])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  const createShift = async (shift: Omit<ShiftInsert, 'user_id'>): Promise<Shift | null> => {
    if (!user || !supabaseConfigured) return null
    setError(null)

    const supabase = createClient()
    const { data, error: createError } = await supabase
      .from('shifts')
      .insert({ ...shift, user_id: user.id })
      .select(`
        *,
        organization:organizations(*)
      `)
      .single()

    if (createError) {
      setError(createError.message)
      return null
    }

    const newShift = data as ShiftWithOrganization
    setShifts(prev => [...prev, newShift].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ))
    return newShift
  }

  const updateShift = async (id: string, updates: ShiftUpdate): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()
    const { data, error: updateError } = await supabase
      .from('shifts')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        organization:organizations(*)
      `)
      .single()

    if (updateError) {
      setError(updateError.message)
      return false
    }

    setShifts(prev =>
      prev.map(s => s.id === id ? data as ShiftWithOrganization : s)
    )
    return true
  }

  const deleteShift = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false
    setError(null)

    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    setShifts(prev => prev.filter(s => s.id !== id))
    return true
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
