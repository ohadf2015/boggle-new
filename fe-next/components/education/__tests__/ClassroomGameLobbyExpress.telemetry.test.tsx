/**
 * Teacher HQ's GO LIVE is the PRIMARY launch path, and it used to fire no
 * `edu_live_game_started` at all — only the full lobby and QuickStartButton
 * did, so the activation funnel under-counted real live games (pitfalls
 * class 4: a silent gap looks exactly like "nobody played").
 *
 * The express path fires on the SERVER's own confirmation (not at emit), once.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const handlers = new Map<string, Array<(payload: unknown) => void>>();
const fire = (event: string, payload: unknown) =>
  handlers.get(event)?.forEach((cb) => cb(payload));
const emit = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-123' } } }) },
  }),
}));
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, cb: (p: unknown) => void) => {
      handlers.set(event, [...(handlers.get(event) || []), cb]);
    },
    emit: (...args: unknown[]) => emit(...args),
    disconnect: vi.fn(),
  }),
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3010' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', email: 't@x.com' }, profile: { display_name: 'Ms Cohen' } }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({ saveConfig: vi.fn(), getMostRecent: () => null }),
}));

const trackEduLiveGameStarted = vi.fn();
vi.mock('@/lib/education/telemetry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/education/telemetry')>()),
  trackEduLiveGameStarted: (...a: unknown[]) => trackEduLiveGameStarted(...a),
}));

const getClassrooms = vi.fn();
const getLesson = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  getClassrooms: (...a: unknown[]) => getClassrooms(...a),
  getLesson: (...a: unknown[]) => getLesson(...a),
  createLesson: vi.fn(),
}));

import { ClassroomGameLobbyExpress } from '../ClassroomGameLobbyExpress';
import { resetLaunchesForTest } from '../ClassroomGameLobbyExpressController';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';

const LESSON = {
  id: 'l-1',
  name: 'Unit 4',
  language: 'en',
  words: Array.from({ length: 6 }, (_, i) => ({ word: `w${i}`, definition: `d${i}` })),
};

let intent: QuickLaunchIntent;

async function launch() {
  render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
  await waitFor(() => expect(emit).toHaveBeenCalledWith('createClassroomGame', expect.anything()));
  return emit.mock.calls[0][1] as { gameCode: string; classroomId: string };
}

describe('<ClassroomGameLobbyExpress> edu_live_game_started', () => {
  beforeEach(() => {
    resetLaunchesForTest();
    intent = {
      source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en',
      createdAt: Date.now() + Math.floor(Math.random() * 1e6),
    };
    handlers.clear();
    emit.mockClear();
    trackEduLiveGameStarted.mockClear();
    getClassrooms.mockResolvedValue({ data: [{ id: 'c-1', name: 'My Class', language: 'en' }] });
    getLesson.mockResolvedValue({ data: LESSON, error: null });
  });

  it('Given the server confirms the room, When confirmed, Then it fires once with source hq_express', async () => {
    const payload = await launch();
    expect(trackEduLiveGameStarted).not.toHaveBeenCalled(); // not at emit

    fire('classroomGameCreated', { success: true, gameCode: payload.gameCode });
    expect(trackEduLiveGameStarted).toHaveBeenCalledTimes(1);
    expect(trackEduLiveGameStarted).toHaveBeenCalledWith({
      classroomId: 'c-1',
      source: 'hq_express',
      lessonCount: 1,
    });
  });

  it('Given a duplicate confirmation, When it arrives, Then it does not count the game twice', async () => {
    const payload = await launch();
    fire('classroomGameCreated', { success: true, gameCode: payload.gameCode });
    fire('classroomGameCreated', { success: true, gameCode: payload.gameCode });
    expect(trackEduLiveGameStarted).toHaveBeenCalledTimes(1);
  });

  it('Given only the room broadcast (no success field), When it arrives, Then nothing fires', async () => {
    const payload = await launch();
    fire('classroomGameCreated', { gameCode: payload.gameCode, classroomId: 'c-1' });
    expect(trackEduLiveGameStarted).not.toHaveBeenCalled();
  });

  it('Given the server rejects the room, When rejected, Then nothing fires', async () => {
    await launch();
    fire('classroomGameError', { error: 'nope' });
    expect(trackEduLiveGameStarted).not.toHaveBeenCalled();
  });
});
