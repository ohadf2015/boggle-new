/**
 * Near-Miss Calculator for "Almost Found" Words
 *
 * Detects words the player nearly found by analyzing their trace paths
 * against valid word paths on the board.
 */

export interface BoardCell {
  letter: string;
  row: number;
  col: number;
}

export interface ValidWordWithPath {
  word: string;
  score: number;
  path: { row: number; col: number }[];
}

export interface PlayerTrace {
  path: { row: number; col: number }[];
}

export interface AlmostFoundWord {
  word: string;
  score: number;
  matchPercentage: number;
  wordPath: { row: number; col: number }[];
  playerTracePath: { row: number; col: number }[];
}

interface CalculateParams {
  board: BoardCell[][];
  validWords: ValidWordWithPath[];
  playerTraces: PlayerTrace[];
  foundWords: string[];
  /** Minimum match percentage to qualify (default: 50) */
  minMatchPercentage?: number;
}

function cellsEqual(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Check if trace is a prefix of the word path
 */
function isPrefixMatch(trace: { row: number; col: number }[], wordPath: { row: number; col: number }[]): boolean {
  if (trace.length === 0 || trace.length > wordPath.length) return false;
  return trace.every((cell, i) => cellsEqual(cell, wordPath[i]));
}

/**
 * Count how many cells in the trace match cells in the word path (order-independent)
 */
function countMatchingCells(trace: { row: number; col: number }[], wordPath: { row: number; col: number }[]): number {
  let count = 0;
  const used = new Set<number>();
  for (const traceCell of trace) {
    for (let i = 0; i < wordPath.length; i++) {
      if (!used.has(i) && cellsEqual(traceCell, wordPath[i])) {
        count++;
        used.add(i);
        break;
      }
    }
  }
  return count;
}

/**
 * Calculate words the player almost found based on their trace paths.
 *
 * A word qualifies if:
 * - The player's trace is a prefix of the word's path, OR
 * - The player traced 50%+ (configurable) of the word's path letters
 */
export function calculateAlmostFoundWords(params: CalculateParams): AlmostFoundWord[] {
  const { validWords, playerTraces, foundWords, minMatchPercentage = 50 } = params;

  if (playerTraces.length === 0) return [];

  const foundSet = new Set(foundWords.map(w => w.toUpperCase()));
  const bestMatches = new Map<string, AlmostFoundWord>();

  for (const validWord of validWords) {
    if (foundSet.has(validWord.word.toUpperCase())) continue;

    for (const trace of playerTraces) {
      if (trace.path.length === 0) continue;

      let matchPercent = 0;

      if (isPrefixMatch(trace.path, validWord.path)) {
        matchPercent = (trace.path.length / validWord.path.length) * 100;
      } else {
        const matching = countMatchingCells(trace.path, validWord.path);
        matchPercent = (matching / validWord.path.length) * 100;
      }

      if (matchPercent < minMatchPercentage) continue;

      const existing = bestMatches.get(validWord.word);
      if (!existing || matchPercent > existing.matchPercentage) {
        bestMatches.set(validWord.word, {
          word: validWord.word,
          score: validWord.score,
          matchPercentage: Math.round(matchPercent * 100) / 100,
          wordPath: validWord.path,
          playerTracePath: trace.path,
        });
      }
    }
  }

  return Array.from(bestMatches.values()).sort((a, b) => b.matchPercentage - a.matchPercentage);
}
