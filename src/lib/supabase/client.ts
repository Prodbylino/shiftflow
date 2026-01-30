import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function createClient() {
  // If we already have an instance, return it
  if (supabaseInstance) {
    return supabaseInstance
  }

  console.log('[Supabase] Creating new client instance')
  // Create a new instance
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    }
  )

  return supabaseInstance
}

export function resetClient() {
  console.log('[Supabase] Manually resetting client')
  supabaseInstance = null
}
