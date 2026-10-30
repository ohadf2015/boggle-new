import { readPlayerGameEventsSource } from '@/player/hooks/socket/__tests__/playerGameEventsSource';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
const onSessionMigrated = vi.fn();
const onRateLimited = vi.fn();
const options = {
  language: 'en' as const, gameCode: 'ABCD', username: 'Ada', roomName: 'Ada', isActive: true, isHost: true, roomLanguage: 'en' as const,
  onJoined: noop, onUpdateUsers: noop, onActiveRooms: noop, onJoinedAsSpectator: noop, onSpectatorList: noop, onSpectatorUpgraded: noop,
  onError: noop, onGameStart: noop, onGameReset: noop, onHostLeftRoomClosing: noop, onSessionMigrated,
  onRateLimited, onHostTransferred: noop, t: (k: string) => `t:${k}`,
};

describe('useMultiplayerSocket owns the session and rate-limit toasts', () => {
  beforeEach(() => { listeners.clear(); vi.clearAllMocks(); });

  it('a tab takeover shows one translated "moved to another tab" toast, for hosts too', () => {
    renderHook(() => useMultiplayerSocket(options));
    fire('sessionTakenOver', { message: 'Your session was moved to another tab', gameCode: 'ABCD' });
    expect(onSessionMigrated).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0][0]).toBe('t:playerView.sessionMovedToAnotherTab');
  });

  it('a migrated session shows the translated message, not the server English', () => {
    renderHook(() => useMultiplayerSocket(options));
    fire('sessionMigrated', { message: 'Your session was moved to another tab' });
    expect(toastMock.mock.calls[0][0]).toBe('t:playerView.sessionMovedToAnotherTab');
  });

  it('rate limiting reuses the shared toast id so it never stacks', () => {
    renderHook(() => useMultiplayerSocket(options));
    fire('rateLimited');
    expect(toastMock.error).toHaveBeenCalledWith('t:errors.rateLimited', expect.objectContaining({ id: 'mp-rate-limited' }));
    expect(onRateLimited).toHaveBeenCalledTimes(1);
  });
});

describe('no second owner toasts the same events', () => {
  const room = readFileSync(resolve(__dirname, '../../app/[locale]/multiplayer/useMpRoomSocket.ts'), 'utf8');
  const player = readFileSync(resolve(__dirname, '../../player/hooks/socket/usePlayerSessionEvents.ts'), 'utf8');
  const body = (src: string, from: string, len = 400) => src.slice(src.indexOf(from), src.indexOf(from) + len);

  it('useMpRoomSocket only updates state on session-migrated and rate-limited', () => {
    expect(body(room, 'onSessionMigrated:', 260)).not.toMatch(/toast/);
    expect(body(room, 'onRateLimited:', 200)).not.toMatch(/toast/);
  });

  it('the player view no longer toasts takeover, migration or rate limits', () => {
    expect(player).not.toMatch(/sessionMovedTo/);
    expect(player).toMatch(/socket\.on\('sessionTakenOver', handleSessionMoved\)/);
    expect(player).not.toMatch(/socket\.on\('rateLimited'/);
  });
});

describe('host-left has one owner: the page banner', () => {
  const hook = readFileSync(resolve(__dirname, '../useMultiplayerSocket.ts'), 'utf8');
  const playerGame = readPlayerGameEventsSource();

  it('the page socket hook hands the message to the banner without a second toast', () => {
    const start = hook.indexOf("listen('hostLeftRoomClosing'");
    const handler = hook.slice(start, hook.indexOf('});', start));
    expect(handler).not.toMatch(/toast/);
    expect(handler).toMatch(/onHostLeftRoomClosing/);
  });

  it('the player view never toasts or reloads the page on host-left', () => {
    expect(playerGame).not.toMatch(/createHostLeftRoomClosingHandler/);
  });
});
