/**
 * The lobby leads with the mode picker, and a poster is the launch button.
 *
 * Before this, the mode lived at the bottom of a 500-line wizard as five small
 * icon radios under "Game Mode", below classroom, lessons, teams, timer and
 * board size — a teacher had to scroll past everything to reach the one choice
 * that decides what the class actually plays. Blooket puts that choice first
 * and makes it a wall of posters; this puts it first AND makes the poster the
 * launch button, so the class is playing one tap after the decision.
 *
 * The pinned-shell contract matters as much as the picker: the lobby locks and
 * exactly one region scrolls, so a phone lobby never scrolls the page body.
 */

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import * as educationApi from '@/lib/supabase/education';
import { io } from 'socket.io-client';

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: mockToastError, success: vi.fn() },
}));

// Stable identities: both are socket-effect deps, and a fresh arrow per render
// tears the socket down and rebuilds it on every state change.
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

/** A list with meanings — the kind a quiz can be built from. */
const QUIZ_LESSON = {
  id: 'lesson-defs',
  name: 'Cell Biology',
  words: [
    { word: 'osmosis', definition: 'water moving across a membrane', canIntegrate: true },
    { word: 'enzyme', definition: 'a protein that speeds a reaction', canIntegrate: true },
    { word: 'nucleus', definition: 'the control centre of a cell', canIntegrate: true },
    { word: 'ribosome', definition: 'where protein is built', canIntegrate: true },
  ],
};
/** A bare spelling list — nothing to quiz on. */
const BARE_LESSON = {
  id: 'lesson-bare',
  name: 'Spelling Week 4',
  words: [{ word: 'bright', canIntegrate: true }, { word: 'plant', canIntegrate: true }],
};
const CLASSROOMS = [{ id: 'class-1', name: 'ELA (7th)', member_count: 12 }];

function emitted() {
  return mockSocket.emit.mock.calls.find((c) => c[0] === 'createClassroomGame')?.[1] as
    | { settings: { gameMode: string } }
    | undefined;
}

async function renderLobby(lessonId = '') {
  render(<ClassroomGameLobby initialLessonId={lessonId} onBack={vi.fn()} />);
  await screen.findByTestId('lobby-go-live');
}

/** Open the fold. Round 2 shows ONE poster until the teacher asks for more. */
function openModes() {
  fireEvent.click(screen.getByTestId('more-modes-toggle'));
}

