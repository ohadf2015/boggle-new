import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * A cold load of /multiplayer is not a reconnect.
 *
 * The hook mounts while the shared socket is still connecting
 * (isConnected: false), and the socket connects a beat later. The
 * false → true flip used to fire the "We're back!" toast — with no drop, no
 * "lost" toast before it, nothing to come back from. The gauntlet capture
 * caught it on the Hebrew phone entry ("חזרנו!" over the LEXICLASH wordmark).
 * "We're back" is only true after the player was told the link went away.
 */

const toastMock = vi.hoisted(() => ({
  loading: vi.fn(() => 'reconnecting-id'),
  error: vi.fn(() => 'error-id'),
  success: vi.fn(() => 'success-id'),
  dismiss: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

let socketState: { isConnected: boolean; isReconnecting: boolean; connectionError: string | null };
vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => socketState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import { useConnectionToasts } from '../useConnectionToasts';

describe('useConnectionToasts — the first connect is not a reconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays silent when the socket connects for the first time after mount', () => {
    // Given the page mounts before the shared socket has connected
    socketState = { isConnected: false, isReconnecting: false, connectionError: null };
    const { rerender } = renderHook(() => useConnectionToasts());

    // When the socket connects
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();

    // Then no toast of any kind is shown
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(toastMock.loading).not.toHaveBeenCalled();
  });

  it('stays silent when a transient websocket error precedes the first connect', () => {
    // Given the first websocket attempt errors (socket.io falls back and retries)
    socketState = { isConnected: false, isReconnecting: false, connectionError: null };
    const { rerender } = renderHook(() => useConnectionToasts());
    socketState = { isConnected: false, isReconnecting: false, connectionError: 'websocket error' };
    rerender();

    // When the retry connects
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();

    // Then nothing was lost from the player's point of view
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('stays silent when it mounts mid-reconnect and the reconnect lands (nothing was shown)', () => {
    // Given the hook mounts while the socket is already reconnecting
    socketState = { isConnected: false, isReconnecting: true, connectionError: null };
    const { rerender } = renderHook(() => useConnectionToasts());

    // When the reconnect lands
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();

    // Then there is no "We're back!" for a loss the player never saw
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('still celebrates a reconnect after the player was told the connection was lost', () => {
    // Given a connected page
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    const { rerender } = renderHook(() => useConnectionToasts());

    // When the link drops (the "lost" toast shows) and then comes back
    socketState = { isConnected: false, isReconnecting: false, connectionError: null };
    rerender();
    expect(toastMock.error).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'connection-lost' }));
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();

    // Then "We're back!" fires exactly once
    expect(toastMock.success).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'connection-reconnected' }));
  });

  it('celebrates each real drop once, and the connect that follows a celebrated one stays quiet', () => {
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    const { rerender } = renderHook(() => useConnectionToasts());

    // First drop → back
    socketState = { isConnected: false, isReconnecting: true, connectionError: null };
    rerender();
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();
    expect(toastMock.success).toHaveBeenCalledTimes(1);

    // A re-render while still connected must not repeat it
    socketState = { isConnected: true, isReconnecting: false, connectionError: 'stale' };
    rerender();
    expect(toastMock.success).toHaveBeenCalledTimes(1);

    // Second drop → back celebrates again
    socketState = { isConnected: false, isReconnecting: false, connectionError: null };
    rerender();
    socketState = { isConnected: true, isReconnecting: false, connectionError: null };
    rerender();
    expect(toastMock.success).toHaveBeenCalledTimes(2);
  });
});
