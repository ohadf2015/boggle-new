/**
 * Escalating Daily Rewards System
 *
 * Rewards increase with streak length, motivating players to maintain streaks.
 * Milestones grant badges; non-milestone days use linear interpolation.
 */

export const DAILY_REWARD_SCHEDULE = [
  { day: 1, coins: 10, label: 'starter' },
  { day: 2, coins: 15, label: 'warmup' },
  { day: 3, coins: 25, label: 'committed' },
  { day: 5, coins: 50, label: 'dedicated' },
  // Day 7 badge ('weekly_warrior') retired 2026-05-13: the weekly chest now
  // owns the 7-day milestone reward, so we keep the coin bonus but drop the
  // redundant badge nag from the milestone preview.
  { day: 7, coins: 100, label: 'weekWarrior' },
  { day: 14, coins: 200, badge: 'fortnight_fighter', label: 'fortnightFighter' },
  { day: 30, coins: 500, badge: 'monthly_master', label: 'monthlyMaster' },
  { day: 50, coins: 750, label: 'veteran' },
  { day: 100, coins: 1000, badge: 'centurion', label: 'centurion' },
] as const;

export type DailyRewardEntry = (typeof DAILY_REWARD_SCHEDULE)[number];

export interface DailyReward {
  coins: number;
  badge?: string;
  label?: string;
  isMilestone: boolean;
}

export interface NextMilestone {
  day: number;
  coins: number;
  badge?: string;
  label: string;
  daysAway: number;
}

/**
 * Get the coin reward for a given streak day via linear interpolation.
 */
export function getRewardCoins(streakDay: number): number {
  const day = Math.max(1, streakDay);
  const schedule = DAILY_REWARD_SCHEDULE;

  // Exact milestone match
  const exact = schedule.find((m) => m.day === day);
  if (exact) return exact.coins;

  // Beyond last milestone
  if (day > schedule[schedule.length - 1].day) {
    return schedule[schedule.length - 1].coins;
  }

  // Find surrounding milestones and interpolate
  let lower: { day: number; coins: number } = schedule[0];
  let upper: { day: number; coins: number } = schedule[1];
  for (let i = 0; i < schedule.length - 1; i++) {
    if (schedule[i].day <= day && schedule[i + 1].day >= day) {
      lower = schedule[i];
      upper = schedule[i + 1];
      break;
    }
  }

  const ratio = (day - lower.day) / (upper.day - lower.day);
  return Math.floor(lower.coins + (upper.coins - lower.coins) * ratio);
}

/**
 * Get the full reward info for a given streak day.
 */
export function getRewardForDay(streakDay: number): DailyReward {
  const day = Math.max(1, streakDay);
  const exact = DAILY_REWARD_SCHEDULE.find((m) => m.day === day);

  if (exact) {
    return {
      coins: exact.coins,
      badge: 'badge' in exact ? (exact as { badge: string }).badge : undefined,
      label: exact.label,
      isMilestone: true,
    };
  }

  return {
    coins: getRewardCoins(day),
    isMilestone: false,
  };
}

/**
 * Get the next milestone after the given streak day.
 * Returns null if already at or past the last milestone.
 *
 * @param options.badgeOnly  when true, skip non-badge milestones (day 1,2,3,5,50)
 */
export function getNextMilestone(
  streakDay: number,
  options: { badgeOnly?: boolean } = {}
): NextMilestone | null {
  const day = Math.max(0, streakDay);

  for (const milestone of DAILY_REWARD_SCHEDULE) {
    if (milestone.day <= day) continue;
    const badge = 'badge' in milestone ? (milestone as { badge: string }).badge : undefined;
    if (options.badgeOnly && !badge) continue;
    return {
      day: milestone.day,
      coins: milestone.coins,
      badge,
      label: milestone.label,
      daysAway: milestone.day - day,
    };
  }

  return null;
}
