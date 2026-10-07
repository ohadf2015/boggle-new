/**
 * themedWordsCache — the PSI r7 mount-fetch replacement for start-gated modes.
 *
 * Contract: gated modes (solo-bots/challenge) never fetch /api/themed-words at
 * mount; they build the board from last visit's cached words and refresh the
 * cache once the round is running. The cache must degrade silently — a missing,
 * corrupt, or quota-blocked store yields a plain board, never a crash.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readCachedThemedWords, cacheThemedWords } from '../themedWordsCache';

describe('themedWordsCache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns [] on a cold cache (first-ever visit / PSI run)', () => {
    expect(readCachedThemedWords('en', 10)).toEqual([]);
  });

  it('round-trips cached words for the same language', () => {
    cacheThemedWords('en', ['APPLE', 'BOARD', 'CRANE']);
    expect(readCachedThemedWords('en', 10)).toEqual(['APPLE', 'BOARD', 'CRANE']);
  });

  it('keeps caches per-language isolated', () => {
    cacheThemedWords('en', ['APPLE']);
    expect(readCachedThemedWords('he', 10)).toEqual([]);
  });

  it('caps reads at maxCount', () => {
    cacheThemedWords('en', ['A', 'B', 'C', 'D']);
    expect(readCachedThemedWords('en', 2)).toEqual(['A', 'B']);
  });

  it('returns [] on corrupt JSON instead of throwing', () => {
    window.localStorage.setItem('lexiclash_themed_words_v1_en', '{not json');
    expect(readCachedThemedWords('en', 10)).toEqual([]);
  });

  it('returns [] when the stored value is not an array of strings', () => {
    window.localStorage.setItem('lexiclash_themed_words_v1_en', '{"a":1}');
    expect(readCachedThemedWords('en', 10)).toEqual([]);
    window.localStorage.setItem('lexiclash_themed_words_v1_en', '["OK", 42, ""]');
    expect(readCachedThemedWords('en', 10)).toEqual(['OK']);
  });

  it('never writes an empty array (keeps the last good cache)', () => {
    cacheThemedWords('en', ['APPLE']);
    cacheThemedWords('en', []);
    expect(readCachedThemedWords('en', 10)).toEqual(['APPLE']);
  });

  it('survives a throwing localStorage (private mode)', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => { throw new DOMException('SecurityError'); },
        setItem: () => { throw new DOMException('QuotaExceededError'); },
      },
      configurable: true,
    });
    expect(() => cacheThemedWords('en', ['APPLE'])).not.toThrow();
    expect(readCachedThemedWords('en', 10)).toEqual([]);
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
  });
});
