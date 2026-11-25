/**
 * A cold arcade join to a room that no longer exists (GAME_NOT_FOUND, mostly
 * old room links) hands the entry screen a one-tap Quick Play offer instead of
 * only saying the room is gone. A classroom student, a host, and a player who
 * was already in the room keep their existing paths.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Options = {
  onError: (d: { code?: string; message?: string; details?: { gameCode?: string } }) => void;
  onJoined: (d: { isHost: boolean; gameCode: string }) => void;
};
let captured: Options | null = null;
vi.mock('@/hooks/useMultiplayerSocket', () => ({
  useMultiplayerSocket: (opts: Options) => {
    captured = opts;
    return {
      socket: { emit: vi.fn() }, isConnected: true, roomsLoading: false, attemptingReconnect: false,
      setAttemptingReconnect: vi.fn(), refreshRooms: vi.fn(), signalIntentionalLeave: vi.fn(),
      isPaused: false, pauseGame: vi.fn(), resumeGame: vi.fn(), extendTime: vi.fn(), endRoundNow: vi.fn(),
      skipTargetWord: vi.fn(), classroomAccessibility: null, classroomLive: null,
      classroomLevel: 'core', classroomWordBank: [],
    };
  },
}));
const { clearSession, forgetStoredRoom } = vi.hoisted(() => ({ clearSession: vi.fn(), forgetStoredRoom: vi.fn() }));
vi.mock('@/utils/session', () => ({
  saveSession: vi.fn(), clearSession, clearSessionPreservingUsername: vi.fn(), forgetStoredRoom,
}));
vi.mock('@/utils/profileStorage', () => ({ setStoredUsername: vi.fn() }));
const { trackGrowthEvent, toast } = vi.hoisted(() => ({
  trackGrowthEvent: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackInviteRoomDead: vi.fn(), trackInviteConsumed: vi.fn(),
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));
vi.mock('react-hot-toast', () => ({ default: toast }));

import { useMpRoomSocket, type MpRoomSocketContext } from '../useMpRoomSocket';
import type { ClassroomContext } from '@/lib/education/classroomRoomGone';
import { markRoomEndedRecoveryAccepted, resetRoomEndedRecoveryForTests } from '@/lib/multiplayer/roomEndedRecovery';
import { setRejoinIntent, clearRejoinIntent } from '@/utils/socketRejoin';

function ctx(context: ClassroomContext, overrides: Partial<MpRoomSocketContext> = {}, isHost = false): MpRoomSocketContext {
  return {
    language: 'en', gameCode: 'ABC123', username: 'me', roomName: '', isActive: false, isHost,
    roomLanguage: null, prefilledRoomCode: '', t: (k: string) => k,
    setIsHost: vi.fn(), setIsActive: vi.fn(), setIsPrivate: vi.fn(), setRoomVisibility: vi.fn(), setError: vi.fn(), setIsJoining: vi.fn(),
    setShouldAutoJoin: vi.fn(), setPrefilledRoomCode: vi.fn(), setRoomLanguage: vi.fn(), setUsername: vi.fn(),
    setGameCode: vi.fn(), setRoomName: vi.fn(), setActiveRooms: vi.fn(), setIsSpectator: vi.fn(), setSpectators: vi.fn(),
    setPlayersInRoom: vi.fn(), setPlayersInRoomThrottled: Object.assign(vi.fn(), { cancel: vi.fn() }),
    setPendingGameStart: vi.fn(), setGameStartTime: vi.fn(), setShowResults: vi.fn(), setResultsData: vi.fn(),
    setHostLeftState: vi.fn(), onMatchStart: vi.fn(), roomWaitHold: vi.fn(),
    classroomContext: context,
    classroomDecisionRef: { current: { context, isHost } },
    exitClassroomStudentToHub: vi.fn(),
    offerQuickPlayRecovery: vi.fn(),
    ...overrides,
  };
}

const recoveryCalls = () => trackGrowthEvent.mock.calls.filter(([name]) => name === 'mp_room_gone_recovery');

describe('useMpRoomSocket — dead room → one-tap Quick Play', () => {
  beforeEach(() => {
    captured = null;
    trackGrowthEvent.mockClear();
    toast.mockClear();
    resetRoomEndedRecoveryForTests();
    clearSession.mockClear();
    forgetStoredRoom.mockClear();
    clearRejoinIntent();
  });

  it('GIVEN the same dead code answers again THEN the offer shows once and later replies only toast', () => {
    const c = ctx('arcade');
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND', details: { gameCode: 'ABC123' } }); });
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND', details: { gameCode: 'ABC123' } }); });
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND', details: { gameCode: 'ABC123' } }); });

    expect(c.offerQuickPlayRecovery).toHaveBeenCalledTimes(1);
    expect(recoveryCalls()).toHaveLength(1);
  });

  it('GIVEN the player now sits in another room WHEN a stale rejoin of the old room is refused THEN only the stored old room is dropped', () => {
    const c = ctx('arcade', { gameCode: 'NEW111', isActive: true });
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND', details: { gameCode: 'OLD999' } }); });

    expect(forgetStoredRoom).toHaveBeenCalledWith('OLD999');
    expect(clearSession).not.toHaveBeenCalled();
    expect(c.offerQuickPlayRecovery).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(c.setIsActive).not.toHaveBeenCalled();
    expect(c.setGameCode).not.toHaveBeenCalled();
  });

  it('GIVEN a join to a new room is in flight WHEN the old stored room answers dead first THEN the new join is left running', () => {
    setRejoinIntent({ gameCode: 'NEW111', username: 'me' });
    const c = ctx('arcade', { gameCode: '', isActive: false });
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND', details: { gameCode: 'OLD999' } }); });

    expect(forgetStoredRoom).toHaveBeenCalledWith('OLD999');
    expect(clearSession).not.toHaveBeenCalled();
    expect(c.offerQuickPlayRecovery).not.toHaveBeenCalled();
    expect(c.setShouldAutoJoin).not.toHaveBeenCalled();
    expect(c.setPrefilledRoomCode).not.toHaveBeenCalled();
  });

  it('GIVEN a cold arcade join WHEN the room is gone THEN offers Quick Play and counts the offer', () => {
    const c = ctx('arcade');
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND', message: 'Game not found' }); });

    expect(c.offerQuickPlayRecovery).toHaveBeenCalledTimes(1);
    expect(recoveryCalls()).toEqual([['mp_room_gone_recovery', { stage: 'offered', cameFromInvite: false }]]);
    // The offer toast (with its button) replaces the plain "room is gone" toast.
    expect(toast).not.toHaveBeenCalled();
    // The usual cleanup still runs.
    expect(c.setGameCode).toHaveBeenCalledWith('');
  });

  it('GIVEN a classroom student WHEN the room is gone THEN stays in the classroom path, no Quick Play', () => {
    const c = ctx('classroom');
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND' }); });

    expect(c.offerQuickPlayRecovery).not.toHaveBeenCalled();
    expect(c.exitClassroomStudentToHub).toHaveBeenCalledTimes(1);
    expect(recoveryCalls()).toEqual([]);
  });

  it('GIVEN a host WHEN the room is gone THEN keeps the plain feedback', () => {
    const c = ctx('arcade', {}, true);
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND' }); });

    expect(c.offerQuickPlayRecovery).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('GIVEN the player was in the room WHEN it is gone THEN keeps the timed-out toast', () => {
    const c = ctx('arcade', { isActive: true });
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND' }); });

    expect(c.offerQuickPlayRecovery).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('multiplayerFlow.roomTimedOut', expect.anything());
  });

  it('GIVEN the player tapped Play now WHEN the next join lands THEN counts one recovered join', () => {
    const c = ctx('arcade');
    renderHook(() => useMpRoomSocket(c));
    markRoomEndedRecoveryAccepted();
    act(() => { captured!.onJoined({ isHost: true, gameCode: 'NEW123' }); });
    act(() => { captured!.onJoined({ isHost: true, gameCode: 'NEW123' }); });

    expect(recoveryCalls()).toEqual([['mp_room_gone_recovery', { stage: 'joined', asHost: true }]]);
  });

  it('GIVEN no accept WHEN a join lands THEN counts nothing', () => {
    const c = ctx('arcade');
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onJoined({ isHost: false, gameCode: 'ABC123' }); });

    expect(recoveryCalls()).toEqual([]);
  });
});
