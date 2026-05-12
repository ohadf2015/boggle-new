import type { MechanicSet } from './types';

export function mechanicsForLevel(n: number): MechanicSet {
  return {
    coinOverlay: n >= 3,
    reverseSelection: n >= 4,
    shuffleButton: n >= 5,
    gemTiles: n >= 6,
    frozenTiles: n >= 8,
    cascadeWords: n >= 12,
    doubleBonusTile: n >= 15,
    revealLetterHint: n >= 18,
    bonusDictionary: n >= 25,
    revealWordHint: n >= 30,
    lateralSlideGravity: n >= 35,
    multiWordReveal: n >= 40,
  };
}
