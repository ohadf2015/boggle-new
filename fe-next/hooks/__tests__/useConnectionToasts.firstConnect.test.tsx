import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const toastMock = vi.hoisted(() => ({
  loading: vi.fn(() => 'reconnecting-id'),
  error: vi.fn(() => 'error-id'),
  success: vi.fn(() => 'success-id'),
  dismiss: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

// Mutable connection state the mocked context reads each render.
let socketState: { isConnected: boolean; isReconnecting: boolean; connectionError: string | null };
vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => socketState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import { useConnectionToasts } from '@/hooks/useConnectionToasts';

describe('useConnectionToasts — first connect is not a reconnect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('given a fresh page, when the socket connects for the first time, then no "we\'re back" toast shows', () => {
    socketState = { isConnected: false, isReconnecting: false, connectionError: null };
    const { rerender } = renderHook(() => useConnectionToasts());
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('given a dropped connection, when it comes back, then the reconnect is still celebrated', () => {
    socketState = { isConnected: false, isReconnecting: false, connectionError: null };
    const { rerender } = renderHook(() => useConnectionToasts());
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();
    socketState = { isConnected: false, isReconnecting: true, connectionError: null };
    rerender();
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();
    expect(toastMock.success).toHaveBeenCalledTimes(1);
  });
});
