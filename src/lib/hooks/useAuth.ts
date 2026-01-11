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

// Module-level cache to persist across component remounts
let cachedUser: User | null = null
let cachedProfile: Profile | null = null
let initialLoadDone = false

interface UseAuthReturn {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  // Initialize with cached values if available
  const [user, setUser] = useState<User | null>(cachedUser)
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [loading, setLoading] = useState(!initialLoadDone)

  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), [])

  const fetchProfile = useCallback(async (userId: string, supabase: ReturnType<typeof createClient>) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      cachedProfile = profileData
      setProfile(profileData)
    } catch (err) {
      // Profile fetch failed, continue without profile
      cachedProfile = null
      setProfile(null)
    }
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
      initialLoadDone = true
      return
    }

    const supabase = createClient()
    let timeout: NodeJS.Timeout

    // Only fetch session on initial load
    if (!initialLoadDone) {
      // Safety timeout to prevent infinite loading
      timeout = setTimeout(() => {
        if (!initialLoadDone) {
          console.warn('Auth timeout - forcing loading to false')
          setLoading(false)
          initialLoadDone = true
        }
      }, 10000) // 10 second timeout

      const getSession = async () => {
        try {
          const { data: { user: authUser }, error } = await supabase.auth.getUser()

          if (error) {
            console.error('Auth error:', error)
            cachedUser = null
            setUser(null)
          } else {
            cachedUser = authUser
            setUser(authUser)

            if (authUser) {
              await fetchProfile(authUser.id, supabase)
            }
          }
        } catch (err) {
          // Handle auth errors gracefully
          console.error('Unexpected auth error:', err)
          cachedUser = null
          setUser(null)
        } finally {
          clearTimeout(timeout)
          setLoading(false)
          initialLoadDone = true
        }
      }

      getSession()
    }

    // Always subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only update state on actual sign in/out events, ignore token refresh
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          cachedUser = session?.user ?? null
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchProfile(session.user.id, supabase)
          } else {
            cachedProfile = null
            setProfile(null)
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      if (timeout) clearTimeout(timeout)
    }
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
