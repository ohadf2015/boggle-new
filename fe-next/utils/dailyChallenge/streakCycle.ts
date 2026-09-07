/**
 * Streak cycle — the seven day-slots the streak week row renders.
 *
 * Anchored on the server's weekly-chest `cycleStart` (see hooks/useWeeklyChest),
 * which is a ROLLING 7-day cycle, not a Monday-start calendar week. The chest
 * always sits in slot 7, so whichever weekday a player begins on, seven days of
 * play fills the row and opens the chest.
 *
 * All arithmetic is UTC, matching `getDailyChallengeDate()` — the daily
 * challenge rolls over at UTC midnight, so a local-time date here would put a
 * player in the wrong slot for part of every day.
 */

/** Days in a chest cycle. Mirrors the server's cycle length. */
export const CYCLE_LENGTH = 7;

export interface StreakCycleDay {
  /** UTC date, `YYYY-MM-DD`. */
  iso: string;
  /** 0-based slot position in the cycle. */
  index: number;
  /** Player finished a daily on this date. */
  done: boolean;
  isToday: boolean;
  /** Date has not arrived yet — render as an unreachable slot, not a miss. */
  isFuture: boolean;
  /** Last slot: shows the chest instead of a day dot. */
  isChestSlot: boolean;
}

interface BuildStreakCycleOptions {
  /**
   * Server cycle anchor (`YYYY-MM-DD`). Empty for guests and for
   * rate-limited/failed status calls — then the cycle is derived from
   * `currentStreak` instead.
   */
  cycleStart: string;
  /** Dates the server recorded as completed this cycle. */
  completedDates: string[];
  /** Today, UTC. */
  today: string;
  /** Local streak length — only used for the guest fallback. */
  currentStreak?: number;
}

function addUtcDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

export function buildStreakCycle({
  cycleStart,
  completedDates,
  today,
  currentStreak = 0,
}: BuildStreakCycleOptions): StreakCycleDay[] {
  // Guests get no server cycle, so derive one: today is the (streak mod 7)-th
  // day of the current cycle. A streak that is an exact multiple of 7 has just
  // filled a cycle, so day 15 opens a fresh cycle rather than overflowing.
  const usingFallback = !cycleStart;
  const offsetIntoCycle = currentStreak > 0 ? (currentStreak - 1) % CYCLE_LENGTH : 0;
  const start = usingFallback ? addUtcDays(today, -offsetIntoCycle) : cycleStart;

  const completed = new Set(completedDates);

  return Array.from({ length: CYCLE_LENGTH }, (_, index) => {
    const iso = addUtcDays(start, index);
    const done = usingFallback
      // Without server dates, the only honest claim is that the streak covers
      // the slots up to and including today.
      ? currentStreak > 0 && index <= offsetIntoCycle
      : completed.has(iso);

    return {
      iso,
      index,
      done,
      isToday: iso === today,
      isFuture: iso > today,
      isChestSlot: index === CYCLE_LENGTH - 1,
    };
  });
}

/** True once every slot in the cycle is done — the chest is earned. */
export function isCycleComplete(days: StreakCycleDay[]): boolean {
  return days.length === CYCLE_LENGTH && days.every(day => day.done);
}
