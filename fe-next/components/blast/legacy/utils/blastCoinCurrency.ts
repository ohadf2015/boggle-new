/** Coins banked per coin tile cleared, on top of the score-based payout. */
export const COIN_TILE_CURRENCY = 3;

/** `multiplier` is the wave theme's coin multiplier (2 on a coin-rush wave). */
export function blastCoinDelta(wordScore: number, coinTilesCleared: number, multiplier = 1): number {
  return (Math.max(1, Math.round(wordScore / 10)) + coinTilesCleared * COIN_TILE_CURRENCY) * multiplier;
}
