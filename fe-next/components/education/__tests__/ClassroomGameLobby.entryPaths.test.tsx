import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import * as educationApi from '@/lib/supabase/education';
import { io } from 'socket.io-client';

vi.mock('react-hot-toast', () => ({ __esModule: true, default: { error: vi.fn(), success: vi.fn() } }));
const { stableT } = vi.hoisted(() => ({ stableT: (key: string) => key }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: stableT, language: 'en', dir: 'ltr' }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teacher-1', email: 't@example.com' }, profile: { display_name: 'Ms Plant' } }),
}));
const { stableRouter } = vi.hoisted(() => ({ stableRouter: { push: vi.fn(), replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => stableRouter }));
vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('@/lib/supabase/education', () => ({ getLessons: vi.fn(), getClassrooms: vi.fn(), createLesson: vi.fn() }));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3001' }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) } }),
}));
const trackEduLiveGameStarted = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({ trackEduLiveGameStarted: (...a: unknown[]) => trackEduLiveGameStarted(...a) }));

import { ClassroomGameLobby } from '../ClassroomGameLobby';

const handlers: Record<string, (data?: unknown) => void> = {};
const socket = {
  emit: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn((event: string, fn: (data?: unknown) => void) => { handlers[event] = fn; }),
  io: { on: vi.fn() },
};

const LESSONS = [
  { id: 'lesson-1', name: 'Unit 3', language: 'en', words: [{ word: 'river', canIntegrate: true }, { word: 'stone', canIntegrate: true }] },
  { id: 'lesson-2', name: 'Unit 4', language: 'en', words: [{ word: 'cloud', canIntegrate: true }, { word: 'tiger', canIntegrate: true }] },
];
const CLASSROOMS = [
  { id: 'class-1', name: '5A', language: 'en', member_count: 5 },
  { id: 'class-2', name: '5B', language: 'en', member_count: 7 },
];

const goLive = () => screen.getByTestId('lobby-go-live');
const creates = () => socket.emit.mock.calls.filter(([event]) => event === 'createClassroomGame');

async function tapGoLiveAndConfirm() {
  await waitFor(() => expect(goLive()).not.toBeDisabled());
  await waitFor(() => expect(handlers.classroomGameCreated).toBeDefined());
  fireEvent.click(goLive());
  await waitFor(() => expect(creates()).toHaveLength(1));
  const [, payload] = creates()[0] as [string, { gameCode: string }];
  act(() => handlers.classroomGameCreated!({ success: true, gameCode: payload.gameCode }));
  return payload;
}

describe('ClassroomGameLobby: both entry paths launch through the one launcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(socket);
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: LESSONS });
    (educationApi.getClassrooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: CLASSROOMS });
  });

  it('Given the plain lobby, When GO LIVE is tapped, Then one room is created and counted as create_room', async () => {
    render(<ClassroomGameLobby initialLessonId="lesson-1" onBack={vi.fn()} />);
    await screen.findByTestId('lobby-go-live');
    expect(screen.getByTestId('lobby-mode-grid')).toBeInTheDocument();

    const payload = await tapGoLiveAndConfirm();

    expect(payload).toMatchObject({ classroomId: 'class-1', lessonIds: ['lesson-1'] });
    expect(trackEduLiveGameStarted).toHaveBeenCalledTimes(1);
    expect(trackEduLiveGameStarted).toHaveBeenCalledWith({ classroomId: 'class-1', source: 'create_room', lessonCount: 1 });
  });

  it('Given a quick launch, Then class, list and mode arrive preselected and nothing launches before GO LIVE', async () => {
    render(<ClassroomGameLobby quick initialClassroomId="class-2" initialLessonId="lesson-2" initialMode="blast" onBack={vi.fn()} />);
    await screen.findByTestId('lobby-go-live');

    expect(screen.getByTestId('lobby-quick-summary')).toHaveTextContent('5B');
    expect(screen.getByTestId('lobby-quick-summary')).toHaveTextContent('Unit 4');
    expect(screen.queryByTestId('lobby-mode-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lobby-class-picker')).not.toBeInTheDocument();
    expect(creates()).toHaveLength(0);
  });

  it('Given a quick launch, When GO LIVE is tapped, Then the same launcher sends the preselected room and counts it as hq_express', async () => {
    render(<ClassroomGameLobby quick initialClassroomId="class-2" initialLessonId="lesson-2" initialMode="blast" onBack={vi.fn()} />);
    await screen.findByTestId('lobby-go-live');

    const payload = (await tapGoLiveAndConfirm()) as unknown as { classroomId: string; lessonIds: string[]; settings: { gameMode: string } };

    expect(payload.classroomId).toBe('class-2');
    expect(payload.lessonIds).toEqual(['lesson-2']);
    expect(payload.settings.gameMode).toBe('blast');
    expect(trackEduLiveGameStarted).toHaveBeenCalledWith({ classroomId: 'class-2', source: 'hq_express', lessonCount: 1 });
    await waitFor(() => expect(stableRouter.replace).toHaveBeenCalledWith(expect.stringContaining('/en/')));
  });

  it('Given a quick launch, When More options is opened, Then the full picker appears and the launch keeps its source', async () => {
    render(<ClassroomGameLobby quick initialClassroomId="class-2" initialLessonId="lesson-2" initialMode="blast" onBack={vi.fn()} />);
    await screen.findByTestId('lobby-go-live');

    fireEvent.click(screen.getByTestId('lobby-more-options'));

    expect(screen.getByTestId('lobby-mode-grid')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-class-picker')).toBeInTheDocument();
    expect(screen.getByTestId('lobby-lesson-step')).toBeInTheDocument();
    await tapGoLiveAndConfirm();
    expect(trackEduLiveGameStarted).toHaveBeenCalledWith(expect.objectContaining({ source: 'hq_express' }));
  });
});
