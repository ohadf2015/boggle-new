import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const handlers = new Map<string, Array<(payload: unknown) => void>>();
const fire = (event: string, payload: unknown) => handlers.get(event)?.forEach((cb) => cb(payload));
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
const recordLessonPlays = vi.fn();
vi.mock('@/lib/education/lessonPlayStat', () => ({
  recordLessonPlays: (...a: unknown[]) => recordLessonPlays(...a),
}));

import { useClassroomLaunchSocket, type ClassroomLaunchPayload } from '../useClassroomLaunchSocket';

const t = (k: string) => k;

const payload = (gameCode: string): ClassroomLaunchPayload => ({
  gameCode,
  classroomId: 'c-1',
  teacherId: 't-1',
  teacherName: 'Ms Cohen',
  lessonIds: ['copy-1', 'own-2'],
  lessonNames: ['A', 'B'],
  vocabularyWords: ['apple'],
  settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true, gameMode: 'classic', playStyle: 'ffa' },
});

describe('useClassroomLaunchSocket — library plays', () => {
  beforeEach(() => {
    handlers.clear();
    emit.mockClear();
    recordLessonPlays.mockClear();
  });

  it('given a launched room, when the server confirms it, then its lessons are counted as plays', async () => {
    const { result } = renderHook(() => useClassroomLaunchSocket(t, 'en'));
    await waitFor(() => expect(result.current.socket).not.toBeNull());

    act(() => result.current.launch(payload(result.current.gameCode)));
    expect(recordLessonPlays).not.toHaveBeenCalled();

    act(() => fire('classroomGameCreated', { success: true, gameCode: result.current.gameCode }));
    expect(recordLessonPlays).toHaveBeenCalledWith(['copy-1', 'own-2']);
  });

  it('given a rejected room, when the error arrives, then no play is counted', async () => {
    const { result } = renderHook(() => useClassroomLaunchSocket(t, 'en'));
    await waitFor(() => expect(result.current.socket).not.toBeNull());

    act(() => result.current.launch(payload(result.current.gameCode)));
    act(() => fire('classroomGameError', { error: 'nope' }));
    expect(recordLessonPlays).not.toHaveBeenCalled();
  });
});
