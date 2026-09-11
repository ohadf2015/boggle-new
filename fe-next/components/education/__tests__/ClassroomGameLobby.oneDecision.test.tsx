/**
 * One decision, or none at all.
 *
 * Round 1 put five posters on screen at once, then a classroom row, then a
 * lesson list, then three ritual presets, then a timer grid — and GO LIVE was
 * greyed out until the teacher picked a word list. That is five choices before
 * a class can play, and a page that scrolled 1640px at 1440×900 to hold them.
 *
 * The bar (design card `education/03-mode-tiles`) is the opposite: ONE large
 * recommended tile, ONE primary action, the four alternatives folded away, and
 * every default already chosen so a teacher who agrees with us taps once.
 *
 * These tests pin that shape. They are deliberately about what is NOT on the
 * screen, because the round-1 regression was entirely one of addition.
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
    { word: 'osmosis', definition: 'water moving across a membrane', canIntegrate: true },
    { word: 'enzyme', definition: 'a protein that speeds a reaction', canIntegrate: true },
    { word: 'nucleus', definition: 'the control centre of a cell', canIntegrate: true },
    { word: 'ribosome', definition: 'where protein is built', canIntegrate: true },
  ],
};
const OLDER_LESSON = {
  id: 'lesson-bare',
  name: 'Spelling Week 4',
  words: [{ word: 'bright', canIntegrate: true }, { word: 'plant', canIntegrate: true }],
};
const CLASSROOMS = [{ id: 'class-1', name: 'ELA (7th)', member_count: 12 }];

const ALTERNATES = ['classic', 'word-hunt', 'blast', 'wheel-rush'];

function emitted() {
  return mockSocket.emit.mock.calls.find((c) => c[0] === 'createClassroomGame')?.[1] as
    | { gameCode: string; settings: { gameMode: string } }
    | undefined;
}

async function renderLobby(lessonId = '') {
  render(<ClassroomGameLobby initialLessonId={lessonId} onBack={vi.fn()} />);
  await screen.findByTestId('lobby-go-live');
}

describe('ClassroomGameLobby — one screen, one decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
    (io as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSocket);
    (educationApi.getLessons as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [QUIZ_LESSON, OLDER_LESSON],
    });
    (educationApi.getClassrooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: CLASSROOMS });
  });

  /**
   * The card's whole claim: the teacher picks NOTHING to reach play. A greyed
   * GO LIVE behind "pick a word list" is a choice disguised as an empty state.
   */
  it('arrives with the newest word list already chosen, so GO LIVE is live', async () => {
    await renderLobby();
    expect(screen.getByTestId('lobby-go-live')).not.toBeDisabled();
  });

  it('shows exactly ONE mode tile until the teacher asks for more', async () => {
    await renderLobby();
    expect(screen.getAllByTestId(/^mode-tile-/)).toHaveLength(1);
    for (const id of ALTERNATES) {
      expect(screen.queryByTestId(`mode-tile-${id}`)).not.toBeInTheDocument();
    }
    expect(screen.getByTestId('mode-tile-vocab-quiz')).toBeInTheDocument();
  });

  it('keeps the four alternatives one tap away and names how many', async () => {
    await renderLobby();
    const more = screen.getByTestId('more-modes-toggle');
    expect(more).toHaveTextContent('4');

    fireEvent.click(more);

    for (const id of ALTERNATES) {
      expect(screen.getByTestId(`mode-tile-${id}`)).toBeInTheDocument();
    }
  });

  /** Picking an alternate promotes it and folds the rest away again. */
  it('promotes the chosen alternate to the hero and closes the fold', async () => {
    await renderLobby();
    fireEvent.click(screen.getByTestId('more-modes-toggle'));
    fireEvent.click(screen.getByTestId('mode-tile-blast'));

    await waitFor(() => expect(screen.getAllByTestId(/^mode-tile-/)).toHaveLength(1));
    // The hero is not a radio — it IS the choice — so it says so with
    // `data-selected` and leaves `aria-checked` to the tiles in the fold.
    expect(screen.getByTestId('mode-tile-blast')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('lobby-go-live')).toHaveTextContent('blast');
    // Still nothing on the wire — the poster chooses, GO LIVE commits.
    expect(emitted()).toBeUndefined();
  });

  /**
   * The stale-hint bug the critic found: the line under the picker described
   * the RECOMMENDED mode while the hero showed the mode the teacher had just
   * chosen. Anything the panel says about "the game" is derived from the hero.
   */
  it('never describes a mode that is not the one on the hero', async () => {
    await renderLobby();
    fireEvent.click(screen.getByTestId('more-modes-toggle'));
    fireEvent.click(screen.getByTestId('mode-tile-word-hunt'));

    const panel = screen.getByTestId('lobby-go-live-panel');
    expect(panel).toHaveTextContent('education.modePicker.how.wordHunt');
    for (const other of ['vocabQuiz', 'classic', 'blast', 'wheelRush']) {
      expect(panel).not.toHaveTextContent(`education.modePicker.how.${other}`);
    }
  });

  /** Class, words and round settings are ONE disclosure, shut on arrival. */
  it('folds class, words and settings behind a single closed disclosure', async () => {
    await renderLobby();
    const summary = screen.getByTestId('lobby-setup-summary');
    expect(summary).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('lobby-setup-body')).not.toBeInTheDocument();

    fireEvent.click(summary);
    expect(screen.getByTestId('lobby-setup-body')).toBeInTheDocument();
  });

  /** One primary action on the screen, and it is not inside the scroller. */
  it('keeps GO LIVE the only launch control, pinned outside the scroll region', async () => {
    await renderLobby();
    const go = screen.getAllByTestId('lobby-go-live');
    expect(go).toHaveLength(1);
    expect(screen.getByTestId('lobby-scroll')).not.toContainElement(go[0]);
  });

  it('launches the hero in one tap', async () => {
    await renderLobby();
    fireEvent.click(screen.getByTestId('lobby-go-live'));
    await waitFor(() => expect(emitted()).toBeDefined());
    expect(emitted()!.settings.gameMode).toBe('vocab-quiz');
  });
});
