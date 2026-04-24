/**
 * Tests for hasWordInMemoryCache — synchronous memory-only lookup
 * used as a fast-path by blast-mode and other hot-path validators.
 *
 * Contract:
 *  - Returns `true` only when the dict for that language is loaded in memory
 *    AND the (normalized) word is in it.
 *  - Returns `false` only when the dict is loaded AND the word is definitively
 *    not in it.
 *  - Returns `null` when the dict has not been warmed yet — callers must fall
 *    back to the server API so community-validated words still get accepted.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { hasWordInMemoryCache, __resetDictionaryCacheForTests } from '../useDictionaryCache';

afterEach(() => {
  __resetDictionaryCacheForTests();
});

describe('hasWordInMemoryCache', () => {
  it('returns null when dict is not loaded for that language', () => {
    expect(hasWordInMemoryCache('hello', 'en')).toBeNull();
  });

  it('returns true when dict is loaded and contains the word', () => {
    __resetDictionaryCacheForTests(new Map([['en', new Set(['hello', 'world'])]]));
    expect(hasWordInMemoryCache('hello', 'en')).toBe(true);
  });

  it('lowercases + trims input before lookup', () => {
    __resetDictionaryCacheForTests(new Map([['en', new Set(['cat'])]]));
    expect(hasWordInMemoryCache('  CAT  ', 'en')).toBe(true);
  });

  it('returns false when dict is loaded but word is missing', () => {
    __resetDictionaryCacheForTests(new Map([['en', new Set(['hello'])]]));
    expect(hasWordInMemoryCache('zqxjk', 'en')).toBe(false);
  });

  it('keeps dicts partitioned by language', () => {
    __resetDictionaryCacheForTests(new Map([
      ['en', new Set(['hello'])],
      ['es', new Set(['hola'])],
    ]));
    expect(hasWordInMemoryCache('hello', 'es')).toBe(false);
    expect(hasWordInMemoryCache('hola', 'es')).toBe(true);
  });

  it('handles Hebrew final-letter (sofit) fallback', () => {
    // Dict has final-form שלום; board yields regular-form שלומ.
    __resetDictionaryCacheForTests(new Map([['he', new Set(['שלום'])]]));
    expect(hasWordInMemoryCache('שלומ', 'he')).toBe(true);
  });
});
