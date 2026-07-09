/**
 * Word Tower — rare sky sightings (pure picker).
 *
 * High up, the backdrop very occasionally produces a drifting "sighting" —
 * cosmic whale, satellite, shooting star, blimp, aurora ribbon, constellation.
 * Awe / mystery, not cute (only the brand mascot is kawaii). These are pure
 * spectacle: ephemeral DOM overlays that never touch score, so the roll can be
 * non-deterministic `Math.random()` at the call site — the leaderboard is blind
 * to them.
 *
 * This module decides ONLY *whether* and *what* to show for a given roll and
 * altitude; the component owns the drift animation + lifecycle.
 */

export type SightingKind =
  | 'whale'
  | 'satellite'
  | 'shootingStar'
  | 'blimp'
  | 'auroraRibbon'
  | 'constellation';

/** Transparent PNG / asset path per sighting (whale art is intentionally
 *  majestic-cosmic, not kawaii). Other kinds are drawn in CSS by the component. */
export const SIGHTING_ASSET: Partial<Record<SightingKind, string>> = {
  whale: '/images/word-tower/wt-spacewhale.png',
};

/** Don't show sightings until the sky is genuinely exotic (stratosphere+). */
export const SIGHTING_MIN_ALT_M = 120;
/** Whale is reserved for the deep biomes (nebula / galaxy). */
export const SIGHTING_WHALE_MIN_ALT_M = 320;
/** Per-roll probability a sighting appears (caller rolls every few seconds). */
export const SIGHTING_CHANCE = 0.18;

/**
 * Choose a sighting for a roll in [0,1) at a viewed altitude, or null. Returns
 * null below {@link SIGHTING_MIN_ALT_M} or when the roll misses the chance gate.
 * The whale only appears once high enough; lower exotic altitudes get the
 * cheaper satellite / shooting-star / blimp / ribbon / constellation glints.
 */
export function pickSighting(roll01: number, viewAltM: number): SightingKind | null {
  if ((viewAltM ?? 0) < SIGHTING_MIN_ALT_M) return null;
  if (roll01 >= SIGHTING_CHANCE) return null;
  // Re-use the sub-gate position within the chance window to pick the kind.
  const sub = roll01 / SIGHTING_CHANCE; // [0,1)
  if (viewAltM >= SIGHTING_WHALE_MIN_ALT_M && sub < 0.28) return 'whale';
  if (sub < 0.42) return 'shootingStar';
  if (sub < 0.55) return 'satellite';
  if (sub < 0.7) return 'blimp';
  if (sub < 0.85) return 'auroraRibbon';
  return 'constellation';
}
