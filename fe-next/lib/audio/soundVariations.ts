/**
 * Sound variation system — randomly selects from multiple versions
 * of the same sound to prevent ear fatigue and make the game feel alive.
 */

/** Map of base sound keys to their variation file paths */
export const SOUND_VARIATIONS: Record<string, string[]> = {
  tileSelect: [
    '/sounds/variations/tile-select-2.mp3',
    '/sounds/variations/tile-select-3.mp3',
    '/sounds/variations/tile-select-4.mp3',
    '/sounds/variations/tile-select-5.mp3',
  ],
  wordAccepted: [
    '/sounds/variations/word-accepted-2.mp3',
    '/sounds/variations/word-accepted-3.mp3',
    '/sounds/variations/word-accepted-4.mp3',
  ],
  wordRejected: [
    '/sounds/variations/word-rejected-2.mp3',
    '/sounds/variations/word-rejected-3.mp3',
    '/sounds/variations/word-rejected-4.mp3',
  ],
  pathConnect: [
    '/sounds/variations/path-connect-2.mp3',
  ],
  tileAppear: [
    '/sounds/variations/tile-appear-2.mp3',
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
  // mascotCheer is registered for callers using the mascot voice line variants
  mascotCheer: [
    '/sounds/variations/mascot-cheer-2.mp3',
  ],
  legendaryWord: [
    '/sounds/variations/legendary-word-2.mp3',
    '/sounds/variations/legendary-word-3.mp3',
  ],
  rareWord: [
    '/sounds/variations/rare-word-2.mp3',
  ],
  perfectWord: [
    '/sounds/variations/perfect-word-2.mp3',
  ],
  powerUp: [
    '/sounds/variations/power-up-2.mp3',
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

/** Number of bespoke combo level sound files in /sounds/combo-levels/. */
export const COMBO_LEVEL_COUNT = 25;

/** Resolve combo-level source path. Levels above COMBO_LEVEL_COUNT clamp to the max. */
export function comboLevelSrc(level: number): string {
  const clamped = Math.max(1, Math.min(level, COMBO_LEVEL_COUNT));
  return `/sounds/combo-levels/combo-level-${clamped}.mp3`;
}

/**
 * Resolve word-length feedback sound path. Word lengths 3..7 use bespoke files,
 * 8+ collapse to the celebratory long-word file. Lengths under 3 fall through
 * to caller (game logic shouldn't accept <3-letter words).
 */
export function wordLengthSrc(length: number): string {
  if (length >= 8) return '/sounds/word-length/word-length-8plus.mp3';
  const clamped = Math.max(3, Math.min(length, 7));
  return `/sounds/word-length/word-length-${clamped}.mp3`;
}
