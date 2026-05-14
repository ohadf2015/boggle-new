// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RealTimeDuelGame } from '../RealTimeDuelGame';
import { useDuelSocket } from '@/hooks/useDuelSocket';

vi.mock('@/hooks/useDuelSocket');
vi.mock('@/hooks/useSafeTimeout', () => ({
  useInterval: vi.fn(),
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
vi.mock('@/components/ui/Loader', () => ({
  Loader: () => <div data-testid="loader" />,
}));
vi.mock('../OpponentProgressBar', () => ({
  OpponentProgressBar: () => <div data-testid="progress-bar" />,
}));
vi.mock('../DuelDisconnectOverlay', () => ({
  DuelDisconnectOverlay: () => <div data-testid="disconnect-overlay" />,
}));
vi.mock('../ForfeitConfirmDialog', () => ({
  ForfeitConfirmDialog: () => <div data-testid="forfeit-dialog" />,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'duels.waitingForOpponent': 'Waiting for opponent...',
        'duels.youWin': 'You Win!',
        'duels.youLose': 'You Lose!',
        'duels.draw': 'Draw!',
        'duels.you': 'You',
        'duels.xpEarned': 'XP Earned',
        'duels.backToLobby': 'Back to Lobby',
        'education.duels.rematch': 'Rematch',
      };
      return translations[key] || key;
    },
  }),
}));

describe('RealTimeDuelGame — rematch', () => {
  const mockEmit = vi.fn();
  let completedCallback: ((data: any) => void) | null = null;

  const defaultProps = {
    duelId: 'duel-1',
    studentId: 'student-1',
    opponentName: 'Opponent',
    opponentId: 'opponent-1',
    lessonId: 'lesson-1',
    onBackToLobby: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    completedCallback = null;
    (useDuelSocket as any).mockReturnValue({
      socket: { emit: mockEmit },
      isConnected: true,
      connectionStatus: 'connected',
      submitWord: vi.fn(),
      forfeitDuel: vi.fn(),
      onDuelStarted: vi.fn(() => () => {}),
      onWordAccepted: vi.fn(() => () => {}),
      onWordRejected: vi.fn(() => () => {}),
      onOpponentProgress: vi.fn(() => () => {}),
      onOpponentDisconnected: vi.fn(() => () => {}),
      onOpponentReconnected: vi.fn(() => () => {}),
      onDuelCompleted: vi.fn((cb) => {
        completedCallback = cb;
        return () => {};
      }),
    });
  });

  it('shows Rematch button in completed phase', async () => {
    render(<RealTimeDuelGame {...defaultProps} />);

    // Trigger completed phase
    act(() => {
      completedCallback?.({
        winnerId: 'student-1',
        challengerScore: 100,
        opponentScore: 50,
        xpAwarded: { winner: 20, loser: 10 },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Rematch')).toBeInTheDocument();
    });
  });

  it('emits duel:rematch on Rematch button click', async () => {
    render(<RealTimeDuelGame {...defaultProps} />);

    act(() => {
      completedCallback?.({
        winnerId: 'student-1',
        challengerScore: 100,
        opponentScore: 50,
        xpAwarded: { winner: 20, loser: 10 },
      });
    });

    await waitFor(() => {
      const rematchBtn = screen.getByText('Rematch');
      fireEvent.click(rematchBtn);
    });

    expect(mockEmit).toHaveBeenCalledWith('duel:rematch', {
      opponentId: 'opponent-1',
      lessonId: 'lesson-1',
    });
  });
});
