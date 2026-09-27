/**
 * Show-once gate for the first-time "trace in ANY direction" tutorial.
 *
 * Pure + storage-injectable so the version logic is unit-tested without a DOM.
 * Deliberately GLOBAL (one flag, not per-mode): the "adjacent tiles connect in
 * all 8 directions, diagonals included" rule is identical in every grid mode, so
 * a brand-new player only needs to learn it once. Re-showing a blocking, timed
 * overlay each time they open a new mode would be hostile.
 *
 * Mirrors the versioning convention of `modeCoachStore` (stored value = the
 * content version the user has seen) so bumping the content re-shows it once.
 */

export interface DirectionsTutorialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Bump to re-show the tutorial after a meaningful content change. */
export const DIRECTIONS_TUTORIAL_VERSION = 1;

export const DIRECTIONS_TUTORIAL_STORAGE_KEY = 'lc_directions_tutorial';

/**
 * Has the user already seen the tutorial at >= the requested version?
 * Fails safe to `true` (suppress) when storage is unreadable, so a blocked
 * localStorage never re-pops a blocking overlay on every render.
 */
export function hasSeenDirectionsTutorial(
  version: number,
  storage: DirectionsTutorialStorage,
): boolean {
  try {
    const raw = storage.getItem(DIRECTIONS_TUTORIAL_STORAGE_KEY);
    if (raw === null) return false;
    const seenVersion = Number(raw);
    if (!Number.isFinite(seenVersion)) return false;
    return seenVersion >= version;
  } catch {
    return true;
  }
}

export function markDirectionsTutorialSeen(
  version: number,
  storage: DirectionsTutorialStorage,
): void {
  try {
    storage.setItem(DIRECTIONS_TUTORIAL_STORAGE_KEY, String(version));
  } catch {
    /* private mode / quota — ignore, tutorial simply re-shows next time */
  }
}
