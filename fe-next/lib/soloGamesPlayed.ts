/**
 * How many solo rounds this device has finished.
 * Read on the results screen BEFORE incrementing, so the rotation for the
 * round just played sees the pre-increment count (0 on the first results).
 */

export const SOLO_GAMES_PLAYED_KEY = 'lexiclash:soloGamesPlayed:v1';

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

export function getSoloGamesPlayed(): number {
  if (!canUseStorage()) return 0;
  try {
    const raw = window.localStorage.getItem(SOLO_GAMES_PLAYED_KEY);
    if (raw == null || raw === '') return 0;
    const parsed = JSON.parse(raw) as unknown;
    const n = typeof parsed === 'number' ? parsed : Number.NaN;
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  } catch {
    return 0;
  }
}

/** Writes the new count and returns it. Returns 0 when storage is unavailable. */
export function incrementSoloGamesPlayed(): number {
  if (!canUseStorage()) return 0;
  const next = getSoloGamesPlayed() + 1;
  try {
    window.localStorage.setItem(SOLO_GAMES_PLAYED_KEY, JSON.stringify(next));
  } catch {
    return getSoloGamesPlayed();
  }
  return next;
}
