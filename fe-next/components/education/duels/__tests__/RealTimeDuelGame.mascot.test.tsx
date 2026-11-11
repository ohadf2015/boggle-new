import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { RealTimeDuelGame } from '../RealTimeDuelGame';
import { subscribeMascotEvents, _resetMascotBus } from '@/lib/blast/mascotBus';
import type { MascotEvent } from '@/lib/blast/mascotState';

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

describe('RealTimeDuelGame — shared mascot', () => {
  let events: MascotEvent[];
  beforeEach(() => {
    listeners = {};
    vi.clearAllMocks();
    localStorage.clear();
    _resetMascotBus();
    events = [];
    subscribeMascotEvents((e) => events.push(e));
  });

  it('feeds each of my accepted words to the mascot by length', async () => {
    render(<RealTimeDuelGame {...props} />);
    startDuel();
    await waitFor(() => screen.getByTestId('duel-combo-meter'));
    act(() => {
      listeners['accepted']?.({ word: 'GAMES', points: 7, totalScore: 7, wordCount: 1, comboStreak: 1, comboBonus: 0 });
    });
    expect(events).toContainEqual({ kind: 'word-submitted', wordLength: 5, gemLetterUsed: false });
  });

  it('leaves the win and loss to the reveal mascot', async () => {
    mockAwardGameCoins.mockReturnValue({ awarded: 1, breakdown: {} });
    render(<RealTimeDuelGame {...props} />);
    startDuel();
    await waitFor(() => screen.getByTestId('duel-swing-bar'));
    act(() => {
      listeners['completed']?.({ winnerId: 'student-1', challengerScore: 10, opponentScore: 5, xpAwarded: { winner: 20, loser: 10 } });
    });
    await waitFor(() => screen.getByTestId('duel-reveal'));
    expect(events.some((e) => e.kind === 'wave-clear' || e.kind === 'wave-fail')).toBe(false);
  });
});
