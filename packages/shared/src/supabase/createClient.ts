import { createClient as createSbClient, SupabaseClient } from '@supabase/supabase-js'

export type ShiftFlowClient = SupabaseClient

export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null
  setItem(key: string, value: string): Promise<void> | void
  removeItem(key: string): Promise<void> | void
}

export interface CreateClientOptions {
  url: string
  anonKey: string
  storage: StorageAdapter
  detectSessionInUrl?: boolean
}

export function createShiftFlowClient(opts: CreateClientOptions): ShiftFlowClient {
  return createSbClient(opts.url, opts.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: opts.detectSessionInUrl ?? false,
      storage: opts.storage as never,
    },
  })
}
