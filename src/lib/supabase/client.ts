import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  console.log('[Supabase] Creating fresh client instance (no singleton)')

  // Always create a fresh client - no caching
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token',
      },
      global: {
        headers: {
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
        }
      }
    }
  )
}

// Keep this for compatibility
export function resetClient() {
  console.log('[Supabase] resetClient called (no-op in non-singleton mode)')
}
