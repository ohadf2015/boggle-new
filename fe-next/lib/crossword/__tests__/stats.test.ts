import { describe, it, expect } from 'vitest';
import { crosswordStats } from '../stats';
import { initGame } from '../gameState';
import type { CrosswordPuzzle } from '../types';

// Tiny 2x2 all-fillable puzzle:
//   C A
//   A T
// Across: A1 = "ca" (row 0), A2 = "at" (row 1)
// Down:   D1 = "ca" (col 0), D3 = "at" (col 1)
function makePuzzle(): CrosswordPuzzle {
  const cell = (row: number, col: number, solution: string, number: number | null) => ({
    row,
    col,
    block: false,
    solution,
    number,
  });
  return {
    id: 'test-2x2',
    locale: 'en',
    size: 2,
    rtl: false,
    cells: [cell(0, 0, 'c', 1), cell(0, 1, 'a', 2), cell(1, 0, 'a', 3), cell(1, 1, 't', null)],
    slots: [
      { id: 'A1', dir: 'across', number: 1, row: 0, col: 0, length: 2, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], answer: 'ca', clue: '' },
      { id: 'A3', dir: 'across', number: 3, row: 1, col: 0, length: 2, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }], answer: 'at', clue: '' },
      { id: 'D1', dir: 'down', number: 1, row: 0, col: 0, length: 2, cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }], answer: 'ca', clue: '' },
      { id: 'D2', dir: 'down', number: 2, row: 0, col: 1, length: 2, cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }], answer: 'at', clue: '' },
    ],
    difficulty: 'easy',
    source: 'authored',
  };
}

describe('crosswordStats', () => {
  it('reports zero progress on an empty grid', () => {
    const s = crosswordStats(initGame(makePuzzle()));
    expect(s.totalCells).toBe(4);
    expect(s.filledCells).toBe(0);
    expect(s.correctCells).toBe(0);
    expect(s.wordsTotal).toBe(4);
    expect(s.wordsSolved).toBe(0);
    expect(s.percent).toBe(0);
  });

  it('counts filled and correct cells independently', () => {
    // fill (0,0)=c (correct), (0,1)=x (wrong)
    const game = initGame(makePuzzle(), { '0,0': 'c', '0,1': 'x' });
    const s = crosswordStats(game);
    expect(s.filledCells).toBe(2);
    expect(s.correctCells).toBe(1);
    // no full word complete yet (A1 needs both right)
    expect(s.wordsSolved).toBe(0);
    // percent tracks correct cells, not filled
    expect(s.percent).toBe(25);
  });

  it('marks a word solved only when every cell is correct', () => {
    const game = initGame(makePuzzle(), { '0,0': 'c', '0,1': 'a' }); // A1 = "ca" done; D1 needs (1,0)
    const s = crosswordStats(game);
    expect(s.wordsSolved).toBe(1); // only A1 fully correct
  });

  it('reports 100% and all words solved when fully correct', () => {
    const game = initGame(makePuzzle(), { '0,0': 'c', '0,1': 'a', '1,0': 'a', '1,1': 't' });
    const s = crosswordStats(game);
    expect(s.filledCells).toBe(4);
    expect(s.correctCells).toBe(4);
    expect(s.wordsSolved).toBe(4);
    expect(s.percent).toBe(100);
  });

  it('ignores block cells', () => {
    const puzzle = makePuzzle();
    puzzle.cells[3] = { row: 1, col: 1, block: true, solution: '', number: null };
    // remove slots that touch the block to keep the fixture coherent
    puzzle.slots = puzzle.slots.filter((s) => s.id === 'A1' || s.id === 'D1');
    const s = crosswordStats(initGame(puzzle, { '0,0': 'c', '0,1': 'a', '1,0': 'a' }));
    expect(s.totalCells).toBe(3);
    expect(s.correctCells).toBe(3);
    expect(s.percent).toBe(100);
  });
});
