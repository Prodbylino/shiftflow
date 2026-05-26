import { createContext, ReactNode, useContext } from 'react'
import type { TimesheetAIClient } from './createClient'

const SupabaseContext = createContext<TimesheetAIClient | null>(null)

export function SupabaseProvider({
  client,
  children,
}: {
  client: TimesheetAIClient
  children: ReactNode
}) {
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
}

export function useSupabase(): TimesheetAIClient {
  const client = useContext(SupabaseContext)
  if (!client) {
    throw new Error('useSupabase must be used inside <SupabaseProvider>')
  }
  return client
}
