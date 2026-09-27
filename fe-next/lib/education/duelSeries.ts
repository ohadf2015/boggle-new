/**
 * Best-of-3 duel series tally (device-local).
 *
 * A rematch that forgets the previous game is a replay button. This keeps a
 * running head-to-head for one opponent + lesson pair so the reveal screen can
 * say "game 2 of 3, you're 1-0 up" and the loser of game 1 has a reason to tap
 * REMATCH.
 *
 * Storage is localStorage on purpose: it is a session flourish, not a record.
 * Every read is defensive — a missing, blocked or corrupted store reads as a
 * fresh 0-0 series rather than throwing (recurring-pitfalls Class 4).
 */

/** Wins needed to take the series. */
export const DUEL_SERIES_TARGET = 2;

/** Total games after which a deadlocked series is called a tie. */
export const DUEL_SERIES_MAX_GAMES = 3;

export interface DuelSeries {
  /** Games this student has won. */
  mine: number;
  /** Games the opponent has won. */
  theirs: number;
  /** Games played, draws included. */
  games: number;
}

export type DuelSeriesOutcome = 'win' | 'loss' | 'draw';

export type DuelSeriesStatus = 'open' | 'won' | 'lost' | 'tied';

const EMPTY: DuelSeries = { mine: 0, theirs: 0, games: 0 };

export function duelSeriesKey(opponentId: string, lessonId: string): string {
  return `lexiclash:duel-series:${opponentId}:${lessonId}`;
}

function isSeries(value: unknown): value is DuelSeries {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.mine === 'number' &&
    typeof candidate.theirs === 'number' &&
    typeof candidate.games === 'number'
  );
}

export function readDuelSeries(key: string): DuelSeries {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...EMPTY };
    const parsed: unknown = JSON.parse(raw);
    if (!isSeries(parsed)) return { ...EMPTY };
    return { mine: parsed.mine, theirs: parsed.theirs, games: parsed.games };
  } catch {
    return { ...EMPTY };
  }
}

export function recordDuelSeriesResult(key: string, outcome: DuelSeriesOutcome): DuelSeries {
  const current = readDuelSeries(key);
  const next: DuelSeries = {
    mine: current.mine + (outcome === 'win' ? 1 : 0),
    theirs: current.theirs + (outcome === 'loss' ? 1 : 0),
    games: current.games + 1,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // private mode / blocked storage — the tally is cosmetic, never fatal
    }
  }

  return next;
}

export function duelSeriesStatus(series: DuelSeries): DuelSeriesStatus {
  if (series.mine >= DUEL_SERIES_TARGET) return 'won';
  if (series.theirs >= DUEL_SERIES_TARGET) return 'lost';
  if (series.games >= DUEL_SERIES_MAX_GAMES) {
    if (series.mine > series.theirs) return 'won';
    if (series.theirs > series.mine) return 'lost';
    return 'tied';
  }
  return 'open';
}

export function clearDuelSeries(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
