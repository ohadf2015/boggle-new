import { createAdminClient } from '@/utils/supabase/admin';
import { REAL_CLASS_MIN_PLAYERS } from './teacherUsagePrompt';

/**
 * End of the teacher's live ACCESS trial (the window stamped on approval), or null.
 * Not the Polar trial: it carries no card and no payment. While it is open the
 * teacher may use the Pro features that read their own class data; it lapses on its own.
 * Fails closed to null.
 */
export async function liveAccessTrialExpiry(userId: string): Promise<string | null> {
  const end = await accessTrialExpiryAny(userId);
  if (!end || Date.parse(end) <= Date.now()) return null;
  return end;
}

/**
 * End of the teacher's latest approved ACCESS trial, live OR already past, or null
 * (never approved, no window, or the lookup failed). A past value means the free
 * trial is known to have ended. Fails closed to null, which callers treat as
 * "unknown / never had one", so a failed read never takes a trial away.
 */
export async function accessTrialExpiryAny(userId: string): Promise<string | null> {
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
    if (error || !end || !Number.isFinite(Date.parse(end))) return null;
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

/**
 * True once the teacher ran a real class game (2+ real players), false if never, null when
 * the read failed. Null is treated as "ran one" by callers, so a failed read never hides a
 * real trial deadline.
 */
export async function teacherRanClassGame(userId: string): Promise<boolean | null> {
  try {
    const admin = createAdminClient();
    if (!admin) return null;
    const { count, error } = await admin
      .from('classroom_rounds')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', userId)
      .gte('player_count', REAL_CLASS_MIN_PLAYERS);
    if (error || typeof count !== 'number') return null;
    return count > 0;
  } catch {
    return null;
  }
}
