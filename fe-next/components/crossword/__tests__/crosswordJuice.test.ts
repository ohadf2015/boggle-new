import { describe, it, expect } from 'vitest';
import { comboPunch, freshSolvedSlots, nextComboChain, CROSSWORD_COMBO_WINDOW_MS } from '../crosswordJuice';
import { initGame } from '@/lib/crossword/gameState';
import { buildSeedPuzzle } from '@/lib/crossword/puzzles/index';

const puzzle = buildSeedPuzzle({
  id: 'juice-en',
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
});
const firstRow = { '0,0': 'b', '0,1': 'i', '0,2': 'r', '0,3': 'd' };
const across1 = puzzle.slots.find((s) => s.cells.every((c) => c.row === 0) && s.cells.length === 4)!;

describe('freshSolvedSlots', () => {
  it('Given the first observation, celebrates nothing (restored progress is not a new solve)', () => {
    const state = initGame(puzzle, firstRow);
    expect(freshSolvedSlots(null, state)).toEqual([]);
  });

  it('Given a word that just became correct, returns that slot', () => {
    const state = initGame(puzzle, firstRow);
    const fresh = freshSolvedSlots(new Set(), state);
    expect(fresh.map((s) => s.id)).toContain(across1.id);
  });

  it('Given a word already solved before, does not return it again', () => {
    const state = initGame(puzzle, firstRow);
    expect(freshSolvedSlots(new Set([across1.id]), state).map((s) => s.id)).not.toContain(across1.id);
  });

  it('Given a word finished by a reveal hint, gives no reward', () => {
    const state = initGame(puzzle, firstRow, ['0,2']);
    expect(freshSolvedSlots(new Set(), state).map((s) => s.id)).not.toContain(across1.id);
  });
});

describe('nextComboChain', () => {
  it('Given no live chain, starts at 1', () => {
    expect(nextComboChain(0, 0, 1000)).toBe(1);
  });

  it('Given a solve inside the window, extends the chain', () => {
    expect(nextComboChain(2, 1000, 1000 + CROSSWORD_COMBO_WINDOW_MS)).toBe(3);
  });

  it('Given a solve after the window, restarts at 1', () => {
    expect(nextComboChain(4, 1000, 1001 + CROSSWORD_COMBO_WINDOW_MS)).toBe(1);
  });
});

describe('comboPunch', () => {
  it('Given a single word, a modest squash with one burst', () => {
    const p = comboPunch(1);
    expect(p.squash).toBeGreaterThan(1);
    expect(p.bursts).toBe(1);
  });

  it('Given a growing combo, every beat gets bigger, then caps', () => {
    const levels = [1, 2, 3, 4, 5].map(comboPunch);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].squash).toBeGreaterThan(levels[i - 1].squash);
      expect(levels[i].hold).toBeGreaterThanOrEqual(levels[i - 1].hold);
    }
    expect(comboPunch(50)).toEqual(comboPunch(6));
  });
});
