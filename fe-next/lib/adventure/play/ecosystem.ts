/**
 * Everything a cleared adventure node owes the rest of the game: profile totals
 * + season leaderboard points, XP (with the server-side daily cap) and level-up
 * push, lifetime achievements, coins, and the daily streak.
 *
 * Two rules hold for every call in here:
 *  - FAILURE-ISOLATED. Each call has its own try/catch. A broken ecosystem
 *    hop logs + reports to Sentry and returns a zero; it must NEVER fail the
 *    run save, which is the thing the player actually cares about.
 *  - IDEMPOTENT PER ATTEMPT. `/complete` may be replayed (retry, double tap,
 *    a resent token). The caller passes `alreadyAwarded`, derived from the
 *    attempt's own issue time stored on `level_completions.completed_at`, plus
 *    an in-process guard for the concurrent case.
 *
 * Existing entry points are reused, never re-implemented: this is the same
 * pattern app/api/stats/record-game/route.ts runs for a casual game.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { captureApiError } from '@/utils/sentry';
import { calculateGameXp, checkLevelUp, getLevelFromXp, getTitleForLevel } from '@/backend/modules/xpManager';
import { checkLifetimeAchievements, type UserStats } from '@/backend/modules/achievementManager';
import { leaderboardPointsForGame } from '@/backend/modules/leaderboardScoring';
import { notifyLevelUp } from '@/backend/modules/pushNotificationTriggers';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import type { NodeKind } from './runMap';

/** The analytics / leaderboard mode label for every adventure node. */
export const ADVENTURE_MODE = 'adventure';

/**
 * The `profiles` columns this module reads, verified against the live schema.
 * A column that does not exist makes PostgREST reject the WHOLE select (42703);
 * because the read is failure-isolated that came back as an empty profile and
 * every total was rewritten as "0 + this game" instead of accumulating — a
 * silent wrong-answer, not a visible error. Keep this list in sync with the
 * table, and never add a column without checking information_schema first.
 * `profiles` has no `games_won`.
 */
export const PROFILE_COLUMNS = [
  'total_games', 'total_score', 'total_words', 'total_time_played', 'total_xp',
  'current_level', 'player_title', 'longest_word', 'longest_word_length',
  'last_game_at', 'unique_days_played', 'achievement_counts',
].join(', ');

/** Coins are a META currency — run gold stays in the run. Only real milestones pay. */
export const COINS_FOR: Partial<Record<NodeKind, number>> = { elite: 15, boss: 40 };
export const COINS_WORLD_CLEAR = 60;

export interface EcosystemInput {
  db: SupabaseClient;
  userId: string;
  score: number;
  wordCount: number;
  longestWord: string | null;
  nodeKind: NodeKind;
  world: number;
  level: number;
  /** Boss node cleared for the first time — the world is done. */
  worldCleared: boolean;
  elapsedMs: number;
}

export interface EcosystemResult {
  xpGained: number;
  levelUp?: { newLevel: number; levelsGained: number; newTitles: string[] };
  coinsGained: number;
  leaderboardPoints: number;
  streak?: { current: number; longest: number };
  achievementsUnlocked: string[];
}

export const emptyEcosystem = (): EcosystemResult => ({
  xpGained: 0, coinsGained: 0, leaderboardPoints: 0, achievementsUnlocked: [],
});

/** Run one ecosystem hop; a failure is logged, reported and swallowed. */
async function isolate<T>(name: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[ADVENTURE ECOSYSTEM] ${name} failed`, err);
    captureApiError(err instanceof Error ? err : new Error(String(err)), `/api/adventure/complete#${name}`);
    return fallback;
  }
}

/**
 * Same shape as /api/streak's `recordWin`, run against the service client.
 * That logic lives inline in the route with no exported function, so it is
 * mirrored here rather than HTTP-calling ourselves from our own server.
 */
async function creditStreak(db: SupabaseClient, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  const { data: engagement } = await db
    .from('player_engagement')
    .select('current_streak, longest_streak, last_login_date, streak_freezes_available')
    .eq('player_id', userId)
    .maybeSingle();

  if (!engagement) {
    await db.from('player_engagement').upsert(
      { player_id: userId, current_streak: 1, longest_streak: 1, last_login_date: today, last_played_at: new Date().toISOString() },
      { onConflict: 'player_id' },
    );
    return { current: 1, longest: 1 };
  }
  // Already credited today: read it back, never re-increment.
  if (engagement.last_login_date === today) {
    return { current: engagement.current_streak ?? 0, longest: engagement.longest_streak ?? 0 };
  }

  let current: number;
  if (engagement.last_login_date === yesterday) current = (engagement.current_streak ?? 0) + 1;
  else if ((engagement.streak_freezes_available ?? 0) > 0 && engagement.last_login_date) {
    current = (engagement.current_streak ?? 0) + 1;
    await db.from('player_engagement')
      .update({ streak_freezes_available: engagement.streak_freezes_available - 1 })
      .eq('player_id', userId);
  } else current = 1;

  const longest = Math.max(current, engagement.longest_streak ?? 0);
  await db.from('player_engagement')
    .update({ current_streak: current, longest_streak: longest, last_login_date: today, last_played_at: new Date().toISOString() })
    .eq('player_id', userId);
  return { current, longest };
}

