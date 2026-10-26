/**
 * Cached current-season lookup.
 *
 * The season id changes once per *season*, yet rpc/get_current_season_id was
 * firing once per landing SSR request (UR audit 2026-10-26: 4,415 calls/day,
 * UA "node", 110-240/h). Cache it in the server process for 5 minutes via the
 * shared TTL cache (single-flight, fail-open) so DB load is O(1 / 5min) per
 * instance instead of O(requests).
 */

import { cachedWithTtl } from './ttlCache';

export const CURRENT_SEASON_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Returns `loader`'s result, served from in-process memory while fresh.
 * The loader owns the Supabase call (and any fallback); a rejected loader is
 * never cached, so the next caller retries.
 */
export function getCachedCurrentSeasonId(
  loader: () => Promise<number | null>,
): Promise<number | null> {
  return cachedWithTtl('season:current', loader, { ttlMs: CURRENT_SEASON_CACHE_TTL_MS });
}
