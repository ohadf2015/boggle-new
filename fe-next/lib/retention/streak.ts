/**
 * Global daily retention streak — the cross-mode habit loop (D1 driver).
 *
 * One streak across every game mode: any completed game (SP, MP, daily,
 * practice, blast, ...) counts as "played today". Missing a day normally
 * breaks the streak, but each player holds ONE streak freeze per ISO week
 * (Duolingo-style): miss exactly one day with a freeze in inventory and the
 * freeze is consumed instead of the streak resetting. Freezes replenish every
 * Monday (ISO week rollover), use-it-or-lose-it — no banking.
 *
 * Pure date math + thin localStorage persistence + a tiny subscriber store so
 * the header badge re-renders the moment a game completes. Dates are
 * "YYYY-MM-DD" UTC (matches the crossword/wordTower streak conventions).
 */

export interface StreakFreezeState {
  /** ISO week key ("2026-W32") the current freeze belongs to. */
  weekKey: string;
  /** True while this week's freeze is still in inventory. */
  available: boolean;
}

export interface RetentionStreakState {
  /** Consecutive days played up to and including lastPlayedDate. */
  current: number;
  /** Best streak ever reached. Never decreases. */
  best: number;
  /** Last played date "YYYY-MM-DD" (UTC), or null if never played. */
  lastPlayedDate: string | null;
  freeze: StreakFreezeState;
}

export type StreakPlayOutcome =
  | 'already-counted' // second game on the same day — no-op
  | 'continued'       // played the day after lastPlayedDate → streak + 1
  | 'started'         // first ever play, or restart after a break → streak = 1
  | 'freeze-consumed' // missed exactly one day, weekly freeze ate the gap
  | 'broken';         // gap too large (or no freeze) — streak reset to 1

export interface StreakPlayResult {
  state: RetentionStreakState;
  outcome: StreakPlayOutcome;
  /** Streak length before this record (for streak_broken payloads). */
  previousStreak: number;
}

export const EMPTY_RETENTION_STREAK: RetentionStreakState = {
  current: 0,
  best: 0,
  lastPlayedDate: null,
  freeze: { weekKey: '', available: true },
};

/** Today's UTC date stamp. */
export function utcTodayKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole-day difference b - a for two "YYYY-MM-DD" dates (UTC, calendar-safe). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/**
 * ISO week key ("YYYY-Www") for a "YYYY-MM-DD" date. Freeze inventory is
 * keyed on this so it refreshes automatically on Monday rollover.
 */
export function isoWeekKey(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Shift to the Thursday of the current week — ISO 8601 week-numbering rule.
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Record a play for `todayISO`. Idempotent within a day. Applies the weekly
 * freeze when the player missed exactly one day; resets on longer gaps.
 * Pure — persistence lives in {@link recordRetentionPlay}.
 */
export function applyPlay(
  prev: RetentionStreakState,
  todayISO: string,
): StreakPlayResult {
  if (prev.lastPlayedDate === todayISO) {
    return { state: prev, outcome: 'already-counted', previousStreak: prev.current };
  }

  const weekKey = isoWeekKey(todayISO);
  // Weekly refresh: a new ISO week restocks the freeze.
  const freezeAvailable = prev.freeze.weekKey !== weekKey ? true : prev.freeze.available;
  const previousStreak = prev.current;

  const gap = prev.lastPlayedDate != null ? daysBetween(prev.lastPlayedDate, todayISO) : null;

  let outcome: StreakPlayOutcome;
  let current: number;
  let freezeLeft = freezeAvailable;

  if (gap === null) {
    outcome = 'started';
    current = 1;
  } else if (gap === 1) {
    outcome = previousStreak > 0 ? 'continued' : 'started';
    current = previousStreak + 1;
  } else if (gap === 2 && freezeAvailable) {
    // Exactly one missed day and this week's freeze is in inventory.
    outcome = 'freeze-consumed';
    current = previousStreak + 1;
    freezeLeft = false;
  } else {
    outcome = 'broken';
    current = 1;
  }

  return {
    state: {
      current,
      best: Math.max(prev.best, current),
      lastPlayedDate: todayISO,
      freeze: { weekKey, available: freezeLeft },
    },
    outcome,
    previousStreak,
  };
}

// ---------------------------------------------------------------------------
// Persistence + subscriber store
// ---------------------------------------------------------------------------

export const RETENTION_STREAK_LS_KEY = 'lexiclash:retention:streak:v1';

function readStorage(): RetentionStreakState {
  if (typeof window === 'undefined') return { ...EMPTY_RETENTION_STREAK };
  try {
    const raw = window.localStorage.getItem(RETENTION_STREAK_LS_KEY);
    if (!raw) return { ...EMPTY_RETENTION_STREAK };
    const parsed = JSON.parse(raw) as Partial<RetentionStreakState>;
    return {
      current: typeof parsed.current === 'number' ? parsed.current : 0,
      best: typeof parsed.best === 'number' ? parsed.best : 0,
      lastPlayedDate: typeof parsed.lastPlayedDate === 'string' ? parsed.lastPlayedDate : null,
      freeze: {
        weekKey: typeof parsed.freeze?.weekKey === 'string' ? parsed.freeze.weekKey : '',
        available: parsed.freeze?.available !== false,
      },
    };
  } catch {
    return { ...EMPTY_RETENTION_STREAK };
  }
}

function writeStorage(state: RetentionStreakState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RETENTION_STREAK_LS_KEY, JSON.stringify(state));
  } catch {
    /* storage full / unavailable — streak just won't persist */
  }
}

let cache: RetentionStreakState | null = null;
const subscribers = new Set<() => void>();

function notifyAll(): void {
  subscribers.forEach((fn) => fn());
}

/**
 * Current persisted streak (cached; referentially stable between writes so
 * useSyncExternalStore doesn't loop).
 */
export function getRetentionStreak(): RetentionStreakState {
  if (cache === null) cache = readStorage();
  return cache;
}

/**
 * Record today's play: apply the streak math, persist, notify subscribers.
 * Returns the result so callers can emit analytics with the outcome.
 */
export function recordRetentionPlay(todayISO: string = utcTodayKey()): StreakPlayResult {
  const result = applyPlay(getRetentionStreak(), todayISO);
  if (result.outcome !== 'already-counted') {
    cache = result.state;
    writeStorage(result.state);
    notifyAll();
  }
  return result;
}

/** The streak to SHOW right now — 0 once the streak has lapsed (>1 day since
 *  last play and no freeze covering the gap). */
export function displayStreak(state: RetentionStreakState, todayISO: string = utcTodayKey()): number {
  if (state.lastPlayedDate == null || state.current === 0) return 0;
  const gap = daysBetween(state.lastPlayedDate, todayISO);
  if (gap <= 1) return state.current;
  // One missed day is still salvageable while a freeze sits in inventory.
  if (gap === 2) {
    const weekKey = isoWeekKey(todayISO);
    const freezeAvailable = state.freeze.weekKey !== weekKey ? true : state.freeze.available;
    if (freezeAvailable) return state.current;
  }
  return 0;
}

export function subscribeRetentionStreak(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Test-only: drop the in-memory cache so the next read hits localStorage. */
export function __resetRetentionStreakCache(): void {
  cache = null;
}
