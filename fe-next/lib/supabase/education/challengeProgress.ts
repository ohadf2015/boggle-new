/**
 * Challenge Progress Tracking
 * Event-driven progress updates for daily challenges
 */

import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';
import type { DailyChallengeRow, WeeklyQuestRow } from './types';

/** Returns Monday of current week as YYYY-MM-DD (matches challenges.getCurrentWeekStart) */
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

// ============================================
// TYPES
// ============================================

export type ChallengeEventType =
  | 'practice_session'
  | 'word_mastered'
  | 'duel_played'
  | 'duel_won'
  | 'xp_earned';

/** Maps frontend event types to DB challenge_type column values */
const EVENT_TO_CHALLENGE_TYPE: Record<ChallengeEventType, string> = {
  practice_session: 'practice_sessions',
  word_mastered: 'words_mastered',
  duel_played: 'duel_played',
  duel_won: 'duel_wins',
  xp_earned: 'xp_earned',
};

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// OPERATIONS
// ============================================

/**
 * Update challenge progress after a player event occurs.
 * Finds today's incomplete challenges matching the event type and increments current_value.
 * Marks challenge as completed when current_value reaches target_value.
 *
 * @param playerId - Player UUID
 * @param eventType - Type of event that triggered the update
 * @param value - Amount to increment the current_value
 * @returns Count of challenges that were updated
 */
export async function updateEducationChallengeProgress(
  playerId: string,
  eventType: ChallengeEventType,
  value: number
): Promise<{ updated: number }> {
  try {
    // Service-role client, deliberately NOT the module-level browser client from
    // '@/lib/supabase'. This runs inside a Next API route, where that client
    // carries no session and acts as `anon` — and `daily_challenges` /
    // `weekly_quests` grant SELECT only to the owning `authenticated` user and
    // writes only `TO service_role` (migration 20260317100000, whose own comment
    // reads "Allow the server (via admin client) to insert/update challenges").
    // Through the anon client the fetch below returned 0 rows with `error: null`
    // and nothing was ever written: a silent no-op that froze every student's
    // daily challenges and weekly quests. Mirrors `getWriteClient()` in
    // ./challenges.ts, minus that helper's anon fallback — falling back here
    // silently restores exactly this bug, so a missing key is an error instead.
    const db = createAdminClient();
    if (!db) {
      logger.error(
        'Challenge progress skipped: no service-role Supabase client (SUPABASE_SERVICE_ROLE_KEY unset or placeholder). Daily challenges and weekly quests will not advance.'
      );
      return { updated: 0 };
    }

    const today = getToday();
    const challengeType = EVENT_TO_CHALLENGE_TYPE[eventType];

    // Fetch today's incomplete challenges for this player
    const { data: challenges, error: fetchError } = await db
      .from('daily_challenges')
      .select('*')
      .eq('player_id', playerId)
      .eq('challenge_date', today)
      .eq('completed', false);

    if (fetchError) {
      logger.error('Error fetching challenges for progress update:', fetchError);
    }

    // Filter to matching challenge type (may be empty — weekly path still runs below)
    const matching = ((challenges ?? []) as DailyChallengeRow[]).filter(
      c => c.challenge_type === challengeType
    );

    let updatedCount = 0;

    // PERF: one batched write instead of an awaited UPDATE per row. Each row
    // carries its own incremented value, so this is an upsert keyed on the
    // primary key rather than a single UPDATE ... IN (...).
    if (matching.length > 0) {
      const rows = matching.map(challenge => {
        const newValue = challenge.current_value + value;
        const isCompleted = newValue >= challenge.target_value;
        return {
          // Conflict key + every NOT NULL column, so the row is still valid on
          // the INSERT branch if the id has vanished.
          id: challenge.id,
          player_id: challenge.player_id,
          challenge_date: challenge.challenge_date,
          challenge_type: challenge.challenge_type,
          challenge_tier: challenge.challenge_tier,
          title: challenge.title,
          description: challenge.description,
          target_value: challenge.target_value,
          xp_reward: challenge.xp_reward,
          // The three columns this function owns. Present on EVERY row: PostgREST
          // rejects a bulk upsert whose objects have differing key sets. And
          // `claimed` / `claimed_at` / `bonus_reward` are omitted, so ON CONFLICT
          // DO UPDATE leaves them alone — a claim landing between the read above
          // and this write is not clobbered.
          current_value: newValue,
          completed: isCompleted ? true : challenge.completed,
          completed_at: isCompleted ? new Date().toISOString() : challenge.completed_at,
        };
      });

      const { error: updateError } = await db
        .from('daily_challenges')
        .upsert(rows, { onConflict: 'id' });

      if (updateError) {
        logger.error('Error updating challenge progress:', updateError);
      } else {
        updatedCount += rows.length;
      }
    }

    // ----- Weekly quest progress -----
    // Fetch this week's incomplete weekly quests, filter by quest_type,
    // and increment current_progress[challengeType] (canonical key shape).
    const weekStart = getCurrentWeekStart();
    const { data: weeklyQuests, error: weeklyFetchError } = await db
      .from('weekly_quests')
      .select('*')
      .eq('player_id', playerId)
      .eq('week_start', weekStart)
      .eq('completed', false);

    if (weeklyFetchError) {
      logger.error('Error fetching weekly quests for progress update:', weeklyFetchError);
      return { updated: updatedCount };
    }

    const matchingWeekly = ((weeklyQuests ?? []) as WeeklyQuestRow[]).filter(
      q => q.quest_type === challengeType
    );

    // PERF: same batching as the daily challenges above — one write per table.
    if (matchingWeekly.length > 0) {
      const questRows = matchingWeekly.map(quest => {
        const requirements = (quest.requirements ?? {}) as Record<string, number>;
        const currentProgress = (quest.current_progress ?? {}) as Record<string, number>;
        const target = requirements[challengeType] ?? 0;
        const prev = currentProgress[challengeType] ?? 0;
        const newValue = prev + value;
        const isCompleted = target > 0 && newValue >= target;

        return {
          // Same shape rule as the daily rows above: conflict key + NOT NULLs +
          // only the columns this function owns, identical keys on every row.
          id: quest.id,
          player_id: quest.player_id,
          week_start: quest.week_start,
          quest_type: quest.quest_type,
          title: quest.title,
          description: quest.description,
          requirements: quest.requirements,
          xp_reward: quest.xp_reward,
          current_progress: { ...currentProgress, [challengeType]: newValue },
          completed: isCompleted ? true : quest.completed,
          completed_at: isCompleted ? new Date().toISOString() : quest.completed_at,
        };
      });

      const { error: weeklyUpdateError } = await db
        .from('weekly_quests')
        .upsert(questRows, { onConflict: 'id' });

      if (weeklyUpdateError) {
        logger.error('Error updating weekly quest progress:', weeklyUpdateError);
      } else {
        updatedCount += questRows.length;
      }
    }

    return { updated: updatedCount };
  } catch (err) {
    logger.error('Exception in updateEducationChallengeProgress:', err);
    return { updated: 0 };
  }
}
