import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient as createCookieClient } from './server'

// Authenticate an API request via EITHER a session cookie (web) or an
// `Authorization: Bearer <access_token>` header (mobile app). Returns a Supabase
// client scoped to that user (RLS applies as them) plus the resolved user, so
// the verify-phone routes can serve both clients from one code path.
export async function authenticateRequest(
  req: NextRequest,
): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    )
    const { data, error } = await supabase.auth.getUser(token)
    return { supabase, user: error ? null : data.user }
  }

  const supabase = await createCookieClient()
  const { data } = await supabase.auth.getUser()
  return { supabase, user: data.user }
}
