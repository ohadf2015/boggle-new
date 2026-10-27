const KEY = 'wordcraft.daily.v1';
const DAY_MS = 86_400_000;

export interface DailyState {
  lastDate: string | null;
  streak: number;
  best: number;
}

const EMPTY: DailyState = { lastDate: null, streak: 0, best: 0 };

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Everyone on the same UTC day gets the same board. */
export function dailySeed(date: string): number {
  return Number(date.replaceAll('-', '')) % 1_000_000;
}

function dayIndex(date: string): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

export function advanceDaily(state: DailyState, today: string): DailyState {
  if (state.lastDate === today) return state;
  const continues = state.lastDate !== null && dayIndex(today) - dayIndex(state.lastDate) === 1;
  const streak = continues ? state.streak + 1 : 1;
  return { lastDate: today, streak, best: Math.max(state.best, streak) };
}

/** A streak not played yesterday or today reads as 0 (it is already broken). */
export function readDaily(today: string, read: () => string | null = defaultRead): DailyState {
  try {
    const raw = read();
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<DailyState>;
    const lastDate = typeof p.lastDate === 'string' ? p.lastDate : null;
    const best = Number.isFinite(p.best) ? Number(p.best) : 0;
    const streak = Number.isFinite(p.streak) ? Number(p.streak) : 0;
    const alive = lastDate !== null && dayIndex(today) - dayIndex(lastDate) <= 1;
    return { lastDate, streak: alive ? streak : 0, best };
  } catch {
    return EMPTY;
  }
}

export function hasPlayedDaily(today: string): boolean {
  return readDaily(today).lastDate === today;
}

export function recordDaily(today: string): DailyState {
  const next = advanceDaily(readDaily(today), today);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode: the streak just won't persist
  }
  return next;
}

function defaultRead(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(KEY);
}
