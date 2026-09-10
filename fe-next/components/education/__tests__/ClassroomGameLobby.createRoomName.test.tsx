/**
 * CREATE ROOM silently no-ops when teacherName fails UsernameSchema.
 *
 * handleStartGame used `profile?.display_name || user.email || 'Teacher'`.
 * UsernameSchema rejects `@` and caps at 30 chars (shared/constants/namePattern).
 * Magic-link / admin-provisioned teachers often have an empty display_name, so
 * the payload sent `ohadf2015+qa-teacher@gmail.com`. The server replied
 * `classroomGameError` ("Invalid payload"), the toast vanished in ~4s, and
 * dogfood (2026-09-10) recorded a click with zero HTTP and no visible error.
 *
 * Same class as the consumer multiplayer emit, which already runs
 * sanitizeUsername. Classroom create did not.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as educationApi from '@/lib/supabase/education';
import { io } from 'socket.io-client';
import { UsernameSchema } from '@/shared/schemas/socketSchemas';

const authState: {
  user: { id: string; email: string; user_metadata?: Record<string, string> };
  profile: { display_name?: string | null } | null;
} = {
  user: { id: '11111111-1111-4111-8111-111111111111', email: 'ohadf2015+qa-teacher@gmail.com' },
  profile: { display_name: '' },
};

const { stableT } = vi.hoisted(() => ({ stableT: (key: string) => key }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: stableT, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));
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
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) },
  }),
}));

import { ClassroomGameLobby } from '../ClassroomGameLobby';

const socketHandlers: Record<string, (data?: unknown) => void> = {};
const mockSocket = {
  emit: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn((event: string, fn: (data?: unknown) => void) => {
    socketHandlers[event] = fn;
  }),
  io: { on: vi.fn() },
};

const LESSONS = [
  { id: 'lesson-1', name: 'Common English', words: [{ word: 'apple', canIntegrate: true }] },
];
const CLASSROOMS = [{ id: 'class-1', name: 'QA Dogfood Class', member_count: 1 }];

function startBtn() {
  return screen.getByRole('button', { name: /createRoom/i });
}

async function clickCreateRoom() {
  render(<ClassroomGameLobby initialLessonId="lesson-1" onBack={vi.fn()} />);
  await waitFor(() => expect(startBtn()).not.toBeDisabled());
  fireEvent.click(startBtn());
  await waitFor(() => {
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'createClassroomGame',
      expect.any(Object),
    );
  });
  const call = mockSocket.emit.mock.calls.find((c) => c[0] === 'createClassroomGame');
  return call![1] as { teacherName: string };
}

describe('ClassroomGameLobby — CREATE ROOM teacherName is socket-legal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: LESSONS });
    (educationApi.getClassrooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: CLASSROOMS });
    authState.user = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'ohadf2015+qa-teacher@gmail.com',
    };
    authState.profile = { display_name: '' };
  });

  it('does not send a raw email as teacherName (UsernameSchema rejects @)', async () => {
    const payload = await clickCreateRoom();
    expect(payload.teacherName).not.toMatch(/@/);
    expect(payload.teacherName.length).toBeGreaterThan(0);
    expect(payload.teacherName.length).toBeLessThanOrEqual(30);
    expect(UsernameSchema.safeParse(payload.teacherName).success).toBe(true);
  });

  it('truncates a long OAuth display_name so the server will accept it', async () => {
    authState.profile = { display_name: 'A Very Long Teacher Display Name From Google OAuth' };
    const payload = await clickCreateRoom();
    expect(payload.teacherName.length).toBeLessThanOrEqual(30);
    expect(UsernameSchema.safeParse(payload.teacherName).success).toBe(true);
  });

  it('keeps a valid display_name as-is', async () => {
    authState.profile = { display_name: 'Ms Plant' };
    const payload = await clickCreateRoom();
    expect(payload.teacherName).toBe('Ms Plant');
  });

  it('leaves a visible alert after classroomGameError so the failure is not toast-only', async () => {
    await clickCreateRoom();
    await waitFor(() => expect(socketHandlers['classroomGameError']).toBeDefined());
    socketHandlers['classroomGameError']!({ error: 'Invalid payload: Username is required' });
    expect(await screen.findByRole('alert')).toHaveTextContent('education.classroomGame.startFailed');
  });
});
