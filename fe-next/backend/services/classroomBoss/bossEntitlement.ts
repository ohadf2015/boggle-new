import { getSupabase } from '../../modules/supabase/client.js';
import logger from '../../utils/logger.js';
import { resolveProEntitlement, type SubscriptionRowLike } from '@/lib/education/proGrant';
import { FREE_CLASSROOM_BOSS_ID, isClassroomBossId, type ClassroomBossId } from '@/shared/types/classroomBoss';

interface ProLookup {
  row: SubscriptionRowLike | null;
  error?: string;
}

interface Deps {
  lookup: (teacherId: string) => Promise<ProLookup>;
}

async function lookupSubscription(teacherId: string): Promise<ProLookup> {
  const client = getSupabase();
  if (!client) return { row: null, error: 'supabase not configured' };
  const { data, error } = await client
    .from('subscriptions')
    .select('tier,status,source,current_period_end')
    .eq('user_id', teacherId)
    .maybeSingle();
  return { row: (data as SubscriptionRowLike | null) ?? null, error: error?.message };
}

/** The roster is a Pro perk the client only displays; the server decides which boss a room really fights. */
export async function resolveBossForTeacher(
  teacherId: string,
  requested: unknown,
  deps: Deps = { lookup: lookupSubscription },
): Promise<ClassroomBossId | undefined> {
  if (!isClassroomBossId(requested)) return undefined;
  if (requested === FREE_CLASSROOM_BOSS_ID) return requested;
  try {
    const { row, error } = await deps.lookup(teacherId);
    if (error) {
      logger.warn('CLASSROOM_BOSS', `Pro lookup failed for ${teacherId} (${error}); using the free boss`);
      return FREE_CLASSROOM_BOSS_ID;
    }
    return resolveProEntitlement(row, Date.now()).hasPro ? requested : FREE_CLASSROOM_BOSS_ID;
  } catch (err) {
    logger.warn('CLASSROOM_BOSS', `Pro lookup threw for ${teacherId}: ${(err as Error).message}; using the free boss`);
    return FREE_CLASSROOM_BOSS_ID;
  }
}
