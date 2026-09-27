// @ts-nocheck
/**
 * The duel screen has to announce itself.
 *
 * `duel:started` is emitted once, at accept time, to a room this screen's
 * socket is not in yet — both students then sat on "Waiting for opponent…"
 * while the server's timer quietly completed the duel 0-0. The screen now
 * emits `duel:join-game` on mount, which puts it in the room and replays the
 * running state (see backend/handlers/duel/rejoin.ts).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { RealTimeDuelGame } from '../RealTimeDuelGame';
import { useDuelSocket } from '@/hooks/useDuelSocket';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/useDuelSocket');
vi.mock('@/hooks/useSafeTimeout', () => ({ useInterval: vi.fn() }));
vi.mock('framer-motion', () => ({
  m: {
    div: Object.assign(
      React.forwardRef(function MotionDiv({ children, ...props }, ref) {
        return (
          <div ref={ref} {...props}>
            {children}
          </div>
        );
      }),
      { displayName: 'm.div' }
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));
vi.mock('@/components/ui/Loader', () => ({ Loader: () => <div data-testid="loader" /> }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (key) => key }),
}));

describe('RealTimeDuelGame — joining the running duel', () => {
  const joinDuelGame = vi.fn();
  const props = {
    duelId: 'duel-1',
    studentId: 'student-1',
    opponentName: 'Maya',
    opponentId: 'opponent-1',
    lessonId: 'lesson-1',
  };

  function socket(overrides = {}) {
    return {
      socket: { emit: vi.fn() },
      isConnected: true,
      connectionStatus: 'connected',
      submitWord: vi.fn(),
      forfeitDuel: vi.fn(),
      joinDuelGame,
      onDuelStarted: vi.fn(() => () => {}),
      onWordAccepted: vi.fn(() => () => {}),
      onWordRejected: vi.fn(() => () => {}),
      onOpponentProgress: vi.fn(() => () => {}),
      onOpponentDisconnected: vi.fn(() => () => {}),
      onOpponentReconnected: vi.fn(() => () => {}),
      onDuelCompleted: vi.fn(() => () => {}),
      onDuelCreated: vi.fn(() => () => {}),
      onError: vi.fn(() => () => {}),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('emits duel:join-game once the socket is connected', async () => {
    useDuelSocket.mockReturnValue(socket());

    render(<RealTimeDuelGame {...props} />);

    await waitFor(() => expect(joinDuelGame).toHaveBeenCalledWith('duel-1'));
  });

  it('waits for the connection instead of shouting into a closed socket', () => {
    useDuelSocket.mockReturnValue(socket({ isConnected: false }));

    render(<RealTimeDuelGame {...props} />);

    expect(joinDuelGame).not.toHaveBeenCalled();
  });
});
