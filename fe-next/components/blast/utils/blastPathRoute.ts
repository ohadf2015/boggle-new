/**
 * blastPathRoute — pure helpers for the A→B path_route mechanic.
 *
 * Two responsibilities:
 *  1. resolvePathRouteCells(grid) — at wave init, pick a start+end cell pair
 *     such that ≥1 valid word can be spelled traversing both. Used to
 *     materialize a path_route objective against the actual board.
 *  2. evaluatePathRouteHit(lastWordCells, objective) — at every word submit,
 *     decide whether the path satisfies the objective (includes start+end
 *     and any required must-pass cells).
 *
 * Why this lives in its own file: the seeder is pure-grid-agnostic; the
 * solver is grid-dependent. Splitting them keeps `blastWaveConfig.ts` from
 * dragging in solver imports.
 */

import type { LetterGrid, BlastObjective } from '../types';

interface Cell { row: number; col: number; }

/**
 * Returns true if any contiguous-adjacent (8-direction) traversal of the grid
 * spells a word of `minLen+` letters that touches BOTH startCell and endCell
 * without revisiting any cell.
 *
 * Pure DFS; no dictionary lookup — caller passes a `checkWord` predicate so
 * dictionary loading stays at the call site.
 */
export function hasWordPathBetween(
  grid: LetterGrid,
  start: Cell,
  end: Cell,
  checkWord: (word: string) => boolean,
  minLen = 4,
  maxLen = 8,
): boolean {
  const rows = grid.length;
  if (rows === 0) return false;
  const cols = grid[0].length;
  if (cols === 0) return false;
  if (start.row === end.row && start.col === end.col) return false;

  const startLetter = grid[start.row]?.[start.col];
  if (!startLetter) return false;

  const visited = new Set<string>();
  const path: Cell[] = [{ row: start.row, col: start.col }];
  visited.add(`${start.row},${start.col}`);

  return dfs(grid, rows, cols, path, visited, end, startLetter.toUpperCase(), checkWord, minLen, maxLen);
}

function dfs(
  grid: LetterGrid,
  rows: number,
  cols: number,
  path: Cell[],
  visited: Set<string>,
  end: Cell,
  word: string,
  checkWord: (word: string) => boolean,
  minLen: number,
  maxLen: number,
): boolean {
  const cur = path[path.length - 1];
  // If we've reached end and accumulated word is valid + ≥minLen, success.
  if (cur.row === end.row && cur.col === end.col && word.length >= minLen) {
    if (checkWord(word.toLowerCase())) return true;
  }
  if (word.length >= maxLen) return false;

  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (const [dr, dc] of dirs) {
    const nr = cur.row + dr;
    const nc = cur.col + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const k = `${nr},${nc}`;
    if (visited.has(k)) continue;
    const letter = grid[nr]?.[nc];
    if (!letter) continue;

    visited.add(k);
    path.push({ row: nr, col: nc });
    if (dfs(grid, rows, cols, path, visited, end, word + letter.toUpperCase(), checkWord, minLen, maxLen)) {
      return true;
    }
    path.pop();
    visited.delete(k);
  }
  return false;
}

/**
 * Pick two cells (start + end) that have ≥1 valid word path between them.
 *
 * Strategy: prefer corner-anchored pairs for visual readability (top-left ↔
 * bottom-right, top-right ↔ bottom-left). If neither pair has a valid path
 * within budget, scan a deterministic shuffle of candidates. Returns null
 * if no pair found within `maxAttempts`.
 *
 * Determinism: shuffles deterministically by `seed` so tests + replay are
 * reproducible.
 */
export function resolvePathRouteCells(
  grid: LetterGrid,
  checkWord: (word: string) => boolean,
  options: { seed?: number; minLen?: number; maxLen?: number; maxAttempts?: number } = {},
): { startCell: Cell; endCell: Cell } | null {
  const rows = grid.length;
  if (rows < 3) return null;
  const cols = grid[0].length;
  if (cols < 3) return null;

  const minLen = options.minLen ?? 4;
  const maxLen = options.maxLen ?? 8;
  const maxAttempts = options.maxAttempts ?? 24;
  const seed = options.seed ?? 0;

  // Candidate pairs — corners first, then edges, then deterministic-shuffled
  // interior cells. Both cells need to be far enough apart for the route to
  // feel like a meaningful spatial puzzle (Chebyshev distance ≥ 2).
  const corners: [Cell, Cell][] = [
    [{ row: 0, col: 0 }, { row: rows - 1, col: cols - 1 }],
    [{ row: 0, col: cols - 1 }, { row: rows - 1, col: 0 }],
    [{ row: 0, col: 0 }, { row: rows - 1, col: 0 }],
    [{ row: 0, col: cols - 1 }, { row: rows - 1, col: cols - 1 }],
  ];

  let attempts = 0;
  for (const [a, b] of corners) {
    if (attempts++ >= maxAttempts) break;
    if (hasWordPathBetween(grid, a, b, checkWord, minLen, maxLen)) {
      return { startCell: a, endCell: b };
    }
  }

  // Fallback: walk all cells in deterministic shuffled order, pair adjacent
  // diagonals separated by ≥2 Chebyshev distance.
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ row: r, col: c });

  // Mulberry-32 deterministic shuffle
  let s = (seed | 0) || 1;
  const rand = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 0xffffffff); };
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  for (let i = 0; i < cells.length && attempts < maxAttempts; i++) {
    for (let j = i + 1; j < cells.length && attempts < maxAttempts; j++) {
      const a = cells[i], b = cells[j];
      const cheb = Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
      if (cheb < 2) continue;
      attempts++;
      if (hasWordPathBetween(grid, a, b, checkWord, minLen, maxLen)) {
        return { startCell: a, endCell: b };
      }
    }
  }

  return null;
}

