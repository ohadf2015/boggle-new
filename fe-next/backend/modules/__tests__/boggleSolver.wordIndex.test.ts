import { describe, it, expect, beforeEach, vi } from 'vitest';

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

const EN = 'aeiorstlnc'.split('');
const RU = 'аеиоткслнр'.split('');
function wordsFrom(alphabet: string[], seed: number): Set<string> {
  const r = rng(seed);
  const out = new Set<string>();
  while (out.size < 3000) {
    const len = 2 + Math.floor(r() * 6);
    out.add(Array.from({ length: len }, () => alphabet[Math.floor(r() * alphabet.length)]).join(''));
  }
  return out;
}
const englishWords = wordsFrom(EN, 1);
const russianWords = wordsFrom(RU, 2);

vi.mock('../../dictionary', () => ({
  isDictionaryWord: () => false,
  normalizeWord: (w: string) => w.toLowerCase(),
  dictionary: {
    get englishWords() { return englishWords; },
    get hebrewWords() { return new Set<string>(); },
    get swedishWords() { return new Set<string>(); },
    get japaneseWords() { return new Set<string>(); },
    get spanishWords() { return new Set<string>(); },
    get russianWords() { return russianWords; },
  },
}));

import { findAllWords, getCachedTrie, getTrieNode, clearSolverCaches } from '../boggleSolver';

function referenceSolve(grid: string[][], words: Set<string>, minLen: number, maxLen: number): string[] {
  const prefixes = new Set<string>();
  for (const w of words) for (let i = 1; i <= w.length; i++) prefixes.add(w.slice(0, i));
  const found = new Set<string>();
  const n = grid.length, m = grid[0].length;
  const single = (cell: string) => Array.from(cell).length === 1;
  const walk = (r: number, c: number, cur: string, seen: Set<number>) => {
    if (!prefixes.has(cur) || cur.length > maxLen) return;
    if (cur.length >= minLen && words.has(cur)) found.add(cur);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc, k = nr * m + nc;
      if ((dr || dc) && nr >= 0 && nr < n && nc >= 0 && nc < m && !seen.has(k) && single(grid[nr][nc])) {
        seen.add(k); walk(nr, nc, cur + grid[nr][nc], seen); seen.delete(k);
      }
    }
  };
  for (let r = 0; r < n; r++) for (let c = 0; c < m; c++) if (single(grid[r][c])) walk(r, c, grid[r][c], new Set([r * m + c]));
  return [...found].sort();
}

describe('solver word index', () => {
  beforeEach(() => clearSolverCaches());

  it('holds one flat entry per word instead of a per-letter object graph', () => {
    const index = getCachedTrie('en');
    expect(Array.isArray(index)).toBe(true);
    expect((index as unknown as readonly string[]).length).toBe(englishWords.size);
  });

  it('answers prefix and whole-word lookups', () => {
    const index = getCachedTrie('en')!;
    const word = [...englishWords].find((w) => w.length >= 4)!;
    expect(getTrieNode(index, word)?.isWord).toBe(true);
    expect(getTrieNode(index, word.slice(0, 2))).not.toBeNull();
    expect(getTrieNode(index, 'zzz')).toBeNull();
  });

  it.each([
    ['en', EN, englishWords],
    ['ru', RU, russianWords],
  ] as const)('finds exactly the words a brute-force search finds (%s)', (lang, alphabet, words) => {
    const r = rng(99);
    for (let g = 0; g < 20; g++) {
      const grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => alphabet[Math.floor(r() * alphabet.length)]));
      const got = findAllWords(grid, lang, { minLength: 3, maxLength: 8, maxWords: 100000, trie: getCachedTrie(lang) });
      expect([...got].sort()).toEqual(referenceSolve(grid, words, 3, 8));
    }
  });

  it('never walks through empty or multi-letter cells (cleared blast tiles)', () => {
    const word = [...englishWords].find((w) => w.length === 3)!;
    const grid = [
      [word[0], '', word[1]],
      ['', 'qu', ''],
      [word[2], '', 'a'],
    ];
    const got = findAllWords(grid, 'en', { minLength: 3, maxLength: 8, maxWords: 1000, trie: getCachedTrie('en') });
    expect([...got].sort()).toEqual(referenceSolve(grid, englishWords, 3, 8));
  });
});
