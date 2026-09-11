/**
 * The duel payoff: a live combo meter, a swing bar that says who is ahead, and
 * a reveal screen instead of a silent trophy badge.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { RealTimeDuelGame } from '../RealTimeDuelGame';

const { mockAwardGameCoins } = vi.hoisted(() => ({ mockAwardGameCoins: vi.fn() }));
vi.mock('@/utils/coinManager', () => ({ awardGameCoins: mockAwardGameCoins }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/hooks/useSafeTimeout', () => ({ useInterval: vi.fn() }));

let listeners: Record<string, Function> = {};
const register = (event: string) => (cb: Function) => {
  listeners[event] = cb;
  return () => delete listeners[event];
};

vi.mock('@/hooks/useDuelSocket', () => ({
  useDuelSocket: () => ({
    socket: { emit: vi.fn() },
    isConnected: true,
    submitWord: vi.fn(),
    forfeitDuel: vi.fn(),
    syncState: vi.fn(),
    onDuelStarted: register('started'),
    onWordAccepted: register('accepted'),
    onWordRejected: register('rejected'),
    onOpponentProgress: register('progress'),
    onOpponentDisconnected: register('disconnected'),
    onOpponentReconnected: register('reconnected'),
    onDuelCreated: vi.fn(() => () => {}),
    onError: vi.fn(() => () => {}),
    onDuelCompleted: register('completed'),
    onStateSynced: register('synced'),
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, _f?: string, p?: Record<string, unknown>) =>
      p ? `${key} ${Object.values(p).join(' ')}` : key,
    language: 'en',
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: Object.assign(
      React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
        return <div ref={ref} {...props}>{children}</div>;
      }),
      { displayName: 'm.div' }
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const board = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

function startDuel() {
  act(() => {
    listeners['started']?.({
      duelId: 'duel-1',
      boardState: board,
      startTime: new Date().toISOString(),
      timeLimit: 180,
      players: ['student-1', 'opponent-1'],
    });
  });
}

const props = {
  duelId: 'duel-1',
  studentId: 'student-1',
  opponentName: 'Bob',
  opponentId: 'opponent-1',
  lessonId: 'lesson-1',
  onBackToLobby: vi.fn(),
};

describe('RealTimeDuelGame — payoff', () => {
  beforeEach(() => {
    listeners = {};
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows a combo meter and a swing bar during play', async () => {
    render(<RealTimeDuelGame {...props} />);
    startDuel();

    await waitFor(() => expect(screen.getByTestId('duel-combo-meter')).toBeInTheDocument());
    expect(screen.getByTestId('duel-swing-bar')).toBeInTheDocument();
  });

  it('drives the combo meter from the server streak, not its own count', async () => {
    render(<RealTimeDuelGame {...props} />);
    startDuel();
    await waitFor(() => screen.getByTestId('duel-combo-meter'));

    act(() => {
      listeners['accepted']?.({
        word: 'CAB',
        points: 7,
        totalScore: 7,
        wordCount: 1,
        comboStreak: 4,
        comboBonus: 6,
      });
    });

    expect(screen.getByTestId('duel-combo-meter')).toHaveAttribute('data-streak', '4');
    expect(screen.getByTestId('duel-combo-bonus')).toHaveTextContent('6');
  });

  it('snaps the meter back when the server says the chain broke', async () => {
    render(<RealTimeDuelGame {...props} />);
    startDuel();
    await waitFor(() => screen.getByTestId('duel-combo-meter'));

    act(() => {
      listeners['accepted']?.({
        word: 'CAB', points: 7, totalScore: 7, wordCount: 1, comboStreak: 3, comboBonus: 4,
      });
    });
    act(() => {
      listeners['rejected']?.({ word: 'ZZZ', reason: 'dictionary', comboStreak: 0 });
    });

    expect(screen.getByTestId('duel-combo-meter')).toHaveAttribute('data-streak', '0');
  });

  it('tells you you are behind when the opponent pulls ahead', async () => {
    render(<RealTimeDuelGame {...props} />);
    startDuel();
    await waitFor(() => screen.getByTestId('duel-swing-bar'));

    act(() => {
      listeners['progress']?.({ opponentId: 'opponent-1', totalScore: 25, wordCount: 3, comboStreak: 3 });
    });

    expect(screen.getByTestId('duel-swing-bar')).toHaveAttribute('data-swing', 'behind');
    expect(screen.getByTestId('duel-swing-opponent-fire')).toBeInTheDocument();
  });

  it('lands on the reveal screen, not a silent trophy badge', async () => {
    mockAwardGameCoins.mockReturnValue({ awarded: 42, breakdown: {} });
    render(<RealTimeDuelGame {...props} />);
    startDuel();
    await waitFor(() => screen.getByTestId('duel-swing-bar'));

    act(() => {
      listeners['completed']?.({
        winnerId: 'student-1',
        challengerScore: 100,
        opponentScore: 50,
        xpAwarded: { winner: 20, loser: 10 },
      });
    });

    await waitFor(() => expect(screen.getByTestId('duel-reveal')).toBeInTheDocument());
    expect(screen.getByTestId('duel-coin-counter')).toBeInTheDocument();
    expect(screen.getAllByTestId('duel-series-pip')).toHaveLength(3);
  });

  it('records the result into the best-of-3 series tally', async () => {
    mockAwardGameCoins.mockReturnValue({ awarded: 10, breakdown: {} });
    render(<RealTimeDuelGame {...props} />);
    startDuel();
    await waitFor(() => screen.getByTestId('duel-swing-bar'));

    act(() => {
      listeners['completed']?.({
        winnerId: 'student-1',
        challengerScore: 100,
        opponentScore: 50,
        xpAwarded: { winner: 20, loser: 10 },
      });
    });

    await waitFor(() => screen.getByTestId('duel-reveal'));
    const pips = screen.getAllByTestId('duel-series-pip');
    expect(pips[0]).toHaveAttribute('data-result', 'win');
    expect(pips[1]).toHaveAttribute('data-result', 'pending');
  });

  it('records only once even if the server repeats duel:completed', async () => {
    mockAwardGameCoins.mockReturnValue({ awarded: 10, breakdown: {} });
    render(<RealTimeDuelGame {...props} />);
    startDuel();
    await waitFor(() => screen.getByTestId('duel-swing-bar'));

    const payload = {
      winnerId: 'student-1',
      challengerScore: 100,
      opponentScore: 50,
      xpAwarded: { winner: 20, loser: 10 },
    };
    act(() => listeners['completed']?.(payload));
    act(() => listeners['completed']?.(payload));

    await waitFor(() => screen.getByTestId('duel-reveal'));
    const pips = screen.getAllByTestId('duel-series-pip');
    expect(pips.filter((p) => p.getAttribute('data-result') === 'win')).toHaveLength(1);
  });
});
