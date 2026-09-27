// Daily-crossword streak — the gentle retention loop a real newspaper solver builds (solve today,
// come back tomorrow). Pure logic + thin localStorage persistence. Dates are "YYYY-MM-DD" UTC.

export interface StreakState {
  /** Consecutive days solved up to and including lastDateISO. */
  current: number;
  /** Best streak ever reached. */
  best: number;
  /** Last solved date, or null if never solved. */
  lastDateISO: string | null;
}

export function emptyStreak(): StreakState {
  return { current: 0, best: 0, lastDateISO: null };
}

/** Whole-day difference b - a for two "YYYY-MM-DD" dates (UTC, calendar-correct across months). */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/**
 * Record a daily solve. Increments on a consecutive day, resets to 1 after a gap, and is a no-op
 * if already counted today. `best` never decreases.
 */
export function recordSolve(prev: StreakState, dateISO: string): StreakState {
  if (prev.lastDateISO === dateISO) return prev; // already counted today

  const consecutive = prev.lastDateISO != null && daysBetween(prev.lastDateISO, dateISO) === 1;
  const current = consecutive ? prev.current + 1 : 1;
  return {
    current,
    best: Math.max(prev.best, current),
    lastDateISO: dateISO,
  };
}

const STORAGE_KEY = 'lexiclash:crossword:streak';

/** Load persisted streak (browser only; safe everywhere). */
export function loadStreak(): StreakState {
  if (typeof window === 'undefined') return emptyStreak();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStreak();
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      current: typeof parsed.current === 'number' ? parsed.current : 0,
      best: typeof parsed.best === 'number' ? parsed.best : 0,
      lastDateISO: typeof parsed.lastDateISO === 'string' ? parsed.lastDateISO : null,
    };
  } catch {
    return emptyStreak();
  }
}

/** Persist + return the streak after recording today's solve. No-op off-browser. */
export function persistSolve(dateISO: string): StreakState {
  const next = recordSolve(loadStreak(), dateISO);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full / unavailable — streak just won't persist */
    }
  }
  return next;
}
