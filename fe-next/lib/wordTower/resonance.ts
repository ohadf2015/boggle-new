/**
 * Word Tower — resonance ping schedule (pure).
 *
 * When a word lands (its base brick thuds into the joint), the impact should
 * RING down through the already-settled tower below: each lower tile gives a
 * tiny delayed scale-pop, a wave travelling from the new joint toward the base.
 * Reads as a real structure absorbing a load — gorgeous on a spectator/replay
 * loop and zero scoring impact (the bumps are cosmetic scale tweens).
 *
 * Pure here: just the ordered (pos, delayMs) firing schedule. The scene maps it
 * onto `bumpScale` for tiles strictly BELOW the commit (those above don't exist
 * yet / are mid-swivel, so we never fight the placement animation).
 */

/** Delay between successive tiles in the wave (ms). */
export const RESONANCE_STEP_MS = 55;
/** Cap how many tiles ring, so a 1000 m tower doesn't schedule hundreds of tweens. */
export const RESONANCE_MAX_TILES = 14;

export interface ResonanceHit {
  pos: number;
  delayMs: number;
}

/**
 * Build the downward ripple from a just-committed base brick at `basePos`
 * through the settled tiles in `tilePositions`. Nearest-below rings first; the
 * wave is capped at {@link RESONANCE_MAX_TILES}. Tiles at or above `basePos` are
 * excluded (they belong to the landing word / don't exist yet).
 */
export function resonanceSchedule(
  basePos: number,
  tilePositions: ReadonlyArray<number>,
  stepMs: number = RESONANCE_STEP_MS,
): ResonanceHit[] {
  return tilePositions
    .filter((p) => p < basePos)
    .sort((a, b) => b - a) // nearest below the joint first
    .slice(0, RESONANCE_MAX_TILES)
    .map((pos, i) => ({ pos, delayMs: i * stepMs }));
}
