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
  /** times each slot was fully filled with a wrong answer */
  slotAttempts: Record<string, number>;
  /** warmth hint per cell, shown at attempt ≥ 2 on wrong fill */
  warmths: Record<string, 'cold' | 'warm' | 'hot'>;
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
    slotAttempts: {},
    warmths: {},
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
  return { ...state, active: { row, col }, dir, checks: {}, warmths: {} };
}

/** Toggle across <-> down at the current cell (only if a slot exists in the other dir). */
export function toggleDir(state: GameState): GameState {
  const other: Direction = state.dir === 'across' ? 'down' : 'across';
  if (!slotAt(state.puzzle, state.active.row, state.active.col, other)) return state;
  return { ...state, dir: other, checks: {}, warmths: {} };
}

/** Drop the check/warmth verdict for a single cell, leaving the rest of the word's intact.
 *  Editing one letter shouldn't wipe the feedback you're using to fix the others. */
function clearCellFeedback(state: GameState, key: string): Pick<GameState, 'checks' | 'warmths'> {
  if (!state.checks[key] && !state.warmths[key]) {
    return { checks: state.checks, warmths: state.warmths };
  }
  const checks = { ...state.checks };
  const warmths = { ...state.warmths };
  delete checks[key];
  delete warmths[key];
  return { checks, warmths };
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

/** Clue order for "next slot": ascending number, across before down (matches nextSlot). */
function slotsInClueOrder(puzzle: CrosswordPuzzle): Slot[] {
  return [...puzzle.slots].sort(
    (a, b) => a.number - b.number || (a.dir === b.dir ? 0 : a.dir === 'across' ? -1 : 1),
  );
}

/** True when every cell of the slot already has an entry. */
function slotFilled(slot: Slot, entries: Record<string, string>): boolean {
  return slot.cells.every((c) => entries[k(c.row, c.col)]);
}

/**
 * First blank cell of the next slot (clue order, wrapping) that still has a
 * blank, skipping `from`. Returns null when nothing is left to fill — the
 * cursor then stays put (the puzzle is solved or all other words are done).
 */
function nextUnfilledSlotStart(
  puzzle: CrosswordPuzzle,
  from: Slot,
  entries: Record<string, string>,
): { row: number; col: number; dir: Direction } | null {
  const order = slotsInClueOrder(puzzle);
  const start = order.findIndex((s) => s.id === from.id);
  for (let step = 1; step <= order.length; step++) {
    const slot = order[(start + step) % order.length];
    if (!slot || slot.id === from.id) continue;
    const blank = slot.cells.find((c) => !entries[k(c.row, c.col)]);
    if (blank) return { row: blank.row, col: blank.col, dir: slot.dir };
  }
  return null;
}

/**
 * Type a letter into the active cell, then move the cursor like a newspaper:
 *  - to the next blank cell still inside the current word, else
 *  - if the word is now complete, hop to the first blank of the next unfilled
 *    clue (flipping direction as needed), else
 *  - to the immediate next cell (mirrors the prior in-slot behavior).
 */
export function inputLetter(state: GameState, raw: string): GameState {
  const letter = normalizeCell(raw, state.puzzle.locale);
  if (!letter) return state;
  const entries = { ...state.entries, [k(state.active.row, state.active.col)]: letter };
  let active = state.active;
  let dir = state.dir;
  const slot = currentSlot(state);
  if (slot) {
    const i = activeIndex(state, slot);
    const after = slot.cells.slice(i + 1);
    const emptyNext = after.find((c) => !entries[k(c.row, c.col)]);
    if (emptyNext) {
      active = { row: emptyNext.row, col: emptyNext.col };
    } else if (slotFilled(slot, entries)) {
      const jump = nextUnfilledSlotStart(state.puzzle, slot, entries);
      if (jump) {
        active = { row: jump.row, col: jump.col };
        dir = jump.dir;
      }
    } else if (after[0]) {
      active = { row: after[0].row, col: after[0].col };
    }
  }
  const next = {
    ...state,
    entries,
    active,
    dir,
    ...clearCellFeedback(state, k(state.active.row, state.active.col)),
  };
  return { ...next, status: recomputeStatus(next) };
}

/** Backspace: clear current if filled, else move back and clear previous. */
export function backspace(state: GameState): GameState {
  const slot = currentSlot(state);
  const here = k(state.active.row, state.active.col);
  if (state.entries[here]) {
    const entries = { ...state.entries };
    delete entries[here];
    return { ...state, entries, status: 'playing', ...clearCellFeedback(state, here) };
  }
  if (slot) {
    const i = activeIndex(state, slot);
    const prev = slot.cells[i - 1];
    if (prev) {
      const prevKey = k(prev.row, prev.col);
      const entries = { ...state.entries };
      delete entries[prevKey];
      return {
        ...state,
        entries,
        active: { row: prev.row, col: prev.col },
        status: 'playing',
        ...clearCellFeedback(state, prevKey),
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
  return { ...state, active: { row: target.row, col: target.col }, checks: {}, warmths: {} };
}

/** Arrow Up/Down: switch to the down word and move, in ONE step.
 *  Previously the view toggled on the first press and only moved on the second,
 *  so navigating vertically took two key presses. */
export function moveVertical(state: GameState, delta: 1 | -1): GameState {
  const facing = state.dir === 'down' ? state : toggleDir(state);
  // No down slot through this cell — toggleDir was a no-op, so don't move sideways.
  if (facing.dir !== 'down') return state;
  return moveInSlot(facing, delta);
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

/** Check filled cells: mark each 'correct' or 'wrong' (transient, no penalty).
 *  At attempt ≥ 2 per slot, colours wrong cells cold/warm/hot by how many letters are correct. */
export function checkAll(state: GameState): GameState {
  const checks: Record<string, 'correct' | 'wrong'> = {};
  for (const cell of state.puzzle.cells) {
    if (cell.block) continue;
    const key = k(cell.row, cell.col);
    const entered = state.entries[key];
    if (!entered) continue;
    checks[key] = entered === cell.solution ? 'correct' : 'wrong';
  }

  const slotAttempts = { ...state.slotAttempts };
  const warmths: Record<string, 'cold' | 'warm' | 'hot'> = {};
  const RANK = { cold: 0, warm: 1, hot: 2 } as const;

  for (const slot of state.puzzle.slots) {
    const filled = slot.cells.every((c) => state.entries[k(c.row, c.col)]);
    if (!filled) continue;
    const correct = slot.cells.filter((c) => checks[k(c.row, c.col)] === 'correct').length;
    if (correct < slot.length) {
      slotAttempts[slot.id] = (slotAttempts[slot.id] ?? 0) + 1;
    }
    if ((slotAttempts[slot.id] ?? 0) >= 2) {
      const ratio = correct / slot.length;
      const level: 'cold' | 'warm' | 'hot' = ratio > 0.6 ? 'hot' : ratio > 0.25 ? 'warm' : 'cold';
      for (const c of slot.cells) {
        const key = k(c.row, c.col);
        if (checks[key] === 'wrong') {
          const existing = warmths[key];
          if (!existing || RANK[level] > RANK[existing]) warmths[key] = level;
        }
      }
    }
  }

  return { ...state, checks, slotAttempts, warmths };
}
