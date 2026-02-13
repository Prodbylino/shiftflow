'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { Profile } from '@/types/database'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
}

const setToLocalStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore localStorage errors
  }
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
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(profileData)
      setToLocalStorage('shiftflow_profile', profileData)
    } catch (err) {
      // Profile fetch failed, continue without profile
      setProfile(null)
      setToLocalStorage('shiftflow_profile', null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user && supabaseConfigured) {
      const supabase = createClient()
      await fetchProfile(user.id, supabase)
    }
  }, [user, fetchProfile, supabaseConfigured])

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    let isMounted = true

    const completeLoading = () => {
      if (isMounted) {
        setLoading(false)
      }
    }

    const handleSession = async (session: Session | null) => {
      if (!isMounted) return

      try {
        if (session?.user) {
          setUser(session.user)
          setToLocalStorage('shiftflow_user', session.user)
          // Load profile and wait for it to complete
          await fetchProfile(session.user.id, supabase)
        } else {
          setUser(null)
          setProfile(null)
          setToLocalStorage('shiftflow_user', null)
          setToLocalStorage('shiftflow_profile', null)
        }
      } catch (error) {
        console.error('Error in handleSession:', error)
      } finally {
        // Always complete loading, even if there's an error
        completeLoading()
      }
    }

    const loadInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await handleSession(session)
      } catch (error) {
        console.error('Error getting session:', error)
        completeLoading()
      }
    }
    loadInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return

        if (
          event === 'SIGNED_IN' ||
          event === 'SIGNED_OUT' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION'
        ) {
          await handleSession(session)
        }
      }
    )

    const timeout = setTimeout(() => {
      completeLoading()
    }, 6000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
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
