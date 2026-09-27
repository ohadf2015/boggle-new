import type { MascotCelebrationKind } from '@/components/mascot/MascotCelebrationVideo';

export type BlastResultKindInput = {
  stars?: number;
  completionReason?: 'mastered' | 'partial';
  bonusWordsFound?: number;
  /** Server-authoritative: did the chest fill and become openable this level? */
  chestReady?: boolean;
};

/**
 * Picks the pre-result mascot fanfare for a Wordfall level completion — or
 * `null` when the outcome is ordinary and a cinematic would over-sell it.
 *
 * The mascot fanfare was previously pulled from the daily results for being
 * "too distracting", so here it is deliberately NOTABLE-ONLY: it fires for the
 * genuine payoff moments (a full chest, a flawless 3-star run, a treasure-hunt
 * bonus haul) and stays out of the way on a routine 1-2 star clear. Order
 * encodes priority — first match wins.
 */
export function pickBlastResultKind(input: BlastResultKindInput): MascotCelebrationKind | null {
  const { stars = 0, bonusWordsFound = 0, chestReady = false } = input;
  if (chestReady) return 'mission-complete'; // the chest is the loop's biggest beat
  if (stars >= 3) return 'bingo'; // flawless run earns the "wow" clip
  if (bonusWordsFound >= 2) return 'explorer'; // treasure hunter found extra words
  return null; // ordinary clear → straight to the card, no cinematic
}
