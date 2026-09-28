import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/lib/offline/dictionaryDownload', () => ({
  createIdbStores: () => ({ blobStore: {}, keyStore: {} }),
  loadOfflineDictionary: async () => null,
}));

vi.mock('@/lib/dictionary/buildWordSet', () => ({
  buildWordSet: async (words: string[]) => new Set(words),
}));

import { useDictionaryCache, __resetDictionaryCacheForTests } from '../useDictionaryCache';

describe('useDictionaryCache defers network on heavy game paths', () => {
  beforeEach(() => {
    __resetDictionaryCacheForTests();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not fetch dictionary-words on /en/singleplayer mount', () => {
    window.history.pushState({}, '', '/en/singleplayer');
    renderHook(() => useDictionaryCache('en'));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches on a non-game path', async () => {
    window.history.pushState({}, '', '/en/blog');
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'cat\ndog\n',
      clone() { return this; },
    });
    renderHook(() => useDictionaryCache('en'));
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
