/**
 * Sound variation system — randomly selects from multiple versions
 * of the same sound to prevent ear fatigue and make the game feel alive.
 */

/** Map of base sound keys to their variation file paths */
export const SOUND_VARIATIONS: Record<string, string[]> = {
  tileSelect: [
    '/sounds/variations/tile-select-2.mp3',
    '/sounds/variations/tile-select-3.mp3',
  ],
  wordAccepted: [
    '/sounds/variations/word-accepted-2.mp3',
    '/sounds/variations/word-accepted-3.mp3',
  ],
  wordRejected: [
    '/sounds/variations/word-rejected-2.mp3',
    '/sounds/variations/word-rejected-3.mp3',
  ],
  combo: [
    '/sounds/variations/combo-2.mp3',
    '/sounds/variations/combo-3.mp3',
  ],
  coinCollect: [
    '/sounds/variations/coin-collect-2.mp3',
  ],
  chestOpen: [
    '/sounds/variations/chest-open-2.mp3',
  ],
  questComplete: [
    '/sounds/variations/quest-complete-2.mp3',
  ],
  boardShuffle: [
    '/sounds/variations/board-shuffle-2.mp3',
  ],
  longWordBonus: [
    '/sounds/variations/long-word-bonus-2.mp3',
  ],
  bossEntrance: [
    '/sounds/variations/boss-entrance-2.mp3',
  ],
  streakFire: [
    '/sounds/variations/streak-fire-2.mp3',
  ],
  tierPromotion: [
    '/sounds/variations/tier-promotion-2.mp3',
  ],
};

/**
 * Pick a random sound source: either the base sound or one of its variations.
 * Returns the base source if no variations exist.
 */
export function pickVariant(baseKey: string, baseSrc: string): string {
  const variants = SOUND_VARIATIONS[baseKey];
  if (!variants || variants.length === 0) return baseSrc;

  // Include base sound in the pool so it's equally likely
  const pool = [baseSrc, ...variants];
  return pool[Math.floor(Math.random() * pool.length)];
}
