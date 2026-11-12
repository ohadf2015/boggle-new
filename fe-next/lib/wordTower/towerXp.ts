import type { SupabaseClient } from '@supabase/supabase-js';
import { grantSoloGameXp, levelUpOf } from '@/backend/modules/xpGrant';
import { captureApiError } from '@/utils/sentry';

type Grant = Awaited<ReturnType<typeof grantSoloGameXp>>;

export interface TowerXpFields {
  xpEarned?: number;
  newTotalXp?: number;
  levelUp?: { oldLevel: number; newLevel: number } | null;
}

export function towerXpFields(grant: Grant): TowerXpFields {
  return grant ? { xpEarned: grant.xpEarned, newTotalXp: grant.newTotalXp, levelUp: levelUpOf(grant) } : {};
}

export async function grantTowerRunXp(db: SupabaseClient, userId: string, heightM: number): Promise<TowerXpFields> {
  try {
    return towerXpFields(await grantSoloGameXp(db, userId, { score: heightM }));
  } catch (err) {
    captureApiError(err as Error, 'word-tower-run-xp');
    return {};
  }
}

/** The daily tower has no end and is flushed on every exit, so the conditional update is a once-a-day claim. */
export async function claimDailyTowerXp(
  db: SupabaseClient,
  userId: string,
  puzzleDate: string,
  language: string,
): Promise<TowerXpFields> {
  try {
    return await claimAndGrant(db, userId, puzzleDate, language);
  } catch (err) {
    captureApiError(err as Error, 'word-tower-daily-xp-claim');
    return {};
  }
}

async function claimAndGrant(db: SupabaseClient, userId: string, puzzleDate: string, language: string): Promise<TowerXpFields> {
  const { data, error } = await db
    .from('daily_word_tower_attempts')
    .update({ xp_granted_at: new Date().toISOString() })
    .eq('player_id', userId)
    .eq('puzzle_date', puzzleDate)
    .eq('language', language)
    .is('xp_granted_at', null)
    .select('best_height_m')
    .maybeSingle();
  if (error) {
    captureApiError(error as unknown as Error, 'word-tower-daily-xp-claim');
    return {};
  }
  if (!data) return {};
  return towerXpFields(await grantSoloGameXp(db, userId, { score: Number(data.best_height_m) || 0 }));
}
