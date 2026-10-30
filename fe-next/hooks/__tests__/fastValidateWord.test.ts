/**
 * Tests for fastValidateWord — client-side word validation that short-circuits
 * on an in-memory dictionary hit to skip the /api/validate-word round-trip.
 *
 * Contract:
 *  - If the dictionary is loaded AND the word is a hit → return true, skip fetch.
 *  - Otherwise POST /api/validate-word and return data.isValid.
 *  - On network error / non-ok response → null (unknown), never a credit
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

  it('returns unknown (null) on a non-ok response such as a 429', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    expect(await fastValidateWord('cat', 'en')).toBeNull();
  });

  it('returns unknown (null) on a network throw', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    expect(await fastValidateWord('cat', 'en')).toBeNull();
  });

  it('bounds the request with a timeout signal', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ isValid: true }) });
    global.fetch = spy as unknown as typeof fetch;

    await fastValidateWord('cat', 'en');
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
