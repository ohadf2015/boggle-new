/**
 * Lifetime completed-games counter for this device.
 *
 * Exists as its own leaf module for one reason: reader/writer drift. The key
 * used to be a bare string literal repeated across three components while the
 * only writer was a hook nobody mounted — so the counter sat at '0' and every
 * gate reading it (PWA install banner, iOS Add-to-Home-Screen hint, email
 * capture) was silently unreachable for the app's entire lifetime.
 *
 * Everything now shares these symbols, so a reader can't drift from the writer.
 * Keep this module dependency-light: it is imported by both `growthTracking`
 * (heavy) and lazily-mounted UI, and must not drag the former into the latter.
 */
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/storageHelpers';

export const GAMES_COMPLETED_COUNT_KEY = 'games_completed_count';

/**
 * Completed games on this device, or 0 when absent/corrupt/unavailable.
 *
 * Never returns NaN — a NaN would compare false against every `>=` threshold,
 * reproducing the exact silent-never-shows failure this module exists to kill.
 */
export function readGamesCompletedCount(): number {
  if (typeof window === 'undefined') return 0;
  const parsed = parseInt(getFromLocalStorage(GAMES_COMPLETED_COUNT_KEY) ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Bump the counter by one.
 *
 * Single caller by design: `trackGameEnd`'s completed branch — the one funnel
 * every mode already routes completion through. Do NOT call this per-mode or
 * from a component; that is how the count drifts from `total_games_played`.
 */
export function incrementGamesCompletedCount(): void {
  if (typeof window === 'undefined') return;
  saveToLocalStorage(GAMES_COMPLETED_COUNT_KEY, String(readGamesCompletedCount() + 1));
}
