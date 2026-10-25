import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Options = { onJoined: (d: Record<string, unknown>) => void };
let captured: Options | null = null;
vi.mock('@/hooks/useMultiplayerSocket', () => ({
  useMultiplayerSocket: (opts: Options) => {
    captured = opts;
    return {
      socket: null, isConnected: true, roomsLoading: false, attemptingReconnect: false,
      setAttemptingReconnect: vi.fn(), refreshRooms: vi.fn(), signalIntentionalLeave: vi.fn(),
      isPaused: false, pauseGame: vi.fn(), resumeGame: vi.fn(), extendTime: vi.fn(), endRoundNow: vi.fn(),
      skipTargetWord: vi.fn(), classroomAccessibility: null, classroomLive: null,
      classroomLevel: 'core', classroomWordBank: [],
    };
  },
}));
const saveSession = vi.fn();
const setStoredUsername = vi.fn();
vi.mock('@/utils/session', () => ({ saveSession: (...a: unknown[]) => saveSession(...a), clearSession: vi.fn(), clearSessionPreservingUsername: vi.fn() }));
vi.mock('@/utils/profileStorage', () => ({ setStoredUsername: (...a: unknown[]) => setStoredUsername(...a) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import { useMpRoomSocket, type MpRoomSocketContext } from '../useMpRoomSocket';

function ctx(overrides: Partial<MpRoomSocketContext> = {}): MpRoomSocketContext {
  const noop = vi.fn();
  return {
    language: 'en', gameCode: 'ABC123', username: 'Noa', roomName: '', isActive: false, isHost: false,
    roomLanguage: null, prefilledRoomCode: '', t: (k: string) => k,
    setIsHost: noop, setIsActive: noop, setIsPrivate: noop, setError: noop, setIsJoining: noop,
    setShouldAutoJoin: noop, setPrefilledRoomCode: noop, setRoomLanguage: noop, setUsername: vi.fn(),
    setGameCode: noop, setRoomName: noop, setActiveRooms: noop, setIsSpectator: noop, setSpectators: noop,
    setPlayersInRoom: vi.fn(), setPlayersInRoomThrottled: Object.assign(vi.fn(), { cancel: vi.fn() }),
    setPendingGameStart: noop, setGameStartTime: noop, setShowResults: noop, setResultsData: noop,
    setHostLeftState: noop, onMatchStart: noop, roomWaitHold: noop,
    classroomContext: 'classroom', classroomDecisionRef: { current: { context: 'classroom', isHost: false } },
    exitClassroomStudentToHub: noop,
    ...overrides,
  };
}

describe('useMpRoomSocket — a student seated under a different name', () => {
  beforeEach(() => { captured = null; vi.clearAllMocks(); });

  it('Given the server seats a second Noa as "Noa 2", When joined lands, Then the page plays as "Noa 2"', () => {
    const c = ctx();
    renderHook(() => useMpRoomSocket(c));
    captured!.onJoined({ gameCode: 'ABC123', isHost: false, username: 'Noa 2' });
    expect(c.setUsername).toHaveBeenCalledWith('Noa 2');
    expect(saveSession).toHaveBeenCalledWith(expect.objectContaining({ username: 'Noa 2' }));
    expect(setStoredUsername).toHaveBeenCalledWith('Noa');
  });

  it('Given the server keeps the requested name, When joined lands, Then the name is not reset', () => {
    const c = ctx();
    renderHook(() => useMpRoomSocket(c));
    captured!.onJoined({ gameCode: 'ABC123', isHost: false, username: 'Noa' });
    expect(c.setUsername).not.toHaveBeenCalled();
  });
});
