/**
 * GO LIVE is still one tap. A second tap can change the game.
 *
 * The express screen decides the mode from the lesson's own words and never
 * asks — that is the whole point for the teacher who does not care. The teacher
 * who glanced at the projector and wanted Blast instead used to have no way in
 * short of backing out to the full setup screen and starting over.
 *
 * So the poster strip is on the launch screen: the derived mode is marked, and
 * tapping another poster abandons the run in flight and opens the room with
 * that game instead. Tapping the mode already loading must cost nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const handlers = new Map<string, Array<(payload: unknown) => void>>();
const emit = vi.fn();
const push = vi.fn();
const disconnect = vi.fn();

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
    disconnect,
  }),
}));
vi.mock('@/utils/SocketContext', () => ({ getSocketURL: () => 'http://localhost:3010' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: unknown) =>
      params && typeof params === 'object' ? `${k}|${JSON.stringify(params)}` : k,
    language: 'en',
  }),
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
import { VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';

let intent: QuickLaunchIntent;

/** Words WITH meanings, so the derived mode is the quiz. */
const LESSON = {
  id: 'l-1',
  name: 'Unit 4',
  language: 'en',
  words: Array.from({ length: 6 }, (_, i) => ({ word: `w${i}`, definition: `d${i}` })),
};

function modesOf() {
  return emit.mock.calls
    .filter((c) => c[0] === 'createClassroomGame')
    .map((c) => (c[1] as { settings: { gameMode: string } }).settings.gameMode);
}

describe('<ClassroomGameLobbyExpress> — the picker on the launch screen', () => {
  beforeEach(() => {
    resetLaunchesForTest();
    intent = {
      source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en',
      createdAt: Date.now() + Math.floor(Math.random() * 1e6),
    };
    handlers.clear();
    emit.mockClear();
    push.mockClear();
    disconnect.mockClear();
    sessionStorage.clear();
    getClassrooms.mockResolvedValue({ data: [{ id: 'c-1', name: 'My Class', language: 'en' }] });
    getLesson.mockResolvedValue({ data: LESSON, error: null });
    createLesson.mockResolvedValue({ data: LESSON, error: null });
  });

  /**
   * Pitfall class 1 on the other surface: the runner derives the mode a beat
   * after mount, and the strip leads with whichever tile is chosen. Painting it
   * early means Classic heads the row and the posters physically reshuffle when
   * the real answer lands — on a screen that is only up for a second or two,
   * that reorder IS the screen. And "switch the game" is a meaningless offer
   * before we can say which game you would be switching away from.
   */
  it('shows no posters until the game to switch away from is known', async () => {
    getClassrooms.mockReturnValue(new Promise(() => {})); // provisioning, forever
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);

    expect(await screen.findByTestId('express-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('mode-picker-track')).not.toBeInTheDocument();
    expect(screen.queryByText('education.modePicker.sheetTitle')).not.toBeInTheDocument();
  });

  /**
   * The strip offers the games you are NOT already opening. Reprinting the
   * derived mode as a tappable poster was a dead tap that looked like a choice
   * — and on a screen that is up for two seconds, a dead tap is worse than no
   * tap. The progress list above already names the game being opened.
   */
  it('offers only the OTHER games once the derived one is known', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);

    expect(await screen.findByTestId('mode-picker-track')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('mode-tile-blast')).toBeInTheDocument());
    for (const id of ['classic', 'word-hunt', 'wheel-rush']) {
      expect(screen.getByTestId(`mode-tile-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId(`mode-tile-${VOCAB_QUIZ_MODE}`)).not.toBeInTheDocument();
  });

  it('does not ask a single question before the first room goes out', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(modesOf()).toEqual([VOCAB_QUIZ_MODE]));
  });

  it('opens the room with the tapped game instead', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(modesOf()).toEqual([VOCAB_QUIZ_MODE]));

    fireEvent.click(screen.getByTestId('mode-tile-blast'));

    await waitFor(() => expect(modesOf()).toEqual([VOCAB_QUIZ_MODE, 'blast']));
    // The run in flight was abandoned, socket and watchdog with it.
    expect(disconnect).toHaveBeenCalled();
  });

  /** No poster on this screen can re-fire the run that is already in flight. */
  it('never restarts the run that is already loading', async () => {
    render(<ClassroomGameLobbyExpress intent={intent} onOpenFullSetup={vi.fn()} />);
    await waitFor(() => expect(modesOf()).toEqual([VOCAB_QUIZ_MODE]));

    expect(screen.queryByTestId(`mode-tile-${VOCAB_QUIZ_MODE}`)).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(modesOf()).toEqual([VOCAB_QUIZ_MODE]);
    expect(disconnect).not.toHaveBeenCalled();
  });
});
