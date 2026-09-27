import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { bearerToken } from '@/lib/auth/verifyJwt'

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

/**
 * Create a Supabase client authenticated as the request's user for MUTATION
 * paths (RPCs / writes that rely on `auth.uid()` and RLS).
 *
 * Clients whose session lives outside cookies (Capacitor webview, browsers
 * blocking third-party cookies) send `Authorization: Bearer <jwt>` via
 * fetchWithAuth — the cookie-only `createClient()` sees them as anonymous and
 * mutations silently 401. When a Bearer token is present we build a client
 * scoped to that token so PostgREST/GoTrue treat the call as that user;
 * otherwise we fall back to the cookie client.
 *
 * Verify the caller with `supabase.auth.getUser(token ?? undefined)` after
 * creating the client — do not skip remote verification on mutation paths.
 */
export async function createRequestClient(request: Request): Promise<{ supabase: SupabaseClient; token: string | null }> {
  const token = bearerToken(request)
  if (token) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    )
    return { supabase, token }
  }
  return { supabase: await createClient(), token: null }
}
