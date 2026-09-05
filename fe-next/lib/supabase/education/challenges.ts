/**
 * Challenge Operations (Daily + Weekly)
 * DB operations for daily_challenges and weekly_quests tables
 */

import { supabase } from '@/lib/supabase';
import { createAdminClient } from '@/utils/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import type { DailyChallengeRow, WeeklyQuestRow, ChallengeTier } from './types';

// Use admin client (service role) for write operations that require bypassing RLS.
// Falls back to anon browser client when service role key is unavailable (browser/test).
function getWriteClient() {
  return createAdminClient() ?? supabase;
}

/**
 * Client for a per-player READ.
 *
 * `daily_challenges` / `weekly_quests` grant SELECT `TO authenticated USING
 * (player_id = auth.uid())`. In the browser the module-level client carries the
 * user's session and that works. Inside a Next API route it does NOT — it is
 * `anon` there, so the read came back as 0 rows with `error: null` and the
 * student's challenge list looked empty. Server callers must therefore pass the
 * REQUEST's authenticated client (see `createRequestClient`), which is scoped to
 * one user, so the RLS predicate still does the filtering. Never an admin client:
 * a service-role read here would bypass the per-player filter entirely.
 */
function getReadClient(client?: SupabaseClient) {
  return client ?? supabase;
}

// ============================================
// CHALLENGE DEFINITIONS
// ============================================

interface ChallengeTemplate {
  type: string;
  target: number;
  xpReward: number;
  title: string; // Translation key
  description: string; // Translation key
}

const EDUCATION_DAILY_CHALLENGES: Record<ChallengeTier, ChallengeTemplate[]> = {
  easy: [
    {
      type: 'practice_sessions',
      target: 3,
      xpReward: 50,
      title: 'challenges.daily.practiceSessions',
      description: 'challenges.daily.practiceSessionsDesc',
    },
    {
      type: 'words_mastered',
      target: 5,
      xpReward: 50,
      title: 'challenges.daily.wordsMastered',
      description: 'challenges.daily.wordsMasteredDesc',
    },
    {
      type: 'duel_played',
      target: 1,
      xpReward: 50,
      title: 'challenges.daily.duelPlayed',
      description: 'challenges.daily.duelPlayedDesc',
    },
  ],
  medium: [
    {
      type: 'duel_wins',
      target: 2,
      xpReward: 100,
      title: 'challenges.daily.duelWins',
      description: 'challenges.daily.duelWinsDesc',
    },
    {
      type: 'perfect_accuracy',
      target: 1,
      xpReward: 100,
      title: 'challenges.daily.perfectAccuracy',
      description: 'challenges.daily.perfectAccuracyDesc',
    },
    {
      type: 'blitz_high_score',
      target: 300,
      xpReward: 100,
      title: 'challenges.daily.blitzHighScore',
      description: 'challenges.daily.blitzHighScoreDesc',
    },
  ],
  hard: [
    {
      type: 'xp_earned',
      target: 200,
      xpReward: 200,
      title: 'challenges.daily.xpEarned',
      description: 'challenges.daily.xpEarnedDesc',
    },
    {
      type: 'duel_streak',
      target: 3,
      xpReward: 200,
      title: 'challenges.daily.duelStreak',
      description: 'challenges.daily.duelStreakDesc',
    },
    {
      type: 'spelling_perfect',
      target: 3,
      xpReward: 200,
      title: 'challenges.daily.spellingPerfect',
      description: 'challenges.daily.spellingPerfectDesc',
    },
  ],
};

// Bonus rewards by tier
const TIER_BONUS_REWARDS: Record<ChallengeTier, { coins: number }> = {
  easy: { coins: 10 },
  medium: { coins: 25 },
  hard: { coins: 50 },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current week start (Monday) as YYYY-MM-DD
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);

  return monday.toISOString().split('T')[0];
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Pick random element from array
 */
function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get daily challenges for a player
 * @param playerId - Player UUID
 * @param date - Optional date (defaults to today)
 * @returns Array of daily challenge rows
 */
