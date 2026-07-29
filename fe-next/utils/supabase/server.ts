import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    auth: {
      flowType: 'pkce'
    },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: options.signal ?? AbortSignal.timeout(10000),
        })
      },
    },
  })
}

/**
 * Get authenticated user by verifying the JWT with Supabase Auth.
 * This makes a network round-trip (~50-200ms) but guarantees the
 * user object is authentic and not tampered with via cookies.
 */
export async function getSessionUser(supabase: SupabaseClient): Promise<{ user: User | null; error: Error | null }> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, error: error ?? new Error('No authenticated user') };
  }
  return { user, error: null };
}
