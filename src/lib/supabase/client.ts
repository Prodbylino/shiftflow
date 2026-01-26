import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null
let instanceCreatedAt: number = 0

export function createClient() {
  const now = Date.now()

  // Force recreate client if it's been more than 100ms since page load
  // This ensures we get a fresh client after page refresh
  if (typeof window !== 'undefined' && window.performance) {
    const timeSincePageLoad = now - window.performance.timing.navigationStart
    if (timeSincePageLoad < 5000 && supabaseInstance) {
      // Within 5 seconds of page load, reset the instance to ensure fresh state
      console.log('[Supabase] Resetting client instance after page load')
      supabaseInstance = null
    }
  }

  // If we already have a recent instance, return it
  if (supabaseInstance && (now - instanceCreatedAt) < 60000) {
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

  instanceCreatedAt = now

  return supabaseInstance
}

// Export a function to reset the client (useful for testing or after sign out)
export function resetClient() {
  console.log('[Supabase] Manually resetting client')
  supabaseInstance = null
  instanceCreatedAt = 0
}
