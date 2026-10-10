import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hasInMemory, getStore } = vi.hoisted(() => ({
  hasInMemory: vi.fn(),
  getStore: vi.fn(),
}));

vi.mock('../useDictionaryCache', () => ({ hasWordInMemoryCache: hasInMemory }));
vi.mock('@/lib/offline', () => ({ getOfflineStore: getStore }));
vi.mock('@/lib/offline/dict', () => ({ validateOffline: vi.fn().mockResolvedValue(false) }));

import { fastValidateWord } from '../fastValidateWord';

const okJson = (isValid: boolean) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ isValid }) } as Response);

describe('fastValidateWord when the loaded dictionary lacks the word', () => {
  beforeEach(() => {
    hasInMemory.mockReset();
    getStore.mockReset();
    getStore.mockResolvedValue({});
  });
  afterEach(() => vi.restoreAllMocks());

  it('given an online player, then it asks the server without booting the offline store', async () => {
    hasInMemory.mockReturnValue(false);
    const fetchSpy = okJson(false);
    expect(await fastValidateWord('xqzt', 'en')).toBe(false);
    expect(getStore).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('given an online player and a community word, then the server can still accept it', async () => {
    hasInMemory.mockReturnValue(false);
    okJson(true);
    expect(await fastValidateWord('rizz', 'en')).toBe(true);
  });

  it('given a cold dictionary, then the offline store is still consulted first', async () => {
    hasInMemory.mockReturnValue(null);
    okJson(false);
    await fastValidateWord('hello', 'en');
    expect(getStore).toHaveBeenCalled();
  });
});
