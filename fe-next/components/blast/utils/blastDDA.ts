/**
 * Invisible Assist DDA (Dynamic Difficulty Adjustment) — PSYC-04
 *
 * Silently adjusts special tile spawn probability based on player performance:
 * - After 3+ consecutive failed words: boost spawn chance (+15%)
 * - After 80%+ success rate over last 5 words: normalize spawn chance (-10%)
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
 *   +0.15  if consecutiveFails >= 3  (boost for struggling players)
 *   -0.10  if successRate > 0.8 over last 5 results  (normalize for dominant players)
 *   0      otherwise
 */
export function getDDASpawnModifier(state: BlastDDAState): number {
  // Boost takes priority — struggling player needs immediate help
  if (state.consecutiveFails >= 3) {
    return DDA_BOOST_PERCENT;
  }

  // Only evaluate success-rate normalization once we have 5 results
  if (state.recentResults.length >= 5) {
    const successCount = state.recentResults.filter(r => r === 'success').length;
    const successRate = successCount / state.recentResults.length;
    if (successRate > 0.8) {
      return DDA_REDUCE_PERCENT;
    }
  }

  return 0;
}
