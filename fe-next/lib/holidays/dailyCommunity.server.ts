import type { SupabaseClient } from '@supabase/supabase-js';
import { eventKeyFor } from '@/lib/holidayEvent/rewards';
import logger from '@/utils/logger';
import { windowFor, type HolidayKey } from './calendar';

export const COMMUNITY_TTL_MS = 60_000;

const cache = new Map<string, { at: number; count: number }>();

export async function communityCount(i: {
  supabase: SupabaseClient;
  holiday: HolidayKey;
  localDate: string;
  locale?: string | null;
  now?: number;
}): Promise<number | null> {
  const win = windowFor(i.holiday, i.localDate, i.locale);
  if (!win) return null;
  const eventKey = eventKeyFor(win);
  const key = `${eventKey}|${i.localDate}`;
  const now = i.now ?? Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < COMMUNITY_TTL_MS) return hit.count;

  const query = i.supabase
    .from('holiday_event_progress')
    .select('user_id, profiles!inner(is_test_account)', { count: 'exact', head: true })
    .eq('event_key', eventKey)
    .eq('played_on', i.localDate)
    .not('profiles.is_test_account', 'is', true);
  const { count, error } = await query;
  if (error || count === null || count === undefined) {
    logger.warn('HOLIDAY_COMMUNITY', `count failed for ${key}: ${error?.message ?? 'no count'}`);
    return null;
  }
  if (cache.size > 64) cache.clear();
  cache.set(key, { at: now, count });
  return count;
}

export function resetCommunityCache(): void {
  cache.clear();
}
