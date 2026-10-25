import { STREAK_BONUS_THRESHOLD, xpForPuzzle } from '@/lib/connections/gameLogic';

export const DAILY_CHEST_XP = 25;
export const DAILY_CHEST_LESSON_TAG = 'academy-daily-chest';
export const CONNECTIONS_LESSON_TAG = 'connections-game';

/** The most one Connections solve can earn: a hard puzzle on a streak. */
export const CONNECTIONS_MAX_SOLVE_XP = xpForPuzzle('hard', STREAK_BONUS_THRESHOLD);

export type RecordXpGrant =
  | { kind: 'connections'; xp: number }
  | { kind: 'daily_chest'; xp: number }
  | { kind: 'rejected' };

/**
 * The XP this route may grant. The client's amount is a request, never the
 * grant: Connections is clamped to one best-case solve, the chest is fixed.
 * Every other practice type earns XP server-side in its own route.
 */
export function resolveRecordXpGrant(activityType: unknown, lessonId: unknown, requested: number): RecordXpGrant {
  if (activityType === 'connections') {
    return { kind: 'connections', xp: Math.min(Math.floor(requested), CONNECTIONS_MAX_SOLVE_XP) };
  }
  if (activityType === 'daily_challenge' && lessonId === DAILY_CHEST_LESSON_TAG) {
    return { kind: 'daily_chest', xp: DAILY_CHEST_XP };
  }
  return { kind: 'rejected' };
}
