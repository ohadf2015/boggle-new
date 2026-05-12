/**
 * Invisible Assist DDA (Dynamic Difficulty Adjustment) — PSYC-04
 *
 * Silently adjusts special tile spawn probability based on player performance:
 * - After 2+ consecutive failed words: boost spawn chance (+15%)
 * - Success-rate penalty removed in singleplayer (always returns 0)
 * - Otherwise: no modification
 *
 * The player is never shown any indication of DDA activity.
 * State is pure/immutable — no side effects.
 */

export const DDA_BOOST_PERCENT = 0.15;
export const DDA_REDUCE_PERCENT = -0.10;

/** Recent word result */
export type DDAResult = 'success' | 'fail';

/** DDA state machine state */
export interface BlastDDAState {
  /** Rolling window of last 5 word results (oldest first) */
  recentResults: DDAResult[];
  /** Number of consecutive failed words (reset on any success) */
  consecutiveFails: number;
}

/** Create fresh DDA state — call at start of each game/wave */
export function createDDAState(): BlastDDAState {
  return {
    recentResults: [],
    consecutiveFails: 0,
  };
}

/**
 * Update DDA state with a new word result.
 * Returns a new state object (immutable).
 */
export function updateDDA(state: BlastDDAState, result: DDAResult): BlastDDAState {
  // Append result, keep only last 5
  const recentResults: DDAResult[] = [...state.recentResults, result].slice(-5);

  // Update consecutive fails counter
  const consecutiveFails = result === 'fail'
    ? state.consecutiveFails + 1
    : 0;

  return { recentResults, consecutiveFails };
}

/**
 * Compute spawn probability modifier based on current DDA state.
 *
 * Returns:
 *   +0.15  if consecutiveFails >= 2  (boost for struggling players)
 *   0      otherwise (success-rate penalty removed)
 */
export function getDDASpawnModifier(state: BlastDDAState): number {
  // Boost — trigger sooner so struggling players get help faster
  if (state.consecutiveFails >= 2) {
    return DDA_BOOST_PERCENT;
  }

  return 0;
}

/**
 * Whether the DDA spawn boost is active. Pure derivation of state — used by
 * the engine to expose a visible "Lucky Boost" HUD chip so players can see
 * when the game is helping them. Sprint 1 surfaces previously-hidden state.
 */
export function isDDABoostActive(state: BlastDDAState): boolean {
  return state.consecutiveFails >= 2;
}