/**
 * Win-check: did the just-submitted word's path satisfy the path_route goal?
 * Pure — caller passes the cells touched by the latest valid word.
 *
 * Rules:
 *  - Path must include startCell.
 *  - Path must include endCell.
 *  - If mustPassCells provided, every entry must be present in the path.
 */
export function evaluatePathRouteHit(
  lastWordCells: Array<Cell> | undefined,
  objective: BlastObjective,
): boolean {
  if (!lastWordCells || lastWordCells.length < 2) return false;
  if (objective.type !== 'path_route') return false;
  if (!objective.startCell || !objective.endCell) return false;

  const set = new Set(lastWordCells.map(c => `${c.row},${c.col}`));
  const startKey = `${objective.startCell.row},${objective.startCell.col}`;
  const endKey = `${objective.endCell.row},${objective.endCell.col}`;
  if (!set.has(startKey)) return false;
  if (!set.has(endKey)) return false;

  if (objective.mustPassCells && objective.mustPassCells.length > 0) {
    for (const cell of objective.mustPassCells) {
      if (!set.has(`${cell.row},${cell.col}`)) return false;
    }
  }

  return true;
}

/**
 * Pick a single target cell for tile_sniper. Constraint: ≥1 valid word
 * (≥minLen letters) must include this cell in its path. Prefers centerward
 * cells (interior of grid) so the marker reads as "go for the middle, not
 * the edge". Deterministic via seed.
 */
export function resolveTileSniperCell(
  grid: LetterGrid,
  checkWord: (word: string) => boolean,
  options: { seed?: number; minLen?: number; maxLen?: number; maxAttempts?: number } = {},
): { targetCell: Cell } | null {
  const rows = grid.length;
  if (rows < 3) return null;
  const cols = grid[0].length;
  if (cols < 3) return null;

  const minLen = options.minLen ?? 4;
  const maxLen = options.maxLen ?? 7;
  const maxAttempts = options.maxAttempts ?? 12;
  const seed = options.seed ?? 0;

  // Build interior-first candidate list: rank by distance from corners
  const candidates: Cell[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      candidates.push({ row: r, col: c });
    }
  }
  // Add edge cells as fallback
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        candidates.push({ row: r, col: c });
      }
    }
  }

  // Deterministic shuffle within each tier
  let s = (seed | 0) || 1;
  const rand = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 0xffffffff); };
  // Shuffle interior chunk only — edges stay last so we prefer interior picks
  const interiorCount = (rows - 2) * (cols - 2);
  for (let i = interiorCount - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  let attempts = 0;
  for (const target of candidates) {
    if (attempts++ >= maxAttempts) break;
    if (cellHasValidWord(grid, target, checkWord, minLen, maxLen)) {
      return { targetCell: target };
    }
  }

  return null;
}

/**
 * Helper: returns true if any word path of length ≥minLen passing through
 * `target` exists in the grid, AND that word is in the dictionary.
 */
function cellHasValidWord(
  grid: LetterGrid,
  target: Cell,
  checkWord: (word: string) => boolean,
  minLen: number,
  maxLen: number,
): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  // BFS from any starting cell. Prune by visited per traversal. Heavy-ish
  // but maxLen ≤ 7 with deg-8 → bounded.
  // Strategy: try every starting cell; DFS up to maxLen; if path passes
  // through target AND len ≥ minLen, check dictionary.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const visited = new Set<string>([`${r},${c}`]);
      if (sniperDfs(grid, rows, cols, { row: r, col: c }, visited, target,
                    grid[r][c].toUpperCase(), false, checkWord, minLen, maxLen)) {
        return true;
      }
    }
  }
  return false;
}

function sniperDfs(
  grid: LetterGrid,
  rows: number,
  cols: number,
  cur: Cell,
  visited: Set<string>,
  target: Cell,
  word: string,
  passedTarget: boolean,
  checkWord: (word: string) => boolean,
  minLen: number,
  maxLen: number,
): boolean {
  const onTarget = passedTarget || (cur.row === target.row && cur.col === target.col);
  if (onTarget && word.length >= minLen && checkWord(word.toLowerCase())) return true;
  if (word.length >= maxLen) return false;

  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (const [dr, dc] of dirs) {
    const nr = cur.row + dr;
    const nc = cur.col + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const k = `${nr},${nc}`;
    if (visited.has(k)) continue;
    const letter = grid[nr]?.[nc];
    if (!letter) continue;
    visited.add(k);
    if (sniperDfs(grid, rows, cols, { row: nr, col: nc }, visited, target,
                  word + letter.toUpperCase(), onTarget, checkWord, minLen, maxLen)) {
      return true;
    }
    visited.delete(k);
  }
  return false;
}

/**
 * Win-check for tile_sniper: did the just-submitted word touch the marked cell?
 */
export function evaluateTileSniperHit(
  lastWordCells: Array<Cell> | undefined,
  objective: BlastObjective,
): boolean {
  if (!lastWordCells || lastWordCells.length === 0) return false;
  if (objective.type !== 'tile_sniper') return false;
  if (!objective.targetCell) return false;
  return lastWordCells.some(
    c => c.row === objective.targetCell!.row && c.col === objective.targetCell!.col,
  );
}
