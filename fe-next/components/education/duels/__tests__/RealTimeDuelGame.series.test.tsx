// @ts-nocheck
/**
 * The best-of-3 tally must survive leaving the page.
 *
 * The series lives in localStorage (lib/education/duelSeries.ts), but the
 * component only ever WROTE to it — on a fresh mount (a reload, or opening
 * game 2 from the lobby instead of the REMATCH button) the in-memory tally
 * started at 0-0 and nothing on the waiting screen said which game of the
 * series was about to be played. Storage is the one source of truth; this
 * screen mirrors it (recurring-pitfalls Class 1).
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { RealTimeDuelGame } from '../RealTimeDuelGame';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { duelSeriesKey } from '@/lib/education/duelSeries';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/hooks/useDuelSocket');
vi.mock('@/hooks/useSafeTimeout', () => ({ useInterval: vi.fn() }));
vi.mock('framer-motion', () => ({
  m: {
    div: Object.assign(
      React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
        return (
          <div ref={ref} {...props}>
            {children}
          </div>
        );
      }),
      { displayName: 'm.div' }
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/components/ui/Loader', () => ({ Loader: () => <div data-testid="loader" /> }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, _fb?: unknown, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

describe('RealTimeDuelGame — series hydration', () => {
  const props = {
    duelId: 'duel-2',
    studentId: 'student-1',
    opponentName: 'Opponent',
    opponentId: 'opponent-1',
    lessonId: 'lesson-1',
    onBackToLobby: vi.fn(),
  };

  let startedCallback: ((data: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    startedCallback = null;
    (useDuelSocket as any).mockReturnValue({
      socket: { emit: vi.fn() },
      isConnected: true,
      connectionStatus: 'connected',
      submitWord: vi.fn(),
      forfeitDuel: vi.fn(),
      onDuelStarted: vi.fn((cb) => {
        startedCallback = cb;
        return () => {};
      }),
      onWordAccepted: vi.fn(() => () => {}),
      onWordRejected: vi.fn(() => () => {}),
      onOpponentProgress: vi.fn(() => () => {}),
      onOpponentDisconnected: vi.fn(() => () => {}),
      onOpponentReconnected: vi.fn(() => () => {}),
      onDuelCompleted: vi.fn(() => () => {}),
      onDuelCreated: vi.fn(() => () => {}),
      onError: vi.fn(() => () => {}),
    });
  });

  it('shows the running best-of-3 tally while waiting for the opponent', async () => {
    window.localStorage.setItem(
      duelSeriesKey('opponent-1', 'lesson-1'),
      JSON.stringify({ mine: 1, theirs: 0, games: 1 })
    );

    render(<RealTimeDuelGame {...props} />);

    await waitFor(() => {
      expect(screen.getByTestId('duel-series-label')).toBeInTheDocument();
    });

    // one game already won, two still to play
    const pips = screen.getAllByTestId('duel-series-pip');
    expect(pips.map((p) => p.getAttribute('data-result'))).toEqual([
      'win',
      'pending',
      'pending',
    ]);
    expect(screen.getByTestId('duel-series-label').textContent).toContain('"game":2');
  });

  it('shows no tally for the first game of a series', async () => {
    render(<RealTimeDuelGame {...props} />);

    await waitFor(() => expect(screen.getByTestId('loader')).toBeInTheDocument());
    expect(screen.queryByTestId('duel-series-label')).not.toBeInTheDocument();
  });

  it('does not paint the tally over the board once the duel starts', async () => {
    window.localStorage.setItem(
      duelSeriesKey('opponent-1', 'lesson-1'),
      JSON.stringify({ mine: 1, theirs: 0, games: 1 })
    );

    render(<RealTimeDuelGame {...props} />);
    await waitFor(() => expect(screen.getByTestId('duel-series-label')).toBeInTheDocument());

    act(() => {
      startedCallback?.({
        boardState: [['A', 'B', 'C', 'D']],
        startTime: new Date().toISOString(),
        timeLimit: 180,
      });
    });

    await waitFor(() => expect(screen.getByTestId('word-input')).toBeInTheDocument());
    expect(screen.queryByTestId('duel-series-label')).not.toBeInTheDocument();
  });
});
