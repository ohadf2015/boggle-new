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
 * Get authenticated user from session JWT (no network call).
 * Proxy already refreshes tokens via getSession(), so API routes
 * don't need to call getUser() (which makes a round-trip to Supabase Auth).
 * Saves 200-500ms per API request.
 *
 * Use getUser() only when you need to verify the user hasn't been
 * deleted/banned (rare — admin actions, security-sensitive mutations).
 */
export async function getSessionUser(supabase: SupabaseClient): Promise<{ user: User | null; error: Error | null }> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) {
    return { user: null, error: error ?? new Error('No session') };
  }
  return { user: session.user, error: null };
}
