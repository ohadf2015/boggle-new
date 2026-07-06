/**
 * Show-once gate for the per-mode FTUE coach. Pure + storage-injectable so the
 * version logic is unit-tested without a DOM. Mirrors the versioning convention
 * of `useModeFirstSeen` (stored value = the content version the user has seen)
 * so bumping a single mode's content re-shows just that coach — no big-bang
 * migration of the other show-once gates (which would risk resetting flags).
 */

export interface CoachStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Bump to re-show every coach after a meaningful content change. Per-mode
 * granularity is intentionally not exposed — a single knob keeps the gate
 * predictable and avoids accidental resets of unrelated modes.
 */
export const COACH_VERSION = 1;

export type CoachModeKey =
  | 'classic'
  | 'wordHunt'
  | 'wheelRush'
  | 'blast'
  | 'wordTower'
  | 'connections'
  | 'wordCraft'
  | 'crossword'
  | 'sealedBid'
  | 'shiritori'
  | 'adventure';

export function coachStorageKey(mode: CoachModeKey): string {
  return `lc_coach_${mode}`;
}

/**
 * Has the user already seen this mode's coach at >= the requested version?
 * Fails safe to `true` (suppress) when storage is unreadable, so a blocked
 * localStorage never spams the coach on every render.
 */
export function hasSeenCoach(mode: CoachModeKey, version: number, storage: CoachStorage): boolean {
  try {
    const raw = storage.getItem(coachStorageKey(mode));
    if (raw === null) return false;
    const seenVersion = Number(raw);
    if (!Number.isFinite(seenVersion)) return false;
    return seenVersion >= version;
  } catch {
    return true;
  }
}

export function markCoachSeen(mode: CoachModeKey, version: number, storage: CoachStorage): void {
  try {
    storage.setItem(coachStorageKey(mode), String(version));
  } catch {
    /* private mode / quota — ignore, coach simply re-shows next time */
  }
}
