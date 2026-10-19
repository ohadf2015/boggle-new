import { createAdminClient } from '@/utils/supabase/admin';

/**
 * End of the teacher's live ACCESS trial (the window stamped on approval), or null.
 * Not the Polar trial: it carries no card and no payment. While it is open the
 * teacher may use the Pro features that read their own class data; it lapses on its own.
 * Fails closed to null.
 */
export async function liveAccessTrialExpiry(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    if (!admin) return null;
    const { data, error } = await admin
      .from('teacher_access_requests')
      .select('trial_expires_at')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const end = (data as { trial_expires_at?: string | null } | null)?.trial_expires_at;
    if (error || !end || Date.parse(end) <= Date.now()) return null;
    return end;
  } catch {
    return null;
  }
}

/** Paid Pro, or a live access trial: the entitlement the server-enforced Pro reads honour. */
export async function teacherHasProAccess(userId: string, subscription: { has_pro: boolean }): Promise<boolean> {
  if (subscription.has_pro) return true;
  return (await liveAccessTrialExpiry(userId)) !== null;
}
