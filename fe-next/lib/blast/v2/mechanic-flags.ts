import type { MechanicSet } from './types';

export function mechanicsForLevel(n: number): MechanicSet {
  return {
    coinOverlay: n >= 3,
    reverseSelection: n >= 4,
    // Shuffle is permanently disabled — Blast V2 is a deterministic chain
    // puzzle; a re-roll would let players bypass the placement and break
    // the cascade economy. Letters spread organically via gravity collapse +
    // balanced chain placement (see chain-builder column-height ceiling).
    shuffleButton: false,
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
