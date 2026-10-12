import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _anonClient: { url: string; key: string; client: SupabaseClient } | null = null;

/**
 * Shared anon-key client for cookie-free public reads and `auth.getUser(token)`.
 * Never call session-mutating auth methods (signIn*, setSession) on it.
 */
export function getAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;

  if (!_anonClient || _anonClient.url !== url || _anonClient.key !== key) {
    _anonClient = {
      url,
      key,
      client: createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      }),
    };
  }
  return _anonClient.client;
}
