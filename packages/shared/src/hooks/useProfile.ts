import { useCallback, useEffect, useState } from 'react'

import type { Profile, ProfileUpdate } from '../types/database'
import { useSupabase } from '../supabase/SupabaseProvider'

export interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (updates: ProfileUpdate) => Promise<boolean>
}

export function useProfile(userId: string | null): UseProfileReturn {
  const supabase = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setProfile(data as Profile)
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback<UseProfileReturn['updateProfile']>(
    async (updates) => {
      if (!userId) {
        setError('Not signed in')
        return false
      }
      // Optimistic update for snappy UI
      setProfile((current) => (current ? { ...current, ...updates } : current))

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (updateError) {
        setError(updateError.message)
        await fetchProfile() // revert to truth
        return false
      }
      return true
    },
    [supabase, userId, fetchProfile],
  )

  return { profile, loading, error, refetch: fetchProfile, updateProfile }
}
