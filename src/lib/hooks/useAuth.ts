'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, AuthChangeEvent } from '@supabase/supabase-js'
import { Profile } from '@/types/database'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
}

// Helper to safely access localStorage (only on client-side)
const getFromLocalStorage = (key: string) => {
  if (typeof window === 'undefined') return null
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch {
    return null
  }
}

const setToLocalStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore localStorage errors
  }
}

// Module-level cache to persist across component remounts
let cachedUser: User | null = getFromLocalStorage('shiftflow_user')
let cachedProfile: Profile | null = getFromLocalStorage('shiftflow_profile')
let initialLoadDoneAuth = false

interface UseAuthReturn {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  // Initialize with cached values if available, but always start with loading=true
  const [user, setUser] = useState<User | null>(cachedUser)
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [loading, setLoading] = useState(true)
  const sessionHandledRef = useRef(false)

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
      setToLocalStorage('shiftflow_profile', profileData)
    } catch (err) {
      // Profile fetch failed, continue without profile
      cachedProfile = null
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
    // Reset the module-level flag on mount to ensure fresh load
    initialLoadDoneAuth = false

    // If Supabase is not configured, just set loading to false
    if (!supabaseConfigured) {
      setLoading(false)
      initialLoadDoneAuth = true
      return
    }

    const supabase = createClient()
    let isMounted = true
    sessionHandledRef.current = false

    const handleSession = async (session: { user: User } | null, source: string) => {
      if (!isMounted) return

      // Prevent duplicate handling
      if (sessionHandledRef.current && source !== 'auth_change') return
      sessionHandledRef.current = true

      if (session?.user) {
        cachedUser = session.user
        setUser(session.user)
        setToLocalStorage('shiftflow_user', session.user)
        // Load profile and wait for it to complete
        await fetchProfile(session.user.id, supabase)
      } else {
        cachedUser = null
        cachedProfile = null
        setUser(null)
        setProfile(null)
        setToLocalStorage('shiftflow_user', null)
        setToLocalStorage('shiftflow_profile', null)
      }

      // Only set loading to false after data is loaded
      if (isMounted) {
        setLoading(false)
        initialLoadDoneAuth = true
      }
    }

    // Get initial session immediately - this reads from cookies
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        handleSession(session, 'get_session')
      })
      .catch(() => {
        if (!isMounted) return
        if (!initialLoadDoneAuth) {
          setLoading(false)
          initialLoadDoneAuth = true
        }
      })

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        if (!isMounted) return

        // Only handle meaningful auth state changes, not token refreshes on focus
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          sessionHandledRef.current = false // Allow re-handling for actual auth changes
          await handleSession(session, 'auth_change')
        } else if (event === 'INITIAL_SESSION' && !sessionHandledRef.current) {
          await handleSession(session, 'auth_change')
        }
      }
    )

    // Safety timeout
    const timeout = setTimeout(() => {
      if (!initialLoadDoneAuth && isMounted) {
        setLoading(false)
        initialLoadDoneAuth = true
      }
    }, 5000)

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
