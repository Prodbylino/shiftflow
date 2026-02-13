import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (typeof window === 'undefined') {
    throw new Error('createClient() can only be called on the client side')
  }

  // Use singleton pattern but ensure it's properly initialized
  // createBrowserClient automatically reads from cookies, so we don't need to reset it
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
        },
      }
    )
  }

  return browserClient
}

export function resetClient() {
  browserClient = undefined
}