/**
 * Credit a cleared node to the rest of the game.
 * The caller MUST have established that this attempt has not been credited
 * before — see `alreadyCredited` in the /complete route.
 */
export async function creditEcosystem(input: EcosystemInput): Promise<EcosystemResult> {
  const { db, userId, score, wordCount, longestWord, nodeKind, world, elapsedMs } = input;
  const out = emptyEcosystem();

  // --- Profile totals + season leaderboard points (record-game's pattern).
  const profile = await isolate('profile-read', null as Record<string, unknown> | null, async () => {
    const { data, error } = await db
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(`profiles read: ${error.message}`);
    return data as Record<string, unknown> | null;
  });

  const num = (k: string) => Number(profile?.[k] ?? 0) || 0;
  out.leaderboardPoints = leaderboardPointsForGame(ADVENTURE_MODE, score);

  await isolate('profile-write', undefined, async () => {
    const today = new Date().toISOString().split('T')[0];
    const lastDay = profile?.last_game_at ? new Date(String(profile.last_game_at)).toISOString().split('T')[0] : null;
    const updates: Record<string, unknown> = {
      last_game_at: new Date().toISOString(),
      total_games: num('total_games') + 1,
      casual_games: num('total_games') + 1,
      total_score: num('total_score') + out.leaderboardPoints,
      total_words: num('total_words') + wordCount,
      total_time_played: num('total_time_played') + Math.max(0, Math.round(elapsedMs / 1000)),
    };
    if (longestWord && longestWord.length > num('longest_word_length')) {
      updates.longest_word = longestWord;
      updates.longest_word_length = longestWord.length;
    }
    if (lastDay !== today) updates.unique_days_played = num('unique_days_played') + 1;
    const { error } = await db.from('profiles').update(updates).eq('id', userId);
    if (error) throw new Error(`profiles update: ${error.message}`);
  });

  // --- XP through increment_player_xp (daily cap lives in the RPC) + level up.
  await isolate('xp', undefined, async () => {
    const xp = calculateGameXp({ score, isWinner: false, achievementCount: 0, playerCount: 1 });
    if (xp.totalXp <= 0) return;
    const { data, error } = await db.rpc('increment_player_xp', { p_player_id: userId, p_xp_amount: xp.totalXp });
    if (error) throw new Error(`increment_player_xp: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    out.xpGained = Number(row?.xp_granted ?? 0) || 0;
    const oldLevel = num('current_level') || getLevelFromXp(num('total_xp'));
    const newLevel = Number(row?.new_level ?? oldLevel) || oldLevel;
    const info = checkLevelUp(oldLevel, newLevel);
    if (!info.leveledUp) return;
    out.levelUp = { newLevel, levelsGained: info.levelsGained, newTitles: info.newTitles };
    const title = getTitleForLevel(newLevel);
    if (title && title !== profile?.player_title) {
      await db.from('profiles').update({ player_title: title }).eq('id', userId);
    }
    await notifyLevelUp(userId, newLevel).catch((e) => console.error('[ADVENTURE ECOSYSTEM] level-up push', e));
  });

  // --- Global lifetime achievements, merged into the same profiles column.
  await isolate('achievements', undefined, async () => {
    const counts = (profile?.achievement_counts ?? {}) as Record<string, number>;
    const stats: UserStats = {
      gamesPlayed: num('total_games') + 1,
      totalWordsFound: num('total_words') + wordCount,
      totalScore: num('total_score') + out.leaderboardPoints,
      uniqueDaysPlayed: num('unique_days_played'),
    };
    const unlocked = checkLifetimeAchievements(stats, Object.keys(counts));
    if (!unlocked.length) return;
    out.achievementsUnlocked = unlocked.map((a) => a.key);
    const merged = { ...counts };
    for (const a of unlocked) merged[a.key] = (merged[a.key] ?? 0) + 1;
    const { error } = await db.from('profiles').update({ achievement_counts: merged }).eq('id', userId);
    if (error) throw new Error(`achievement_counts update: ${error.message}`);
  });

  // --- Coins: milestones only (elite / boss / world clear). Run gold stays in-run.
  await isolate('coins', undefined, async () => {
    const amount = (COINS_FOR[nodeKind] ?? 0) + (input.worldCleared ? COINS_WORLD_CLEAR : 0);
    if (amount <= 0) return;
    const reason = input.worldCleared ? 'adventure_world' : nodeKind === 'boss' ? 'adventure_boss' : 'adventure_elite';
    const res = await awardCoinsServer(userId, amount, reason, { world, node: nodeKind });
    if (res?.success) out.coinsGained = amount;
  });

  // --- Daily streak, same rules as POST /api/streak recordWin.
  const streak = await isolate('streak', null as { current: number; longest: number } | null, () => creditStreak(db, userId));
  if (streak) out.streak = streak;

  return out;
}
