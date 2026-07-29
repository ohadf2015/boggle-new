// Pure live-progress stats for the crossword. Derived entirely from GameState so it is trivially
// unit-testable and free of React. Drives the header progress readout + the fill bar.

import type { GameState } from './gameState';

export interface CrosswordStats {
  /** Fillable (non-block) cells in the puzzle. */
  totalCells: number;
  /** Non-block cells the player has put any letter into. */
  filledCells: number;
  /** Non-block cells whose entered letter matches the solution. */
  correctCells: number;
  /** Total across + down words. */
  wordsTotal: number;
  /** Words where every cell is correct. */
  wordsSolved: number;
  /** 0..100, based on CORRECT cells (so the bar only reaches 100 when truly solved). */
  percent: number;
}

const k = (row: number, col: number) => `${row},${col}`;

export function crosswordStats(state: GameState): CrosswordStats {
  const { puzzle, entries } = state;
  let totalCells = 0;
  let filledCells = 0;
  let correctCells = 0;

  for (const cell of puzzle.cells) {
    if (cell.block) continue;
    totalCells += 1;
    const entered = entries[k(cell.row, cell.col)];
    if (entered) {
      filledCells += 1;
      if (entered === cell.solution) correctCells += 1;
    }
  }

  let wordsSolved = 0;
  for (const slot of puzzle.slots) {
    const done = slot.cells.every((c) => {
      const entered = entries[k(c.row, c.col)];
      const sol = puzzle.cells.find((x) => x.row === c.row && x.col === c.col)?.solution;
      return !!entered && entered === sol;
    });
    if (done) wordsSolved += 1;
  }

  const percent = totalCells === 0 ? 0 : Math.round((correctCells / totalCells) * 100);

  return {
    totalCells,
    filledCells,
    correctCells,
    wordsTotal: puzzle.slots.length,
    wordsSolved,
    percent,
  };
}
