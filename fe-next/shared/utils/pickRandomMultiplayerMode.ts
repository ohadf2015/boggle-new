/**
 * pickRandomMultiplayerMode
 *
 * Resolves a "random" Quick Play selection into one of the live multiplayer
 * game modes. Shared between client (to preview which mode they'll get) and
 * server (authoritative pick on room creation).
 *
 * The RNG is injectable so tests and server-side determinism can seed it.
 */

import type { GameMode } from '@/shared/types/game';

/**
 * The three live multiplayer modes that Quick Play rotates through.
 * Ordered for test determinism — do not reorder without updating tests.
 */
export const MULTIPLAYER_MODES: readonly GameMode[] = [
  'classic',
  'blast',
  'word-hunt',
] as const;

/**
 * Pick a random multiplayer GameMode.
 *
 * @param rng - Returns a float in [0, 1). Defaults to Math.random. Injectable
 *              so tests can pin the result.
 * @param exclude - Modes to skip (e.g., if the player lacks blast_access).
 *                  If every mode is excluded, falls back to 'classic' rather
 *                  than throwing — Quick Play should never error out.
 */
export function pickRandomMultiplayerMode(
  rng: () => number = Math.random,
  exclude: readonly GameMode[] = [],
): GameMode {
  const pool = MULTIPLAYER_MODES.filter((mode) => !exclude.includes(mode));
  if (pool.length === 0) return 'classic';
  const index = Math.floor(rng() * pool.length);
  // Clamp: rng() === 1 (non-standard but defensive) would over-index.
  const safeIndex = Math.min(index, pool.length - 1);
  return pool[safeIndex];
}
