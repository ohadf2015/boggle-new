/**
 * Adventure Streak — tracks consecutive days of adventure play.
 * Multiplier grows from 1.0x (day 0) to 2.0x (day 7+).
 *
 * Grace period: 36 hours between plays (not calendar day).
 * Streak freeze: 1 free freeze per week — auto-consumed when streak would break.
 */

const GRACE_HOURS = 36;
const MIN_GAP_HOURS = 1; // ignore plays within 1h (same session)
const FREEZE_COOLDOWN_DAYS = 7;

export interface AdventureStreakState {
  currentStreak: number;
  bestStreak: number;
  lastPlayedAt: string | null; // ISO timestamp
  freezesUsedThisWeek: number;
  lastFreezeWeek: string | null; // ISO timestamp of when freeze counter last reset
}

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

/** Check if the free weekly freeze is available */
function isFreezeAvailable(state: AdventureStreakState, now: string): boolean {
  if (state.freezesUsedThisWeek === 0) return true;
  if (!state.lastFreezeWeek) return true;
  const daysSinceReset = hoursBetween(state.lastFreezeWeek, now) / 24;
  return daysSinceReset >= FREEZE_COOLDOWN_DAYS;
}

/** Update streak state when player completes an adventure level */
export function updateStreak(
  state: AdventureStreakState,
  now: string, // ISO timestamp
): AdventureStreakState {
  // First play ever
  if (!state.lastPlayedAt) {
    return { ...state, currentStreak: 1, bestStreak: Math.max(state.bestStreak, 1), lastPlayedAt: now };
  }

  const gap = hoursBetween(state.lastPlayedAt, now);

  // Same session (<1h) — no change
  if (gap < MIN_GAP_HOURS) return state;

  // Within grace period — increment streak
  if (gap <= GRACE_HOURS) {
    const newStreak = state.currentStreak + 1;
    return {
      ...state,
      currentStreak: newStreak,
      bestStreak: Math.max(state.bestStreak, newStreak),
      lastPlayedAt: now,
    };
  }

  // Beyond grace — try freeze
  const canFreeze = state.currentStreak > 0 && isFreezeAvailable(state, now);

  if (canFreeze) {
    // Determine if freeze week resets
    const weekReset = !state.lastFreezeWeek
      || hoursBetween(state.lastFreezeWeek, now) / 24 >= FREEZE_COOLDOWN_DAYS;
    return {
      ...state,
      lastPlayedAt: now,
      freezesUsedThisWeek: weekReset ? 1 : state.freezesUsedThisWeek + 1,
      lastFreezeWeek: weekReset ? now : state.lastFreezeWeek,
    };
  }

  // Reset streak
  return {
    ...state,
    currentStreak: 1,
    bestStreak: Math.max(state.bestStreak, 1),
    lastPlayedAt: now,
    freezesUsedThisWeek: state.freezesUsedThisWeek,
    lastFreezeWeek: state.lastFreezeWeek,
  };
}

// ── Streak Milestones ──────────────────────────────────

export interface StreakMilestone {
  days: number;
  rewardGold: number;
  titleKey: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3,  rewardGold: 50,  titleKey: 'adventure.streak.milestone3' },
  { days: 7,  rewardGold: 150, titleKey: 'adventure.streak.milestone7' },
  { days: 14, rewardGold: 300, titleKey: 'adventure.streak.milestone14' },
  { days: 30, rewardGold: 500, titleKey: 'adventure.streak.milestone30' },
];

/** Returns milestone info if streak exactly hits a milestone, otherwise null */
export function getStreakMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find(m => m.days === streak) ?? null;
}

/** Get XP/gold multiplier from streak length (1.0x to 2.0x over 7 days) */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays <= 0) return 1.0;
  // Linear ramp: +~0.143x per day, capped at 2.0x
  return Math.min(2.0, 1.0 + (streakDays / 7));
}
