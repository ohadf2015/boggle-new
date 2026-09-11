/**
 * One launch button, and the poster never fires a room behind the teacher.
 *
 * Two rules meet on this screen.
 *
 * 1. ONE primary action. A poster that launches on a re-tap is a second launch
 *    path wearing a lime bar, sitting above the real one — and a double tap on
 *    a phone (the "tap again to start" label is an invitation to tap fast)
 *    would then open a room in front of thirty students by accident. Posters
 *    CHOOSE; GO LIVE launches. The chosen mode is preselected, so the teacher
 *    who agrees with us still spends exactly one tap.
 *
 * 2. A disabled primary action must say why. A greyed GO LIVE with no sentence
 *    beside it is the silent no-op of recurring pitfall class 4 — the teacher
 *    taps, nothing happens, and nothing on screen names the missing word list.
 *
 * The third case here is pitfall class 1: `flow=repeatLast` restores the last
 * lesson in an effect, and the picker's default is DERIVED from whether a
 * lesson is attached. Paint before the restore lands and the hero poster is
 * Classic; a frame later it is the quiz. The picker must not be painted until
 * the restore has resolved.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as educationApi from '@/lib/supabase/education';
import { io } from 'socket.io-client';

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: vi.fn(), success: vi.fn() },
}));

const { stableT } = vi.hoisted(() => ({
  stableT: (key: string, params?: unknown) =>
    params && typeof params === 'object' ? `${key}|${JSON.stringify(params)}` : key,
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: stableT, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-1', email: 't@example.com' },
    profile: { display_name: 'Ms Plant' },
  }),
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

const { mockGetMostRecent } = vi.hoisted(() => ({ mockGetMostRecent: vi.fn() }));
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({
    recentConfigs: [],
    hasRecentConfig: false,
    saveConfig: vi.fn(),
    getMostRecent: mockGetMostRecent,
    getByClassroom: () => [],
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

const QUIZ_LESSON = {
  id: 'lesson-defs',
  name: 'Cell Biology',
  words: [
    { word: 'osmosis', definition: 'water across a membrane', canIntegrate: true },
    { word: 'enzyme', definition: 'speeds a reaction', canIntegrate: true },
    { word: 'nucleus', definition: 'the control centre', canIntegrate: true },
    { word: 'ribosome', definition: 'where protein is built', canIntegrate: true },
  ],
};
const CLASSROOMS = [{ id: 'class-1', name: 'ELA (7th)', member_count: 12 }];

function emitted() {
  return mockSocket.emit.mock.calls.find((c) => c[0] === 'createClassroomGame')?.[1] as
    | { settings: { gameMode: string } }
    | undefined;
}

describe('ClassroomGameLobby — posters choose, GO LIVE launches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
    mockGetMostRecent.mockReturnValue(null);
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [QUIZ_LESSON] });
    (educationApi.getClassrooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: CLASSROOMS });
  });

  it('never fires a room from a poster, however many times it is tapped', async () => {
    render(<ClassroomGameLobby initialLessonId="lesson-defs" onBack={vi.fn()} />);
    await screen.findByTestId('lobby-go-live');
    await waitFor(() => expect(socketHandlers['classroomGameError']).toBeDefined());

    fireEvent.click(screen.getByTestId('more-modes-toggle'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    // Re-open and tap it again: the promoted hero is a poster too, and a
    // second or third tap must still not mint a room.
    fireEvent.click(screen.getByTestId('more-modes-toggle'));
    fireEvent.click(screen.getByTestId('mode-tile-wheel-rush'));
    fireEvent.click(screen.getByTestId('mode-tile-wheel-rush'));

    expect(screen.getByTestId('mode-tile-wheel-rush')).toHaveAttribute('data-selected', 'true');
    expect(emitted()).toBeUndefined();
  });

  it('carries the chosen poster into the one launch button', async () => {
    render(<ClassroomGameLobby initialLessonId="lesson-defs" onBack={vi.fn()} />);
    await screen.findByTestId('lobby-go-live');

    fireEvent.click(screen.getByTestId('more-modes-toggle'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    const go = screen.getByTestId('lobby-go-live');
    expect(go).toHaveTextContent('blast');

    fireEvent.click(go);
    await waitFor(() => expect(emitted()).toBeDefined());
    expect(emitted()!.settings.gameMode).toBe('blast');
  });

  it('offers exactly one launch control on the screen', async () => {
    render(<ClassroomGameLobby initialLessonId="lesson-defs" onBack={vi.fn()} />);
    await screen.findByTestId('lobby-go-live');
    expect(screen.queryByTestId('mode-tap-again')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('lobby-go-live')).toHaveLength(1);
  });

  /**
   * The lobby now pre-selects the newest list, so the only way to reach the
   * blocked state is a list a game cannot be built from — an empty one.
   */
  it('says what is missing while GO LIVE is disabled, without waiting for a tap', async () => {
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: 'lesson-empty', name: 'Untouched list', words: [] }],
    });
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    await screen.findByTestId('lobby-go-live');

    expect(screen.getByTestId('lobby-go-live')).toBeDisabled();
    expect(screen.getByTestId('mode-picker-blocked')).toHaveTextContent(
      'education.modePicker.needsLesson'
    );
  });

  /** Pitfall class 1: no optimistic hero that a later source can flip. */
  it('does not paint the picker until a repeated setup has been restored', async () => {
    mockGetMostRecent.mockReturnValue({
      id: '1',
      classroomId: 'class-1',
      classroomName: 'ELA (7th)',
      lessonIds: ['lesson-defs'],
      lessonNames: ['Cell Biology'],
      settings: { timerMinutes: 2, boardSize: 'small', allowLateJoin: true },
      savedAt: Date.now(),
    });

    render(<ClassroomGameLobby initialFlow="repeatLast" onBack={vi.fn()} />);

    // The FIRST painted hero is already the restored lesson's mode — it never
    // shows Classic and then jumps.
    const hero = await screen.findByTestId('mode-tile-vocab-quiz');
    expect(hero).toHaveAttribute('data-size', 'hero');
    expect(hero).toHaveAttribute('data-selected', 'true');
  });
});
