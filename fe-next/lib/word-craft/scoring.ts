import type { ScoringTile } from './types';

export const BINGO_BONUS = 50;
export const BINGO_THRESHOLD = 7;

/**
 * Per-game scoring modifier, expressed as plain numbers so this module stays a
 * dependency-free leaf (the modifier→spec mapping lives in modifiers.ts). The
 * SAME spec is fed to both the player's submit path and the bot's ranking, so
 * difficulty stays symmetric — neither side scores under different rules.
 */
export interface ScoreModifierSpec {
  /** Override the flat bingo bonus (default {@link BINGO_BONUS}). */
  bingoBonus?: number;
  /** Words with at least this many tiles earn {@link ScoreModifierSpec.longWordBonus}. */
  longWordThreshold?: number;
  longWordBonus?: number;
  /** Tiles whose base value is ≥ this get their base value multiplied. */
  richLetterThreshold?: number;
  richLetterMult?: number;
}

export function scoreWord(tiles: readonly ScoringTile[], spec?: ScoreModifierSpec): number {
  let wordTotal = 0;
  let multiplier = 1;
  for (const tile of tiles) {
    let base = tile.value;
    // rich_letters: boost rare/high-value tiles BEFORE letter premiums stack.
    if (spec?.richLetterMult && spec.richLetterThreshold !== undefined && base >= spec.richLetterThreshold) {
      base *= spec.richLetterMult;
    }
    let letterScore = base;
    if (tile.premium === 'DL') letterScore *= 2;
    else if (tile.premium === 'TL') letterScore *= 3;
    wordTotal += letterScore;
    if (tile.premium === 'DW') multiplier *= 2;
    else if (tile.premium === 'TW') multiplier *= 3;
  }
  let total = wordTotal * multiplier;
  // long_words: flat bonus for reaching a length threshold.
  if (spec?.longWordBonus && tiles.length >= (spec.longWordThreshold ?? 5)) {
    total += spec.longWordBonus;
  }
  return total;
}

export function scoreTurn(
  words: readonly (readonly ScoringTile[])[],
  tilesPlacedThisTurn: number,
  spec?: ScoreModifierSpec,
): number {
  const total = words.reduce((sum, word) => sum + scoreWord(word, spec), 0);
  if (tilesPlacedThisTurn < BINGO_THRESHOLD) return total;
  return total + (spec?.bingoBonus ?? BINGO_BONUS);
}

export function scoreWordChips(tiles: readonly ScoringTile[]): { chips: number; baseMult: number } {
  let chips = 0;
  let baseMult = 1;
  for (const tile of tiles) {
    let letterScore = tile.value;
    if (tile.premium === 'DL') letterScore *= 2;
    else if (tile.premium === 'TL') letterScore *= 3;
    chips += letterScore;
    if (tile.premium === 'DW') baseMult *= 2;
    else if (tile.premium === 'TW') baseMult *= 3;
  }
  return { chips, baseMult };
}
