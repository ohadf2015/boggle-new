import { createAdminClient } from '@/utils/supabase/admin';

export interface ConsumeAllowlistResult {
  consumed: boolean;
  /** Set only when the redemption FAILED. Absent means "not allowlisted", which is normal. */
  error?: string;
}

/**
 * Redeem a `teacher_access_allowlist` entry — the path for a teacher approved before they
 * had an account. Called once per sign-in from AuthContext.
 *
 * Every statement here runs on the SERVICE-ROLE client. On the request-scoped client this
 * whole function was a silent no-op: RLS gives an authenticated user zero rows on
 * `teacher_access_allowlist` (verified live), so the lookup always came back empty and the
 * caller got `{ consumed: false }` — identical to "you are not allowlisted". Six entries
 * existed and none had ever been redeemed.
 *
 * Each write checks its own affected-row count, so a policy or key change fails loud
 * instead of resuming the silent no-op. Callers must surface `error`.
 */
export async function consumeTeacherAllowlist(
  { userId, email }: { userId: string; email: string }
): Promise<ConsumeAllowlistResult> {
  const admin = createAdminClient();
  if (!admin) return { consumed: false, error: 'service role key not configured' };

  // Stored emails are normalised to lowercase on write, so a lowercase probe is the match.
  const normalized = email.toLowerCase();

  const { data: row, error: lookupError } = await admin
    .from('teacher_access_allowlist')
    .select('email')
    .eq('email', normalized)
    .is('consumed_at', null)
    .maybeSingle();

  if (lookupError) return { consumed: false, error: lookupError.message };
  if (!row) return { consumed: false };

  const promoted = await admin
    .from('profiles')
    .update({ user_role: 'teacher' })
    .eq('id', userId)
    .select('id');

  if (promoted.error) return { consumed: false, error: promoted.error.message };
  if (!promoted.data?.length) return { consumed: false, error: 'profile not promoted' };

  // Stamp consumption last. If this misses, the entry stays redeemable and the next
  // sign-in promotes again — so report it rather than calling the redemption done.
  const stamped = await admin
    .from('teacher_access_allowlist')
    .update({ consumed_at: new Date().toISOString(), consumed_by_user_id: userId })
    .eq('email', row.email)
    .select('email');

  if (stamped.error) return { consumed: false, error: stamped.error.message };
  if (!stamped.data?.length) return { consumed: false, error: 'allowlist entry not marked consumed' };

  return { consumed: true };
}
