import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * TDD RED: the "Reconnecting..." toast has `duration: Infinity` and is dismissed
 * ONLY when a reconnect SUCCEEDS. If reconnection gives up (isReconnecting flips
 * false while still disconnected) the toast sticks on screen forever — it blocks
 * the UI and reads as a "stuck notification". The hook must dismiss it on the
 * gave-up transition and surface a terminal error instead.
 */

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

import { useConnectionToasts } from '../useConnectionToasts';

describe('useConnectionToasts — reconnect failure dismisses the stuck toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
  });

  it('dismisses the infinite "Reconnecting..." toast when reconnection gives up', () => {
    const { rerender } = renderHook(() => useConnectionToasts());

    // connected → reconnecting (shows the duration:Infinity loading toast)
    socketState = { isConnected: false, isReconnecting: true, connectionError: null };
    rerender();
    expect(toastMock.loading).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'connection-reconnecting' }),
    );

    toastMock.dismiss.mockClear();

    // reconnecting → gave up (still disconnected, no longer reconnecting)
    socketState = { isConnected: false, isReconnecting: false, connectionError: 'failed' };
    rerender();

    // the stuck reconnecting toast must be dismissed
    expect(toastMock.dismiss).toHaveBeenCalledWith('reconnecting-id');
    // and a terminal failure toast surfaced
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'connection-failed' }),
    );
  });

  it('still dismisses + celebrates on a successful reconnect (no regression)', () => {
    const { rerender } = renderHook(() => useConnectionToasts());

    socketState = { isConnected: false, isReconnecting: true, connectionError: null };
    rerender();
    toastMock.dismiss.mockClear();

    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();

    expect(toastMock.dismiss).toHaveBeenCalledWith('reconnecting-id');
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'connection-reconnected' }),
    );
  });
});
