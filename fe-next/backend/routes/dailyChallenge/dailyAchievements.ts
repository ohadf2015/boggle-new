import { getSupabase } from '../../modules/supabaseServer';
import { grantAchievements } from '../../modules/achievements/grantAchievements';
import { achievementsForCount, COUNT_LADDERS } from '../../modules/achievements/progressionAchievements';
import logger from '../../utils/logger';
import { fetchDailyStreak } from './dailyStreak';

type Db = NonNullable<ReturnType<typeof getSupabase>>;

const PODIUM = 3;

/** Signed-in player's rank among signed-in players on today's Word Hunt board; null when unknown or unsolved. */
export async function wordHuntAuthRank(supabase: Db, playerId: string, date: string, language: string): Promise<number | null> {
  const { data: own } = await supabase
    .from('daily_word_hunt_leaderboard')
    .select('rank_position')
    .eq('puzzle_date', date)
    .eq('language', language)
    .eq('player_id', playerId)
    .maybeSingle();
  if (!own?.rank_position) return null;
  const { count } = await supabase
    .from('daily_word_hunt_leaderboard')
    .select('player_id', { count: 'exact', head: true })
    .eq('puzzle_date', date)
    .eq('language', language)
    .not('player_id', 'is', null)
    .lt('rank_position', own.rank_position);
  return count === null ? null : count + 1;
}

/** After a signed-in daily submit: board podium + daily streak achievements. Never throws. */
export async function grantDailyAchievements(
  supabase: Db,
  playerId: string,
  rank: number | null,
  { isToday }: { isToday: boolean },
): Promise<string[]> {
  try {
    const { currentStreak } = await fetchDailyStreak(supabase, 'player_id', playerId);
    // Past days' boards are near empty, so a catch-up replay would podium for free.
    const podium = isToday && rank !== null && rank >= 1 && rank <= PODIUM;
    const keys = [
      ...(podium ? ['DAILY_TOP3'] : []),
      ...achievementsForCount(COUNT_LADDERS.dailyBoardStreak, currentStreak),
    ];
    return await grantAchievements(supabase, playerId, keys, (m) => logger.error('ACHIEVEMENT', `daily grant failed: ${m}`));
  } catch (err) {
    logger.error('ACHIEVEMENT', `daily achievements failed for ${playerId}: ${(err as Error).message}`);
    return [];
  }
}
