/**
 * getCachedTrie keyed the cache on the RAW language string while falling back to
 * the English word set for unknown values — so every distinct bogus `language`
 * from the unauthenticated solve-grid endpoints built (and retained, 30 min) its
 * own ~36 MB English-sized trie.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedTrie,
  clearSolverCaches,
  getSolverCacheStats,
  resolveSolverLanguage,
} from '../boggleSolver';

vi.mock('../../dictionary', () => ({
  dictionary: {
    englishWords: new Set(['cat', 'car', 'cart']),
    hebrewWords: new Set(['שלום']),
    swedishWords: new Set(['hej']),
    japaneseWords: new Set(['ねこ']),
    spanishWords: new Set(['gato']),
    russianWords: new Set(['кот']),
  },
}));

beforeEach(() => clearSolverCaches());

describe('resolveSolverLanguage', () => {
  it('given a supported language, returns it unchanged', () => {
    expect(resolveSolverLanguage('he')).toBe('he');
  });

  it.each(['xx', 'en ', 'EN', '__proto__', 'constructor', ''])(
    'given unsupported value %j, falls back to en',
    (bogus) => {
      expect(resolveSolverLanguage(bogus)).toBe('en');
    },
  );
});

describe('getCachedTrie cache-key bound', () => {
  it('given many distinct bogus languages, then only one trie is cached', () => {
    for (let i = 0; i < 50; i++) getCachedTrie(`bogus-${i}`);
    expect(getSolverCacheStats().trieCache.size).toBe(1);
  });

  it('given real languages, each still gets its own trie', () => {
    getCachedTrie('en');
    getCachedTrie('he');
    expect(getSolverCacheStats().trieCache.size).toBe(2);
  });
});
