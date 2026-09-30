/**
 * Fire-and-forget seam from Next API routes into the daily-quest manager.
 *
 * Shared by the daily Word Tower score route and the daily Connections
 * completion so both credit today's quests identically. The manager is loaded
 * lazily (same pattern as the drills seam) to keep it out of the route's cold
 * path, and a failure is LOGGED, never swallowed silently or allowed to fail the
 * player's score submit.
 */
import type { QuestGameResult } from '@/shared/dailyQuestPool';

export function isTodayUTC(dateISO: string): boolean {
  return dateISO === new Date().toISOString().slice(0, 10);
}

export function creditDailyQuests(
  userId: string | null | undefined,
  result: QuestGameResult,
): void {
  if (!userId) return;
  void import('@/backend/modules/dailyMissionsManager')
    .then(({ completeDailyQuestsForResult }) => completeDailyQuestsForResult(userId, result))
    .catch((err: unknown) => {
      console.error('[daily-quests] credit failed', result.mode, err instanceof Error ? err.message : err);
    });
}
