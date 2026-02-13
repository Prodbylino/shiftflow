'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
}

interface MonthlySummary {
  organization_id: string
  organization_name: string
  organization_color: string
  shift_count: number
  total_hours: number
}

interface FinancialYearShift {
  id: string
  organization_id: string
  organization_name: string
  organization_color: string
  title: string
  date: string
  start_time: string
  end_time: string
  hours_worked: number
}

interface UseAnalyticsReturn {
  loading: boolean
  error: string | null
  getMonthlySummary: (year: number, month: number) => Promise<MonthlySummary[]>
  getFinancialYearSummary: (fyStartYear: number) => Promise<MonthlySummary[]>
  getShiftsByFinancialYear: (fyStartYear: number) => Promise<FinancialYearShift[]>
}

export function useAnalytics(): UseAnalyticsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  // Get user on mount
  useEffect(() => {
    if (!supabaseConfigured) {
      return
    }

    const supabase = createClient()
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
      } catch {
        // Handle auth errors gracefully
        setUserId(null)
      }
    }

    loadUser()
  }, [supabaseConfigured])

  const getMonthlySummary = useCallback(async (year: number, month: number): Promise<MonthlySummary[]> => {
    if (!userId || !supabaseConfigured) return []
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('get_monthly_summary', {
      p_user_id: userId,
      p_year: year,
      p_month: month,
    })

    setLoading(false)
    if (rpcError) {
      setError(rpcError.message)
      return []
    }
    return data || []
  }, [userId, supabaseConfigured])

  const getFinancialYearSummary = useCallback(async (fyStartYear: number): Promise<MonthlySummary[]> => {
    if (!userId || !supabaseConfigured) return []
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('get_financial_year_summary', {
      p_user_id: userId,
      p_fy_start_year: fyStartYear,
    })

    setLoading(false)
    if (rpcError) {
      setError(rpcError.message)
      return []
    }
    return data || []
  }, [userId, supabaseConfigured])

  const getShiftsByFinancialYear = useCallback(async (fyStartYear: number): Promise<FinancialYearShift[]> => {
    if (!userId || !supabaseConfigured) return []
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('get_shifts_by_financial_year', {
      p_user_id: userId,
      p_fy_start_year: fyStartYear,
    })

    setLoading(false)
    if (rpcError) {
      setError(rpcError.message)
      return []
    }
    return data || []
  }, [userId, supabaseConfigured])

  return {
    loading,
    error,
    getMonthlySummary,
    getFinancialYearSummary,
    getShiftsByFinancialYear,
  }
}
