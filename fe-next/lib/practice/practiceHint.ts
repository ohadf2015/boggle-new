/**
 * Pure logic for the practice on-screen helper (FTUE).
 *
 * Drives a gentle escalation: do nothing while the player is active, nudge a
 * player who hasn't even started dragging, and after a longer stall reveal the
 * first tile of the (known) riddle answer — an always-correct hint, since the
 * answer is guaranteed embedded on the board.
 */

/** Idle (ms) with zero drag attempts before we nudge "drag to spell". */
export const HINT_NUDGE_MS = 6000;
/** Idle (ms) before we point at the riddle answer's first tile. */
export const HINT_REVEAL_MS = 14000;

export type HintStage = 'none' | 'nudge' | 'reveal-tile';

export interface HintInput {
  /** ms since the last meaningful interaction (drag start / word found). */
  idleMs: number;
  /** number of drag attempts made so far. */
  drags: number;
  /** number of valid words found so far. */
  wordsFound: number;
  /**
   * Whether a riddle answer exists to spotlight. Languages without a clue pool
   * (sv/ja/es) have none — we must NOT escalate to 'reveal-tile' there, or the
   * helper promises a glowing tile that never glows. Defaults to true.
   */
  hasTarget?: boolean;
}

export function nextHintStage({
  idleMs,
  drags,
  wordsFound,
  hasTarget = true,
}: HintInput): HintStage {
  // Once they've scored, they don't need help — get out of the way.
  if (wordsFound > 0) return 'none';
  // Long stall → spotlight the answer's first tile, but ONLY if one exists.
  if (idleMs >= HINT_REVEAL_MS && hasTarget) return 'reveal-tile';
  // Hasn't started at all → teach the core gesture.
  if (drags === 0 && idleMs >= HINT_NUDGE_MS) return 'nudge';
  return 'none';
}

export interface Cell {
  row: number;
  col: number;
}

const DIRS: ReadonlyArray<[number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function norm(ch: string): string {
  return ch.toUpperCase();
}

/**
 * Returns the starting cell of an 8-directional adjacent path that spells
 * `word` on `grid`, or null if the word can't be traced. Mirrors the real
 * board adjacency rules so the hint always points at a genuinely valid start.
 */
export function firstCellOf(word: string, grid: string[][], _language: string): Cell | null {
  const target = [...word].map(norm);
  if (target.length === 0 || grid.length === 0) return null;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const dfs = (r: number, c: number, idx: number, seen: Set<string>): boolean => {
    if (idx === target.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const key = `${r},${c}`;
    if (seen.has(key)) return false;
    if (norm(grid[r]?.[c] ?? '') !== target[idx]) return false;
    seen.add(key);
    if (idx === target.length - 1) return true;
    for (const [dr, dc] of DIRS) {
      if (dfs(r + dr, c + dc, idx + 1, seen)) return true;
    }
    seen.delete(key);
    return false;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (norm(grid[r]?.[c] ?? '') === target[0] && dfs(r, c, 0, new Set())) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}
