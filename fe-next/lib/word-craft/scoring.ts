import type { ScoringTile } from './types';

export const BINGO_BONUS = 50;
export const BINGO_THRESHOLD = 7;

export function scoreWord(tiles: readonly ScoringTile[]): number {
  let wordTotal = 0;
  let multiplier = 1;
  for (const tile of tiles) {
    let letterScore = tile.value;
    if (tile.premium === 'DL') letterScore *= 2;
    else if (tile.premium === 'TL') letterScore *= 3;
    wordTotal += letterScore;
    if (tile.premium === 'DW') multiplier *= 2;
    else if (tile.premium === 'TW') multiplier *= 3;
  }
  return wordTotal * multiplier;
}

export function scoreTurn(words: readonly (readonly ScoringTile[])[], tilesPlacedThisTurn: number): number {
  const total = words.reduce((sum, word) => sum + scoreWord(word), 0);
  return tilesPlacedThisTurn >= BINGO_THRESHOLD ? total + BINGO_BONUS : total;
}
