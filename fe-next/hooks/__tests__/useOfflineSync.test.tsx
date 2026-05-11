import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { onlineMock, flagMock, syncMock, toastSuccess, toastInfo } = vi.hoisted(() => ({
  onlineMock: vi.fn(),
  flagMock: vi.fn(),
  syncMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({ online: onlineMock(), slow: false, type: 'wifi', rttMs: null }),
}));

vi.mock('@/hooks/useOfflineModeFlag', () => ({
  useOfflineModeFlag: () => flagMock(),
}));

vi.mock('@/lib/offline/sync', () => ({
  syncQueueViaApi: syncMock,
}));

vi.mock('@/lib/offline', () => ({
  getOfflineStore: vi.fn(async () => ({})),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
    info: toastInfo,
  },
}));

import { useOfflineSync } from '../useOfflineSync';

describe('useOfflineSync', () => {
  beforeEach(() => {
    onlineMock.mockReset();
    flagMock.mockReset();
    syncMock.mockReset();
    toastSuccess.mockReset();
    toastInfo.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not call sync when flag is off', async () => {
    flagMock.mockReturnValue(false);
    onlineMock.mockReturnValue(true);
    renderHook(() => useOfflineSync());
    await new Promise((r) => setTimeout(r, 0));
    expect(syncMock).not.toHaveBeenCalled();
  });

  it('does not call sync when already online from the start (no offline transition)', async () => {
    flagMock.mockReturnValue(true);
    onlineMock.mockReturnValue(true);
    renderHook(() => useOfflineSync());
    await new Promise((r) => setTimeout(r, 0));
    expect(syncMock).not.toHaveBeenCalled();
  });

  it('calls sync on offline → online transition when flag is on', async () => {
    flagMock.mockReturnValue(true);
    onlineMock.mockReturnValue(false);
    syncMock.mockResolvedValue({ accepted: 0, rejected: 0, rejectedWordCount: 0, skipped: 0 });

    const { rerender } = renderHook(() => useOfflineSync());
    await act(async () => {
      onlineMock.mockReturnValue(true);
      rerender();
    });
    await waitFor(() => expect(syncMock).toHaveBeenCalledTimes(1));
  });

  it('renders success toast when at least one submission accepted', async () => {
    flagMock.mockReturnValue(true);
    onlineMock.mockReturnValue(false);
    syncMock.mockResolvedValue({ accepted: 2, rejected: 0, rejectedWordCount: 0, skipped: 0 });

    const { rerender } = renderHook(() => useOfflineSync());
    await act(async () => {
      onlineMock.mockReturnValue(true);
      rerender();
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));
  });

  it('renders info toast about adjustment when rejectedWordCount > 0', async () => {
    flagMock.mockReturnValue(true);
    onlineMock.mockReturnValue(false);
    syncMock.mockResolvedValue({ accepted: 1, rejected: 0, rejectedWordCount: 3, skipped: 0 });

    const { rerender } = renderHook(() => useOfflineSync());
    await act(async () => {
      onlineMock.mockReturnValue(true);
      rerender();
    });
    await waitFor(() =>
      expect(toastInfo).toHaveBeenCalledWith(expect.stringContaining('offline.sync.adjusted')),
    );
  });

  it('renders no toast when sync returned nothing to report', async () => {
    flagMock.mockReturnValue(true);
    onlineMock.mockReturnValue(false);
    syncMock.mockResolvedValue({ accepted: 0, rejected: 0, rejectedWordCount: 0, skipped: 0 });

    const { rerender } = renderHook(() => useOfflineSync());
    await act(async () => {
      onlineMock.mockReturnValue(true);
      rerender();
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastInfo).not.toHaveBeenCalled();
  });
});
