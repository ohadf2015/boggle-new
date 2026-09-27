import { createClient } from '@/utils/supabase/server';

/**
 * Server-side admin check via the Supabase cookie session.
 *
 * Returns true ONLY when a logged-in user has `profiles.is_admin = true`.
 * Fails closed: no session, missing/false `is_admin`, query error, or any
 * thrown exception all return false. Use in server components to gate
 * admin-only routes (e.g. /blast/v2) so the URL is not reachable by
 * surfacing the hub card alone.
 */
export async function isAdminSession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) return false;
    return true;
  } catch {
    return false;
  }
}
