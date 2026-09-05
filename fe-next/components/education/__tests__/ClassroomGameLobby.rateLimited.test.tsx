/**
 * The teacher's Start Game button must always come back.
 *
 * `handleStartGame` sets `isStarting` and emits `createClassroomGame`. The only
 * thing that ever cleared `isStarting` was the `classroomGameError` listener —
 * but the server's rate-limit path emits `rateLimited`, a DIFFERENT event, and
 * the lobby had no listener for it. Double-tap Start at the bell and the button
 * sat disabled forever with no error and no way out short of a reload.
 *
 * The same listener also translates the server's error text: it used to
 * `toast.error(data.error)` with raw English like "You are not the teacher of
 * this classroom" or "Invalid payload: …" — shown to Hebrew, Japanese, Swedish
 * and Spanish teachers, right-aligned in an RTL toast, naming an internal field.
 *
 * (Sibling file to ClassroomGameLobby.test.tsx, which is jest-based and excluded
 * from the vitest run — a test in that file would never execute.)
 */
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import * as educationApi from '@/lib/supabase/education';
import { io } from 'socket.io-client';

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: mockToastError, success: vi.fn() },
}));

// `t` must be a STABLE identity: the socket effect depends on it, and a fresh
// arrow per render tears the socket down and rebuilds it on every state change.
const { stableT } = vi.hoisted(() => ({ stableT: (key: string) => key }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: stableT, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-1', email: 't@example.com' },
    profile: { display_name: 'Ms Plant' },
  }),
}));
// Stable router object for the same reason as `t` — it is a socket-effect dep.
const { stableRouter } = vi.hoisted(() => ({ stableRouter: { push: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => stableRouter }));
vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('@/lib/supabase/education', () => ({
  getLessons: vi.fn(),
  getClassrooms: vi.fn(),
  createLesson: vi.fn(),
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3001' }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) } }),
}));

import { ClassroomGameLobby } from '../ClassroomGameLobby';

const socketHandlers: Record<string, (data?: unknown) => void> = {};
const mockSocket = {
  emit: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn((event: string, fn: (data?: unknown) => void) => { socketHandlers[event] = fn; }),
  io: { on: vi.fn() },
};

const LESSONS = [
  { id: 'lesson-1', name: 'Unit 3', words: [{ word: 'photosynthesis', canIntegrate: true }] },
];
const CLASSROOMS = [{ id: 'class-1', name: 'ELA (7th)', member_count: 5 }];

/** Re-query every time: the wizard re-renders and the node identity can change. */
const startBtn = () => screen.getByRole('button', { name: /createRoom/i });

async function renderLobby() {
  render(<ClassroomGameLobby initialLessonId="lesson-1" onBack={vi.fn()} />);
  return await screen.findByRole('button', { name: /createRoom/i });
}

describe('ClassroomGameLobby — Start Game always recovers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: LESSONS });
    (educationApi.getClassrooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: CLASSROOMS });
  });

  it('re-enables Start Game when the server rate-limits the request', async () => {
    // GIVEN a teacher who pressed Start
    await renderLobby();
    await waitFor(() => expect(startBtn()).not.toBeDisabled());
    fireEvent.click(startBtn());
    await waitFor(() => expect(startBtn()).toBeDisabled());

    // WHEN the server rejects the second tap with `rateLimited`
    await waitFor(() => expect(socketHandlers['rateLimited']).toBeDefined());
    act(() => { socketHandlers['rateLimited']!(); });

    // THEN the button comes back and the teacher is told why, in their language
    await waitFor(() => expect(startBtn()).not.toBeDisabled());
    expect(mockToastError).toHaveBeenCalledWith('education.classroomGame.tooFast');
  });

  it('shows a translated message instead of the raw server error string', async () => {
    // GIVEN a lobby with a live socket
    await renderLobby();
    await waitFor(() => expect(socketHandlers['classroomGameError']).toBeDefined());

    // WHEN the server refuses with internal English text
    act(() => {
      socketHandlers['classroomGameError']!({ error: 'You are not the teacher of this classroom' });
    });

    // THEN the teacher never sees the internal string
    expect(mockToastError).toHaveBeenCalledWith('education.classroomGame.startFailed');
    expect(mockToastError).not.toHaveBeenCalledWith('You are not the teacher of this classroom');
  });
});
