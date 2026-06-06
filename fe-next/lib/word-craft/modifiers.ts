import type { ScoreModifierSpec } from './scoring';

/**
 * Per-game WordCraft modifier — rolled once at game start to add variety
 * ("randomness factor"). Kept SCORING-ONLY and LANGUAGE-AGNOSTIC: no
 * vowel/letter-shape rules (Hebrew/Japanese have no Latin vowels) and no
 * bag/rack surgery, so a modifier can never break tile generation. Each maps to
 * a {@link ScoreModifierSpec} applied symmetrically to player + bot scoring.
 */
export type WordCraftModifier = 'none' | 'bingo_bonanza' | 'long_words' | 'rich_letters';

export const WORDCRAFT_MODIFIERS: readonly WordCraftModifier[] = [
  'none',
  'bingo_bonanza',
  'long_words',
  'rich_letters',
];

// Weighted so ~half of games run with a live modifier and the rest are the
// clean baseline. `none` is weighted heavier than any single modifier.
const WEIGHTED: readonly WordCraftModifier[] = [
  'none', 'none', 'none',
  'bingo_bonanza',
  'long_words',
  'rich_letters',
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
    case 'none':
    default:
      return {};
  }
}

export function modifierLabelKey(modifier: WordCraftModifier): string {
  return `wordcraft.modifier.${modifier}`;
}
