/**
 * Ticker events for the live TV, derived from two leaderboard frames.
 *
 * Pure on purpose: the TV re-renders on every economy tick, and the ticker
 * must fire once per real change, never per frame.
 */

export interface TvRow {
  username: string;
  cash: number;
  streak: number;
}

export type TvTickerEvent =
  | { kind: 'overtook'; username: string; rival: string }
  | { kind: 'streak'; username: string; streak: number };

/** A streak is worth announcing the moment it first reaches this. */
export const STREAK_MILESTONE = 3;

export function tickerEvents(prev: TvRow[] | null, next: TvRow[]): TvTickerEvent[] {
  if (!prev) return [];

  const prevRank = new Map(prev.map((r, i) => [r.username, i]));
  const prevStreak = new Map(prev.map((r) => [r.username, r.streak]));
  const events: TvTickerEvent[] = [];

  next.forEach((row, i) => {
    const was = prevRank.get(row.username);
    if (was !== undefined && i < was) {
      const rival = prev[i].username;
      const rivalNowBelow = next.findIndex((r) => r.username === rival) > i;
      if (rivalNowBelow) {
        events.push({ kind: 'overtook', username: row.username, rival });
      }
    }

    const before = prevStreak.get(row.username) ?? 0;
    if (before < STREAK_MILESTONE && row.streak >= STREAK_MILESTONE) {
      events.push({ kind: 'streak', username: row.username, streak: row.streak });
    }
  });

  return events;
}
