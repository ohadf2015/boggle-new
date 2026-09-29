/**
 * Behavioral pin for the tri-state classroom defer in useMpRoomSocket (the
 * semantics of 846b4a29e reapplied onto the FOUNDATION split):
 *
 *  - a host transfer or room-gone that lands while the live-game record is
 *    PENDING defers — never an optimistic arcade default (pitfall class 1);
 *  - the flush effect re-runs the SAME decision once the context resolves:
 *    classroom student → student hub, arcade → host seat / arcade feedback;
 *  - a resolved classroom context acts immediately (no defer).
 *
 * The source-contract twin is PageClient.classroomContext.test.ts.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Options = {
  onError: (d: { code?: string; message?: string }) => void;
  onHostTransferred: (d: { newHost: string }) => void;
};
let captured: Options | null = null;
const emit = vi.fn();
vi.mock('@/hooks/useMultiplayerSocket', () => ({
  useMultiplayerSocket: (opts: Options) => {
    captured = opts;
    return {
      socket: { emit }, isConnected: true, roomsLoading: false, attemptingReconnect: false,
      setAttemptingReconnect: vi.fn(), refreshRooms: vi.fn(), signalIntentionalLeave: vi.fn(),
      isPaused: false, pauseGame: vi.fn(), resumeGame: vi.fn(), extendTime: vi.fn(), endRoundNow: vi.fn(),
      skipTargetWord: vi.fn(), classroomAccessibility: null, classroomLive: null,
      classroomLevel: 'core', classroomWordBank: [],
    };
  },
}));
vi.mock('@/utils/session', () => ({ saveSession: vi.fn(), clearSession: vi.fn(), clearSessionPreservingUsername: vi.fn() }));
vi.mock('@/utils/profileStorage', () => ({ setStoredUsername: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackInviteRoomDead: vi.fn(), trackInviteConsumed: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import { useMpRoomSocket, type MpRoomSocketContext } from '../useMpRoomSocket';
import type { ClassroomContext } from '@/lib/education/classroomRoomGone';

function ctx(context: ClassroomContext, overrides: Partial<MpRoomSocketContext> = {}): MpRoomSocketContext {
  return {
    language: 'en', gameCode: 'ABC123', username: 'me', roomName: '', isActive: false, isHost: false,
    roomLanguage: null, prefilledRoomCode: '', t: (k: string) => k,
    setIsHost: vi.fn(), setIsActive: vi.fn(), setIsPrivate: vi.fn(), setError: vi.fn(), setIsJoining: vi.fn(),
    setShouldAutoJoin: vi.fn(), setPrefilledRoomCode: vi.fn(), setRoomLanguage: vi.fn(), setUsername: vi.fn(),
    setGameCode: vi.fn(), setRoomName: vi.fn(), setActiveRooms: vi.fn(), setIsSpectator: vi.fn(), setSpectators: vi.fn(),
    setPlayersInRoom: vi.fn(), setPlayersInRoomThrottled: Object.assign(vi.fn(), { cancel: vi.fn() }),
    setPendingGameStart: vi.fn(), setGameStartTime: vi.fn(), setShowResults: vi.fn(), setResultsData: vi.fn(),
    setHostLeftState: vi.fn(), onMatchStart: vi.fn(), roomWaitHold: vi.fn(),
    classroomContext: context,
    classroomDecisionRef: { current: { context, isHost: false } },
    exitClassroomStudentToHub: vi.fn(),
    ...overrides,
  };
}

describe('useMpRoomSocket — classroom defer while the record is pending', () => {
  beforeEach(() => { captured = null; emit.mockClear(); });

  it('defers a host transfer during pending, then exits a classroom student to the hub', () => {
    const c = ctx('pending');
    const exitToHub = vi.fn();
    c.exitClassroomStudentToHub = exitToHub;
    const view = renderHook((props: MpRoomSocketContext) => useMpRoomSocket(props), { initialProps: c });
    act(() => { captured!.onHostTransferred({ newHost: 'me' }); });
    expect(c.setIsHost).not.toHaveBeenCalled();
    expect(exitToHub).not.toHaveBeenCalled();

    const resolved = ctx('classroom', { setIsHost: c.setIsHost, exitClassroomStudentToHub: exitToHub });
    view.rerender(resolved);
    expect(exitToHub).toHaveBeenCalledTimes(1);
    expect(c.setIsHost).not.toHaveBeenCalledWith(true);
  });

  it('defers a host transfer during pending, then takes the seat once arcade is definitive', () => {
    const c = ctx('pending');
    const view = renderHook((props: MpRoomSocketContext) => useMpRoomSocket(props), { initialProps: c });
    act(() => { captured!.onHostTransferred({ newHost: 'me' }); });
    expect(c.setIsHost).not.toHaveBeenCalled();

    view.rerender(ctx('arcade', { setIsHost: c.setIsHost, exitClassroomStudentToHub: c.exitClassroomStudentToHub }));
    expect(c.setIsHost).toHaveBeenCalledWith(true);
    expect(c.exitClassroomStudentToHub).not.toHaveBeenCalled();
  });

  it('exits a classroom student immediately once the context is resolved', () => {
    const c = ctx('classroom');
    renderHook(() => useMpRoomSocket(c));
    act(() => { captured!.onHostTransferred({ newHost: 'me' }); });
    expect(c.exitClassroomStudentToHub).toHaveBeenCalledTimes(1);
    expect(c.setIsHost).not.toHaveBeenCalledWith(true);
  });

  it('defers room-gone during pending, then routes a classroom student to the hub on resolve', () => {
    const c = ctx('pending');
    const view = renderHook((props: MpRoomSocketContext) => useMpRoomSocket(props), { initialProps: c });
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND' }); });
    expect(c.exitClassroomStudentToHub).not.toHaveBeenCalled();
    expect(c.setGameCode).not.toHaveBeenCalledWith('');

    view.rerender(ctx('classroom', {
      setGameCode: c.setGameCode, setPrefilledRoomCode: c.setPrefilledRoomCode,
      exitClassroomStudentToHub: c.exitClassroomStudentToHub,
    }));
    expect(c.exitClassroomStudentToHub).toHaveBeenCalledTimes(1);
  });

  it('defers room-gone during pending, then runs the arcade feedback path on resolve', () => {
    const c = ctx('pending');
    const view = renderHook((props: MpRoomSocketContext) => useMpRoomSocket(props), { initialProps: c });
    act(() => { captured!.onError({ code: 'GAME_NOT_FOUND' }); });
    expect(c.setGameCode).not.toHaveBeenCalled();

    view.rerender(ctx('arcade', {
      setGameCode: c.setGameCode, setIsActive: c.setIsActive, setPrefilledRoomCode: c.setPrefilledRoomCode,
    }));
    expect(c.setGameCode).toHaveBeenCalledWith('');
    expect(c.setIsActive).toHaveBeenCalledWith(false);
    expect(c.exitClassroomStudentToHub).not.toHaveBeenCalled();
  });
});