export async function getDailyChallenges(
  playerId: string,
  date?: string,
  client?: SupabaseClient
): Promise<{ data: DailyChallengeRow[]; error: { message: string } | null }> {
  try {
    const db = getReadClient(client);
    if (!db) return { data: [], error: { message: 'Supabase not configured' } };

    const targetDate = date || getToday();

    const { data: challenges, error } = await db
      .from('daily_challenges')
      .select('*')
      .eq('player_id', playerId)
      .eq('challenge_date', targetDate);

    if (error) {
      logger.error('Error fetching daily challenges:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: (challenges || []) as DailyChallengeRow[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getDailyChallenges:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get weekly quests for a player
 * @param playerId - Player UUID
 * @param weekStart - Optional week start date (Monday, defaults to current week)
 * @returns Array of weekly quest rows
 */
export async function getWeeklyQuests(
  playerId: string,
  weekStart?: string,
  client?: SupabaseClient
): Promise<{ data: WeeklyQuestRow[]; error: { message: string } | null }> {
  try {
    const db = getReadClient(client);
    if (!db) return { data: [], error: { message: 'Supabase not configured' } };

    const targetWeek = weekStart || getCurrentWeekStart();

    const { data: quests, error } = await db
      .from('weekly_quests')
      .select('*')
      .eq('player_id', playerId)
      .eq('week_start', targetWeek);

    if (error) {
      // PGRST205 = table not found in schema cache (table hasn't been created yet).
      // Still an empty result to the caller, but never a silent one — an empty
      // quest list that means "the table is missing" must be distinguishable
      // from one that means "this player has no quests".
      if (error.code === 'PGRST205') {
        logger.warn('weekly_quests table not found in schema cache; returning no quests', error);
        return { data: [], error: null };
      }
      logger.error('Error fetching weekly quests:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: (quests || []) as WeeklyQuestRow[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    // Suppress missing table errors
    if (error.includes('weekly_quests') && error.includes('schema cache')) {
      return { data: [], error: null };
    }
    logger.error('Exception in getWeeklyQuests:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Scale a challenge target based on student level.
 * - Level 1-5 (easy): use base target as-is
 * - Level 6-15 (medium): double the target
 * - Level 16+ (hard): triple the target
 */
function scaleTarget(baseTarget: number, studentLevel: number): number {
  if (studentLevel >= 16) return baseTarget * 3;
  if (studentLevel >= 6) return baseTarget * 2;
  return baseTarget;
}

/**
 * Fetch the student's current education level from student_lesson_progress.
 * Returns 1 if not found or on error.
 */
async function getStudentLevel(
  playerId: string
): Promise<number> {
  try {
    const db = getWriteClient();
    if (!db) return 1;

    const { data, error } = await db
      .from('student_lesson_progress')
      .select('current_level')
      .eq('student_id', playerId)
      .order('current_level', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return 1;
    return data.current_level ?? 1;
  } catch {
    return 1;
  }
}

/**
 * Assign daily challenges to a player (1 easy, 1 medium, 1 hard)
 * Targets are scaled based on the student's current level.
 * @param playerId - Player UUID
 * @returns Array of created challenge rows
 */
export async function assignDailyChallenges(
  playerId: string
): Promise<{ data: DailyChallengeRow[] | null; error: { message: string } | null }> {
  try {
    const db = getWriteClient();
    if (!db)
      return { data: null, error: { message: 'Supabase not configured' } };

    const today = getToday();

    // Check if challenges already exist for today
    const { data: existing } = await db
      .from('daily_challenges')
      .select('*')
      .eq('player_id', playerId)
      .eq('challenge_date', today);

    if (existing && existing.length > 0) {
      // Already assigned today
      return { data: existing as DailyChallengeRow[], error: null };
    }

    // Fetch student level for difficulty scaling
    const studentLevel = await getStudentLevel(playerId);

    // Pick 1 random challenge from each tier
    const easyChallenges = EDUCATION_DAILY_CHALLENGES.easy;
    const mediumChallenges = EDUCATION_DAILY_CHALLENGES.medium;
    const hardChallenges = EDUCATION_DAILY_CHALLENGES.hard;

    const selectedChallenges = [
      { ...pickRandom(easyChallenges), tier: 'easy' as ChallengeTier },
      { ...pickRandom(mediumChallenges), tier: 'medium' as ChallengeTier },
      { ...pickRandom(hardChallenges), tier: 'hard' as ChallengeTier },
    ];

    // Create challenge rows with level-scaled targets
    const challengeRows = selectedChallenges.map((challenge) => ({
      player_id: playerId,
      challenge_date: today,
      challenge_type: challenge.type,
      challenge_tier: challenge.tier,
      title: challenge.title,
      description: challenge.description,
      target_value: scaleTarget(challenge.target, studentLevel),
      current_value: 0,
      xp_reward: challenge.xpReward,
      bonus_reward: TIER_BONUS_REWARDS[challenge.tier],
      completed: false,
      claimed: false,
    }));

    const { data: created, error } = await db
      .from('daily_challenges')
      .insert(challengeRows)
      .select();

    if (error) {
      logger.error('Error creating daily challenges:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: created as DailyChallengeRow[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in assignDailyChallenges:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Assign weekly quest to a player (1 words_mastered quest per week)
 * @param playerId - Player UUID
 * @returns Array of created quest rows
 */
export async function assignWeeklyQuests(
  playerId: string
): Promise<{ data: WeeklyQuestRow[] | null; error: { message: string } | null }> {
  try {
    const db = getWriteClient();
    if (!db)
      return { data: null, error: { message: 'Supabase not configured' } };

    const weekStart = getCurrentWeekStart();

    // Check if quests already exist for this week
    const { data: existing } = await db
      .from('weekly_quests')
      .select('*')
      .eq('player_id', playerId)
      .eq('week_start', weekStart);

    if (existing && existing.length > 0) {
      return { data: existing as WeeklyQuestRow[], error: null };
    }

    // Create 1 weekly quest: words_mastered, 20 words, 300 XP, 50 coins
    const questRow = {
      player_id: playerId,
      week_start: weekStart,
      quest_type: 'words_mastered',
      title: 'challenges.weekly.masterWords',
      description: 'challenges.weekly.masterWordsDesc',
      requirements: { words_mastered: 20 },
      current_progress: { words_mastered: 0 },
      xp_reward: 300,
      bonus_rewards: { coins: 50 },
      completed: false,
      claimed: false,
    };

    const { data: created, error } = await db
      .from('weekly_quests')
      .insert([questRow])
      .select();

    if (error) {
      // PGRST205 = table not found (hasn't been created yet)
      if (error.code === 'PGRST205') {
        return { data: [], error: null };
      }
      logger.error('Error creating weekly quests:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: created as WeeklyQuestRow[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    // Suppress missing table errors
    if (error.includes('weekly_quests') && error.includes('schema cache')) {
      return { data: [], error: null };
    }
    logger.error('Exception in assignWeeklyQuests:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Claim reward for a completed daily challenge
 * @param challengeId - Challenge UUID
 * @param playerId - Player UUID (for verification)
 * @returns Reward data or error
 */
export async function claimChallengeReward(
  challengeId: string,
  playerId: string
): Promise<{
  data: { xpReward: number; bonusReward: { coins?: number } | null } | null;
  error: { message: string } | null;
}> {
  try {
    const db = getWriteClient();
    if (!db)
      return { data: null, error: { message: 'Supabase not configured' } };

    // Fetch challenge
    const { data: challenge, error: fetchError } = await db
      .from('daily_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchError || !challenge) {
      logger.error('Error fetching challenge:', fetchError);
      return { data: null, error: { message: 'Challenge not found' } };
    }

    // Verify player ID matches
    if (challenge.player_id !== playerId) {
      return { data: null, error: { message: 'Player ID mismatch' } };
    }

    // Verify challenge is completed
    if (!challenge.completed) {
      return { data: null, error: { message: 'Challenge not completed' } };
    }

    // Verify not already claimed
    if (challenge.claimed) {
      return { data: null, error: { message: 'Challenge already claimed' } };
    }

    // Mark as claimed
    const { error: updateError } = await db
      .from('daily_challenges')
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', challengeId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error claiming challenge:', updateError);
      return { data: null, error: { message: updateError.message } };
    }

    return {
      data: {
        xpReward: challenge.xp_reward,
        bonusReward: challenge.bonus_reward,
      },
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in claimChallengeReward:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Claim reward for a completed weekly quest
 * @param questId - Quest UUID
 * @param playerId - Player UUID (for verification)
 * @returns Reward data or error
 */
export async function claimQuestReward(
  questId: string,
  playerId: string
): Promise<{
  data: { xpReward: number; bonusReward: { coins?: number } | null } | null;
  error: { message: string } | null;
}> {
  try {
    const db = getWriteClient();
    if (!db)
      return { data: null, error: { message: 'Supabase not configured' } };

    // Fetch quest
    const { data: quest, error: fetchError } = await db
      .from('weekly_quests')
      .select('*')
      .eq('id', questId)
      .single();

    if (fetchError) {
      // PGRST205 = table not found (hasn't been created yet)
      if (fetchError.code === 'PGRST205') {
        return { data: null, error: { message: 'Weekly quests not available yet' } };
      }
      logger.error('Error fetching quest:', fetchError);
      return { data: null, error: { message: 'Quest not found' } };
    }
    if (!quest) {
      return { data: null, error: { message: 'Quest not found' } };
    }

    // Verify player ID matches
    if (quest.player_id !== playerId) {
      return { data: null, error: { message: 'Player ID mismatch' } };
    }

    // Verify quest is completed
    if (!quest.completed) {
      return { data: null, error: { message: 'Quest not completed' } };
    }

    // Verify not already claimed
    if (quest.claimed) {
      return { data: null, error: { message: 'Quest already claimed' } };
    }

    // Mark as claimed
    const { error: updateError } = await db
      .from('weekly_quests')
      .update({
        claimed: true,
      })
      .eq('id', questId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST205') {
        return { data: null, error: { message: 'Weekly quests not available yet' } };
      }
      logger.error('Error claiming quest:', updateError);
      return { data: null, error: { message: updateError.message } };
    }

    return {
      data: {
        xpReward: quest.xp_reward,
        bonusReward: quest.bonus_rewards,
      },
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in claimQuestReward:', error);
    return { data: null, error: { message: error } };
  }
}

// Re-export event-driven progress from dedicated module
export { updateEducationChallengeProgress, type ChallengeEventType } from './challengeProgress';
