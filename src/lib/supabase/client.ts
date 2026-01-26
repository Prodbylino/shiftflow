import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function createClient() {
  // If we already have an instance, return it
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create a new instance with custom storage that works better with SSR
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Disable automatic refresh to avoid issues
        autoRefreshToken: true,
        // Persist session
        persistSession: true,
        // Detect session in URL
        detectSessionInUrl: true,
      }
    }
  )

  return supabaseInstance
}

// Export a function to reset the client (useful for testing or after sign out)
export function resetClient() {
  supabaseInstance = null
}
