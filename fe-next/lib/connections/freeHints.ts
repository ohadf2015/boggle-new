export const FREE_HINTS_PER_DAY = 2;
export const FREE_HINTS_KEY = 'connections:freeHints';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Stored as "<YYYY-MM-DD>:<used>" — a stale or corrupted value reads as 0 used. */
function usedToday(): number {
  if (!isBrowser()) return 0;
  const raw = window.localStorage.getItem(FREE_HINTS_KEY);
  if (!raw) return 0;
  const [day, used] = raw.split(':');
  if (day !== todayKey()) return 0;
  const n = Number.parseInt(used ?? '', 10);
  return Number.isInteger(n) && n > 0 ? Math.min(n, FREE_HINTS_PER_DAY) : 0;
}

export function freeHintsRemaining(): number {
  return FREE_HINTS_PER_DAY - usedToday();
}

/** Consume one free hint; returns the remaining count. */
export function consumeFreeHint(): number {
  const used = Math.min(usedToday() + 1, FREE_HINTS_PER_DAY);
  if (isBrowser()) {
    window.localStorage.setItem(FREE_HINTS_KEY, `${todayKey()}:${used}`);
  }
  return FREE_HINTS_PER_DAY - used;
}
