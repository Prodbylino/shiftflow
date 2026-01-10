'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/types/database'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
}

interface UseAuthReturn {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  const fetchProfile = useCallback(async (userId: string, supabase: ReturnType<typeof createClient>) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(profileData)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user && supabaseConfigured) {
      const supabase = createClient()
      await fetchProfile(user.id, supabase)
    }
  }, [user, fetchProfile, supabaseConfigured])

  useEffect(() => {
    // If Supabase is not configured, just set loading to false
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        await fetchProfile(user.id, supabase)
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id, supabase)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabaseConfigured, fetchProfile])

  const signOut = async () => {
    if (supabaseConfigured) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    window.location.href = '/login'
  }

  return { user, profile, loading, signOut, refreshProfile }
}
