/**
 * Server-side Supabase client for use in Server Components and Route Handlers.
 * Uses @supabase/ssr createServerClient with Next.js cookies() for session-aware requests.
 *
 * NOTE: Only import this in Server Components or server-only modules.
 * For client components, continue using `lib/supabase.ts`.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Cookie-free Supabase client for public data queries (leaderboards, stats, etc.).
 * Does NOT call cookies() — safe to use in ISR/static pages without opting into dynamic rendering.
 * Only use for unauthenticated, read-only queries with the anon key.
 */
export function createSupabasePublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
