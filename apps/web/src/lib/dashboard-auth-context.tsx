'use client'

import { createContext, useContext } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/types/database'

interface DashboardAuthContextValue {
  user: User
  profile: Profile | null
  signOut: () => Promise<void>
}

const DashboardAuthContext = createContext<DashboardAuthContextValue | null>(null)

export function DashboardAuthProvider({
  value,
  children,
}: {
  value: DashboardAuthContextValue
  children: React.ReactNode
}) {
  return (
    <DashboardAuthContext.Provider value={value}>
      {children}
    </DashboardAuthContext.Provider>
  )
}

export function useDashboardAuth() {
  const context = useContext(DashboardAuthContext)
  if (!context) {
    throw new Error('useDashboardAuth must be used within DashboardAuthProvider')
  }
  return context
}
