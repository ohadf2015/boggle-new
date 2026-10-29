import type { BlastTileState } from '../types';
import { hasValidWords } from './blastDeadEndDetector';
import { buildDeadEndGrid } from './blastDeadEndGrid';

const MAX_REROLLS = 40;

function hasAdjacentLivePair(tiles: BlastTileState[][]): boolean {
  for (const row of tiles) {
    for (const t of row) {
      if (t.isCleared) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if ((dr || dc) && tiles[t.row + dr]?.[t.col + dc] && !tiles[t.row + dr][t.col + dc].isCleared) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Re-roll the live letters until at least one word can be played. Returns null
 * when no re-roll can help (live tiles too scattered, or the bounded attempts ran
 * out) so the caller ends the wave instead of letting the player shuffle forever.
 */
export function shuffleForPlayableWord(
  grid: string[][],
  tiles: BlastTileState[][],
  checkWord: (word: string) => boolean,
  minWordLength: number,
  nextLetter: () => string,
  foundWords: ReadonlySet<string> = new Set(),
): string[][] | null {
  if (minWordLength > 1 && !hasAdjacentLivePair(tiles)) return null;
  for (let attempt = 0; attempt < MAX_REROLLS; attempt++) {
    const candidate = grid.map((row, r) => row.map((cell, c) => (tiles[r]?.[c]?.isCleared ? cell : nextLetter())));
    if (hasValidWords(buildDeadEndGrid(candidate, tiles), '', checkWord, new Set(foundWords), minWordLength)) return candidate;
  }
  return null;
}
