/**
 * Word Tower — daily clue gate (#6).
 *
 * One clue reveal is FREE each UTC day; every clue after that costs a rewarded
 * ad. We persist only a single "free clue used today" flag per date in
 * localStorage — the ad path is not tracked (each ad watch is its own cost).
 */

const key = (dateKey: string) => `wt-clue-free-used-${dateKey}`;

/** Has today's ONE free clue already been spent? */
export function freeClueUsedToday(dateKey: string): boolean {
  try {
    return localStorage.getItem(key(dateKey)) === '1';
  } catch {
    return false;
  }
}

/** Mark today's free clue as spent (idempotent). */
export function markFreeClueUsed(dateKey: string): void {
  try {
    localStorage.setItem(key(dateKey), '1');
  } catch {
    /* best-effort */
  }
}
