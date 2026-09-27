/**
 * Tests for fastValidateWord — client-side word validation that short-circuits
 * on an in-memory dictionary hit to skip the /api/validate-word round-trip.
 *
 * Contract:
 *  - If the dictionary is loaded AND the word is a hit → return true, skip fetch.
 *  - Otherwise POST /api/validate-word and return data.isValid.
 *  - On network error / non-ok response → fall back to `word.length >= 3`
 *    (matches existing SP permissive behavior so a hiccup doesn't brick the game).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fastValidateWord } from '../fastValidateWord';
import { __resetDictionaryCacheForTests } from '../useDictionaryCache';

const originalFetch = global.fetch;

beforeEach(() => {
  __resetDictionaryCacheForTests();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('fastValidateWord', () => {
  it('returns true without fetch when word hits in-memory dictionary', async () => {
    __resetDictionaryCacheForTests(new Map([['en', new Set(['cat'])]]));
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const result = await fastValidateWord('cat', 'en');

    expect(result).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls /api/validate-word when dictionary is not loaded', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fastValidateWord('cat', 'en');

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/validate-word', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('calls /api/validate-word when word is a dict-miss (community-validated bypass)', async () => {
    __resetDictionaryCacheForTests(new Map([['en', new Set(['cat'])]]));
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fastValidateWord('meow', 'en');

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('returns false when server reports invalid', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: false }),
    }) as unknown as typeof fetch;

    const result = await fastValidateWord('zqxjk', 'en');

    expect(result).toBe(false);
  });

  it('falls back to length>=3 on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    expect(await fastValidateWord('cat', 'en')).toBe(true);
    expect(await fastValidateWord('no', 'en')).toBe(false);
  });

  it('falls back to length>=3 on network throw', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    expect(await fastValidateWord('cat', 'en')).toBe(true);
    expect(await fastValidateWord('no', 'en')).toBe(false);
  });
});
