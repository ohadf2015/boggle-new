// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

type Fn = (...args: unknown[]) => void;
const listeners = new Map<string, Fn[]>();
const fakeSocket = {
  connected: false, id: 'sock-1', auth: {},
  on: vi.fn((event: string, fn: Fn) => { listeners.set(event, [...(listeners.get(event) ?? []), fn]); }),
  off: vi.fn((event: string, fn?: Fn) => { listeners.set(event, fn ? (listeners.get(event) ?? []).filter((f) => f !== fn) : []); }),
  emit: vi.fn(), connect: vi.fn(),
};
const fire = (event: string, data?: unknown) => act(() => (listeners.get(event) ?? []).forEach((fn) => fn(data)));

vi.mock('@/utils/SocketContext', () => ({
  getSharedSocket: () => fakeSocket,
  getSharedSocketIfExists: () => null,
  releaseSharedSocket: vi.fn(),
  getSocketURL: () => 'http://localhost',
}));
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

import { useMultiplayerSocket } from '../useMultiplayerSocket';

const noop = () => {};
const onHostLeftRoomClosing = vi.fn();
const options = {
  language: 'en' as const, gameCode: 'ABCD', username: 'Ada', roomName: 'Ada', isActive: true, isHost: false, roomLanguage: 'en' as const,
  onJoined: noop, onUpdateUsers: noop, onActiveRooms: noop, onJoinedAsSpectator: noop, onSpectatorList: noop, onSpectatorUpgraded: noop,
  onError: noop, onGameStart: noop, onGameReset: noop, onHostLeftRoomClosing, onSessionMigrated: noop,
  onRateLimited: noop, onHostTransferred: noop, t: (k: string) => `t:${k}`,
};

describe('a kicked player gets the page banner and its exit, never a hard reload', () => {
  beforeEach(() => { listeners.clear(); vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('hands the banner a kicked notice with the translated reason', () => {
    renderHook(() => useMultiplayerSocket(options));
    fire('kicked', { reason: 'host' });
    expect(onHostLeftRoomClosing).toHaveBeenCalledWith({ kicked: 'host', message: 't:hostView.youWereKicked' });
  });

  it('keeps the AFK wording for an inactive kick', () => {
    renderHook(() => useMultiplayerSocket(options));
    fire('kicked', { reason: 'inactive' });
    expect(onHostLeftRoomClosing).toHaveBeenCalledWith({ kicked: 'inactive', message: 't:hostView.youWereKickedInactive' });
  });

  it('does not reload the page or stack a toast over the banner', () => {
    renderHook(() => useMultiplayerSocket(options));
    const timersBefore = vi.getTimerCount();
    fire('kicked', { reason: 'host' });
    expect(vi.getTimerCount()).toBe(timersBefore);
    expect(toastMock.error).not.toHaveBeenCalled();
  });
});
