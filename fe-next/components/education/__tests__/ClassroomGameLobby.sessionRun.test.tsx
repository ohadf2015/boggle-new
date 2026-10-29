import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as educationApi from '@/lib/supabase/education';
import { io } from 'socket.io-client';
import type { SessionRun } from '@/components/teacher/StarterPacksSection';

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
vi.mock('@/lib/education/telemetry', () => ({ trackEduLiveGameStarted: vi.fn() }));
const findThemedPack = vi.fn();
vi.mock('@/lib/education/themedPacks', async (orig) => ({
  ...(await orig<typeof import('@/lib/education/themedPacks')>()),
  findThemedPack: (...a: unknown[]) => findThemedPack(...a),
}));
const { runRef } = vi.hoisted(() => ({ runRef: { current: null as unknown } }));
vi.mock('@/components/teacher/StarterPacksSection', () => ({
  StarterPacksSection: ({ onRunSession }: { onRunSession?: (run: unknown) => void }) => (
    <button type="button" data-testid="run-session" onClick={() => onRunSession?.(runRef.current)}>run</button>
  ),
}));

import { ClassroomGameLobby } from '../ClassroomGameLobby';

const handlers: Record<string, (data?: unknown) => void> = {};
const socket = { emit: vi.fn(), disconnect: vi.fn(), on: vi.fn((e: string, fn: (d?: unknown) => void) => { handlers[e] = fn; }), io: { on: vi.fn() } };

const DEFINED_WORDS = Array.from({ length: 8 }, (_, i) => ({ word: `word${i}x`, definition: `meaning ${i}`, canIntegrate: true }));
const PACK = { code: 'LC-EN-PK-AUTUMN', name: 'Autumn words', description: 'Fall', language: 'en', words: DEFINED_WORDS };
const CLASSROOMS = [{ id: 'class-1', name: '5A', language: 'en', member_count: 5 }];
const OTHER = { id: 'lesson-1', name: 'Unit 3', language: 'en', words: [{ word: 'river', canIntegrate: true }] };

const created = () => socket.emit.mock.calls.find(([e]) => e === 'createClassroomGame')?.[1] as
  | { lessonIds: string[]; settings: Record<string, unknown> }
  | undefined;

async function goLive() {
  await waitFor(() => expect(screen.getByTestId('lobby-go-live')).not.toBeDisabled());
  await waitFor(() => expect(handlers.classroomGameCreated).toBeDefined());
  fireEvent.click(screen.getByTestId('lobby-go-live'));
  await waitFor(() => expect(created()).toBeDefined());
  return created()!;
}

describe('ClassroomGameLobby: one-tap ready-to-run sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(socket);
    (educationApi.getClassrooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: CLASSROOMS });
    (educationApi.createLesson as ReturnType<typeof vi.fn>).mockImplementation(async (row: { name: string; language: string; words: unknown[] }) => ({
      data: { id: 'lesson-pack', name: row.name, language: row.language, words: row.words },
      error: null,
    }));
    findThemedPack.mockResolvedValue(PACK);
  });

  it('Given the session link params, Then the pack becomes the list and the room runs the session shape', async () => {
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [OTHER] });
    render(
      <ClassroomGameLobby initialMode="vocab-quiz" initialMinutes={3} sessionPack="LC-EN-PK-AUTUMN" initialQuestions={8} initialSeconds={20} onBack={vi.fn()} />
    );
    await waitFor(() => expect(educationApi.createLesson).toHaveBeenCalledTimes(1));
    expect(findThemedPack).toHaveBeenCalledWith('LC-EN-PK-AUTUMN');

    const payload = await goLive();
    expect(payload.lessonIds).toEqual(['lesson-pack']);
    expect(payload.settings).toMatchObject({ gameMode: 'vocab-quiz', vocabQuizQuestionCount: 8, vocabQuizSeconds: 20 });
  });

  it('Given the pack already exists as a list, Then it is selected, not created again', async () => {
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [OTHER, { id: 'lesson-old', name: 'Autumn words', language: 'en', words: DEFINED_WORDS }] });
    render(<ClassroomGameLobby initialMode="vocab-quiz" sessionPack="LC-EN-PK-AUTUMN" onBack={vi.fn()} />);
    const payload = await goLive();
    expect(educationApi.createLesson).not.toHaveBeenCalled();
    expect(payload.lessonIds).toEqual(['lesson-old']);
  });

  it('Given a preset param, Then the preset is applied once', async () => {
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [OTHER] });
    render(<ClassroomGameLobby initialLessonId="lesson-1" initialPreset="friday-battle" onBack={vi.fn()} />);
    const payload = await goLive();
    expect(payload.settings.playStyle).toBe('teams');
  });

  it('Given a teacher with no lists, When Run this is tapped, Then the lobby takes the session in place and launches it', async () => {
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    runRef.current = {
      session: { id: 'exit-ticket', mode: 'vocab-quiz', timerMinutes: 3, quiz: { questionCount: 8, seconds: 20 } },
      packCode: PACK.code,
      pack: { name: PACK.name, description: PACK.description, language: 'en', words: DEFINED_WORDS },
      href: '/en/education/classroom-game?pack=LC-EN-PK-AUTUMN',
    } as unknown as SessionRun;
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('run-session'));

    const payload = await goLive();
    expect(educationApi.createLesson).toHaveBeenCalledTimes(1);
    expect(payload.lessonIds).toEqual(['lesson-pack']);
    expect(payload.settings).toMatchObject({ gameMode: 'vocab-quiz', timerMinutes: 3, vocabQuizQuestionCount: 8, vocabQuizSeconds: 20 });
    expect(stableRouter.push).not.toHaveBeenCalled();
  });

  it('Given a pack link still loading, Then GO LIVE is not offered on the auto-picked list in the meantime', async () => {
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [OTHER] });
    let resolvePack: (p: unknown) => void = () => {};
    findThemedPack.mockReturnValue(new Promise((r) => { resolvePack = r; }));
    render(<ClassroomGameLobby initialMode="vocab-quiz" sessionPack="LC-EN-PK-AUTUMN" onBack={vi.fn()} />);
    await waitFor(() => expect(findThemedPack).toHaveBeenCalled());
    expect(screen.queryByTestId('lobby-go-live')).not.toBeInTheDocument();

    resolvePack(PACK);
    const payload = await goLive();
    expect(payload.lessonIds).toEqual(['lesson-pack']);
  });
});
