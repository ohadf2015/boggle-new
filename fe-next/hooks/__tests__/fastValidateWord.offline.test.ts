import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hasInMemory } = vi.hoisted(() => ({
  hasInMemory: vi.fn(),
}));

vi.mock('../useDictionaryCache', () => ({
  hasWordInMemoryCache: hasInMemory,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

import { fastValidateWord } from '../fastValidateWord';
import { getOfflineStore, __resetOfflineStore } from '@/lib/offline';
import { loadDictWords } from '@/lib/offline/dict';

describe('fastValidateWord with offline dict', () => {
  beforeEach(async () => {
    hasInMemory.mockReset();
    hasInMemory.mockReturnValue(null);
    await __resetOfflineStore();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await __resetOfflineStore();
  });

  it('returns true from memory cache without consulting offline dict or network', async () => {
    hasInMemory.mockReturnValue(true);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await fastValidateWord('hello', 'en')).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns true from offline dict when memory misses and word is loaded locally', async () => {
    hasInMemory.mockReturnValue(null);
    const store = await getOfflineStore();
    await loadDictWords(store, 'en', ['lexiclash']);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await fastValidateWord('lexiclash', 'en')).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls through to network when memory and offline dict both miss', async () => {
    hasInMemory.mockReturnValue(null);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ isValid: true }), { status: 200 }),
    );
    expect(await fastValidateWord('communitysubmitted', 'en')).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns permissive length-based result when offline dict misses and network fails', async () => {
    hasInMemory.mockReturnValue(null);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'));
    expect(await fastValidateWord('zzzqx', 'en')).toBe(true);
    expect(await fastValidateWord('zz', 'en')).toBe(false);
  });
});
