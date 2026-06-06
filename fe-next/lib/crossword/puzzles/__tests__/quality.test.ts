// "Is it a real crossword?" invariants over the committed bank. These would have FAILED the
// original 3×3 word-square seeds (no blocks, all-equal length) — they encode the quality bar.
// Dictionary-validity of every entry is checked offline by scripts/crossword/validate.ts (loading
// the 415k-word dict in a unit test is too heavy); here we enforce the structural invariants.

import { describe, it, expect } from 'vitest';
import { getPool } from '../index';
import type { CrosswordPuzzle } from '../../types';

const LOCALES = ['en', 'he'] as const;

function whiteCells(puzzle: CrosswordPuzzle) {
  return puzzle.cells.filter((c) => !c.block);
}

/** White cells reachable from the first white cell via 4-neighbour steps. */
function connectedWhiteCount(puzzle: CrosswordPuzzle): number {
  const white = new Set(whiteCells(puzzle).map((c) => `${c.row},${c.col}`));
  const start = whiteCells(puzzle)[0];
  if (!start) return 0;
  const seen = new Set<string>();
  const stack = [`${start.row},${start.col}`];
  while (stack.length) {
    const k = stack.pop()!;
    if (seen.has(k)) continue;
    seen.add(k);
    const [r, c] = k.split(',').map(Number);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = `${r + dr},${c + dc}`;
      if (white.has(nk) && !seen.has(nk)) stack.push(nk);
    }
  }
  return seen.size;
}

describe('crossword bank quality invariants', () => {
  for (const locale of LOCALES) {
    const pool = getPool(locale);

    it(`${locale}: has a real bank of puzzles`, () => {
      expect(pool.length).toBeGreaterThanOrEqual(locale === 'en' ? 8 : 5);
    });

    for (const puzzle of pool) {
      describe(`${puzzle.id}`, () => {
        it('is at least 4×4 (not a tiny 3×3 word square)', () => {
          expect(puzzle.size).toBeGreaterThanOrEqual(4);
        });

        it('has at least one black block (not a word square)', () => {
          expect(puzzle.cells.some((c) => c.block)).toBe(true);
        });

        it('has across AND down slots', () => {
          expect(puzzle.slots.some((s) => s.dir === 'across')).toBe(true);
          expect(puzzle.slots.some((s) => s.dir === 'down')).toBe(true);
        });

        it('every entry is at least 3 letters', () => {
          for (const s of puzzle.slots) expect(s.length).toBeGreaterThanOrEqual(3);
        });

        it('has varied word lengths (a word square is all-equal)', () => {
          const lengths = new Set(puzzle.slots.map((s) => s.length));
          expect(lengths.size).toBeGreaterThanOrEqual(2);
        });

        it('shares no word between across and down', () => {
          const across = puzzle.slots.filter((s) => s.dir === 'across').map((s) => s.answer);
          const down = new Set(puzzle.slots.filter((s) => s.dir === 'down').map((s) => s.answer));
          expect(across.some((a) => down.has(a))).toBe(false);
        });

        it('every slot has a non-empty clue', () => {
          for (const s of puzzle.slots) {
            expect(s.clue.trim().length, `${puzzle.id} ${s.id} has no clue`).toBeGreaterThan(0);
          }
        });

        it('every white cell is checked (in both an across and a down word)', () => {
          const inAcross = new Set<string>();
          const inDown = new Set<string>();
          for (const s of puzzle.slots) {
            for (const c of s.cells) {
              (s.dir === 'across' ? inAcross : inDown).add(`${c.row},${c.col}`);
            }
          }
          for (const c of whiteCells(puzzle)) {
            const k = `${c.row},${c.col}`;
            expect(inAcross.has(k) && inDown.has(k), `${puzzle.id} cell ${k} unchecked`).toBe(true);
          }
        });

        it('white cells form a single connected region', () => {
          expect(connectedWhiteCount(puzzle)).toBe(whiteCells(puzzle).length);
        });
      });
    }
  }
});
