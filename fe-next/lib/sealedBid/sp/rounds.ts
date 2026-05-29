/**
 * Curated Sealed Bid rounds. Each rack is a real 7-letter anagram where a long
 * common word is the "obvious" bid the bot will make — picking it clashes, so
 * the player is nudged toward a less-obvious (but still valid) word. Every
 * `botPick` is formable from its `rack` (see sbEngine.canFormFromRack).
 *
 * English-only by design: this is an admin preview surface. The pool is read
 * directly by the page; the pure engine takes whatever rounds it is handed.
 */
import type { SbRound } from './sbEngine';

export const SEALED_BID_ROUNDS: SbRound[] = [
  { rack: 'TRAINED', botPick: 'TRAIN' },
  { rack: 'GARDENS', botPick: 'GARDEN' },
  { rack: 'MASTERY', botPick: 'MASTER' },
  { rack: 'PLANTER', botPick: 'PLANT' },
  { rack: 'BREATHS', botPick: 'BREATH' },
  { rack: 'CARPETS', botPick: 'CARPET' },
  { rack: 'STORMED', botPick: 'STORM' },
  { rack: 'FLOWERS', botPick: 'FLOWER' },
];

/** Rounds per game session. */
export const ROUNDS_PER_GAME = 5;

/** Pick `count` distinct rounds at random (page-side; tests pass rounds directly). */
export function pickRounds(count: number = ROUNDS_PER_GAME): SbRound[] {
  const shuffled = [...SEALED_BID_ROUNDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
