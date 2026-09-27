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
    // Front-loaded so the fun/help arrives in the zone most players actually reach.
    // revealLetterHint: stuck-player recourse, lands right before frozen tiles (L8).
    // bonusDictionary: free-form bonus hunting already works at every level via the
    //   async dict path — this gate only flips on instant inline acceptance + the
    //   explanatory unlock card, so teaching it at L9 (not L25) surfaces a mechanic
    //   that's already live. Keep in sync with mechanic-cards.ts `level`.
    revealLetterHint: n >= 7,
    bonusDictionary: n >= 9,
    revealWordHint: n >= 30,
    lateralSlideGravity: n >= 35,
    multiWordReveal: n >= 40,
  };
}
