/**
 * Seam from Next API routes into the daily-quest manager. Callers may fire and
 * forget it, or await the level-up it resolves to put in their response.
 *
 * Shared by the daily Word Tower score route and the daily Connections
 * completion so both credit today's quests identically. The manager is loaded
 * lazily (same pattern as the drills seam) to keep it out of the route's cold
 * path, and a failure is LOGGED, never swallowed silently or allowed to fail the
 * player's score submit.
 */
import type { QuestGameResult } from '@/shared/dailyQuestPool';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';

export function isTodayUTC(dateISO: string): boolean {
  return dateISO === getDailyChallengeDate();
}

/** Long enough for the mission round-trips, short enough that a slow DB never holds the player's response. */
export const QUEST_CREDIT_WAIT_MS = 1500;

export interface QuestLevelUp {
  oldLevel: number;
  newLevel: number;
}

/** Waits at most `waitMs` for quest XP's level-up; never rejects, so it can't fail the response it rides on. */
export function questLevelUpWithin(
  work: Promise<QuestLevelUp | null | undefined>,
  waitMs: number = QUEST_CREDIT_WAIT_MS,
): Promise<QuestLevelUp | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), waitMs);
  });
  const settled = work.then((levelUp) => levelUp ?? null, () => null);
  return Promise.race([settled, timeout]).finally(() => clearTimeout(timer));
}

/** Credits today's quests and resolves the level-up their XP caused; a late grant still lands, unannounced. */
export function creditDailyQuests(
  userId: string | null | undefined,
  result: QuestGameResult,
  waitMs: number = QUEST_CREDIT_WAIT_MS,
): Promise<QuestLevelUp | null> {
  if (!userId) return Promise.resolve(null);
  const credit = import('@/backend/modules/dailyMissionsManager')
    .then(({ completeDailyQuestsForResult }) => completeDailyQuestsForResult(userId, result))
    .then((grant) => grant?.levelUp ?? null)
    .catch((err: unknown) => {
      console.error('[daily-quests] credit failed', result.mode, err instanceof Error ? err.message : err);
      return null;
    });
  return questLevelUpWithin(credit, waitMs);
}
