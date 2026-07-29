/**
 * Challenge Progress Tracking
 * Event-driven progress updates for daily challenges
 */

import { supabase } from '@/lib/supabase';
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
    if (!supabase) return { updated: 0 };

    const today = getToday();
    const challengeType = EVENT_TO_CHALLENGE_TYPE[eventType];

    // Fetch today's incomplete challenges for this player
    const { data: challenges, error: fetchError } = await supabase
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

    for (const challenge of matching) {
      const newValue = challenge.current_value + value;
      const isCompleted = newValue >= challenge.target_value;

      const updatePayload: Record<string, unknown> = {
        current_value: newValue,
      };

      if (isCompleted) {
        updatePayload.completed = true;
        updatePayload.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('daily_challenges')
        .update(updatePayload)
        .eq('id', challenge.id);

      if (updateError) {
        logger.error('Error updating challenge progress:', updateError);
        continue;
      }

      updatedCount += 1;
    }

    // ----- Weekly quest progress -----
    // Fetch this week's incomplete weekly quests, filter by quest_type,
    // and increment current_progress[challengeType] (canonical key shape).
    const weekStart = getCurrentWeekStart();
    const { data: weeklyQuests, error: weeklyFetchError } = await supabase
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

    for (const quest of matchingWeekly) {
      const requirements = (quest.requirements ?? {}) as Record<string, number>;
      const currentProgress = (quest.current_progress ?? {}) as Record<string, number>;
      const target = requirements[challengeType] ?? 0;
      const prev = currentProgress[challengeType] ?? 0;
      const newValue = prev + value;
      const isCompleted = target > 0 && newValue >= target;

      const updatePayload: Record<string, unknown> = {
        current_progress: { ...currentProgress, [challengeType]: newValue },
      };
      if (isCompleted) {
        updatePayload.completed = true;
        updatePayload.completed_at = new Date().toISOString();
      }

      const { error: weeklyUpdateError } = await supabase
        .from('weekly_quests')
        .update(updatePayload)
        .eq('id', quest.id);

      if (weeklyUpdateError) {
        logger.error('Error updating weekly quest progress:', weeklyUpdateError);
        continue;
      }

      updatedCount += 1;
    }

    return { updated: updatedCount };
  } catch (err) {
    logger.error('Exception in updateEducationChallengeProgress:', err);
    return { updated: 0 };
  }
}
