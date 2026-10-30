import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

type Fn = (...args: unknown[]) => void;
const listeners = new Map<string, Fn[]>();
const fakeSocket = {
  connected: false,
  id: 'sock-1',
  auth: {},
  on: vi.fn((event: string, fn: Fn) => {
    listeners.set(event, [...(listeners.get(event) ?? []), fn]);
  }),
  off: vi.fn((event: string, fn?: Fn) => {
    listeners.set(event, fn ? (listeners.get(event) ?? []).filter((f) => f !== fn) : []);
  }),
  emit: vi.fn(),
  connect: vi.fn(),
};

vi.mock('@/utils/SocketContext', () => ({
  getSharedSocket: () => fakeSocket,
  getSharedSocketIfExists: () => null,
  releaseSharedSocket: vi.fn(),
  getSocketURL: () => 'http://localhost',
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import { useMultiplayerSocket } from '../useMultiplayerSocket';

const noop = () => {};
const options = {
  language: 'en' as const, gameCode: 'ABCD', username: 'Ada', roomName: 'Ada', isActive: true, isHost: false, roomLanguage: 'en' as const,
  onJoined: noop, onUpdateUsers: noop, onActiveRooms: noop, onJoinedAsSpectator: noop, onSpectatorList: noop, onSpectatorUpgraded: noop,
  onError: noop, onGameStart: noop, onGameReset: noop, onHostLeftRoomClosing: noop, onSessionMigrated: noop,
  onRateLimited: noop, onHostTransferred: noop, t: (k: string) => k,
};

describe('useMultiplayerSocket listener ownership on the shared socket', () => {
  it('keeps another component\'s handlers for the same events through mount and unmount', () => {
    const playerStartGame: Fn = vi.fn();
    const playerHostLeft: Fn = vi.fn();
    fakeSocket.on('startGame', playerStartGame);
    fakeSocket.on('hostLeftRoomClosing', playerHostLeft);

    const { unmount } = renderHook(() => useMultiplayerSocket(options));
    expect(listeners.get('startGame')).toContain(playerStartGame);
    expect(listeners.get('startGame')!.length).toBe(2);

    unmount();
    expect(listeners.get('startGame')).toEqual([playerStartGame]);
    expect(listeners.get('hostLeftRoomClosing')).toEqual([playerHostLeft]);
  });
});
