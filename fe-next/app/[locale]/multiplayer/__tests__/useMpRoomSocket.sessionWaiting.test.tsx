import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Options = { onError: (d: { code?: string; message?: string }) => void };
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
vi.mock('@/utils/session', () => ({ saveSession: vi.fn(), clearSession: vi.fn(), clearSessionPreservingUsername: vi.fn() }));
vi.mock('@/utils/profileStorage', () => ({ setStoredUsername: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackInviteRoomDead: vi.fn(), trackInviteConsumed: vi.fn(), trackGrowthEvent: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import { useMpRoomSocket, type MpRoomSocketContext } from '../useMpRoomSocket';

function ctx(isHost: boolean, onSessionWaiting: (href: string) => void): MpRoomSocketContext {
  return {
    language: 'he', gameCode: 'RS36UH', username: 'me', roomName: '', isActive: false, isHost: false,
    roomLanguage: null, prefilledRoomCode: '', t: (k: string) => k,
    setIsHost: vi.fn(), setIsActive: vi.fn(), setIsPrivate: vi.fn(), setError: vi.fn(), setIsJoining: vi.fn(),
    setShouldAutoJoin: vi.fn(), setPrefilledRoomCode: vi.fn(), setRoomLanguage: vi.fn(), setUsername: vi.fn(),
    setGameCode: vi.fn(), setRoomName: vi.fn(), setActiveRooms: vi.fn(), setIsSpectator: vi.fn(), setSpectators: vi.fn(),
    setPlayersInRoom: vi.fn(), setPlayersInRoomThrottled: Object.assign(vi.fn(), { cancel: vi.fn() }),
    setPendingGameStart: vi.fn(), setGameStartTime: vi.fn(), setShowResults: vi.fn(), setResultsData: vi.fn(),
    setHostLeftState: vi.fn(), onMatchStart: vi.fn(), roomWaitHold: vi.fn(),
    classroomContext: 'classroom',
    classroomDecisionRef: { current: { context: 'classroom', isHost } },
    exitClassroomStudentToHub: vi.fn(),
    offerQuickPlayRecovery: vi.fn(),
    onSessionWaiting,
  };
}

describe('useMpRoomSocket — ended class code', () => {
  beforeEach(() => { captured = null; });

  it('sends a student to the class join page to wait for the next game', () => {
    const onSessionWaiting = vi.fn();
    renderHook(() => useMpRoomSocket(ctx(false, onSessionWaiting)));
    act(() => captured!.onError({ code: 'CLASSROOM_SESSION_WAITING' }));
    expect(onSessionWaiting).toHaveBeenCalledWith('/he/join/RS36UH');
  });

  it('sends the teacher home, not to the student join page', () => {
    const onSessionWaiting = vi.fn();
    renderHook(() => useMpRoomSocket(ctx(true, onSessionWaiting)));
    act(() => captured!.onError({ code: 'CLASSROOM_SESSION_WAITING' }));
    expect(onSessionWaiting).toHaveBeenCalledWith('/he/teacher');
  });
});
