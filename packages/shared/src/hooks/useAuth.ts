import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { useSupabase } from '../supabase/SupabaseProvider'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

export type UseAuthReturn = AuthState & AuthActions

export function useAuth(): UseAuthReturn {
  const supabase = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = useCallback<AuthActions['signIn']>(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },
    [supabase],
  )

  const signUp = useCallback<AuthActions['signUp']>(
    async (email, password) => {
      const { error } = await supabase.auth.signUp({ email, password })
      return { error: error?.message ?? null }
    },
    [supabase],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  const resetPassword = useCallback<AuthActions['resetPassword']>(
    async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      return { error: error?.message ?? null }
    },
    [supabase],
  )

  return { user, session, loading, signIn, signUp, signOut, resetPassword }
}
