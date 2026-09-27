/**
 * The express screen is the ONLY thing between the dashboard's one tap and a
 * join code on the projector. It has exactly two jobs:
 *   1. get there without asking anything, and
 *   2. when it can't, say so loudly and hand back a way out.
 *
 * (2) is the one that matters in a classroom: a spinner that never resolves in
 * front of thirty teenagers is worse than an error (pitfalls class 4).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const handlers = new Map<string, Array<(payload: unknown) => void>>();
const fire = (event: string, payload: unknown) =>
  handlers.get(event)?.forEach((cb) => cb(payload));
const emit = vi.fn();
const push = vi.fn();
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
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
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

describe('<ClassroomGameLobbyExpress>', () => {
  beforeEach(() => {
    resetLaunchesForTest();
    // A launch is keyed by the intent, so each test needs its own.
    intent = {
      source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en',
      createdAt: Date.now() + Math.floor(Math.random() * 1e6),
    };
    handlers.clear();
    emit.mockClear();
    ioOpts.mockClear();
    push.mockClear();
    sessionStorage.clear();
    getClassrooms.mockResolvedValue({ data: [{ id: 'c-1', name: 'My Class', language: 'en' }] });
    getLesson.mockResolvedValue({ data: LESSON, error: null });
    createLesson.mockResolvedValue({ data: LESSON, error: null });
  });

  it('creates the room with no questions asked, then lands on the host lobby', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);

    await waitFor(() => expect(emit).toHaveBeenCalledWith('createClassroomGame', expect.anything()));
    const payload = emit.mock.calls[0][1] as { gameCode: string; classroomId: string };
    expect(payload.classroomId).toBe('c-1');

    fire('classroomGameCreated', { success: true, gameCode: payload.gameCode });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/en/multiplayer?room=${payload.gameCode}&classroom=true&host=true`)
    );
  });

  it('ignores the room broadcast that shares the confirmation event name', async () => {
    // The server joins the host socket to `classroom:<id>` and broadcasts
    // `classroomGameCreated` there — no `success` field — before sending the
    // teacher `{success:true}`. Reading the broadcast as a rejection failed a
    // room that Redis had already accepted.
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(emit).toHaveBeenCalled());
    const payload = emit.mock.calls[0][1] as { gameCode: string; classroomId: string };

    fire('classroomGameCreated', {
      gameCode: payload.gameCode,
      classroomId: payload.classroomId,
      classroomName: 'My Class',
      teacherName: 'Ms Cohen',
    });
    expect(screen.queryByTestId('express-failure')).not.toBeInTheDocument();

    fire('classroomGameCreated', { success: true, gameCode: payload.gameCode });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/en/multiplayer?room=${payload.gameCode}&classroom=true&host=true`)
    );
  });

  it('authenticates the socket — the server refuses an anonymous room', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(emit).toHaveBeenCalled());
    expect(ioOpts).toHaveBeenCalledWith(expect.objectContaining({ auth: { token: 'jwt-123' } }));
  });

  it('stages the teacher vocabulary for the multiplayer session, as the full lobby does', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(emit).toHaveBeenCalled());
    const staged = JSON.parse(sessionStorage.getItem('lessonGameData') || '{}');
    expect(staged.vocabularyWords).toHaveLength(6);
    expect(staged.lessonId).toBe('l-1');
  });

  it('shows a named failure and a way out when the server rejects the room', async () => {
    const onOpenFullSetup = vi.fn();
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={onOpenFullSetup} />);
    await waitFor(() => expect(emit).toHaveBeenCalled());

    fire('classroomGameError', { error: 'nope' });

    await waitFor(() => expect(screen.getByTestId('express-failure')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('express-open-full-setup'));
    expect(onOpenFullSetup).toHaveBeenCalled();
  });

  it('treats a rate-limit rejection as a failure too, not as still-working', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(emit).toHaveBeenCalled());

    fire('rateLimited', {});

    await waitFor(() => expect(screen.getByTestId('express-failure')).toBeInTheDocument());
  });

  it('surfaces a missing lesson before it ever reaches the socket', async () => {
    getLesson.mockResolvedValue({ data: null, error: null });
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId('express-failure')).toBeInTheDocument());
    expect(emit).not.toHaveBeenCalled();
  });

  it('turns an unexpected throw into a named failure, not an endless spinner', async () => {
    getClassrooms.mockRejectedValue(new Error('chunk load failed'));
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('express-failure')).toBeInTheDocument());
  });

  it('gives up out loud when a step hangs, instead of spinning forever', async () => {
    // Measured live 2026-09-11: the classroom insert and the lesson insert both
    // returned 201 and the screen still read "Setting up your class". A
    // watchdog that only covers the socket ack never fires when the hang is
    // upstream of the emit — so it covers the whole launch.
    vi.useFakeTimers();
    try {
      getClassrooms.mockImplementation(() => new Promise(() => {}));
      render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
      await vi.advanceTimersByTimeAsync(21_000);
      expect(screen.getByTestId('express-failure')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('survives a remount mid-flight instead of cancelling itself', async () => {
    // React's dev double-mount used to run the effect cleanup between the
    // classroom insert and the lesson insert, and the room was never asked
    // for. Unmounting and mounting again must resume the SAME run.
    const first = render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    first.unmount();
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);

    await waitFor(() => expect(emit).toHaveBeenCalled());
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('shows the remounted screen the stage the live run has reached', async () => {
    const { unmount } = render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(emit).toHaveBeenCalled());
    unmount();

    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    fire('classroomGameCreated', { success: true, gameCode: 'ZZZ999' });

    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/multiplayer?room=ZZZ999&classroom=true&host=true'));
  });
});
