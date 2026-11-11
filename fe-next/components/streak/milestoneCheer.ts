import { STREAK_MILESTONES } from '@/lib/daily/streakRewards';
import { claimOnce } from '@/lib/daily/streakToastOnce';

export const CHEER_FROM_DAYS = 7;

export interface MilestoneCheer {
  days: number;
  key: string;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const cheerKey = (days: number, runStart: string) => `lc:streak-cheer:${days}:${runStart}`;

/** The milestone this streak just reached (today or yesterday), keyed to the run so a later run can earn it again. */
export function cheerMilestone(current: number, playedToday: boolean, today: string): MilestoneCheer | null {
  const reached = [...STREAK_MILESTONES].reverse().find((m) => m.days <= current);
  if (!reached || reached.days < CHEER_FROM_DAYS || current - reached.days > 1) return null;
  const lastDay = playedToday ? today : shiftDate(today, -1);
  return { days: reached.days, key: cheerKey(reached.days, shiftDate(lastDay, -(current - 1))) };
}

/** Another surface already celebrated this run's milestone; the home cheer must not repeat it. */
export function markMilestoneCheered(days: number, current: number, playedToday: boolean, today: string): void {
  if (!Number.isFinite(current) || current < 1) return;
  const lastDay = playedToday ? today : shiftDate(today, -1);
  claimOnce(cheerKey(days, shiftDate(lastDay, -(current - 1))));
}

/** The flame-tier sticker for the milestone; 7-13 has no sticker of its own, so the on-fire pose stands in. */
export function cheerMascotSrc(days: number): string {
  if (days >= 100) return '/mascot/streak-eternal-nobg.webp';
  if (days >= 60) return '/mascot/streak-supernova-nobg.webp';
  if (days >= 30) return '/mascot/streak-molten-nobg.webp';
  if (days >= 14) return '/mascot/streak-inferno-nobg.webp';
  return '/mascot/onfire-nobg.webp';
}
