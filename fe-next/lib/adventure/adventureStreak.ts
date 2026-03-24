/**
 * Adventure Streak — tracks consecutive days of adventure play.
 * Multiplier grows from 1.0x (day 0) to 2.0x (day 7+).
 */

export interface AdventureStreakState {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
}

/**
 * Check if two dates are within the streak grace period.
 * Allows up to 2 calendar days apart (36h effective grace window)
 * to prevent streaks breaking from timezone shifts or late-night play.
 */
function isWithinStreakGrace(prev: string, current: string): boolean {
  const prevDate = new Date(prev + 'T00:00:00Z');
  const currDate = new Date(current + 'T00:00:00Z');
  const diffMs = currDate.getTime() - prevDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 1 && diffDays <= 2;
}

/** Update streak state when player completes an adventure level */
export function updateStreak(
  state: AdventureStreakState,
  todayStr: string, // YYYY-MM-DD
): AdventureStreakState {
  // Same day — no change
  if (state.lastPlayedDate === todayStr) return state;

  const isConsecutive = state.lastPlayedDate !== null && isWithinStreakGrace(state.lastPlayedDate, todayStr);

  const newStreak = isConsecutive ? state.currentStreak + 1 : 1;
  const newBest = Math.max(state.bestStreak, newStreak);

  return {
    currentStreak: newStreak,
    bestStreak: newBest,
    lastPlayedDate: todayStr,
  };
}

/** Get XP/gold multiplier from streak length (1.0x to 2.0x over 7 days) */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays <= 0) return 1.0;
  // Linear ramp: +~0.143x per day, capped at 2.0x
  return Math.min(2.0, 1.0 + (streakDays / 7));
}
