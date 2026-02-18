'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { Profile } from '@/types/database'

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000
const LAST_ACTIVITY_KEY = 'shiftflow_last_activity_at'

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key && url !== 'your_supabase_project_url' && url.startsWith('http')
}

const getLastActivity = (): number | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY)
  if (!raw) return null
  const ts = Number(raw)
  return Number.isFinite(ts) ? ts : null
}

const setLastActivity = (timestamp: number = Date.now()) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp))
}

const clearLastActivity = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LAST_ACTIVITY_KEY)
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
    } catch {
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

    const handleSession = async (
      session: Session | null,
      trigger: AuthChangeEvent | 'INITIAL_LOAD' = 'INITIAL_LOAD'
    ) => {
      if (!isMounted) return

      try {
        if (session?.user) {
          const shouldEnforceInactivity = trigger !== 'SIGNED_IN'
          const lastActivity = shouldEnforceInactivity ? getLastActivity() : null
          if (lastActivity && Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
            await supabase.auth.signOut()
            setUser(null)
            setProfile(null)
            setToLocalStorage('shiftflow_user', null)
            setToLocalStorage('shiftflow_profile', null)
            clearLastActivity()
            window.location.href = '/login?reason=timeout'
            return
          }

          setLastActivity()
          setUser(session.user)
          setToLocalStorage('shiftflow_user', session.user)
          // Load profile in background so UI can render immediately
          void fetchProfile(session.user.id, supabase)
        } else {
          setUser(null)
          setProfile(null)
          setToLocalStorage('shiftflow_user', null)
          setToLocalStorage('shiftflow_profile', null)
          clearLastActivity()
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
        await handleSession(session, 'INITIAL_LOAD')
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
          await handleSession(session, event)
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

  useEffect(() => {
    if (!supabaseConfigured || !user) return

    let isMounted = true
    const supabase = createClient()
    let lastWrite = 0

    const markActivity = () => {
      const now = Date.now()
      if (now - lastWrite < 5000) return
      lastWrite = now
      setLastActivity(now)
    }

    const checkInactivity = async () => {
      if (!isMounted) return
      const lastActivity = getLastActivity()
      if (!lastActivity) {
        setLastActivity()
        return
      }

      if (Date.now() - lastActivity <= INACTIVITY_LIMIT_MS) return

      await supabase.auth.signOut()
      if (!isMounted) return
      setUser(null)
      setProfile(null)
      setToLocalStorage('shiftflow_user', null)
      setToLocalStorage('shiftflow_profile', null)
      clearLastActivity()
      window.location.href = '/login?reason=timeout'
    }

    markActivity()

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'mousemove',
    ]

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true })
    })

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        void checkInactivity()
        markActivity()
      }
    }

    document.addEventListener('visibilitychange', visibilityHandler)
    const interval = window.setInterval(() => {
      void checkInactivity()
    }, 30000)

    return () => {
      isMounted = false
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity)
      })
      document.removeEventListener('visibilitychange', visibilityHandler)
      window.clearInterval(interval)
    }
  }, [supabaseConfigured, user])

  const signOut = async () => {
    if (supabaseConfigured) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    clearLastActivity()
    window.location.href = '/login'
  }

  return { user, profile, loading, signOut, refreshProfile }
}
