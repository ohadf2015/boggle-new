import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';

/**
 * Which of these users carry `profiles.is_test_account`. Read on a service-role
 * client: a student's session cannot see the teacher's profile row under RLS.
 */
export async function loadTestAccountIds(
  sb: Pick<SupabaseClient, 'from'> | null | undefined,
  userIds: ReadonlyArray<string | null | undefined>,
): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (!sb || ids.length === 0) return new Set();
  try {
    const { data, error } = await sb.from('profiles').select('id').in('id', ids).eq('is_test_account', true);
    if (error) throw new Error(error.message);
    return new Set(((data ?? []) as Array<{ id: string }>).map((r) => r.id));
  } catch (err) {
    logger.error('[edu-telemetry] is_test_account lookup failed', err instanceof Error ? err.message : err);
    return new Set();
  }
}

export async function isAnyTestAccount(
  sb: Pick<SupabaseClient, 'from'> | null | undefined,
  userIds: ReadonlyArray<string | null | undefined>,
): Promise<boolean> {
  return (await loadTestAccountIds(sb, userIds)).size > 0;
}
