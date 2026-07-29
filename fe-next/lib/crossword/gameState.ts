// Pure crossword interaction state. The DOM/React layer is a thin wrapper over these immutable
// transitions, so the tricky navigation/auto-advance/reveal logic is fully unit-testable.

import { isSolved, normalizeCell } from './answer';
import type { CrosswordPuzzle, Direction, Slot } from './types';

export interface GameState {
  puzzle: CrosswordPuzzle;
  entries: Record<string, string>; // "r,c" -> letter (normalized)
  active: { row: number; col: number };
  dir: Direction;
  status: 'playing' | 'solved';
  revealed: string[]; // "r,c" cells filled by a hint
  /** transient check result per cell: 'correct' | 'wrong'. Cleared on next input. */
  checks: Record<string, 'correct' | 'wrong'>;
}

const k = (row: number, col: number) => `${row},${col}`;

export function cellAt(puzzle: CrosswordPuzzle, row: number, col: number) {
  return puzzle.cells.find((c) => c.row === row && c.col === col);
}

export function isBlock(puzzle: CrosswordPuzzle, row: number, col: number): boolean {
  const c = cellAt(puzzle, row, col);
  return !c || c.block;
}

/** The slot in `dir` that contains (row,col), or null. */
export function slotAt(
  puzzle: CrosswordPuzzle,
  row: number,
  col: number,
  dir: Direction,
): Slot | null {
  return (
    puzzle.slots.find(
      (s) => s.dir === dir && s.cells.some((c) => c.row === row && c.col === col),
    ) ?? null
  );
}

/** First fillable cell of the lowest-numbered across slot (fallback: any non-block). */
function firstCell(puzzle: CrosswordPuzzle): { row: number; col: number; dir: Direction } {
  const across = puzzle.slots.filter((s) => s.dir === 'across').sort((a, b) => a.number - b.number);
  if (across[0]) return { row: across[0].row, col: across[0].col, dir: 'across' };
  const down = puzzle.slots.filter((s) => s.dir === 'down').sort((a, b) => a.number - b.number);
  if (down[0]) return { row: down[0].row, col: down[0].col, dir: 'down' };
  const c = puzzle.cells.find((x) => !x.block)!;
  return { row: c.row, col: c.col, dir: 'across' };
}

export function initGame(
  puzzle: CrosswordPuzzle,
  entries: Record<string, string> = {},
  revealed: string[] = [],
): GameState {
  const start = firstCell(puzzle);
  const status = isSolved(puzzle, entries) ? 'solved' : 'playing';
  return {
    puzzle,
    entries: { ...entries },
    active: { row: start.row, col: start.col },
    dir: start.dir,
    status,
    revealed: [...revealed],
    checks: {},
  };
}

/** Move active focus to a cell (ignored if it's a block). Keeps current dir if possible. */
export function focusCell(state: GameState, row: number, col: number): GameState {
  if (isBlock(state.puzzle, row, col)) return state;
  let dir = state.dir;
  // Signature crossword tap: re-clicking the already-active cell flips across<->down
  // (when the other direction has a slot here). Lets a single tap pick the word you mean.
  const isReclick = state.active.row === row && state.active.col === col;
  if (isReclick) {
    return toggleDir(state);
  }
  // If the current direction has no slot through this cell, switch to the other.
  if (!slotAt(state.puzzle, row, col, dir)) {
    dir = dir === 'across' ? 'down' : 'across';
  }
  return { ...state, active: { row, col }, dir, checks: {} };
}

/** Toggle across <-> down at the current cell (only if a slot exists in the other dir). */
export function toggleDir(state: GameState): GameState {
  const other: Direction = state.dir === 'across' ? 'down' : 'across';
  if (!slotAt(state.puzzle, state.active.row, state.active.col, other)) return state;
  return { ...state, dir: other, checks: {} };
}

export function currentSlot(state: GameState): Slot | null {
  return slotAt(state.puzzle, state.active.row, state.active.col, state.dir);
}

