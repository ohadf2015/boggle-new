import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const handlers = new Map<string, Array<(payload: unknown) => void>>();
const fire = (event: string, payload: unknown) =>
  handlers.get(event)?.forEach((cb) => cb(payload));
const emit = vi.fn();
const push = vi.fn();
const replace = vi.fn();
const ioOpts = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-123' } } }) },
  }),
}));
vi.mock('socket.io-client', () => ({
  io: (_url: string, opts: unknown) => {
    ioOpts(opts);
    return {
      on: (event: string, cb: (p: unknown) => void) => {
        handlers.set(event, [...(handlers.get(event) || []), cb]);
      },
      emit: (...args: unknown[]) => emit(...args),
      disconnect: vi.fn(),
    };
  },
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3010' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', email: 't@x.com' }, profile: { display_name: 'Ms Cohen' } }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({ saveConfig: vi.fn(), getMostRecent: () => null }),
}));

const getClassrooms = vi.fn();
const getLesson = vi.fn();
const createLesson = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  getClassrooms: (...a: unknown[]) => getClassrooms(...a),
  getLesson: (...a: unknown[]) => getLesson(...a),
  createLesson: (...a: unknown[]) => createLesson(...a),
}));

import { ClassroomGameLobbyExpress } from '../ClassroomGameLobbyExpress';
import { resetLaunchesForTest } from '../ClassroomGameLobbyExpressController';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';

let intent: QuickLaunchIntent;

const LESSON = {
  id: 'l-1',
  name: 'Unit 4',
  language: 'en',
  words: Array.from({ length: 6 }, (_, i) => ({ word: `w${i}`, definition: `d${i}` })),
};

/**
 * Measured on dev: a teacher on the host results screen pressed browser Back
 * three times and never left. The launch page stayed in history, and coming
 * back to it re-attached to the live launch and pushed the room again.
 */
describe('<ClassroomGameLobbyExpress> history', () => {
  beforeEach(() => {
    resetLaunchesForTest();
    intent = { source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en', createdAt: Date.now() + Math.floor(Math.random() * 1e6) };
    handlers.clear();
    emit.mockClear();
    push.mockClear();
    replace.mockClear();
    sessionStorage.clear();
    getClassrooms.mockResolvedValue({ data: [{ id: 'c-1', name: 'My Class', language: 'en' }] });
    getLesson.mockResolvedValue({ data: LESSON, error: null });
    createLesson.mockResolvedValue({ data: LESSON, error: null });
  });

  it('replaces the launch page with the room, so Back from the room returns to the teacher hub', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(emit).toHaveBeenCalledWith('createClassroomGame', expect.anything()));
    const payload = emit.mock.calls[0][1] as { gameCode: string };
    fire('classroomGameCreated', { success: true, gameCode: payload.gameCode });
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(`/en/multiplayer?room=${payload.gameCode}&classroom=true&host=true`),
    );
    expect(push).not.toHaveBeenCalled();
  });
});
