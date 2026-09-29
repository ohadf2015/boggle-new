import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _adminClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client using the service role key.
 * Bypasses RLS — only use for trusted server-side operations.
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set (e.g. in browser or test).
 */
export function createAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  // Reject placeholder / unconfigured values
  const trimmed = serviceKey.trim();
  if (
    trimmed === '' ||
    trimmed === 'YOUR_SERVICE_ROLE_KEY_HERE' ||
    trimmed === 'placeholder' ||
    trimmed.includes('SERVICE_ROLE_KEY')
  ) {
    return null;
  }

  if (!_adminClient) {
    // Build from the TRIMMED values: a key pasted into a hosting dashboard
    // with a trailing newline passes the placeholder check above but sends a
    // malformed apikey header, 401ing every admin call.
    _adminClient = createClient(supabaseUrl.trim(), trimmed, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}
