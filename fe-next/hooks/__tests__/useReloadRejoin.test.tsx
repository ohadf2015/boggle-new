/**
 * Reload mid-game must return to the game (baseline `14_*`: after a reload the
 * joiner landed on the room list).
 *
 * Root cause, traced 2026-09-26: `useMultiplayerSession` decides a reload is a
 * fresh, seated reload and calls `onSetAttemptingReconnect(true)` — but
 * PageClient wired that callback to a no-op, and the socket hook only re-emits
 * `join` on a RE-connect (`wasConnectedRef`), never on the first connect after
 * a reload. Nothing emitted `join`, so the page sat on the entry.
 *
 * The fix re-emits the SAME `join` payload the reconnect path uses (pitfall
 * class 3 — one payload through both doors), and must keep the 2026-05-04
 * guard: a reload after LEAVING (session cleared) stays on the entry.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'socket.io-client';

let session: { gameCode?: string; username?: string } | null = null;
vi.mock('@/utils/session', () => ({ getSession: () => session }));

import { useReloadRejoin } from '../useReloadRejoin';
import { buildRejoinPayload } from '@/lib/multiplayer/reloadRejoin';

function fakeSocket(token?: string) {
  return { emit: vi.fn(), auth: token ? { token } : {} } as unknown as Socket & { emit: ReturnType<typeof vi.fn> };
}

describe('buildRejoinPayload — one join payload for reload and reconnect', () => {
  it('carries gameCode + username, and the auth token when the handshake has one', () => {
    expect(buildRejoinPayload({ gameCode: 'AB12CD', username: 'Ana' }, undefined)).toEqual({ gameCode: 'AB12CD', username: 'Ana' });
    expect(buildRejoinPayload({ gameCode: 'AB12CD', username: 'Ana' }, 'tok')).toEqual({ gameCode: 'AB12CD', username: 'Ana', authToken: 'tok' });
  });

  it('returns null without a seated session (left the room / never joined)', () => {
    expect(buildRejoinPayload(null, 'tok')).toBeNull();
    expect(buildRejoinPayload({ username: 'Ana' }, undefined)).toBeNull();
    expect(buildRejoinPayload({ gameCode: 'AB12CD' }, undefined)).toBeNull();
  });
});

describe('useReloadRejoin', () => {
  beforeEach(() => { session = null; });

  it('reload while seated: re-emits join for the saved room once connected', () => {
    session = { gameCode: 'AB12CD', username: 'Ana' };
    const socket = fakeSocket('tok');
    const done = vi.fn();
    const onRejoining = vi.fn();
    renderHook(() => useReloadRejoin({ pending: true, socket, isConnected: true, isActive: false, onSettled: done, onRejoining }));
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('join', { gameCode: 'AB12CD', username: 'Ana', authToken: 'tok' });
    expect(onRejoining).toHaveBeenCalled();
    expect(done).toHaveBeenCalled();
  });

  it('reload after leaving: the session was cleared, so it stays on the entry', () => {
    session = { username: 'Ana' }; // clearSessionPreservingUsername kept only the name
    const socket = fakeSocket();
    const done = vi.fn();
    renderHook(() => useReloadRejoin({ pending: true, socket, isConnected: true, isActive: false, onSettled: done }));
    expect(socket.emit).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalled();
  });

  it('waits for the socket to connect before emitting', () => {
    session = { gameCode: 'AB12CD', username: 'Ana' };
    const socket = fakeSocket();
    const { rerender } = renderHook(
      ({ connected }) => useReloadRejoin({ pending: true, socket, isConnected: connected, isActive: false, onSettled: vi.fn() }),
      { initialProps: { connected: false } },
    );
    expect(socket.emit).not.toHaveBeenCalled();
    rerender({ connected: true });
    expect(socket.emit).toHaveBeenCalledWith('join', { gameCode: 'AB12CD', username: 'Ana' });
  });

  it('does nothing when not pending or already in the room', () => {
    session = { gameCode: 'AB12CD', username: 'Ana' };
    const socket = fakeSocket();
    renderHook(() => useReloadRejoin({ pending: false, socket, isConnected: true, isActive: false, onSettled: vi.fn() }));
    renderHook(() => useReloadRejoin({ pending: true, socket, isConnected: true, isActive: true, onSettled: vi.fn() }));
    expect(socket.emit).not.toHaveBeenCalled();
  });
});
