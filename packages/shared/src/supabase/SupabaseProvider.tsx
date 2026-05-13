import { createContext, ReactNode, useContext } from 'react'
import type { ShiftFlowClient } from './createClient'

const SupabaseContext = createContext<ShiftFlowClient | null>(null)

export function SupabaseProvider({
  client,
  children,
}: {
  client: ShiftFlowClient
  children: ReactNode
}) {
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
}

export function useSupabase(): ShiftFlowClient {
  const client = useContext(SupabaseContext)
  if (!client) {
    throw new Error('useSupabase must be used inside <SupabaseProvider>')
  }
  return client
}
