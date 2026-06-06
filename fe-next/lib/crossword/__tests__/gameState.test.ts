import { describe, it, expect } from 'vitest';
import {
  initGame,
  focusCell,
  toggleDir,
  currentSlot,
  inputLetter,
  backspace,
  moveInSlot,
  revealCell,
  revealWord,
  checkAll,
} from '../gameState';
import { buildSeedPuzzle } from '../puzzles/index';
import type { SeedPuzzle } from '../puzzles/seed';

// 4x4 symmetric square (bird/idea/rest/date) — across set == down set.
const seed: SeedPuzzle = {
  id: 'g',
  locale: 'en',
  difficulty: 'easy',
  rtl: false,
  grid: [
    ['b', 'i', 'r', 'd'],
    ['i', 'd', 'e', 'a'],
    ['r', 'e', 's', 't'],
    ['d', 'a', 't', 'e'],
  ],
  clues: { bird: 'b', idea: 'i', rest: 'r', date: 'd' },
};
const puzzle = buildSeedPuzzle(seed);

describe('initGame', () => {
  it('starts at the first across slot, playing', () => {
    const s = initGame(puzzle);
    expect(s.active).toEqual({ row: 0, col: 0 });
    expect(s.dir).toBe('across');
    expect(s.status).toBe('playing');
  });

  it('restores prior entries and detects an already-solved puzzle', () => {
    const full: Record<string, string> = {};
    for (const c of puzzle.cells) if (!c.block) full[`${c.row},${c.col}`] = c.solution;
    expect(initGame(puzzle, full).status).toBe('solved');
  });
});

describe('focus + direction', () => {
  it('toggleDir switches across<->down at a crossing cell', () => {
    const s = initGame(puzzle);
    expect(currentSlot(s)?.dir).toBe('across');
    const t = toggleDir(s);
    expect(t.dir).toBe('down');
    expect(currentSlot(t)?.dir).toBe('down');
  });

  it('focusCell ignores block cells', () => {
    const s = initGame(puzzle);
    const t = focusCell(s, 0, 1);
    expect(t.active).toEqual({ row: 0, col: 1 });
  });
});

describe('inputLetter auto-advance', () => {
  it('writes the letter and advances to the next empty cell in the slot', () => {
    let s = initGame(puzzle); // active (0,0) across
    s = inputLetter(s, 'B');
    expect(s.entries['0,0']).toBe('b');
    expect(s.active).toEqual({ row: 0, col: 1 }); // advanced
  });

  it('normalizes case', () => {
    const s = inputLetter(initGame(puzzle), 'X');
    expect(s.entries['0,0']).toBe('x');
  });

  it('marks solved when the final correct letter is entered', () => {
    let s = initGame(puzzle);
    // fill everything except the last cell, then type it
    for (const c of puzzle.cells) {
      if (c.block) continue;
      if (c.row === 3 && c.col === 3) continue;
      s = { ...s, entries: { ...s.entries, [`${c.row},${c.col}`]: c.solution } };
    }
    s = focusCell(s, 3, 3);
    s = inputLetter(s, 'e'); // date/date last cell = 'e'
    expect(s.status).toBe('solved');
  });
});

describe('backspace', () => {
  it('clears a filled cell in place', () => {
    let s = inputLetter(initGame(puzzle), 'b'); // now at (0,1), (0,0)=b
    s = focusCell(s, 0, 0);
    s = backspace(s);
    expect(s.entries['0,0']).toBeUndefined();
  });

  it('on an empty cell, moves back and clears the previous', () => {
    let s = initGame(puzzle);
    s = inputLetter(s, 'b'); // (0,0)=b, active (0,1)
    s = backspace(s); // (0,1) empty -> go back to (0,0), clear it
    expect(s.active).toEqual({ row: 0, col: 0 });
    expect(s.entries['0,0']).toBeUndefined();
  });
});

describe('moveInSlot', () => {
  it('moves forward/back within the slot, clamped', () => {
    let s = initGame(puzzle);
    s = moveInSlot(s, 1);
    expect(s.active).toEqual({ row: 0, col: 1 });
    s = moveInSlot(s, -1);
    expect(s.active).toEqual({ row: 0, col: 0 });
    s = moveInSlot(s, -1); // clamp at start
    expect(s.active).toEqual({ row: 0, col: 0 });
  });
});

describe('reveal + check', () => {
  it('revealCell fills the solution and records the cell as revealed', () => {
    const s = revealCell(initGame(puzzle));
    expect(s.entries['0,0']).toBe('b');
    expect(s.revealed).toContain('0,0');
  });

  it('revealWord fills the whole active slot', () => {
    const s = revealWord(initGame(puzzle));
    expect(s.entries['0,0']).toBe('b');
    expect(s.entries['0,1']).toBe('i');
    expect(s.entries['0,2']).toBe('r');
    expect(s.entries['0,3']).toBe('d');
  });

  it('checkAll marks filled cells correct/wrong without penalty', () => {
    let s = initGame(puzzle);
    s = { ...s, entries: { '0,0': 'b', '0,1': 'x' } };
    s = checkAll(s);
    expect(s.checks['0,0']).toBe('correct');
    expect(s.checks['0,1']).toBe('wrong');
    expect(s.checks['0,2']).toBeUndefined(); // empty -> unchecked
  });
});
