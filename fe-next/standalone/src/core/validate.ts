/**
 * Authoritative client-side word validation for the standalone build.
 *
 * Ported verbatim from fe-next/utils/clientWordValidator.ts (isWordOnBoard +
 * 8-directional adjacency DFS — "same logic as backend"). In the standalone
 * build there is NO server, so this is the single source of truth for "is this
 * traced word actually a legal path on the board". EN-only: normalize = lowercase.
 */

export type LetterGrid = string[][];

/** EN normalization: a word/cell is compared case-insensitively. */
export function normalizeWord(word: string): string {
  return String(word ?? '').trim().toLowerCase();
}

/** Map each normalized letter → list of [row,col] positions (fast path start). */
function makePositionsMap(board: LetterGrid): Map<string, [number, number][]> {
  const positions = new Map<string, [number, number][]>();
  if (!board || board.length === 0) return positions;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[0].length; j++) {
      const ch = normalizeWord(String(board[i][j]));
      if (!positions.has(ch)) positions.set(ch, []);
      positions.get(ch)!.push([i, j]);
    }
  }
  return positions;
}

const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function searchWord(
  board: LetterGrid,
  word: string,
  row: number,
  col: number,
  index: number,
  visited: Set<string>,
): boolean {
  if (index === word.length) return true;
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) return false;
  const cellKey = `${row},${col}`;
  if (visited.has(cellKey)) return false;
  if (normalizeWord(board[row][col]) !== word[index]) return false;

  visited.add(cellKey);
  for (const [dx, dy] of DIRS) {
    if (searchWord(board, word, row + dx, col + dy, index + 1, visited)) {
      visited.delete(cellKey);
      return true;
    }
  }
  visited.delete(cellKey);
  return false;
}

/**
 * True iff `word` can be traced on `board` as a contiguous 8-adjacent path with
 * no cell reused. Pass a prebuilt positions map to avoid rebuilding per call.
 */
export function isWordOnBoard(
  word: string,
  board: LetterGrid | null,
  positionsMap?: Map<string, [number, number][]>,
): boolean {
  if (!board || !word || board.length === 0) return false;
  const w = normalizeWord(word);
  if (w.length < 2) return false;
  const posMap = positionsMap || makePositionsMap(board);
  const starts = posMap.get(w[0]) || [];
  for (const [r, c] of starts) {
    if (searchWord(board, w, r, c, 0, new Set())) return true;
  }
  return false;
}

export { makePositionsMap as buildPositionsMap };
