import { describe, it, expect } from 'vitest';
import {
  initGame,
  focusCell,
  inputLetter,
  backspace,
  moveInSlot,
  moveVertical,
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

/** Fill 1-Across with a fully wrong word twice, so checkAll produces warmth marks. */
function wronglyFilledAndChecked() {
  let s = initGame(puzzle);
  for (const ch of 'zzzz') s = inputLetter(s, ch);
  s = checkAll(s);
  s = focusCell(s, 0, 0);
  for (const ch of 'zzzz') s = inputLetter(s, ch);
  s = checkAll(s);
  return s;
}

describe('moveVertical', () => {
  it('switches to down AND moves in a single call (was two key presses)', () => {
    const s = initGame(puzzle);
    expect(s.dir).toBe('across');

    const next = moveVertical(s, 1);

    expect(next.dir).toBe('down');
    expect(next.active).toEqual({ row: 1, col: 0 });
  });

  it('moves up within an existing down word without re-toggling', () => {
    let s = initGame(puzzle);
    s = moveVertical(s, 1); // now down, row 1
    const next = moveVertical(s, -1);
    expect(next.dir).toBe('down');
    expect(next.active).toEqual({ row: 0, col: 0 });
  });

  it('does not move sideways when the cell has no slot in the other direction', () => {
    // Every cell here is doubly-checked, so assert the invariant instead:
    // after a vertical move the direction is never 'across'.
    const s = moveVertical(initGame(puzzle), 1);
    expect(s.dir).not.toBe('across');
  });

  it('stays put at the end of the down word', () => {
    let s = initGame(puzzle);
    for (let i = 0; i < 5; i++) s = moveVertical(s, 1);
    expect(s.active).toEqual({ row: 3, col: 0 });
  });
});

describe('check feedback lifetime', () => {
  it('checkAll marks warmth on a repeatedly-wrong word', () => {
    const s = wronglyFilledAndChecked();
    expect(Object.keys(s.warmths).length).toBeGreaterThan(0);
  });

  it('clears warmths alongside checks when navigating (was: warmth lingered forever)', () => {
    const s = wronglyFilledAndChecked();
    expect(Object.keys(s.warmths).length).toBeGreaterThan(0);

    const moved = focusCell(s, 2, 2);

    expect(moved.checks).toEqual({});
    expect(moved.warmths).toEqual({});
  });

  it('clears warmths on moveInSlot too', () => {
    const s = wronglyFilledAndChecked();
    const moved = moveInSlot({ ...s, active: { row: 0, col: 0 } }, 1);
    expect(moved.warmths).toEqual({});
  });

  it('keeps feedback on OTHER cells when you retype one cell', () => {
    const s = wronglyFilledAndChecked();
    // active cell is somewhere in 1-Across; type over cell (0,0) specifically.
    const at00 = { ...s, active: { row: 0, col: 0 } };
    expect(at00.checks['0,0']).toBe('wrong');
    expect(at00.checks['0,1']).toBe('wrong');

    const typed = inputLetter(at00, 'b');

    // the edited cell's stale verdict is gone...
    expect(typed.checks['0,0']).toBeUndefined();
    expect(typed.warmths['0,0']).toBeUndefined();
    // ...but the rest of the word still shows what the check told you.
    expect(typed.checks['0,1']).toBe('wrong');
  });

  it('keeps feedback on other cells when backspacing one cell', () => {
    const s = wronglyFilledAndChecked();
    const at00 = { ...s, active: { row: 0, col: 0 } };

    const erased = backspace(at00);

    expect(erased.checks['0,0']).toBeUndefined();
    expect(erased.checks['0,1']).toBe('wrong');
  });
});