/** Index of active cell within the current slot, or -1. */
function activeIndex(state: GameState, slot: Slot): number {
  return slot.cells.findIndex((c) => c.row === state.active.row && c.col === state.active.col);
}

function recomputeStatus(state: GameState): 'playing' | 'solved' {
  return isSolved(state.puzzle, state.entries) ? 'solved' : 'playing';
}

/** Type a letter into the active cell and auto-advance to the next empty cell in the slot. */
export function inputLetter(state: GameState, raw: string): GameState {
  const letter = normalizeCell(raw, state.puzzle.locale);
  if (!letter) return state;
  const entries = { ...state.entries, [k(state.active.row, state.active.col)]: letter };
  let next = state;
  const slot = currentSlot(state);
  let active = state.active;
  if (slot) {
    const i = activeIndex(state, slot);
    // advance to the next empty cell after i, else next cell, else stay.
    const after = slot.cells.slice(i + 1);
    const emptyNext = after.find((c) => !entries[k(c.row, c.col)]);
    const target = emptyNext ?? after[0];
    if (target) active = { row: target.row, col: target.col };
  }
  next = { ...state, entries, active, checks: {} };
  return { ...next, status: recomputeStatus(next) };
}

/** Backspace: clear current if filled, else move back and clear previous. */
export function backspace(state: GameState): GameState {
  const slot = currentSlot(state);
  const here = k(state.active.row, state.active.col);
  if (state.entries[here]) {
    const entries = { ...state.entries };
    delete entries[here];
    return { ...state, entries, status: 'playing', checks: {} };
  }
  if (slot) {
    const i = activeIndex(state, slot);
    const prev = slot.cells[i - 1];
    if (prev) {
      const entries = { ...state.entries };
      delete entries[k(prev.row, prev.col)];
      return {
        ...state,
        entries,
        active: { row: prev.row, col: prev.col },
        status: 'playing',
        checks: {},
      };
    }
  }
  return state;
}

/** Move within the current slot by delta (+1 next, -1 prev), clamped to slot bounds. */
export function moveInSlot(state: GameState, delta: 1 | -1): GameState {
  const slot = currentSlot(state);
  if (!slot) return state;
  const i = activeIndex(state, slot);
  const target = slot.cells[i + delta];
  if (!target) return state;
  return { ...state, active: { row: target.row, col: target.col }, checks: {} };
}

/** Reveal the active cell's solution (hint). */
export function revealCell(state: GameState): GameState {
  const cell = cellAt(state.puzzle, state.active.row, state.active.col);
  if (!cell || cell.block) return state;
  const key = k(cell.row, cell.col);
  const entries = { ...state.entries, [key]: cell.solution };
  const revealed = state.revealed.includes(key) ? state.revealed : [...state.revealed, key];
  const next = { ...state, entries, revealed, checks: {} };
  return { ...next, status: recomputeStatus(next) };
}

/** Reveal every cell in the current slot. */
export function revealWord(state: GameState): GameState {
  const slot = currentSlot(state);
  if (!slot) return state;
  const entries = { ...state.entries };
  const revealed = [...state.revealed];
  for (const c of slot.cells) {
    const cell = cellAt(state.puzzle, c.row, c.col)!;
    const key = k(c.row, c.col);
    entries[key] = cell.solution;
    if (!revealed.includes(key)) revealed.push(key);
  }
  const next = { ...state, entries, revealed, checks: {} };
  return { ...next, status: recomputeStatus(next) };
}

/** Check filled cells: mark each 'correct' or 'wrong' (transient, no penalty). */
export function checkAll(state: GameState): GameState {
  const checks: Record<string, 'correct' | 'wrong'> = {};
  for (const cell of state.puzzle.cells) {
    if (cell.block) continue;
    const key = k(cell.row, cell.col);
    const entered = state.entries[key];
    if (!entered) continue;
    checks[key] = entered === cell.solution ? 'correct' : 'wrong';
  }
  return { ...state, checks };
}
