import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  console.log('[Supabase] Creating new client instance')
  // Always create a fresh client to avoid stale connection issues
  return createBrowserClient(
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
}

// Kept for backward compatibility, but no longer needed
export function resetClient() {
  console.log('[Supabase] Client reset called (no-op with new implementation)')
}
