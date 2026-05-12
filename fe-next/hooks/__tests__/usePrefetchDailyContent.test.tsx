import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useOfflineModeFlag', () => ({ useOfflineModeFlag: vi.fn(() => false) }));
vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: vi.fn(() => ({ online: true, slow: false, type: 'wifi', rttMs: null })),
}));
vi.mock('@/lib/offline', () => ({ getOfflineStore: vi.fn(() => Promise.resolve({})) }));
vi.mock('@/lib/offline/prefetchDaily', () => ({
  prefetchDailyPuzzles: vi.fn(() => Promise.resolve({ stored: 0, skipped: false })),
}));

import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { useNetworkState } from '@/hooks/useNetworkState';
import { getOfflineStore } from '@/lib/offline';
import { prefetchDailyPuzzles } from '@/lib/offline/prefetchDaily';
import { usePrefetchDailyContent } from '../usePrefetchDailyContent';

function setOffline(offline: boolean) {
  vi.mocked(useNetworkState).mockReturnValue({
    online: !offline,
    slow: false,
    type: offline ? 'none' : 'wifi',
    rttMs: null,
  });
}

function setFlag(enabled: boolean) {
  vi.mocked(useOfflineModeFlag).mockReturnValue(enabled);
}

describe('usePrefetchDailyContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setFlag(true);
    setOffline(false);
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('calls prefetchDailyPuzzles on mount when flag on and online', async () => {
    const { unmount } = renderHook(() => usePrefetchDailyContent({ language: 'en' }));
    await vi.waitFor(() => expect(prefetchDailyPuzzles).toHaveBeenCalledOnce());
    expect(prefetchDailyPuzzles).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'en' }),
    );
    unmount();
  });

  it('does not prefetch when offline', async () => {
    setOffline(true);
    renderHook(() => usePrefetchDailyContent({ language: 'en' }));
    await vi.waitFor(() => expect(getOfflineStore).not.toHaveBeenCalled());
    expect(prefetchDailyPuzzles).not.toHaveBeenCalled();
  });

  it('does not prefetch when flag is off', async () => {
    setFlag(false);
    renderHook(() => usePrefetchDailyContent({ language: 'en' }));
    await vi.waitFor(() => expect(getOfflineStore).not.toHaveBeenCalled());
    expect(prefetchDailyPuzzles).not.toHaveBeenCalled();
  });

  it('passes the store returned by getOfflineStore to prefetchDailyPuzzles', async () => {
    const fakeStore = { sql: {}, kv: {} };
    vi.mocked(getOfflineStore).mockResolvedValue(fakeStore as never);

    renderHook(() => usePrefetchDailyContent({ language: 'he' }));
    await vi.waitFor(() => expect(prefetchDailyPuzzles).toHaveBeenCalled());

    expect(prefetchDailyPuzzles).toHaveBeenCalledWith(
      expect.objectContaining({ store: fakeStore, language: 'he' }),
    );
  });

  it('does not throw when prefetchDailyPuzzles rejects', async () => {
    vi.mocked(prefetchDailyPuzzles).mockRejectedValue(new Error('network'));
    expect(() =>
      renderHook(() => usePrefetchDailyContent({ language: 'en' })),
    ).not.toThrow();
  });
});
