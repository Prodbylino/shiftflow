import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function createClient() {
  // If we already have an instance, return it
  if (supabaseInstance) {
    console.log('[Supabase] Reusing existing client instance')
    return supabaseInstance
  }

  console.log('[Supabase] Creating new client instance with supabase-js')
  // Create a new instance using the standard supabase-js client
  supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  )

  return supabaseInstance
}

export function resetClient() {
  console.log('[Supabase] Manually resetting client')
  supabaseInstance = null
}
