/**
 * Test for language-switch race condition in useDictionaryCache.
 *
 * BUG: When switching languages, isLoaded stays true from the previous language
 * while dictionaryRef.current still holds the old Set. This causes words to be
 * silently checked against the wrong dictionary.
 *
 * Example: Play English game, switch to Hebrew, submit word "שלום" → it gets
 * checked against the English dict (which doesn't contain it) and rejected even
 * though it's a valid Hebrew word.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDictionaryCache, __resetDictionaryCacheForTests } from '../useDictionaryCache';

// Mock fetch to return a dictionary
vi.mock('comlink', () => ({
  wrap: () => null,
}));

describe('useDictionaryCache — language switch race condition', () => {
  beforeEach(() => {
    __resetDictionaryCacheForTests();
    vi.restoreAllMocks();
  });

  it('resets isLoaded to false when language changes', async () => {
    // Seed memory cache with English dictionary
    __resetDictionaryCacheForTests(new Map([
      ['en', new Set(['hello', 'world'])],
    ]));

    const { result, rerender } = renderHook(
      ({ lang }) => useDictionaryCache(lang),
      { initialProps: { lang: 'en' as const } }
    );

    // English dictionary is loaded
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.wordCount).toBe(2);

    // Mock fetch for Hebrew dictionary
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('שלום\nמים', { status: 200 })
    );

    // Switch language to Hebrew
    act(() => {
      rerender({ lang: 'he' });
    });

    // RACE CONDITION BUG: isLoaded should be false during the Hebrew fetch,
    // but stays true from English because setIsLoaded(false) is not called.
    // This test currently FAILS — once fixed, isLoaded will be false until
    // the Hebrew dictionary finishes loading.
    expect(result.current.isLoaded).toBe(false);
  });

  it('clears the old dictionary when language changes', async () => {
    // Seed memory cache with English dictionary
    __resetDictionaryCacheForTests(new Map([
      ['en', new Set(['hello'])],
    ]));

    const { result, rerender } = renderHook(
      ({ lang }) => useDictionaryCache(lang),
      { initialProps: { lang: 'en' as const } }
    );

    // English: word exists
    expect(result.current.checkWord('hello')).toBe(true);

    // Mock fetch for Hebrew dictionary
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('שלום\nמים', { status: 200 })
    );

    // Switch to Hebrew
    act(() => {
      rerender({ lang: 'he' });
    });

    // After language switch, the old English dict should not be used.
    // This test documents the fix: checkWord should return false for
    // English words when the dictionary is loading Hebrew.
    // (Or ideally return false until fully loaded — depends on implementation.)
    expect(result.current.checkWord('hello')).toBe(false);
  });
});
