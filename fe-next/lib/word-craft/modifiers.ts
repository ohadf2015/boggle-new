import type { ScoreModifierSpec } from './scoring';

/**
 * Per-game WordCraft modifier — rolled once at game start to add variety
 * ("randomness factor"). Kept SCORING-ONLY and LANGUAGE-AGNOSTIC: no
 * vowel/letter-shape rules (Hebrew/Japanese have no Latin vowels) and no
 * bag/rack surgery, so a modifier can never break tile generation. Each maps to
 * a {@link ScoreModifierSpec} applied symmetrically to player + bot scoring.
 */
export type WordCraftModifier =
  | 'none'
  | 'bingo_bonanza'
  | 'long_words'
  | 'rich_letters'
  | 'land_grab'
  | 'quick_draw'
  | 'golden_tiles'
  | 'star_squares';

export const WORDCRAFT_MODIFIERS: readonly WordCraftModifier[] = [
  'none',
  'bingo_bonanza',
  'long_words',
  'rich_letters',
  'land_grab',
  'quick_draw',
  'golden_tiles',
  'star_squares',
];

// Weighted so ~half of games run with a live modifier and the rest are the
// clean baseline. `none` is weighted heavier than any single modifier.
// land_grab is the marquee Conquest twist (chain-capture), so it gets a little
// extra weight than the quiet scoring modifiers.
const WEIGHTED: readonly WordCraftModifier[] = [
  'none', 'none', 'none',
  'bingo_bonanza',
  'long_words',
  'rich_letters',
  'land_grab', 'land_grab',
  'quick_draw',
  'golden_tiles',
  'star_squares', 'star_squares',
];

// Same small deterministic PRNG family used by the tile bag — seeded so a game
// (and its play-again, which passes a fresh seed) re-rolls predictably.
function hashSeed(seed: number): number {
  let a = (seed >>> 0) + 0x9e3779b9;
  a = Math.imul(a ^ (a >>> 16), 0x21f0aaad);
  a = Math.imul(a ^ (a >>> 15), 0x735a2d97);
  return (a ^ (a >>> 15)) >>> 0;
}

export function rollModifier(seed: number): WordCraftModifier {
  const idx = hashSeed(seed) % WEIGHTED.length;
  return WEIGHTED[idx];
}

export function toScoreModifier(modifier: WordCraftModifier): ScoreModifierSpec {
  switch (modifier) {
    case 'bingo_bonanza':
      return { bingoBonus: 90 };
    case 'long_words':
      return { longWordThreshold: 5, longWordBonus: 15 };
    case 'rich_letters':
      return { richLetterThreshold: 4, richLetterMult: 2 };
    case 'land_grab':
    case 'quick_draw':
    case 'golden_tiles':
    case 'star_squares':
      // Pure rule modifiers — no scoring change (see modifierCaptureSpread,
      // modifierRackSize, isGoldenTile).
      return {};
    case 'none':
    default:
      return {};
  }
}

/**
 * quick_draw: a lighter 5-tile rack — fewer choices per turn, faster play.
 * Symmetric (bot draws from the same rack size).
 */
export function modifierRackSize(modifier: WordCraftModifier): number {
  return modifier === 'quick_draw' ? 5 : 7;
}

/**
 * golden_tiles: a deterministic ~1-in-6 of tile ids are golden. Placing a
 * golden tile captures the opponent cells in its orthogonal ring (threaded via
 * ResolveCapturesOptions.ringCenters). Pure function of (seed, tileId) so the
 * rack UI, board UI, commit logic, and bot ranking all agree with zero state
 * plumbing.
 */
export function isGoldenTile(seed: number, tileId: string): boolean {
  let h = hashSeed(seed);
  for (let i = 0; i < tileId.length; i++) {
    h = Math.imul(h ^ tileId.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h % 6 === 0;
}

export interface Cell2 {
  row: number;
  col: number;
}

/**
 * star_squares: four fixed star cells, one per board quadrant, seeded so both
 * seats, the board UI and bot ranking agree. Landing a tile on a star ring-captures
 * the opponent cells around it (same rule as a golden tile), so the stars become
 * the contested ground of the match.
 */
export function starCells(seed: number, size: number): Cell2[] {
  const mid = Math.floor(size / 2);
  const ranges: Array<[number, number]> = [
    [1, Math.max(1, mid - 1)],
    [mid, Math.max(mid, size - 2)],
  ];
  const out: Cell2[] = [];
  for (let q = 0; q < 4; q++) {
    const [r0, r1] = ranges[q >> 1];
    const [c0, c1] = ranges[q & 1];
    const h = hashSeed(seed ^ Math.imul(q + 1, 0x9e3779b1));
    out.push({ row: r0 + (h % (r1 - r0 + 1)), col: c0 + ((h >>> 8) % (c1 - c0 + 1)) });
  }
  return out;
}

/** Cells whose placed tile ring-captures this turn, for the active modifier (undefined = none). */
export function modifierRingCenters(
  modifier: WordCraftModifier,
  seed: number,
  boardSize: number,
  placements: ReadonlyArray<{ row: number; col: number; rackTileId: string }>,
): Cell2[] | undefined {
  if (modifier === 'golden_tiles') {
    return placements.filter((p) => isGoldenTile(seed, p.rackTileId)).map((p) => ({ row: p.row, col: p.col }));
  }
  if (modifier === 'star_squares') {
    const stars = new Set(starCells(seed, boardSize).map((c) => `${c.row},${c.col}`));
    return placements.filter((p) => stars.has(`${p.row},${p.col}`)).map((p) => ({ row: p.row, col: p.col }));
  }
  return undefined;
}

/**
 * land_grab changes a capture RULE rather than scoring: a captured cell also
 * flips the opponent cells immediately around it (one ring). Threaded into
 * {@link resolveCaptures} via its `spreadToNeighbors` option for both seats.
 */
export function modifierCaptureSpread(modifier: WordCraftModifier): boolean {
  return modifier === 'land_grab';
}

export function modifierLabelKey(modifier: WordCraftModifier): string {
  return `wordcraft.modifier.${modifier}`;
}
