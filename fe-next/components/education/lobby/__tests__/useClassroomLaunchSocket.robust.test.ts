import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const handlers = new Map<string, Array<(payload: unknown) => void>>();
const fire = (event: string, payload?: unknown) => handlers.get(event)?.forEach((cb) => cb(payload));
const emit = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) } }),
}));
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, cb: (p: unknown) => void) => handlers.set(event, [...(handlers.get(event) || []), cb]),
    emit: (...args: unknown[]) => emit(...args),
    disconnect: vi.fn(),
  }),
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3010' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/education/lessonPlayStat', () => ({ recordLessonPlays: vi.fn() }));
const trackEduLiveGameStarted = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduLiveGameStarted: (...a: unknown[]) => trackEduLiveGameStarted(...a),
}));

import { useClassroomLaunchSocket, LAUNCH_ACK_TIMEOUT_MS, type ClassroomLaunchPayload } from '../useClassroomLaunchSocket';

const t = (k: string) => k;
const payload = (gameCode: string): ClassroomLaunchPayload => ({
  gameCode,
  classroomId: 'c-1',
  teacherId: 't-1',
  teacherName: 'Ms Cohen',
  lessonIds: ['l-1', 'l-2'],
  lessonNames: ['A', 'B'],
  vocabularyWords: ['apple'],
  settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true, gameMode: 'classic', playStyle: 'ffa' },
});

async function launched(source: 'create_room' | 'hq_express' = 'create_room') {
  const hook = renderHook(() => useClassroomLaunchSocket(t));
  await waitFor(() => expect(hook.result.current.socket).not.toBeNull());
  act(() => hook.result.current.launch(payload(hook.result.current.gameCode), source));
  return hook;
}

describe('useClassroomLaunchSocket: one launcher for every entry path', () => {
  beforeEach(() => {
    handlers.clear();
    emit.mockClear();
    trackEduLiveGameStarted.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('Given the server confirms the room, Then the game counts once, with the entry path as its source', async () => {
    const { result } = await launched('hq_express');
    expect(trackEduLiveGameStarted).not.toHaveBeenCalled();
    act(() => fire('classroomGameCreated', { success: true, gameCode: result.current.gameCode }));
    act(() => fire('classroomGameCreated', { success: true, gameCode: result.current.gameCode }));
    expect(trackEduLiveGameStarted).toHaveBeenCalledTimes(1);
    expect(trackEduLiveGameStarted).toHaveBeenCalledWith({ classroomId: 'c-1', source: 'hq_express', lessonCount: 2 });
  });

  it('Given only the class-room broadcast that shares the event name, Then nothing is treated as created', async () => {
    const { result } = await launched();
    act(() => fire('classroomGameCreated', { gameCode: result.current.gameCode, classroomId: 'c-1' }));
    expect(result.current.roomCreatedGameCode).toBeNull();
    expect(trackEduLiveGameStarted).not.toHaveBeenCalled();
    expect(result.current.isStarting).toBe(true);
  });

  it('Given the socket cannot connect, Then the teacher gets a named error instead of a spinner', async () => {
    const { result } = await launched();
    act(() => fire('connect_error', new Error('refused')));
    expect(result.current.isStarting).toBe(false);
    expect(result.current.startError).toBe('education.classroomGame.startFailed');
  });

  it('Given the server never answers, Then the launch gives up out loud after the watchdog', async () => {
    const hook = renderHook(() => useClassroomLaunchSocket(t));
    await waitFor(() => expect(hook.result.current.socket).not.toBeNull());
    vi.useFakeTimers();
    act(() => hook.result.current.launch(payload(hook.result.current.gameCode), 'create_room'));
    act(() => vi.advanceTimersByTime(LAUNCH_ACK_TIMEOUT_MS + 10));
    expect(hook.result.current.isStarting).toBe(false);
    expect(hook.result.current.startError).toBe('education.classroomGame.startFailed');
  });

  it('Given the room is confirmed in time, Then the watchdog never fires', async () => {
    const hook = renderHook(() => useClassroomLaunchSocket(t));
    await waitFor(() => expect(hook.result.current.socket).not.toBeNull());
    vi.useFakeTimers();
    act(() => hook.result.current.launch(payload(hook.result.current.gameCode), 'create_room'));
    act(() => fire('classroomGameCreated', { success: true, gameCode: hook.result.current.gameCode }));
    act(() => vi.advanceTimersByTime(LAUNCH_ACK_TIMEOUT_MS + 10));
    expect(hook.result.current.startError).toBeNull();
    expect(hook.result.current.roomCreatedGameCode).toBe(hook.result.current.gameCode);
  });

  it('Given the server rejects the room, Then nothing is counted', async () => {
    await launched();
    act(() => fire('classroomGameError', { error: 'nope' }));
    expect(trackEduLiveGameStarted).not.toHaveBeenCalled();
  });
});
