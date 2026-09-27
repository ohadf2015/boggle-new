import { describe, it, expect } from 'vitest';
import { planWorkshopOpener, WORKSHOP_DIMS } from '../workshopOpener';

const word = (tiles: { row: number; col: number; letter: string }[]) =>
  [...tiles].sort((a, b) => a.col - b.col).map((t) => t.letter).join('');

describe('planWorkshopOpener', () => {
  it('GIVEN the academy dims THEN the board is the short 7x7 with a small bag', () => {
    expect(WORKSHOP_DIMS.size).toBe(7);
    expect(WORKSHOP_DIMS.bagSize).toBeLessThanOrEqual(40);
  });

  it('GIVEN two lesson targets WHEN planned THEN the Baron opens with the one NOT dealt to the student, across one row', () => {
    const plan = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    expect(plan).not.toBeNull();
    expect(word(plan.tiles)).toBe('TEACHER');
    expect(new Set(plan.tiles.map((t) => t.row)).size).toBe(1);
    expect(plan.tiles.every((t) => t.col >= 0 && t.col < 7 && t.row >= 0 && t.row < 7)).toBe(true);
  });

  it('GIVEN the plan THEN the dealt word can cross the opener vertically on the board (a guaranteed first move)', () => {
    const plan = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    const { cross } = plan;
    expect(cross).not.toBeNull();
    const { col, startRow } = cross!;
    const letters = [...'PUZZLE'];
    expect(startRow).toBeGreaterThanOrEqual(0);
    expect(startRow + letters.length).toBeLessThanOrEqual(7);
    const at = plan.tiles.find((t) => t.col === col)!;
    expect(letters[at.row - startRow]).toBe(at.letter);
  });

  it('GIVEN opener tiles THEN they carry real tile values and ids that can never collide with bag ids', () => {
    const plan = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    expect(plan.tiles.find((t) => t.letter === 'H')!.value).toBeGreaterThan(1);
    const ids = plan.tiles.map((t) => t.rackTileId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('opener-'))).toBe(true);
    expect(plan.tiles.every((t) => !t.isBlank)).toBe(true);
  });

  it('GIVEN a single lesson target THEN the opener is that word (the board still starts with letters)', () => {
    const plan = planWorkshopOpener(['CAT'], 7, 'en')!;
    expect(word(plan.tiles)).toBe('CAT');
    expect(plan.cross).not.toBeNull();
  });

  it('GIVEN no targets or none that fit THEN no opener', () => {
    expect(planWorkshopOpener([], 7, 'en')).toBeNull();
    expect(planWorkshopOpener(['ABCDEFGHIJ'], 7, 'en')).toBeNull();
  });

  it('GIVEN an opener with no shared letter THEN it is still centred on the board', () => {
    const plan = planWorkshopOpener(['DOG', 'CAT'], 7, 'en')!;
    expect(word(plan.tiles)).toBe('CAT');
    expect(plan.cross).toBeNull();
    expect(plan.tiles[0].row).toBe(3);
    expect(Math.min(...plan.tiles.map((t) => t.col))).toBe(2);
  });
});

describe('planWorkshopOpener — second (branch) word', () => {
  type Cell = { row: number; col: number; letter: string };
  /** Every maximal horizontal/vertical run of 2+ letters on the board. */
  function runs(cells: Cell[], size: number): string[] {
    const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
    for (const c of cells) {
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThan(size);
      expect(c.col).toBeGreaterThanOrEqual(0);
      expect(c.col).toBeLessThan(size);
      if (grid[c.row][c.col] !== null) expect(grid[c.row][c.col]).toBe(c.letter);
      grid[c.row][c.col] = c.letter;
    }
    const out: string[] = [];
    const scan = (get: (i: number, j: number) => string | null) => {
      for (let i = 0; i < size; i++) {
        let cur = '';
        for (let j = 0; j <= size; j++) {
          const ch = j < size ? get(i, j) : null;
          if (ch) cur += ch;
          else {
            if ([...cur].length >= 2) out.push(cur);
            cur = '';
          }
        }
      }
    };
    scan((i, j) => grid[i][j]);
    scan((i, j) => grid[j][i]);
    return out.sort();
  }
  const dealtCells = (dealt: string, cross: { col: number; startRow: number }): Cell[] =>
    [...dealt].map((letter, k) => ({ row: cross.startRow + k, col: cross.col, letter }));

  it('GIVEN the demo lesson (PUZZLE dealt, TEACHER opener) THEN a short second word crosses the opener vertically', () => {
    const plan = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    expect(plan.branch.length).toBeGreaterThan(0);
    expect(plan.words[0]).toBe('TEACHER');
    expect(plan.words).toHaveLength(2);
    // Branch tiles are all in one column, none on the opener row (the shared cell is the opener's own tile).
    expect(new Set(plan.branch.map((t) => t.col)).size).toBe(1);
    expect(plan.branch.every((t) => t.row !== plan.tiles[0].row)).toBe(true);
  });

  it('GIVEN opener + branch + the dealt word at its cross THEN every word on the board is one of those three (no accidental words, overlaps or off-board tiles)', () => {
    for (const targets of [['PUZZLE', 'TEACHER'], ['CAT'], ['DOG', 'CAT'], ['SUN', 'PLANET', 'MOON'], ['RED', 'TEACHER', 'ACT']]) {
      const plan = planWorkshopOpener(targets, 7, 'en')!;
      const cells: Cell[] = [...plan.tiles, ...plan.branch];
      const expected = [...plan.words];
      if (plan.cross) {
        cells.push(...dealtCells(targets[0], plan.cross));
        expected.push(targets[0]);
      }
      expect(runs(cells, 7)).toEqual(expected.sort());
    }
  });

  it('GIVEN a spare lesson target that fits THEN it is preferred over the stock short words', () => {
    // ACT is not a stock word and shares letters with TEACHER.
    const plan = planWorkshopOpener(['RED', 'TEACHER', 'ACT'], 7, 'en')!;
    expect(plan.words).toEqual(['TEACHER', 'ACT']);
  });

  it('GIVEN the same targets THEN the plan is deterministic, and branch ids are unique opener ids', () => {
    const a = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    const b = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    expect(b).toEqual(a);
    const ids = [...a.tiles, ...a.branch].map((t) => t.rackTileId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('opener-'))).toBe(true);
  });

  it('GIVEN a locale with no verified stock words and no spare target THEN no branch (never an unverified word)', () => {
    const plan = planWorkshopOpener(['חתול'], 7, 'he');
    expect(plan?.branch ?? []).toEqual([]);
  });
});
