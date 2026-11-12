import React from 'react';
import { fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn(async () => ({ ok: true as const, data: { challengeId: 'c', roomCode: 'ROOM' } })));
vi.mock('@/lib/friends/sendChallengeWithAck', () => ({ sendChallengeWithAck: send }));
vi.mock('@/components/multiplayer/useQuickPlay', () => ({ generateGameCode: () => 'ROOM' }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

import { useMpFriendInvite, type MpFriendInviteArgs } from '../useMpFriendInvite';
import { trackGrowthEvent } from '@/utils/growthTracking';

const socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
const base = (over: Partial<MpFriendInviteArgs> = {}): MpFriendInviteArgs => ({
  inviteUserId: 'pal-id',
  roomParam: null,
  isAuthenticated: true,
  socket: socket as unknown as MpFriendInviteArgs['socket'],
  isConnected: true,
  isActive: false,
  isHost: false,
  gameCode: '',
  hostName: 'Ohad',
  language: 'he',
  t: (k: string) => k,
  handleJoin: vi.fn(),
  setGameCode: vi.fn(),
  setRoomName: vi.fn(),
  setHostUsername: vi.fn(),
  setUsername: vi.fn(),
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('useMpFriendInvite (?invite=<friendUserId>)', () => {
  it('Given a signed-in player with a socket, Then creates a room as host exactly once', () => {
    const args = base();
    const { rerender } = renderHook((p: MpFriendInviteArgs) => useMpFriendInvite(p), { initialProps: args });
    rerender({ ...args });
    expect(args.handleJoin).toHaveBeenCalledTimes(1);
    expect(args.handleJoin).toHaveBeenCalledWith(true, 'he', 'ROOM', 'Ohad Room', 'Ohad');
    expect(args.setGameCode).toHaveBeenCalledWith('ROOM');
  });

  it('Given the room is up and I host it, Then the friend gets one join_room invite to it', async () => {
    const args = base();
    const { rerender } = renderHook((p: MpFriendInviteArgs) => useMpFriendInvite(p), { initialProps: args });
    rerender({ ...args, isActive: true, isHost: true, gameCode: 'ROOM' });
    rerender({ ...args, isActive: true, isHost: true, gameCode: 'ROOM' });
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(socket, { friendUserId: 'pal-id', challengeType: 'join_room', roomCode: 'ROOM' });
    await waitFor(() => expect(trackGrowthEvent).toHaveBeenCalledWith('friend_invite_sent', { surface: 'home_invite' }));
  });

  it('Given a guest, Then nothing happens', () => {
    const args = base({ isAuthenticated: false });
    renderHook(() => useMpFriendInvite(args));
    expect(args.handleJoin).not.toHaveBeenCalled();
  });

  it('Given no invite param, or already in a room, Then nothing happens', () => {
    const a = base({ inviteUserId: null });
    renderHook(() => useMpFriendInvite(a));
    const b = base({ isActive: true, gameCode: 'OTHER' });
    renderHook(() => useMpFriendInvite(b));
    expect(a.handleJoin).not.toHaveBeenCalled();
    expect(b.handleJoin).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('Given no name yet or socket not connected, Then waits', () => {
    const a = base({ hostName: '' });
    renderHook(() => useMpFriendInvite(a));
    const b = base({ isConnected: false });
    renderHook(() => useMpFriendInvite(b));
    expect(a.handleJoin).not.toHaveBeenCalled();
    expect(b.handleJoin).not.toHaveBeenCalled();
  });

  it('Given the room was just requested, Then ?invite= is stripped at once so a reload cannot open another room', () => {
    window.history.replaceState(null, '', '/he/multiplayer?invite=pal-id&mode=classic');
    renderHook(() => useMpFriendInvite(base()));
    expect(window.location.search).toBe('?mode=classic');
  });

  it('Given a ?room= in the URL, Then the invite param is ignored', () => {
    const args = base({ roomParam: 'JOINME' });
    renderHook(() => useMpFriendInvite(args));
    expect(args.handleJoin).not.toHaveBeenCalled();
  });

  it('Given the invite send fails, Then an error toast offers Retry, which sends again', async () => {
    send.mockResolvedValueOnce({ ok: false, code: 'SERVER_ERROR' } as never);
    const args = base();
    const { rerender } = renderHook((p: MpFriendInviteArgs) => useMpFriendInvite(p), { initialProps: args });
    rerender({ ...args, isActive: true, isHost: true, gameCode: 'ROOM' });
    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    const content = toastMock.error.mock.calls[0][0] as (tt: { id: string }) => React.ReactElement;
    const { getByRole } = render(content({ id: 'x' }));
    fireEvent.click(getByRole('button', { name: 'common.retry' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(toastMock.dismiss).toHaveBeenCalledWith('x');
  });

  it('Given the router drops ?invite= after the strip, Then the friend still gets the invite', async () => {
    const args = base();
    const { rerender } = renderHook((p: MpFriendInviteArgs) => useMpFriendInvite(p), { initialProps: args });
    rerender({ ...args, inviteUserId: null, isActive: true, isHost: true, gameCode: 'ROOM' });
    await waitFor(() => expect(send).toHaveBeenCalledWith(socket, { friendUserId: 'pal-id', challengeType: 'join_room', roomCode: 'ROOM' }));
  });
});
