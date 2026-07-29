import { describe, it, expect, vi } from 'vitest';
import { warmDictionaryCache } from '../warmDictionary';

describe('warmDictionaryCache', () => {
  it('fetches the active-locale dictionary URL when online and not yet cached', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true } as Response);
    const isCached = vi.fn().mockResolvedValue(false);

    const result = await warmDictionaryCache('he', { fetchFn, isOnline: () => true, isCached });

    expect(result).toBe('warmed');
    expect(fetchFn).toHaveBeenCalledWith('/api/dictionary-words?lang=he', expect.anything());
  });

  it('skips the fetch when offline (nothing to warm, would only error)', async () => {
    const fetchFn = vi.fn();
    const result = await warmDictionaryCache('en', { fetchFn, isOnline: () => false });
    expect(result).toBe('offline');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('skips the fetch when the dictionary is already in the SW cache (no re-download per navigation)', async () => {
    const fetchFn = vi.fn();
    const isCached = vi.fn().mockResolvedValue(true);

    const result = await warmDictionaryCache('en', { fetchFn, isOnline: () => true, isCached });

    expect(result).toBe('already-cached');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('never throws — a flaky warm fetch must not break mount', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const isCached = vi.fn().mockResolvedValue(false);

    const result = await warmDictionaryCache('es', { fetchFn, isOnline: () => true, isCached });

    expect(result).toBe('error');
  });
});
