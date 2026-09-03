import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/useDictionaryCache', () => ({
  hasWordInMemoryCache: vi.fn(),
}));
vi.mock('@/hooks/fastValidateWord', () => ({
  tryValidateOffline: vi.fn(),
}));

import { hasWordInMemoryCache } from '@/hooks/useDictionaryCache';
import { tryValidateOffline } from '@/hooks/fastValidateWord';
import { dictCheck } from '../dictCheck';

describe('sealed-bid dictCheck (offline-first)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns true from the in-memory dictionary with no network', async () => {
    vi.mocked(hasWordInMemoryCache).mockReturnValue(true);
    await expect(dictCheck('bingo', 'en')).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns true from the offline store with no network', async () => {
    vi.mocked(hasWordInMemoryCache).mockReturnValue(null);
    vi.mocked(tryValidateOffline).mockResolvedValue(true);
    await expect(dictCheck('rack', 'en')).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('falls back to the live API only when both local paths miss', async () => {
    vi.mocked(hasWordInMemoryCache).mockReturnValue(false);
    vi.mocked(tryValidateOffline).mockResolvedValue(false);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    } as Response);
    await expect(dictCheck('unique', 'en')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalled();
  });

  it('fails closed when offline and the word is in neither cache', async () => {
    vi.mocked(hasWordInMemoryCache).mockReturnValue(false);
    vi.mocked(tryValidateOffline).mockResolvedValue(false);
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    await expect(dictCheck('zzzz', 'en')).resolves.toBe(false);
  });
});
