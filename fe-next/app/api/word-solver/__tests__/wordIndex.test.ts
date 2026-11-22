// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildMatcher, type FinderQuery } from '../matcher';
import { buildWordIndex, searchWordIndex } from '../wordIndex';

function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
}

describe('word index', () => {
  it('finds exactly what a full scan finds, beyond 32 letters too', () => {
    const r = rng(7);
    const alphabet = Array.from('abcdefghijklmnopqrstuvwxyzáéíóúüñåäö');
    const pick = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(r() * (r() < 0.8 ? 8 : alphabet.length))]).join('');
    const words = Array.from({ length: 4000 }, () => pick(1 + Math.floor(r() * 8)));
    const normalize = (w: string) => w.toLowerCase();
    const index = buildWordIndex(words, normalize);

    for (let q = 0; q < 400; q++) {
      const pattern = r() < 0.25 ? Array.from(pick(2 + Math.floor(r() * 5)), (c) => (r() < 0.5 ? null : c)) : null;
      const query: FinderQuery = {
        rack: r() < 0.1 ? '' : pick(Math.floor(r() * 9)),
        blanks: Math.floor(r() * 4),
        pattern,
        startsWith: r() < 0.15 ? pick(1) : '',
        endsWith: r() < 0.15 ? pick(1) : '',
        contains: r() < 0.15 ? pick(1) : '',
        length: r() < 0.2 ? 2 + Math.floor(r() * 6) : null,
      };
      const matches = buildMatcher(query);
      const expected = [...new Set(words)].filter((w) => matches(normalize(w))).sort();
      const got: string[] = [];
      searchWordIndex(index, query, matches, (w) => got.push(w));
      expect(got.sort()).toEqual(expected);
    }
  });
});
