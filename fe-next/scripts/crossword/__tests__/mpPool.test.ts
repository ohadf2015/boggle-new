import { describe, it, expect } from 'vitest';
import { enumerateFills, selectDistinct, symmetricPatterns, toCandidates, type Template } from '../mpPool';
import { isRealCrossword } from '../../../lib/crossword/templates';

const CORNERS_4: Template = { size: 4, blocks: [[0, 0], [3, 3]] };
const GRID_0 = [
  [null, 'i', 'r', 'e'],
  ['a', 'm', 'o', 'r'],
  ['m', 'a', 's', 'a'],
  ['a', 'n', 'a', null],
] as (string | null)[][];
const answersOf = (grid: (string | null)[][]) => {
  const words = new Set<string>();
  for (const [r, row] of grid.entries()) {
    for (const [c] of row.entries()) {
      if (grid[r][c] === null) continue;
      if (c === 0 || grid[r][c - 1] === null) {
        let w = '';
        for (let k = c; k < row.length && grid[r][k] !== null; k++) w += grid[r][k];
        if (w.length >= 3) words.add(w);
      }
      if (r === 0 || grid[r - 1][c] === null) {
        let w = '';
        for (let k = r; k < grid.length && grid[k][c] !== null; k++) w += grid[k][c];
        if (w.length >= 3) words.add(w);
      }
    }
  }
  return words;
};

describe('enumerateFills', () => {
  it('finds the known grid when the word list holds exactly its answers', () => {
    const words = [...answersOf(GRID_0)];
    const grids = enumerateFills(CORNERS_4, words, 1000);
    const keys = grids.map((g) => g.map((row) => row.join(',')).join('|'));
    expect(keys).toContain(GRID_0.map((row) => row.join(',')).join('|'));
  });

  it('returns only real crosswords built from the given words, with no repeated answer', () => {
    const words = ['ire', 'amor', 'masa', 'ana', 'ama', 'iman', 'ropa', 'era', 'mapa', 'rosa'];
    for (const g of enumerateFills(CORNERS_4, words, 1000)) {
      expect(isRealCrossword(g, false)).toBe(true);
      const answers = [...answersOf(g)];
      expect(new Set(answers).size).toBe(answers.length);
      for (const a of answers) expect(words).toContain(a);
    }
  });

  it('stops at maxGrids', () => {
    const words = [...answersOf(GRID_0), 'ama', 'iman', 'ropa', 'era', 'mapa', 'rosa', 'ire', 'casa', 'capa', 'aca'];
    expect(enumerateFills(CORNERS_4, words, 2).length).toBeLessThanOrEqual(2);
  });

  it('returns nothing when the word list cannot fill the pattern', () => {
    expect(enumerateFills(CORNERS_4, ['gato', 'perro'], 100)).toEqual([]);
  });
});

describe('selectDistinct', () => {
  const grid = (answers: string[]) => ({ answers: new Set(answers), score: 1 });

  it('never keeps two puzzles that share 3 or more answers', () => {
    const a = grid(['a1', 'a2', 'a3', 'a4', 'x1']);
    const b = grid(['a1', 'a2', 'a3', 'b4', 'x2']);
    const c = grid(['c1', 'c2', 'c3', 'c4', 'c5']);
    const picked = selectDistinct([a, b, c], 2, 1);
    for (let i = 0; i < picked.length; i++) {
      for (let j = i + 1; j < picked.length; j++) {
        const shared = [...picked[i].answers].filter((w) => picked[j].answers.has(w)).length;
        expect(shared).toBeLessThanOrEqual(2);
      }
    }
    expect(picked).toContain(c);
    expect(picked).toHaveLength(2);
  });

  it('keeps every candidate when none overlap', () => {
    const many = Array.from({ length: 10 }, (_, i) => grid([`w${i}a`, `w${i}b`, `w${i}c`]));
    expect(selectDistinct(many, 2, 1)).toHaveLength(10);
  });
});

describe('toCandidates', () => {
  const clueOf = (w: string) => ({ ire: 'Furia', amor: 'Afecto', masa: 'Pasta', ana: 'Nombre propio', ama: 'Señora', iman: 'Atrae hierro', ropa: 'Vestido', era: 'Periodo', rosa: 'Flor' } as Record<string, string>)[w];

  it('keeps grids whose every answer has a clue, with clues keyed by slot id', () => {
    const [cand] = toCandidates([GRID_0], clueOf, new Set(), (w) => (w === 'ire' ? 80 : 10));
    expect(cand.answers).toEqual(answersOf(GRID_0));
    expect(cand.clues.A1).toBe('Furia');
    expect(Object.keys(cand.clues).length).toBe(8);
  });

  it('drops a grid with an unclued or denylisted answer', () => {
    expect(toCandidates([GRID_0], (w) => (w === 'masa' ? undefined : clueOf(w)), new Set(), () => 1)).toEqual([]);
    expect(toCandidates([GRID_0], clueOf, new Set(['amor']), () => 1)).toEqual([]);
  });
});

describe('symmetricPatterns', () => {
  const runsOf = (t: Template) => {
    const black = new Set(t.blocks.map(([r, c]) => `${r},${c}`));
    const lengths: number[] = [];
    for (let i = 0; i < t.size; i++) {
      for (const line of [(k: number) => [i, k], (k: number) => [k, i]]) {
        let run = 0;
        for (let k = 0; k <= t.size; k++) {
          const [r, c] = k < t.size ? line(k) : [-1, -1];
          if (k < t.size && !black.has(`${r},${c}`)) run++;
          else { if (run > 0) lengths.push(run); run = 0; }
        }
      }
    }
    return lengths;
  };

  it('returns 180-degree symmetric patterns whose every run is 3 to maxRun letters', () => {
    for (const size of [4, 5]) {
      const pats = symmetricPatterns(size, 5);
      expect(pats.length).toBeGreaterThan(0);
      for (const t of pats) {
        const set = new Set(t.blocks.map(([r, c]) => `${r},${c}`));
        for (const [r, c] of t.blocks) expect(set.has(`${size - 1 - r},${size - 1 - c}`)).toBe(true);
        for (const len of runsOf(t)) expect(len >= 3 && len <= 5).toBe(true);
      }
    }
  });

  it('includes the 4x4 corner-block pattern', () => {
    const corners = symmetricPatterns(4, 4).map((t) => t.blocks.map(([r, c]) => `${r},${c}`).sort().join(' '));
    expect(corners).toContain(['0,0', '3,3'].join(' '));
  });
});