describe('ClassroomGameLobby — the picker is the first thing and the launch button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [QUIZ_LESSON, BARE_LESSON],
    });
    (educationApi.getClassrooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: CLASSROOMS });
  });

  it('leads with ONE poster and keeps the rest one tap away', async () => {
    await renderLobby('lesson-defs');
    // The hero is the recommended game; the other four live behind the fold.
    expect(screen.getByTestId('mode-tile-vocab-quiz')).toHaveAttribute('data-size', 'hero');
    openModes();
    for (const id of ['classic', 'word-hunt', 'blast', 'wheel-rush']) {
      expect(screen.getByTestId(`mode-tile-${id}`)).toBeInTheDocument();
    }
  });

  /**
   * The lobby is where a teacher CHANGES their mind, so a poster tap never
   * fires a room: creating one navigates to /multiplayer, and a tap that leaves
   * the screen is the opposite of "switch mode from the lobby without leaving
   * it". Posters choose; GO LIVE — the screen's one primary action — commits.
   */
  it('selects on a tap of a poster and does not fire a room', async () => {
    await renderLobby('lesson-defs');
    await waitFor(() => expect(socketHandlers['classroomGameError']).toBeDefined());

    openModes();
    fireEvent.click(screen.getByTestId('mode-tile-blast'));

    expect(screen.getByTestId('mode-tile-blast')).toHaveAttribute('data-selected', 'true');
    expect(emitted()).toBeUndefined();
  });

  it('launches the poster the teacher chose when GO LIVE is pressed', async () => {
    await renderLobby('lesson-defs');
    await waitFor(() => expect(socketHandlers['classroomGameError']).toBeDefined());

    openModes();
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    fireEvent.click(screen.getByTestId('lobby-go-live'));

    await waitFor(() => expect(emitted()).toBeDefined());
    expect(emitted()!.settings.gameMode).toBe('blast');
  });

  /**
   * The proof that the switch happened IN the lobby: Word Hunt's target picker
   * is a control only that mode has, and it has to appear under a picker that
   * is still on screen. If the tap had launched, this assertion would be run
   * against a navigated-away tree.
   */
  it('switches mode from inside the lobby and reshapes the settings in place', async () => {
    await renderLobby('lesson-defs');
    expect(screen.queryByText('teacher.classroom.huntTarget.title')).not.toBeInTheDocument();

    openModes();
    fireEvent.click(screen.getByTestId('mode-tile-word-hunt'));
    // Open the fine-tuning; Word Hunt's target picker is a control only that
    // mode has, and it must be there under a picker still on screen.
    fireEvent.click(screen.getByTestId('lobby-setup-summary'));

    expect(screen.getByTestId('lobby-go-live-panel')).toBeInTheDocument();
    expect(screen.getByTestId('mode-tile-word-hunt')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByText('teacher.classroom.huntTarget.title')).toBeInTheDocument();
    expect(emitted()).toBeUndefined();
  });

  /** The teacher who does not care still spends exactly one tap. */
  it('names the live mode on GO LIVE and launches it in one tap', async () => {
    await renderLobby('lesson-defs');
    const go = screen.getByTestId('lobby-go-live');
    expect(go).toHaveTextContent('vocabQuiz');

    fireEvent.click(go);

    await waitFor(() => expect(emitted()).toBeDefined());
    expect(emitted()!.settings.gameMode).toBe('vocab-quiz');
  });

  it('flags the quiz when the chosen words carry definitions', async () => {
    await renderLobby('lesson-defs');
    await waitFor(() =>
      expect(screen.getByTestId('mode-tile-vocab-quiz')).toContainElement(
        screen.getByTestId('mode-recommended')
      )
    );
  });

  /**
   * Deliberately NO flag here. A list with no meanings has nothing for a quiz
   * to ask about, and pointing at a board mode would contradict the lobby's own
   * default (a lesson attached preselects the quiz — measured 2026-09-07, a
   * Classic board carried 1 of 9 lesson words). A recommendation that argues
   * with the preselection is worse than none.
   */
  it('shows no flag at all when the words carry no meanings', async () => {
    await renderLobby('lesson-bare');
    expect(screen.queryByTestId('mode-recommended')).not.toBeInTheDocument();
    // ...and not hiding in the fold either.
    openModes();
    await waitFor(() => expect(screen.getByTestId('mode-tile-classic')).toBeInTheDocument());
    expect(screen.queryByTestId('mode-recommended')).not.toBeInTheDocument();
  });

  it('says what is missing instead of leaving GO LIVE greyed in silence', async () => {
    // A list with no words is the only way to reach the blocked state now that
    // the newest list is pre-selected.
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: 'lesson-empty', name: 'Untouched list', words: [] }],
    });
    await renderLobby('');
    openModes();
    fireEvent.click(screen.getByTestId('mode-tile-blast')); // choose

    expect(screen.getByTestId('lobby-go-live')).toBeDisabled();
    expect(emitted()).toBeUndefined();
    expect(await screen.findByTestId('mode-picker-blocked')).toHaveTextContent(
      'education.modePicker.needsLesson'
    );
    // The tap still registered the teacher's choice — they only have to add words.
    expect(screen.getByTestId('mode-tile-blast')).toHaveAttribute('data-selected', 'true');
  });

  it('keeps GO LIVE as the one create button, and it is not inside the scroller', async () => {
    await renderLobby('lesson-defs');
    const create = screen.getAllByTestId('lobby-go-live');
    expect(create).toHaveLength(1);
    expect(screen.getByTestId('lobby-scroll')).not.toContainElement(create[0]);
  });

  it('locks the shell and scrolls exactly one region', async () => {
    await renderLobby('lesson-defs');
    const shell = screen.getByTestId('classroom-lobby-shell');
    expect(shell.className).toContain('overflow-hidden');
    const scroller = screen.getByTestId('lobby-scroll');
    expect(scroller.className).toContain('overflow-y-auto');
    expect(scroller.className).toContain('min-h-0');
  });

  it('still recovers the launch when the server rate-limits a poster tap', async () => {
    await renderLobby('lesson-defs');
    openModes();
    fireEvent.click(screen.getByTestId('mode-tile-blast'));
    fireEvent.click(screen.getByTestId('lobby-go-live'));
    await waitFor(() => expect(socketHandlers['rateLimited']).toBeDefined());
    act(() => {
      socketHandlers['rateLimited']!();
    });
    await waitFor(() =>
      expect(screen.getByTestId('lobby-go-live')).not.toBeDisabled()
    );
    expect(mockToastError).toHaveBeenCalledWith('education.classroomGame.tooFast');
  });
});
