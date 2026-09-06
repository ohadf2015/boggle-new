/**
 * What tapping a day tile in the daily progress strips should do.
 *
 * The hub renders "last 7 days" squares and the weekly-chest dots, and a
 * missed day (red X / empty square) used to be a dead div. This maps a day
 * to a concrete affordance so every tile has an outcome:
 *
 * - done    → the day's archive results (score, rank)
 * - today   → today's hub quests
 * - play    → a catch-up play of that missed day (inside the 3-day window)
 * - expired → missed, but outside the catch-up window (tile explains why)
 * - pending → a future day in the chest cycle
 */
import { isCatchUpDate } from './catchUp';

export type DailyPlayMode = 'word-hunt' | 'word-wheel';

export interface DailyDayState {
  date: string;
  wordHunt: boolean;
  wordWheel: boolean;
}

export interface MissedDayContext {
  /** ISO YYYY-MM-DD (UTC) for "today". */
  today: string;
  language: string;
  /** Which mode a catch-up should open. Defaults to Word Hunt. */
  preferredMode?: DailyPlayMode;
}

export type MissedDayAction =
  | { kind: 'done'; href: string }
  | { kind: 'today'; href: string }
  | { kind: 'play'; href: string; mode: DailyPlayMode }
  | { kind: 'expired' }
  | { kind: 'pending' };

export function resolveMissedDayAction(day: DailyDayState, ctx: MissedDayContext): MissedDayAction {
  const { today, language } = ctx;
  const done = day.wordHunt || day.wordWheel;
  if (done) return { kind: 'done', href: `/${language}/daily/archive/${day.date}` };
  if (day.date === today) return { kind: 'today', href: `/${language}/daily` };
  // ISO date strings sort lexicographically — direct string compare is safe.
  if (day.date > today) return { kind: 'pending' };
  if (isCatchUpDate(today, day.date)) {
    const mode = ctx.preferredMode ?? 'word-hunt';
    return { kind: 'play', href: `/${language}/daily/${mode}?date=${day.date}`, mode };
  }
  return { kind: 'expired' };
}
