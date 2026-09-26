/**
 * The lobby roster is seeded from the `joined` payload. Every server `joined`
 * emit carries `users: getGameUsers(gameCode)`, but PageClient's onJoined
 * ignored it, so the lobby mounted empty (and a joiner's roster read
 * "PLAYERS 0") until the next `updateUsers` broadcast landed.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Options = { onJoined: (d: Record<string, unknown>) => void; onUpdateUsers: (u: unknown[]) => void };
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
vi.mock('@/utils/session', () => ({ saveSession: vi.fn(), clearSession: vi.fn(), clearSessionPreservingUsername: vi.fn() }));
vi.mock('@/utils/profileStorage', () => ({ setStoredUsername: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import { useMpRoomSocket, type MpRoomSocketContext } from '../useMpRoomSocket';

function ctx(overrides: Partial<MpRoomSocketContext> = {}): MpRoomSocketContext {
  const noop = vi.fn();
  return {
    language: 'en', gameCode: 'ABC123', username: 'me', roomName: '', isActive: false, isHost: false,
    roomLanguage: null, prefilledRoomCode: '', t: (k: string) => k,
    setIsHost: noop, setIsActive: noop, setIsPrivate: noop, setError: noop, setIsJoining: noop,
    setShouldAutoJoin: noop, setPrefilledRoomCode: noop, setRoomLanguage: noop, setUsername: noop,
    setGameCode: noop, setRoomName: noop, setActiveRooms: noop, setIsSpectator: noop, setSpectators: noop,
    setPlayersInRoom: vi.fn(), setPlayersInRoomThrottled: Object.assign(vi.fn(), { cancel: vi.fn() }),
    setPendingGameStart: noop, setGameStartTime: noop, setShowResults: noop, setResultsData: noop,
    setHostLeftState: noop, onMatchStart: noop, roomWaitHold: noop,
    classroomStudentRef: { current: false }, exitClassroomStudentToHub: noop,
    ...overrides,
  };
}

describe('useMpRoomSocket — onJoined seeds the roster', () => {
  beforeEach(() => { captured = null; });

  it('applies data.users immediately, cancelling any stale throttled update', () => {
    const c = ctx();
    renderHook(() => useMpRoomSocket(c));
    const users = [{ username: 'host', isHost: true }, { username: 'me' }];
    captured!.onJoined({ gameCode: 'ABC123', isHost: false, username: 'me', users });
    expect(c.setPlayersInRoomThrottled.cancel).toHaveBeenCalled();
    expect(c.setPlayersInRoom).toHaveBeenCalledWith(users);
  });

  it('keeps the current roster when the payload has no users', () => {
    const c = ctx();
    renderHook(() => useMpRoomSocket(c));
    captured!.onJoined({ gameCode: 'ABC123', isHost: true, username: 'me' });
    expect(c.setPlayersInRoom).not.toHaveBeenCalled();
    expect(c.setIsActive).toHaveBeenCalledWith(true);
  });

  it('updateUsers still flows through the throttle', () => {
    const c = ctx();
    renderHook(() => useMpRoomSocket(c));
    captured!.onUpdateUsers([{ username: 'x' }]);
    expect(c.setPlayersInRoomThrottled).toHaveBeenCalledWith([{ username: 'x' }]);
  });
});
