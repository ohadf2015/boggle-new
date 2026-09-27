/**
 * pruneSolverCaches — active eviction of expired solver caches.
 *
 * WHY: getCachedTrie() only checks TRIE_CACHE_TTL on ACCESS. A language that
 * is played once and never again keeps its trie alive for the life of the
 * process. Each English-sized trie measures ~36 MB (607k plain-object nodes),
 * so 5 idle locales sit on well over 100 MB of a container that runs at
 * ~790 MB baseline / 1.1 GB RSS. Nothing swept them because the only caller of
 * the existing clear helper was an admin stats route.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildTrie,
  getCachedTrie,
  clearSolverCaches,
  pruneSolverCaches,
  getSolverCacheStats,
} from '../boggleSolver';

vi.mock('../../dictionary', () => ({
  dictionary: {
    englishWords: new Set(['cat', 'car', 'cart']),
    hebrewWords: new Set(['שלום']),
    swedishWords: new Set(['hej']),
    japaneseWords: new Set(['ねこ']),
    spanishWords: new Set(['gato']),
  },
}));

const THIRTY_ONE_MINUTES = 31 * 60 * 1000;

beforeEach(() => {
  clearSolverCaches();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearSolverCaches();
});

describe('buildTrie', () => {
  it('marks terminal nodes as words and shares prefixes', () => {
    const trie = buildTrie(new Set(['cat', 'car']));
    const child = (node: unknown, key: string): Record<string, unknown> =>
      (node as Record<string, Record<string, unknown>>)[key];

    expect(child(child(child(trie, 'c'), 'a'), 't').isWord).toBe(true);
    expect(child(child(child(trie, 'c'), 'a'), 'r').isWord).toBe(true);
  });
});

describe('pruneSolverCaches', () => {
  it('evicts a trie that has gone past its TTL without being accessed', () => {
    getCachedTrie('en');
    expect(getSolverCacheStats().trieCache.size).toBe(1);

    vi.advanceTimersByTime(THIRTY_ONE_MINUTES);
    const pruned = pruneSolverCaches();

    expect(pruned.tries).toBe(1);
    expect(getSolverCacheStats().trieCache.size).toBe(0);
  });

  it('keeps a trie that is still within its TTL', () => {
    getCachedTrie('en');

    vi.advanceTimersByTime(5 * 60 * 1000);
    const pruned = pruneSolverCaches();

    expect(pruned.tries).toBe(0);
    expect(getSolverCacheStats().trieCache.size).toBe(1);
  });

  it('evicts only the idle language when another is still hot', () => {
    getCachedTrie('he');
    vi.advanceTimersByTime(THIRTY_ONE_MINUTES);
    getCachedTrie('en');

    const pruned = pruneSolverCaches();

    expect(pruned.tries).toBe(1);
    expect(getSolverCacheStats().trieCache.languages).toEqual(['en']);
  });

  it('is a no-op on empty caches', () => {
    expect(pruneSolverCaches()).toEqual({ tries: 0, grids: 0 });
  });
});
