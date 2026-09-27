import { createClient } from '@/utils/supabase/server';
import { canAccessInWorkMode } from './inWorkModeAccess';

/**
 * Server-component gate for in-work/preview game modes via the Supabase cookie
 * session. Beta-aware sibling of {@link isAdminSession}: returns true when the
 * logged-in user is an admin OR a beta tester (see lib/auth/inWorkModeAccess.ts).
 *
 * Fails closed: no session, non-admin/non-beta, query error, or any thrown
 * exception all return false. Use in server components to gate in-work routes
 * (e.g. /crossword) so the URL is not reachable by surfacing the hub card alone.
 */
export async function canSeeInWorkModesSession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, is_beta_tester')
      .eq('id', user.id)
      .single();

    if (profileError) return false;
    return canAccessInWorkMode(profile);
  } catch {
    return false;
  }
}
